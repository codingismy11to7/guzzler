import { Redacted } from "effect";
import { isArray } from "effect/Array";
import { pipe } from "effect/Function";
import { isRecord } from "effect/Predicate";

export const deRedact = <T>(u: T): T =>
  pipe(
    Redacted.isRedacted(u) ? Redacted.value(u) : u,
    u => (isArray(u) ? u.map(deRedact) : u),
    u => (isRecord(u) ? Object.fromEntries(Object.entries(u).map(([k, v]) => [k, deRedact(v)])) : u),
  ) as T;
