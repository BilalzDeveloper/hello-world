import React, { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { VENDORS } from '../data/vendors.js';
import { money, orderBadge } from '../lib/format.js';
import { CheckIcon } from '../icons.jsx';

const tabStyle = (active) => ({
  fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
  ...(active ? { background: '#1a1a1a', color: '#fff' } : { background: '#fff', color: '#6b6b6b', border: '1px solid #e3e3e3' }),
});

function Checkbox({ on, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 19, height: 19, borderRadius: 5, border: `1.8px solid ${on ? '#1a1a1a' : '#cfcfcf'}`, background: on ? '#1a1a1a' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: '0 0 auto',
      }}
    >
      {on && <CheckIcon size={12} stroke="#fff" width={3.2} />}
    </div>
  );
}

export default function OrderApproval() {
  const { state, actions, inFilter } = useStore();
  const { orders, selected, filter } = state;

  const vals = useMemo(() => {
    const matched = orders.filter((o) => o.match === 'MATCHED');
    const flagged = orders.filter((o) => o.match !== 'MATCHED');
    const filtRows = orders.filter((o) => inFilter(o, filter));
    const batchTotal = orders.reduce((a, o) => a + o.total, 0);
    const allOn = filtRows.length > 0 && filtRows.every((o) => selected[o.id]);

    const orderRows = filtRows.map((o) => {
      const b = orderBadge(o.match);
      const chips = [];
      const seen = {};
      o.items.forEach((it) => {
        if (!seen[it.vendor]) {
          seen[it.vendor] = true;
          chips.push({ label: VENDORS[it.vendor].name, dot: VENDORS[it.vendor].dot });
        }
      });
      const itemSummary = o.items.length === 1
        ? o.items[0].name
        : `${o.items.length} items · ${chips.length}${chips.length === 1 ? ' vendor' : ' vendors'}`;
      return { ...o, badge: b, chips, itemSummary, on: !!selected[o.id] };
    });

    return { matched, flagged, filtRows, batchTotal, allOn, orderRows };
  }, [orders, selected, filter, inFilter]);

  const todayShort = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div style={{ paddingBottom: 88 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', margin: 0, color: '#1a1a1a' }}>Daily order approval</h1>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4b53b5', background: '#eef0fb', padding: '4px 10px', borderRadius: 7 }}>{todayShort}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b6b6b', maxWidth: 680 }}>
          One tap confirms payment in Shopify <strong>and</strong> dispatches the couriers. Matched proofs are pre-selected; flagged ones are held out for a look.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', marginBottom: 16 }}>
        <SummaryCard iconBg="#e7f4ee" iconColor="#0a7a52" value={vals.matched.length} label="matched proofs" check />
        <SummaryCard iconBg="#fbf1dd" iconColor="#b26b00" value={vals.flagged.length} label="need a look" warn />
        <SummaryCard iconBg="#f0f0f0" iconColor="#1a1a1a" value={money(vals.batchTotal)} label="batch value" pound />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div className="so-filter-tab" onClick={() => actions.setFilter('all')} style={tabStyle(filter === 'all')}>
          All <span style={{ opacity: 0.55 }}>{orders.length}</span>
        </div>
        <div className="so-filter-tab" onClick={() => actions.setFilter('matched')} style={tabStyle(filter === 'matched')}>
          Matched <span style={{ opacity: 0.55 }}>{vals.matched.length}</span>
        </div>
        <div className="so-filter-tab" onClick={() => actions.setFilter('flagged')} style={tabStyle(filter === 'flagged')}>
          Flagged <span style={{ opacity: 0.55 }}>{vals.flagged.length}</span>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '11px 18px', borderBottom: '1px solid #ececec',
            background: '#fafafa', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase',
          }}
        >
          <Checkbox on={vals.allOn} onClick={actions.toggleAll} />
          <div style={{ width: 120 }}>Order</div>
          <div style={{ flex: 1, minWidth: 150 }}>Items &amp; vendors</div>
          <div style={{ width: 96 }}>Channel</div>
          <div style={{ width: 88, textAlign: 'right' }}>Amount</div>
          <div style={{ width: 130 }}>Proof</div>
        </div>

        {vals.orderRows.map((o) => (
          <div
            key={o.id}
            className="so-row-hover"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', background: o.on ? '#fafbff' : '#fff' }}
          >
            <Checkbox on={o.on} onClick={() => actions.toggleOrder(o.id)} />
            <div onClick={() => actions.openDrawer(o.id)} style={{ width: 120, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a1a' }}>#{o.id}</span>
              <span style={{ fontSize: 12, color: '#8a8a8a' }}>{o.customer}</span>
            </div>
            <div onClick={() => actions.openDrawer(o.id)} style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#3a3a3a' }}>{o.itemSummary}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {o.chips.map((c, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f4f4f5', borderRadius: 999, padding: '3px 9px 3px 7px', fontSize: 11, fontWeight: 600, color: '#52525b' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot }} />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
            <div onClick={() => actions.openDrawer(o.id)} style={{ width: 96, fontSize: 12.5, color: '#6b6b6b', fontWeight: 500 }}>{o.channel}</div>
            <div onClick={() => actions.openDrawer(o.id)} style={{ width: 88, textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{money(o.total)}</div>
            <div onClick={() => actions.openDrawer(o.id)} style={{ width: 130 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: o.badge.color, background: o.badge.bg, padding: '4px 10px', borderRadius: 999 }}>
                {o.badge.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ iconBg, iconColor, value, label, check, warn, pound }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {check && (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg>
        )}
        {warn && (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 16.5v.2" /><path d="M10.3 4.3 3 17a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" /></svg>
        )}
        {pound && (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
        )}
      </span>
      <div>
        <div style={{ fontSize: 19, fontWeight: 800, color: '#1a1a1a', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 11.5, color: '#8a8a8a', fontWeight: 600, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}
