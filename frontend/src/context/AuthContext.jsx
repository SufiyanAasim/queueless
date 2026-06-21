import { createContext, useContext, useState, useCallback } from 'react';
import { apiLogin, TOKEN_KEY } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('queueless.adminUser');
    return raw ? JSON.parse(raw) : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiLogin(username, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem('queueless.adminUser', JSON.stringify(data.user));
      setUser(data.user);
      return true;
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('queueless.adminUser');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      localStorage.setItem('queueless.adminUser', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
