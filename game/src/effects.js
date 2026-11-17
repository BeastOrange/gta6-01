// Particles, cash drops and screen shake helpers.
// One job: short-lived visual feedback for hits, crashes and rewards.

export function createEffects(state) {
  const effects = {
    particles: [],
    pickups: [],
  };

  effects.addHitSpark = (x, y) => {
    for (let i = 0; i < 10; i++) {
      const a = state.rng() * Math.PI * 2;
      effects.particles.push({
        x, y,
        vx: Math.cos(a) * (60 + state.rng() * 160),
        vy: Math.sin(a) * (60 + state.rng() * 160),
        life: 0.35 + state.rng() * 0.25,
        maxLife: 0.6,
        color: '#ffd23e',
        size: 3 + state.rng() * 3,
      });
    }
  };

  effects.addExplosion = (x, y) => {
    for (let i = 0; i < 26; i++) {
      const a = state.rng() * Math.PI * 2;
      effects.particles.push({
        x, y,
        vx: Math.cos(a) * (80 + state.rng() * 260),
        vy: Math.sin(a) * (80 + state.rng() * 260),
        life: 0.5 + state.rng() * 0.5,
        maxLife: 1,
        color: ['#ff7a2e', '#ffd23e', '#8a8a8a'][i % 3],
        size: 4 + state.rng() * 6,
      });
    }
    state.camera.shake = 14;
  };

  effects.addConfetti = (x, y) => {
    const colors = ['#ffd23e', '#4bd9c9', '#d95f4b', '#7ad94b', '#c94bd9'];
    for (let i = 0; i < 30; i++) {
      const a = state.rng() * Math.PI * 2;
      effects.particles.push({
        x, y,
        vx: Math.cos(a) * (40 + state.rng() * 200),
        vy: Math.sin(a) * (40 + state.rng() * 200) - 60,
        life: 0.7 + state.rng() * 0.6,
        maxLife: 1.3,
        color: colors[i % colors.length],
        size: 3 + state.rng() * 3,
      });
    }
  };

  effects.addCashDrop = (x, y, amount) => {
    state.pickups.push({ x, y, amount, bob: 0 });
  };

  effects.update = (dt) => {
    for (let i = effects.particles.length - 1; i >= 0; i--) {
      const p = effects.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) effects.particles.splice(i, 1);
    }
    for (const p of state.pickups) p.bob += dt * 4;
  };

  effects.draw = (ctx) => {
    for (const p of effects.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const p of state.pickups) {
      const bob = Math.sin(p.bob) * 3;
      ctx.fillStyle = '#1d7a3a';
      ctx.fillRect(p.x - 11, p.y - 7 + bob, 22, 14);
      ctx.fillStyle = '#e8e4da';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$' + p.amount, p.x, p.y + 3 + bob);
    }
  };

  return effects;
}
