import * as crypto from "crypto";
import { Effect, pipe, Schema, Struct } from "effect";
import { gen } from "effect/Effect";
import { stringifyCircular } from "effect/Inspectable";

const IvLen = 16;

export const KeyBytesHexString = Schema.Trim.pipe(
  Schema.pattern(/[0-9a-fA-F]{64}/, {
    identifier: "KeyBytesString",
  }),
);
export type KeyBytesHexString = typeof KeyBytesHexString.Type;

const EncryptedDoc = Schema.Struct({
  __iv: Schema.String,
  __data: Schema.String,
  __authTag: Schema.String,
});

export const encrypt =
  (encryptionKey: KeyBytesHexString) =>
  <Keys extends PropertyKey[]>(
    s: Partial<Record<Keys[number], any>>,
    ...plainTextKeys: Keys
  ) =>
    Effect.sync(() => {
      const withoutPlainFields = Struct.omit(s, ...plainTextKeys);
      const key = Buffer.from(encryptionKey, "hex");
      const iv = crypto.randomBytes(IvLen);

      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const ciphered = pipe(
        cipher.update(stringifyCircular(withoutPlainFields), "utf-8", "hex"),
        pre => pre + cipher.final("hex"),
      );

      const onlyPlainText = Struct.pick(s, ...plainTextKeys);

      const __authTag = cipher.getAuthTag().toString("hex");

      return {
        // @ts-expect-error
        ...onlyPlainText,
        __iv: iv.toString("hex"),
        __data: ciphered,
        __authTag,
      };
    });

export const decrypt =
  (encryptionKey: KeyBytesHexString) => (doc: Record<string, unknown>) =>
    gen(function* () {
      const {
        __iv: iv,
        __data,
        __authTag,
        ...rest
      } = yield* Schema.decodeUnknownEither(EncryptedDoc, {
        onExcessProperty: "preserve",
      })(doc);

      const key = Buffer.from(encryptionKey, "hex");

      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(iv, "hex"),
      );
      decipher.setAuthTag(Buffer.from(__authTag, "hex"));
      const deciphered = pipe(
        decipher.update(__data, "hex", "utf-8"),
        pre => pre + decipher.final("utf-8"),
      );

      const obj = yield* Schema.decodeEither(
        Schema.parseJson(Schema.Struct({})),
      )(deciphered);

      return {
        ...rest,
        ...obj,
      };
    });
