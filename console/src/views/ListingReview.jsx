import React, { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { useAuth } from '../auth.jsx';
import { confidenceBadge } from '../lib/format.js';
import { colorForVendor } from '../lib/vendorColor.js';
import {
  BoxIcon, SearchIcon, ChevronDownIcon, SortIcon, XIcon, PhotoIcon, SparkleIcon, AlertCircleIcon, CheckIcon, ExpandIcon,
} from '../icons.jsx';
import LovPicker from '../components/LovPicker.jsx';

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
  const {
    listings: allListings, autoReady, listingsStatus, listingsError, listingVendor, listingSort, openMenu, vendorSearch,
    mergeSelected, splitSelections,
  } = state;

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
  const mergeIds = Object.keys(mergeSelected).map(Number).filter((id) => mergeSelected[id]);

  // Same vendor + identical price + identical sizes + identical colours is a
  // strong signal the AI split one physical item into multiple high-confidence
  // drafts (e.g. one photo set described 3 different ways) — that combo would
  // rarely match by coincidence for genuinely different products. Flag those
  // groups so "Approve & publish all" can't blindly create live duplicates.
  const duplicateIds = useMemo(() => {
    const bySig = {};
    autoReady.forEach((it) => {
      const sig = [it.vendor, it.price, it.sizes, it.colours].join('|');
      (bySig[sig] ||= []).push(it.id);
    });
    const ids = new Set();
    Object.values(bySig).forEach((group) => { if (group.length >= 2) group.forEach((id) => ids.add(id)); });
    return ids;
  }, [autoReady]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', margin: '0 0 4px', color: '#1a1a1a' }}>Listing review</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b6b6b', maxWidth: 680 }}>
          Drafts the AI flagged as low confidence, or that are missing a price. Everything else publishes automatically.{' '}
          <strong style={{ color: '#1a1a1a' }}>{allListings.length} drafts from {vals.distinctVendorKeys.length} vendors.</strong>
        </p>
      </div>

      {listingsStatus === 'ready' && autoReady.length > 0 && (
        <ReadyToPublishSection
          items={autoReady}
          duplicateIds={duplicateIds}
          onApproveOne={(id, price) => actions.approveAndPublishListing(id, price)}
          onRejectOne={(id) => actions.rejectListing(id)}
          onApproveAll={() => actions.approveAndPublishAllReady(autoReady.filter((r) => !duplicateIds.has(r.id)).map((r) => r.id))}
          onOpenLightbox={(id, index) => actions.openLightbox(id, index)}
        />
      )}

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

            {mergeIds.length >= 2 && (
              <button
                onClick={() => actions.mergeSelectedListings(mergeIds)}
                className="so-btn-dark"
                style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                🔗 Merge selected ({mergeIds.length})
              </button>
            )}

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
                mergeChecked={!!mergeSelected[l.id]}
                splitSelected={splitSelections[l.id] || {}}
                onToggleMerge={() => actions.toggleMergeSelect(l.id)}
                onToggleSplitHash={(hash) => actions.toggleSplitHash(l.id, hash)}
                onSplit={() => actions.splitListing(l.id, Object.keys(splitSelections[l.id] || {}))}
                onOpenLightbox={(index) => actions.openLightbox(l.id, index)}
                onPublish={(price) => actions.approveAndPublishListing(l.id, price)}
                onReject={() => actions.rejectListing(l.id)}
                onUpdateField={(field, value) => actions.updateListingField(l.id, field, value)}
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

function MergeCheckbox({ checked, onClick }) {
  return (
    <div
      onClick={onClick}
      title="Select to merge with another draft"
      style={{
        width: 19, height: 19, borderRadius: 5, border: `1.8px solid ${checked ? '#1a1a1a' : '#cfcfcf'}`, background: checked ? '#1a1a1a' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: '0 0 auto',
      }}
    >
      {checked && <CheckIcon size={12} stroke="#fff" width={3.2} />}
    </div>
  );
}

function ListingCard({
  l, mergeChecked, splitSelected, onToggleMerge, onToggleSplitHash, onSplit, onOpenLightbox,
  onPublish, onReject, onUpdateField,
}) {
  const { config } = useAuth();
  const badge = confidenceBadge(l.confidence);
  const [priceInput, setPriceInput] = useState(l.price ?? '');
  const [draft, setDraft] = useState({ title: l.title || '', sizes: l.sizes || '', colours: l.colours || '', notes: l.notes || '' });
  const [busy, setBusy] = useState(false);
  const priceValid = priceInput !== '' && Number.isFinite(Number(priceInput)) && Number(priceInput) > 0;
  const imageUrls = l.imageUrls || [];
  const splitCount = Object.keys(splitSelected).length;

  function saveField(field) {
    const value = draft[field];
    if (value === (l[field] || '')) return;
    onUpdateField(field, value);
  }

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

  async function handleSplit() {
    if (!splitCount || busy) return;
    setBusy(true);
    try {
      await onSplit();
    } finally {
      setBusy(false);
    }
  }

  const fieldInputStyle = {
    width: '100%', border: '1px solid transparent', borderRadius: 6, padding: '3px 6px', fontFamily: 'inherit',
    outline: 'none', background: 'transparent',
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: 18, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '0 0 auto' }}>
        <MergeCheckbox checked={mergeChecked} onClick={onToggleMerge} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Thumb url={imageUrls[0]} size={96} height={120} badge={`${imageUrls.length} photo${imageUrls.length === 1 ? '' : 's'}`}
            selected={!!splitSelected[l.image_hashes?.[0]]} onToggleSelect={() => onToggleSplitHash(l.image_hashes?.[0])}
            onExpand={() => onOpenLightbox(0)} iconSize={26} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2].map((i) => (
              <Thumb key={i} url={imageUrls[i]} size={56} height={56}
                selected={!!splitSelected[l.image_hashes?.[i]]} onToggleSelect={() => onToggleSplitHash(l.image_hashes?.[i])}
                onExpand={() => onOpenLightbox(i)} iconSize={18} iconWidth={1.6} />
            ))}
          </div>
        </div>
        {imageUrls.length > 3 && (
          <div onClick={() => onOpenLightbox(3)} style={{ fontSize: 11, color: '#4b53b5', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
            +{imageUrls.length - 3} more
          </div>
        )}
        {splitCount > 0 && (
          <button
            onClick={handleSplit}
            disabled={busy}
            className="so-publish-btn"
            style={{ background: '#eef0fb', color: '#4b53b5', border: 'none', borderRadius: 8, padding: '7px 8px', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}
          >
            ✂ Split {splitCount} into new draft
          </button>
        )}
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
          {l.product_type && l.product_type !== 'Unknown' && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#52525b', background: '#f3f3f4', border: '1px solid #e8e8e8', padding: '3px 9px', borderRadius: 6 }}>{l.product_type}</span>
          )}
        </div>

        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onBlur={() => saveField('title')}
          style={{ ...fieldInputStyle, fontSize: 16.5, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-.2px', padding: '2px 6px', marginLeft: -6 }}
        />

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <LabeledField label="Sizes" value={draft.sizes} onChange={(v) => setDraft((d) => ({ ...d, sizes: v }))} onBlur={() => saveField('sizes')} />
          <LabeledField label="Colours" value={draft.colours} onChange={(v) => setDraft((d) => ({ ...d, colours: v }))} onBlur={() => saveField('colours')} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: badge.color, background: badge.bg, padding: '4px 10px', borderRadius: 999 }}>
            {badge.label}
          </span>
          {l.state === 'failed' && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#b3261e', background: '#fce9e7', padding: '4px 10px', borderRadius: 999 }}>Publish failed — retry</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: '#9a5b00', background: '#fbf1dd', padding: '7px 11px', borderRadius: 8, marginTop: 2, fontWeight: 500 }}>
          <span style={{ marginTop: 2, flex: '0 0 auto' }}><AlertCircleIcon /></span>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            onBlur={() => saveField('notes')}
            placeholder="No notes from the AI — add one if useful"
            rows={1}
            style={{ ...fieldInputStyle, color: '#9a5b00', resize: 'vertical', fontSize: 12, lineHeight: 1.4, padding: '2px 4px' }}
          />
        </div>
      </div>

      <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 11, borderLeft: '1px solid #f0f0f0', paddingLeft: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase', marginBottom: 6 }}>Collection</div>
          <LovPicker
            value={l.collection && !l.collection.includes('⚠️') ? l.collection : ''}
            options={config?.collections || []}
            onChange={(v) => onUpdateField('collection', v)}
            placeholder="Pick a collection…"
            width={280}
          />
        </div>
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

function LabeledField({ label, value, onChange, onBlur }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.4px', color: '#9a9a9a', textTransform: 'uppercase' }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          border: '1px solid #e8e8e8', borderRadius: 6, padding: '4px 7px', fontFamily: 'inherit', fontSize: 12.5,
          color: '#3a3a3a', outline: 'none', background: '#fafafa', minWidth: 140,
        }}
      />
    </div>
  );
}

function Thumb({ url, size, height, badge, selected, onToggleSelect, onExpand, iconSize, iconWidth }) {
  return (
    <div
      style={{
        width: size, height, borderRadius: size > 60 ? 9 : 8, background: '#ededed', display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: url ? 'pointer' : 'default',
        outline: selected ? '2.5px solid #4b53b5' : 'none', outlineOffset: -2.5,
      }}
      onClick={url ? onExpand : undefined}
    >
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <PhotoIcon size={iconSize} width={iconWidth} />}
      {url && (
        <div
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          title="Select for splitting out"
          style={{
            position: 'absolute', top: 4, left: 4, width: 17, height: 17, borderRadius: 4,
            border: `1.6px solid ${selected ? '#4b53b5' : 'rgba(255,255,255,.85)'}`, background: selected ? '#4b53b5' : 'rgba(0,0,0,.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {selected && <CheckIcon size={10} stroke="#fff" width={3.4} />}
        </div>
      )}
      {url && (
        <div
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          style={{ position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 5, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ExpandIcon size={11} width={2} />
        </div>
      )}
      {badge && (
        <span style={{ position: 'absolute', bottom: 6, left: 6, right: 26, background: 'rgba(0,0,0,.62)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// The "85% hands-off" bucket: high confidence, price already auto-filled from
// price_rules. Nothing here needs editing — just a fast way to see them and
// either publish everything in one click or peel off one that looks wrong.
function ReadyToPublishSection({ items, duplicateIds, onApproveOne, onRejectOne, onApproveAll, onOpenLightbox }) {
  const [busy, setBusy] = useState(false);
  const safeCount = items.filter((it) => !duplicateIds.has(it.id)).length;
  const flaggedCount = items.length - safeCount;

  async function handleApproveAll() {
    if (busy || !safeCount) return;
    setBusy(true);
    try {
      await onApproveAll();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: '#f7faf8', border: '1px solid #cfe8da', borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0a7a52' }}>✓ Ready to publish ({items.length})</div>
          <div style={{ fontSize: 12.5, color: '#5a8a72' }}>High confidence, price auto-filled — review or just publish them all.</div>
        </div>
        <button
          onClick={handleApproveAll}
          disabled={busy || !safeCount}
          className="so-publish-btn"
          style={{ background: '#0c8a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: busy || !safeCount ? 'default' : 'pointer', opacity: !safeCount ? 0.5 : 1 }}
        >
          {busy ? 'Publishing…' : `Approve & publish all (${safeCount})`}
        </button>
      </div>
      {flaggedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#9a5b00', background: '#fbf1dd', padding: '9px 12px', borderRadius: 8, marginBottom: 10, fontWeight: 500 }}>
          <span style={{ marginTop: 1, flex: '0 0 auto' }}><AlertCircleIcon size={14} width={2} /></span>
          <span>
            {flaggedCount} item{flaggedCount === 1 ? '' : 's'} below (outlined amber) share the same vendor, price, sizes, and colours as another draft —
            likely the same item mis-split by the AI. Excluded from "publish all". Check before publishing them individually.
          </span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) => (
          <ReadyRow
            key={it.id}
            item={it}
            flagged={duplicateIds.has(it.id)}
            onApprove={() => onApproveOne(it.id, it.price)}
            onReject={() => onRejectOne(it.id)}
            onOpenLightbox={(i) => onOpenLightbox(it.id, i)}
          />
        ))}
      </div>
    </div>
  );
}

function ReadyRow({ item, flagged, onApprove, onReject, onOpenLightbox }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const url = (item.imageUrls || [])[0];
  const hasCollection = item.collection && !item.collection.includes('⚠️');

  async function run(fn) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  function handlePublishClick() {
    if (flagged && !confirming) {
      setConfirming(true);
      return;
    }
    run(onApprove);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1.5px solid ${flagged ? '#e0b261' : '#e3e3e3'}`, borderRadius: 9, padding: '8px 12px' }}>
      <div
        onClick={() => url && onOpenLightbox(0)}
        style={{ width: 40, height: 40, borderRadius: 7, background: '#ededed', overflow: 'hidden', cursor: url ? 'pointer' : 'default', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <PhotoIcon size={16} width={1.6} />}
      </div>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorForVendor(item.vendor), flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{item.title}</div>
        <div style={{ fontSize: 11.5, color: '#8a8a8a' }}>{item.vendor} · {hasCollection ? item.collection : 'No collection set'}</div>
      </div>
      {flagged && (
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9a5b00', background: '#fbf1dd', padding: '3px 8px', borderRadius: 999 }}>Possible duplicate</span>
      )}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>£{Number(item.price).toFixed(2)}</div>
      <button
        onClick={handlePublishClick}
        disabled={busy}
        className="so-publish-btn"
        style={{ background: confirming ? '#b26b00' : '#0c8a5f', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 11px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}
      >
        {confirming ? 'Publish anyway?' : 'Publish'}
      </button>
      <button
        onClick={() => run(onReject)}
        disabled={busy}
        className="so-reject-btn"
        style={{ background: '#fff', color: '#b3261e', border: '1px solid #f0d4d1', borderRadius: 7, padding: '6px 10px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}
      >
        Reject
      </button>
    </div>
  );
}
