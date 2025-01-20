import i18next from "i18next";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import I18NextHttpBackend from "i18next-http-backend";
// i've had it working elsewhere, but can't get the default useTranslation
// hook to work without passing in the namespace?
// so just re-export it here with the namespace sent in, and revisit later
// eslint-disable-next-line no-restricted-imports
import { initReactI18next, useTranslation as useT } from "react-i18next";

export const defaultNS = "translation";

i18next
  // TODO read docs @ https://github.com/i18next/i18next-http-backend
  .use(I18NextHttpBackend)
  // TODO read docs @ https://github.com/i18next/i18next-browser-languageDetector
  .use(I18nextBrowserLanguageDetector)
  .use(initReactI18next)
  // TODO read docs @ https://www.i18next.com/overview/configuration-options
  .init({
    debug: import.meta.env.DEV,
    fallbackLng: "en",
    defaultNS,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;

export const useTranslation = () => useT("translation");
export type TFunction = ReturnType<typeof useTranslation>["t"];
