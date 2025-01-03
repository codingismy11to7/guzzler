import PkgJson from "@npmcli/package-json";
import { Effect, pipe } from "effect";

export const logVersion = pipe(
  Effect.promise(() => PkgJson.load(".", { create: false })),
  Effect.andThen(pkgJson => Effect.logInfo(`Version ${pkgJson.content.version}`)),
);
