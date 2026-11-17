// Canvas drawing: the city, the cars, the people, the light.
// One job: turn the game state into a picture. No game logic lives here.

import { WORLD_W, WORLD_H, PALETTE } from './config.js';
import { districtNameAt } from './world.js';

export function drawGame(ctx, state) {
  const cam = state.camera;
  const vw = state.view.w;
  const vh = state.view.h;
  ctx.save();
  ctx.clearRect(0, 0, vw, vh);
  // Warm afternoon light over everything.
  ctx.fillStyle = '#ffe9b8';
  ctx.fillRect(0, 0, vw, vh);
  const shakeX = (Math.random() - 0.5) * cam.shake;
  const shakeY = (Math.random() - 0.5) * cam.shake;
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

  drawGround(ctx, state);
  drawRoads(ctx, state);
  drawParks(ctx, state);
  drawBuildings(ctx, state);
  drawGarage(ctx, state);
  drawMissionMarker(ctx, state);
  drawCars(ctx, state);
  drawPeds(ctx, state);
  drawPlayer(ctx, state);
  state.effects.draw(ctx);
  drawWater(ctx, state);
  ctx.restore();
  // Sun glare in the top corner, drawn in screen space.
  const glare = ctx.createRadialGradient(vw - 80, 40, 10, vw - 80, 40, 320);
  glare.addColorStop(0, 'rgba(255, 240, 180, 0.28)');
  glare.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, vw, vh);
}

function drawGround(ctx, state) {
  const world = state.world;
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // Mow stripes so the grass reads as lawns, not flat colour.
  ctx.fillStyle = PALETTE.grassDark;
  for (let x = 0; x < WORLD_W; x += 200) {
    ctx.fillRect(x, 0, 100, WORLD_H);
  }
  // Sand and sea along the south edge.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(world.beach.x, world.beach.y, world.beach.w, world.beach.h);
  ctx.fillStyle = '#d9c48a';
  for (let x = 40; x < WORLD_W; x += 130) {
    ctx.beginPath();
    ctx.arc(x, world.beach.y + 60 + (x % 260), 12, 0, Math.PI * 2);
    ctx.fill();
  }
  // Palm trees dotted along the beach and the park.
  for (let x = 90; x < WORLD_W; x += 170) {
    drawPalm(ctx, x, world.beach.y + 30 + ((x * 7) % 60));
  }
  for (const park of world.parks) {
    for (let i = 0; i < 5; i++) {
      drawPalm(ctx, park.x + 40 + i * 55, park.y + 50 + (i % 2) * 90);
    }
  }
}

function drawPalm(ctx, x, y) {
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 6, y - 18, x + 2, y - 30);
  ctx.stroke();
  ctx.fillStyle = '#3f8a4a';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.ellipse(x + 2 + Math.cos(a) * 16, y - 32 + Math.sin(a) * 8, 16, 5, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWater(ctx, state) {
  const w = state.world.water;
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  const t = state.time * 0.7;
  for (let x = 0; x < WORLD_W; x += 90) {
    const y = w.y + 22 + Math.sin(t + x * 0.02) * 8;
    ctx.fillRect(x + ((t * 30) % 90), y, 46, 3);
  }
}

function drawRoads(ctx, state) {
  for (const r of state.world.roads) {
    ctx.fillStyle = PALETTE.asphalt;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = PALETTE.sidewalk;
    if (r.horizontal) {
      ctx.fillRect(r.x, r.y, r.w, 8);
      ctx.fillRect(r.x, r.y + r.h - 8, r.w, 8);
    } else {
      ctx.fillRect(r.x, r.y, 8, r.h);
      ctx.fillRect(r.x + r.w - 8, r.y, 8, r.h);
    }
  }
  // Dashed centre lines.
  ctx.fillStyle = PALETTE.lane;
  for (const r of state.world.roads) {
    if (r.horizontal) {
      for (let x = 20; x < r.w; x += 64) ctx.fillRect(r.x + x, r.y + r.h / 2 - 2, 34, 4);
    } else {
      for (let y = 20; y < r.h; y += 64) ctx.fillRect(r.x + r.w / 2 - 2, r.y + y, 4, 34);
    }
  }
}

function drawParks(ctx, state) {
  for (const park of state.world.parks) {
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = '#c9b98a';
    ctx.beginPath();
    ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7fb8d9';
    ctx.beginPath();
    ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const plaza of state.world.plazas) {
    ctx.fillStyle = PALETTE.plaza;
    ctx.fillRect(plaza.x, plaza.y, plaza.w, plaza.h);
    ctx.fillStyle = '#8a7a5a';
    ctx.beginPath();
    ctx.arc(plaza.x + plaza.w / 2, plaza.y + plaza.h / 2, 34, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuildings(ctx, state) {
  for (const b of state.world.buildings) {
    // Soft drop shadow to the south-east: the afternoon sun.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(b.x, b.y, b.w, 8);
    // Roof detail: a lighter inner slab and a few windows.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    ctx.fillStyle = '#d9e8f0';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i + j) % 2 === 0) ctx.fillRect(b.x + 10 + i * 24, b.y + 10 + j * 24, 12, 9);
      }
    }
    if (b.height >= 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.w - 14, b.y + 6, 8, 8);
    }
  }
}

function drawGarage(ctx, state) {
  const g = state.garage.pos;
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(g.x - 70, g.y - 50, 140, 100);
  ctx.fillStyle = '#e8b73a';
  ctx.fillRect(g.x - 70, g.y - 50, 140, 16);
  ctx.fillStyle = '#22303e';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("TITO'S GARAGE", g.x, g.y - 56);
  ctx.fillStyle = '#c94f43';
  ctx.fillRect(g.x - 40, g.y - 34, 80, 26);
  if (state.garage.near) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('R: Repair car   B: Buy a car', g.x, g.y + 72);
  }
}

function drawMissionMarker(ctx, state) {
  const marker = state.mission.marker();
  if (!marker) return;
  const pulse = 1 + Math.sin(state.time * 4) * 0.15;
  ctx.strokeStyle = marker.color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, marker.r * 0.55 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 210, 62, 0.18)';
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, marker.r * 0.55 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // A beacon column so the target is visible from far away.
  const grad = ctx.createLinearGradient(marker.x, marker.y - 260, marker.x, marker.y);
  grad.addColorStop(0, 'rgba(255, 210, 62, 0)');
  grad.addColorStop(1, 'rgba(255, 210, 62, 0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(marker.x - 8, marker.y - 260, 16, 260);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(marker.x, marker.y - 250);
  ctx.lineTo(marker.x - 12, marker.y - 224);
  ctx.lineTo(marker.x + 12, marker.y - 224);
  ctx.closePath();
  ctx.fill();
}

function drawCars(ctx, state) {
  for (const car of state.cars) {
    drawCar(ctx, car, state.time);
  }
}

export function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  if (car.crashed > 0) {
    ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
  }
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-22, -10, 48, 26);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -24, -12, 48, 24, 7);
  ctx.fill();
  // Police livery.
  if (car.typeId === 'police') {
    ctx.fillStyle = '#e8e4da';
    ctx.fillRect(-6, -12, 12, 24);
    ctx.fillStyle = '#22303e';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SBPD', 0, 3);
    const flash = Math.floor(time * 3) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2e7fe8';
    ctx.fillRect(-20, -13, 8, 4);
    ctx.fillStyle = flash ? '#2e7fe8' : '#ff3b30';
    ctx.fillRect(12, -13, 8, 4);
  } else if (car.typeId === 'taxi') {
    ctx.fillStyle = '#22303e';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  // Windshield and rear window.
  ctx.fillStyle = '#1d2b36';
  ctx.fillRect(6, -9, 9, 18);
  ctx.fillRect(-16, -9, 6, 18);
  // Headlights.
  ctx.fillStyle = '#fff2b0';
  ctx.fillRect(22, -10, 3, 4);
  ctx.fillRect(22, 6, 3, 4);
  // Damage smoke.
  if (car.hp < car.maxHp * 0.4 && car.driver !== 'wreck') {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(-18 + Math.random() * 6, -4, 6 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPeds(ctx, state) {
  const all = [...state.peds.list, ...state.police.officers];
  for (const ped of all) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs shuffle while walking.
    const swing = Math.sin(ped.walkPhase || 0) * 4;
    ctx.strokeStyle = '#22303e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-swing, 10);
    ctx.moveTo(0, 2);
    ctx.lineTo(swing, 10);
    ctx.stroke();
    // Body.
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    // Head.
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    if (ped.kind === 'thug') {
      ctx.fillStyle = '#c94f43';
      ctx.fillRect(-8, -14, 16, 5);
      ctx.fillStyle = '#22303e';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -18);
    }
    if (ped.kind === 'officer') {
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SBPD', 0, -16);
    }
    // Hurt flash / thug health bar.
    if (ped.hp < ped.maxHp) {
      ctx.fillStyle = '#c94f43';
      ctx.fillRect(-12, -22, 24, 4);
      ctx.fillStyle = '#7ad94b';
      ctx.fillRect(-12, -22, 24 * (ped.hp / ped.maxHp), 4);
    }
    ctx.restore();
  }
}

function drawPlayer(ctx, state) {
  const player = state.player;
  if (!player.onFoot) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(player.angle);
  // Punch swing.
  if (player.punchAnim > 0) {
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.arc(24, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e84b3a';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(6, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22303e';
  ctx.beginPath();
  ctx.arc(8, -3, 2, 0, Math.PI * 2);
  ctx.arc(8, 3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // A small ring under the player so they never get lost in a crowd.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
  ctx.stroke();
  // District label fades in as the player crosses into a new area.
  const district = districtNameAt(player.x, player.y);
  if (district !== state.lastDistrict) {
    state.lastDistrict = district;
    state.districtTimer = 2.4;
    state.audio.sfx('click');
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
