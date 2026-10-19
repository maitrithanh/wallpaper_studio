// Native resolutions. Export uses these exact pixels.
// Groups are by brand; `popular` devices also appear in the Popular group at the top.
export const GROUPS = [
  { id: 'popular', label: 'Popular' },
  { id: 'iphone', label: 'iPhone' },
  { id: 'ipad', label: 'iPad' },
  { id: 'mac', label: 'Mac' },
  { id: 'samsung', label: 'Samsung' },
  { id: 'pixel', label: 'Google Pixel' },
  { id: 'other-phone', label: 'Other phones' },
  { id: 'monitor', label: 'Monitors' },
];

export const DEVICES = [
  // iPhone (portrait)
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', w: 1206, h: 2622, brand: 'iphone', popular: true },
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', w: 1320, h: 2868, brand: 'iphone', popular: true },
  { id: 'iphone-16', name: 'iPhone 16', w: 1179, h: 2556, brand: 'iphone', popular: true },
  { id: 'iphone-15', name: 'iPhone 15', w: 1179, h: 2556, brand: 'iphone' },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', w: 1179, h: 2556, brand: 'iphone' },
  { id: 'iphone-se', name: 'iPhone SE', w: 750, h: 1334, brand: 'iphone' },

  // iPad (landscape)
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', w: 2420, h: 1668, brand: 'ipad', popular: true },
  { id: 'ipad-pro-13', name: 'iPad Pro 13"', w: 2752, h: 2064, brand: 'ipad' },
  { id: 'ipad-air-11', name: 'iPad Air 11"', w: 2360, h: 1640, brand: 'ipad' },
  { id: 'ipad-mini', name: 'iPad mini', w: 2266, h: 1488, brand: 'ipad' },

  // Mac (landscape)
  { id: 'macbook-air-13', name: 'MacBook Air 13"', w: 2560, h: 1664, brand: 'mac', popular: true },
  { id: 'macbook-pro-14', name: 'MacBook Pro 14"', w: 3024, h: 1964, brand: 'mac' },

  // Samsung
  { id: 'galaxy-s25', name: 'Galaxy S25', w: 1080, h: 2340, brand: 'samsung', popular: true },
  { id: 'galaxy-s25-ultra', name: 'Galaxy S25 Ultra', w: 1440, h: 3120, brand: 'samsung' },
  { id: 'galaxy-tab-s9', name: 'Galaxy Tab S9', w: 2560, h: 1600, brand: 'samsung' },

  // Google Pixel
  { id: 'pixel-9', name: 'Pixel 9', w: 1080, h: 2424, brand: 'pixel', popular: true },
  { id: 'pixel-9-pro', name: 'Pixel 9 Pro', w: 1280, h: 2856, brand: 'pixel' },
  { id: 'pixel-8', name: 'Pixel 8', w: 1080, h: 2400, brand: 'pixel' },

  // Other phones
  { id: 'oneplus-13', name: 'OnePlus 13', w: 1440, h: 3168, brand: 'other-phone' },
  { id: 'xiaomi-15', name: 'Xiaomi 15', w: 1200, h: 2670, brand: 'other-phone' },

  // Monitors / generic resolutions
  { id: 'desktop-1080', name: 'Full HD 1080p', w: 1920, h: 1080, brand: 'monitor' },
  { id: 'desktop-1440', name: 'QHD 1440p', w: 2560, h: 1440, brand: 'monitor', popular: true },
  { id: 'desktop-4k', name: '4K UHD', w: 3840, h: 2160, brand: 'monitor' },
  { id: 'ultrawide-1440', name: 'Ultrawide 1440p', w: 3440, h: 1440, brand: 'monitor' },
];

// Device pixel ratio per brand, used to get the CSS size the simulator renders at.
const DPR = { iphone: 3, samsung: 3, pixel: 3, 'other-phone': 3, ipad: 2, mac: 2, monitor: 1 };

// Logical (CSS px) size: native pixels ÷ DPR. This is what a site sees as its viewport.
export const cssSize = (d) => ({ w: Math.round(d.w / DPR[d.brand]), h: Math.round(d.h / DPR[d.brand]) });
