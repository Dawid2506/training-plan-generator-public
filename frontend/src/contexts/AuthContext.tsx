import React, { createContext, useContext, useState, useEffect } from "react";
import { buildApiUrl, API_CONFIG } from "@/lib/api";
import axios from "axios";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        buildApiUrl(API_CONFIG.endpoints.auth.me),
        { withCredentials: true }
      );
      setUser(response.data.user);
    } catch (error) {
      console.error("Error checking authentication:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    await axios.post(
      buildApiUrl(API_CONFIG.endpoints.auth.login),
      { email: username, password },
      { withCredentials: true }
    );
    
    checkAuth();
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await axios.post(
        buildApiUrl(API_CONFIG.endpoints.auth.logout),
        {},
        { withCredentials: true }
      );
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, checkAuth, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
