/**
 * createPanZoom — framework-agnostic pan/zoom input handler.
 *
 * Attaches wheel and pointer listeners to `element`, maintains an internal
 * camera { x, y, scale }, and calls `onChange(camera)` after every update.
 *
 * @param {HTMLElement} element
 * @param {object}  options
 * @param {function} options.onChange        - Called with { x, y, scale } on every update.
 * @param {{ x, y, scale }} [options.initialCamera] - Starting camera state.
 * @param {number}  [options.minScale=0.05]  - Minimum allowed scale.
 * @param {number}  [options.maxScale=64]    - Maximum allowed scale.
 * @returns {{ getCamera, setCamera, destroy }}
 */
export function createPanZoom(element, options = {}) {
  const {
    onChange,
    initialCamera = { x: 0, y: 0, scale: 1 },
    minScale = 0.05,
    maxScale = 64,
  } = options;

  let camera = { ...initialCamera };

  // Pointer tracking
  const pointers = new Map();
  let lastPinchDist = null;
  let lastPinchMid = null;
  let lastPanPos = null;

  function clampScale(s) {
    return Math.min(maxScale, Math.max(minScale, s));
  }

  function notify() {
    onChange?.(camera);
  }

  // ---------------------------------------------------------------------------
  // Wheel: pan (scroll) or zoom (Ctrl+scroll / trackpad pinch)
  // ---------------------------------------------------------------------------
  function onWheel(e) {
    e.preventDefault();

    if (e.ctrlKey) {
      // Trackpad pinch or Ctrl+scroll — zoom around cursor
      const rect = element.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const zf = clampScale(camera.scale * Math.exp(-e.deltaY * 0.005)) / camera.scale;

      camera = {
        x: cx - (cx - camera.x) * zf,
        y: cy - (cy - camera.y) * zf,
        scale: camera.scale * zf,
      };
    } else {
      // Trackpad two-finger scroll or plain mouse wheel — pan
      camera = {
        ...camera,
        x: camera.x - e.deltaX,
        y: camera.y - e.deltaY,
      };
    }

    notify();
  }

  // ---------------------------------------------------------------------------
  // Pointer: single pointer pans, two pointers pinch-zoom
  // ---------------------------------------------------------------------------
  function onPointerDown(e) {
    element.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, e);

    if (pointers.size === 1) {
      lastPanPos = { x: e.clientX, y: e.clientY };
    }
    // Reset pinch state whenever the active finger count changes
    lastPinchDist = null;
    lastPinchMid = null;
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);

    const pts = [...pointers.values()];

    if (pts.length === 1) {
      if (!lastPanPos) return;
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      camera = { ...camera, x: camera.x + dx, y: camera.y + dy };
      lastPanPos = { x: e.clientX, y: e.clientY };
      notify();
    } else if (pts.length === 2) {
      const [p1, p2] = pts;
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const mid = {
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
      };

      if (lastPinchDist !== null) {
        const rect = element.getBoundingClientRect();
        const rawZf = dist / lastPinchDist;
        const zf = clampScale(camera.scale * rawZf) / camera.scale;

        // Current and previous midpoints in element-local coords
        const mx = mid.x - rect.left;
        const my = mid.y - rect.top;
        const lmx = lastPinchMid.x - rect.left;
        const lmy = lastPinchMid.y - rect.top;

        // Zoom around previous midpoint, then translate to new midpoint
        camera = {
          x: mx - (lmx - camera.x) * zf,
          y: my - (lmy - camera.y) * zf,
          scale: camera.scale * zf,
        };
        notify();
      }

      lastPinchDist = dist;
      lastPinchMid = mid;
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    lastPinchDist = null;
    lastPinchMid = null;

    const pts = [...pointers.values()];
    lastPanPos = pts.length === 1 ? { x: pts[0].clientX, y: pts[0].clientY } : null;
  }

  // ---------------------------------------------------------------------------
  // Attach listeners
  // ---------------------------------------------------------------------------
  element.style.touchAction = 'none';
  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    getCamera: () => ({ ...camera }),

    setCamera: (cam) => {
      camera = {
        x: cam.x ?? camera.x,
        y: cam.y ?? camera.y,
        scale: cam.scale != null ? clampScale(cam.scale) : camera.scale,
      };
      notify();
    },

    destroy: () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
