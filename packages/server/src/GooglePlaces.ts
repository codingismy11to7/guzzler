import { HttpBody } from "@effect/platform";
import { HttpClient } from "@effect/platform/HttpClient";
import { ResponseError } from "@effect/platform/HttpClientError";
import { BadGateway, RedactedError } from "@guzzler/domain/Errors";
import { NumberFromSelfOrString } from "@guzzler/domain/MiscSchemas";
import { GasStationQueryMode } from "@guzzler/domain/models/AutosApiModel";
import {
  FilterablePlaceType,
  GooglePlace,
} from "@guzzler/domain/models/GooglePlace";
import { Location } from "@guzzler/domain/models/Location";
import { GoogleMapsApiKey } from "@guzzler/domain/SecureUserPreferences";
import { RandomId } from "@guzzler/utils/RandomId";
import { Effect, Match as M, Redacted, Schema as S } from "effect";
import {
  annotateLogs,
  catchTags,
  gen,
  logInfo,
  logWarning,
  orDie,
} from "effect/Effect";
import { stringifyCircular } from "effect/Inspectable";

const NearbySearchRequest = S.Struct({
  includedTypes: S.Array(FilterablePlaceType),
  maxResultCount: S.Number,
  rankPreference: S.Literal("POPULARITY", "DISTANCE").pipe(
    S.optionalWith({ default: () => "DISTANCE" }),
  ),
  locationRestriction: S.Struct({
    circle: S.Struct({
      center: S.Struct({
        latitude: NumberFromSelfOrString,
        longitude: NumberFromSelfOrString,
      }),
      radius: S.Number,
    }),
  }),
});

const PlacesResponse = S.Struct({
  places: S.Array(GooglePlace),
});

export class GooglePlaces extends Effect.Service<GooglePlaces>()(
  "GooglePlaces",
  {
    accessors: true,
    effect: gen(function* () {
      const httpClient = yield* HttpClient;
      const randomId = yield* RandomId;

      const responseError = {
        ResponseError: (e: ResponseError) =>
          gen(function* () {
            // bad input is on us
            if (
              e.reason === "StatusCode" &&
              e.response.status >= 400 &&
              e.response.status < 500
            )
              return yield* RedactedError.provideLogged(randomId)(
                "Server bug",
                e,
              );

            yield* logWarning("Error querying GMaps", e);
            return yield* new BadGateway();
          }),
      };

      const queryForPlaces = (
        apiKey: GoogleMapsApiKey,
        location: Location,
        mode: GasStationQueryMode,
        searchRadiusMeters = 500,
      ) =>
        gen(function* () {
          const includedTypes = M.value(mode).pipe(
            M.when("GasStations", () => ["gas_station" as const]),
            M.when("EVChargingStations", () => [
              "electric_vehicle_charging_station" as const,
            ]),
            M.exhaustive,
          );

          const requestBody = S.decodeSync(NearbySearchRequest)({
            includedTypes,
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: location,
                radius: searchRadiusMeters,
              },
            },
          });

          yield* logInfo("Making GMaps request").pipe(
            annotateLogs({ includedTypes, location, requestBody }),
          );

          const fieldMask = [
            "places.addressComponents",
            "places.displayName",
            "places.formattedAddress",
            "places.googleMapsUri",
            "places.id",
            "places.location",
            "places.name",
            "places.shortFormattedAddress",
          ];

          const httpRes = yield* httpClient
            .post("https://places.googleapis.com/v1/places:searchNearby", {
              headers: {
                "X-Goog-Api-Key": Redacted.value(apiKey),
                "X-Goog-FieldMask": fieldMask.join(","),
              },
              body: yield* HttpBody.json(requestBody).pipe(orDie),
            })
            .pipe(
              catchTags({
                ...responseError,

                RequestError: e =>
                  gen(function* () {
                    if (e.reason === "Transport") {
                      yield* logWarning("Error querying GMaps", e);
                      return yield* new BadGateway();
                    }

                    return yield* RedactedError.provideLogged(randomId)(
                      "Server bug",
                      e,
                    );
                  }),
              }),
            );

          const j = yield* httpRes.json.pipe(catchTags(responseError));

          const res = yield* S.decodeUnknown(PlacesResponse)(j).pipe(
            catchTags({
              ParseError: e =>
                gen(function* () {
                  yield* logWarning("Error parsing nearby places", e);
                  return yield* new BadGateway();
                }),
            }),
          );

          console.log("ok got something", stringifyCircular(res, 2));

          return res;
        }).pipe(Effect.scoped);

      return { queryForPlaces };
    }),
  },
) {}
