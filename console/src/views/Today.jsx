import React, { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { money } from '../lib/format.js';
import { seedActivity } from '../data/seed.js';
import { MANAGER_NAME } from '../config.js';
import { ClipboardCheckIcon, StarIcon, UsersIcon, ArrowRightIcon } from '../icons.jsx';

const cardBase = { background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: '17px 18px' };

export default function Today() {
  const { state, actions } = useStore();
  const { orders, listings, vendorReqs, publishedToday, approvedCount, broadcasted } = state;

  const vals = useMemo(() => {
    const matched = orders.filter((o) => o.match === 'MATCHED');
    const flagged = orders.filter((o) => o.match !== 'MATCHED');
    const batchTotal = orders.reduce((a, o) => a + o.total, 0);

    const loopSteps = [
      { label: 'Ingested', value: '18', sub: 'vendor messages', color: '#4b53b5', bar: '#4b53b5' },
      { label: 'Listed', value: `${publishedToday}`, sub: 'auto-published', color: '#4b53b5', bar: '#7c83d6' },
      { label: 'Catalog', value: broadcasted ? 'Sent' : 'Ready', sub: broadcasted ? 'all channels' : 'awaiting send', color: '#1f6feb', bar: '#1f6feb' },
      { label: 'Orders', value: `${orders.length + approvedCount}`, sub: 'placed today', color: '#0a7a52', bar: '#5fbf91' },
      { label: 'Approved', value: `${approvedCount}`, sub: 'by you', color: '#0a7a52', bar: '#0c8a5f' },
      { label: 'Dispatched', value: `${approvedCount}`, sub: 'couriers booked', color: '#b26b00', bar: '#e0b261' },
    ];

    return {
      todayDate: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      kRevenue: money(batchTotal + 706),
      kAwaiting: orders.length,
      kAwaitingSub: `${money(batchTotal)} to confirm`,
      attnApprovals: `${matched.length} matched · ${flagged.length} flagged for a look. ${money(batchTotal)} total.`,
      attnListings: listings.length ? `${listings.length} AI drafts below the confidence threshold need a quick check.` : 'Queue clear — everything auto-published.',
      attnVendors: vendorReqs.length ? `${vendorReqs.length} unknown senders waiting to be registered or rejected.` : 'No pending senders.',
      loopSteps,
    };
  }, [orders, listings, vendorReqs, publishedToday, approvedCount, broadcasted]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 13, color: '#8a8a8a', fontWeight: 600, marginBottom: 3 }}>{vals.todayDate}</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px', margin: 0, color: '#1a1a1a' }}>Good morning, {MANAGER_NAME}</h1>
        </div>
        <button
          onClick={() => actions.go('approvals')}
          className="so-btn-dark"
          style={{
            background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 17px', fontSize: 13.5,
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          Review today's batch
          <ArrowRightIcon />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(212px,1fr))', gap: 14, marginBottom: 26 }}>
        <div style={cardBase}>
          <div style={{ fontSize: 12.5, color: '#6b6b6b', fontWeight: 600, marginBottom: 9 }}>Revenue today</div>
          <div style={{ fontSize: 27, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-.6px', fontVariantNumeric: 'tabular-nums' }}>{vals.kRevenue}</div>
          <div style={{ fontSize: 12, color: '#0a7a52', fontWeight: 600, marginTop: 6 }}>▲ 14% vs yesterday</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 12.5, color: '#6b6b6b', fontWeight: 600, marginBottom: 9 }}>Margin today</div>
          <div style={{ fontSize: 27, fontWeight: 700, color: '#0a7a52', letterSpacing: '-.6px', fontVariantNumeric: 'tabular-nums' }}>{money(268)}</div>
          <div style={{ fontSize: 12, color: '#6b6b6b', fontWeight: 600, marginTop: 6 }}>30% blended margin</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 12.5, color: '#6b6b6b', fontWeight: 600, marginBottom: 9 }}>Awaiting your approval</div>
          <div style={{ fontSize: 27, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-.6px', fontVariantNumeric: 'tabular-nums' }}>{vals.kAwaiting}</div>
          <div style={{ fontSize: 12, color: '#b26b00', fontWeight: 600, marginTop: 6 }}>{vals.kAwaitingSub}</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 12.5, color: '#6b6b6b', fontWeight: 600, marginBottom: 9 }}>Live listings today</div>
          <div style={{ fontSize: 27, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-.6px', fontVariantNumeric: 'tabular-nums' }}>{publishedToday}</div>
          <div style={{ fontSize: 12, color: '#4b53b5', fontWeight: 600, marginTop: 6 }}>auto-published by AI</div>
        </div>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 13px', letterSpacing: '-.2px' }}>Needs your attention</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 28 }}>
        <AttentionCard
          onClick={() => actions.go('approvals')} iconBg="#eef0fb" iconColor="#4b53b5" icon={<ClipboardCheckIcon size={20} width={1.8} />}
          title="Daily order batch" sub="The one human checkpoint" count={orders.length} body={vals.attnApprovals}
          ctaColor="#4b53b5" ctaLabel="Approve the batch"
        />
        <AttentionCard
          onClick={() => actions.go('listings')} iconBg="#fbf1dd" iconColor="#b26b00" icon={<StarIcon size={20} width={1.8} />}
          title="Listing review" sub="Below confidence threshold" count={listings.length} body={vals.attnListings}
          ctaColor="#b26b00" ctaLabel="Review drafts"
        />
        <AttentionCard
          onClick={() => actions.go('vendors')} iconBg="#e7f0fd" iconColor="#1f6feb" icon={<UsersIcon size={20} width={1.8} />}
          title="Vendor requests" sub="Unknown Telegram senders" count={vendorReqs.length} body={vals.attnVendors}
          ctaColor="#1f6feb" ctaLabel="Approve or reject"
        />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: '20px 22px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '-.2px' }}>The loop today</h2>
          <span style={{ fontSize: 12, color: '#8a8a8a', fontWeight: 500 }}>Vendor message → AI listing → catalog → order → approval → courier</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flexWrap: 'wrap' }}>
          {vals.loopSteps.map((s) => (
            <div key={s.label} style={{ flex: '1 1 130px', minWidth: 120, display: 'flex', flexDirection: 'column', gap: 5, padding: '2px 4px', position: 'relative' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: s.color, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: '#9a9a9a', fontWeight: 500 }}>{s.sub}</div>
              <div style={{ height: 3, borderRadius: 2, background: s.bar, marginTop: 4 }} />
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 13px', letterSpacing: '-.2px' }}>Recent activity</h2>
      <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, overflow: 'hidden' }}>
        {seedActivity.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 18px', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.dot, flex: '0 0 auto' }} />
            <span style={{ flex: 1, fontSize: 13.5, color: '#2b2b2b' }}>{a.text}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: a.tagColor, background: a.tagBg, padding: '3px 9px', borderRadius: 6, flex: '0 0 auto' }}>{a.tag}</span>
            <span style={{ fontSize: 12, color: '#9a9a9a', fontVariantNumeric: 'tabular-nums', width: 46, textAlign: 'right', flex: '0 0 auto' }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttentionCard({ onClick, iconBg, iconColor, icon, title, sub, count, body, ctaColor, ctaLabel }) {
  return (
    <div
      onClick={onClick}
      className="so-attn-card"
      style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 13 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a' }}>{title}</div>
          <div style={{ fontSize: 12.5, color: '#8a8a8a' }}>{sub}</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{count}</div>
      </div>
      <div style={{ fontSize: 13, color: '#5a5a5a', lineHeight: 1.5 }}>{body}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: ctaColor, display: 'flex', alignItems: 'center', gap: 5 }}>
        {ctaLabel} <ArrowRightIcon size={13} width={2.2} />
      </div>
    </div>
  );
}
