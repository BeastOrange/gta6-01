// Solmar Bay — entry point: build the state, run the loop, own the camera.
// One job: wire the modules together and keep the frame moving.

import { WORLD_W, WORLD_H, mulberry32, clamp } from './config.js';
import { buildWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, updatePlayerOnFoot, updatePlayerInCar, hurtPlayer } from './player.js';
import * as vehicles from './vehicles.js';
import { spawnParkedCars } from './vehicles.js';
import { createPeds, createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createGarage } from './garage.js';
import { createEffects } from './effects.js';
import { createHud } from './hud.js';
import { drawGame } from './render.js';
import { saveGame, loadGame } from './save.js';

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 7);
const SHOT = params.get('shot') || '';

// Keep a small console-error log on the window for headless play-testing.
window.__errors = [];
window.addEventListener('error', (event) => {
  window.__errors.push(String(event.message || event.error || 'unknown error'));
});

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function buildState() {
  const rng = mulberry32(SEED);
  const world = buildWorld(SEED);
  const state = {
    time: 0,
    mode: 'title',
    rng,
    world,
    input: createInput(),
    audio: createAudio(),
    camera: { x: 0, y: 0, shake: 0 },
    view: { w: canvas.width, h: canvas.height },
    player: createPlayer(1200, 1000),
    cars: [],
    pickups: [],
    stats: { bestCash: 250, missionsCompleted: 0, carsStolen: 0, timesBusted: 0 },
    lastDistrict: '',
    districtTimer: 0,
    saveData: loadGame(),
    autosaveTimer: 0,
  };
  state.cars = spawnParkedCars(world, rng, 16);
  state.effects = createEffects(state);
  state.peds = createPeds(state);
  state.traffic = createTraffic(state);
  state.police = createPolice(state);
  state.mission = createMissions(state);
  state.garage = createGarage(state);
  state.hud = createHud(state);
  state.vehicles = vehicles;
  state.save = { saveGame };
  state.playerHurt = (amount, source) => hurtPlayer(state, amount, source);

  // Restore a saved story, if one exists.
  const save = state.saveData;
  if (save) {
    state.player.cash = save.cash || 250;
    state.player.hp = save.playerHp || 100;
    state.stats.bestCash = save.bestCash || state.player.cash;
    state.stats.missionsCompleted = save.missionsCompleted || 0;
    state.stats.carsStolen = save.carsStolen || 0;
    state.mission.applySave(save);
    state.garage.applySave(save);
  }

  state.peds.populate(30);
  state.traffic.populate(10);
  state.pickups = [];
  return state;
}

let state = buildState();

function startGame() {
  if (state.mode === 'title') {
    state.mode = 'playing';
    state.audio.ensure();
    state.audio.startMusic();
    state.audio.sfx('mission');
    state.hud.pushMessage('Welcome to Solmar Bay. Press M to start your first job.');
    state.hud.pushMessage('Steal a car with E — just watch for the SBPD.');
  }
}

function respawn() {
  const keepCash = state.player.cash;
  const keepMission = state.mission.index;
  const keepDone = state.mission.done.slice();
  const keepStats = { ...state.stats };
  const fresh = buildState();
  fresh.player.cash = keepCash;
  fresh.stats = keepStats;
  fresh.mission.index = keepMission;
  fresh.mission.done = keepDone;
  fresh.mission.completedAll = keepMission >= 4;
  fresh.mode = 'playing';
  fresh.player.x = 1200;
  fresh.player.y = 1000;
  state = fresh;
  state.audio.ensure();
  state.audio.startMusic();
  state.hud.pushMessage('Back on the streets. Stay sharp.');
  window.__solmar = state;
}

// --- Staged scenes for screenshots: the same game, set up in a fixed state ---
function applyShot(name) {
  if (!name) return;
  state.mode = 'playing';
  state.audio.muted = true;
  if (name === 'start') { state.mode = 'title'; return; }
  if (name === 'end') { state.mode = 'busted'; return; }
  if (name === 'chase') {
    const car = vehicles.makeCar('coupe', 1560, 1180, 0, 'player');
    state.cars.push(car);
    state.player.car = car;
    state.player.onFoot = false;
    state.player.x = car.x;
    state.player.y = car.y;
    car.speed = 320;
    // Keep the throttle down until the player takes the wheel.
    state.autoDrive = true;
    state.mission.index = 2;
    state.mission.start();
    state.police.addWanted(state, 1); // mission start adds 2; top up to 3 stars
    state.mission.timer = 78;
    // Two interceptors close behind, already in frame, so the chase reads.
    const chase1 = state.police.spawnCar();
    chase1.x = car.x - 380;
    chase1.y = car.y - 130;
    chase1.angle = 0;
    chase1.speed = 380;
    const chase2 = state.police.spawnCar();
    chase2.x = car.x - 420;
    chase2.y = car.y + 150;
    chase2.angle = 0;
    chase2.speed = 360;
    state.hud.showDialogue('MARA: It went loud, kid. SBPD is all over Downtown. Get to the hideout!');
    state.player.cash = 2450;
    for (let i = 0; i < 4; i++) state.traffic.spawn(1400 + i * 120, 1180 + (i % 2) * 60, 0);
    return;
  }
  if (name === 'drive') {
    const car = vehicles.makeCar('sedan', 1000, 1200, 0, 'player');
    state.cars.push(car);
    state.player.car = car;
    state.player.onFoot = false;
    state.player.x = car.x;
    state.player.y = car.y;
    car.speed = 300;
    state.autoDrive = true;
    state.mission.index = 0;
    state.mission.start();
    state.player.cash = 1250;
    for (let i = 0; i < 5; i++) state.traffic.spawn(800 + i * 160, 1200 + (i % 2) * 50, 0);
    state.peds.populate(6);
    return;
  }
  if (name === 'mission') {
    state.player.x = 1780;
    state.player.y = 1000;
    state.player.angle = Math.PI / 2;
    state.mission.index = 0;
    state.mission.start();
    state.hud.showDialogue('MARA: Pick up my package at the Marina. No peeking. $400 if you do it clean.');
    state.peds.spawn(1740, 960, 'walker');
    state.peds.spawn(1820, 1040, 'walker');
    state.peds.spawn(1700, 1080, 'walker');
    return;
  }
  if (name === 'foot') {
    state.player.x = 1980;
    state.player.y = 1180;
    state.player.angle = -Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      state.peds.spawn(1900 + (i % 4) * 70, 1100 + Math.floor(i / 4) * 90, 'walker');
    }
    state.player.cash = 860;
    return;
  }
}

applyShot(SHOT);
// Start the camera on the player, not at the corner of the map.
state.camera.x = clamp(state.player.x - state.view.w / 2, 0, Math.max(0, WORLD_W - state.view.w));
state.camera.y = clamp(state.player.y - state.view.h / 2, 0, Math.max(0, WORLD_H - state.view.h));
window.__solmar = state;
window.__solmarReady = true;

// Debug readout for headless play-testing: ?debug=1 writes live state into
// the document title so --dump-dom can show it without a live browser.
if (params.get('debug')) {
  setInterval(() => {
    const car = state.player.car;
    document.title = `px=${Math.round(state.player.x)} py=${Math.round(state.player.y)} `
      + `cam=${Math.round(state.camera.x)},${Math.round(state.camera.y)} `
      + `speed=${Math.round(car ? car.speed : 0)} angle=${(state.player.angle || 0).toFixed(2)} `
      + `mode=${state.mode} onFoot=${state.player.onFoot} stars=${state.police.stars} `
      + `cars=${state.cars.length} peds=${state.peds.list.length} mission=${state.mission.index}/${state.mission.active}`;
  }, 200);
}

function update(dt) {
  state.time += dt;
  state.camera.shake = Math.max(0, state.camera.shake - dt * 26);
  state.districtTimer = Math.max(0, state.districtTimer - dt);
  state.effects.update(dt);
  state.hud.update(dt);

  if (state.mode === 'title') {
    // Slow pan over Downtown behind the title screen.
    state.camera.x = 1000 + Math.sin(state.time * 0.05) * 300 - state.view.w / 2;
    state.camera.y = 1000 - state.view.h / 2;
    state.traffic.update(dt);
    state.peds.update(dt);
    return;
  }
  if (state.mode !== 'playing') return;

  // A staged autopilot ends the moment the player touches a control.
  if (state.autoDrive && (state.input.anyKey || state.input.mouseDown)) {
    state.autoDrive = false;
  }

  // Global keys.
  if (state.input.wasPressed('KeyP') || state.input.wasPressed('Escape')) {
    if (!state.garage.shopOpen) {
      state.mode = 'paused';
      state.audio.sfx('click');
    }
  }
  if (state.input.wasPressed('KeyM')) {
    if (state.mission.active) state.hud.pushMessage('Job already running: ' + state.mission.objectiveText());
    else state.mission.start();
  }
  if (state.input.wasPressed('KeyN')) {
    const muted = state.audio.toggleMute();
    state.hud.pushMessage(muted ? 'Sound off.' : 'Sound on.');
  }

  if (state.player.onFoot) updatePlayerOnFoot(state, dt);
  else updatePlayerInCar(state, dt);

  state.garage.update(dt);
  state.traffic.update(dt);
  state.peds.update(dt);
  state.police.update(dt);
  state.mission.update(dt);

  // Camera: smooth follow, clamped to the city. Snap when far away (spawn,
  // respawn, or a staged scene) so the player is never off-screen.
  const px = state.player.x - state.view.w / 2;
  const py = state.player.y - state.view.h / 2;
  const gapX = px - state.camera.x;
  const gapY = py - state.camera.y;
  if (Math.abs(gapX) > 700 || Math.abs(gapY) > 500) {
    state.camera.x = px;
    state.camera.y = py;
  } else {
    const k = Math.min(1, dt * 6);
    state.camera.x += gapX * k;
    state.camera.y += gapY * k;
  }
  state.camera.x = clamp(state.camera.x, 0, Math.max(0, WORLD_W - state.view.w));
  state.camera.y = clamp(state.camera.y, 0, Math.max(0, WORLD_H - state.view.h));

  // Autosave while playing.
  state.autosaveTimer += dt;
  if (state.autosaveTimer > 25) {
    state.autosaveTimer = 0;
    saveGame(state);
  }

  // Passive health recovery when calm and out of trouble.
  if (state.police.stars === 0 && state.player.hp > 0 && state.player.hp < state.player.maxHp) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1.5 * dt);
  }

  // Status line for screen readers.
  statusEl.textContent = `Solmar Bay. Cash $${Math.floor(state.player.cash)}. Health ${Math.ceil(state.player.hp)}. Wanted ${state.police.stars} stars. ${state.mission.objectiveText()}`;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000 || 0.016);
  frame.last = now;
  state.view.w = canvas.width;
  state.view.h = canvas.height;

  if (state.mode === 'title' && (state.input.wasPressed('Enter') || state.input.mouseDown)) {
    startGame();
  } else if ((state.mode === 'busted' || state.mode === 'wasted') && state.input.wasPressed('KeyR')) {
    respawn();
  } else if (state.mode === 'paused' && (state.input.wasPressed('KeyP') || state.input.wasPressed('Escape'))) {
    state.mode = 'playing';
  } else if (state.mode === 'paused' && state.input.wasPressed('KeyR')) {
    respawn();
  }

  update(dt);
  drawGame(ctx, state);
  state.hud.draw(ctx);
  state.input.endFrame();
}

requestAnimationFrame(frame);
