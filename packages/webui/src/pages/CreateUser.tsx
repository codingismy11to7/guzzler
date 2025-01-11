import { User as U } from "@guzzler/domain";
import { OAuthUserInfo } from "@guzzler/domain/OAuthUserInfo";
import { CheckCircle, ThumbUp } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import {
  Avatar,
  Backdrop,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  TextField,
  Typography,
} from "@mui/material";
import { Duration, Effect, Either, Option, ParseResult, pipe, Schema } from "effect";
import { isUndefined } from "effect/Predicate";
import React, { PropsWithChildren, ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { SignupClient } from "../apiclients/SignupClient.js";
import { runP } from "../bootstrap.js";
import { useCountdown } from "../hooks/useCountdown.js";
import { useTranslation } from "../i18n.js";
import { routes, SignupRoute } from "../router.js";
import { logout } from "../utils/logout.js";
import { onEnterKey } from "../utils/onEnterKey.js";

type CreateUserCardProps = Pick<Props, "userInfo"> &
  Readonly<{
    subheader: string;
    cancelButton?: ReactElement | undefined;
    okButton: ReactElement;
  }>;

const CreateUserCard = ({
  children,
  userInfo,
  subheader,
  cancelButton,
  okButton,
}: PropsWithChildren<CreateUserCardProps>) => (
  <Card elevation={1} sx={{ padding: 2, minWidth: 300 }}>
    <CardHeader
      avatar={<Avatar alt={userInfo.name} src={userInfo.picture} />}
      title={userInfo.name}
      subheader={subheader}
    />
    <CardContent>{children}</CardContent>
    <CardActions sx={{ justifyContent: "space-between" }}>
      {cancelButton}
      {okButton}
    </CardActions>
  </Card>
);

type SetUsernameStepProps = Pick<Props, "userInfo">;

const SetUsernameStep = ({ userInfo }: SetUsernameStepProps) => {
  const { t } = useTranslation();

  const [username, _setUsername] = useState<string>();
  const [checkingForConflict, setCheckingForConflict] = useState(false);
  const [error, setError] = useState<string>();
  const [available, setAvailable] = useState<boolean>();
  const timerRef = useRef<number | undefined>(undefined);

  const checkUsername = useCallback(() => {
    if (username) {
      Either.match(Schema.decodeEither(U.Username)(username, { errors: "first" }), {
        onRight: u => {
          void pipe(
            SignupClient.validateUsername(u),
            Effect.ensuring(Effect.sync(() => setCheckingForConflict(false))),
            Effect.andThen(({ available }) => setAvailable(available)),
            Effect.catchAllDefect(() => Effect.sync(() => setError(t("common.thereWasAProblem")))),
            runP,
          );
        },
        onLeft: e => {
          setCheckingForConflict(false);
          setError(
            ParseResult.ArrayFormatter.formatErrorSync(e)
              .slice(0, 1)
              .map(i => `${i.path.join(".")} ${i.message}`)
              .join(),
          );
        },
      });
    }
  }, [t, username]);

  const clearTimer = useCallback(
    () => void pipe(timerRef.current, Option.fromNullable, Option.andThen(clearTimeout)),
    [],
  );

  useEffect(() => {
    clearTimer();
    timerRef.current = setTimeout(checkUsername, 1000);

    return clearTimer;
  }, [checkUsername, clearTimer]);

  const setUsername = useCallback(
    (u: string) =>
      pipe(
        u
          .trim()
          .toLowerCase()
          .replaceAll(/[^a-z0-9._-]/g, ""),
        newName => {
          if (username !== newName) {
            setCheckingForConflict(!!username);
            setAvailable(undefined);
            setError(undefined);
            _setUsername(newName);
          }
        },
      ),
    [username],
  );

  const helperText = error ?? (isUndefined(available) || available ? undefined : t("createUser.notAvailable"));

  const handleConfirm = useCallback(() => {
    if (username && !checkingForConflict && available) routes.SignupConfirm({ username }).push();
  }, [available, checkingForConflict, username]);

  return (
    <CreateUserCard
      userInfo={userInfo}
      subheader={userInfo.email}
      cancelButton={<Button onClick={logout}>{t("common.cancel")}</Button>}
      okButton={
        <LoadingButton
          onClick={handleConfirm}
          disabled={!available || !username}
          loading={checkingForConflict && !!username}
          loadingPosition="end"
          endIcon={<CheckCircle />}
        >
          {t(checkingForConflict && !!username ? "createUser.checkingForConflictButton" : "createUser.confirm")}
        </LoadingButton>
      }
    >
      <TextField
        fullWidth
        autoFocus
        variant="standard"
        label={t("createUser.setUsername")}
        value={username ?? ""}
        onChange={e => setUsername(e.target.value)}
        error={!!helperText}
        helperText={helperText}
        onKeyUp={onEnterKey(handleConfirm)}
      />
    </CreateUserCard>
  );
};

type ConfirmStepProps = Readonly<{ userInfo: OAuthUserInfo; chosenUsername: string; onCancel: () => void }>;

const ConfirmStep = ({ userInfo, chosenUsername, onCancel }: ConfirmStepProps) => {
  const { t } = useTranslation();

  const [creating, setCreating] = useState(false);

  const { remainingTime, completed } = useCountdown("5 seconds");

  const timeRemaining = Math.ceil(Duration.toSeconds(remainingTime));

  const createAccount = () => {
    const backToSetUsername = Effect.sync(() => routes.Signup().replace());
    const handleTricksy = pipe(
      Effect.sync(() => window.alert("Tsk")),
      Effect.andThen(backToSetUsername),
    );

    return void pipe(
      Schema.decode(U.Username)(chosenUsername),
      Effect.tap(() => setCreating(true)),
      Effect.andThen(SignupClient.setUsername),
      Effect.andThen(() => location.replace("/")),
      // leave the creating spinner going unless there's an error
      Effect.tapErrorCause(() => Effect.sync(() => setCreating(false))),
      Effect.catchTags({
        // changed the url and bypassed the previous validation step
        ParseError: () => handleTricksy,
        HttpApiDecodeError: () => handleTricksy,
        // probably also did that, but let's be charitable
        Conflict: () =>
          pipe(
            Effect.sync(() => window.alert(t("createUser.conflictError"))),
            Effect.andThen(backToSetUsername),
          ),
      }),
      runP,
    );
  };

  return (
    <CreateUserCard
      userInfo={userInfo}
      subheader={chosenUsername}
      cancelButton={creating ? undefined : <Button onClick={onCancel}>{t("createUser.change")}</Button>}
      okButton={
        <LoadingButton
          fullWidth={creating}
          {...(creating ? { variant: "outlined" } : {})}
          disabled={!completed || creating}
          onClick={createAccount}
          loading={creating}
          endIcon={(completed || creating) && <ThumbUp />}
          loadingPosition="end"
        >
          {creating
            ? t("common.loading")
            : completed
              ? t("createUser.createAccount")
              : t("createUser.createAccountCountdown", { timeRemaining })}
        </LoadingButton>
      }
    >
      <Typography variant="body2">
        {t(`createUser.${creating ? "creatingAccount" : "createAccountQuestion"}`)}
      </Typography>
    </CreateUserCard>
  );
};

type Props = Readonly<{ userInfo: OAuthUserInfo; route: SignupRoute }>;

const CreateUser = ({ userInfo, route }: Props) => (
  <Backdrop open={true}>
    {route.name === "Signup" ? (
      <SetUsernameStep userInfo={userInfo} />
    ) : (
      <ConfirmStep
        userInfo={userInfo}
        chosenUsername={route.params.username}
        onCancel={() => routes.Signup().replace()}
      />
    )}
  </Backdrop>
);

export default CreateUser;
