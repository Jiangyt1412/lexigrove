import React from "react"; // # Strict mode helps identify unsafe component effects.
import ReactDOM from "react-dom/client"; // # Mount the local application.
import App from "./App"; // # Application shell.
import "./styles.css";
import "./pixel-theme.css";
import "./color-themes.css";
import "./learning-typography.css"; // # Shared accessible visual tokens.
import "./ocean-game.css"; // # Marine game frames preserve the readable learning typography above.
import "./living-world.css"; // # Seasonal scenery and quiet learning notebooks share accessible layout rules.
import "./coastal-world.css"; // # The village itself is the layout; navigation and actions belong to the scenery.
import "./cozy-study.css"; // # Quiet readable notebook content stays inside the same coastal world.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
