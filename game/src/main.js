// Neon Bay boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between four screens: title, play, paused and busted. Autosave runs to
// localStorage every few seconds while playing and after every mission.
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { SAVE_KEY, STEP, VIEW, WORLD } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_CRASH, EVENT_HIT, EVENT_MISSION, EVENT_PICKUP, EVENT_SHOT, EVENT_STEAL, EVENT_WANTED } from './world.js';
import { ACTION_CONFIRM, ACTION_CONTINUE, ACTION_ENTER, ACTION_MUTE, ACTION_NEW, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const AUTOSAVE_SECONDS = 5;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try { const raw = window.localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeSave() {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.save())); } catch { /* storage off: the run lasts this visit only */ }
}
function readBest() { const s = readSave(); return s ? s.cash : 0; }

function cameraFor(player) {
  const ratio = window.devicePixelRatio || 1;
  const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
  const viewX = (canvas.width - VIEW.width * scale) / 2;
  const viewY = (canvas.height - VIEW.height * scale) / 2;
  const x = Math.max(-40, Math.min(WORLD.width - VIEW.width + 40, player.x - VIEW.width / 2));
  const y = Math.max(-40, Math.min(WORLD.height - VIEW.height + 40, player.y - VIEW.height / 2));
  return { scale, viewX, viewY, x, y, ratio };
}
const input = createInput(canvas, () => cameraFor(world.state.player));

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  // Screens: title, play, paused, busted (game over). Autosave keeps progress.
  let screen = SCREEN_TITLE;
  let best = readBest();
  let saveInfo = readSave() !== null;
  let accumulator = 0; let last = performance.now(); let saveTimer = 0; let pendingEnter = false;
  function announce(message) { status.textContent = message; }
  function startGame(fresh) {
    if (fresh) { world.reset(); try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
    else { const s = readSave(); if (s) world.load(s); }
    audio.unlock(); accumulator = 0; saveTimer = 0; screen = SCREEN_PLAY;
    announce('Playing Neon Bay. Drive with WASD, E enters a car, click shoots.');
  }
  function handleEvents(events) {
    if (events & EVENT_SHOT) audio.shot();
    if (events & EVENT_CRASH) audio.crash();
    if (events & EVENT_HIT) audio.punch();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_STEAL) audio.steal();
    if (events & EVENT_MISSION) { audio.mission(); writeSave(); best = Math.max(best, world.state.player.cash); }
    if (events & EVENT_WANTED) audio.siren(world.state.player.wanted > 0);
    if (events & EVENT_BUSTED) {
      audio.busted(); audio.siren(false); writeSave(); screen = SCREEN_OVER;
      announce('Busted. You woke up at Bay General hospital.');
    }
  }
  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) { audio.setMuted(!audio.isMuted()); announce(audio.isMuted() ? 'Sound off.' : 'Sound on.'); }
    if (actions & ACTION_ENTER && screen === SCREEN_PLAY) pendingEnter = true;
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_NEW) startGame(true);
      else if (actions & ACTION_CONTINUE && saveInfo) startGame(false);
      else if (actions & ACTION_CONFIRM) startGame(saveInfo ? false : true);
    } else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) { screen = SCREEN_PLAY; announce('Playing.'); }
    else if (screen === SCREEN_OVER && (actions & (ACTION_CONFIRM | ACTION_NEW))) startGame(false);
  }
  function step() {
    if (screen === SCREEN_TITLE) { world.step(STEP, { up: false, down: false, left: false, right: false, shoot: false, enter: false, aimAngle: null }); return; }
    const base = input.controls(world.state.player);
    const controls = { up: base.up, down: base.down, left: base.left, right: base.right, shoot: input.isShooting(), enter: pendingEnter, aimAngle: base.aimAngle };
    pendingEnter = false;
    const events = world.step(STEP, controls);
    handleEvents(events);
    saveTimer += STEP;
    if (saveTimer >= AUTOSAVE_SECONDS) { saveTimer = 0; writeSave(); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME); last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) { step(); accumulator -= STEP; }
    } else accumulator = 0;
    renderer.draw(world.state, screen, best, saveInfo);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  announce('Neon Bay. Press Space or click to start. N for a new game, C to continue.');
  requestAnimationFrame(frame);
}
if (shot) runShot(shot); else runGame();
export { SCREEN_BUSTED };
