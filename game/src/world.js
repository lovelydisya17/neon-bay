// Neon Bay world: the city, its traffic, pedestrians, police, wanted system,
// combat, missions, economy and save state. No drawing and no browser in it:
// step() advances one fixed step and returns what happened as bit flags, so the
// caller can play sounds and announce without the world knowing about screens.
import { BUST_CASH_LOSS, CAR, CAR_COLORS, BUILDING_COLORS, HOSPITAL, MISSIONS, PED_COUNT, PLAYER, TRAFFIC_COUNT, WANTED_FADE_SECONDS, WANTED_MAX, WORLD } from './config.js';
import { pick, range } from './random.js';

export const EVENT_SHOT = 1;
export const EVENT_HIT = 2;
export const EVENT_MISSION = 4;
export const EVENT_BUSTED = 8;
export const EVENT_STEAL = 16;
export const EVENT_PICKUP = 32;
export const EVENT_WANTED = 64;
export const EVENT_CRASH = 128;

const PITCH = 300;
const ROAD_W = 72;
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function roadCenters() { const list = []; for (let i = 0; i <= 8; i += 1) list.push(i * PITCH); return list; }
function nearestRoad(value) { return Math.round(value / PITCH) * PITCH; }
function onRoad(x, y) {
  const rx = Math.abs(x - nearestRoad(x)); const ry = Math.abs(y - nearestRoad(y));
  return rx < ROAD_W / 2 + 6 || ry < ROAD_W / 2 + 6;
}

export function createWorld(random) {
  const buildings = [];
  for (let bx = 0; bx < 8; bx += 1) {
    for (let by = 0; by < 6; by += 1) {
      const x0 = bx * PITCH + ROAD_W / 2 + 14; const y0 = by * PITCH + ROAD_W / 2 + 14;
      const w = PITCH - ROAD_W - 28; const h = PITCH - ROAD_W - 28;
      if (random() < 0.18) continue;
      buildings.push({ x: x0 + 8, y: y0 + 8, w: w * 0.42, h: h * 0.55, color: pick(random, BUILDING_COLORS), name: 'block' });
      buildings.push({ x: x0 + w * 0.52, y: y0 + h * 0.4, w: w * 0.4, h: h * 0.5, color: pick(random, BUILDING_COLORS), name: 'block' });
    }
  }
  // Landmarks: hospital, marina, plaza, warehouse, motel, ferry terminal.
  const landmarks = [
    { x: 1080, y: 240, w: 240, h: 120, color: '#e8f2ff', name: 'Bay General Hospital' },
    { x: 1980, y: 180, w: 220, h: 110, color: '#274b5c', name: 'North Pier' },
    { x: 1080, y: 840, w: 240, h: 120, color: '#5c2b4a', name: 'Plaza' },
    { x: 180, y: 180, w: 200, h: 110, color: '#3d2b5c', name: 'Warehouse' },
    { x: 330, y: 1380, w: 220, h: 110, color: '#31406b', name: 'Coral Motel' },
    { x: 1980, y: 1380, w: 220, h: 110, color: '#274b5c', name: 'Ferry Terminal' },
  ];
  const player = { x: 1200, y: 1050, angle: -Math.PI / 2, health: PLAYER.health, cash: PLAYER.startCash, ammo: PLAYER.startAmmo, wanted: 0, inCar: null, hiddenTimer: 0, fireTimer: 0, vx: 0, vy: 0, bustedTimer: 0 };
  const cars = [];
  function makeCar(x, y, angle, color, kind) {
    return { x, y, angle, speed: 0, color, kind: kind || 'traffic', health: CAR.health, id: cars.length + Math.floor(random() * 1000), driver: kind === 'traffic' };
  }
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const vertical = random() < 0.5;
    const road = Math.floor(random() * 8) * PITCH;
    const along = range(random, 100, WORLD.width - 100);
    const lane = (random() < 0.5 ? -18 : 18);
    const car = vertical ? makeCar(road + lane, along, random() < 0.5 ? Math.PI / 2 : -Math.PI / 2, pick(random, CAR_COLORS), 'traffic')
      : makeCar(along, road + lane, random() < 0.5 ? 0 : Math.PI, pick(random, CAR_COLORS), 'traffic');
    car.speed = range(random, 70, 130); car.vertical = vertical; car.road = road;
    cars.push(car);
  }
  const taxi = makeCar(1200, 990, -Math.PI / 2, '#ffd23d', 'taxi'); cars.push(taxi);
  const coupe = makeCar(1950, 900, 0, '#dfe6ee', 'repo'); coupe.speed = 0; cars.push(coupe);
  const courier = makeCar(1200, 900, Math.PI / 2, '#1d2b4a', 'courier'); cars.push(courier);
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    peds.push({ x: range(random, 80, WORLD.width - 80), y: range(random, 80, WORLD.height - 80), angle: range(random, 0, Math.PI * 2), speed: range(random, 26, 55), color: pick(random, ['#e8e4d8', '#ff8c42', '#7ee081', '#f2a541', '#c9c9c9']), flee: 0, alive: true });
  }
  const bullets = [];
  const marks = [];
  const sparks = [];
  const police = [];
  const state = {
    player, cars, peds, bullets, marks, sparks, police, buildings, landmarks,
    missionIndex: 0, missionActive: false, missionStage: 0, missionTimer: 0,
    missionText: 'Find Mara Voss at the pier to start work. Press E near a car to drive it.',
    missionTarget: null, dialogue: 'NEON BAY: a new driver in town. Mara Voss runs the Bay crew from the north pier.',
    elapsed: 0, rain: 0, shake: 0, completed: 0, bustedCount: 0, carsStolen: 0,
    message: '', messageTimer: 0,
  };
  function setMessage(text) { state.message = text; state.messageTimer = 4; }
  function missionDef() { return MISSIONS[state.missionIndex] || null; }
  function startMission() {
    const def = missionDef(); if (!def) { state.missionText = 'All jobs done. Neon Bay is yours, kid.'; return; }
    state.missionActive = true; state.missionStage = 0; state.missionTimer = def.time;
    state.dialogue = def.giver + ': ' + def.text;
    state.missionText = def.name + ' - ' + def.text;
    state.missionTarget = def.kind === 'deliver' ? { x: 2250, y: 1650, label: 'Pick up the case at the docks' } : { x: def.target.x, y: def.target.y, label: def.name };
    if (def.kind === 'repo') state.missionTarget = { x: 1950, y: 900, label: 'Take the silver coupe' };
    if (def.kind === 'final') state.missionTarget = { x: 1200, y: 900, label: 'Lift the courier car' };
    if (def.kind === 'escape') { player.wanted = 3; }
    setMessage(def.name + ' started: ' + def.text);
  }
  function completeMission() {
    const def = missionDef(); if (!def) return EVENT_MISSION;
    player.cash += def.reward; state.completed += 1; state.missionActive = false;
    state.missionIndex += 1; state.missionTarget = null;
    state.dialogue = 'Job done. +' + def.reward + ' credits. ' + (missionDef() ? 'Next: ' + missionDef().name + ' - talk to ' + missionDef().giver + '.' : 'That was the last job. Neon Bay is yours.');
    setMessage('Mission complete: ' + def.name + ' +' + def.reward + ' credits');
    return EVENT_MISSION;
  }
  function addWanted(n) {
    const before = player.wanted;
    player.wanted = clamp(player.wanted + n, 0, WANTED_MAX);
    player.hiddenTimer = 0;
    return player.wanted !== before ? EVENT_WANTED : 0;
  }
  function spawnPolice() {
    const want = player.wanted;
    while (police.length < want) {
      const a = range(random, 0, Math.PI * 2);
      const px = clamp(player.x + Math.cos(a) * 520, 60, WORLD.width - 60);
      const py = clamp(player.y + Math.sin(a) * 520, 60, WORLD.height - 60);
      police.push(makeCar(px, py, angleTo(px, py, player.x, player.y), '#37e6ff', 'police'));
    }
    while (police.length > want) police.pop();
  }
  function bustPlayer() {
    const lost = Math.floor(player.cash * BUST_CASH_LOSS);
    player.cash -= lost; player.wanted = 0; player.health = PLAYER.health; player.ammo = PLAYER.startAmmo;
    player.x = HOSPITAL.x + 120; player.y = HOSPITAL.y + 60; player.inCar = null; player.bustedTimer = 0;
    state.bustedCount += 1; state.missionTimer = missionDef() ? missionDef().time : 0;
    state.dialogue = 'Bay General: you woke up in the hospital. The patrol took ' + lost + ' credits. Back to work.';
    setMessage('Busted. Hospital bill: ' + lost + ' credits lost.');
    return EVENT_BUSTED;
  }
  function fireBullet(fromX, fromY, angle, friendly) {
    bullets.push({ x: fromX + Math.cos(angle) * 22, y: fromY + Math.sin(angle) * 22, vx: Math.cos(angle) * 620, vy: Math.sin(angle) * 620, life: 0.7, friendly });
    return EVENT_SHOT;
  }
  function hitBuilding(x, y) {
    for (const b of buildings) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
    for (const b of landmarks) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
    return false;
  }
  function reset() {
    player.x = 1200; player.y = 1050; player.angle = -Math.PI / 2; player.health = PLAYER.health;
    player.cash = PLAYER.startCash; player.ammo = PLAYER.startAmmo; player.wanted = 0; player.inCar = null;
    player.hiddenTimer = 0; player.fireTimer = 0; player.vx = 0; player.vy = 0;
    state.missionIndex = 0; state.missionActive = false; state.missionStage = 0; state.completed = 0;
    state.bustedCount = 0; state.carsStolen = 0; state.elapsed = 0; state.shake = 0;
    state.dialogue = 'NEON BAY: a new driver in town. Mara Voss runs the Bay crew from the north pier.';
    state.missionText = 'Find Mara Voss at the pier to start work. Press E near a car to drive it.';
    state.missionTarget = null; police.length = 0; bullets.length = 0; marks.length = 0; sparks.length = 0;
    for (const c of cars) { c.health = CAR.health; c.speed = c.kind === 'traffic' ? range(random, 70, 130) : 0; }
    for (const p of peds) p.alive = true;
  }
  function save() {
    return { cash: player.cash, ammo: player.ammo, health: player.health, missionIndex: state.missionIndex, completed: state.completed, carsStolen: state.carsStolen, bustedCount: state.bustedCount, x: player.x, y: player.y };
  }
  function load(data) {
    if (!data) return; reset();
    player.cash = data.cash ?? player.cash; player.ammo = data.ammo ?? player.ammo;
    player.health = data.health ?? player.health; state.missionIndex = data.missionIndex ?? 0;
    state.completed = data.completed ?? 0; state.carsStolen = data.carsStolen ?? 0;
    state.bustedCount = data.bustedCount ?? 0; player.x = data.x ?? player.x; player.y = data.y ?? player.y;
  }
  function step(dt, c) {
    let events = 0; state.elapsed += dt; state.rain += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);
    if (player.fireTimer > 0) player.fireTimer -= dt;
    const px = player.inCar ? player.inCar.x : player.x;
    const py = player.inCar ? player.inCar.y : player.y;
    // Wanted fades when no police unit is close for a while.
    const nearestCop = police.length ? Math.min(...police.map((p) => dist(p.x, p.y, px, py))) : 9999;
    if (nearestCop > 60) player.bustedTimer = 0;
    if (player.wanted > 0 && nearestCop > 420) {
      player.hiddenTimer += dt;
      if (player.hiddenTimer > WANTED_FADE_SECONDS) { player.wanted = Math.max(0, player.wanted - 1); player.hiddenTimer = 0; events |= EVENT_WANTED; }
    } else player.hiddenTimer = 0;
    spawnPolice();
    // Enter / exit / steal a car.
    if (c.enter) {
      if (player.inCar) {
        const car = player.inCar; player.inCar = null;
        player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 42; player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 42;
        player.angle = car.angle;
      } else {
        let best = null; let bestD = 78;
        for (const car of cars) { const d = dist(car.x, car.y, player.x, player.y); if (d < bestD) { bestD = d; best = car; } }
        if (best) {
          player.inCar = best; state.carsStolen += 1;
          if (best.kind === 'traffic' || best.kind === 'police') events |= addWanted(1) | EVENT_STEAL;
          else if (best.kind === 'repo' || best.kind === 'courier') { events |= EVENT_STEAL; if (best.kind === 'courier') events |= addWanted(2); }
          setMessage(best.kind === 'taxi' ? 'You took the cab.' : 'You took the ' + best.kind + ' car.');
          if (!state.missionActive && state.missionIndex < MISSIONS.length) startMission();
        }
      }
    }
    // Driving.
    if (player.inCar) {
      const car = player.inCar;
      const steer = (c.left ? -1 : 0) + (c.right ? 1 : 0);
      if (c.up) car.speed += CAR.accel * dt;
      if (c.down) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.6) * dt;
      car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
      if (!c.up && !c.down) car.speed *= Math.max(0, 1 - 1.4 * dt);
      const dir = car.speed >= 0 ? 1 : -1;
      car.angle += steer * CAR.turn * dt * clamp(Math.abs(car.speed) / 140, 0, 1) * dir;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!hitBuilding(nx, ny)) { car.x = nx; car.y = ny; } else { car.speed *= -0.25; events |= EVENT_CRASH; state.shake = 0.5; }
      car.x = clamp(car.x, 40, WORLD.width - 40); car.y = clamp(car.y, 40, WORLD.height - 40);
      player.x = car.x; player.y = car.y; player.angle = car.angle;
      if (Math.abs(steer) > 0 && Math.abs(car.speed) > 220 && marks.length < 240) {
        marks.push({ x: car.x - Math.cos(car.angle) * 18, y: car.y - Math.sin(car.angle) * 18, angle: car.angle, life: 5 });
      }
      // Ramming: damage peds, traffic and police nearby in front of the car.
      for (const ped of peds) {
        if (ped.alive && dist(ped.x, ped.y, car.x, car.y) < 34 && Math.abs(car.speed) > 90) {
          ped.alive = false; events |= EVENT_CRASH | addWanted(1); state.shake = 0.4;
          sparks.push({ x: ped.x, y: ped.y, life: 0.5 });
        }
      }
      for (const other of cars) {
        if (other !== car && dist(other.x, other.y, car.x, car.y) < 48 && Math.abs(car.speed) > 80) {
          other.health -= CAR.ramDamage; car.speed *= 0.55; events |= EVENT_CRASH; state.shake = 0.5;
          if (other.kind === 'police') events |= addWanted(1);
          if (other.health <= 0) { other.health = 0; other.speed = 0; sparks.push({ x: other.x, y: other.y, life: 0.8 }); }
        }
      }
    } else {
      // On foot.
      let mx = (c.right ? 1 : 0) - (c.left ? 1 : 0); let my = (c.down ? 1 : 0) - (c.up ? 1 : 0);
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 0) { mx /= len; my /= len; player.angle = Math.atan2(my, mx); }
      const speed = c.shoot ? PLAYER.walkSpeed : PLAYER.runSpeed;
      const nx = player.x + mx * speed * dt; const ny = player.y + my * speed * dt;
      if (!hitBuilding(nx, player.y)) player.x = clamp(nx, 20, WORLD.width - 20);
      if (!hitBuilding(player.x, ny)) player.y = clamp(ny, 20, WORLD.height - 20);
      if (c.aimAngle !== null && c.aimAngle !== undefined) player.angle = c.aimAngle;
      if (c.shoot && player.fireTimer <= 0) {
        const nearPed = peds.find((p) => p.alive && dist(p.x, p.y, player.x, player.y) < PLAYER.punchRange);
        if (nearPed) { nearPed.alive = false; player.fireTimer = 0.35; events |= EVENT_HIT | addWanted(1); state.shake = 0.3; }
        else if (player.ammo > 0) {
          player.ammo -= 1; player.fireTimer = PLAYER.fireInterval;
          events |= fireBullet(player.x, player.y, player.angle, true) | addWanted(0);
          for (const ped of peds) if (ped.alive && dist(ped.x, ped.y, player.x, player.y) < 260) ped.flee = 2.5;
          state.shake = Math.max(state.shake, 0.12);
        }
      }
    }
    // Traffic drives along its road and wraps at the edge.
    for (const car of cars) {
      if (car === player.inCar || car.kind === 'police') continue;
      if (car.kind === 'repo' || car.kind === 'courier') continue;
      if (car.kind === 'taxi' && car !== player.inCar && car.speed === 0) continue;
      car.x += Math.cos(car.angle) * car.speed * dt; car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.x < -60) car.x = WORLD.width + 50; if (car.x > WORLD.width + 60) car.x = -50;
      if (car.y < -60) car.y = WORLD.height + 50; if (car.y > WORLD.height + 60) car.y = -50;
      if (random() < 0.0006) { car.angle += Math.PI / 2 * (random() < 0.5 ? 1 : -1); }
    }
    // Police chase the player, ram on foot and in a car.
    for (const cop of police) {
      const targetAngle = angleTo(cop.x, cop.y, px, py);
      let diff = targetAngle - cop.angle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      cop.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      cop.speed = clamp(cop.speed + 300 * dt, 0, player.inCar ? 400 : 230);
      const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt; const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
      if (!hitBuilding(nx, ny)) { cop.x = nx; cop.y = ny; } else cop.speed *= 0.4;
      if (dist(cop.x, cop.y, px, py) < 46) {
        if (player.inCar) { player.inCar.health -= 18 * dt * 10; player.inCar.speed *= 0.9; state.shake = 0.4; events |= EVENT_CRASH; if (player.inCar.health <= 0) { player.health -= 20; player.inCar = null; } }
        else { player.health -= 26 * dt; player.bustedTimer += dt; events |= EVENT_HIT; if (player.bustedTimer > 1.2 || player.health <= 0) events |= bustPlayer(); }
      }
    }
    // Pedestrians walk, flee gunfire, and cross at corners.
    for (const ped of peds) {
      if (!ped.alive) continue;
      if (ped.flee > 0) { ped.flee -= dt; ped.angle = angleTo(player.x, player.y, ped.x, ped.y); ped.speed = 150; }
      else ped.speed = 40;
      ped.x += Math.cos(ped.angle) * ped.speed * dt; ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (ped.x < 30 || ped.x > WORLD.width - 30 || ped.y < 30 || ped.y > WORLD.height - 30) ped.angle += Math.PI;
      if (random() < 0.001) ped.angle = range(random, 0, Math.PI * 2);
    }
    // Bullets fly and hit cars, peds and police.
    for (const b of bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) continue;
      let spent = false;
      for (const car of cars) {
        if (dist(b.x, b.y, car.x, car.y) < 30) {
          car.health -= PLAYER.pistolDamage; b.life = 0; spent = true; events |= EVENT_HIT;
          sparks.push({ x: b.x, y: b.y, life: 0.4 });
          if (car.kind === 'police') events |= addWanted(1);
          if (car.health <= 0) car.speed = 0;
          break;
        }
      }
      if (spent) continue;
      for (const ped of peds) {
        if (ped.alive && dist(b.x, b.y, ped.x, ped.y) < 16) { ped.alive = false; b.life = 0; events |= EVENT_HIT | addWanted(1); break; }
      }
      for (const cop of police) {
        if (dist(b.x, b.y, cop.x, cop.y) < 30) { cop.health -= PLAYER.pistolDamage; b.life = 0; events |= EVENT_HIT; if (cop.health <= 0) { cop.speed = 0; police.splice(police.indexOf(cop), 1); } break; }
      }
      if (!player.inCar && b.friendly === false && dist(b.x, b.y, player.x, player.y) < 16) { player.health -= 10; b.life = 0; events |= EVENT_HIT; }
    }
    for (let i = bullets.length - 1; i >= 0; i -= 1) if (bullets[i].life <= 0) bullets.splice(i, 1);
    for (let i = marks.length - 1; i >= 0; i -= 1) { marks[i].life -= dt; if (marks[i].life <= 0) marks.splice(i, 1); }
    for (let i = sparks.length - 1; i >= 0; i -= 1) { sparks[i].life -= dt; if (sparks[i].life <= 0) sparks.splice(i, 1); }
    if (player.health <= 0) events |= bustPlayer();
    // Mission progress.
    if (state.missionActive) {
      state.missionTimer -= dt;
      const def = missionDef();
      if (def && state.missionTimer <= 0) { state.missionActive = false; state.missionTarget = null; setMessage(def.name + ' failed: time ran out. Steal a car and try again.'); state.dialogue = def.giver + ': too slow. Come back when you are ready to run it again.'; }
      else if (def && state.missionTarget) {
        const tx = state.missionTarget.x; const ty = state.missionTarget.y;
        const d = dist(px, py, tx, ty);
        if (def.kind === 'deliver' && state.missionStage === 0 && d < 70) {
          state.missionStage = 1; state.missionTarget = { x: def.target.x, y: def.target.y, label: 'Deliver the case to the Coral Motel' };
          setMessage('Case picked up. Deliver it to the Coral Motel.'); events |= EVENT_PICKUP;
        } else if (def.kind === 'repo' && state.missionStage === 0 && player.inCar && player.inCar.kind === 'repo') {
          state.missionStage = 1; state.missionTarget = { x: 600, y: 900, label: 'Bring the coupe to the garage on Lark Street' };
          setMessage('Coupe secured. Bring it to the garage.'); events |= EVENT_PICKUP;
        } else if (def.kind === 'final' && state.missionStage === 0 && player.inCar && player.inCar.kind === 'courier') {
          state.missionStage = 1; state.missionTarget = { x: 300, y: 300, label: 'Bring the courier car to the warehouse' };
          setMessage('Courier car lifted. Every patrol is looking. Run.'); events |= EVENT_PICKUP;
        } else if (def.kind === 'escape' && state.missionStage === 0 && player.wanted === 0 && state.elapsed > 5) {
          state.missionStage = 1; state.missionTarget = { x: def.target.x, y: def.target.y, label: 'Meet Dario at the ferry terminal' };
          setMessage('Heat is off. Meet Dario at the ferry terminal.'); events |= EVENT_PICKUP;
        } else if (d < 70 && (def.kind !== 'deliver' || state.missionStage === 1) && (def.kind !== 'repo' || state.missionStage === 1) && (def.kind !== 'final' || state.missionStage === 1) && (def.kind !== 'escape' || state.missionStage === 1)) {
          events |= completeMission();
        }
      }
    }
    return events;
  }
  reset();
  return { state, reset, step, startMission, missionDef, save, load, addWanted, roadCenters, onRoad };
}
