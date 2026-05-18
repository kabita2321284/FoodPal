import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

export type UserRole = 'CUSTOMER' | 'RESTAURANT' | 'RIDER' | 'ADMIN' | 'SUPPORT' | 'FINANCE' | 'MARKETING';

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
  name: string;
  email: string;
  role: UserRole;
  language: 'en' | 'ne';
  phone?: string;
  avatar?: string;
  savedAddresses?: SavedAddress[];
  riderApplicationStatus?: 'none' | 'pending_review' | 'approved' | 'rejected';
  restaurantApplicationStatus?: 'none' | 'pending_review' | 'approved' | 'rejected';
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone: string) => Promise<User>;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
  clearError: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('foodpal_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Sync with backend to check for role/status updates
        try {
          const data = await apiRequest('/api/users/profile', {
            token: parsedUser.token
          });
          const updatedUser = { 
            ...parsedUser, 
            role: data.role,
            riderApplicationStatus: data.riderApplicationStatus,
            restaurantApplicationStatus: data.restaurantApplicationStatus,
            name: data.name,
            phone: data.phone || '',
            language: data.language || parsedUser.language || 'en',
            avatar: data.avatar,
            savedAddresses: data.savedAddresses || []
          };
          setUser(updatedUser);
          localStorage.setItem('foodpal_user', JSON.stringify(updatedUser));
        } catch (err) {
          console.error("Auth sync failed", err);
        }
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    setError(null);
    console.log("frontend: Login request started");
    
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const newUser: User = {
        id: data._id,
        name: data.name,
        email: data.email,
        role: data.role || 'CUSTOMER',
        language: data.language || 'en',
        phone: data.phone || '',
        avatar: data.avatar,
        savedAddresses: data.savedAddresses || [],
        riderApplicationStatus: data.riderApplicationStatus || 'none',
        restaurantApplicationStatus: data.restaurantApplicationStatus || 'none',
        token: data.token
      };

      console.log("frontend: Login success");
      setUser(newUser);
      localStorage.setItem('foodpal_user', JSON.stringify(newUser));
      return newUser;
    } catch (err: any) {
      console.log("frontend: Login failed");
      setError(err.message);
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    setError(null);
    console.log("frontend: Registration request started");
    
    try {
      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, phone }),
      });

      const newUser: User = {
        id: data._id,
        name: data.name,
        email: data.email,
        role: data.role || 'CUSTOMER',
        language: 'en',
        phone: data.phone || '',
        avatar: data.avatar,
        savedAddresses: data.savedAddresses || [],
        riderApplicationStatus: 'none',
        restaurantApplicationStatus: 'none',
        token: data.token
      };

      console.log("frontend: Registration success");
      setUser(newUser);
      localStorage.setItem('foodpal_user', JSON.stringify(newUser));
      return newUser;
    } catch (err: any) {
      console.log("frontend: Registration failed");
      setError(err.message);
      throw err;
    }
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('foodpal_user', JSON.stringify(updatedUser));
    }
  };

  const logout = () => {
    console.log("Logout clicked");
    setUser(null);
    localStorage.removeItem('foodpal_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateUser, logout, clearError, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
