import { Todo, TodoId } from "@guzzler/domain/apis/TodosApi";
import { Option } from "effect";
import React, { useCallback, useEffect, useState } from "react";
import reactLogo from "../assets/react.svg";
import { makeRunFunctions } from "../internal/bootstrap.js";
import { TodosClient } from "../apiclients/TodosClient.js";
import { AccountClient } from "../apiclients/AccountClient.js";
import { useTranslation } from "../i18n.js";
import viteLogo from "/vite.svg";

const { runP } = makeRunFunctions(TodosClient.Default, AccountClient.Default);

const HomePage = () => {
  const { t } = useTranslation();

  const [todos, setTodos] = useState<readonly Todo[]>([]);
  const [text, setText] = useState("");

  const fetchTodos = useCallback(
    () => runP(TodosClient.list).then(setTodos),
    [],
  );

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
    (id: TodoId, done: boolean) =>
      runP(TodosClient.edit(id, { done })).then(fetchTodos),
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
    <>
      <p>{t("appName")}</p>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div className="card">
        <button onClick={onDeleteClick}>Delete Account</button>
        <p>something something fill space</p>
      </div>
      {todos.map(todo => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={e => setDone(todo.id, e.target.checked)}
          />{" "}
          <span
            style={{ textDecoration: todo.done ? "line-through" : undefined }}
          >
            {todo.text}
          </span>{" "}
          <button onClick={() => doDelete(todo.id)}>🗑️</button>
          <button onClick={() => view(todo.id)}>🔎</button>
        </div>
      ))}
      <div>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
};

export default HomePage;
