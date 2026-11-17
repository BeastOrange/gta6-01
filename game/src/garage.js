// Tito's garage: repairs, and the place mission cars get delivered.
// One job: turn cash into a working car again.

import { distance } from './config.js';
import { GARAGE_POS } from './missions.js';
import { makeCar } from './vehicles.js';

export function createGarage(state) {
  const garage = {
    pos: GARAGE_POS,
    owned: [],
    shopOpen: false,
    selected: 0,
  };

  garage.repairCost = () => {
    const car = state.player.car;
    if (!car) return 0;
    const missing = car.maxHp - car.hp;
    return Math.ceil(missing * 2);
  };

  garage.update = (dt) => {
    void dt;
    const player = state.player;
    const near = distance(player.x, player.y, garage.pos.x, garage.pos.y) < 130;
    garage.near = near;
    // Press R near the garage while driving to repair the car.
    if (near && player.car && state.input.wasPressed('KeyR')) {
      const cost = garage.repairCost();
      if (cost <= 0) {
        state.hud.pushMessage('Your car is already in perfect shape.');
      } else if (player.cash >= cost) {
        player.cash -= cost;
        player.car.hp = player.car.maxHp;
        state.audio.sfx('cash');
        state.hud.pushMessage(`Tito fixed your ${player.car.name} for $${cost}.`);
        state.effects.addConfetti(state, player.x, player.y);
      } else {
        state.hud.pushMessage(`Repair costs $${cost} — you have $${Math.floor(player.cash)}.`);
      }
      return;
    }
    // Press B near the garage to open the shop.
    if (near && state.input.wasPressed('KeyB')) {
      garage.shopOpen = !garage.shopOpen;
      state.audio.sfx('click');
    }
    if (garage.shopOpen) {
      const options = garage.shopOptions();
      if (state.input.wasPressed('ArrowUp')) garage.selected = (garage.selected + options.length - 1) % options.length;
      if (state.input.wasPressed('ArrowDown')) garage.selected = (garage.selected + 1) % options.length;
      if (state.input.wasPressed('Enter')) garage.buy(options[garage.selected]);
      if (state.input.wasPressed('Escape') || state.input.wasPressed('KeyB')) garage.shopOpen = false;
    }
  };

  garage.shopOptions = () => [
    { id: 'coupe', name: 'Vela Coupe', price: 5200, blurb: 'Quick, loud, red. A proper Bay car.' },
    { id: 'pickup', name: 'Dune Pickup', price: 2800, blurb: 'Tough, roomy, beach-ready.' },
    { id: 'sport', name: 'Falco GT', price: 9800, blurb: 'The fastest thing in Solmar. Worth every dollar.' },
  ];

  garage.buy = (option) => {
    const player = state.player;
    if (!option) return;
    if (garage.owned.includes(option.id)) {
      state.hud.pushMessage(`You already own a ${option.name}.`);
      return;
    }
    if (player.cash < option.price) {
      state.hud.pushMessage(`The ${option.name} costs $${option.price}. You have $${Math.floor(player.cash)}. Earn more first.`);
      return;
    }
    player.cash -= option.price;
    garage.owned.push(option.id);
    const car = makeCar(option.id, garage.pos.x + 90, garage.pos.y + 60, 0, 'parked');
    state.cars.push(car);
    state.audio.sfx('cash');
    state.hud.pushMessage(`You bought a ${option.name}! It is parked outside the garage.`);
    state.save.saveGame(state);
  };

  garage.applySave = (save) => {
    if (save && Array.isArray(save.ownedCars)) garage.owned = save.ownedCars.slice();
  };

  return garage;
}
