import React, { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { VENDORS } from '../data/vendors.js';
import { vendorPickupLead } from '../data/seed.js';
import { money, orderBadge } from '../lib/format.js';
import { PinIcon, PhotoIcon, SparkleIcon, AlertCircleIcon, XIcon, CheckIcon } from '../icons.jsx';

export default function OrderDrawer() {
  const { state, actions } = useStore();
  const order = state.orders.find((o) => o.id === state.drawerId);

  const dr = useMemo(() => {
    if (!order) return null;
    const b = orderBadge(order.match);
    const groupsMap = {};
    order.items.forEach((it) => {
      if (!groupsMap[it.vendor]) groupsMap[it.vendor] = [];
      groupsMap[it.vendor].push({ name: it.name, price: money(it.price) });
    });
    const groups = Object.keys(groupsMap).map((k) => ({
      vendor: VENDORS[k].name, dot: VENDORS[k].dot, lead: `pickup ${vendorPickupLead[k] || '—'}`, items: groupsMap[k],
    }));
    const isMatch = order.match === 'MATCHED';
    let note, noteColor, noteBg;
    if (order.match === 'MATCHED') {
      note = 'Amount and reference match the order total within tolerance. Cleared to approve.';
      noteColor = '#0a7a52'; noteBg = '#e7f4ee';
    } else if (order.match === 'MISMATCH') {
      note = `Proof shows ${money(order.proofAmount)} but the order total is ${money(order.total)} — ${money(order.total - order.proofAmount)} short. Request a corrected transfer.`;
      noteColor = '#9a5b00'; noteBg = '#fbf1dd';
    } else {
      note = `This screenshot's image hash matches a proof already used on order #1042. Likely a reused screenshot — do not approve.`;
      noteColor = '#b3261e'; noteBg = '#fce9e7';
    }
    return {
      id: order.id, customer: order.customer, channel: order.channel, address: order.address,
      badgeLabel: b.label, badgeBg: b.bg, badgeColor: b.color,
      vendorCount: groups.length, groups, totalFmt: money(order.total),
      proofAmt: money(order.proofAmount), proofRef: order.proofRef, payer: order.payer,
      amtColor: order.proofAmount === order.total ? '#0a7a52' : '#b3261e',
      note, noteColor, noteBg,
      approveLabel: isMatch ? 'Approve & dispatch' : 'Approve anyway',
      approveBg: isMatch ? '#0c8a5f' : '#b26b00',
    };
  }, [order]);

  if (!dr) return null;

  return (
    <>
      <div onClick={actions.closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,.32)', zIndex: 50 }} />
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 472, maxWidth: '94vw', background: '#fff', zIndex: 51,
          boxShadow: '-8px 0 40px rgba(0,0,0,.16)', display: 'flex', flexDirection: 'column', animation: 'soDrawer .2s ease-out',
        }}
      >
        <div style={{ flex: '0 0 auto', padding: '18px 22px', borderBottom: '1px solid #ececec', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Order #{dr.id}</div>
            <div style={{ fontSize: 12.5, color: '#8a8a8a' }}>{dr.customer} · {dr.channel}</div>
          </div>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: dr.badgeColor,
              background: dr.badgeBg, padding: '5px 11px', borderRadius: 999,
            }}
          >
            {dr.badgeLabel}
          </span>
          <button
            onClick={actions.closeDrawer}
            className="so-close-btn"
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f2f2f2', color: '#6b6b6b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
            }}
          >
            <XIcon size={16} stroke="currentColor" width={2.2} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
            <span style={{ marginTop: 2, flex: '0 0 auto' }}><PinIcon /></span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2b2b2b' }}>{dr.address}</div>
              <div style={{ fontSize: 12, color: '#9a9a9a', marginTop: 2 }}>Courier consolidates from {dr.vendorCount} vendor pickups</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase', marginBottom: 10 }}>
            Items by vendor pickup
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 20 }}>
            {dr.groups.map((g) => (
              <div key={g.vendor} style={{ border: '1px solid #ececec', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.dot }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>{g.vendor}</span>
                  <span style={{ fontSize: 11, color: '#9a9a9a' }}>· {g.lead}</span>
                </div>
                {g.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 7, background: '#ededed', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                      <PhotoIcon size={16} />
                    </div>
                    <span style={{ flex: 1, fontSize: 13, color: '#2b2b2b' }}>{it.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{it.price}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 0',
              borderTop: '1px solid #ececec', borderBottom: '1px solid #ececec', marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6b6b6b' }}>Order total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{dr.totalFmt}</span>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase', marginBottom: 10 }}>
            Payment proof
          </div>
          <div style={{ display: 'flex', gap: 13, marginBottom: 14 }}>
            <div
              style={{
                width: 108, height: 150, borderRadius: 10, background: '#f3f3f3', border: '1px solid #e8e8e8', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, flex: '0 0 auto', color: '#a8a8a8',
              }}
            >
              <PhotoIcon size={26} stroke="currentColor" width={1.5} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>transfer.jpg</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#4b53b5' }}>
                <SparkleIcon size={13} fill="currentColor" />AI read the screenshot
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: '#8a8a8a' }}>Amount found</span>
                <span style={{ fontWeight: 700, color: dr.amtColor, fontVariantNumeric: 'tabular-nums' }}>{dr.proofAmt}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: '#8a8a8a' }}>Reference</span>
                <span style={{ fontWeight: 600, color: '#3a3a3a' }}>{dr.proofRef}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: '#8a8a8a' }}>Payer name</span>
                <span style={{ fontWeight: 600, color: '#3a3a3a' }}>{dr.payer}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, color: dr.noteColor, background: dr.noteBg,
              padding: '11px 13px', borderRadius: 9, lineHeight: 1.45, fontWeight: 500,
            }}
          >
            <span style={{ marginTop: 1, flex: '0 0 auto' }}><AlertCircleIcon size={15} width={2} /></span>
            <span>{dr.note}</span>
          </div>
        </div>

        <div style={{ flex: '0 0 auto', padding: '16px 22px', borderTop: '1px solid #ececec', display: 'flex', gap: 10 }}>
          <button
            onClick={() => actions.requestProof(dr.id)}
            className="so-secondary-btn"
            style={{
              flex: '0 0 auto', background: '#fff', color: '#3a3a3a', border: '1px solid #d6d6d6', borderRadius: 9,
              padding: '12px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Request new proof
          </button>
          <button
            onClick={() => actions.approveOne(dr.id)}
            className="so-approve-btn"
            style={{
              flex: 1, background: dr.approveBg, color: '#fff', border: 'none', borderRadius: 9, padding: 12, fontSize: 13.5,
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <CheckIcon size={16} stroke="currentColor" width={2.5} />
            {dr.approveLabel}
          </button>
        </div>
      </aside>
    </>
  );
}
