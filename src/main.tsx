import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-700.css";
import "@fontsource/cinzel/latin-600.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/shippori-mincho/latin-500.css";
import "@fontsource/shippori-mincho/latin-700.css";
import "@fontsource/shippori-mincho/latin-800.css";
import "./i18n";
import "./styles/theme.css";
import "./styles/app.css";
import App from "./App";
import { ErrorBoundary } from "./features/recovery";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
