import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Paper from "@mui/material/Paper";
import Slide, { SlideProps } from "@mui/material/Slide";
import { LazyArg } from "effect/Function";
import { forwardRef, PropsWithChildren, ReactElement } from "react";

type Props = Readonly<{ open: boolean; onClose?: LazyArg<void> }>;

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
const Transition = forwardRef(function Transition(
  props: SlideProps & { children: ReactElement },
  ref,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const FullScreenDialog = ({
  open,
  onClose,
  children,
}: PropsWithChildren<Props>) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullScreen
    slots={{
      transition: Transition,
    }}
  >
    <DialogContent sx={{ overflow: "auto", p: 0 }}>
      <Paper>{children}</Paper>
    </DialogContent>
  </Dialog>
);
