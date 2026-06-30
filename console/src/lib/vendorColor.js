// Real vendor codes (e.g. "Siim", "Ad") have no colour assigned server-side —
// hash the code to a stable index into the same palette the design uses for
// vendor dots, so each vendor gets a consistent colour across views/reloads.
const PALETTE = [
  '#4b53b5', '#1f6feb', '#c0457e', '#b26b00', '#0f7a6c', '#7c3aed',
  '#0891b2', '#be123c', '#15803d', '#a16207', '#4338ca', '#db2777',
];

export function colorForVendor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
