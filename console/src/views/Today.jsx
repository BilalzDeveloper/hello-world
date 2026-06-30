import React, { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { MANAGER_NAME } from '../config.js';
import { ClipboardCheckIcon, UsersIcon, ArrowRightIcon, CheckIcon } from '../icons.jsx';

export default function Today() {
  const { state, actions } = useStore();
  const { listings, autoReady, vendorReqs } = state;

  const vals = useMemo(
    () => ({
      todayDate: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      attnReady: autoReady.length ? `${autoReady.length} high-confidence draft${autoReady.length === 1 ? '' : 's'} priced and waiting for one click.` : 'Nothing queued right now.',
      attnListings: listings.length ? `${listings.length} AI draft${listings.length === 1 ? '' : 's'} below the confidence threshold need a quick check.` : 'Queue clear — everything auto-published.',
      attnVendors: vendorReqs.length ? `${vendorReqs.length} unknown sender${vendorReqs.length === 1 ? '' : 's'} waiting to be registered or rejected.` : 'No pending senders.',
    }),
    [listings, autoReady, vendorReqs]
  );

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: '#8a8a8a', fontWeight: 600, marginBottom: 3 }}>{vals.todayDate}</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px', margin: 0, color: '#1a1a1a' }}>Good morning, {MANAGER_NAME}</h1>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 13px', letterSpacing: '-.2px' }}>Needs your attention</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        {autoReady.length > 0 && (
          <AttentionCard
            onClick={() => actions.go('listings')} iconBg="#e7f4ee" iconColor="#0a7a52" icon={<CheckIcon size={20} stroke="currentColor" width={2.4} />}
            title="Ready to publish" sub="High confidence, already priced" count={autoReady.length} body={vals.attnReady}
            ctaColor="#0a7a52" ctaLabel="Publish them"
          />
        )}
        <AttentionCard
          onClick={() => actions.go('listings')} iconBg="#fbf1dd" iconColor="#b26b00" icon={<ClipboardCheckIcon size={20} width={1.8} />}
          title="Listing review" sub="Below confidence threshold" count={listings.length} body={vals.attnListings}
          ctaColor="#b26b00" ctaLabel="Review drafts"
        />
        <AttentionCard
          onClick={() => actions.go('vendors')} iconBg="#e7f0fd" iconColor="#1f6feb" icon={<UsersIcon size={20} width={1.8} />}
          title="Vendor requests" sub="Unknown Telegram senders" count={vendorReqs.length} body={vals.attnVendors}
          ctaColor="#1f6feb" ctaLabel="Approve or reject"
        />
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
