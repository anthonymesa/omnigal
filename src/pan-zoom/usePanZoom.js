import { useEffect, useRef } from 'react';
import { createPanZoom } from './panZoom';

/**
 * usePanZoom — React hook wrapping createPanZoom.
 *
 * Attaches pan/zoom input handling to `ref.current` and calls `onUpdate`
 * after every camera change. Does NOT hold React state internally — the
 * caller decides whether to store the camera in a ref (for canvas drawing)
 * or in useState (for reactive UI).
 *
 * @param {React.RefObject<HTMLElement>} ref
 * @param {object}   options
 * @param {function} options.onUpdate          - Called with { x, y, scale } on every change.
 * @param {{ x, y, scale }} [options.initialCamera]
 * @param {number}   [options.minScale]
 * @param {number}   [options.maxScale]
 * @returns {{ getCamera, setCamera }}         - Imperative controls.
 */
export function usePanZoom(ref, options = {}) {
  // Keep a stable ref to options so the effect doesn't need to re-run when
  // the caller passes a new inline object/function each render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const instanceRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    instanceRef.current = createPanZoom(el, {
      initialCamera: optionsRef.current.initialCamera,
      minScale: optionsRef.current.minScale,
      maxScale: optionsRef.current.maxScale,
      onChange: (camera) => optionsRef.current.onUpdate?.(camera),
    });

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [ref]);

  return {
    getCamera: () => instanceRef.current?.getCamera(),
    setCamera: (cam) => instanceRef.current?.setCamera(cam),
  };
}
