import { AppApi, OAuthUserInfo, User as U } from "@guzzler/domain";
import { FullSession, SessionInfo, SessionWithoutUser } from "@guzzler/domain/AppApi";
import { Effect, Either, Option, pipe, Schema } from "effect";
import { isNotUndefined, isUndefined } from "effect/Predicate";
import React, { useCallback, useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { runP } from "./bootstrap.js";
import { SessionClient } from "./SessionClient.js";
import { TodosClient } from "./TodosClient.js";

const UserInfo = ({ given_name, picture }: OAuthUserInfo.OAuthUserInfo) => (
  <>
    <div>Hello, {given_name}</div>
    <div>{picture && <img src={picture} alt="profile image" referrerPolicy="no-referrer" />}</div>
    <div>
      <a href="/session/logout">Logout</a>
    </div>
  </>
);

const LoggedInApp = ({ userInfo, user }: Omit<FullSession, "_tag">) => {
  const [todos, setTodos] = useState<readonly AppApi.Todo[]>([]);
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");

  const fetchTodos = useCallback(() => runP(TodosClient.list).then(setTodos), []);

  useEffect(() => {
    void fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    void fetchTodos();
    const handle = setInterval(fetchTodos, 20000);
    return () => clearInterval(handle);
  }, [fetchTodos]);

  const addTodo = useCallback(
    () =>
      runP(TodosClient.create(text))
        .then(fetchTodos)
        .then(() => setText("")),
    [fetchTodos, text],
  );

  const setDone = useCallback(
    (id: AppApi.TodoId, done: boolean) => runP(TodosClient.edit(id, { done })).then(fetchTodos),
    [fetchTodos],
  );

  const doDelete = useCallback(
    (id: AppApi.TodoId) => {
      if (window.confirm("Are you sure?")) {
        void runP(TodosClient.remove(id)).then(fetchTodos);
      }
    },
    [fetchTodos],
  );

  const view = useCallback(
    (id: AppApi.TodoId) =>
      void runP(TodosClient.fetch(id)).then(
        Option.match({
          onNone: () => window.alert("it got deleted? refresh?"),
          // this isn't true, maybe we delete this lint? but this is junk code anyway

          onSome: todo => window.alert(`got todo ${JSON.stringify(todo)}`),
        }),
      ),

    [],
  );

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div>{user.username}</div>
      <UserInfo {...userInfo} />
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      {todos.map(todo => (
        <div key={todo.id}>
          <input type="checkbox" checked={todo.done} onChange={e => setDone(todo.id, e.target.checked)} />{" "}
          <span style={{ textDecoration: todo.done ? "line-through" : undefined }}>{todo.text}</span>{" "}
          <button onClick={() => doDelete(todo.id)}>🗑️</button>
          <button onClick={() => view(todo.id)}>🔎</button>
        </div>
      ))}
      <div>
        <input type="text" value={text} onChange={e => setText(e.target.value)} />
        <button onClick={addTodo}>Add</button>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </>
  );
};

const LoginScreen = () => (
  <div>
    <a href="/auth/google">Google Login</a>
  </div>
);

const CreateUser = ({ userInfo }: Omit<SessionWithoutUser, "_tag">) => {
  const [username, _setUsername] = useState<string>();
  const [checkingForConflict, setCheckingForConflict] = useState(false);
  const [error, setError] = useState<string>();
  const [available, setAvailable] = useState<boolean>();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const checkUsername = () => {
    _setUsername(username => {
      if (isNotUndefined(username)) {
        Either.match(Schema.decodeEither(U.Username)(username, { errors: "first" }), {
          onRight: u => {
            void pipe(
              SessionClient.validateUsername(u),
              Effect.andThen(({ available }) => setAvailable(available)),
              Effect.catchAllDefect(() => Effect.void),
              Effect.ensuring(Effect.sync(() => setCheckingForConflict(false))),
              runP,
            );
          },
          onLeft: e => {
            setCheckingForConflict(false);
            setError(e.message);
          },
        });
        return username;
      }
    });
  };

  const setUsername = (u: string) => {
    const newName = u.trim().toLowerCase();
    if (username !== newName) {
      setCheckingForConflict(true);
      setAvailable(undefined);
      setError(undefined);
      _setUsername(newName);
      pipe(timerRef.current, Option.fromNullable, Option.andThen(clearTimeout));
      timerRef.current = setTimeout(() => checkUsername(), 1000);
    }
  };

  const handleSave = () => {
    if (isNotUndefined(username)) {
      const form = document.createElement("form");
      form.method = AppApi.SessionApi.endpoints.setUsername.method;
      form.action = AppApi.SessionApi.endpoints.setUsername.path;
      const inp = document.createElement("input");
      inp.type = "hidden";
      inp.name = "username";
      inp.value = username;
      form.appendChild(inp);
      document.body.appendChild(form);
      form.submit();
    }
  };

  return (
    <>
      <h1>New User</h1>
      <UserInfo {...userInfo} />
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", padding: "8px", backgroundColor: "#111" }}>
          <span>☝️</span>
          <span>Not you? Click Logout</span>
        </div>
      </div>
      <hr />
      <div>Let&#39;s pick a username:</div>
      <div>
        <input type="text" value={username ?? ""} onChange={e => setUsername(e.target.value.trim().toLowerCase())} />
        <span style={{ opacity: isNotUndefined(available) ? undefined : "0%" }}>{available ? "✅" : "❌"}</span>
      </div>
      {error && (
        <div style={{ color: "red", fontSize: "small", whiteSpace: "pre-wrap", textAlign: "start" }}>{error}</div>
      )}
      {checkingForConflict && <div style={{ fontSize: "small" }}>Checking for availability...</div>}
      <div>
        <button disabled={!available} onClick={handleSave}>
          {!available ? "Save" : "I'm super happy with this"}
        </button>
      </div>
    </>
  );
};

const App = () => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pipe(
      SessionClient.getSessionInfo,
      Effect.andThen(setSessionInfo),
      Effect.catchTag("Unauthenticated", () => Effect.succeed(undefined)),
      Effect.catchAll(e => Effect.sync(() => setError(e.message)).pipe(Effect.as(undefined))),
      Effect.ensuring(Effect.sync(() => setLoading(false))),
      runP,
    );
  }, []);

  return loading ? (
    <div>Loading...</div>
  ) : error ? (
    <div>Error: {error}</div>
  ) : isUndefined(sessionInfo) ? (
    <LoginScreen />
  ) : sessionInfo._tag === "SessionWithoutUser" ? (
    <CreateUser userInfo={sessionInfo.userInfo} />
  ) : (
    <LoggedInApp userInfo={sessionInfo.userInfo} user={sessionInfo.user} />
  );
};

export default App;
