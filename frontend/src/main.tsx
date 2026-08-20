import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import LoginPage from "./components/pages/LoginPage.tsx";
import RegisterPage from "./components/pages/RegisterPage.tsx";
import MainPage from "./components/pages/MainPage.tsx";
import { NotificationsProvider } from "./components/common/NotificationsProvider.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationsProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/main" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/main" element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            } />
            <Route path="/main/interval-plans/:planId" element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </NotificationsProvider>
    </AuthProvider>
  </StrictMode>
);
