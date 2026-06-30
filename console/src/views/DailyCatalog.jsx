import React from 'react';
import { useStore } from '../store.jsx';
import { VENDORS } from '../data/vendors.js';
import { money0 } from '../lib/format.js';
import { PhotoIcon, MegaphoneIcon, CheckIcon } from '../icons.jsx';

export default function DailyCatalog() {
  const { state, actions } = useStore();
  const { catalog, channels, broadcasted, lastRunTime } = state;
  const todayShort = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const broadcastStats = channels.filter((c) => c.on).map((c) => {
    const m = c.reach.match(/[\d,]+/);
    return { name: c.name, sent: m ? `${m[0]} delivered` : 'posted' };
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', margin: '0 0 4px', color: '#1a1a1a' }}>Today's Drop</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: '#6b6b6b' }}>{catalog.length} new arrivals · {todayShort}. Each item links to its Shopify product page.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 13 }}>
          {catalog.map((p, i) => {
            const V = VENDORS[p.vendor];
            return (
              <div key={i} className="so-product-card" style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 11, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1/1', background: '#ededed', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <PhotoIcon size={30} stroke="#bcbcbc" width={1.4} />
                  <span style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,.92)', fontSize: 10, fontWeight: 700, color: '#52525b', padding: '3px 7px', borderRadius: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.dot }} />{V.name}
                  </span>
                </div>
                <div style={{ padding: '11px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{money0(p.price)}</span>
                    <span style={{ fontSize: 11, color: '#0a7a52', fontWeight: 600 }}>+{money0(p.price - p.cost)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: 18, position: 'sticky', top: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 3 }}>Broadcast catalog</div>
          <div style={{ fontSize: 12, color: '#8a8a8a', marginBottom: 15 }}>Send today's drop everywhere your customers are.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
            {channels.map((c) => (
              <div
                key={c.key}
                onClick={() => actions.toggleChannel(c.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', border: `1px solid ${c.on ? '#cdd6f5' : '#ececec'}`, background: c.on ? '#f7f8fe' : '#fff', borderRadius: 9, cursor: 'pointer' }}
              >
                <span style={{ width: 30, height: 30, borderRadius: 7, background: c.iconBg, color: c.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flex: '0 0 auto' }}>{c.glyph}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9a9a9a' }}>{c.reach}</div>
                </div>
                <div style={{ width: 34, height: 20, borderRadius: 999, background: c.on ? '#0c8a5f' : '#d4d4d4', position: 'relative', flex: '0 0 auto', transition: 'background .15s' }}>
                  <span style={{ position: 'absolute', top: 2, left: c.on ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'left .15s' }} />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={actions.broadcast}
            className="so-btn-dark"
            style={{ width: '100%', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 9, padding: 12, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <MegaphoneIcon size={16} width={1.9} />
            {broadcasted ? 'Broadcast again' : 'Broadcast now'}
          </button>
          {broadcasted && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0a7a52', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckIcon size={13} stroke="currentColor" width={2.6} />Last run · {lastRunTime}
              </div>
              {broadcastStats.map((b, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                  <span style={{ color: '#6b6b6b' }}>{b.name}</span>
                  <span style={{ fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{b.sent}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
