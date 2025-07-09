import { createContext } from "react";

export const ThemeContext = createContext({
  auto: true,
  setAuto: () => {},
  userPref: "light",
  setUserPref: () => {},
});
