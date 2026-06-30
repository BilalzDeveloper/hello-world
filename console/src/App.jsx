import React from 'react';
import { AuthProvider, useAuth } from './auth.jsx';
import { StoreProvider, useStore } from './store.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Toast from './components/Toast.jsx';
import OrderDrawer from './components/OrderDrawer.jsx';
import StickyApproveBar from './components/StickyApproveBar.jsx';
import Today from './views/Today.jsx';
import OrderApproval from './views/OrderApproval.jsx';
import ListingReview from './views/ListingReview.jsx';
import Vendors from './views/Vendors.jsx';
import DailyCatalog from './views/DailyCatalog.jsx';
import Analytics from './views/Analytics.jsx';

const SCREENS = {
  today: Today,
  approvals: OrderApproval,
  listings: ListingReview,
  vendors: Vendors,
  catalog: DailyCatalog,
  analytics: Analytics,
};

function Shell() {
  const { state } = useStore();
  const View = SCREENS[state.screen] || Today;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f1f1', overflow: 'hidden' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', minWidth: 0, position: 'relative' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 34px 64px' }}>
            <View />
          </div>
          <StickyApproveBar />
        </main>
      </div>
      <OrderDrawer />
      <Toast />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f1f1', color: '#8a8a8a', fontSize: 13.5 }}>
      Loading…
    </div>
  );
}

function Gate() {
  const { status } = useAuth();
  if (status === 'checking') return <LoadingScreen />;
  if (status === 'needs-login') return <LoginScreen />;
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
