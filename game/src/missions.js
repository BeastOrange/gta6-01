// Story missions: four jobs from Mara Voss that teach the whole game.
// One job: track objectives, dialogue, rewards and unlocking.

import { distance } from './config.js';
import { makeCar } from './vehicles.js';

export const GARAGE_POS = { x: 1200, y: 1200 };

const MISSION_DEFS = [
  {
    id: 'errand',
    title: 'First Errand',
    giver: 'Mara Voss',
    brief: 'Mara needs a package picked up at the Marina and dropped at the Café Quarter. Easy money. Probably.',
    reward: 400,
    steps: [
      { type: 'goto', label: 'Pick up the package at the Marina', x: 420, y: 420, r: 70 },
      { type: 'goto', label: 'Deliver the package to the Café Quarter', x: 1980, y: 1180, r: 70 },
    ],
    dialogue: [
      'MARA: You look new, kid. Solmar Bay eats the new ones.',
      'MARA: Pick up my package at the Marina. No peeking. Deliver it to the café on Palm Row.',
      'MARA: Do it clean and there is $400 in it for you. Do it loud and the SBPD will know your name.',
    ],
  },
  {
    id: 'hotwheels',
    title: 'Hot Wheels',
    giver: 'Mara Voss',
    brief: 'A Falco GT is parked outside the Coral Arms. "Borrow" it and bring it to Tito\'s garage.',
    reward: 800,
    steps: [
      { type: 'steal', label: 'Steal the white Falco GT at the Coral Arms', x: 1620, y: 620, r: 90 },
      { type: 'deliverCar', label: 'Bring the Falco to Tito\'s garage', x: GARAGE_POS.x, y: GARAGE_POS.y, r: 110 },
    ],
    dialogue: [
      'MARA: A rich tourist left his Falco GT outside the Coral Arms. Shame to let it sit there.',
      'MARA: Take it to Tito\'s garage. He will pay $800, no questions, no paperwork.',
      'MARA: The owner might notice. The cops might notice. Drive like you mean it.',
    ],
  },
  {
    id: 'getaway',
    title: 'The Getaway',
    giver: 'Mara Voss',
    brief: 'The job went loud. Two stars and counting. Lose the heat and reach the South Beach hideout.',
    reward: 1000,
    steps: [
      { type: 'getaway', label: 'Reach the South Beach hideout — lose the cops on the way', x: 500, y: 2150, r: 110, timer: 100 },
    ],
    dialogue: [
      'MARA: It went loud, kid. SBPD is all over Downtown.',
      'MARA: Get to the hideout on South Beach. Fast car, quiet streets, and do NOT stop for anyone in blue.',
      'MARA: Make it there and the $1,000 is yours. Get caught and I never met you.',
    ],
  },
  {
    id: 'dockside',
    title: 'Dockside Trouble',
    giver: 'Mara Voss',
    brief: 'The Dock Rats jumped Mara\'s courier. Clear the docks and take back the stash.',
    reward: 1500,
    steps: [
      { type: 'defeat', label: 'Deal with the Dock Rats at the docks (3 thugs)', x: 2950, y: 420, r: 160, count: 3 },
      { type: 'goto', label: 'Grab the stolen stash', x: 2980, y: 560, r: 70 },
    ],
    dialogue: [
      'MARA: The Dock Rats took my courier and my money. That is not a thing I forgive.',
      'MARA: Go to the docks. Fists, feet, whatever you have. Three of them, and they are not friendly.',
      'MARA: Bring my stash back and there is $1,500 in it. Solmar will know your name after this one.',
    ],
  },
];

export function createMissions(state) {
  const mission = {
    index: 0,
    done: [false, false, false, false],
    step: 0,
    active: false,
    timer: 0,
    defeated: 0,
    targetCar: null,
    dialogue: [],
    dialogueTimer: 0,
    completedAll: false,
  };

  mission.current = () => MISSION_DEFS[mission.index] || null;

  mission.objectiveText = () => {
    const def = mission.current();
    if (!def) return 'Free roam — Solmar Bay is yours.';
    if (!mission.active) return `Next job: ${def.title} — press M to start`;
    return def.steps[mission.step].label;
  };

  mission.start = () => {
    const def = mission.current();
    if (!def || mission.active) return;
    mission.active = true;
    mission.step = 0;
    mission.defeated = 0;
    mission.timer = 0;
    mission.dialogue = def.dialogue.slice();
    mission.dialogueTimer = 0;
    state.audio.sfx('mission');
    state.hud.pushMessage(`New job: ${def.title} — ${def.brief}`);
    if (def.id === 'hotwheels') {
      const car = makeCar('sport', 1620, 620, 0, 'parked');
      car.color = '#e8e4da';
      mission.targetCar = car;
      state.cars.push(car);
      state.hud.pushMessage('The white Falco GT is marked on your map.');
    }
    if (def.id === 'getaway') {
      state.police.addWanted(state, 2);
      mission.timer = def.steps[0].timer;
    }
    if (def.id === 'dockside') {
      for (let i = 0; i < 3; i++) {
        state.peds.spawn(2880 + i * 60, 380 + i * 40, 'thug');
      }
      state.hud.pushMessage('Three Dock Rats are waiting at the docks.');
    }
  };

  mission.complete = () => {
    const def = mission.current();
    if (!def) return;
    state.player.cash += def.reward;
    state.stats.bestCash = Math.max(state.stats.bestCash, state.player.cash);
    state.stats.missionsCompleted++;
    mission.done[mission.index] = true;
    mission.active = false;
    mission.index++;
    mission.step = 0;
    state.audio.sfx('cash');
    state.hud.pushMessage(`Job complete! +$${def.reward}`);
    state.effects.addConfetti(state, state.player.x, state.player.y);
    if (mission.index >= MISSION_DEFS.length) {
      mission.completedAll = true;
      state.hud.pushMessage('All jobs done — you run Solmar Bay now. Free roam!');
    } else {
      state.hud.pushMessage(`Next job available: ${MISSION_DEFS[mission.index].title}. Press M.`);
    }
    state.save.saveGame(state);
  };

  mission.advance = () => {
    const def = mission.current();
    mission.step++;
    if (mission.step >= def.steps.length) mission.complete();
    else state.hud.pushMessage(def.steps[mission.step].label);
  };

  mission.onThugDown = (st, thug) => {
    if (!mission.active) return;
    const def = mission.current();
    if (!def || def.id !== 'dockside') return;
    mission.defeated++;
    state.hud.pushMessage(`Thugs down: ${mission.defeated}/3`);
    if (mission.defeated >= 3 && mission.step === 0) mission.advance();
  };

  mission.update = (dt) => {
    // Advance dialogue lines one at a time.
    if (mission.dialogue.length > 0) {
      mission.dialogueTimer -= dt;
      if (mission.dialogueTimer <= 0) {
        state.hud.showDialogue(mission.dialogue[0]);
        mission.dialogue.shift();
        mission.dialogueTimer = 4.5;
      }
    }
    if (!mission.active) return;
    const def = mission.current();
    const step = def.steps[mission.step];
    const player = state.player;

    if (step.type === 'getaway') {
      mission.timer -= dt;
      if (mission.timer <= 0) {
        state.hud.pushMessage('Too slow — the hideout went cold. The job is still open; press M to retry.');
        mission.active = false;
        mission.step = 0;
        state.police.clearWanted();
        return;
      }
      if (distance(player.x, player.y, step.x, step.y) < step.r) mission.complete();
      return;
    }
    if (step.type === 'steal') {
      const car = mission.targetCar;
      if (car && player.car === car) {
        state.hud.pushMessage('You have the Falco! Get it to Tito\'s garage!');
        mission.advance();
      }
      return;
    }
    if (step.type === 'deliverCar') {
      if (player.car === mission.targetCar && distance(player.x, player.y, step.x, step.y) < step.r) {
        const idx = state.cars.indexOf(mission.targetCar);
        if (idx >= 0) state.cars.splice(idx, 1);
        mission.targetCar = null;
        player.car = null;
        player.onFoot = true;
        player.x = GARAGE_POS.x + 40;
        player.y = GARAGE_POS.y + 40;
        mission.complete();
      }
      return;
    }
    if (step.type === 'defeat') {
      // Completion happens in onThugDown; the marker just guides the player.
      return;
    }
    // Plain 'goto' steps.
    if (distance(player.x, player.y, step.x, step.y) < step.r) {
      state.audio.sfx('pickup');
      mission.advance();
    }
  };

  mission.marker = () => {
    if (!mission.active) return null;
    const def = mission.current();
    const step = def.steps[mission.step];
    return { x: step.x, y: step.y, r: step.r, label: step.label, color: '#ffd23e' };
  };

  mission.applySave = (save) => {
    if (!save) return;
    mission.index = Math.min(save.missionIndex || 0, MISSION_DEFS.length);
    if (Array.isArray(save.missionsDone)) {
      save.missionsDone.forEach((done, i) => { if (i < mission.done.length) mission.done[i] = !!done; });
    }
    mission.completedAll = mission.index >= MISSION_DEFS.length;
  };

  return mission;
}
