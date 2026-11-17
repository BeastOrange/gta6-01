// Save and load through localStorage. One job: persist progress, nothing else.

const SAVE_KEY = 'solmar-bay-save-v1';

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      savedAt: Date.now(),
      cash: Math.round(state.player.cash),
      missionIndex: state.mission.index,
      missionsDone: state.mission.done.slice(),
      ownedCars: state.garage.owned.slice(),
      playerHp: Math.round(state.player.hp),
      wanted: state.wanted.stars,
      bestCash: Math.round(state.stats.bestCash),
      missionsCompleted: state.stats.missionsCompleted,
      carsStolen: state.stats.carsStolen,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

export function hasSave() {
  return loadGame() !== null;
}
