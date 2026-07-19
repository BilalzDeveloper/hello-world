import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from './lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('checking'); // checking | needs-login | ready
  const [config, setConfig] = useState(null);
  const [loginError, setLoginError] = useState('');

  const probe = useCallback(async () => {
    try {
      const cfg = await api.getConfig();
      setConfig(cfg);
      setStatus('ready');
    } catch {
      setStatus('needs-login');
    }
  }, []);

  useEffect(() => {
    probe();
  }, [probe]);

  const login = useCallback(
    async (password) => {
      setLoginError('');
      try {
        await api.login(password);
        await probe();
      } catch (e) {
        setLoginError(e instanceof ApiError ? e.message : 'Login failed');
        throw e;
      }
    },
    [probe]
  );

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setConfig(null);
    setStatus('needs-login');
  }, []);

  return (
    <AuthContext.Provider value={{ status, config, loginError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
