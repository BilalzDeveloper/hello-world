import React from 'react';
import { useStore } from '../store.jsx';
import { HomeIcon, StarIcon, BoxIcon, GearIcon } from '../icons.jsx';

export default function BottomNav() {
  const { state, actions } = useStore();
  const cListings = state.listings.length;
  const cVendors = state.vendorReqs.length;

  const items = [
    { screen: 'today',    icon: <HomeIcon size={22} />, label: 'Today' },
    { screen: 'listings', icon: <StarIcon size={22} />, label: 'Listings', badge: cListings },
    { screen: 'vendors',  icon: <BoxIcon  size={22} />, label: 'Vendors',  badge: cVendors },
    { screen: 'settings', icon: <GearIcon size={22} />, label: 'Settings' },
  ];

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        background: '#fff', borderTop: '1px solid #e3e3e3',
        display: 'flex', alignItems: 'stretch',
      }}
    >
      {items.map((item) => {
        const active = state.screen === item.screen;
        return (
          <button
            key={item.screen}
            onClick={() => actions.go(item.screen)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, border: 'none', background: 'none',
              cursor: 'pointer', position: 'relative', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              color: active ? '#1a1a1a' : '#9a9a9a',
            }}
          >
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: '.1px' }}>
              {item.label}
            </span>
            {item.badge > 0 && (
              <span style={{
                position: 'absolute', top: 8, left: '50%', marginLeft: 4,
                background: '#b26b00', color: '#fff', fontSize: 10, fontWeight: 700,
                minWidth: 16, height: 16, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
