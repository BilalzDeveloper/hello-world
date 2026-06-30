import React from 'react';
import { useStore } from '../store.jsx';
import { HomeIcon, ClipboardCheckIcon, StarIcon, BoxIcon, MegaphoneIcon, BarChartIcon } from '../icons.jsx';

const navBase = {
  display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
  fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'background .12s',
};

function NavItem({ active, onClick, icon, label, badge, badgeColor }) {
  return (
    <div
      className="so-nav-item"
      onClick={onClick}
      style={active ? { ...navBase, background: '#f0f0f1', color: '#1a1a1a', fontWeight: 700 } : { ...navBase, color: '#444' }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span
          style={{
            background: badgeColor, color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 20, height: 20,
            borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { state, actions } = useStore();
  const cApprovals = state.orders.length;
  const cListings = state.listings.length;
  const cVendors = state.vendorReqs.length;

  return (
    <nav
      style={{
        width: 248, flex: '0 0 auto', background: '#fff', borderRight: '1px solid #e3e3e3', padding: '16px 12px',
        display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto',
        // Above the listing-review menus' full-viewport click-away scrim (zIndex 4)
        // so nav stays clickable while a dropdown is open elsewhere on the page.
        position: 'relative', zIndex: 10,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: '#9a9a9a', padding: '6px 11px 8px' }}>MANAGE</div>

      <NavItem active={state.screen === 'today'} onClick={() => actions.go('today')} icon={<HomeIcon />} label="Today" badge={0} />
      <NavItem
        active={state.screen === 'approvals'} onClick={() => actions.go('approvals')} icon={<ClipboardCheckIcon />}
        label="Order approval" badge={cApprovals} badgeColor="#1a1a1a"
      />
      <NavItem
        active={state.screen === 'listings'} onClick={() => actions.go('listings')} icon={<StarIcon />}
        label="Listing review" badge={cListings} badgeColor="#b26b00"
      />
      <NavItem
        active={state.screen === 'vendors'} onClick={() => actions.go('vendors')} icon={<BoxIcon />}
        label="Vendors" badge={cVendors} badgeColor="#b26b00"
      />
      <NavItem active={state.screen === 'catalog'} onClick={() => actions.go('catalog')} icon={<MegaphoneIcon />} label="Daily catalog" badge={0} />
      <NavItem active={state.screen === 'analytics'} onClick={() => actions.go('analytics')} icon={<BarChartIcon />} label="Analytics" badge={0} />

      <div style={{ flex: 1 }} />

      <div style={{ borderTop: '1px solid #ececec', margin: '8px 4px', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9a9a9a', padding: '0 7px' }}>AUTOMATION</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 7px', fontSize: 12.5, color: '#616161' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#37b97f', flex: '0 0 auto' }} />
          <span style={{ flex: 1 }}>85% of the loop is hands-off</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 7px', fontSize: 12.5, color: '#616161' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cApprovals ? '#e0b261' : '#37b97f', flex: '0 0 auto' }} />
          <span style={{ flex: 1 }}>{cApprovals ? `${cApprovals} orders await you` : 'All caught up'}</span>
        </div>
      </div>
    </nav>
  );
}
