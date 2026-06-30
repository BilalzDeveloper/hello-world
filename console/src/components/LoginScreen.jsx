import React, { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { StorefrontIcon } from '../icons.jsx';

export default function LoginScreen() {
  const { login, loginError } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    try {
      await login(password);
    } catch {
      // loginError is surfaced via context
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f1f1' }}>
      <form
        onSubmit={onSubmit}
        style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: 32, width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(150deg,#3f4ba8,#2a2f6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <StorefrontIcon size={18} stroke="#fff" width={1.8} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Store OS</div>
            <div style={{ fontSize: 10, color: '#9a9aa6', fontWeight: 500, letterSpacing: '.3px' }}>RESELLER OPS</div>
          </div>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="App password"
          style={{ border: '1px solid #e3e3e3', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#1a1a1a' }}
        />
        {loginError && <div style={{ fontSize: 12.5, color: '#b3261e' }}>{loginError}</div>}
        <button
          type="submit"
          disabled={submitting}
          style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 9, padding: 10, fontSize: 13.5, fontWeight: 600, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
