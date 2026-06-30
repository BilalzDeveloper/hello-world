// Real listing confidence is just 'high'/'low' (set by the AI analysis step) —
// no numeric score is stored, so this is a two-state badge, not a ramp.
export function confidenceBadge(confidence) {
  return confidence === 'low'
    ? { label: 'Low confidence', color: '#9a5b00', bg: '#fbf1dd' }
    : { label: 'Good confidence', color: '#0a7a52', bg: '#e7f4ee' };
}
