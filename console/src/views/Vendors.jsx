import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { useAuth } from '../auth.jsx';
import { VENDORS } from '../data/vendors.js';
import { money, reliabilityColor } from '../lib/format.js';
import { colorForVendor } from '../lib/vendorColor.js';
import { PhotoIcon } from '../icons.jsx';

export default function Vendors() {
  const { state, actions } = useStore();
  const { config } = useAuth();
  const { vendorReqs, vendorReqsStatus, vendorReqsError, activeVendors } = state;
  const vendorOptions = config?.vendors || [];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', margin: '0 0 4px', color: '#1a1a1a' }}>Vendors</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b6b6b', maxWidth: 680 }}>
          Unknown Telegram senders wait here until you map them to a vendor — nothing they send reaches the live catalog first.
        </p>
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px', letterSpacing: '.2px', display: 'flex', alignItems: 'center', gap: 8 }}>
        Vendor requests <span style={{ fontSize: 11, fontWeight: 700, color: '#b26b00', background: '#fbf1dd', padding: '2px 8px', borderRadius: 6 }}>{vendorReqs.length}</span>
      </h2>

      {vendorReqsStatus === 'loading' && (
        <div style={{ background: '#fff', border: '1px dashed #d8d8d8', borderRadius: 12, padding: 34, textAlign: 'center', color: '#8a8a8a', fontSize: 13, marginBottom: 30 }}>
          Loading vendor requests…
        </div>
      )}

      {vendorReqsStatus === 'error' && (
        <div style={{ background: '#fce9e7', border: '1px solid #f0d4d1', borderRadius: 12, padding: 20, color: '#b3261e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
          <span style={{ flex: 1 }}>Couldn't load vendor requests: {vendorReqsError}</span>
          <button onClick={actions.reloadVendorRequests} style={{ background: '#fff', border: '1px solid #f0d4d1', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#b3261e', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {vendorReqsStatus === 'ready' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 30 }}>
          {vendorReqs.map((v) => (
            <VendorRequestCard key={v.tg_chat_id} v={v} vendorOptions={vendorOptions} actions={actions} />
          ))}
          {vendorReqs.length === 0 && (
            <div style={{ background: '#fff', border: '1px dashed #d8d8d8', borderRadius: 12, padding: 34, textAlign: 'center', color: '#8a8a8a', fontSize: 13 }}>
              No pending vendor requests. New senders will appear here.
            </div>
          )}
        </div>
      )}

      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px', letterSpacing: '.2px' }}>Active vendors</h2>
      <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 18px', borderBottom: '1px solid #ececec', background: '#fafafa', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase' }}>
          <div style={{ flex: 1, minWidth: 150 }}>Vendor</div>
          <div style={{ width: 150 }}>Reliability</div>
          <div style={{ width: 80 }}>Lead time</div>
          <div style={{ width: 80, textAlign: 'right' }}>Live</div>
          <div style={{ width: 104, textAlign: 'right' }}>Payout due</div>
        </div>
        {activeVendors.map((v) => {
          const V = VENDORS[v.key];
          const rc = reliabilityColor(v.rel);
          return (
            <div key={v.key} className="so-row-hover-plain" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid #f1f1f1' }}>
              <div style={{ flex: 1, minWidth: 150, display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: V.dot, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: '0 0 auto' }}>{V.short}</span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{V.name}</div>
                  <div style={{ fontSize: 11.5, color: '#9a9a9a' }}>Location · {V.location}</div>
                </div>
              </div>
              <div style={{ width: 150, display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 4, background: '#eee', overflow: 'hidden' }}>
                  <div style={{ width: `${v.rel}%`, height: '100%', background: rc, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: rc, fontVariantNumeric: 'tabular-nums', width: 34 }}>{v.rel}%</span>
              </div>
              <div style={{ width: 80, fontSize: 13, color: '#6b6b6b' }}>{v.lead}</div>
              <div style={{ width: 80, textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{v.products}</div>
              <div style={{ width: 104, textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{money(v.payout)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VendorRequestCard({ v, vendorOptions, actions }) {
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState(false);
  const initial = (v.chat_title || '?').trim().charAt(0).toUpperCase() || '?';

  async function register() {
    if (!picked || busy) return;
    setBusy(true);
    try {
      await actions.approveVendorRequest(v.tg_chat_id, picked);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (busy) return;
    setBusy(true);
    try {
      await actions.rejectVendorRequest(v.tg_chat_id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: 17, display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: colorForVendor(String(v.tg_chat_id)), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flex: '0 0 auto' }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a' }}>{v.chat_title || 'Unknown sender'}</div>
          <div style={{ fontSize: 12, color: '#8a8a8a' }}>Telegram · chat {v.tg_chat_id}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 9, padding: '10px 12px' }}>
        <PhotoIcon size={16} stroke="#9a9a9a" width={1.7} />
        <span style={{ fontSize: 12.5, color: '#6b6b6b' }}>{v.image_count} photo{v.image_count === 1 ? '' : 's'} waiting</span>
      </div>
      <select
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
        disabled={busy}
        style={{ border: '1px solid #e3e3e3', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', color: '#1a1a1a', background: '#fff' }}
      >
        <option value="">— pick vendor —</option>
        {vendorOptions.map((code) => (
          <option key={code} value={code}>{code}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 9 }}>
        <button
          onClick={register}
          disabled={!picked || busy}
          className="so-btn-dark"
          style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: !picked || busy ? 'default' : 'pointer', opacity: !picked || busy ? 0.6 : 1 }}
        >
          Register vendor
        </button>
        <button
          onClick={reject}
          disabled={busy}
          className="so-reject-btn"
          style={{ flex: '0 0 auto', background: '#fff', color: '#b3261e', border: '1px solid #f0d4d1', borderRadius: 8, padding: '10px 15px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
