import React from 'react';
import { useStore } from '../store.jsx';
import { CheckIcon } from '../icons.jsx';

export default function Toast() {
  const { state } = useStore();
  if (!state.toast) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff',
        padding: '13px 20px', borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,.25)',
        zIndex: 80, display: 'flex', alignItems: 'center', gap: 11, maxWidth: '90vw', animation: 'soToast .18s ease-out',
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#0c8a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <CheckIcon size={13} stroke="#fff" width={3} />
      </span>
      {state.toast}
    </div>
  );
}
