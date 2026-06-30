import React, { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { confidenceBadge } from '../lib/format.js';
import { colorForVendor } from '../lib/vendorColor.js';
import { BoxIcon, SearchIcon, ChevronDownIcon, SortIcon, XIcon, PhotoIcon, SparkleIcon, AlertCircleIcon } from '../icons.jsx';

const SORT_OPTIONS = [
  { v: 'conf-asc', label: 'Low confidence first' },
  { v: 'vendor', label: 'Group by vendor' },
];
const SORT_LABELS = { 'conf-asc': 'Low confidence first', vendor: 'Group by vendor' };

const menuRowStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
  ...(active ? { background: '#f0f0f1', fontWeight: 700, color: '#1a1a1a' } : { color: '#3a3a3a' }),
});

export default function ListingReview() {
  const { state, actions } = useStore();
  const { listings: allListings, listingsStatus, listingsError, listingVendor, listingSort, openMenu, vendorSearch } = state;

  const vals = useMemo(() => {
    const vendorCounts = {};
    allListings.forEach((l) => { vendorCounts[l.vendor] = (vendorCounts[l.vendor] || 0) + 1; });
    const distinctVendorKeys = Object.keys(vendorCounts).sort(
      (a, b) => vendorCounts[b] - vendorCounts[a] || a.localeCompare(b)
    );
    const q = vendorSearch.trim().toLowerCase();
    const vendorMenuItems = distinctVendorKeys.filter((k) => !q || k.toLowerCase().includes(q));

    let filtered = listingVendor === 'all' ? allListings.slice() : allListings.filter((l) => l.vendor === listingVendor);
    if (listingSort === 'conf-asc') filtered.sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === 'low' ? -1 : 1));
    else if (listingSort === 'vendor') filtered.sort((a, b) => a.vendor.localeCompare(b.vendor));

    return { vendorCounts, distinctVendorKeys, vendorMenuItems, filtered };
  }, [allListings, listingVendor, listingSort, vendorSearch]);

  const vendorBtnLabel = listingVendor === 'all' ? 'All vendors' : listingVendor;
  const vendorBtnCount = listingVendor === 'all' ? allListings.length : vals.vendorCounts[listingVendor] || 0;
  const isFiltered = listingVendor !== 'all';
  const anyMenuOpen = openMenu === 'vendor' || openMenu === 'sort';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', margin: '0 0 4px', color: '#1a1a1a' }}>Listing review</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b6b6b', maxWidth: 680 }}>
          Drafts the AI flagged as low confidence, or that are missing a price. Everything else publishes automatically.{' '}
          <strong style={{ color: '#1a1a1a' }}>{allListings.length} drafts from {vals.distinctVendorKeys.length} vendors.</strong>
        </p>
      </div>

      {listingsStatus === 'loading' && (
        <div style={{ background: '#fff', border: '1px dashed #d8d8d8', borderRadius: 12, padding: 40, textAlign: 'center', color: '#8a8a8a', fontSize: 13 }}>
          Loading review queue…
        </div>
      )}

      {listingsStatus === 'error' && (
        <div style={{ background: '#fce9e7', border: '1px solid #f0d4d1', borderRadius: 12, padding: 20, color: '#b3261e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1 }}>Couldn't load the review queue: {listingsError}</span>
          <button onClick={actions.reloadListings} style={{ background: '#fff', border: '1px solid #f0d4d1', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#b3261e', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {listingsStatus === 'ready' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16, position: 'relative', zIndex: 5 }}>
            <div style={{ position: 'relative' }}>
              <div
                className="so-menu-trigger"
                onClick={() => actions.toggleMenu('vendor')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e3e3e3', borderRadius: 9, padding: '8px 11px', cursor: 'pointer', fontSize: 13 }}
              >
                <BoxIcon size={15} stroke="#8a8a8a" width={1.8} />
                <span style={{ color: '#8a8a8a', fontWeight: 500 }}>Vendor</span>
                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{vendorBtnLabel}</span>
                <span style={{ background: '#f0f0f1', color: '#52525b', fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                  {vendorBtnCount}
                </span>
                <ChevronDownIcon />
              </div>
              {openMenu === 'vendor' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 288, background: '#fff', border: '1px solid #e3e3e3', borderRadius: 11, boxShadow: '0 10px 30px rgba(0,0,0,.13)', zIndex: 6, overflow: 'hidden' }}>
                  <div style={{ padding: 9, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa' }}>
                    <SearchIcon size={15} stroke="#a0a0a0" width={1.9} />
                    <input
                      autoFocus
                      value={vendorSearch}
                      onChange={(e) => actions.setVendorSearch(e.target.value)}
                      placeholder="Search vendors…"
                      style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 13, outline: 'none', color: '#1a1a1a' }}
                    />
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto', padding: 6 }}>
                    <div className="so-menu-row" onClick={() => actions.pickVendor('all')} style={menuRowStyle(listingVendor === 'all')}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#9a9a9a' }} />
                      <span style={{ flex: 1 }}>All vendors</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8a8a8a', fontVariantNumeric: 'tabular-nums' }}>{allListings.length}</span>
                    </div>
                    {vals.vendorMenuItems.map((k) => (
                      <div key={k} className="so-menu-row" onClick={() => actions.pickVendor(k)} style={menuRowStyle(listingVendor === k)}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorForVendor(k), flex: '0 0 auto' }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8a8a8a', fontVariantNumeric: 'tabular-nums' }}>{vals.vendorCounts[k]}</span>
                      </div>
                    ))}
                    {vals.vendorMenuItems.length === 0 && (
                      <div style={{ padding: '14px 9px', textAlign: 'center', fontSize: 12.5, color: '#9a9a9a' }}>No vendors match.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <div
                className="so-menu-trigger"
                onClick={() => actions.toggleMenu('sort')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e3e3e3', borderRadius: 9, padding: '8px 11px', cursor: 'pointer', fontSize: 13 }}
              >
                <SortIcon />
                <span style={{ color: '#8a8a8a', fontWeight: 500 }}>Sort</span>
                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{SORT_LABELS[listingSort]}</span>
                <ChevronDownIcon />
              </div>
              {openMenu === 'sort' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 236, background: '#fff', border: '1px solid #e3e3e3', borderRadius: 11, boxShadow: '0 10px 30px rgba(0,0,0,.13)', zIndex: 6, padding: 6 }}>
                  {SORT_OPTIONS.map((o) => (
                    <div key={o.v} className="so-menu-row" onClick={() => actions.setSort(o.v)} style={menuRowStyle(listingSort === o.v)}>
                      {o.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            <span style={{ fontSize: 12.5, color: '#8a8a8a', fontWeight: 600 }}>
              Showing <strong style={{ color: '#1a1a1a' }}>{vals.filtered.length}</strong> of {allListings.length} drafts
            </span>
            {isFiltered && (
              <div className="so-clear-link" onClick={actions.clearVendor} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#4b53b5', cursor: 'pointer', padding: '6px 9px', borderRadius: 8 }}>
                <XIcon size={13} width={2.4} />
                Clear
              </div>
            )}
          </div>

          {anyMenuOpen && <div onClick={actions.closeMenus} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {vals.filtered.map((l) => (
              <ListingCard
                key={l.id}
                l={l}
                onPublish={(price) => actions.approveAndPublishListing(l.id, price)}
                onReject={() => actions.rejectListing(l.id)}
              />
            ))}

            {vals.filtered.length === 0 && allListings.length > 0 && (
              <div style={{ background: '#fff', border: '1px dashed #d8d8d8', borderRadius: 12, padding: 40, textAlign: 'center', color: '#8a8a8a' }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a', marginBottom: 5 }}>No drafts for {vendorBtnLabel}</div>
                <div style={{ fontSize: 13, marginBottom: 14 }}>This vendor has no drafts in the review queue right now.</div>
                <div className="so-empty-cta" onClick={actions.clearVendor} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#fff', background: '#1a1a1a', borderRadius: 8, padding: '9px 15px', cursor: 'pointer' }}>
                  Show all vendors
                </div>
              </div>
            )}

            {allListings.length === 0 && (
              <div style={{ background: '#fff', border: '1px dashed #d8d8d8', borderRadius: 12, padding: 48, textAlign: 'center', color: '#8a8a8a' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0a7a52', marginBottom: 5 }}>Review queue clear ✓</div>
                <div style={{ fontSize: 13 }}>Every draft has been handled. New low-confidence listings will appear here.</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ListingCard({ l, onPublish, onReject }) {
  const badge = confidenceBadge(l.confidence);
  const [priceInput, setPriceInput] = useState(l.price ?? '');
  const [busy, setBusy] = useState(false);
  const priceValid = priceInput !== '' && Number.isFinite(Number(priceInput)) && Number(priceInput) > 0;
  const attrs = [l.sizes, l.colours, l.product_type].filter((v) => v && v !== 'Unknown');
  const imageUrls = l.imageUrls || [];

  async function handlePublish() {
    if (!priceValid || busy) return;
    setBusy(true);
    try {
      await onPublish(Number(priceInput));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (busy) return;
    setBusy(true);
    try {
      await onReject();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: 18, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
        <div style={{ width: 96, height: 120, borderRadius: 9, background: '#ededed', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {imageUrls[0] ? (
            <img src={imageUrls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <PhotoIcon size={26} />
          )}
          <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.62)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>
            {imageUrls.length} photo{imageUrls.length === 1 ? '' : 's'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[imageUrls[1], imageUrls[2]].map((u, i) => (
            <div key={i} style={{ width: 56, height: 56, borderRadius: 8, background: '#ededed', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {u ? <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <PhotoIcon size={18} width={1.6} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#52525b' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorForVendor(l.vendor) }} />{l.vendor}
          </span>
          <span style={{ fontSize: 11, color: '#c0c0c0' }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#4b53b5', background: '#eef0fb', padding: '3px 9px', borderRadius: 6 }}>
            <SparkleIcon />AI draft
          </span>
        </div>
        <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-.2px' }}>{l.title}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 1 }}>
          {attrs.map((t, i) => (
            <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: '#52525b', background: '#f3f3f4', border: '1px solid #e8e8e8', padding: '3px 9px', borderRadius: 6 }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: badge.color, background: badge.bg, padding: '4px 10px', borderRadius: 999 }}>
            {badge.label}
          </span>
          {l.state === 'failed' && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#b3261e', background: '#fce9e7', padding: '4px 10px', borderRadius: 999 }}>Publish failed — retry</span>
          )}
        </div>
        {l.notes && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#9a5b00', background: '#fbf1dd', padding: '7px 11px', borderRadius: 8, marginTop: 2, fontWeight: 500 }}>
            <AlertCircleIcon />
            {l.notes}
          </div>
        )}
      </div>

      <div style={{ flex: '0 0 196px', display: 'flex', flexDirection: 'column', gap: 11, borderLeft: '1px solid #f0f0f0', paddingLeft: 18 }}>
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase', marginBottom: 8 }}>Sell price</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#6b6b6b' }}>£</span>
            <input
              type="number" min="0" step="0.01" value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="Required"
              style={{
                flex: 1, fontSize: 16, fontWeight: 800, color: priceValid ? '#1a1a1a' : '#b3261e', border: '1px solid #ddd',
                borderRadius: 6, padding: '5px 7px', fontFamily: 'inherit', outline: 'none', fontVariantNumeric: 'tabular-nums',
              }}
            />
          </div>
        </div>
        <button
          onClick={handlePublish}
          disabled={!priceValid || busy}
          className="so-publish-btn"
          style={{
            width: '100%', border: 'none', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            cursor: !priceValid || busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
            ...(priceValid ? { background: '#0c8a5f', color: '#fff' } : { background: '#fbf1dd', color: '#9a5b00' }),
          }}
        >
          {priceValid ? (busy ? 'Publishing…' : 'Approve & publish') : 'Enter a price to publish'}
        </button>
        <button
          onClick={handleReject}
          disabled={busy}
          className="so-reject-btn"
          style={{ background: '#fff', color: '#b3261e', border: '1px solid #f0d4d1', borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
