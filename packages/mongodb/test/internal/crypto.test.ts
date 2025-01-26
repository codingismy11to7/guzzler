import { describe, expect, it } from "@effect/vitest";
import { Chunk, pipe } from "effect";
import { gen } from "effect/Effect";
import { decrypt, encrypt } from "../../src/internal/crypto.js";

describe("crypto", () => {
  it.effect("should perform symmetric encryption", () =>
    gen(function* () {
      const encKey = pipe(
        Chunk.range(1, 64),
        Chunk.map(() => "0"),
        Chunk.join(""),
      );

      const doc = {
        _id: "docId",
        unEnc: true,
        a: 42,
        b: false,
        c: [1],
        d: "X",
      };

      const encrypted: Record<string, unknown> = yield* encrypt(encKey)(
        doc,
        "_id",
        "unEnc",
      );

      expect(encrypted).toEqual({
        _id: "docId",
        unEnc: true,
        __iv: expect.stringMatching(/^([0-9a-f]{2})+$/),
        __data: expect.stringMatching(/^([0-9a-f]{2})+$/),
        __authTag: expect.stringMatching(/^([0-9a-f]{2})+$/),
      });

      const decrypted = yield* decrypt(encKey)(encrypted);

      expect(decrypted).toEqual(doc);
    }),
  );
});
