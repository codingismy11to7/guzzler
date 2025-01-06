import { describe, expect, it } from "@effect/vitest";
import { AppConfig, AppConfigLive } from "@guzzler/server/src/AppConfig.js";
import { ConfigError, ConfigProvider, Effect, Layer } from "effect";

describe("AppConfig", () => {
  it.effect.each([
    ["negative", "-42", "port cannot be negative"],
    ["string", "blah", "xpected NumberFromString"],
    ["empty", "", "xpected NumberFromString"],
  ])("should error on invalid port (%s)", ([_, value, errMsg]) =>
    Effect.gen(function* () {
      const err = yield* AppConfig.pipe(
        Effect.provide(
          AppConfigLive.pipe(
            Layer.provide(Layer.setConfigProvider(ConfigProvider.fromMap(new Map([["PORT", value]])))),
          ),
        ),
        Effect.flip,
      );
      expect(err).toEqual(
        expect.objectContaining<Partial<ConfigError.ConfigError>>({
          _op: "InvalidData",
          message: expect.stringContaining(errMsg),
        }),
      );
    }),
  );

  it.effect("should succeed on valid port", () =>
    Effect.gen(function* () {
      const err = yield* AppConfig.pipe(
        Effect.provide(
          AppConfigLive.pipe(
            Layer.provide(Layer.setConfigProvider(ConfigProvider.fromMap(new Map([["PORTypo", "42"]])))),
          ),
        ),
        Effect.flip,
      );
      expect(err).toEqual(
        expect.objectContaining<Partial<ConfigError.ConfigError>>({
          _op: "MissingData",
          message: expect.stringContaining("xpected PORT to exist"),
        }),
      );
    }),
  );
});