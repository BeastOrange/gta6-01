// Solmar Bay — the city itself: roads, blocks, buildings, beach and parks.
// One job: generate the map once from a seed and answer collision questions.

import { WORLD_W, WORLD_H, ROAD_W, BLOCK, PALETTE, mulberry32, pickFrom, clamp } from './config.js';

const ROOF_COLORS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, '#8a6a9a', '#a08a6a'];

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const roads = [];
  // Vertical avenues every BLOCK, horizontal streets every BLOCK.
  for (let x = BLOCK; x < WORLD_W; x += BLOCK) {
    roads.push({ x: x - ROAD_W / 2, y: 0, w: ROAD_W, h: WORLD_H, horizontal: false });
  }
  for (let y = BLOCK; y < WORLD_H; y += BLOCK) {
    roads.push({ x: 0, y: y - ROAD_W / 2, w: WORLD_W, h: ROAD_W, horizontal: true });
  }
  // The beach road along the south edge.
  roads.push({ x: 0, y: WORLD_H - 140, w: WORLD_W, h: 96, horizontal: true });

  const buildings = [];
  const parks = [];
  const plazas = [];
  const names = [
    'Hotel Mirada', 'Café Lumen', 'The Coral Arms', 'Bayview Flats', 'Palm Court',
    'Marina Offices', 'The Rusty Anchor', 'Solmar Market', 'Cinema Azul', 'Taco Verde',
    'Gym Riptide', 'Laundromat Sol', 'Pawn & Gold', 'Bar El Faro', 'Surf Shop Kai',
    'Diner 88', 'Pharmacy Vida', 'Garage Tito', 'Bakery Alba', 'Club Neon Bay',
  ];
  let nameIndex = 0;

  for (let bx = 0; bx < 7; bx++) {
    for (let by = 0; by < 5; by++) {
      const blockX = bx * BLOCK + ROAD_W / 2 + 14;
      const blockY = by * BLOCK + ROAD_W / 2 + 14;
      const blockW = BLOCK - ROAD_W - 28;
      const blockH = BLOCK - ROAD_W - 28;
      // The south-west block is the beach; the centre block is the big park.
      if (bx === 0 && by === 4) continue;
      if (bx === 3 && by === 2) {
        parks.push({ x: blockX, y: blockY, w: blockW, h: blockH, name: 'Palmera Park' });
        continue;
      }
      if (bx === 4 && by === 2 && rng() < 0.9) {
        plazas.push({ x: blockX, y: blockY, w: blockW, h: blockH, name: 'Plaza del Sol' });
        continue;
      }
      // 2-4 buildings per block, leaving alleys between them.
      const count = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i++) {
        const w = 70 + rng() * 90;
        const h = 60 + rng() * 80;
        const x = blockX + rng() * Math.max(1, blockW - w);
        const y = blockY + rng() * Math.max(1, blockH - h);
        const box = { x, y, w, h };
        if (buildings.some((b) => rectsOverlap(b, box, 18))) continue;
        buildings.push({
          ...box,
          color: pickFrom(rng, ROOF_COLORS),
          height: 1 + Math.floor(rng() * 3),
          name: names[nameIndex++ % names.length],
          district: districtNameAt(x + w / 2, y + h / 2),
        });
      }
    }
  }

  // Docks: containers and warehouses along the east edge.
  for (let i = 0; i < 6; i++) {
    buildings.push({
      x: WORLD_W - 260 + (i % 2) * 110,
      y: 120 + i * 110,
      w: 90, h: 70,
      color: i % 2 ? '#5a6a7a' : '#a85a4a',
      height: 1, name: 'Dock Warehouse', district: 'The Docks',
    });
  }

  const world = {
    seed, roads, buildings, parks, plazas,
    beach: { x: 0, y: WORLD_H - 220, w: WORLD_W, h: 220 },
    water: { x: 0, y: WORLD_H - 90, w: WORLD_W, h: 90 },
    carSpawns: makeCarSpawns(rng),
    pedSpawns: makePedSpawns(rng),
  };
  return world;
}

function makeCarSpawns(rng) {
  const spots = [];
  for (let x = BLOCK; x < WORLD_W; x += BLOCK) {
    for (let y = BLOCK; y < WORLD_H; y += BLOCK) {
      if (rng() < 0.55) spots.push({ x: x + ROAD_W / 2 + 26, y: y - 60 - rng() * 120, angle: Math.PI / 2 });
      if (rng() < 0.45) spots.push({ x: x - ROAD_W / 2 - 26, y: y + 60 + rng() * 120, angle: -Math.PI / 2 });
    }
  }
  return spots;
}

function makePedSpawns(rng) {
  const spots = [];
  for (let i = 0; i < 90; i++) {
    spots.push({
      x: 150 + rng() * (WORLD_W - 300),
      y: 150 + rng() * (WORLD_H - 400),
    });
  }
  return spots;
}

function rectsOverlap(a, b, pad) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

export function districtNameAt(x, y) {
  const col = clamp(Math.floor(x / 800), 0, 3);
  const row = clamp(Math.floor(y / 800), 0, 2);
  const grid = [
    ['Marina', 'Old Town', 'Palm Row', 'The Docks'],
    ['Bayfront', 'Downtown', 'Café Quarter', 'Hillcrest'],
    ['South Beach', 'Market Row', 'Garden District', 'Airport Road'],
  ];
  return grid[row][col];
}

export function isOnRoad(world, x, y) {
  return world.roads.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

export function isInWater(world, x, y) {
  return y >= world.water.y;
}

export function buildingAt(world, x, y, radius) {
  for (const b of world.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps. Returns true when a push happened.
export function resolveBuildingCollision(world, body) {
  const b = buildingAt(world, body.x, body.y, body.radius);
  if (!b) return false;
  const cx = clamp(body.x, b.x, b.x + b.w);
  const cy = clamp(body.y, b.y, b.y + b.h);
  let dx = body.x - cx;
  let dy = body.y - cy;
  let d = Math.hypot(dx, dy);
  if (d === 0) {
    // Centre is inside the building: push out along the smallest exit.
    const left = body.x - b.x;
    const right = b.x + b.w - body.x;
    const top = body.y - b.y;
    const bottom = b.y + b.h - body.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) body.x = b.x - body.radius;
    else if (m === right) body.x = b.x + b.w + body.radius;
    else if (m === top) body.y = b.y - body.radius;
    else body.y = b.y + b.h + body.radius;
    return true;
  }
  dx /= d;
  dy /= d;
  body.x = cx + dx * body.radius;
  body.y = cy + dy * body.radius;
  return true;
}

// Nearest point on the road grid to (x, y) — traffic and spawning use this.
export function nearestRoadPoint(world, x, y) {
  let bestX = x;
  let bestY = y;
  let best = Infinity;
  for (const r of world.roads) {
    const px = clamp(x, r.x + 8, r.x + r.w - 8);
    const py = clamp(y, r.y + 8, r.y + r.h - 8);
    const d = (px - x) ** 2 + (py - y) ** 2;
    if (d < best) { best = d; bestX = px; bestY = py; }
  }
  return { x: bestX, y: bestY };
}

// A random road intersection, for mission targets and police spawns.
export function randomIntersection(rng) {
  const xs = [];
  const ys = [];
  for (let v = BLOCK; v < WORLD_W; v += BLOCK) xs.push(v);
  for (let v = BLOCK; v < WORLD_H; v += BLOCK) ys.push(v);
  return { x: xs[Math.floor(rng() * xs.length)], y: ys[Math.floor(rng() * ys.length)] };
}
