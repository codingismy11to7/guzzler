import { Socket } from "@effect/platform";
import { AutosApi, AutosModel, MiscSchemas } from "@guzzlerapp/domain";
import { Duration, Effect, Either, Schema } from "effect";
import { logTrace, logWarning } from "effect/Effect";
import { LazyArg } from "effect/Function";
import { ParseError } from "effect/ParseResult";
import { Scope } from "effect/Scope";

export const makeRawChangesSocket: Effect.Effect<
  globalThis.WebSocket,
  never,
  Socket.WebSocketConstructor | Scope
> = Effect.acquireRelease(
  Effect.map(Socket.WebSocketConstructor, f =>
    f(AutosApi.AutosApi.endpoints[AutosModel.SubscribeToChanges].path),
  ),
  ws => Effect.sync(() => ws.close(1000)),
);

// i went the preferred route of using all the effect streaming stuff with
// the websocket, and spent a day or two fighting with issues. i eventually
// gave up and said "this is prerelease stuff, maybe there's a bug" and switched
// over to imperative handling. now i think it was just a stupid problem with
// me not stopping the ping timeout timer. but i did see some weird stuff
// with the send latch.
// anyway, can revisit this one day, but this way works for now
export const imperativelyHandleSocket =
  (ws: globalThis.WebSocket, runSync: typeof Effect.runSync) =>
  (
    onOpen: LazyArg<void>,
    onErrorEvent: (e: Socket.SocketGenericError) => void,
    onCloseEvent: (e: Socket.SocketCloseError) => void,
    onPushEvent: (e: AutosModel.FrontendChangeEvent) => void,
  ) => {
    let open = false;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopPingTimeout = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };
    const schedulePingTimeout = () => {
      stopPingTimeout();

      const timeout = Duration.times(AutosModel.HeartbeatInterval, 3);

      timer = setTimeout(() => {
        runSync(
          logWarning(
            `Haven't received a ping in ${Duration.format(timeout)}, closing event socket`,
          ),
        );

        onClose({ code: -1, reason: "Ping timeout" });
      }, Duration.toMillis(timeout));
    };

    const onMessage = (event: MessageEvent<string | Uint8Array>) => {
      const msg = parseEvent(event.data);
      Either.match(msg, {
        onLeft: e =>
          runSync(logWarning("Invalid message from server", e, event.data)),

        onRight: e => {
          if (e !== "ping") onPushEvent(e);
          else {
            runSync(logTrace("got ping"));
            ws.send("pong");
            schedulePingTimeout();
          }
        },
      });
    };

    const onError = (cause: Event) => {
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("close", onClose);
      stopPingTimeout();
      onErrorEvent(
        new Socket.SocketGenericError({
          reason: open ? "Read" : "Open",
          cause,
        }),
      );
    };

    const onClose = (event: Pick<globalThis.CloseEvent, "code" | "reason">) => {
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("error", onError);
      stopPingTimeout();
      onCloseEvent(
        new Socket.SocketCloseError({
          reason: "Close",
          code: event.code,
          closeReason: event.reason,
        }),
      );
    };

    ws.addEventListener("close", onClose, { once: true });
    ws.addEventListener("error", onError, { once: true });
    ws.addEventListener("message", onMessage);
    ws.addEventListener(
      "open",
      () => {
        open = true;
        onOpen();
        schedulePingTimeout();
      },
      { once: true },
    );
  };

const parseEvent = (
  data: string | Uint8Array,
): Either.Either<"ping" | AutosModel.FrontendChangeEvent, ParseError> =>
  Either.gen(function* () {
    const str = yield* Schema.decodeEither(
      MiscSchemas.StringFromSelfOrUint8Array,
    )(data);

    if (str === "ping") return str;

    const obj = yield* Schema.decodeEither(Schema.parseJson())(str);
    return yield* Schema.decodeUnknownEither(AutosModel.FrontendChangeEvent)(
      obj,
    );
  });
