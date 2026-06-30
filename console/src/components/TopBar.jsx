import React from 'react';
import { StorefrontIcon, SearchIcon, BellIcon } from '../icons.jsx';
import { MANAGER_NAME } from '../config.js';

export default function TopBar() {
  const initial = MANAGER_NAME.charAt(0).toUpperCase();
  return (
    <header
      style={{
        height: 56, flex: '0 0 auto', background: '#1a1a1a', display: 'flex', alignItems: 'center',
        gap: 16, padding: '0 18px 0 16px', color: '#fff', zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(150deg,#3f4ba8,#2a2f6b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
          }}
        >
          <StorefrontIcon size={17} stroke="#fff" width={1.8} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.2px' }}>UK&nbsp;Stylish&nbsp;Club</span>
          <span style={{ fontSize: 10, color: '#9a9aa6', fontWeight: 500, letterSpacing: '.3px' }}>OPS CONSOLE</span>
        </div>
      </div>

      <div
        style={{
          flex: '0 1 420px', display: 'flex', alignItems: 'center', gap: 8, background: '#2c2c2e',
          border: '1px solid #3a3a3c', borderRadius: 9, padding: '0 11px', height: 34, color: '#a6a6ad', marginLeft: 6,
        }}
      >
        <SearchIcon size={15} stroke="currentColor" width={1.9} />
        <span style={{ fontSize: 13 }}>Search orders, vendors, products…</span>
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 7, background: '#13301f', border: '1px solid #1d5236',
          color: '#5fd39a', borderRadius: 999, padding: '5px 11px 5px 9px', fontSize: 12, fontWeight: 600,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#37d180', boxShadow: '0 0 0 3px rgba(55,209,128,.18)' }} />
        Loop running
      </div>

      <div
        className="so-icon-btn"
        style={{
          width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#c4c4cc', cursor: 'pointer',
        }}
      >
        <BellIcon size={18} stroke="currentColor" width={1.7} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 4 }}>
        <div
          style={{
            width: 31, height: 31, borderRadius: '50%', background: '#4b53b5', color: '#fff', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
          }}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}
