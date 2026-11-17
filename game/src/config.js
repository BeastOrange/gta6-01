// Solmar Bay — shared tuning numbers, palette and car catalogue.
// One job: hold every magic number in one place so the other modules agree.

export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 96;
export const BLOCK = 400;

export const PLAYER = {
  walkSpeed: 170,
  sprintSpeed: 265,
  radius: 14,
  maxHp: 100,
  punchRange: 46,
  punchDamage: 18,
  punchCooldown: 0.38,
};

export const WANTED = {
  decayDelay: 14,
  decayPerSecond: 0.12,
  maxStars: 5,
  // stars -> how many police cars / officers are out at once
  policeCars: [0, 1, 2, 3, 4, 5],
  policeFoot: [0, 1, 2, 2, 3, 4],
};

export const CAR_TYPES = [
  { id: 'sedan', name: 'Marlin Sedan', color: '#3f7fb8', maxSpeed: 430, accel: 300, grip: 3.4, price: 1200, hp: 100 },
  { id: 'taxi', name: 'Bay Taxi', color: '#e8b73a', maxSpeed: 410, accel: 290, grip: 3.4, price: 900, hp: 90 },
  { id: 'coupe', name: 'Vela Coupe', color: '#c94f43', maxSpeed: 520, accel: 360, grip: 3.9, price: 5200, hp: 90 },
  { id: 'van', name: 'Harbor Van', color: '#7d8a96', maxSpeed: 340, accel: 230, grip: 2.8, price: 1500, hp: 140 },
  { id: 'pickup', name: 'Dune Pickup', color: '#5d8a4a', maxSpeed: 460, accel: 320, grip: 3.5, price: 2800, hp: 120 },
  { id: 'sport', name: 'Falco GT', color: '#e8e4da', maxSpeed: 610, accel: 430, grip: 4.4, price: 9800, hp: 80 },
  { id: 'police', name: 'SBPD Interceptor', color: '#22303e', maxSpeed: 560, accel: 400, grip: 4.2, price: 0, hp: 160 },
];

export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#6f9c55',
  sand: '#e3cd9a',
  water: '#2f7fa8',
  waterDeep: '#256b90',
  asphalt: '#3a3d44',
  asphaltDark: '#33363d',
  sidewalk: '#9aa0a8',
  lane: '#e8d44f',
  roofA: '#b06a4a',
  roofB: '#7a8ba0',
  roofC: '#c98f5a',
  roofD: '#5f7a68',
  park: '#5d9b52',
  plaza: '#b9b3a4',
};

export const DISTRICTS = [
  { name: 'Marina', x: 0, y: 0, w: 800, h: 800, tint: '#8fb8c9' },
  { name: 'Old Town', x: 800, y: 0, w: 800, h: 800, tint: '#c9a06a' },
  { name: 'Palm Row', x: 1600, y: 0, w: 800, h: 800, tint: '#a8c98f' },
  { name: 'The Docks', x: 2400, y: 0, w: 800, h: 800, tint: '#9aa0a8' },
  { name: 'Bayfront', x: 0, y: 800, w: 800, h: 800, tint: '#8fb8c9' },
  { name: 'Downtown', x: 800, y: 800, w: 800, h: 800, tint: '#b8b0c9' },
  { name: 'Café Quarter', x: 1600, y: 800, w: 800, h: 800, tint: '#c9c98f' },
  { name: 'Hillcrest', x: 2400, y: 800, w: 800, h: 800, tint: '#9ac98f' },
  { name: 'South Beach', x: 0, y: 1600, w: 800, h: 800, tint: '#e3cd9a' },
  { name: 'Market Row', x: 800, y: 1600, w: 800, h: 800, tint: '#c98f8f' },
  { name: 'Garden District', x: 1600, y: 1600, w: 800, h: 800, tint: '#8fc9a8' },
  { name: 'Airport Road', x: 2400, y: 1600, w: 800, h: 800, tint: '#a8a8b8' },
];

// Deterministic random: same seed -> same city, so screenshots are repeatable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Shortest signed turn from angle a toward angle b.
export function angleDifference(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
