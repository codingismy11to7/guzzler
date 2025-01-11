import { PropsWithChildren } from "react";
import { AppRoute } from "../router.js";

type Props = Readonly<{ route: AppRoute }>;

export const AppLink = ({ children, route }: PropsWithChildren<Props>) => <a {...route.link}>{children}</a>;
