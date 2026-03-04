import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PublicNoteView from "./components/PublicNoteView";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import "./i18n";

// Simple routing check
const isPublicLink = window.location.pathname.startsWith('/n/');

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isPublicLink ? <PublicNoteView /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
);
