import { Link, LinkProps } from "@mui/material";
import { PropsWithChildren } from "react";
import { AppRoute } from "../router.js";

type Props = Readonly<{ route: AppRoute }> &
  Omit<LinkProps, "href" | "onClick">;

export const AppLink = ({
  children,
  route,
  ...rest
}: PropsWithChildren<Props>) => (
  <Link {...rest} {...route.link}>
    {children}
  </Link>
);
