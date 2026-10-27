import ReactDOM from "react-dom/client";
import HelpApp from "./HelpApp";

const root = document.getElementById("root");

if (!window.userGuideAPI) {
  root.innerHTML =
    '<div style="display:flex;height:100vh;align-items:center;justify-content:center;font-family:system-ui,sans-serif;">' +
    "Руководство доступно только в приложении Genealogy.</div>";
} else {
  ReactDOM.createRoot(root).render(<HelpApp />);
}
