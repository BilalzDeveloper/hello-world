// Shared vendor + collection config, extracted from the original UKSC onboarder
// index.html (Google Drive version). Single source of truth for server AND API
// validation — the frontend fetches this via /api (never duplicated there).

const VENDORS = [
  'Siim', 'Sim', 'Son', 'Ad', 'Ahm', 'D', 'Fr', 'Alll', 'Al', 'Cho',
  'Shii', 'Che', 'Mon', 'Afi', 'Sh', 'Zero', 'Dar', 'Nwdr', 'Zz', 'Mz',
  'Za', 'Rag', 'Tag', 'Uptk', 'Daup', 'Ham', 'Oooo',
];

// Special vendor values allowed in addition to the list above.
const VENDOR_UNASSIGNED = 'UNASSIGNED';
const VENDOR_IGNORED = 'IGNORED';

const COLLECTION_MAP = {
  'T-shirt': 'T-Shirts For Men', 'Top': 'T-Shirts For Men', 'Polo': 'T-Shirts For Men',
  'Shorts': 'Boxers and Shorts', 'Board shorts': 'Boxers and Shorts', 'Swim shorts': 'Boxers and Shorts', 'Sweat shorts': 'Boxers and Shorts',
  'Tracksuit': 'Tracksuits For Men', 'Joggers': 'Tracksuits For Men', 'Sweatpants': 'Tracksuits For Men',
  // Hoodie/Jacket/Coat used to default to "Tracksuits For Men" — the store has
  // dedicated collections for these now, so route to those instead.
  'Hoodie': 'Hoodies & Jumpers (Men)', 'Jacket': 'Jackets & Warmers', 'Coat': 'Jackets & Warmers',
  'Trainers': 'Trainers & Footwear', 'Sneakers': 'Trainers & Footwear', 'Shoes': 'Trainers & Footwear',
  'Jeans': 'Jeans', 'Trousers': 'Jeans', 'Bag': 'Unisex Bags', 'Backpack': 'Unisex Bags',
  'Socks': 'Socks For Men', 'Boxers': 'Boxers and Shorts', 'Underwear': 'Boxers and Shorts',
  'Perfume': 'Perfumes For Her', 'Fragrance': 'Perfumes For Her', 'Wallet': 'Men Wallet & Bag',
};

const PRODUCT_TYPES = Object.keys(COLLECTION_MAP);

// Real Shopify collections at ukstylishclub.com (inspected live; excludes the
// "All Collections" catch-all, which isn't a meaningful manual category).
// This is what the Listing review collection picker and the admin mapping
// page in Settings let a manager choose between — independent of which
// PRODUCT_TYPES the AI happens to know about.
const COLLECTIONS = [
  'Beddings, Mats, Towels and Lamps', 'Belts For Men', 'Boxers and Shorts', 'Boys Footwear',
  'Boys T-Shirt', 'Bracelets', 'Candles', 'Cap, Scarf and Gloves', 'Caps and Gloves for Men',
  'Earrings', 'Electric Cigarette', 'Girls Footwear', 'Girls Jacket', 'Girls Tracksuits',
  'Headphones', 'Hoodies & Jumpers (Men)', 'Hoodies & Jumpers (Women)', 'Jacket For Boys',
  'Jackets & Warmers', 'Jackets For Women', 'Jeans', 'Makeup', 'Men Wallet & Bag',
  'Perfume For Him', 'Perfumes For Her', 'Shoes', 'Shoes and Slippers',
  'Shorts, Underwear & Swim Suits', 'Slipper For Men', 'Socks For Men', 'Sunglasses (Uni-Sex)',
  'T-Shirts For Men', 'Tracksuit and Jeans For Boys', 'Tracksuits (Women)', 'Tracksuits For Men',
  'Trainers & Footwear', 'Unisex Bags', 'Watches For Men', 'Watches For Women', 'Women Belts',
];
const FOOTWEAR_TYPES = ['Trainers', 'Sneakers', 'Shoes'];
const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'];

const PRICE_SEED = {
  Trainers: 110, Sneakers: 110, Shoes: 110,
  'T-shirt': 45, Polo: 45, Top: 45,
  Tracksuit: 85, Hoodie: 85, Joggers: 85,
};

// Longest codes first so "Siim" wins over "Sim", "Alll" over "Al", "Shii" over "Sh".
const VENDORS_BY_LENGTH = [...VENDORS].sort((a, b) => b.length - a.length);

// Find a vendor code in a message caption. Case-insensitive, optional leading #,
// must be a standalone token (so the single-letter code "D" doesn't match inside
// random words).
function matchVendorCode(caption) {
  if (!caption) return null;
  for (const code of VENDORS_BY_LENGTH) {
    const re = new RegExp(`(^|[^a-z0-9])#?${escapeRe(code)}([^a-z0-9]|$)`, 'i');
    if (re.test(caption)) return code;
  }
  return null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidVendor(v, { allowSpecial = true } = {}) {
  if (typeof v !== 'string') return false;
  if (VENDORS.includes(v)) return true;
  return allowSpecial && (v === VENDOR_UNASSIGNED || v === VENDOR_IGNORED);
}

function collectionFor(productType) {
  return COLLECTION_MAP[productType] || '⚠️ Unknown';
}

function sizesFor(productType, isFootwear) {
  const footwear = isFootwear || FOOTWEAR_TYPES.includes(productType);
  return (footwear ? SHOE_SIZES : CLOTHING_SIZES).join(', ');
}

module.exports = {
  VENDORS,
  VENDOR_UNASSIGNED,
  VENDOR_IGNORED,
  COLLECTION_MAP,
  COLLECTIONS,
  PRODUCT_TYPES,
  FOOTWEAR_TYPES,
  CLOTHING_SIZES,
  SHOE_SIZES,
  PRICE_SEED,
  matchVendorCode,
  isValidVendor,
  collectionFor,
  sizesFor,
};
