import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api.js';

const STAFF_TOKEN_KEY = 'queueless.staffToken';
const STAFF_USER_KEY  = 'queueless.staffUser';

const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const [staff, setStaff] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STAFF_USER_KEY) || 'null'); } catch { return null; }
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/staff/login', { username, password });
      const data = res.data;
      localStorage.setItem(STAFF_TOKEN_KEY, data.token);
      localStorage.setItem(STAFF_USER_KEY, JSON.stringify(data.user));
      setStaff(data.user);
      return true;
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Used by StaffKiosk: token already stored in localStorage, just update React state.
  const loginDirect = useCallback((token, user) => {
    localStorage.setItem(STAFF_TOKEN_KEY, token);
    localStorage.setItem(STAFF_USER_KEY, JSON.stringify(user));
    setStaff(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    localStorage.removeItem(STAFF_USER_KEY);
    setStaff(null);
  }, []);

  const updateStaff = useCallback((patch) => {
    setStaff(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      localStorage.setItem(STAFF_USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <StaffContext.Provider value={{ staff, login, loginDirect, logout, updateStaff, error, loading }}>
      {children}
    </StaffContext.Provider>
  );
}

export const useStaff = () => useContext(StaffContext);
export { STAFF_TOKEN_KEY };
