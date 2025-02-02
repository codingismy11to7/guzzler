import { InputAdornment, TextField, TextFieldProps } from "@mui/material";
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
    fullWidth
    size="small"
    {...props}
    slotProps={{
      htmlInput: { inputMode: "decimal" },
      input: {
        autoComplete: "off",
        [`${position}Adornment`]: (
          <InputAdornment position={position}>{units}</InputAdornment>
        ),
      },
    }}
  />
);
