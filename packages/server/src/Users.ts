import { OAuthUserInfo, UserInfoId } from "@guzzler/domain/OAuthUserInfo";
import { User, Username } from "@guzzler/domain/User";
import { Effect } from "effect";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";

export class Users extends Effect.Service<Users>()("Users", {
  accessors: true,
  effect: Effect.gen(function* () {
    const { users } = yield* CollectionRegistry;

    const getUserById = (_id: UserInfoId) => users.findOne({ _id });

    const deleteUser = (username: Username) => users.deleteOne({ username });

    const addUser = (user: User) => users.insertOne(user).pipe(Effect.asVoid);

    const updateUserInfo = (username: Username, oAuthUserInfo: OAuthUserInfo) =>
      users.setFieldsOne({ username }, { oAuthUserInfo });

    const usernameAvailable = (username: Username) =>
      users.count({ username }).pipe(Effect.andThen(c => c === 0));

    return {
      getUserById,
      deleteUser,
      addUser,
      updateUserInfo,
      usernameAvailable,
    };
  }),
}) {}
