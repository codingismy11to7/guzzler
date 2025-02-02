import { RedactedError } from "@guzzlerapp/domain/Errors";
import {
  ChangeEvent,
  changeEventsToFrontend,
  FrontendChangeEvent,
  GasStationQueryMode,
  GasStationResponsePlace,
  HeartbeatInterval,
  NoMapsApiKeySet,
} from "@guzzlerapp/domain/models/AutosApiModel";
import {
  AddressComponent,
  GooglePlace,
  PlaceType,
} from "@guzzlerapp/domain/models/GooglePlace";
import { Location } from "@guzzlerapp/domain/models/Location";
import { Place } from "@guzzlerapp/domain/models/Place";
import { Username } from "@guzzlerapp/domain/User";
import { RandomId } from "@guzzlerapp/utils/RandomId";
import {
  Effect,
  flow,
  HashMap,
  Match,
  Number,
  Option,
  ParseResult,
  pipe,
  Redacted,
  Schedule,
  Schema,
  Stream,
} from "effect";
import { gen, mapError } from "effect/Effect";
import { stringifyCircular } from "effect/Inspectable";
import { isNotUndefined } from "effect/Predicate";
import { Dequeue } from "effect/Queue";
import { Scope } from "effect/Scope";
import geolib from "geolib";
import { ChangeStreamDocument } from "mongodb";
import { GooglePlaces } from "../../GooglePlaces.js";
import { AppCollections } from "../database/CollectionRegistry.js";
import * as preferencesApiLive from "./preferencesApiLive.js";

const createFrontendChangeStreamForUser = (
  username: Username,
  watchSharedStream: Effect.Effect<Dequeue<ChangeStreamDocument>, never, Scope>,
  randomId: RandomId,
): Stream.Stream<string, RedactedError, Scope> =>
  Stream.unwrap(
    gen(function* () {
      const dequeue = yield* watchSharedStream;

      const opType = Match.discriminator("operationType");

      const decodeEvtOp = (_id: unknown, collectionName: string) =>
        Schema.decodeUnknown(ChangeEvent)({
          _id,
          collectionName,
        }).pipe(Effect.option);

      const coll = Match.discriminator("collectionName");

      return pipe(
        Stream.fromQueue(dequeue),
        Stream.filterMapEffect(d =>
          Match.value(d).pipe(
            opType("delete", "insert", "replace", "update", e =>
              Option.some(decodeEvtOp(e.documentKey._id, e.ns.coll)),
            ),
            opType("invalidate", e =>
              Option.some(
                RedactedError.provideLogged(randomId)(stringifyCircular(e)),
              ),
            ),
            Match.orElse(() => Option.none()),
          ),
        ),
        Stream.filter(Option.isSome),
        Stream.map(o => o.value),
        Stream.filter(e =>
          Match.value(e).pipe(
            coll(
              "eventRecords",
              "fillupRecords",
              e => e._id.username === username,
            ),
            coll("userTypes", "vehicles", e => e._id === username),
            Match.exhaustive,
          ),
        ),
        Stream.groupedWithin(500, "500 millis"),
        Stream.map(changeEventsToFrontend),
        Stream.flattenIterables,
        Stream.map(Schema.encodeSync(FrontendChangeEvent)),
        Stream.map(stringifyCircular),
      );
    }),
  );

export const createEventStream = flow(
  createFrontendChangeStreamForUser,
  Stream.merge(
    // send one immediately then at an interval
    Stream.concat(
      Stream.succeed("ping" as const),
      pipe(
        Stream.repeatValue("ping" as const),
        Stream.schedule(Schedule.spaced(HeartbeatInterval)),
      ),
    ),
    { haltStrategy: "left" },
  ),
);

const extractComponents = (cs: readonly AddressComponent[]) => {
  const byType = cs.reduce(
    (acc, c) =>
      HashMap.union(acc, HashMap.fromIterable(c.types.map(t => [t, c]))),
    HashMap.empty<PlaceType, AddressComponent>(),
  );
  const getEntry = (type: PlaceType, long = false) =>
    pipe(byType, HashMap.get(type), Option.getOrUndefined, c =>
      long ? c?.longText : c?.shortText,
    );

  const makeStreet = () => {
    const num = getEntry("street_number");
    const street = getEntry("route");

    return num || street
      ? [num, street].filter(isNotUndefined).join(" ")
      : undefined;
  };

  return {
    street: makeStreet(),
    city: getEntry("locality"),
    state: getEntry("administrative_area_level_1", true),
    country: getEntry("country"),
    postalCode: getEntry("postal_code"),
  };
};

const ConvertedPlace = Schema.transformOrFail(GooglePlace, Place, {
  strict: true,
  encode: (input, _, ast) =>
    ParseResult.fail(
      new ParseResult.Forbidden(ast, input, "one-way transform"),
    ),
  decode: ({
    displayName,
    name,
    googleMapsUri,
    formattedAddress,
    location,
    addressComponents,
  }) =>
    Schema.encode(Place)({
      name: displayName.text,
      googleMapsUri: Option.some(googleMapsUri),
      googlePlacesId: name,
      fullAddress: formattedAddress,
      location: Option.some(location),
      ...extractComponents(addressComponents),
    }).pipe(mapError(e => e.issue)),
});

export const getGasStations =
  (colls: AppCollections, gPlaces: GooglePlaces) =>
  (username: Username, mode: GasStationQueryMode, location: Location) =>
    gen(function* () {
      const { googleMapsApiKey } =
        yield* preferencesApiLive.getSecurePreferences(colls, username);

      if (Option.isNone(googleMapsApiKey)) return yield* new NoMapsApiKeySet();

      const apiKey = googleMapsApiKey.value;
      // const include = [
      //   ...((includeGasStations ?? true) ? ["gas_station"] : []),
      //   ...(includeEVChargingStations
      //     ? ["electric_vehicle_charging_station"]
      //     : []),
      // ];

      const res = yield* gPlaces.queryForPlaces(apiKey, location, mode, 5000);

      console.log(apiKey, Redacted.value(apiKey), res);

      return res.places.map(p =>
        GasStationResponsePlace.make({
          // eslint-disable-next-line @typescript-eslint/no-misused-spread
          ...Schema.decodeSync(ConvertedPlace)(
            Schema.encodeSync(GooglePlace)(p),
          ),
          distanceFromSearchLocation: pipe(
            geolib.getDistance(location, p.location),
            d => {
              const ft = Math.round(geolib.convertDistance(d, "ft"));
              if (ft < 1000) return `${ft} ft`;

              const mi = geolib.convertDistance(d, "mi");
              const rounded = mi < 10 ? Number.round(mi, 1) : Math.round(mi);
              return `${rounded} mi`;
            },
          ),
        }),
      );
    });
