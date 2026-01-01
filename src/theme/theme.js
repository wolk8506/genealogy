// import { createTheme } from "@mui/material/styles";

// export const getTheme = (mode) =>
//   createTheme({
//     palette: {
//       mode,
//       primary: {
//         main: "#1976d2",
//       },
//       ...(mode === "dark"
//         ? {
//             background: {
//               default: "#121212",
//               paper: "#1e1e1e",
//             },
//             text: {
//               primary: "#ffffff",
//               secondary: "#aaaaaa",
//             },
//             divider: "rgba(255,255,255,0.12)",
//           }
//         : {
//             background: {
//               default: "#f5f5f5",
//               paper: "#ffffff",
//             },
//             text: {
//               primary: "#000000",
//               secondary: "#555555",
//             },
//             divider: "rgba(0,0,0,0.12)",
//           }),
//     },
//     components: {
//       MuiPaper: {
//         styleOverrides: {
//           root: {
//             backgroundImage: "none", // убираем градиенты
//           },
//         },
//       },
//       MuiListItem: {
//         styleOverrides: {
//           root: {
//             borderRadius: 8,
//             "&:hover": {
//               backgroundColor: mode === "dark" ? "#2a2a2a" : "#f0f0f0",
//             },
//           },
//         },
//       },
//       MuiButton: {
//         styleOverrides: {
//           root: {
//             textTransform: "none",
//           },
//         },
//       },
//     },
//     shape: {
//       borderRadius: 8,
//     },
//     typography: {
//       fontFamily: `"Roboto", "Helvetica", "Arial", sans-serif`,
//     },
//     components: {
//       MuiCssBaseline: {
//         styleOverrides: (themeParam) => ({
//           "*": {
//             scrollbarWidth: "thin", // Firefox
//             scrollbarColor: `${themeParam.palette.divider} transparent`,
//           },
//           "*::-webkit-scrollbar": {
//             width: "8px",
//             height: "8px",
//           },
//           "*::-webkit-scrollbar-track": {
//             background: "transparent",
//           },
//           "*::-webkit-scrollbar-thumb": {
//             backgroundColor:
//               themeParam.palette.mode === "dark"
//                 ? "rgba(255, 255, 255, 0.2)"
//                 : "rgba(0, 0, 0, 0.2)",
//             borderRadius: "8px",
//             border: "2px solid transparent",
//             backgroundClip: "content-box",
//           },
//           "*::-webkit-scrollbar-thumb:hover": {
//             backgroundColor:
//               themeParam.palette.mode === "dark"
//                 ? "rgba(255, 255, 255, 0.4)"
//                 : "rgba(0, 0, 0, 0.4)",
//           },
//         }),
//       },
//     },
//   });
