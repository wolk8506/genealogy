import { styled } from "@mui/material/styles";
import Switch from "@mui/material/Switch";

const CustomSwitch = styled((props) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 36,
  height: 16,
  padding: 0,
  display: "flex",
  "& .MuiSwitch-switchBase": {
    padding: 0,
    margin: 1.5,
    transitionDuration: "250ms",
    "&.Mui-checked": {
      transform: "translateX(12px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        backgroundColor: theme.palette.primary.main,
        opacity: 1,
        border: 0,
      },
      // Отключенный + включенный state
      "&.Mui-disabled + .MuiSwitch-track": {
        opacity: 0.5,
      },
    },
    // Отключенный state (бегунок)
    "&.Mui-disabled": {
      color: theme.palette.mode === "light" ? "#f5f5f5" : "#666",
      "& + .MuiSwitch-track": {
        opacity: theme.palette.mode === "light" ? 0.5 : 0.3,
      },
    },
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: 21,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px 0 rgba(0,0,0,0.15)",
  },
  "& .MuiSwitch-track": {
    borderRadius: 8,
    backgroundColor: theme.palette.mode === "light" ? "#DDDDDD" : "#404040",
    opacity: 1,
    transition: theme.transitions.create(["background-color"], {
      duration: 300,
    }),
  },
}));

export default CustomSwitch;
