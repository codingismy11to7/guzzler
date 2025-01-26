import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Struct } from "effect";
import { LazyArg } from "effect/Function";
import { PropsWithChildren } from "react";
import Markdown, { Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "../i18n.js";

type Props = Readonly<{ open: boolean; onClose: LazyArg<void>; notes: string }>;

const h =
  (variant: 1 | 2 | 3 | 4 | 5 | 6) =>
  // eslint-disable-next-line react/display-name
  ({ children }: PropsWithChildren) => (
    <Typography variant={`h${variant}`}>{children}</Typography>
  );

const renderers: Options["components"] = {
  a: props => <Link {...Struct.omit(props, "className", "style")} />,
  blockquote: ({ children }) => <Paper sx={{ p: 1, pl: 4 }}>{children}</Paper>,
  code: ({ children }) => (
    <Paper component="span" sx={{ p: 0.5 }} variant="outlined">
      <Typography component="span" color="textSecondary">
        {children}
      </Typography>
    </Paper>
  ),
  pre: ({ children }) => (
    <Paper variant="outlined" sx={{ whiteSpace: "pre", overflowX: "auto" }}>
      {children}
    </Paper>
  ),
  h1: h(1),
  h2: h(2),
  h3: h(3),
  h4: h(4),
  h5: h(5),
  h6: h(6),
  hr: () => <Divider />,
  p: ({ children }) => (
    <Typography variant="body1" color="textSecondary">
      {children}
    </Typography>
  ),
  table: ({ children }) => (
    <TableContainer>
      <Table>{children}</Table>
    </TableContainer>
  ),
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  th: props => (
    <TableCell
      {...Struct.omit(props, "className", "ref")}
      align={!props.align || props.align === "char" ? "inherit" : props.align}
      style={props.style ?? {}}
    />
  ),
  td: props => (
    <TableCell
      {...Struct.omit(props, "className", "ref")}
      align={!props.align || props.align === "char" ? "inherit" : props.align}
      style={props.style ?? {}}
    />
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  tfoot: ({ children }) => <TableFooter>{children}</TableFooter>,
};

const NotesViewerDialog = ({ open, onClose, notes }: Props) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent>
        <Stack direction="column" spacing={2}>
          <Markdown remarkPlugins={[remarkGfm]} components={renderers}>
            {notes}
          </Markdown>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotesViewerDialog;
