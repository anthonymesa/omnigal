
import React, {
        useRef,
        useEffect,
        useState,
        useCallback,
        useLayoutEffect
} from 'react';
import potpack from 'potpack';
import random from 'random';
import { usePanZoom } from './pan-zoom/usePanZoom';

const randomColor = require('random-color');

function App() {
        const rootRef = useRef(null);
        const canvasRef = useRef(null);
        const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

        const tileCount = useRef(random.int(10, 200));
        const tiles = useRef(null);

        // Camera stored in a ref — draw() reads it directly, no React re-render needed
        const camera = useRef({ x: 0, y: 0, scale: 1 });

        // Pack tiles once on mount
        useLayoutEffect(() => {
                const rawTiles = Array.from({ length: tileCount.current }, () => ({
                        w: random.int(180, 720),
                        h: random.int(256, 512),
                        color: randomColor().hexString(),
                }));
                potpack(rawTiles);
                tiles.current = rawTiles;
        }, []);

        // Measure canvas container and keep it in sync with window size
        useLayoutEffect(() => {
                const el = rootRef.current;
                if (!el) return;
                const observer = new ResizeObserver(([entry]) => {
                        const { width, height } = entry.contentRect;
                        setCanvasSize({ width, height });
                });
                observer.observe(el);
                return () => observer.disconnect();
        }, []);

        const draw = useCallback(() => {
                const canvas = canvasRef.current;
                if (!canvas || !tiles.current) return;
                const ctx = canvas.getContext('2d');
                const { x, y, scale } = camera.current;

                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.setTransform(scale, 0, 0, scale, x, y);

                for (const tile of tiles.current) {
                        ctx.fillStyle = tile.color;
                        ctx.fillRect(tile.x + 10, tile.y + 10, tile.w - 10, tile.h - 10);
                }
        }, []);

        // Pan/zoom input — update camera ref then redraw
        usePanZoom(canvasRef, {
                onUpdate: (cam) => {
                        camera.current = cam;
                        draw();
                },
        });

        // Redraw when canvas size changes
        useEffect(() => {
                draw();
        }, [canvasSize, draw]);

        return (
                <div
                        ref={rootRef}
                        style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                top: 0,
                                left: 0
                        }}
                >
                        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} />
                </div>
        );
}

export default App;
