import {
  HttpApiBuilder,
  HttpMiddleware,
  HttpServerRequest,
  HttpServerResponse,
  Path,
} from "@effect/platform";
import { NotFound } from "@effect/platform/HttpApiError";
import { AppApi } from "@guzzler/domain/AppApi";
import { ServerError } from "@guzzler/domain/Errors";
import { Effect, pipe } from "effect";
import { orDie } from "effect/Effect";
import { ulid } from "ulid";
import { AppConfig } from "../AppConfig.js";

export const UILive = HttpApiBuilder.group(AppApi, "ui", handlers =>
  handlers.handleRaw("ui", () =>
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const requestedPath = new URL(req.url, "http://localhost").pathname;
      const path = yield* Path.Path;
      const webuiDir = yield* AppConfig.webuiRoot.pipe(
        Effect.andThen(d => path.resolve(".", d)),
      );

      const withoutSlash = requestedPath.startsWith("/")
        ? requestedPath.slice(1)
        : requestedPath;
      const relPath = ["", "index.html"].includes(withoutSlash)
        ? "index.html"
        : withoutSlash;
      const fullPath = path.resolve(webuiDir, relPath);
      const indexPath = path.resolve(webuiDir, "index.html");

      const hiddenError = (e: unknown) =>
        pipe(
          Effect.sync(() => ulid()),
          Effect.tap(id =>
            Effect.logError(
              `Error serving url '${req.url}', error id: ${id}`,
              e,
            ),
          ),
          Effect.andThen(
            id =>
              new ServerError({
                message: `Unexpected server error. Error ID: ${id}`,
              }),
          ),
        );

      if (!fullPath.startsWith(webuiDir)) return yield* new NotFound();
      else
        return yield* pipe(
          HttpServerResponse.file(fullPath).pipe(
            Effect.catchTags({
              SystemError: e =>
                e.module === "FileSystem" && e.reason === "NotFound"
                  ? HttpServerResponse.file(indexPath).pipe(orDie)
                  : hiddenError(e),

              BadArgument: hiddenError,
            }),
          ),
        );
    }).pipe(HttpMiddleware.withLoggerDisabled),
  ),
);
