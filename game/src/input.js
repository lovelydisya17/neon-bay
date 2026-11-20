// Keyboard and pointer input for Neon Bay. Held keys give movement and driving;
// one-shot presses (enter a car, pause, mute, confirm) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost and
// never counted twice. The mouse aims on foot and shoots with a click.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_NEW = 8;
export const ACTION_CONTINUE = 16;
export const ACTION_ENTER = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target, getCamera) {
  let up = false; let down = false; let left = false; let right = false;
  let shoot = false; let spaceHeld = false; let actions = 0; let mouseX = 0; let mouseY = 0; let mouseDown = false;
  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; spaceHeld = true; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (event.code === 'KeyM') { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (event.code === 'KeyN') { if (!event.repeat) actions |= ACTION_NEW; }
    else if (event.code === 'KeyC') { if (!event.repeat) actions |= ACTION_CONTINUE; }
    else if (event.code === 'KeyE') { if (!event.repeat) actions |= ACTION_ENTER; }
    else if (event.code === 'KeyR') { if (!event.repeat) actions |= ACTION_NEW; }
    else return;
    if (CONFIRM.has(event.code) || UP.has(event.code) || DOWN.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (CONFIRM.has(event.code)) spaceHeld = false;
  });
  window.addEventListener('blur', () => { up = down = left = right = false; mouseDown = false; });
  target.addEventListener('pointermove', (event) => { mouseX = event.clientX; mouseY = event.clientY; });
  target.addEventListener('pointerdown', (event) => { mouseDown = true; mouseX = event.clientX; mouseY = event.clientY; actions |= ACTION_CONFIRM; });
  target.addEventListener('pointerup', () => { mouseDown = false; });
  return {
    controls(player) {
      let aimAngle = null;
      if (!player.inCar && getCamera) {
        const cam = getCamera();
        const wx = (mouseX * (cam.ratio || 1)) / cam.scale - cam.viewX / cam.scale + cam.x;
        const wy = (mouseY * (cam.ratio || 1)) / cam.scale - cam.viewY / cam.scale + cam.y;
        if (mouseX || mouseY) aimAngle = Math.atan2(wy - player.y, wx - player.x);
      }
      return { up, down, left, right, shoot: shoot || mouseDown, enter: false, aimAngle };
    },
    isShooting() { return mouseDown || spaceHeld; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
