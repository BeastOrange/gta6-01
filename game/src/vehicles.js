// Cars: spawning, arcade driving physics, entering and exiting, damage.
// One job: everything about a vehicle that is not traffic AI or police AI.

import { CAR_TYPES, clamp, angleDifference, distance } from './config.js';
import { resolveBuildingCollision, isOnRoad } from './world.js';

let nextCarId = 1;

export function makeCar(typeId, x, y, angle, driver) {
  const type = CAR_TYPES.find((t) => t.id === typeId) || CAR_TYPES[0];
  return {
    id: nextCarId++,
    typeId: type.id,
    name: type.name,
    color: type.color,
    maxSpeed: type.maxSpeed,
    accel: type.accel,
    grip: type.grip,
    price: type.price,
    x, y, angle,
    speed: 0,
    steer: 0,
    hp: type.hp,
    maxHp: type.hp,
    driver: driver || 'parked',
    radius: 20,
    length: 46,
    width: 22,
    crashed: 0,
    honkCooldown: 0,
    target: null,
    stuckTimer: 0,
  };
}

export function spawnParkedCars(world, rng, count) {
  const cars = [];
  const spots = world.carSpawns.slice();
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  const types = ['sedan', 'sedan', 'coupe', 'van', 'pickup', 'taxi', 'sedan', 'sport'];
  for (let i = 0; i < Math.min(count, spots.length); i++) {
    const s = spots[i];
    cars.push(makeCar(types[Math.floor(rng() * types.length)], s.x, s.y, s.angle, 'parked'));
  }
  return cars;
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = distance(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Arcade handling: speed along the nose, steering that bites harder at low
// speed, a little drift when the handbrake is held. Returns distance moved.
export function driveCar(car, throttle, steerInput, handbrake, dt, world) {
  const speed01 = Math.abs(car.speed) / car.maxSpeed;
  const targetSteer = steerInput * (0.55 + 0.45 * (1 - speed01));
  car.steer += (targetSteer - car.steer) * Math.min(1, dt * 8);
  const turnRate = car.steer * car.grip * (0.35 + 0.65 * (1 - speed01 * 0.7));
  car.angle += turnRate * dt * Math.sign(car.speed || 1) * (car.speed < -5 ? -1 : 1);
  if (throttle > 0) car.speed += car.accel * throttle * dt;
  else if (throttle < 0) car.speed += car.accel * 0.7 * throttle * dt;
  else car.speed -= car.speed * 0.9 * dt;
  if (handbrake) {
    car.speed -= car.speed * 2.2 * dt;
    car.angle += car.steer * 1.6 * dt * Math.sign(car.speed || 1);
  }
  // Drag and the road's grip: off-road is slower and looser.
  const offRoad = !isOnRoad(world, car.x, car.y);
  car.speed -= car.speed * (offRoad ? 0.55 : 0.18) * dt;
  car.speed = clamp(car.speed, -car.maxSpeed * 0.45, car.maxSpeed * (offRoad ? 0.75 : 1));
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const probe = { x: nx, y: ny, radius: car.radius };
  const hit = resolveBuildingCollision(world, probe);
  if (hit) {
    if (Math.abs(car.speed) > 180) car.hp -= Math.abs(car.speed) * 0.05;
    car.speed *= -0.25;
    car.x = probe.x;
    car.y = probe.y;
    return true;
  }
  car.x = nx;
  car.y = ny;
  car.x = clamp(car.x, 30, 3170);
  car.y = clamp(car.y, 30, 2370);
  return false;
}

export function enterCar(state, car) {
  const player = state.player;
  if (car.driver === 'traffic' || car.driver === 'police') {
    // Yanking a driver out is a crime: the city notices.
    car.driver = 'player';
    state.stats.carsStolen++;
    state.audio.sfx('door');
    state.police.addWanted(state, 1);
    state.hud.pushMessage(`Stole a ${car.name}! The driver ran off shouting.`);
    state.peds.spawnFleeingPed(state, car.x + 30, car.y + 30);
  } else {
    car.driver = 'player';
    state.stats.carsStolen++;
    state.audio.sfx('door');
    if (car.driverWasParked) state.hud.pushMessage(`Took the ${car.name}.`);
  }
  player.car = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
}

export function exitCar(state) {
  const player = state.player;
  const car = player.car;
  if (!car) return;
  car.driver = 'parked';
  car.driverWasParked = true;
  car.speed *= 0.2;
  const sideX = car.x - Math.sin(car.angle) * 34;
  const sideY = car.y + Math.cos(car.angle) * 34;
  player.car = null;
  player.onFoot = true;
  player.x = sideX;
  player.y = sideY;
  player.angle = car.angle;
  state.audio.sfx('door');
}

export function damageCar(state, car, amount, cause) {
  car.hp -= amount;
  car.crashed = 0.4;
  if (car.hp <= 0 && car.driver !== 'player') {
    car.driver = 'wreck';
    car.speed = 0;
    state.effects.addExplosion(state, car.x, car.y);
    state.audio.sfx('crash');
    if (cause === 'player') state.police.addWanted(state, 1);
  } else if (car.hp <= 0 && car.driver === 'player') {
    state.effects.addExplosion(state, car.x, car.y);
    state.audio.sfx('crash');
    state.hud.pushMessage('Your ride is wrecked! Get out and run!');
    exitCar(state);
  }
}

export function carNose(car) {
  return { x: car.x + Math.cos(car.angle) * 26, y: car.y + Math.sin(car.angle) * 26 };
}
