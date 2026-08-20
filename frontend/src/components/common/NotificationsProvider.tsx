import React, { createContext, useCallback, useContext, useState } from "react";
import Notifications from "./Notifications";
import type { NotificationType } from "../../types/commonTypes";

export interface Notification {
  id: string;
  message: string;
  type?: NotificationType;
}

interface NotificationsContextProps {
  notifications: Notification[];
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationsContext = createContext<NotificationsContextProps | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType = "Info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, notify }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-y-2 z-50">
        {notifications.map((n) => (
          <Notifications key={n.id} message={n.message} type={n.type} />
        ))}
      </div>
    </NotificationsContext.Provider>
  );
};
