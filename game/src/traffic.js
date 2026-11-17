// Traffic cars and pedestrians: the city feeling alive.
// One job: move everyone who is not the player or the police.

import { clamp, distance, angleDifference, angleTo, pickFrom } from './config.js';
import { nearestRoadPoint, randomIntersection } from './world.js';
import { makeCar, driveCar } from './vehicles.js';

const PED_SHIRTS = ['#d95f4b', '#4b7fd9', '#e8c84b', '#7ad94b', '#c94bd9', '#e8e4da', '#4bd9c9', '#d98a4b'];
const PED_SKINS = ['#e8b88a', '#c98a5a', '#8a5a3a', '#f0c8a0'];
const FIRST_NAMES = ['Mara', 'Tito', 'Lena', 'Rico', 'Ana', 'Jo', 'Paz', 'Nico', 'Sofia', 'Ben', 'Rosa', 'Kai'];

export function createPeds(state) {
  const peds = { list: [] };
  peds.spawn = (x, y, kind) => {
    const ped = {
      kind: kind || 'walker',
      name: pickFrom(state.rng, FIRST_NAMES),
      x, y,
      angle: state.rng() * Math.PI * 2,
      speed: 40 + state.rng() * 45,
      hp: kind === 'thug' ? 60 : 30,
      maxHp: kind === 'thug' ? 60 : 30,
      shirt: pickFrom(state.rng, PED_SHIRTS),
      skin: pickFrom(state.rng, PED_SKINS),
      radius: 11,
      target: null,
      fleeTimer: 0,
      hurtTimer: 0,
      carries: kind === 'thug' ? 120 : 20 + Math.floor(state.rng() * 60),
      walkPhase: state.rng() * 6,
    };
    peds.list.push(ped);
    return ped;
  };
  peds.spawnFleeingPed = (x, y) => {
    const ped = peds.spawn(x, y, 'walker');
    ped.fleeTimer = 6;
    return ped;
  };
  peds.removePed = (st, ped) => {
    const i = peds.list.indexOf(ped);
    if (i >= 0) peds.list.splice(i, 1);
  };
  peds.populate = (count) => {
    for (let i = 0; i < count; i++) {
      const s = state.world.pedSpawns[i % state.world.pedSpawns.length];
      peds.spawn(s.x + (state.rng() - 0.5) * 120, s.y + (state.rng() - 0.5) * 120, 'walker');
    }
  };
  peds.update = (dt) => {
    const player = state.player;
    for (const ped of peds.list) {
      ped.hurtTimer = Math.max(0, ped.hurtTimer - dt);
      ped.walkPhase += dt * 6;
      const dPlayer = distance(ped.x, ped.y, player.x, player.y);
      // Flee from a speeding player car or a nearby fight.
      const playerCar = player.car;
      const threat = playerCar && Math.abs(playerCar.speed) > 120 && distance(ped.x, ped.y, playerCar.x, playerCar.y) < 160;
      if (threat || (ped.fleeTimer > 0 && dPlayer < 200)) {
        ped.fleeTimer = Math.max(ped.fleeTimer, 0.6);
        const away = angleTo(player.x, player.y, ped.x, ped.y);
        ped.angle = away;
        ped.x += Math.cos(away) * 150 * dt;
        ped.y += Math.sin(away) * 150 * dt;
      } else if (ped.kind === 'thug' && dPlayer < 260) {
        // Thugs close in and swing at the player, one hit per cooldown.
        ped.angle = angleTo(ped.x, ped.y, player.x, player.y);
        ped.x += Math.cos(ped.angle) * 120 * dt;
        ped.y += Math.sin(ped.angle) * 120 * dt;
        ped.attackTimer = Math.max(0, (ped.attackTimer || 0) - dt);
        if (dPlayer < 34 && ped.attackTimer <= 0) {
          ped.attackTimer = 0.9;
          state.playerHurt(8, 'thug');
        }
      } else {
        ped.fleeTimer = Math.max(0, ped.fleeTimer - dt);
        if (!ped.target || distance(ped.x, ped.y, ped.target.x, ped.target.y) < 24) {
          const spot = randomIntersection(state.rng);
          ped.target = { x: spot.x + (state.rng() - 0.5) * 200, y: spot.y + (state.rng() - 0.5) * 200 };
        }
        const a = angleTo(ped.x, ped.y, ped.target.x, ped.target.y);
        ped.angle += angleDifference(ped.angle, a) * Math.min(1, dt * 4);
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
      }
      ped.x = clamp(ped.x, 20, 3180);
      ped.y = clamp(ped.y, 20, 2380);
    }
    // Keep the streets populated near the player.
    if (peds.list.length < 26) {
      const a = state.rng() * Math.PI * 2;
      const r = 500 + state.rng() * 300;
      peds.spawn(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, 'walker');
    }
  };
  return peds;
}

export function createTraffic(state) {
  const traffic = { cars: [] };
  traffic.spawn = (x, y, angle) => {
    const types = ['sedan', 'taxi', 'van', 'pickup', 'sedan', 'coupe'];
    const car = makeCar(pickFrom(state.rng, types), x, y, angle, 'traffic');
    car.target = randomIntersection(state.rng);
    car.cruise = 130 + state.rng() * 90;
    traffic.cars.push(car);
    state.cars.push(car);
    return car;
  };
  traffic.populate = (count) => {
    for (let i = 0; i < count; i++) {
      const spot = randomIntersection(state.rng);
      traffic.spawn(spot.x + (state.rng() - 0.5) * 120, spot.y + (state.rng() - 0.5) * 120, state.rng() * Math.PI * 2);
    }
  };
  traffic.update = (dt) => {
    const player = state.player;
    for (const car of traffic.cars) {
      if (car.driver === 'wreck') continue;
      if (!car.target || distance(car.x, car.y, car.target.x, car.target.y) < 60) {
        car.target = randomIntersection(state.rng);
      }
      // Steer toward the next intersection, slow down for the player in the way.
      const want = angleTo(car.x, car.y, car.target.x, car.target.y);
      const diff = angleDifference(car.angle, want);
      const steer = clamp(diff * 2.2, -1, 1);
      let throttle = 0.7;
      const dPlayer = distance(car.x, car.y, player.x, player.y);
      if (dPlayer < 90 && Math.abs(car.speed) > 40) throttle = -0.6;
      // Don't rear-end the car ahead.
      for (const other of state.cars) {
        if (other === car || other.driver === 'parked') continue;
        const d = distance(car.x, car.y, other.x, other.y);
        if (d < 70 && Math.abs(angleDifference(car.angle, angleTo(car.x, car.y, other.x, other.y))) < 0.6) {
          throttle = -0.8;
          break;
        }
      }
      driveCar(car, throttle, steer, false, dt, state.world);
      // Gentle collision with other cars: bounce apart instead of stacking.
      for (const other of state.cars) {
        if (other === car) continue;
        const d = distance(car.x, car.y, other.x, other.y);
        if (d > 0 && d < 44) {
          const push = (44 - d) / 2;
          const a = angleTo(other.x, other.y, car.x, car.y);
          car.x += Math.cos(a) * push;
          car.y += Math.sin(a) * push;
          if (Math.abs(car.speed) > 200) {
            car.hp -= 4;
            if (car.hp <= 0) car.driver = 'wreck';
          }
        }
      }
    }
    // Despawn far-away traffic, respawn near the player so the roads stay busy.
    for (let i = traffic.cars.length - 1; i >= 0; i--) {
      const car = traffic.cars[i];
      if (distance(car.x, car.y, player.x, player.y) > 1400) {
        traffic.cars.splice(i, 1);
        const idx = state.cars.indexOf(car);
        if (idx >= 0) state.cars.splice(idx, 1);
        traffic.spawn(player.x + (state.rng() - 0.5) * 1100, player.y + (state.rng() - 0.5) * 1100, state.rng() * Math.PI * 2);
      }
    }
  };
  return traffic;
}
