import {
  Headers,
  HttpApiBuilder,
  HttpBody,
  HttpClientRequest,
} from "@effect/platform";
import { HttpClient } from "@effect/platform/HttpClient";
import { withLoggerDisabled } from "@effect/platform/HttpMiddleware";
import { HttpServerRequest } from "@effect/platform/HttpServerRequest";
import { stream } from "@effect/platform/HttpServerResponse";
import { AppApi } from "@guzzler/domain/AppApi";
import { ServerError } from "@guzzler/domain/Errors";
import { Cause, Effect, pipe } from "effect";

export const UIDev = HttpApiBuilder.group(AppApi, "ui", handlers =>
  handlers.handleRaw("ui", () =>
    Effect.gen(function* () {
      const req = yield* HttpServerRequest;
      const httpClient = yield* HttpClient;

      const resp = yield* httpClient.execute(
        HttpClientRequest.make(req.method)(`http://localhost:3000${req.url}`, {
          headers: pipe(req.headers, Headers.remove("host")),
          ...(req.method === "GET" || req.method === "HEAD"
            ? {}
            : { body: HttpBody.stream(req.stream) }),
        }),
      );

      return stream(resp.stream, resp);
    }).pipe(
      Effect.catchAllCause(
        e => new ServerError({ message: `Error proxying: ${Cause.pretty(e)}` }),
      ),
      withLoggerDisabled,
    ),
  ),
);
