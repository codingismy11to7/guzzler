import { describe, expect, it } from "@effect/vitest";
import { Option, Redacted, Schema } from "effect";
import { SecureUserPreferencesPatch } from "../src/SecureUserPreferences.js";

describe("SecureUserPreferences", () => {
  describe("SecureUserPreferencesPatch", () => {
    // not going to delete this, but turns out, duh, there's no point -
    // JSON doesn't have null and undefined, just null or missing
    // also now that i've updated it...it no longer has 3 different
    // states. so uh should probably just delete, but whatever - it's at
    // least testing more than the Dummy.test.ts file that existed before. can
    // update to be useful later
    it("should decode to 3 different states", () => {
      const decode = Schema.decodeSync(SecureUserPreferencesPatch);

      const withMissing = decode({});
      const withStr = decode({ googleMapsApiKey: "key" });
      const withUndefined = decode({ googleMapsApiKey: undefined });

      expect(withMissing).toEqual({ googleMapsApiKey: Option.none() });
      expect(withStr).toEqual(
        SecureUserPreferencesPatch.make({
          googleMapsApiKey: Option.some(Redacted.make("key")),
        }),
      );
      expect(Schema.encodeSync(SecureUserPreferencesPatch)(withStr)).toEqual({
        googleMapsApiKey: "key",
      });
      expect(withUndefined).toEqual({ googleMapsApiKey: Option.none() });
    });
  });
});
