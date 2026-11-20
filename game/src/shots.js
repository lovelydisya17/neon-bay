// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays
// the real rules forward from a fresh seeded world for a fixed number of steps,
// steered by a simple autopilot (drive along a road toward the mission marker,
// keep clear of buildings, steal the nearest car), so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const DRIVE_SECONDS = 14;
const CHASE_SECONDS = 12;
const MISSION_SECONDS = 10;

function driveControls(world) {
  const p = world.state.player;
  const target = world.state.missionTarget || { x: 2100, y: 300 };
  const car = p.inCar;
  if (!car) return { up: false, down: false, left: false, right: false, shoot: false, enter: true, aimAngle: null };
  const want = Math.atan2(target.y - car.y, target.x - car.x);
  let diff = want - car.angle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
  return { up: true, down: false, left: diff < -0.12, right: diff > 0.12, shoot: false, enter: false, aimAngle: null };
}
function walkControls(world) {
  const p = world.state.player;
  const target = world.state.missionTarget || { x: 1200, y: 900 };
  const want = Math.atan2(target.y - p.y, target.x - p.x);
  const dx = Math.cos(want); const dy = Math.sin(want);
  return { up: dy < -0.4, down: dy > 0.4, left: dx < -0.4, right: dx > 0.4, shoot: false, enter: false, aimAngle: want };
}

/**
 * Set `world` to the named scene (start, drive, chase or mission; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'drive' && name !== 'chase' && name !== 'mission') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { up: false, down: false, left: false, right: false, shoot: false, enter: false, aimAngle: null });
    return { screen: SCREEN_TITLE, best: 1250 };
  }
  if (name === 'drive') {
    for (let i = 0; i < DRIVE_SECONDS / STEP; i += 1) world.step(STEP, driveControls(world));
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'chase') {
    world.startMission(); world.state.player.wanted = 3;
    for (let i = 0; i < CHASE_SECONDS / STEP; i += 1) world.step(STEP, driveControls(world));
    world.state.player.wanted = 3; // hold the heat for the frame, even if it faded
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  world.startMission();
  world.state.player.x = 1500; world.state.player.y = 600;
  for (let i = 0; i < MISSION_SECONDS / STEP; i += 1) world.step(STEP, walkControls(world));
  return { screen: SCREEN_PLAY, best: 1250 };
}
export function shotNames() { return ['start', 'drive', 'chase', 'mission']; }
