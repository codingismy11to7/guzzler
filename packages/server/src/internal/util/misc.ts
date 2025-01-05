import { HttpServerRequest } from "@effect/platform";
import { flow, Option, pipe } from "effect";
import { isString } from "effect/String";

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const removeField = <T, F extends keyof T>(obj: T, fieldName: F): Omit<T, F> => {
  const { [fieldName]: _, ...rest } = obj;
  return rest;
};

export const queryParams = (request: HttpServerRequest.HttpServerRequest) =>
  pipe(HttpServerRequest.toURL(request), Option.andThen(HttpServerRequest.searchParamsFromURL));

export const stringQueryParam = (name: string) =>
  flow(
    queryParams,
    Option.andThen(q => q[name]),
    Option.andThen(Option.liftPredicate(isString)),
  );
