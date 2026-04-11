import { styled } from "@mui/material/styles";
import Switch from "@mui/material/Switch";

const CustomSwitch = styled((props) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 54,
  height: 24,
  padding: 0,
  display: "flex",
  "& .MuiSwitch-switchBase": {
    padding: 0,
    margin: 2, // Отступ бегунка от края корпуса
    transitionDuration: "250ms",
    "&.Mui-checked": {
      // Смещение: ширина корпуса (54) - ширина бегунка (32) - отступы (2+2) = 18px
      transform: "translateX(18px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        // backgroundColor: "#34C759",
        backgroundColor: "rgb(57,122,245)", // синий как в mac OS
        opacity: 1,
        border: 0,
      },
    },
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: 32,
    height: 20,
    borderRadius: 10, // Скругление для формы "таблетки"
    boxShadow: "0 2px 4px 0 rgba(0,0,0,0.2)",
  },
  "& .MuiSwitch-track": {
    borderRadius: 12, // Половина высоты корпуса для идеального скругления
    backgroundColor: theme.palette.mode === "light" ? "#E9E9EA" : "#39393D",
    opacity: 1,
    transition: theme.transitions.create(["background-color"], {
      duration: 300,
    }),
  },
}));

export default CustomSwitch;
