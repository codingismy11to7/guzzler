import { OAuthUserInfo, SessionApi } from "@guzzler/domain";
import React from "react";
import { useTranslation } from "../i18n.js";

export const UserInfo = ({
  given_name: name,
  picture,
}: OAuthUserInfo.OAuthUserInfo) => {
  const { t } = useTranslation();

  return (
    <>
      <div>{t("trash.hello", { name })}</div>
      <div>
        {picture && (
          <img src={picture} alt="profile image" referrerPolicy="no-referrer" />
        )}
      </div>
      <div>
        <a href={SessionApi.SessionApi.endpoints[SessionApi.Logout].path}>
          Logout
        </a>
      </div>
    </>
  );
};
