import { OAuthUserInfo } from "@guzzler/domain/OAuthUserInfo";
import { UserId } from "@guzzler/domain/User";
import { Effect } from "effect";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";

export class Users extends Effect.Service<Users>()("Users", {
  accessors: true,
  effect: Effect.gen(function* () {
    const { users } = yield* CollectionRegistry;

    const getUser = (id: UserId) => users.findOne({ id });

    const updateUserInfo = (id: UserId, oAuthUserInfo: OAuthUserInfo) => users.setFieldsOne({ id }, { oAuthUserInfo });

    return { getUser, updateUserInfo };
  }),
}) {}
