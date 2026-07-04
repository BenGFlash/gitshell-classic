import { useRef, useEffect } from "react";

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789<>/{}[]|&^%$#@!";

interface Drop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  len: number;
}

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let drops: Drop[] = [];
    const FONT_SIZE = 18;
    const COL_W = FONT_SIZE + 4;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.floor(window.innerWidth / COL_W);
      drops = Array.from({ length: cols }, (_, i) => ({
        x: i * COL_W,
        y: Math.random() * window.innerHeight * -1,
        speed: 0.8 + Math.random() * 1.8,
        chars: Array.from({ length: 12 + Math.floor(Math.random() * 18) }, () =>
          CHARS[Math.floor(Math.random() * CHARS.length)]
        ),
        len: 12 + Math.floor(Math.random() * 18),
      }));
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx.fillStyle = "rgba(5, 5, 5, 0.055)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(0, 255, 65, 0.3)";

      for (const drop of drops) {
        const alpha = 0.35 + Math.random() * 0.15;

        for (let i = 0; i < drop.len; i++) {
          const y = drop.y - i * (FONT_SIZE + 2);
          if (y < 0 || y > window.innerHeight) continue;

          const char = drop.chars[i % drop.chars.length];
          const isHead = i === 0;
          const isTail = i === drop.len - 1;

          if (isHead) {
            ctx.shadowColor = "rgba(200, 255, 200, 0.6)";
            ctx.fillStyle = `rgba(220, 255, 220, ${alpha + 0.2})`;
          } else if (isTail) {
            ctx.shadowColor = "rgba(0, 240, 255, 0.3)";
            ctx.fillStyle = `rgba(0, 240, 255, ${alpha * 0.35})`;
          } else if (Math.random() < 0.15) {
            ctx.shadowColor = "rgba(0, 240, 255, 0.5)";
            ctx.fillStyle = `rgba(0, 240, 255, ${alpha * 0.7})`;
          } else {
            ctx.shadowColor = "rgba(0, 255, 65, 0.3)";
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          }

          ctx.fillText(char, drop.x, y);
        }

        drop.y += drop.speed;

        if (drop.y - drop.len * (FONT_SIZE + 2) > window.innerHeight) {
          drop.y = -drop.len * (FONT_SIZE + 2);
          drop.speed = 0.8 + Math.random() * 1.8;
          drop.len = 12 + Math.floor(Math.random() * 18);
          drop.chars = Array.from({ length: drop.len }, () =>
            CHARS[Math.floor(Math.random() * CHARS.length)]
          );
        }
      }

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
