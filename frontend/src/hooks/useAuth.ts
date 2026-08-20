import { useAuth } from "@/contexts/AuthContext";

export const useCurrentUser = () => {
  const { user } = useAuth();
  return user;
};

export const useUserId = () => {
  const { user } = useAuth();
  return user?.id;
};

export const useUserRole = () => {
  const { user } = useAuth();
  return user?.role;
};

export const useIsLoggedIn = () => {
  const { user } = useAuth();
  return !!user;
};
