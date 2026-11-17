// The HUD and every menu: minimap, stars, cash, health, objectives, dialogue.
// One job: everything drawn in screen space on top of the world.

import { WORLD_W, WORLD_H } from './config.js';
import { districtNameAt } from './world.js';

export function createHud(state) {
  const hud = {
    messages: [],
    dialogueText: '',
    dialogueTimer: 0,
    shopNote: '',
  };

  hud.pushMessage = (text) => {
    hud.messages.unshift({ text, life: 5 });
    if (hud.messages.length > 4) hud.messages.pop();
  };

  hud.showDialogue = (text) => {
    hud.dialogueText = text;
    hud.dialogueTimer = 4.5;
  };

  hud.update = (dt) => {
    for (const m of hud.messages) m.life -= dt;
    hud.messages = hud.messages.filter((m) => m.life > 0);
    hud.dialogueTimer = Math.max(0, hud.dialogueTimer - dt);
    if (hud.dialogueTimer <= 0) hud.dialogueText = '';
  };

  hud.draw = (ctx) => {
    const vw = state.view.w;
    const vh = state.view.h;
    if (state.mode === 'title') { drawTitle(ctx, state); return; }
    drawMinimap(ctx, state);
    drawTopBar(ctx, state);
    drawObjective(ctx, state);
    drawMessages(ctx, state);
    drawDialogue(ctx, state);
    drawDistrictBanner(ctx, state);
    if (state.garage.shopOpen) drawShop(ctx, state);
    if (state.mode === 'paused') drawPaused(ctx, state);
    if (state.mode === 'busted') drawEndScreen(ctx, state, 'BUSTED', 'The SBPD caught you. Bail was taken from your cash.');
    if (state.mode === 'wasted') drawEndScreen(ctx, state, 'WASTED', 'Solmar Bay got the better of you this time.');
    drawHelpLine(ctx, state);
    void vw; void vh;
  };

  function drawMinimap(ctx, state) {
    const size = 190;
    const x0 = 16;
    const y0 = 16;
    const scale = size / WORLD_W;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 20, 30, 0.72)';
    roundRect(ctx, x0 - 6, y0 - 6, size + 12, size * (WORLD_H / WORLD_W) + 12, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const h = size * (WORLD_H / WORLD_W);
    ctx.beginPath();
    ctx.rect(x0, y0, size, h);
    ctx.clip();
    // Water and sand.
    ctx.fillStyle = '#2f7fa8';
    ctx.fillRect(x0, y0 + h - 12, size, 12);
    ctx.fillStyle = '#e3cd9a';
    ctx.fillRect(x0, y0 + h - 22, size, 10);
    // Roads.
    ctx.fillStyle = '#5a5e66';
    for (const r of state.world.roads) {
      ctx.fillRect(x0 + r.x * scale, y0 + r.y * scale, Math.max(2, r.w * scale), Math.max(2, r.h * scale));
    }
    // Garage and mission marker.
    ctx.fillStyle = '#e8b73a';
    ctx.fillRect(x0 + state.garage.pos.x * scale - 3, y0 + state.garage.pos.y * scale - 3, 6, 6);
    const marker = state.mission.marker();
    if (marker) {
      const pulse = 4 + Math.sin(state.time * 5) * 2;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(x0 + marker.x * scale, y0 + marker.y * scale, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22303e';
      ctx.stroke();
    }
    // Police blips.
    ctx.fillStyle = '#4b8fe8';
    for (const car of state.police.cars) {
      ctx.fillRect(x0 + car.x * scale - 2, y0 + car.y * scale - 2, 4, 4);
    }
    // Player arrow.
    const px = x0 + state.player.x * scale;
    const py = y0 + state.player.y * scale;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(state.player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(districtNameAt(state.player.x, state.player.y).toUpperCase(), x0, y0 + h + 22);
  }

  function drawTopBar(ctx, state) {
    const vw = state.view.w;
    // Wanted stars, top right.
    const stars = state.police.stars;
    ctx.textAlign = 'right';
    ctx.font = 'bold 26px sans-serif';
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < stars ? '#ffd23e' : 'rgba(255,255,255,0.28)';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      const sx = vw - 24 - i * 32;
      ctx.strokeText('★', sx, 40);
      ctx.fillText('★', sx, 40);
    }
    // Cash.
    ctx.fillStyle = '#7ad94b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('$' + Math.floor(state.player.cash).toLocaleString(), vw - 24, 76);
    // Health bar.
    const bw = 180;
    const bx = vw - 24 - bw;
    const by = 90;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, bx, by, bw, 16, 8);
    ctx.fill();
    const hpFrac = Math.max(0, state.player.hp / state.player.maxHp);
    ctx.fillStyle = hpFrac > 0.5 ? '#7ad94b' : hpFrac > 0.25 ? '#e8b73a' : '#e84b3a';
    roundRect(ctx, bx, by, bw * hpFrac, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HP ' + Math.ceil(state.player.hp), bx + bw / 2, by + 12);
    // Busted meter when an officer grabs the player.
    if (state.player.bustedMeter > 0) {
      ctx.fillStyle = '#e84b3a';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('BREAK FREE!  ' + Math.round(state.player.bustedMeter * 100) + '%', vw - 24, 132);
    }
    // Speed and car health while driving.
    if (state.player.car) {
      const car = state.player.car;
      const mph = Math.round(Math.abs(car.speed) * 0.12);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(mph + ' mph', vw - 24, state.view.h - 24);
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(car.name, vw - 24, state.view.h - 48);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, vw - 24 - 140, state.view.h - 72, 140, 10, 5);
      ctx.fill();
      ctx.fillStyle = car.hp > car.maxHp * 0.4 ? '#7ad94b' : '#e84b3a';
      roundRect(ctx, vw - 24 - 140, state.view.h - 72, 140 * Math.max(0, car.hp / car.maxHp), 10, 5);
      ctx.fill();
    }
  }

  function drawObjective(ctx, state) {
    const vw = state.view.w;
    const text = state.mission.objectiveText();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(10, 20, 30, 0.66)';
    const w = Math.min(460, ctx.measureText(text).width + 90);
    roundRect(ctx, vw / 2 - w / 2, 12, w, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 12px sans-serif';
    const title = state.mission.current() ? state.mission.current().title : 'FREE ROAM';
    ctx.fillText('◆ ' + title.toUpperCase(), vw / 2 - w / 2 + 14, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText(text, vw / 2 - w / 2 + 14, 50);
    if (state.mission.active && state.mission.current() && state.mission.current().id === 'getaway') {
      ctx.fillStyle = state.mission.timer < 20 ? '#ff5a4b' : '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.ceil(state.mission.timer) + 's', vw / 2 + w / 2 - 12, 30);
      ctx.textAlign = 'left';
    }
  }

  function drawMessages(ctx, state) {
    ctx.textAlign = 'left';
    ctx.font = '13px sans-serif';
    let y = state.view.h - 120;
    for (const m of hud.messages) {
      ctx.globalAlpha = Math.min(1, m.life);
      ctx.fillStyle = 'rgba(10, 20, 30, 0.66)';
      const w = ctx.measureText(m.text).width + 20;
      roundRect(ctx, 16, y - 16, w, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(m.text, 26, y + 1);
      y -= 30;
    }
    ctx.globalAlpha = 1;
  }

  function drawDialogue(ctx, state) {
    if (!hud.dialogueText) return;
    const vw = state.view.w;
    const vh = state.view.h;
    const w = Math.min(640, vw - 80);
    ctx.fillStyle = 'rgba(10, 20, 30, 0.82)';
    roundRect(ctx, vw / 2 - w / 2, vh - 150, w, 64, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MARA VOSS', vw / 2 - w / 2 + 16, vh - 126);
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.fillText(hud.dialogueText, vw / 2 - w / 2 + 16, vh - 102);
  }

  function drawDistrictBanner(ctx, state) {
    if (state.districtTimer <= 0) return;
    const vw = state.view.w;
    ctx.globalAlpha = Math.min(1, state.districtTimer);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillText(state.lastDistrict, vw / 2, 120);
    ctx.font = '14px sans-serif';
    ctx.fillText('Solmar Bay', vw / 2, 144);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawShop(ctx, state) {
    const vw = state.view.w;
    const vh = state.view.h;
    const w = 480;
    const h = 240;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#16222e';
    roundRect(ctx, vw / 2 - w / 2, vh / 2 - h / 2, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = '#e8b73a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e8b73a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("TITO'S GARAGE — BUY A CAR", vw / 2, vh / 2 - h / 2 + 34);
    const options = state.garage.shopOptions();
    ctx.textAlign = 'left';
    options.forEach((opt, i) => {
      const y = vh / 2 - h / 2 + 70 + i * 48;
      if (i === state.garage.selected) {
        ctx.fillStyle = 'rgba(232, 183, 58, 0.25)';
        roundRect(ctx, vw / 2 - w / 2 + 16, y - 22, w - 32, 40, 8);
        ctx.fill();
      }
      ctx.fillStyle = state.garage.owned.includes(opt.id) ? '#7ad94b' : '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(opt.name + '  —  $' + opt.price.toLocaleString() + (state.garage.owned.includes(opt.id) ? '  (OWNED)' : ''), vw / 2 - w / 2 + 30, y);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '13px sans-serif';
      ctx.fillText(opt.blurb, vw / 2 - w / 2 + 30, y + 16);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Up / Down to choose — Enter to buy — B to close', vw / 2, vh / 2 + h / 2 - 18);
  }

  function drawPaused(ctx, state) {
    const vw = state.view.w;
    const vh = state.view.h;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', vw / 2, vh / 2 - 40);
    ctx.font = '16px sans-serif';
    ctx.fillText('Solmar Bay is waiting. Press P or Esc to keep playing.', vw / 2, vh / 2);
    ctx.fillText('Missions done: ' + state.stats.missionsCompleted + '   Cars stolen: ' + state.stats.carsStolen, vw / 2, vh / 2 + 30);
    ctx.fillText('Press R to restart the day. Progress saves automatically.', vw / 2, vh / 2 + 60);
  }

  function drawEndScreen(ctx, state, title, sub) {
    const vw = state.view.w;
    const vh = state.view.h;
    ctx.fillStyle = title === 'BUSTED' ? 'rgba(20, 40, 90, 0.72)' : 'rgba(90, 20, 20, 0.72)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, vw / 2, vh / 2 - 30);
    ctx.font = '18px sans-serif';
    ctx.fillText(sub, vw / 2, vh / 2 + 10);
    ctx.fillText('Cash: $' + Math.floor(state.player.cash) + '   —   Press R to get back out there.', vw / 2, vh / 2 + 44);
  }

  function drawTitle(ctx, state) {
    const vw = state.view.w;
    const vh = state.view.h;
    // The world is already drawn behind the title; dim it.
    ctx.fillStyle = 'rgba(8, 18, 30, 0.55)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('WELCOME TO', vw / 2, vh / 2 - 150);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 72px sans-serif';
    ctx.shadowColor = 'rgba(255, 120, 40, 0.8)';
    ctx.shadowBlur = 24;
    ctx.fillText('SOLMAR BAY', vw / 2, vh / 2 - 84);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'italic bold 22px sans-serif';
    ctx.fillText('Sun, sea, fast cars and faster trouble.', vw / 2, vh / 2 - 48);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText('An original open-world crime story. Steal cars, outrun the SBPD,', vw / 2, vh / 2 - 8);
    ctx.fillText('run jobs for Mara Voss and take over the Bay.', vw / 2, vh / 2 + 16);
    const save = state.saveData;
    ctx.fillStyle = '#7ad94b';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(save ? 'Saved game found — press ENTER to continue your story' : 'Press ENTER to start a new story', vw / 2, vh / 2 + 64);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '14px sans-serif';
    ctx.fillText('WASD / Arrows — move & drive      E — steal / exit car      Space — punch / handbrake', vw / 2, vh / 2 + 104);
    ctx.fillText('M — start job      R — repair at the garage      B — buy cars      P — pause      H — horn', vw / 2, vh / 2 + 128);
    ctx.fillText('4 story jobs  •  Wanted stars & SBPD chases  •  Traffic & pedestrians  •  Your progress saves', vw / 2, vh / 2 + 162);
  }

  function drawHelpLine(ctx, state) {
    if (state.mode !== 'playing') return;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD move/drive · E car · Space punch/handbrake · M job · R repair · P pause · N mute', state.view.w / 2, state.view.h - 8);
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

  return hud;
}
