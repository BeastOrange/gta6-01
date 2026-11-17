// The player on foot: walking, sprinting, punching, picking things up.
// One job: everything the player does when not inside a car.

import { PLAYER, clamp, distance, angleDifference } from './config.js';
import { resolveBuildingCollision, buildingAt } from './world.js';
import { nearestCar, enterCar, exitCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    cash: 250,
    onFoot: true,
    car: null,
    punchTimer: 0,
    punchAnim: 0,
    hurtTimer: 0,
    bustedMeter: 0,
    sprinting: false,
  };
}

export function updatePlayerOnFoot(state, dt) {
  const player = state.player;
  const input = state.input;
  const axis = input.axis();
  player.punchTimer = Math.max(0, player.punchTimer - dt);
  player.punchAnim = Math.max(0, player.punchAnim - dt);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);

  const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  player.sprinting = sprint && (axis.x !== 0 || axis.y !== 0);
  const speed = player.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  let mx = axis.x;
  let my = axis.y;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    player.angle = Math.atan2(my, mx);
    const nx = player.x + mx * speed * dt;
    const ny = player.y + my * speed * dt;
    player.x = nx;
    player.y = ny;
    const probe = { x: player.x, y: player.y, radius: player.radius };
    if (resolveBuildingCollision(state.world, probe)) {
      player.x = probe.x;
      player.y = probe.y;
    }
    player.x = clamp(player.x, 20, 3180);
    player.y = clamp(player.y, 20, 2380);
  }

  // Punch: Space or J. Hits the nearest thug, officer or ped in range.
  if ((input.wasPressed('Space') || input.wasPressed('KeyJ')) && player.punchTimer <= 0) {
    player.punchTimer = PLAYER.punchCooldown;
    player.punchAnim = 0.22;
    state.audio.sfx('punch');
    const target = nearestPunchTarget(state);
    if (target) {
      target.hp -= PLAYER.punchDamage;
      target.hurtTimer = 0.3;
      const kx = Math.cos(player.angle) * 26;
      const ky = Math.sin(player.angle) * 26;
      target.x += kx;
      target.y += ky;
      state.effects.addHitSpark(state, target.x, target.y);
      if (target.hp <= 0) {
        state.effects.addCashDrop(state, target.x, target.y, target.carries || 40);
        if (target.kind === 'thug') state.mission.onThugDown(state, target);
        if (target.kind === 'officer') state.police.addWanted(state, 1);
        state.peds.removePed(state, target);
        state.hud.pushMessage(target.kind === 'thug' ? 'Thug down!' : 'You knocked them flat!');
      }
    }
  }

  // Enter / exit a car with E.
  if (input.wasPressed('KeyE')) {
    const car = nearestCar(state.cars, player.x, player.y, 64);
    if (car) enterCar(state, car);
    else state.hud.pushMessage('No car close enough. Walk up to one and press E.');
  }

  // Pick up cash lying on the ground.
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    if (distance(player.x, player.y, p.x, p.y) < 34) {
      player.cash += p.amount;
      state.stats.bestCash = Math.max(state.stats.bestCash, player.cash);
      state.audio.sfx('pickup');
      state.hud.pushMessage(`+$${p.amount}`);
      state.pickups.splice(i, 1);
    }
  }
}

function nearestPunchTarget(state) {
  const player = state.player;
  let best = null;
  let bestD = PLAYER.punchRange;
  const candidates = [...state.peds.list, ...state.police.officers];
  for (const c of candidates) {
    const d = distance(player.x, player.y, c.x, c.y);
    if (d >= bestD) continue;
    const facing = angleDifference(player.angle, Math.atan2(c.y - player.y, c.x - player.x));
    if (Math.abs(facing) > 1.5) continue;
    bestD = d;
    best = c;
  }
  return best;
}

export function hurtPlayer(state, amount, source) {
  const player = state.player;
  if (player.hurtTimer > 0 || state.mode !== 'playing') return;
  player.hp -= amount;
  player.hurtTimer = 0.5;
  state.audio.sfx('punch');
  state.effects.addHitSpark(state, player.x, player.y);
  if (player.hp <= 0) {
    player.hp = 0;
    state.mode = 'wasted';
    state.audio.sfx('wasted');
    state.audio.stopMusic();
    state.save.saveGame(state);
  }
}

// Called when the player is inside a car and presses E, or the car is wrecked.
export function updatePlayerInCar(state, dt) {
  const player = state.player;
  const car = player.car;
  if (!car) { player.onFoot = true; return; }
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  const input = state.input;
  // Staged chase/drive shots hold the throttle until the player takes over.
  const throttle = state.autoDrive ? 1
    : (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0)
    - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
  const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? -1 : 0)
    + (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
  const handbrake = input.isDown('Space');
  const crashed = state.vehicles.driveCar(car, throttle, steer, handbrake, dt, state.world);
  if (crashed && Math.abs(car.speed) > 150) {
    state.audio.sfx('crash');
    state.effects.addHitSpark(state, car.x, car.y);
    state.police.addWanted(state, 0); // a loud crash draws a little attention
  }
  if (input.isDown('KeyH') && car.honkCooldown <= 0) {
    car.honkCooldown = 0.8;
    state.audio.sfx('horn');
  }
  car.honkCooldown = Math.max(0, car.honkCooldown - dt);
  state.audio.setEngine(Math.abs(car.speed) / car.maxSpeed);
  if (input.wasPressed('KeyE')) exitCar(state);
  // Running over a pedestrian is a crime and it is messy.
  for (const ped of state.peds.list) {
    if (distance(car.x, car.y, ped.x, ped.y) < 26 && Math.abs(car.speed) > 60) {
      ped.hp = 0;
      state.peds.removePed(state, ped);
      state.effects.addHitSpark(state, ped.x, ped.y);
      state.police.addWanted(state, 1);
      state.hud.pushMessage('You hit a pedestrian! The cops were called.');
      state.audio.sfx('crash');
      break;
    }
  }
}
