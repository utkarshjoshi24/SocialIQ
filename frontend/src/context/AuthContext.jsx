import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, UNAUTHORIZED_EVENT } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('socialiq_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hydrate user on mount if token exists
  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await authService.getMe();
        if (isMounted && res.success && res.user) {
          setUser(res.user);
        }
      } catch (err) {
        console.warn('Session check failed:', err.message);
        // Only a rejected token signs the user out; a network error or server outage keeps the session
        if (isMounted && err.status === 401) {
          localStorage.removeItem('socialiq_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // A token that expires mid-session is rejected by any protected API call:
  // clear it so ProtectedRoute redirects to the login page
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('socialiq_token');
      setToken(null);
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authService.login(email, password);
      if (res.token) {
        localStorage.setItem('socialiq_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (name, email, password) => {
    setError(null);
    try {
      const res = await authService.register(name, email, password);
      if (res.token) {
        localStorage.setItem('socialiq_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('socialiq_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        error,
        login,
        register,
        logout,
        updateUser: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
