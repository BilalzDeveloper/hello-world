import React from 'react';
import { useStore } from '../store.jsx';
import { money } from '../lib/format.js';
import { CheckIcon } from '../icons.jsx';

export default function StickyApproveBar() {
  const { state, actions } = useStore();
  const selOrders = state.orders.filter((o) => state.selected[o.id]);
  if (state.screen !== 'approvals' || selOrders.length === 0) return null;

  const selTotal = selOrders.reduce((a, o) => a + o.total, 0);

  return (
    <div
      style={{
        position: 'sticky', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
        borderTop: '1px solid #e3e3e3', padding: '13px 34px', display: 'flex', alignItems: 'center', gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{selOrders.length} orders selected</span>
        <span style={{ fontSize: 12, color: '#8a8a8a' }}>Confirms payment in Shopify &amp; dispatches couriers</span>
      </div>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 13, color: '#6b6b6b' }}>
        Batch value <strong style={{ color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{money(selTotal)}</strong>
      </span>
      <button
        onClick={actions.approveBatch}
        className="so-approve-btn"
        style={{
          background: '#0c8a5f', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 22px', fontSize: 14,
          fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9,
        }}
      >
        <CheckIcon size={17} stroke="currentColor" width={2.6} />
        Approve {selOrders.length} {selOrders.length === 1 ? 'order' : 'orders'}
      </button>
    </div>
  );
}
