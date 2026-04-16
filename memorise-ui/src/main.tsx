/** Application entry point that mounts the React root with error boundary and router */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./presentation/components/shared/ErrorBoundary";
import { toAppError, logAppError } from "./shared/errors";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/jacques-francois/400.css";
import "@fontsource/noto-sans/400.css";
import "./index.css";

const handleBoundaryError = (error: Error, errorInfo: React.ErrorInfo) => {
  const appError = toAppError(error, {
    layer: "boundary",
    boundary: "App",
    componentStack: errorInfo.componentStack,
  });
  logAppError(appError, {
    boundary: "App",
    componentStack: errorInfo.componentStack,
  });
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary onError={handleBoundaryError}>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
