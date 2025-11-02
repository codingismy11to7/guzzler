import { Context, Effect, Layer, Schema } from "effect";
import { gen } from "effect/Effect";
import * as internal from "./internal/crypto.js";

export class MongoCryptoKey extends Context.Tag("MongoCryptoKey")<
  MongoCryptoKey,
  internal.KeyBytesHexString
>() {
  static readonly make = (key: string) =>
    Layer.effect(
      MongoCryptoKey,
      Schema.encode(internal.KeyBytesHexString)(key),
    );
}

export class MongoCrypto extends Effect.Service<MongoCrypto>()("MongoCrypto", {
  effect: gen(function* () {
    const encKey = yield* MongoCryptoKey;

    const encrypt = internal.encrypt(encKey);
    const decrypt = internal.decrypt(encKey);

    return { encrypt, decrypt };
  }),
}) {}
