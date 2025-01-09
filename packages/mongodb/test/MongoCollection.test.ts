import { describe, expect, it } from "@effect/vitest";
import { Arbitrary, Effect, FastCheck, Schema } from "effect";
import { SchemaMismatch } from "../src/Model.js";
import { SimpleStructSchema } from "./internal/testSchemas.js";

describe("MongoCollection", () => {
  describe("SchemaMismatch", () => {
    it.effect("should show the full error from the ParseError", () =>
      Effect.gen(function* () {
        const SSS = SimpleStructSchema;
        const obj = FastCheck.sample(Arbitrary.make(SSS), 1)[0];
        const encoded = yield* Schema.encode(SSS.pipe(Schema.omit("str")))(obj);
        const err = yield* Schema.decodeUnknown(SSS)(encoded).pipe(Effect.flip);

        expect(
          `${new SchemaMismatch({ underlying: err })}`.replace("SchemaMismatch: ", "").replace(/SchemaMismatch: /, ""),
        ).toEqual(`${err}`);
      }),
    );
  });
});
