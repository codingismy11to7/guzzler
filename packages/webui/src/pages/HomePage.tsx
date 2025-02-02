import React from "react";
import { AccountClient } from "../apiclients/AccountClient.js";
import reactLogo from "../assets/react.svg";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { useTranslation } from "../i18n.js";
import viteLogo from "/vite.svg";
import { runP } from "../internal/bootstrap.js";

const HomePage = () => {
  const { t } = useTranslation();

  const onDeleteClick = () => {
    if (window.confirm("Are you sure?")) {
      void runP(AccountClient.deleteAccount());
    }
  };

  return (
    <StandardPageBox>
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
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </StandardPageBox>
  );
};

export default HomePage;
