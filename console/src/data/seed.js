// In-memory seed/mock data for the views with no backend yet: orders/payment-proof
// verification/courier dispatch, the active-vendor directory (reliability/payout
// aren't tracked server-side), and catalog broadcast. Listings and vendor
// requests are wired to the real API — see store.jsx.

export const seedOrders = [
  {
    id: 1042,
    customer: 'Priya Shah',
    channel: 'Telegram',
    match: 'MATCHED',
    items: [
      { name: 'Ribbed knit jumper — Cream', vendor: 'camden', price: 48 },
      { name: 'Pleated midi skirt — Black', vendor: 'lola', price: 80 },
    ],
    total: 128,
    proofAmount: 128,
    proofRef: 'FT-88412',
    payer: 'P SHAH',
    address: '14 Mornington Cres, London NW1 7RB',
  },
  {
    id: 1043,
    customer: 'Tom Bryant',
    channel: 'WhatsApp',
    match: 'MATCHED',
    items: [{ name: 'Nike Air Max 90 — White/Grey, UK9', vendor: 'eastside', price: 95 }],
    total: 95,
    proofAmount: 95,
    proofRef: 'REV-22910',
    payer: 'THOMAS BRYANT',
    address: '6 Lavender Hill, London SW11 5RW',
  },
  {
    id: 1044,
    customer: 'Aisha Kamara',
    channel: 'Instagram',
    match: 'MATCHED',
    items: [
      { name: 'Leather crossbody bag — Tan', vendor: 'brick', price: 72 },
      { name: 'Mini bucket bag — Black', vendor: 'brick', price: 66 },
      { name: 'Cotton oversized shirt — Stone', vendor: 'camden', price: 72 },
    ],
    total: 210,
    proofAmount: 210,
    proofRef: 'FT-77301',
    payer: 'A KAMARA',
    address: '88 Peckham Rye, London SE15 4ST',
  },
  {
    id: 1045,
    customer: 'Daniel Owusu',
    channel: 'Telegram',
    match: 'MISMATCH',
    items: [{ name: 'Selvedge straight jeans — Indigo, W32', vendor: 'northern', price: 72 }],
    total: 72,
    proofAmount: 62,
    proofRef: 'FT-90155',
    payer: 'D OWUSU',
    address: '21 Deansgate, Manchester M3 2BW',
  },
  {
    id: 1046,
    customer: 'Grace Miller',
    channel: 'WhatsApp',
    match: 'DUPLICATE',
    items: [
      { name: 'Floral wrap dress — Green', vendor: 'lola', price: 90 },
      { name: 'Suede court shoes — Tan, UK6', vendor: 'eastside', price: 66 },
    ],
    total: 156,
    proofAmount: 156,
    proofRef: 'FT-88412',
    payer: 'P SHAH',
    address: '3 Otley Road, Leeds LS6 3AA',
  },
  {
    id: 1047,
    customer: 'Leon Ferreira',
    channel: 'Telegram',
    match: 'MATCHED',
    items: [{ name: 'Graphic tee — Washed black, M', vendor: 'camden', price: 45 }],
    total: 45,
    proofAmount: 45,
    proofRef: 'REV-30188',
    payer: 'L FERREIRA',
    address: '52 Gloucester Rd, Bristol BS7 8BH',
  },
  {
    id: 1048,
    customer: 'Hannah West',
    channel: 'Telegram',
    match: 'MATCHED',
    items: [
      { name: 'Carpenter trousers — Ecru, W30', vendor: 'northern', price: 78 },
      { name: 'Quilted weekender — Olive', vendor: 'brick', price: 106 },
    ],
    total: 184,
    proofAmount: 184,
    proofRef: 'FT-66020',
    payer: 'H WEST',
    address: '9 Cowley Road, Oxford OX4 1HP',
  },
];

export const seedActiveVendors = [
  { key: 'camden', rel: 98, lead: '1 day', products: 42, payout: 612 },
  { key: 'northern', rel: 96, lead: '2 days', products: 35, payout: 528 },
  { key: 'eastside', rel: 95, lead: '2 days', products: 28, payout: 840 },
  { key: 'lola', rel: 91, lead: '1 day', products: 63, payout: 390 },
  { key: 'brick', rel: 88, lead: '3 days', products: 17, payout: 255 },
];

export const seedCatalog = [
  { title: 'Ribbed knit jumper — Cream', vendor: 'camden', price: 48, cost: 24 },
  { title: 'Cotton oversized shirt — Stone', vendor: 'camden', price: 72, cost: 30 },
  { title: 'Pleated midi skirt — Black', vendor: 'lola', price: 80, cost: 36 },
  { title: 'Floral wrap dress — Green', vendor: 'lola', price: 90, cost: 41 },
  { title: 'Suede court shoes — Tan', vendor: 'eastside', price: 66, cost: 38 },
  { title: 'Retro runner — Sail/Gum', vendor: 'eastside', price: 88, cost: 50 },
  { title: 'Quilted weekender — Olive', vendor: 'brick', price: 106, cost: 52 },
  { title: 'Carpenter trousers — Ecru', vendor: 'northern', price: 78, cost: 34 },
];

export const seedChannels = [
  { key: 'tgch', name: 'Telegram channel', reach: '2,140 members', glyph: 'T', iconBg: '#e7f0fd', iconColor: '#1f6feb', on: true },
  { key: 'tgdm', name: 'Telegram DMs', reach: '880 opted in', glyph: 'D', iconBg: '#e7f0fd', iconColor: '#1f6feb', on: true },
  { key: 'wa', name: 'WhatsApp broadcast', reach: '1,310 contacts', glyph: 'W', iconBg: '#e7f4ee', iconColor: '#0a7a52', on: true },
  { key: 'ig', name: 'Instagram post + story', reach: '5,400 followers', glyph: 'I', iconBg: '#fbeef4', iconColor: '#c0457e', on: false },
  { key: 'shop', name: '"Today\'s Drop" collection', reach: 'On-store landing', glyph: 'S', iconBg: '#eef0fb', iconColor: '#4b53b5', on: true },
];

// Analytics — settled from prepaid orders. Static demo series (7 days).
export const analyticsDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const analyticsRevenue = [720, 980, 640, 1120, 880, 1240, 890];
export const analyticsMargin = [228, 318, 196, 372, 281, 402, 268];
export const analyticsVendorPerf = [
  { key: 'lola', units: 41, revenue: 1620, payout: 738 },
  { key: 'camden', units: 33, revenue: 1480, payout: 612 },
  { key: 'eastside', units: 22, revenue: 1310, payout: 760 },
  { key: 'northern', units: 19, revenue: 980, payout: 470 },
  { key: 'brick', units: 14, revenue: 850, payout: 408 },
];

// Today screen "recent activity" feed.
export const seedActivity = [
  { time: '09:14', text: 'Catalog broadcast to 4 channels — 1,240 recipients', tag: 'Catalog', tagColor: '#4b53b5', tagBg: '#eef0fb', dot: '#4b53b5' },
  { time: '08:52', text: '12 products auto-published — Camden Threads, Lola’s Vintage +3', tag: 'Listings', tagColor: '#9a5b00', tagBg: '#fbf1dd', dot: '#b26b00' },
  { time: '08:40', text: 'Order #1048 payment proof matched (£184.00)', tag: 'Payment', tagColor: '#0a7a52', tagBg: '#e7f4ee', dot: '#0c8a5f' },
  { time: '08:31', text: 'New vendor request from @maya_r_ldn held for approval', tag: 'Vendor', tagColor: '#1f6feb', tagBg: '#e7f0fd', dot: '#1f6feb' },
  { time: '08:05', text: 'Order #1039 delivered — settled £24.00 margin', tag: 'Delivered', tagColor: '#0a7a52', tagBg: '#e7f4ee', dot: '#0c8a5f' },
];

// vendor -> pickup lead time, used when grouping order-drawer items by vendor.
export const vendorPickupLead = { camden: '1 day', eastside: '2 days', lola: '1 day', brick: '3 days', northern: '2 days' };
