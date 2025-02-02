import { Dialog, DialogContent, Paper, Slide } from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import { LazyArg } from "effect/Function";
import { forwardRef, PropsWithChildren, ReactElement } from "react";

type Props = Readonly<{ open: boolean; onClose?: LazyArg<void> }>;

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
      // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
      transition: forwardRef(function Transition(
        props: TransitionProps & { children: ReactElement },
        ref,
      ) {
        return (
          <Slide
            direction="up"
            ref={ref}
            {...props}
            appear={props.appear ?? false}
          />
        );
      }),
    }}
  >
    <DialogContent sx={{ overflow: "auto", p: 0 }}>
      <Paper>{children}</Paper>
    </DialogContent>
  </Dialog>
);
