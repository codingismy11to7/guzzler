import {
  FormControl,
  FormLabel,
  Input,
  InputAdornment,
  InputProps,
  TextField,
  TextFieldProps,
  useFormControl,
} from "@mui/material";
import { ReactNode } from "react";

type UnitsProps = Readonly<{
  units: ReactNode;
  position?: "start" | "end";
}>;

type Props = TextFieldProps & UnitsProps;

export const UnitsTextField = ({
  units,
  position = "end",
  ...props
}: Props) => (
  <TextField
    size="small"
    {...props}
    slotProps={{
      htmlInput: { inputMode: "numeric" },
      input: {
        autoComplete: "off",
        [`${position}Adornment`]: (
          <InputAdornment position={position}>{units}</InputAdornment>
        ),
      },
    }}
  />
);
