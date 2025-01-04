import { AppApi } from "@guzzler/domain";
import { Option } from "effect";
import React, { useCallback, useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { runP } from "./bootstrap.js";
import { TodosClient } from "./TodosClient.js";

const App = () => {
  const [todos, setTodos] = useState<readonly AppApi.Todo[]>([]);
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");

  const fetchTodos = useCallback(() => runP(TodosClient.list).then(setTodos), []);

  useEffect(() => {
    void fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    void fetchTodos();
    const handle = setInterval(fetchTodos, 2000);
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
    (id: number, done: boolean) => runP(TodosClient.edit(id, { done })).then(fetchTodos),
    [fetchTodos],
  );

  const doDelete = useCallback(
    (id: number) => {
      if (window.confirm("Are you sure?")) {
        void runP(TodosClient.remove(id)).then(fetchTodos);
      }
    },
    [fetchTodos],
  );

  const view = useCallback(
    (id: number) =>
      void runP(TodosClient.fetch(id)).then(
        Option.match({
          onNone: () => window.alert("it got deleted? refresh?"),
          // this isn't true, maybe we delete this lint? but this is junk code anyway
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          onSome: todo => window.alert(`got todo ${todo}`),
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
      <h1>Vite + React</h1>
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

export default App;
