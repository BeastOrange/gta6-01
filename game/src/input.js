// Keyboard and mouse state, with edge-triggered "just pressed" keys.
// One job: turn browser events into a clean per-frame input snapshot.

export function createInput() {
  const input = {
    down: new Set(),
    pressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    anyKey: false,
  };

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.code);
    input.down.add(event.code);
    input.anyKey = true;
  }

  function onKeyUp(event) {
    input.down.delete(event.code);
  }

  function onMouseMove(event) {
    input.mouseX = event.clientX;
    input.mouseY = event.clientY;
  }

  function onMouseDown(event) {
    input.mouseDown = true;
    input.mouseX = event.clientX;
    input.mouseY = event.clientY;
  }

  function onMouseUp() {
    input.mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', () => input.down.clear());

  input.isDown = (code) => input.down.has(code);
  input.wasPressed = (code) => input.pressed.has(code);
  // Call once per frame after the game has read the input.
  input.endFrame = () => {
    input.pressed.clear();
    input.anyKey = false;
  };
  input.axis = () => {
    let x = 0;
    let y = 0;
    if (input.down.has('KeyA') || input.down.has('ArrowLeft')) x -= 1;
    if (input.down.has('KeyD') || input.down.has('ArrowRight')) x += 1;
    if (input.down.has('KeyW') || input.down.has('ArrowUp')) y -= 1;
    if (input.down.has('KeyS') || input.down.has('ArrowDown')) y += 1;
    return { x, y };
  };
  return input;
}
