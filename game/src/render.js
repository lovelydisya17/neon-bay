// Drawing only: the world state and the current screen in, pixels out. The camera
// follows the player, the city is drawn road by road, then cars, people, bullets,
// tire marks, rain and the HUD with its minimap. Flat canvas shapes, neon colours,
// no images and no network: everything on screen is drawn by this file.
import { CAR, FONT, PALETTE, VIEW, WORLD, MISSIONS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';

const MINIMAP = { x: 1060, y: 16, w: 204, h: 136 };
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, 'bold ' + size + 'px ' + FONT);
    context.font = fonts.get(size); context.fillStyle = color;
    context.textAlign = align || 'left'; context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }
  function drawCar(car, isPlayer) {
    context.save(); context.translate(car.x, car.y); context.rotate(car.angle);
    context.fillStyle = 'rgba(0,0,0,0.35)'; context.fillRect(-CAR.length / 2 + 3, -CAR.width / 2 + 3, CAR.length, CAR.width);
    context.fillStyle = car.color; context.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
    context.fillStyle = '#101828'; context.fillRect(-6, -CAR.width / 2 + 4, 16, CAR.width - 8);
    context.fillStyle = '#dfe9ff'; context.fillRect(CAR.length / 2 - 10, -CAR.width / 2 + 3, 4, 5); context.fillRect(CAR.length / 2 - 10, CAR.width / 2 - 8, 4, 5);
    if (car.kind === 'police') { context.fillStyle = '#ff4d5e'; context.fillRect(-CAR.length / 2 + 4, -CAR.width / 2 + 2, 10, 6); context.fillStyle = '#37e6ff'; context.fillRect(-CAR.length / 2 + 4, CAR.width / 2 - 8, 10, 6); }
    if (car.kind === 'taxi') { context.fillStyle = '#111'; text('TAXI', 0, 4, 9, '#111', 'center', 'middle'); }
    if (isPlayer) { context.strokeStyle = PALETTE.neonYellow; context.lineWidth = 3; context.strokeRect(-CAR.length / 2 - 3, -CAR.width / 2 - 3, CAR.length + 6, CAR.width + 6); }
    context.restore();
  }
  function drawCity(state, cam) {
    context.fillStyle = PALETTE.grass; context.fillRect(cam.x - 40, cam.y - 40, VIEW.width + 80, VIEW.height + 80);
    // Water along the north edge: Neon Bay itself.
    context.fillStyle = PALETTE.water; context.fillRect(cam.x - 40, 0, VIEW.width + 80, 64);
    context.fillStyle = PALETTE.neonCyan; text('NEON BAY', cam.x + 24, 40, 22, PALETTE.neonCyan, 'left', 'middle');
    // Blocks and buildings.
    for (const b of state.buildings) {
      if (b.x > cam.x + VIEW.width || b.x + b.w < cam.x || b.y > cam.y + VIEW.height || b.y + b.h < cam.y) continue;
      context.fillStyle = b.color; context.fillRect(b.x, b.y, b.w, b.h);
      context.fillStyle = 'rgba(255,210,61,0.75)';
      for (let wy = b.y + 10; wy < b.y + b.h - 8; wy += 18) for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 18) context.fillRect(wx, wy, 5, 7);
    }
    for (const l of state.landmarks) {
      if (l.x > cam.x + VIEW.width || l.x + l.w < cam.x || l.y > cam.y + VIEW.height || l.y + l.h < cam.y) continue;
      context.fillStyle = l.color; context.fillRect(l.x, l.y, l.w, l.h);
      context.fillStyle = '#101828'; text(l.name, l.x + l.w / 2, l.y + l.h / 2, 15, '#101828', 'center', 'middle');
    }
    // Roads: dark strips with dashed centre lines.
    context.fillStyle = PALETTE.road;
    for (let i = 0; i <= 8; i += 1) {
      context.fillRect(i * 300 - 36, 0, 72, WORLD.height);
      context.fillRect(0, i * 300 - 36, WORLD.width, 72);
    }
    context.strokeStyle = PALETTE.roadLine; context.lineWidth = 3; context.setLineDash([22, 18]);
    for (let i = 0; i <= 8; i += 1) {
      context.beginPath(); context.moveTo(i * 300, 0); context.lineTo(i * 300, WORLD.height); context.stroke();
      context.beginPath(); context.moveTo(0, i * 300); context.lineTo(WORLD.width, i * 300); context.stroke();
    }
    context.setLineDash([]);
    // Sidewalks.
    context.strokeStyle = PALETTE.sidewalk; context.lineWidth = 10;
    for (let i = 0; i <= 8; i += 1) {
      context.strokeRect(i * 300 - 46, -10, 92, WORLD.height + 20);
      context.strokeRect(-10, i * 300 - 46, WORLD.width + 20, 92);
    }
  }
  function drawMinimap(state) {
    const sx = MINIMAP.w / WORLD.width; const sy = MINIMAP.h / WORLD.height;
    context.fillStyle = 'rgba(10,14,32,0.85)'; context.fillRect(MINIMAP.x - 6, MINIMAP.y - 6, MINIMAP.w + 12, MINIMAP.h + 12);
    context.fillStyle = '#1d2b4a'; context.fillRect(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h);
    context.fillStyle = '#232733';
    for (let i = 0; i <= 8; i += 1) { context.fillRect(MINIMAP.x + i * 300 * sx - 2, MINIMAP.y, 4, MINIMAP.h); context.fillRect(MINIMAP.x, MINIMAP.y + i * 300 * sy - 2, MINIMAP.w, 4); }
    if (state.missionTarget) { context.fillStyle = PALETTE.neonYellow; context.beginPath(); context.arc(MINIMAP.x + state.missionTarget.x * sx, MINIMAP.y + state.missionTarget.y * sy, 6, 0, Math.PI * 2); context.fill(); }
    context.fillStyle = PALETTE.neonCyan;
    for (const cop of state.police) { context.fillRect(MINIMAP.x + cop.x * sx - 2, MINIMAP.y + cop.y * sy - 2, 4, 4); }
    context.fillStyle = '#fff'; context.beginPath(); context.arc(MINIMAP.x + state.player.x * sx, MINIMAP.y + state.player.y * sy, 4, 0, Math.PI * 2); context.fill();
  }
  function drawHud(state) {
    const p = state.player;
    context.fillStyle = 'rgba(10,14,32,0.72)'; context.fillRect(12, 12, 330, 92);
    text('$ ' + p.cash, 26, 44, 26, PALETTE.cash, 'left');
    text('AMMO ' + p.ammo, 26, 72, 16, PALETTE.text, 'left');
    text('HEALTH ' + Math.max(0, Math.ceil(p.health)), 150, 72, 16, PALETTE.health, 'left');
    context.fillStyle = '#222a3d'; context.fillRect(26, 82, 180, 10);
    context.fillStyle = PALETTE.health; context.fillRect(26, 82, 180 * clamp(p.health / 100, 0, 1), 10);
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < p.wanted ? '★' : '☆';
    text(stars, 26, 128, 26, PALETTE.star, 'left');
    text('WANTED', 170, 124, 13, PALETTE.muted, 'left');
    if (p.inCar) text('CAR ' + Math.max(0, Math.ceil(p.inCar.health)) + '  [E] exit', 26, 152, 15, PALETTE.neonCyan, 'left');
    else text('ON FOOT  [E] near a car to drive', 26, 152, 15, PALETTE.neonCyan, 'left');
    drawMinimap(state);
    const def = MISSIONS[state.missionIndex];
    text(state.missionActive && def ? 'MISSION ' + (state.missionIndex + 1) + '/5: ' + def.name + '  $' + def.reward : 'MISSIONS ' + state.completed + '/5 DONE', 640, 36, 18, PALETTE.neonYellow, 'center');
    if (state.missionTarget) text('> ' + state.missionTarget.label, 640, 60, 15, PALETTE.text, 'center');
    if (state.missionActive && state.missionTimer > 0) text('TIME ' + Math.ceil(state.missionTimer) + 's', 640, 82, 15, state.missionTimer < 20 ? PALETTE.danger : PALETTE.text, 'center');
    if (state.messageTimer > 0 && state.message) {
      context.fillStyle = 'rgba(10,14,32,0.8)'; context.fillRect(340, 640, 600, 34);
      text(state.message, 640, 663, 16, PALETTE.text, 'center');
    }
    context.fillStyle = 'rgba(10,14,32,0.8)'; context.fillRect(12, 640, 560, 58);
    text(state.dialogue, 24, 664, 14, PALETTE.muted, 'left');
    text('WASD drive / walk  -  SPACE shoot  -  E car  -  P pause  -  M sound', 24, 686, 13, PALETTE.muted, 'left');
  }
  function drawPanel(title, lines, prompt) {
    const w = 760; const h = 150 + lines.length * 30;
    const x = (VIEW.width - w) / 2; const y = (VIEW.height - h) / 2;
    context.fillStyle = 'rgba(8,10,24,0.88)'; context.fillRect(x, y, w, h);
    context.strokeStyle = PALETTE.neonPink; context.lineWidth = 3; context.strokeRect(x, y, w, h);
    text(title, VIEW.width / 2, y + 64, 46, PALETTE.neonPink, 'center');
    lines.forEach((line, i) => text(line, VIEW.width / 2, y + 112 + i * 30, 18, PALETTE.text, 'center'));
    text(prompt, VIEW.width / 2, y + h - 26, 18, PALETTE.neonYellow, 'center');
  }
  function draw(state, screen, best, saveInfo) {
    const p = state.player;
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 18 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 18 : 0;
    const cam = { x: clamp(p.x - VIEW.width / 2 + shakeX, -40, WORLD.width - VIEW.width + 40), y: clamp(p.y - VIEW.height / 2 + shakeY, -40, WORLD.height - VIEW.height + 40) };
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop; context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.save(); context.translate(-cam.x, -cam.y);
    drawCity(state, cam);
    context.strokeStyle = 'rgba(0,0,0,0.45)'; context.lineWidth = 5;
    for (const m of state.marks) { context.beginPath(); context.moveTo(m.x - Math.cos(m.angle) * 12, m.y - Math.sin(m.angle) * 12); context.lineTo(m.x + Math.cos(m.angle) * 12, m.y + Math.sin(m.angle) * 12); context.stroke(); }
    if (state.missionTarget) {
      const t = state.missionTarget; const pulse = 1 + Math.sin(state.elapsed * 4) * 0.15;
      context.strokeStyle = PALETTE.neonYellow; context.lineWidth = 4;
      context.beginPath(); context.arc(t.x, t.y, 34 * pulse, 0, Math.PI * 2); context.stroke();
      context.fillStyle = PALETTE.neonYellow; context.beginPath(); context.moveTo(t.x, t.y - 52); context.lineTo(t.x - 10, t.y - 30); context.lineTo(t.x + 10, t.y - 30); context.fill();
    }
    for (const car of state.cars) { if (car.x < cam.x - 80 || car.x > cam.x + VIEW.width + 80 || car.y < cam.y - 80 || car.y > cam.y + VIEW.height + 80) continue; drawCar(car, car === p.inCar); }
    for (const cop of state.police) drawCar(cop, false);
    for (const ped of state.peds) {
      if (!ped.alive) continue;
      context.fillStyle = ped.flee > 0 ? '#ff8c42' : ped.color;
      context.beginPath(); context.arc(ped.x, ped.y, 7, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#101828'; context.beginPath(); context.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3, 3, 0, Math.PI * 2); context.fill();
    }
    if (!p.inCar) {
      context.save(); context.translate(p.x, p.y); context.rotate(p.angle);
      context.fillStyle = PALETTE.player; context.beginPath(); context.arc(0, 0, 13, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#101828'; context.fillRect(8, -3, 14, 6);
      context.restore();
    }
    context.fillStyle = '#ffd23d';
    for (const b of state.bullets) { context.beginPath(); context.arc(b.x, b.y, 4, 0, Math.PI * 2); context.fill(); }
    for (const s of state.sparks) { context.fillStyle = '#ff8c42'; context.beginPath(); context.arc(s.x, s.y, 8 * s.life, 0, Math.PI * 2); context.fill(); }
    context.restore();
    // Rain streaks over the whole view, drifting with the wind.
    context.strokeStyle = 'rgba(160,200,255,0.35)'; context.lineWidth = 1;
    for (let i = 0; i < 60; i += 1) {
      const rx = ((i * 173 + state.elapsed * 90) % (VIEW.width + 40)) - 20;
      const ry = ((i * 97 + state.elapsed * 420) % (VIEW.height + 40)) - 20;
      context.beginPath(); context.moveTo(rx, ry); context.lineTo(rx - 4, ry + 14); context.stroke();
    }
    // Dusk tint.
    context.fillStyle = 'rgba(255,120,80,0.06)'; context.fillRect(0, 0, VIEW.width, VIEW.height);
    if (screen === SCREEN_TITLE) {
      drawPanel('NEON BAY', ['A sun-soaked open city. Drive, steal, run jobs for the Bay crew.', 'Traffic, pedestrians, police heat, five story missions, combat.', 'Best run: $' + best + (saveInfo ? '  -  saved game found, press C to continue' : '')], 'Press SPACE or click to start  -  N new game');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('PAUSED', ['The city waits. Your save is kept in this browser.', 'M mute sound  -  R restart the current job'], 'Press P to resume');
    else if (screen === SCREEN_OVER) drawPanel('BUSTED', ['The bay patrol caught you. You woke up at Bay General.', 'Cash lost, heat cleared, the crew still owes you work.'], 'Press SPACE to get back out there');
  }
  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
