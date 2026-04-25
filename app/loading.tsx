"use client";

import { useEffect, useRef } from "react";

const TW = 8;
const TH = 8;
const TILES_PER_FRAME = 6;
const HOLD_FRAMES = 18;

function buildSpiralOrder(rows: number, cols: number): [number, number][] {
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const result: [number, number][] = [];
  let r = Math.floor(rows / 2);
  let c = Math.floor(cols / 2);
  const dirs: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  let d = 0, steps = 1, stepCount = 0, turns = 0;
  result.push([r, c]);
  visited[r][c] = true;
  const total = cols * rows;
  while (result.length < total) {
    const nr = r + dirs[d][0];
    const nc = c + dirs[d][1];
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
      r = nr; c = nc;
      visited[r][c] = true;
      result.push([r, c]);
      stepCount++;
      if (stepCount === steps) {
        stepCount = 0;
        d = (d + 1) % 4;
        turns++;
        if (turns % 2 === 0) steps++;
      }
    } else {
      d = (d + 1) % 4;
      turns++;
      if (turns % 2 === 0) steps++;
      stepCount = 0;
    }
  }
  return result;
}

export default function Loading() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const canvasEl = canvas;
    const containerEl = container;
    const context = ctx;

    let cols = 0;
    let rows = 0;
    let spiralOrder: [number, number][] = [];
    const blackTiles = new Set<number>();
    let phase: "in" | "hold" | "out" = "in";
    let tileIdx = 0;
    let holdCount = 0;
    let rafId: number;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let backgroundColor = getComputedStyle(containerEl).backgroundColor;

    function syncCanvasToViewport() {
      const dpr = window.devicePixelRatio || 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      viewportWidth = vw;
      viewportHeight = vh;
      backgroundColor = getComputedStyle(containerEl).backgroundColor;

      canvasEl.width = Math.max(1, Math.floor(vw * dpr));
      canvasEl.height = Math.max(1, Math.floor(vh * dpr));
      canvasEl.style.width = `${vw}px`;
      canvasEl.style.height = `${vh}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const nextCols = Math.max(1, Math.ceil(vw / TW));
      const nextRows = Math.max(1, Math.ceil(vh / TH));
      if (nextCols !== cols || nextRows !== rows) {
        cols = nextCols;
        rows = nextRows;
        spiralOrder = buildSpiralOrder(rows, cols);
        blackTiles.clear();
        phase = "in";
        tileIdx = 0;
        holdCount = 0;
      }
    }

    function fillTile(row: number, col: number) {
      context.fillStyle = "#000000";
      context.fillRect(col * TW, row * TH, TW, TH);
    }

    function render() {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, viewportWidth, viewportHeight);

      // Draw black swirl tiles on top
      blackTiles.forEach((idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        fillTile(row, col);
      });
    }

    function tick() {
      if (phase === "in") {
        for (let i = 0; i < TILES_PER_FRAME && tileIdx < spiralOrder.length; i++, tileIdx++) {
          const [r, c] = spiralOrder[tileIdx];
          blackTiles.add(r * cols + c);
        }
        if (tileIdx >= spiralOrder.length) {
          phase = "hold";
          holdCount = 0;
        }
      } else if (phase === "hold") {
        holdCount++;
        if (holdCount >= HOLD_FRAMES) {
          phase = "out";
          tileIdx = 0;
        }
      } else if (phase === "out") {
        for (let i = 0; i < TILES_PER_FRAME && tileIdx < spiralOrder.length; i++, tileIdx++) {
          const [r, c] = spiralOrder[tileIdx];
          blackTiles.delete(r * cols + c);
        }
        if (tileIdx >= spiralOrder.length) {
          phase = "in";
          tileIdx = 0;
          blackTiles.clear();
        }
      }

      render();
      rafId = requestAnimationFrame(() => tick());
      return rafId;
    }

    syncCanvasToViewport();
    render();
    rafId = requestAnimationFrame(() => tick());
    window.addEventListener("resize", syncCanvasToViewport);
    const themeObserver = new MutationObserver(() => {
      backgroundColor = getComputedStyle(containerEl).backgroundColor;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", syncCanvasToViewport);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-background"
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: "pixelated",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}