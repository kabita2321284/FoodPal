import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../lib/api";

export type UserRole =
  | "CUSTOMER"
  | "RESTAURANT"
  | "RIDER"
  | "ADMIN"
  | "SUPPORT"
  | "FINANCE"
  | "MARKETING";

export interface SavedAddress {
  _id?: string;
  label: string;
  text: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  placeId?: string;
  isDefault?: boolean;
}

interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  language: "en" | "ne";
  phone?: string;
  avatar?: string;
  savedAddresses?: SavedAddress[];
  riderApplicationStatus?: "none" | "pending_review" | "approved" | "rejected";
  restaurantApplicationStatus?:
    | "none"
    | "pending_review"
    | "approved"
    | "rejected";
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    phone: string
  ) => Promise<User>;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
  clearError: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getTokenFromResponse = (data: any) => {
  return (
    data?.token ||
    data?.accessToken ||
    data?.jwt ||
    data?.user?.token ||
    data?.data?.token ||
    ""
  );
};

const getUserFromResponse = (data: any) => {
  return data?.user || data?.data?.user || data;
};

const saveAuthToStorage = (user: User, token: string) => {
  const userWithToken = {
    ...user,
    token,
  };

  localStorage.setItem("foodpal_user", JSON.stringify(userWithToken));
  localStorage.setItem("token", token);
  localStorage.setItem("foodpal_token", token);
  localStorage.setItem("authToken", token);

  return userWithToken;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem("foodpal_user");
        const savedToken =
          localStorage.getItem("token") ||
          localStorage.getItem("foodpal_token") ||
          localStorage.getItem("authToken");

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          const finalUser = {
            ...parsedUser,
            id: parsedUser.id || parsedUser._id,
            _id: parsedUser._id || parsedUser.id,
            token: parsedUser.token || savedToken || "",
          };

          setUser(finalUser);

          if (finalUser.token) {
            localStorage.setItem("token", finalUser.token);
            localStorage.setItem("foodpal_token", finalUser.token);
            localStorage.setItem("authToken", finalUser.token);
          }

          try {
            const data = await apiRequest("/api/users/profile", {
              token: finalUser.token,
            });

            const updatedUser = {
              ...finalUser,
              id: data._id || data.id || finalUser.id,
              _id: data._id || data.id || finalUser._id,
              role: data.role || finalUser.role,
              riderApplicationStatus:
                data.riderApplicationStatus ||
                finalUser.riderApplicationStatus ||
                "none",
              restaurantApplicationStatus:
                data.restaurantApplicationStatus ||
                finalUser.restaurantApplicationStatus ||
                "none",
              name: data.name || finalUser.name,
              email: data.email || finalUser.email,
              phone: data.phone || finalUser.phone || "",
              language: data.language || finalUser.language || "en",
              avatar: data.avatar || finalUser.avatar,
              savedAddresses: data.savedAddresses || finalUser.savedAddresses || [],
              token: finalUser.token,
            };

            setUser(updatedUser);
            saveAuthToStorage(updatedUser, finalUser.token);
          } catch (err) {
            console.error("Auth sync failed", err);
          }
        }
      } catch (err) {
        console.error("Auth init failed", err);
        localStorage.removeItem("foodpal_user");
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    setError(null);
    console.log("frontend: Login request started");

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const token = getTokenFromResponse(data);
      const authUser = getUserFromResponse(data);

      if (!token) {
        throw new Error("Login succeeded but token was not returned by backend.");
      }

      const newUser: User = {
        id: authUser._id || authUser.id,
        _id: authUser._id || authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role || "CUSTOMER",
        language: authUser.language || "en",
        phone: authUser.phone || "",
        avatar: authUser.avatar,
        savedAddresses: authUser.savedAddresses || [],
        riderApplicationStatus: authUser.riderApplicationStatus || "none",
        restaurantApplicationStatus:
          authUser.restaurantApplicationStatus || "none",
        token,
      };

      const savedUser = saveAuthToStorage(newUser, token);

      console.log("frontend: Login success");
      setUser(savedUser);

      return savedUser;
    } catch (err: any) {
      console.log("frontend: Login failed");
      setError(err.message || "Login failed");
      throw err;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone: string
  ) => {
    setError(null);
    console.log("frontend: Registration request started");

    try {
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone }),
      });

      const token = getTokenFromResponse(data);
      const authUser = getUserFromResponse(data);

      if (!token) {
        throw new Error(
          "Registration succeeded but token was not returned by backend."
        );
      }

      const newUser: User = {
        id: authUser._id || authUser.id,
        _id: authUser._id || authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role || "CUSTOMER",
        language: authUser.language || "en",
        phone: authUser.phone || "",
        avatar: authUser.avatar,
        savedAddresses: authUser.savedAddresses || [],
        riderApplicationStatus: authUser.riderApplicationStatus || "none",
        restaurantApplicationStatus:
          authUser.restaurantApplicationStatus || "none",
        token,
      };

      const savedUser = saveAuthToStorage(newUser, token);

      console.log("frontend: Registration success");
      setUser(savedUser);

      return savedUser;
    } catch (err: any) {
      console.log("frontend: Registration failed");
      setError(err.message || "Registration failed");
      throw err;
    }
  };

  const updateUser = (data: Partial<User>) => {
    if (!user) return;

    const currentToken =
      data.token ||
      user.token ||
      localStorage.getItem("token") ||
      localStorage.getItem("foodpal_token") ||
      localStorage.getItem("authToken") ||
      "";

    const updatedUser = {
      ...user,
      ...data,
      id: data.id || data._id || user.id || user._id,
      _id: data._id || data.id || user._id || user.id,
      token: currentToken,
    };

    setUser(updatedUser);

    if (currentToken) {
      saveAuthToStorage(updatedUser, currentToken);
    } else {
      localStorage.setItem("foodpal_user", JSON.stringify(updatedUser));
    }
  };

  const logout = () => {
    console.log("Logout clicked");

    setUser(null);

    localStorage.removeItem("foodpal_user");
    localStorage.removeItem("token");
    localStorage.removeItem("foodpal_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    sessionStorage.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        updateUser,
        logout,
        clearError,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};