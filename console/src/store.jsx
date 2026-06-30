import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { seedOrders, seedActiveVendors, seedCatalog, seedChannels } from './data/seed.js';
import { api } from './lib/api.js';

function inFilter(order, filter) {
  if (filter === 'matched') return order.match === 'MATCHED';
  if (filter === 'flagged') return order.match !== 'MATCHED';
  return true;
}

// Listings shown here are the ones that actually need a human: low confidence,
// or high confidence but missing a price (no price_rules match), or a prior
// publish attempt that failed. Everything else (auto_ready/approved/published)
// doesn't belong in this triage queue.
function needsAttention(row) {
  return row.state === 'needs_review' || row.state === 'failed';
}

function initialState() {
  const selected = {};
  seedOrders.forEach((o) => { selected[o.id] = o.match === 'MATCHED'; });
  return {
    screen: 'today',
    orders: seedOrders,
    selected,
    approvedCount: 0,
    listings: [],
    listingsStatus: 'idle', // idle | loading | ready | error
    listingsError: null,
    publishedToday: 12,
    vendorReqs: [],
    vendorReqsStatus: 'idle',
    vendorReqsError: null,
    activeVendors: seedActiveVendors,
    catalog: seedCatalog,
    channels: seedChannels,
    broadcasted: false,
    lastRunTime: null,
    filter: 'all',
    drawerId: null,
    toast: null,
    listingVendor: 'all',
    listingSort: 'conf-asc',
    openMenu: null,
    vendorSearch: '',
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'GO':
      return { ...state, screen: action.screen, drawerId: null };

    case 'TOGGLE_ORDER':
      return { ...state, selected: { ...state.selected, [action.id]: !state.selected[action.id] } };

    case 'TOGGLE_ALL': {
      const rows = state.orders.filter((o) => inFilter(o, state.filter));
      const allOn = rows.length > 0 && rows.every((o) => state.selected[o.id]);
      const selected = { ...state.selected };
      rows.forEach((o) => { selected[o.id] = !allOn; });
      return { ...state, selected };
    }

    case 'APPROVE_BATCH': {
      const ids = state.orders.filter((o) => state.selected[o.id]).map((o) => o.id);
      if (!ids.length) return state;
      const remaining = state.orders.filter((o) => !state.selected[o.id]);
      return {
        ...state,
        orders: remaining,
        drawerId: null,
        approvedCount: state.approvedCount + ids.length,
        toast: `${ids.length} orders approved — marked paid in Shopify, couriers dispatched.`,
      };
    }

    case 'APPROVE_ONE':
      return {
        ...state,
        orders: state.orders.filter((o) => o.id !== action.id),
        drawerId: null,
        toast: `Order #${action.id} approved — paid in Shopify, courier dispatched.`,
      };

    case 'REQUEST_PROOF':
      return {
        ...state,
        orders: state.orders.filter((o) => o.id !== action.id),
        drawerId: null,
        toast: `New proof requested from the customer for #${action.id}.`,
      };

    case 'OPEN_DRAWER':
      return { ...state, drawerId: action.id };

    case 'CLOSE_DRAWER':
      return { ...state, drawerId: null };

    case 'SET_FILTER':
      return { ...state, filter: action.filter };

    case 'TOGGLE_MENU':
      return { ...state, openMenu: state.openMenu === action.which ? null : action.which, vendorSearch: '' };

    case 'CLOSE_MENUS':
      return { ...state, openMenu: null };

    case 'SET_VENDOR_SEARCH':
      return { ...state, vendorSearch: action.value };

    case 'PICK_VENDOR':
      return { ...state, listingVendor: action.key, openMenu: null, vendorSearch: '' };

    case 'CLEAR_VENDOR':
      return { ...state, listingVendor: 'all' };

    case 'SET_SORT':
      return { ...state, listingSort: action.value, openMenu: null };

    case 'TOGGLE_CHANNEL':
      return { ...state, channels: state.channels.map((c) => (c.key === action.key ? { ...c, on: !c.on } : c)) };

    case 'BROADCAST': {
      const on = state.channels.filter((c) => c.on);
      if (!on.length) return { ...state, toast: 'Turn on at least one channel first.' };
      const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return { ...state, broadcasted: true, lastRunTime: t, toast: `Catalog broadcast to ${on.length} channels.` };
    }

    case 'SHOW_TOAST':
      return { ...state, toast: action.message };

    case 'CLEAR_TOAST':
      return { ...state, toast: null };

    case 'LISTINGS_LOADING':
      return { ...state, listingsStatus: 'loading', listingsError: null };
    case 'LISTINGS_LOADED':
      return { ...state, listingsStatus: 'ready', listings: action.rows };
    case 'LISTINGS_ERROR':
      return { ...state, listingsStatus: 'error', listingsError: action.message };
    case 'LISTING_REMOVED':
      return { ...state, listings: state.listings.filter((l) => l.id !== action.id) };
    case 'LISTING_UPDATED':
      return { ...state, listings: state.listings.map((l) => (l.id === action.row.id ? { ...l, ...action.row } : l)) };

    case 'VENDOR_REQS_LOADING':
      return { ...state, vendorReqsStatus: 'loading', vendorReqsError: null };
    case 'VENDOR_REQS_LOADED':
      return { ...state, vendorReqsStatus: 'ready', vendorReqs: action.rows };
    case 'VENDOR_REQS_ERROR':
      return { ...state, vendorReqsStatus: 'error', vendorReqsError: action.message };
    case 'VENDOR_REQ_REMOVED':
      return { ...state, vendorReqs: state.vendorReqs.filter((v) => v.tg_chat_id !== action.tgChatId) };

    default:
      return state;
  }
}

const StoreContext = createContext(null);

async function loadListings(dispatch) {
  dispatch({ type: 'LISTINGS_LOADING' });
  try {
    const rows = await api.getReview();
    dispatch({ type: 'LISTINGS_LOADED', rows: rows.filter(needsAttention) });
  } catch (e) {
    dispatch({ type: 'LISTINGS_ERROR', message: e.message });
  }
}

async function loadVendorRequests(dispatch) {
  dispatch({ type: 'VENDOR_REQS_LOADING' });
  try {
    const rows = await api.getUnmappedChats();
    dispatch({ type: 'VENDOR_REQS_LOADED', rows });
  } catch (e) {
    dispatch({ type: 'VENDOR_REQS_ERROR', message: e.message });
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    loadListings(dispatch);
    loadVendorRequests(dispatch);
  }, []);

  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 3400);
    return () => clearTimeout(t);
  }, [state.toast]);

  const actions = useMemo(
    () => ({
      go: (screen) => dispatch({ type: 'GO', screen }),
      toggleOrder: (id) => dispatch({ type: 'TOGGLE_ORDER', id }),
      toggleAll: () => dispatch({ type: 'TOGGLE_ALL' }),
      approveBatch: () => dispatch({ type: 'APPROVE_BATCH' }),
      approveOne: (id) => dispatch({ type: 'APPROVE_ONE', id }),
      requestProof: (id) => dispatch({ type: 'REQUEST_PROOF', id }),
      openDrawer: (id) => dispatch({ type: 'OPEN_DRAWER', id }),
      closeDrawer: () => dispatch({ type: 'CLOSE_DRAWER' }),
      setFilter: (filter) => dispatch({ type: 'SET_FILTER', filter }),
      toggleMenu: (which) => dispatch({ type: 'TOGGLE_MENU', which }),
      closeMenus: () => dispatch({ type: 'CLOSE_MENUS' }),
      setVendorSearch: (value) => dispatch({ type: 'SET_VENDOR_SEARCH', value }),
      pickVendor: (key) => dispatch({ type: 'PICK_VENDOR', key }),
      clearVendor: () => dispatch({ type: 'CLEAR_VENDOR' }),
      setSort: (value) => dispatch({ type: 'SET_SORT', value }),
      toggleChannel: (key) => dispatch({ type: 'TOGGLE_CHANNEL', key }),
      broadcast: () => dispatch({ type: 'BROADCAST' }),
      showToast: (message) => dispatch({ type: 'SHOW_TOAST', message }),

      reloadListings: () => loadListings(dispatch),
      reloadVendorRequests: () => loadVendorRequests(dispatch),

      approveAndPublishListing: async (id, price) => {
        try {
          await api.patchReview(id, { price, action: 'approve' });
          await api.publish([id]);
          dispatch({ type: 'LISTING_REMOVED', id });
          dispatch({ type: 'SHOW_TOAST', message: 'Approved — queued for publishing to Shopify.' });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },
      rejectListing: async (id) => {
        try {
          await api.patchReview(id, { action: 'skip' });
          dispatch({ type: 'LISTING_REMOVED', id });
          dispatch({ type: 'SHOW_TOAST', message: 'Draft skipped.' });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },

      approveVendorRequest: async (tgChatId, vendorCode) => {
        try {
          await api.mapChat(tgChatId, vendorCode);
          dispatch({ type: 'VENDOR_REQ_REMOVED', tgChatId });
          dispatch({ type: 'SHOW_TOAST', message: `Mapped to ${vendorCode} — its pending photos will be claimed.` });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },
      rejectVendorRequest: async (tgChatId) => {
        try {
          await api.mapChat(tgChatId, 'IGNORED');
          dispatch({ type: 'VENDOR_REQ_REMOVED', tgChatId });
          dispatch({ type: 'SHOW_TOAST', message: 'Sender ignored — future messages will be skipped.' });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },
    }),
    []
  );

  const value = useMemo(() => ({ state, actions, inFilter }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
