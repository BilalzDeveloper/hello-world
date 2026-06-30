import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { api } from './lib/api.js';

// Listings shown here are the ones that actually need a human: low confidence,
// or high confidence but missing a price (no price_rules match), or a prior
// publish attempt that failed. Everything else (auto_ready/approved/published)
// doesn't belong in this triage queue.
function needsAttention(row) {
  return row.state === 'needs_review' || row.state === 'failed';
}

// merge/split responses are raw review_queue rows (no computed imageUrls —
// that's only added by the GET /api/review list mapping), so recompute it
// whenever we get one back from a mutation.
function withImageUrls(row) {
  return { ...row, imageUrls: (row.image_hashes || []).map((h) => `/api/images/${h}`) };
}

function initialState() {
  return {
    screen: 'today',
    listings: [],
    autoReady: [], // high-confidence, auto-priced drafts — ready to publish with one click
    listingsStatus: 'idle', // idle | loading | ready | error
    listingsError: null,
    vendorReqs: [],
    vendorReqsStatus: 'idle',
    vendorReqsError: null,
    collectionRules: [],
    collectionRulesStatus: 'idle',
    collectionRulesError: null,
    toast: null,
    listingVendor: 'all',
    listingSort: 'conf-asc',
    openMenu: null,
    vendorSearch: '',
    mergeSelected: {}, // listing id -> true
    splitSelections: {}, // listing id -> { [hash]: true }
    lightbox: null, // { id, index } | null
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'GO':
      return { ...state, screen: action.screen };

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

    case 'SHOW_TOAST':
      return { ...state, toast: action.message };

    case 'CLEAR_TOAST':
      return { ...state, toast: null };

    case 'LISTINGS_LOADING':
      return { ...state, listingsStatus: 'loading', listingsError: null };
    case 'LISTINGS_LOADED':
      return {
        ...state, listingsStatus: 'ready',
        listings: action.rows.filter(needsAttention),
        autoReady: action.rows.filter((r) => r.state === 'auto_ready'),
      };
    case 'LISTINGS_ERROR':
      return { ...state, listingsStatus: 'error', listingsError: action.message };
    case 'LISTING_REMOVED':
      return {
        ...state,
        listings: state.listings.filter((l) => l.id !== action.id),
        autoReady: state.autoReady.filter((l) => l.id !== action.id),
      };
    case 'LISTINGS_REMOVED_MANY': {
      const ids = new Set(action.ids);
      return {
        ...state,
        listings: state.listings.filter((l) => !ids.has(l.id)),
        autoReady: state.autoReady.filter((l) => !ids.has(l.id)),
      };
    }
    case 'LISTING_UPDATED':
      return {
        ...state,
        listings: state.listings.map((l) => (l.id === action.row.id ? { ...l, ...action.row } : l)),
        autoReady: state.autoReady.map((l) => (l.id === action.row.id ? { ...l, ...action.row } : l)),
      };

    case 'VENDOR_REQS_LOADING':
      return { ...state, vendorReqsStatus: 'loading', vendorReqsError: null };
    case 'VENDOR_REQS_LOADED':
      return { ...state, vendorReqsStatus: 'ready', vendorReqs: action.rows };
    case 'VENDOR_REQS_ERROR':
      return { ...state, vendorReqsStatus: 'error', vendorReqsError: action.message };
    case 'VENDOR_REQ_REMOVED':
      return { ...state, vendorReqs: state.vendorReqs.filter((v) => v.tg_chat_id !== action.tgChatId) };

    case 'COLLECTION_RULES_LOADING':
      return { ...state, collectionRulesStatus: 'loading', collectionRulesError: null };
    case 'COLLECTION_RULES_LOADED':
      return { ...state, collectionRulesStatus: 'ready', collectionRules: action.rows };
    case 'COLLECTION_RULES_ERROR':
      return { ...state, collectionRulesStatus: 'error', collectionRulesError: action.message };

    case 'TOGGLE_MERGE_SELECT': {
      const mergeSelected = { ...state.mergeSelected };
      if (mergeSelected[action.id]) delete mergeSelected[action.id];
      else mergeSelected[action.id] = true;
      return { ...state, mergeSelected };
    }
    case 'MERGE_DONE': {
      const kept = withImageUrls(action.row);
      const otherIds = new Set(action.otherIds);
      return {
        ...state,
        listings: state.listings.filter((l) => !otherIds.has(l.id)).map((l) => (l.id === kept.id ? { ...l, ...kept } : l)),
        mergeSelected: {},
        toast: `Merged into #${kept.id} — set its price/details and approve.`,
      };
    }

    case 'TOGGLE_SPLIT_HASH': {
      const forListing = { ...(state.splitSelections[action.id] || {}) };
      if (forListing[action.hash]) delete forListing[action.hash];
      else forListing[action.hash] = true;
      return { ...state, splitSelections: { ...state.splitSelections, [action.id]: forListing } };
    }
    case 'SPLIT_DONE': {
      const original = withImageUrls(action.original);
      const created = withImageUrls(action.created);
      const splitSelections = { ...state.splitSelections };
      delete splitSelections[original.id];
      return {
        ...state,
        listings: [...state.listings.map((l) => (l.id === original.id ? { ...l, ...original } : l)), created],
        splitSelections,
        toast: 'Split into a new product — fill in its details.',
      };
    }

    case 'OPEN_LIGHTBOX':
      return { ...state, lightbox: { id: action.id, index: action.index } };
    case 'CLOSE_LIGHTBOX':
      return { ...state, lightbox: null };
    case 'LIGHTBOX_NAV': {
      if (!state.lightbox) return state;
      const listing = state.listings.find((l) => l.id === state.lightbox.id) || state.autoReady.find((l) => l.id === state.lightbox.id);
      const count = listing?.imageUrls?.length || 1;
      const index = (state.lightbox.index + action.delta + count) % count;
      return { ...state, lightbox: { ...state.lightbox, index } };
    }

    default:
      return state;
  }
}

const StoreContext = createContext(null);

async function loadListings(dispatch) {
  dispatch({ type: 'LISTINGS_LOADING' });
  try {
    const rows = await api.getReview();
    dispatch({ type: 'LISTINGS_LOADED', rows });
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

async function loadCollectionRules(dispatch) {
  dispatch({ type: 'COLLECTION_RULES_LOADING' });
  try {
    const rows = await api.getCollectionRules();
    dispatch({ type: 'COLLECTION_RULES_LOADED', rows });
  } catch (e) {
    dispatch({ type: 'COLLECTION_RULES_ERROR', message: e.message });
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    loadListings(dispatch);
    loadVendorRequests(dispatch);
    loadCollectionRules(dispatch);
  }, []);

  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 3400);
    return () => clearTimeout(t);
  }, [state.toast]);

  const actions = useMemo(
    () => ({
      go: (screen) => dispatch({ type: 'GO', screen }),
      toggleMenu: (which) => dispatch({ type: 'TOGGLE_MENU', which }),
      closeMenus: () => dispatch({ type: 'CLOSE_MENUS' }),
      setVendorSearch: (value) => dispatch({ type: 'SET_VENDOR_SEARCH', value }),
      pickVendor: (key) => dispatch({ type: 'PICK_VENDOR', key }),
      clearVendor: () => dispatch({ type: 'CLEAR_VENDOR' }),
      setSort: (value) => dispatch({ type: 'SET_SORT', value }),
      showToast: (message) => dispatch({ type: 'SHOW_TOAST', message }),

      reloadListings: () => loadListings(dispatch),
      reloadVendorRequests: () => loadVendorRequests(dispatch),
      reloadCollectionRules: () => loadCollectionRules(dispatch),

      updateListingField: async (id, field, value) => {
        try {
          const row = await api.patchReview(id, { [field]: value });
          dispatch({ type: 'LISTING_UPDATED', row });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },

      updateMarketingField: async (id, field, value) => {
        try {
          const row = await api.patchReview(id, { marketing: { [field]: value } });
          dispatch({ type: 'LISTING_UPDATED', row });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },

      toggleMergeSelect: (id) => dispatch({ type: 'TOGGLE_MERGE_SELECT', id }),
      mergeSelectedListings: async (ids) => {
        if (ids.length < 2) return;
        try {
          const row = await api.mergeReview(ids, ids[0]);
          dispatch({ type: 'MERGE_DONE', row, otherIds: ids.filter((i) => i !== ids[0]) });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },

      toggleSplitHash: (id, hash) => dispatch({ type: 'TOGGLE_SPLIT_HASH', id, hash }),
      splitListing: async (id, hashes) => {
        if (!hashes.length) return;
        try {
          const { original, created } = await api.splitReview(id, hashes);
          dispatch({ type: 'SPLIT_DONE', original, created });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },

      openLightbox: (id, index) => dispatch({ type: 'OPEN_LIGHTBOX', id, index }),
      closeLightbox: () => dispatch({ type: 'CLOSE_LIGHTBOX' }),
      lightboxNav: (delta) => dispatch({ type: 'LIGHTBOX_NAV', delta }),

      saveCollectionRules: async (rules) => {
        try {
          const rows = await api.putCollectionRules(rules);
          dispatch({ type: 'COLLECTION_RULES_LOADED', rows });
          dispatch({ type: 'SHOW_TOAST', message: 'Collection mapping saved.' });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e.message });
        }
      },

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

      approveAndPublishAllReady: async (ids) => {
        if (!ids.length) return;
        try {
          await api.approveBulk(ids);
          await api.publish(ids);
          dispatch({ type: 'LISTINGS_REMOVED_MANY', ids });
          dispatch({ type: 'SHOW_TOAST', message: `${ids.length} approved — queued for publishing to Shopify.` });
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

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
