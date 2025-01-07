import {
  Headers,
  HttpApiBuilder,
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpMiddleware,
  HttpServerRequest,
  HttpServerResponse,
  Path,
} from "@effect/platform";
import { AppApi, NotFound, ServerError } from "@guzzler/domain/AppApi";
import { Cause, Effect, pipe } from "effect";
import { nanoid } from "nanoid";
import { AppConfig } from "../../../AppConfig.js";

export const UILive = HttpApiBuilder.group(AppApi, "ui", handlers =>
  handlers.handleRaw("ui", () =>
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const requestedPath = new URL(req.url, "http://localhost").pathname;
      const path = yield* Path.Path;
      const webuiDir = yield* AppConfig.webuiRoot.pipe(Effect.andThen(d => path.resolve(".", d)));

      const withoutSlash = requestedPath.startsWith("/") ? requestedPath.slice(1) : requestedPath;
      const relPath = ["", "index.html"].includes(withoutSlash) ? "index.html" : withoutSlash;
      const fullPath = path.resolve(webuiDir, relPath);

      const hiddenError = (e: unknown) =>
        pipe(
          Effect.sync(() => nanoid()),
          Effect.tap(id => Effect.logError(`Error serving url '${req.url}', error id: ${id}`, e)),
          Effect.andThen(id => new ServerError({ message: `Unexpected server error. Error ID: ${id}` })),
        );

      if (!fullPath.startsWith(webuiDir)) return yield* new NotFound();
      else
        return yield* pipe(
          HttpServerResponse.file(fullPath).pipe(
            Effect.catchTags({
              SystemError: e =>
                e.module === "FileSystem" && e.reason === "NotFound"
                  ? Effect.succeed(HttpServerResponse.redirect("/", { status: 303 }))
                  : hiddenError(e),

              BadArgument: hiddenError,
            }),
          ),
        );
    }).pipe(HttpMiddleware.withLoggerDisabled),
  ),
);

export const UIDev = HttpApiBuilder.group(AppApi, "ui", handlers =>
  handlers.handleRaw("ui", () =>
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const httpClient = yield* HttpClient.HttpClient;

      yield* Effect.logTrace("Proxying request to", `http://localhost:3000${req.url}`);

      const resp = yield* httpClient.execute(
        HttpClientRequest.make(req.method)(`http://localhost:3000${req.url}`, {
          headers: Headers.remove(req.headers, "host"),
          ...(req.method === "GET" || req.method === "HEAD" ? {} : { body: HttpBody.stream(req.stream) }),
        }),
      );

      return HttpServerResponse.stream(resp.stream, resp);
    }).pipe(
      Effect.catchAllCause(e => new ServerError({ message: `Error proxying: ${Cause.pretty(e)}` })),
      HttpMiddleware.withLoggerDisabled,
    ),
  ),
);
