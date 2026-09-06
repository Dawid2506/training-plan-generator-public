import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./index.css";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import ActivitiesPage from "./components/pages/ActivitiesPage";
import CoachPage from "./components/pages/CoachPage";
import DashboardPage from "./components/pages/DashboardPage";
import {
  LegacyMainRedirect,
  LegacyPlanRedirect,
} from "./components/pages/LegacyRedirect";
import LoginPage from "./components/pages/LoginPage";
import PlanDetailsPage from "./components/pages/PlanDetailsPage";
import PlansPage from "./components/pages/PlansPage";
import RegisterPage from "./components/pages/RegisterPage";
import SettingsPage from "./components/pages/SettingsPage";
import StravaPage from "./components/pages/StravaPage";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/coach" element={<CoachPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/plans/:planId" element={<PlanDetailsPage />} />
              <Route path="/strava" element={<StravaPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Links minted by the previous UI */}
            <Route path="/main" element={<LegacyMainRedirect />} />
            <Route
              path="/main/interval-plans/:planId"
              element={<LegacyPlanRedirect />}
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
