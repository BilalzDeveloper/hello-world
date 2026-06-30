import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { useAuth } from '../auth.jsx';
import { api } from '../lib/api.js';
import LovPicker from '../components/LovPicker.jsx';

export default function Settings() {
  const { state, actions } = useStore();
  const { config } = useAuth();
  const { collectionRules, collectionRulesStatus, collectionRulesError } = state;
  const productTypes = config?.productTypes || [];
  const collections = config?.collections || [];

  const savedMap = useMemo(() => {
    const m = {};
    collectionRules.forEach((r) => { m[r.product_type] = r.collection; });
    return m;
  }, [collectionRules]);

  const [draft, setDraft] = useState({});
  useEffect(() => { setDraft(savedMap); }, [savedMap]);

  const [saving, setSaving] = useState(false);
  const dirty = productTypes.some((t) => (draft[t] || '') !== (savedMap[t] || ''));

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const rules = productTypes.filter((t) => draft[t]).map((t) => ({ product_type: t, collection: draft[t] }));
      await actions.saveCollectionRules(rules);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AiUsageCard />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', margin: '0 0 4px', color: '#1a1a1a' }}>Collection mapping</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b6b6b', maxWidth: 680 }}>
          Default Shopify collection for each AI-detected product type. New drafts in Listing review start here —
          override any single draft there without changing the default for everyone else.
        </p>
      </div>

      {collectionRulesStatus === 'loading' && (
        <div style={{ background: '#fff', border: '1px dashed #d8d8d8', borderRadius: 12, padding: 40, textAlign: 'center', color: '#8a8a8a', fontSize: 13 }}>
          Loading mapping…
        </div>
      )}

      {collectionRulesStatus === 'error' && (
        <div style={{ background: '#fce9e7', border: '1px solid #f0d4d1', borderRadius: 12, padding: 20, color: '#b3261e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1 }}>Couldn't load the collection mapping: {collectionRulesError}</span>
          <button onClick={actions.reloadCollectionRules} style={{ background: '#fff', border: '1px solid #f0d4d1', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#b3261e', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {collectionRulesStatus === 'ready' && (
        <>
          <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 18px', borderBottom: '1px solid #ececec', background: '#fafafa', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase' }}>
              <div style={{ flex: '0 0 200px' }}>Product type</div>
              <div style={{ flex: 1 }}>Collection</div>
            </div>
            {productTypes.map((t, i) => (
              <div
                key={t}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 18px', borderBottom: i === productTypes.length - 1 ? 'none' : '1px solid #f1f1f1' }}
              >
                <div style={{ flex: '0 0 200px', fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{t}</div>
                <div style={{ flex: 1, maxWidth: 320 }}>
                  <LovPicker
                    value={draft[t] || ''}
                    options={collections}
                    onChange={(v) => setDraft((d) => ({ ...d, [t]: v }))}
                    placeholder="No default — AI drafts need a manual collection"
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="so-btn-dark"
              style={{
                background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 20px', fontFamily: 'inherit',
                fontSize: 13.5, fontWeight: 600, cursor: !dirty || saving ? 'default' : 'pointer', opacity: !dirty || saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AiUsageCard() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getAiUsage()
      .then((u) => { if (!cancelled) { setUsage(u); setStatus('ready'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>AI usage & cost</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#6b6b6b' }}>
          Spend on Claude Haiku 4.5 photo analysis (Anthropic Message Batches API, 50% discount). Billed in USD —
          Anthropic doesn't expose account balance via API, so check your remaining credit at{' '}
          <span style={{ fontWeight: 600 }}>platform.claude.com</span>.
        </p>
      </div>

      {status === 'loading' && (
        <div style={{ background: '#fff', border: '1px dashed #d8d8d8', borderRadius: 12, padding: 24, textAlign: 'center', color: '#8a8a8a', fontSize: 13 }}>
          Loading usage…
        </div>
      )}
      {status === 'error' && (
        <div style={{ background: '#fce9e7', border: '1px solid #f0d4d1', borderRadius: 12, padding: 16, color: '#b3261e', fontSize: 13 }}>
          Couldn't load AI usage.
        </div>
      )}
      {status === 'ready' && usage && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <UsageStat label="Today" data={usage.today} />
          <UsageStat label="This month" data={usage.month} />
          <UsageStat label="All time" data={usage.allTime} />
        </div>
      )}
    </div>
  );
}

function UsageStat({ label, data }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#8a8a8a', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>${data.costUsd.toFixed(4)}</div>
      <div style={{ fontSize: 12, color: '#8a8a8a', marginTop: 4 }}>
        {data.requests} request{data.requests === 1 ? '' : 's'} · {(data.inputTokens + data.outputTokens).toLocaleString()} tokens
      </div>
    </div>
  );
}
