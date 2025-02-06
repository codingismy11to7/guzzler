import { BrowserHttpClient, BrowserSocket } from "@effect/platform-browser";
import { RandomId } from "@guzzler/utils";
import { format } from "date-fns/fp";
import { flow, Layer, Logger, LogLevel } from "effect";

export const sharedAndLogging = flow(
  Layer.provideMerge(RandomId.RandomId.Default),
  Layer.provide(BrowserHttpClient.layerXMLHttpRequest),
  Layer.provide(BrowserSocket.layerWebSocketConstructor),
  Layer.provide(
    Logger.replace(
      Logger.defaultLogger,
      Logger.prettyLogger({
        colors: "auto",
        mode: "browser",
        formatDate: format("MM/dd/yyyy hh:mm:ss.SSS aa"),
      }),
    ),
  ),
  Layer.provide(
    Logger.minimumLogLevel(
      import.meta.env.DEV ? LogLevel.Debug : LogLevel.Info,
    ),
  ),
);
