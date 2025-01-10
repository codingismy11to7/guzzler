import { defaultNS } from "../i18n";
import Resources from "./resources.js";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: Resources;
  }
}
