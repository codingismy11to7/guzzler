import { Backdrop, CircularProgress } from "@mui/material";

const Loading = () => (
  <Backdrop open={true}>
    <CircularProgress variant="indeterminate" />
  </Backdrop>
);

export default Loading;
