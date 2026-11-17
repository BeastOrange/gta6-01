// The law: wanted stars, police cars that chase, officers who arrest.
// One job: make crime have consequences and make losing them feel earned.

import { WANTED, clamp, distance, angleDifference, angleTo } from './config.js';
import { randomIntersection } from './world.js';
import { makeCar, driveCar } from './vehicles.js';

export function createPolice(state) {
  const police = {
    stars: 0,
    heat: 0,
    decayTimer: 0,
    cars: [],
    officers: [],
    sirenTimer: 0,
  };

  police.addWanted = (st, amount) => {
    if (amount <= 0) return;
    const before = police.stars;
    police.heat = Math.min(5, police.heat + amount);
    police.stars = Math.floor(police.heat);
    police.decayTimer = WANTED.decayDelay;
    if (police.stars > before) {
      state.hud.pushMessage(police.stars >= 3 ? 'The whole SBPD is after you!' : 'The police are on to you!');
      state.audio.sfx('siren');
    }
  };

  police.clearWanted = () => {
    police.stars = 0;
    police.heat = 0;
    police.cars.forEach((c) => { c.driver = 'parked'; });
    police.cars = [];
    police.officers = [];
  };

  police.spawnCar = () => {
    const player = state.player;
    const a = state.rng() * Math.PI * 2;
    const car = makeCar('police', player.x + Math.cos(a) * 620, player.y + Math.sin(a) * 620, a, 'police');
    car.color = '#22303e';
    police.cars.push(car);
    state.cars.push(car);
    return car;
  };

  police.spawnOfficer = (x, y) => {
    const officer = {
      kind: 'officer',
      name: 'Officer',
      x, y,
      angle: 0,
      speed: 0,
      hp: 50,
      maxHp: 50,
      shirt: '#22303e',
      skin: '#e8b88a',
      radius: 12,
      hurtTimer: 0,
      walkPhase: 0,
      carries: 0,
    };
    police.officers.push(officer);
    return officer;
  };

  police.update = (dt) => {
    const player = state.player;
    // Wanted heat cools off when the player stays out of trouble and out of sight.
    if (police.stars > 0) {
      police.decayTimer -= dt;
      if (police.decayTimer <= 0) {
        police.heat = Math.max(0, police.heat - WANTED.decayPerSecond * dt);
        const next = Math.floor(police.heat);
        if (next < police.stars) {
          police.stars = next;
          if (next === 0) {
            state.hud.pushMessage('You lost them. Stay clean.');
            police.cars.forEach((c) => { c.driver = 'parked'; });
            police.cars = [];
            police.officers = [];
          }
        }
      }
    }

    // Keep the right number of units on the street.
    const wantCars = police.stars > 0 ? WANTED.policeCars[police.stars] : 0;
    while (police.cars.length < wantCars) police.spawnCar();
    if (police.cars.length > wantCars) {
      const extra = police.cars.pop();
      const idx = state.cars.indexOf(extra);
      if (idx >= 0) state.cars.splice(idx, 1);
    }
    const wantFoot = police.stars > 0 ? WANTED.policeFoot[police.stars] : 0;
    while (police.officers.length < wantFoot) {
      const a = state.rng() * Math.PI * 2;
      police.spawnOfficer(player.x + Math.cos(a) * 340, player.y + Math.sin(a) * 340);
    }

    // Siren wail every few seconds while hunted.
    police.sirenTimer -= dt;
    if (police.stars > 0 && police.sirenTimer <= 0) {
      police.sirenTimer = 2.4;
      state.audio.sfx('siren');
    }

    // Police cars ram the player's car or chase on foot.
    for (const car of police.cars) {
      if (car.driver === 'wreck') continue;
      const want = angleTo(car.x, car.y, player.x, player.y);
      const diff = angleDifference(car.angle, want);
      const steer = clamp(diff * 2.4, -1, 1);
      const d = distance(car.x, car.y, player.x, player.y);
      const throttle = d > 60 ? 1 : 0.4;
      const crashed = driveCar(car, throttle, steer, false, dt, state.world);
      if (crashed) state.audio.sfx('crash');
      // Ramming the player: an impact costs the player's car some health,
      // then the unit bounces off instead of grinding against it.
      car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
      if (player.car && d < 48 && car.ramCooldown <= 0 && car.speed > 150) {
        car.ramCooldown = 0.9;
        car.speed *= 0.55;
        player.car.hp -= 7;
        state.camera.shake = Math.max(state.camera.shake, 5);
        state.audio.sfx('crash');
        state.effects.addHitSpark(state, player.car.x, player.car.y);
        if (player.car.hp <= 0) {
          state.vehicles.damageCar(state, player.car, 1, 'police');
        }
      }
      // A police car that catches the player on foot grabs them — but the
      // player gets a moment to sprint away first.
      if (player.onFoot && d < 30) {
        player.bustedMeter += dt * 1.6;
        if (player.bustedMeter >= 1) police.arrestPlayer();
      }
    }

    // Officers sprint at the player on foot and grab them.
    for (const officer of police.officers) {
      officer.hurtTimer = Math.max(0, officer.hurtTimer - dt);
      const d = distance(officer.x, officer.y, player.x, player.y);
      const a = angleTo(officer.x, officer.y, player.x, player.y);
      officer.angle = a;
      const speed = player.onFoot ? 212 : 150;
      officer.x += Math.cos(a) * speed * dt;
      officer.y += Math.sin(a) * speed * dt;
      officer.x = clamp(officer.x, 20, 3180);
      officer.y = clamp(officer.y, 20, 2380);
      if (player.onFoot && d < 26) {
        player.bustedMeter += dt * 0.8;
        state.hud.pushMessage('An officer is grabbing you! Mash W to break free!');
        if (state.input.isDown('KeyW') || state.input.isDown('ArrowUp')) player.bustedMeter -= dt * 2.4;
        player.bustedMeter = clamp(player.bustedMeter, 0, 1);
        if (player.bustedMeter >= 1) police.arrestPlayer();
      } else {
        player.bustedMeter = Math.max(0, player.bustedMeter - dt * 0.5);
      }
      // An officer next to a nearly stopped player car pulls them out — given a moment.
      if (!player.onFoot && player.car && d < 34 && Math.abs(player.car.speed) < 15) {
        player.bustedMeter += dt * 0.9;
        if (player.bustedMeter >= 1) police.arrestPlayer();
      }
    }
    void randomIntersection;
  };

  police.arrestPlayer = () => {
    if (state.mode !== 'playing') return;
    state.mode = 'busted';
    state.audio.sfx('busted');
    state.audio.stopMusic();
    state.audio.setEngine(0);
    const fine = Math.min(200, Math.floor(state.player.cash * 0.25));
    state.player.cash -= fine;
    state.stats.timesBusted++;
    police.clearWanted();
    state.save.saveGame(state);
  };

  return police;
}
