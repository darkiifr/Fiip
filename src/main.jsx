import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import PublicNoteView from "./components/PublicNoteView";
import { ToastProvider } from "./components/ui/Toast";
import { UIProvider } from "./providers/UIProvider";
import "./index.css";
import "./i18n";

// Simple routing check
const isPublicLink = window.location.pathname.startsWith('/n/');

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UIProvider>
        <ToastProvider>
          {isPublicLink ? <PublicNoteView /> : <App />}
        </ToastProvider>
      </UIProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
