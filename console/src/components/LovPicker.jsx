import React, { useEffect, useRef, useState } from 'react';
import { SearchIcon, ChevronDownIcon } from '../icons.jsx';

// Self-contained searchable List-of-Values popup. Manages its own
// open/search state and closes on outside click, so it can drop into a
// table row or a card without needing a page-level click-away scrim.
export default function LovPicker({ value, options, onChange, placeholder = 'Select…', disabled, width = 260 }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = options.filter((o) => !q || o.toLowerCase().includes(q));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        className="so-menu-trigger"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e3e3e3', borderRadius: 8,
          padding: '7px 10px', cursor: disabled ? 'default' : 'pointer', fontSize: 13, opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ flex: 1, fontWeight: 600, color: value ? '#1a1a1a' : '#9a9a9a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <ChevronDownIcon />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width, background: '#fff', border: '1px solid #e3e3e3', borderRadius: 11, boxShadow: '0 10px 30px rgba(0,0,0,.13)', zIndex: 20, overflow: 'hidden' }}>
          <div style={{ padding: 9, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa' }}>
            <SearchIcon size={14} stroke="#a0a0a0" width={1.9} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 13, outline: 'none', color: '#1a1a1a' }}
            />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: 6 }}>
            {filtered.map((o) => (
              <div
                key={o}
                onClick={() => { onChange(o); setOpen(false); setQuery(''); }}
                className="so-menu-row"
                style={{
                  display: 'flex', alignItems: 'center', padding: '8px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  ...(o === value ? { background: '#f0f0f1', fontWeight: 700, color: '#1a1a1a' } : { color: '#3a3a3a' }),
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o}</span>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '14px 9px', textAlign: 'center', fontSize: 12.5, color: '#9a9a9a' }}>No matches.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
