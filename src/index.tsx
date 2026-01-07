import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { ApolloProvider } from "@apollo/client/react";
import { MericodSaasRecord } from "./screens/MericodSaasRecord";
import { LoginPage } from "./screens/Login/LoginPage";
import { ProjectScreen } from "./screens/Project/project";
import { apolloClient } from "./lib/apolloClient";

import { ProtectedRoute, PublicRoute } from "./components/AuthRoute";
import { initAuthManager } from "./lib/authManager";

initAuthManager();

// Wrapper component to pass sessionId from URL params
function RecordingPageWrapper() {
  const { sessionId } = useParams();
  return <ProjectScreen sessionId={sessionId} />;
}

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/recording/:sessionId" element={<RecordingPageWrapper />} />
          <Route path="/project" element={<ProjectScreen />} />

          {/* Public Routes - Only accessible if NOT logged in */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<LoginPage />} />
          </Route>

          {/* Protected Routes - Only accessible if logged in */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MericodSaasRecord />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ApolloProvider>
  </StrictMode>,
);
