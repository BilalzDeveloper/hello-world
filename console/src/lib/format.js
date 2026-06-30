const CURRENCY = '£';

export function money(n) {
  if (n === null || n === undefined) return '—';
  return CURRENCY + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function money0(n) {
  return CURRENCY + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

export function orderBadge(match) {
  if (match === 'MATCHED') return { label: 'Matched', bg: '#e7f4ee', color: '#0a7a52' };
  if (match === 'MISMATCH') return { label: 'Amount off', bg: '#fbf1dd', color: '#9a5b00' };
  return { label: 'Duplicate proof', bg: '#fce9e7', color: '#b3261e' };
}

// Vendor reliability ramp (>=95 green, >=90 amber, else amber-dark per spec).
export function reliabilityColor(r) {
  return r >= 95 ? '#0a7a52' : r >= 90 ? '#9a5b00' : '#b26b00';
}

// Real listing confidence is just 'high'/'low' (set by the AI analysis step) —
// no numeric score is stored, so this is a two-state badge, not a ramp.
export function confidenceBadge(confidence) {
  return confidence === 'low'
    ? { label: 'Low confidence', color: '#9a5b00', bg: '#fbf1dd' }
    : { label: 'Good confidence', color: '#0a7a52', bg: '#e7f4ee' };
}
