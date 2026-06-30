import React, { useMemo } from 'react';
import { VENDORS } from '../data/vendors.js';
import { money0 } from '../lib/format.js';
import { analyticsDays, analyticsRevenue, analyticsMargin, analyticsVendorPerf } from '../data/seed.js';

const CHART_H = 150;

export default function Analytics() {
  const vals = useMemo(() => {
    const maxRev = Math.max(...analyticsRevenue);
    const chartBars = analyticsDays.map((d, i) => {
      const rh = Math.round((analyticsRevenue[i] / maxRev) * CHART_H);
      const mh = Math.round((analyticsMargin[i] / analyticsRevenue[i]) * rh);
      return { label: d, revFmt: money0(analyticsRevenue[i]), revH: rh, marH: mh };
    });
    const totalRev = analyticsRevenue.reduce((a, b) => a + b, 0);
    const totalMar = analyticsMargin.reduce((a, b) => a + b, 0);
    const anKpis = [
      { label: 'Revenue (7d)', value: money0(totalRev), sub: '73 orders', color: '#1a1a1a' },
      { label: 'Vendor payout', value: money0(totalRev - totalMar), sub: 'cost of goods', color: '#1a1a1a' },
      { label: 'Margin (7d)', value: money0(totalMar), sub: 'shop profit', color: '#0a7a52' },
      { label: 'Blended margin', value: `${Math.round((totalMar / totalRev) * 100)}%`, sub: 'after vendor cost', color: '#0a7a52' },
      { label: 'Avg order', value: money0(Math.round(totalRev / 73)), sub: '+6% vs prior', color: '#1a1a1a' },
    ];
    const vendorPerf = analyticsVendorPerf.map((p) => {
      const m = p.revenue - p.payout;
      const pct = Math.round((m / p.revenue) * 100);
      return { name: VENDORS[p.key].name, dot: VENDORS[p.key].dot, units: p.units, revenue: money0(p.revenue), payout: money0(p.payout), marPct: pct };
    });
    return { chartBars, anKpis, vendorPerf };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', margin: '0 0 4px', color: '#1a1a1a' }}>Analytics</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: '#6b6b6b' }}>Sales, margin and per-vendor performance — settled from prepaid orders.</p>
        </div>
        <div style={{ display: 'flex', gap: 2, background: '#fff', border: '1px solid #e3e3e3', borderRadius: 9, padding: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8a8a8a', padding: '6px 12px' }}>7 days</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', background: '#1a1a1a', borderRadius: 6, padding: '6px 12px' }}>30 days</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8a8a8a', padding: '6px 12px' }}>90 days</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(168px,1fr))', gap: 13, marginBottom: 20 }}>
        {vals.anKpis.map((k) => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: '16px 17px' }}>
            <div style={{ fontSize: 12, color: '#6b6b6b', fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 23, fontWeight: 800, color: k.color, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            <div style={{ fontSize: 11.5, color: '#8a8a8a', fontWeight: 600, marginTop: 5 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Revenue &amp; margin</h2>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600, color: '#8a8a8a' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#d7ece2' }} />Revenue</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#0c8a5f' }} />Margin</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 190, paddingBottom: 24, position: 'relative' }}>
          {vals.chartBars.map((b) => (
            <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6b6b6b', marginBottom: 5, fontVariantNumeric: 'tabular-nums' }}>{b.revFmt}</span>
              <div style={{ width: '100%', maxWidth: 44, height: b.revH, background: '#d7ece2', borderRadius: '6px 6px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: b.marH, background: '#0c8a5f' }} />
              </div>
              <span style={{ position: 'absolute', bottom: -22, fontSize: 11, color: '#9a9a9a', fontWeight: 600 }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px 13px', borderBottom: '1px solid #ececec' }}><h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Per-vendor performance</h2></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: '1px solid #ececec', background: '#fafafa', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase' }}>
          <div style={{ flex: 1, minWidth: 130 }}>Vendor</div>
          <div style={{ width: 60, textAlign: 'right' }}>Units</div>
          <div style={{ width: 90, textAlign: 'right' }}>Revenue</div>
          <div style={{ width: 90, textAlign: 'right' }}>Payout</div>
          <div style={{ width: 170 }}>Margin</div>
        </div>
        {vals.vendorPerf.map((v) => (
          <div key={v.name} className="so-row-hover-plain" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: '1px solid #f1f1f1' }}>
            <div style={{ flex: 1, minWidth: 130, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: v.dot, flex: '0 0 auto' }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{v.name}</span>
            </div>
            <div style={{ width: 60, textAlign: 'right', fontSize: 13, color: '#6b6b6b', fontVariantNumeric: 'tabular-nums' }}>{v.units}</div>
            <div style={{ width: 90, textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{v.revenue}</div>
            <div style={{ width: 90, textAlign: 'right', fontSize: 13, color: '#8a8a8a', fontVariantNumeric: 'tabular-nums' }}>{v.payout}</div>
            <div style={{ width: 170, display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 4, background: '#eee', overflow: 'hidden' }}>
                <div style={{ width: `${v.marPct}%`, height: '100%', background: '#0c8a5f', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0a7a52', fontVariantNumeric: 'tabular-nums', width: 38 }}>{v.marPct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
