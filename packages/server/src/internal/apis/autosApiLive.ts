import { AutosModel } from "@guzzlerapp/domain";
import { RedactedError } from "@guzzlerapp/domain/Errors";
import { HeartbeatInterval } from "@guzzlerapp/domain/models/AutosModel";
import { Username } from "@guzzlerapp/domain/User";
import { RandomId } from "@guzzlerapp/utils/RandomId";
import {
  Effect,
  flow,
  Match,
  Option,
  pipe,
  Schedule,
  Schema,
  Stream,
} from "effect";
import { gen } from "effect/Effect";
import { stringifyCircular } from "effect/Inspectable";
import { Dequeue } from "effect/Queue";
import { Scope } from "effect/Scope";
import { ChangeStreamDocument } from "mongodb";

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
        Schema.decodeUnknown(AutosModel.ChangeEvent)({
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
        Stream.map(AutosModel.changeEventsToFrontend),
        Stream.flattenIterables,
        Stream.map(Schema.encodeSync(AutosModel.FrontendChangeEvent)),
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
