import { OAuthUserInfo } from "@guzzler/domain/OAuthUserInfo";
import { User, UserId, Username } from "@guzzler/domain/User";
import { Effect } from "effect";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";

export class Users extends Effect.Service<Users>()("Users", {
  accessors: true,
  effect: Effect.gen(function* () {
    const { users } = yield* CollectionRegistry;

    const getUser = (id: UserId) => users.findOne({ id });

    const deleteUser = (id: UserId) => users.deleteOne({ id });

    const addUser = (user: User) => users.insertOne(user).pipe(Effect.asVoid);

    const updateUserInfo = (id: UserId, oAuthUserInfo: OAuthUserInfo) =>
      users.setFieldsOne({ id }, { oAuthUserInfo });

    const usernameAvailable = (username: Username) =>
      users.count({ username }).pipe(Effect.andThen(c => c === 0));

    return { getUser, deleteUser, addUser, updateUserInfo, usernameAvailable };
  }),
}) {}
