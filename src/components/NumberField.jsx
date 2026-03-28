import * as React from "react";
import PropTypes from "prop-types";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { alpha, useTheme } from "@mui/material/styles";

/**
 * This component is a placeholder for FormControl to correctly set the shrink label state on SSR.
 */
function SSRInitialFilled(_) {
  return null;
}
SSRInitialFilled.muiName = "Input";

function NumberField({
  id: idProp,
  label,
  error,
  helperText,
  size = "medium",
  ...other
}) {
  const theme = useTheme();
  let id = React.useId();
  if (idProp) id = idProp;

  return (
    <BaseNumberField.Root
      {...other}
      style={{ width: other.fullWidth ? "100%" : "auto" }} // Обработка fullWidth
      render={(props, state) => (
        <FormControl
          size={size}
          fullWidth={other.fullWidth} // Прокидываем в MUI FormControl
          ref={props.ref}
          disabled={state.disabled}
          required={state.required}
          error={error}
          variant="outlined"
        >
          {props.children}
        </FormControl>
      )}
    >
      <SSRInitialFilled {...other} />
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <BaseNumberField.Input
        id={id}
        render={(props, state) => (
          <OutlinedInput
            label={label}
            inputRef={props.ref}
            value={state.inputValue}
            onBlur={props.onBlur}
            onChange={props.onChange}
            onKeyUp={props.onKeyUp}
            onKeyDown={props.onKeyDown}
            onFocus={props.onFocus}
            slotProps={{
              input: props,
            }}
            sx={{
              pr: 0,
              borderRadius: "12px", // В стиле основной модалки
              //   "& .MuiOutlinedInput-notchedOutline": {
              //     borderColor: alpha(theme.palette.divider, 0.1),
              //   },
              //   "&:hover .MuiOutlinedInput-notchedOutline": {
              //     borderColor: alpha(theme.palette.primary.main, 0.3),
              //   },
            }}
            endAdornment={
              <InputAdornment
                position="end"
                sx={{
                  flexDirection: "column",
                  maxHeight: "unset",
                  alignSelf: "stretch",
                  borderLeft: "1px solid",
                  borderColor: "divider",
                  ml: 0,
                  "& button": {
                    py: 0,
                    flex: 1,
                    borderRadius: 0.5,
                  },
                }}
              >
                <BaseNumberField.Increment
                  render={<IconButton size={size} aria-label="Increase" />}
                >
                  <KeyboardArrowUpIcon
                    fontSize={size}
                    sx={{ transform: "translateY(2px)" }}
                  />
                </BaseNumberField.Increment>

                <BaseNumberField.Decrement
                  render={<IconButton size={size} aria-label="Decrease" />}
                >
                  <KeyboardArrowDownIcon
                    fontSize={size}
                    sx={{ transform: "translateY(-2px)" }}
                  />
                </BaseNumberField.Decrement>
              </InputAdornment>
            }
            // sx={{ pr: 0 }}
          />
        )}
      />
      {helperText && (
        <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>
      )}
    </BaseNumberField.Root>
  );
}

NumberField.propTypes = {
  error: PropTypes.bool,
  /**
   * The id of the input element.
   */
  id: PropTypes.string,
  label: PropTypes.node,
  size: PropTypes.oneOf(["medium", "small"]),
};

export default NumberField;
