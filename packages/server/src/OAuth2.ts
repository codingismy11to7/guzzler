import {
  HttpBody,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpMethod,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Cookie, CookiesError } from "@effect/platform/Cookies";
import { OAuthUserInfo, Token as TokenNS } from "@guzzler/domain";
import { ObjectUtils } from "@guzzler/utils";
import { createHash, randomBytes } from "crypto";
import { Context, Data, Duration, Effect, Layer, Option, pipe, Redacted, Schema } from "effect";
import { isFunction } from "effect/Function";
import { ParseError } from "effect/ParseResult";
import { isString } from "effect/String";
import { Draft, produce } from "immer";
import * as url from "node:url";
import { AuthorizationCode, ModuleOptions, TokenType } from "simple-oauth2";
import { AppConfig } from "./AppConfig.js";
import { stringQueryParam } from "./internal/util/misc.js";
import Token = TokenNS.Token;

// port of https://github.com/fastify/fastify-oauth2
// their copyright, MIT license, etc

export const GoogleConfig: ProviderConfiguration = {
  authorizeHost: "https://accounts.google.com",
  authorizePath: "/o/oauth2/v2/auth",
  tokenHost: "https://www.googleapis.com",
  tokenPath: "/oauth2/v4/token",
};

export class CouldNotGenerateState extends Data.TaggedError("CouldNotGenerateState")<{ message: string }> {}

export type GenerateStateFunction = (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<string, CouldNotGenerateState> | string;

export type CheckStateFunction = (
  options: OAuth2Options,
) => (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<void, InvalidState>;

export type OAuth2Options = Readonly<{
  scope?: string[];
  credentials: ModuleOptions;
  callbackUri: string | ((req: HttpServerRequest.HttpServerRequest) => string);
  callbackUriParams?: Record<string, string | undefined>;
  tokenRequestParams?: Record<string, unknown>;
  generateStateFunction?: GenerateStateFunction;
  checkStateFunction?: CheckStateFunction;
  cookie?: Cookie["options"];
  userAgent?: string | false;
  pkce?: "S256" | "plain";
  discovery?: Readonly<{ issuer: string }>;
  redirectStateCookieName?: string;
  verifierCookieName?: string;
}>;

export type ProviderConfiguration = Readonly<{
  /** String used to set the host to request the tokens to. Required. */
  tokenHost: string;
  /** String path to request an access token. Default to /oauth/token. */
  tokenPath?: string | undefined;
  /** String path to revoke an access token. Default to /oauth/revoke. */
  revokePath?: string | undefined;
  /** String used to set the host to request an "authorization code". Default to the value set on auth.tokenHost. */
  authorizeHost?: string | undefined;
  /** String path to request an authorization code. Default to /oauth/authorize. */
  authorizePath?: string | undefined;
}>;

const DefaultVerifierCookieName = "oauth2-code-verifier";
const DefaultRedirectStateCookieName = "oauth2-redirect-state";
const UserAgent = "guzzler";

const random = (bytes = 32) => randomBytes(bytes).toString("base64");
const codeVerifier = random;
const codeChallenge = (verifier: string | NodeJS.ArrayBufferView) =>
  createHash("sha256").update(verifier).digest("base64url");

const defaultGenerateStateFunction: GenerateStateFunction = () => random(16);

class InvalidState extends Data.TaggedError("InvalidState") {}

const defaultCheckStateFunction: CheckStateFunction = options => request => {
  const url = new URL(request.url, "http://localhost");
  const state = url.searchParams.get("state");
  const stateCookie: string | undefined =
    request.cookies[options.redirectStateCookieName ?? DefaultRedirectStateCookieName];

  return stateCookie && state === stateCookie ? Effect.void : new InvalidState();
};

const getDiscoveryUri = (issuer: string) => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const parsed = url.parse(issuer);

  if (parsed.pathname?.includes("/.well-known/")) {
    return issuer;
  } else {
    const pathname = parsed.pathname?.endsWith("/")
      ? `${parsed.pathname}.well-known/openid-configuration`
      : `${parsed.pathname}/.well-known/openid-configuration`;

    return url.format({ ...parsed, pathname });
  }
};

const selectPkceFromMetadata = (metadata: Pick<DiscoveredMetadata, "code_challenge_methods_supported">) => {
  const methodsSupported = metadata.code_challenge_methods_supported;
  return methodsSupported && methodsSupported.length === 1 && methodsSupported.includes("plain") ? "plain" : "S256";
};

const getAuthFromMetadata = (
  metadata: DiscoveredMetadata,
): (ProviderConfiguration & Pick<DiscoveredMetadata, "code_challenge_methods_supported">) | undefined => {
  /* below comments are from RFC 8414 (https://www.rfc-editor.org/rfc/rfc8414.html#section-2) documentation */

  /*
    authorization_endpoint
      URL of the authorization server's authorization endpoint
      [RFC6749].  This is REQUIRED unless no grant types are supported
      that use the authorization endpoint.
  */
  const auth = pipe(
    Option.fromNullable(metadata.authorization_endpoint),
    Option.andThen(formatEndpoint),
    Option.andThen(({ path, host }) => ({ authorizePath: path, authorizeHost: host })),
  );
  /*
    token_endpoint
      URL of the authorization server's token endpoint [RFC6749].  This
      is REQUIRED unless only the implicit grant type is supported.
  */
  const token = pipe(
    Option.fromNullable(metadata.token_endpoint),
    Option.andThen(formatEndpoint),
    Option.andThen(({ path, host }) => ({ tokenPath: path, tokenHost: host })),
  );
  /*
    revocation_endpoint
      OPTIONAL.  URL of the authorization server's OAuth 2.0 revocation
      endpoint [RFC7009].
  */
  const revokePath = pipe(
    Option.fromNullable(metadata.revocation_endpoint),
    Option.andThen(formatEndpoint),
    Option.andThen(({ path }) => path),
  );

  return pipe(
    token,
    Option.andThen(c => ({
      ...c,
      ...Option.getOrUndefined(auth),
      revokePath: Option.getOrUndefined(revokePath),
      code_challenge_methods_supported: metadata.code_challenge_methods_supported,
    })),
    Option.getOrUndefined,
  );
};

const formatEndpoint = (ep: string) =>
  pipe(new URL(ep), ({ host, protocol, pathname }) => ({ host: `${protocol}//${host}`, path: pathname }));

export class InvalidOptions extends Data.TaggedError("InvalidOptions")<{ message: string }> {}
const invalid = (check: boolean, message: string) =>
  Effect.andThen(
    pipe(
      new InvalidOptions({ message }),
      Effect.when(() => check),
    ),
  );

const validateOptions = (options: OAuth2Options): Effect.Effect<void, InvalidOptions> =>
  pipe(
    Effect.void,
    invalid(
      !!options.discovery && !!options.credentials.auth,
      "when options.discovery.issuer is configured, credentials.auth should not be used",
    ),
    invalid(
      !options.discovery && !options.credentials.auth,
      "options.discovery.issuer or credentials.auth have to be given",
    ),
  );

export class ExternalError extends Data.TaggedError("ExternalError")<{ underlying: Error }> {}

type MethodViaParams = Readonly<{
  method?: HttpMethod.HttpMethod;
  via?: string;
  params: Record<string, string>;
}>;

class DiscoveredMetadata extends Schema.Class<DiscoveredMetadata>("DiscoveredMetadata")({
  authorization_endpoint: Schema.NonEmptyTrimmedString.pipe(Schema.optional),
  token_endpoint: Schema.NonEmptyTrimmedString.pipe(Schema.optional),
  revocation_endpoint: Schema.NonEmptyTrimmedString.pipe(Schema.optional),
  userinfo_endpoint: Schema.NonEmptyTrimmedString.pipe(Schema.optional),
  code_challenge_methods_supported: Schema.Array(Schema.NonEmptyTrimmedString).pipe(Schema.optional),
}) {}

export class OAuth2 extends Context.Tag("OAuth2")<
  OAuth2,
  Readonly<{
    oauth2: AuthorizationCode;
    getAccessTokenFromAuthorizationCodeFlow: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<
      {
        token: Token;
        modifyReply: ReadonlyArray<
          (resp: HttpServerResponse.HttpServerResponse) => HttpServerResponse.HttpServerResponse
        >;
      },
      InvalidState | Error
    >;
    getNewAccessTokenUsingRefreshToken: (
      refreshToken: Token,
      refreshParams?: {
        scope?: string | string[] | undefined;
        onlyIfExpiringWithin: Duration.DurationInput | "disableExpirationCheck" | undefined;
      },
    ) => Effect.Effect<Token, Error | ParseError>;
    generateAuthorizationUri: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<
      {
        authorizeURL: string;
        modifyReply: ReadonlyArray<
          (
            r: HttpServerResponse.HttpServerResponse,
          ) => Effect.Effect<HttpServerResponse.HttpServerResponse, CookiesError>
        >;
      },
      CouldNotGenerateState
    >;
    revokeToken: (token: Token, tokenType: TokenType) => Effect.Effect<void, Error>;
    revokeAllToken: (token: Token) => Effect.Effect<void, Error>;
    userinfo: (
      tokenSetOrToken: string | Readonly<{ access_token: string }>,
      params?: MethodViaParams,
    ) => Effect.Effect<
      OAuthUserInfo.OAuthUserInfo,
      InvalidOptions | ExternalError | HttpClientError.HttpClientError | ParseError
    >;
    fetchUserInfo: (
      userinfoEndpoint: URL | string,
      tokenSetOrToken: string | Readonly<{ access_token: string }>,
      params?: MethodViaParams,
    ) => Effect.Effect<OAuthUserInfo.OAuthUserInfo, ExternalError | HttpClientError.HttpClientError | ParseError>;
    startRedirectHandler: (
      request: HttpServerRequest.HttpServerRequest,
    ) => Effect.Effect<HttpServerResponse.HttpServerResponse>;
  }>
>() {}
type OAuth2Type = Context.Tag.Service<OAuth2>;

export const make = (inputOptions: Omit<OAuth2Options, "credentials">) =>
  Layer.effect(
    OAuth2,
    Effect.gen(function* () {
      const { clientId, clientSecret } = yield* AppConfig.googleOAuth;
      const options: OAuth2Options = {
        ...inputOptions,
        credentials: {
          client: { id: Redacted.value(clientId), secret: Redacted.value(clientSecret) },
          auth: GoogleConfig,
        },
      };

      const httpClient = yield* HttpClient.HttpClient;

      const omitUserAgent = options.userAgent === false;
      const discovery = options.discovery;
      const userAgent = options.userAgent === false ? undefined : (options.userAgent ?? UserAgent);

      const fetchUserInfo = (
        userinfoEndpoint: URL | string,
        tokenSetOrToken: string | Readonly<{ access_token: string }>,
        { method = "GET", via, params = {} }: MethodViaParams = { params: {} },
      ): Effect.Effect<OAuthUserInfo.OAuthUserInfo, ExternalError | HttpClientError.HttpClientError | ParseError> =>
        Effect.gen(function* () {
          const token = isString(tokenSetOrToken) ? tokenSetOrToken : tokenSetOrToken.access_token;
          const httpOpts = pipe(
            {
              method,
              headers: {
                ...options.credentials.http?.headers,
                "User-Agent": userAgent,
                Authorization: `Bearer ${token}`,
              } as Record<string, string | undefined>,
            },
            httpOpts =>
              !omitUserAgent
                ? httpOpts
                : produce(httpOpts, draft => {
                    draft.headers = ObjectUtils.removeField(draft.headers, "User-Agent");
                  }),
          );

          const infoUrl = new URL(userinfoEndpoint);

          const body = (() => {
            if (method === "GET") {
              Object.entries(params).forEach(([k, v]) => {
                infoUrl.searchParams.append(k, v);
              });
            } else {
              httpOpts.headers["Content-Type"] = "application/x-www-form-urlencoded";
              const body = new URLSearchParams();
              if (via === "body") {
                delete httpOpts.headers.Authorization;
                body.append("access_token", token);
              }
              Object.entries(params).forEach(([k, v]) => {
                body.append(k, v);
              });
              return body;
            }
          })();

          const httpClientRequest =
            method === "GET" || method === "HEAD"
              ? HttpClientRequest.make(method)(infoUrl, httpOpts)
              : HttpClientRequest.make(method)(infoUrl, {
                  ...httpOpts,
                  body: body ? HttpBody.text(body.toString()) : undefined,
                });

          const resp = yield* httpClient.execute(httpClientRequest);
          const respBody = yield* resp.text;

          const obj = yield* Effect.try({
            try: () => JSON.parse(respBody),
            catch: e => new ExternalError({ underlying: e as Error }),
          });
          return yield* Schema.decodeUnknown(OAuthUserInfo.OAuthUserInfo)(obj);
        }).pipe(Effect.scoped);

      const discoverMetadata = (
        issuer: string,
      ): Effect.Effect<DiscoveredMetadata, ExternalError | HttpClientError.HttpClientError | ParseError> =>
        pipe(
          pipe(
            {
              headers: {
                ...options.credentials.http?.headers,
                "User-Agent": userAgent,
              } as Record<string, string | undefined>,
            },
            httpOpts =>
              !omitUserAgent
                ? httpOpts
                : produce(httpOpts, draft => {
                    draft.headers = ObjectUtils.removeField(draft.headers, "User-Agent");
                  }),
          ),
          httpOpts => httpClient.execute(HttpClientRequest.make("GET")(getDiscoveryUri(issuer), httpOpts)),
          Effect.andThen(resp => resp.text),
          Effect.scoped,
          Effect.andThen(respBody =>
            Effect.try({ try: () => JSON.parse(respBody), catch: e => new ExternalError({ underlying: e as Error }) }),
          ),
          Effect.andThen(Schema.decodeUnknown(DiscoveredMetadata)),
        );

      const configure = (configured: OAuth2Options, fetchedMetadata?: DiscoveredMetadata): OAuth2Type => {
        const {
          callbackUri,
          callbackUriParams = {},
          tokenRequestParams = {},
          scope,
          generateStateFunction = defaultGenerateStateFunction,
          checkStateFunction = defaultCheckStateFunction,
          redirectStateCookieName = DefaultRedirectStateCookieName,
          verifierCookieName = DefaultVerifierCookieName,
        } = pipe(configured, configured =>
          !userAgent
            ? configured
            : produce(configured, draft => {
                draft.credentials.http = {
                  ...configured.credentials.http,
                  headers: {
                    "User-Agent": userAgent,
                    ...configured.credentials.http?.headers,
                  },
                };
              }),
        );

        const cookieOpts = Object.assign({ httpOnly: true, sameSite: "lax" }, options.cookie);

        const generateAuthorizationUri = (request: HttpServerRequest.HttpServerRequest) =>
          Effect.gen(function* () {
            const state = yield* pipe(generateStateFunction(request), e => (isString(e) ? Effect.succeed(e) : e));

            let modifyReply: ReadonlyArray<
              (
                r: HttpServerResponse.HttpServerResponse,
              ) => Effect.Effect<HttpServerResponse.HttpServerResponse, CookiesError>
            > = [];
            modifyReply = [...modifyReply, HttpServerResponse.setCookie(redirectStateCookieName, state, cookieOpts)];

            // when PKCE extension is used
            let pkceParams = {};
            if (configured.pkce) {
              const verifier = codeVerifier();
              const challenge = configured.pkce === "S256" ? codeChallenge(verifier) : verifier;
              pkceParams = {
                code_challenge: challenge,
                code_challenge_method: configured.pkce,
              };
              modifyReply = [...modifyReply, HttpServerResponse.setCookie(verifierCookieName, verifier, cookieOpts)];
            }

            const authorizeURL = oauth2.authorizeURL({
              ...callbackUriParams,
              ...{
                redirect_uri: isFunction(callbackUri) ? callbackUri(request) : callbackUri,
                scope,
                state,
              },
              ...pkceParams,
            });
            return { authorizeURL, modifyReply };
          });

        const startRedirectHandler = (request: HttpServerRequest.HttpServerRequest) =>
          pipe(
            generateAuthorizationUri(request),
            Effect.andThen(({ authorizeURL, modifyReply }) =>
              Effect.reduce(modifyReply, HttpServerResponse.redirect(authorizeURL), (acc, m) => m(acc)),
            ),
            Effect.catchAll(e => HttpServerResponse.text(e.message, { status: 500 })),
          );

        const checkStateFunctionConfigured = checkStateFunction(configured);

        const getAccessTokenFromAuthorizationCodeFlow = (request: HttpServerRequest.HttpServerRequest) =>
          Effect.gen(function* () {
            const code = yield* pipe(
              stringQueryParam("code")(request),
              Effect.catchTag("NoSuchElementException", () =>
                Effect.fail(new Error(`No 'code' parameter in ${request.url}`)),
              ),
            );

            const pkceParams = { code_verifier: configured.pkce ? request.cookies[verifierCookieName] : undefined };

            let modifyReply: ReadonlyArray<
              (resp: HttpServerResponse.HttpServerResponse) => HttpServerResponse.HttpServerResponse
            > = [];
            // cleanup a cookie if plugin user uses (req, res, cb) signature variant of getAccessToken fn
            modifyReply = [...modifyReply, clearCodeVerifierCookie];

            yield* checkStateFunctionConfigured(request);

            const token = yield* pipe(
              Effect.tryPromise(() =>
                oauth2.getToken({
                  ...tokenRequestParams,
                  ...{ code, redirect_uri: isFunction(callbackUri) ? callbackUri(request) : callbackUri },
                  ...pkceParams,
                }),
              ),
              Effect.mapError(e => e.error as Error),
              Effect.andThen(a => Schema.decodeUnknown(Token)(a.token)),
            );
            return { token, modifyReply };
          });

        const getNewAccessTokenUsingRefreshToken = (
          token: Token,
          refreshParams?: {
            scope?: string | string[] | undefined;
            onlyIfExpiringWithin: Duration.DurationInput | "disableExpirationCheck" | undefined;
          },
        ) =>
          pipe(oauth2.createToken({ ...token }), accessToken =>
            refreshParams?.onlyIfExpiringWithin !== "disableExpirationCheck" &&
            accessToken.expired(Duration.toSeconds(refreshParams?.onlyIfExpiringWithin ?? Duration.seconds(30)))
              ? pipe(
                  Effect.logWarning("SENDING REFRESH"),
                  Effect.andThen(Effect.tryPromise(() => accessToken.refresh({ scope: refreshParams?.scope }))),
                  Effect.catchTag("UnknownException", e => Effect.fail(e.error as Error)),
                  Effect.andThen(a => Schema.decodeUnknown(Token)(a.token)),
                )
              : Effect.succeed(token),
          );

        const revokeToken = (token: Token, tokenType: TokenType) =>
          pipe(
            oauth2.createToken({ ...token }),
            accessToken => Effect.tryPromise(() => accessToken.revoke(tokenType)),
            Effect.catchTag("UnknownException", e => Effect.fail(e.error as Error)),
          );

        const revokeAllToken = (token: Token) =>
          pipe(
            oauth2.createToken({ ...token }),
            accessToken => Effect.tryPromise(() => accessToken.revokeAll()),
            Effect.catchTag("UnknownException", e => Effect.fail(e.error as Error)),
          );

        const clearCodeVerifierCookie = HttpServerResponse.removeCookie(verifierCookieName);

        const userinfo = (
          tokenSetOrToken: string | Readonly<{ access_token: string }>,
          { method = "GET", via = "header", params = {} }: MethodViaParams = { params: {} },
        ) =>
          Effect.gen(function* () {
            if (!configured.discovery) {
              yield* new InvalidOptions({ message: "userinfo can not be used without discovery" });
            }
            if (!["GET", "POST"].includes(method)) {
              yield* new InvalidOptions({ message: "userinfo methods supported are only GET and POST" });
            }

            if (method === "GET" && via === "body") {
              yield* new InvalidOptions({ message: "body is supported only with POST" });
            }

            const token = isString(tokenSetOrToken) ? tokenSetOrToken : tokenSetOrToken.access_token;

            const endpoint = yield* pipe(
              Option.fromNullable(fetchedMetadata?.userinfo_endpoint),
              Effect.catchTag(
                "NoSuchElementException",
                () => new ExternalError({ underlying: new Error("No discovered metadata or no userinfo endpoint") }),
              ),
            );

            return yield* fetchUserInfo(endpoint, token, { method, params, via });
          });

        const oauth2 = new AuthorizationCode(configured.credentials);

        return {
          oauth2,
          getAccessTokenFromAuthorizationCodeFlow,
          getNewAccessTokenUsingRefreshToken,
          generateAuthorizationUri,
          revokeToken,
          revokeAllToken,
          userinfo,
          fetchUserInfo,
          startRedirectHandler,
        };
      };

      yield* validateOptions(options);

      const { discoveredOptions, fetchedMetadata } = yield* (() =>
        Effect.gen(function* () {
          if (!discovery) return { discoveredOptions: options, fetchedMetadata: undefined };
          else {
            const fetchedMetadata = yield* discoverMetadata(discovery.issuer);
            const authFromMetadata = getAuthFromMetadata(fetchedMetadata);

            const discoveredOptions: OAuth2Options = pipe(
              options,
              produce((draft: Draft<OAuth2Options>) => {
                if (authFromMetadata) draft.credentials.auth = authFromMetadata;

                // respect users choice if they provided PKCE method explicitly
                // even with usage of discovery
                if (!options.pkce) {
                  // otherwise select optimal pkce method for them,
                  draft.pkce = selectPkceFromMetadata(fetchedMetadata);
                }
              }),
            );

            return { discoveredOptions, fetchedMetadata };
          }
        }))();

      return configure(discoveredOptions, fetchedMetadata);
    }),
  );
