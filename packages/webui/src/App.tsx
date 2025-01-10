import { OAuthUserInfo, SignupApi, User as U } from "@guzzler/domain";
import { FullSession, SessionWithoutUser } from "@guzzler/domain/apis/SessionApi";
import { Todo, TodoId } from "@guzzler/domain/apis/TodosApi";
import { Effect, Either, Match, Option, ParseResult, pipe, Schema } from "effect";
import { isNotUndefined } from "effect/Predicate";
import React, { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { AccountClient } from "./apiclients/AccountClient.js";
import { SessionClient } from "./apiclients/SessionClient.js";
import { SignupClient } from "./apiclients/SignupClient.js";
import { TodosClient } from "./apiclients/TodosClient.js";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { runP } from "./bootstrap.js";
import {
  defaultGlobalContext,
  Errored,
  FullSessionContext,
  GlobalContext,
  Succeeded,
  Unauthenticated,
  useCurrentSessionInfo,
} from "./GlobalContext.js";
import { useTranslation } from "./i18n.js";
import Loading from "./Loading.js";
import { Login } from "./pages/Login.js";
import { AppRoute, routes, useRoute } from "./router.js";

const UserInfo = ({ given_name: name, picture }: OAuthUserInfo.OAuthUserInfo) => {
  const { t } = useTranslation();

  return (
    <>
      <div>{t("trash.hello", { name })}</div>
      <div>{picture && <img src={picture} alt="profile image" referrerPolicy="no-referrer" />}</div>
      <div>
        <a href="/session/logout">Logout</a>
      </div>
    </>
  );
};

const LoggedInApp = (session: FullSession) => {
  const { userInfo, user } = session;
  const { t } = useTranslation();
  const [todos, setTodos] = useState<readonly Todo[]>([]);
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
    (id: TodoId, done: boolean) => runP(TodosClient.edit(id, { done })).then(fetchTodos),
    [fetchTodos],
  );

  const doDelete = useCallback(
    (id: TodoId) => {
      if (window.confirm("Are you sure?")) {
        void runP(TodosClient.remove(id)).then(fetchTodos);
      }
    },
    [fetchTodos],
  );

  const view = useCallback(
    (id: TodoId) =>
      void runP(TodosClient.fetch(id)).then(
        Option.match({
          onNone: () => window.alert("it got deleted? refresh?"),
          // this isn't true, maybe we delete this lint? but this is junk code anyway

          onSome: todo => window.alert(`got todo ${JSON.stringify(todo)}`),
        }),
      ),

    [],
  );

  const onDeleteClick = () => {
    if (window.confirm("Are you sure?")) {
      void runP(AccountClient.deleteAccount());
    }
  };

  return (
    <FullSessionContext.Provider value={session}>
      <p>{t("appName")}</p>
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
        <button onClick={onDeleteClick}>Delete Account</button>
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
    </FullSessionContext.Provider>
  );
};
const LoggedInAppWrapper = () => {
  const session = useCurrentSessionInfo();

  return session?._tag === "FullSession" ? <LoggedInApp {...session} /> : <></>;
};

const CreateUser = ({ userInfo }: Omit<SessionWithoutUser, "_tag">) => {
  const [username, _setUsername] = useState<string>();
  const [checkingForConflict, setCheckingForConflict] = useState(false);
  const [error, setError] = useState<string>();
  const [available, setAvailable] = useState<boolean>();
  const timerRef = useRef<number | undefined>(undefined);

  const checkUsername = () => {
    _setUsername(username => {
      if (isNotUndefined(username)) {
        Either.match(Schema.decodeEither(U.Username)(username, { errors: "first" }), {
          onRight: u => {
            void pipe(
              SignupClient.validateUsername(u),
              Effect.andThen(({ available }) => setAvailable(available)),
              Effect.catchAllDefect(() => Effect.sync(() => setAvailable(false))),
              Effect.ensuring(Effect.sync(() => setCheckingForConflict(false))),
              runP,
            );
          },
          onLeft: e => {
            setCheckingForConflict(false);
            setError(
              ParseResult.ArrayFormatter.formatErrorSync(e)
                .map(i => `${i.path.join(".")} ${i.message}`)
                .join("\n"),
            );
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
      form.method = SignupApi.SignupApi.endpoints.setUsername.method;
      form.action = SignupApi.SignupApi.endpoints.setUsername.path;
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
const CreateUserWrapper = () => {
  const sess = useCurrentSessionInfo();

  return sess ? <CreateUser {...sess} /> : <></>;
};

const Page = (): ReactElement =>
  Match.value(useRoute()).pipe(
    Match.when(
      route => route.name === false,
      () => (
        <>
          <div>Not Found</div>
          <div>
            <a {...routes.home().link}>Go Home</a>
          </div>
        </>
      ),
    ),
    Match.discriminatorsExhaustive("name")({
      login: () => <Login />,
      home: () => <LoggedInAppWrapper />,
      newUser: () => <CreateUserWrapper />,
    }),
  );

const App = () => {
  const [globalContext, setGlobalContext] = useState(defaultGlobalContext);
  const route = useRoute();

  useEffect(
    () =>
      void pipe(
        SessionClient.getSessionInfo,
        Effect.andThen(si => setGlobalContext(Succeeded.make({ sessionInfo: si }))),
        Effect.catchTag("Unauthorized", () => Effect.sync(() => setGlobalContext(Unauthenticated.make()))),
        Effect.catchAll(e => Effect.sync(() => setGlobalContext(Errored.make({ error: e.message })))),
        runP,
      ),
    [],
  );

  const isUnauthenticated = !globalContext.loading && globalContext._tag === "Unauthenticated";
  const isNewUser =
    !globalContext.loading &&
    globalContext._tag === "Succeeded" &&
    globalContext.sessionInfo._tag === "SessionWithoutUser";

  useEffect(() => {
    const replaceIf = (replaceWith: AppRoute, b: boolean) => {
      if (b && route.name !== replaceWith.name) replaceWith.replace();
    };
    replaceIf(routes.login(), isUnauthenticated);
    replaceIf(routes.newUser(), isNewUser);
  }, [isNewUser, isUnauthenticated, route.name]);

  return (
    <GlobalContext.Provider value={globalContext}>
      {globalContext.loading ? (
        <Loading />
      ) : (
        Match.value(globalContext).pipe(
          Match.tag("Errored", e => <div>Error: {e.error}</div>),
          Match.orElse(() => <Page />),
        )
      )}
    </GlobalContext.Provider>
  );
};

export default App;
