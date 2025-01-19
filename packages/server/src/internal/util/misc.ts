import { HttpServerRequest } from "@effect/platform";
import { flow, Option, pipe } from "effect";
import { isString } from "effect/String";

export const queryParams = (request: HttpServerRequest.HttpServerRequest) =>
  pipe(
    HttpServerRequest.toURL(request),
    Option.andThen(HttpServerRequest.searchParamsFromURL),
  );

export const stringQueryParam = (name: string) =>
  flow(
    queryParams,
    Option.andThen(q => q[name]),
    Option.andThen(Option.liftPredicate(isString)),
  );
