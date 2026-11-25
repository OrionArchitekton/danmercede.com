import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

type LayerId = 'L1' | 'L2' | 'L3' | 'L4';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface PolyFace {
  indices: number[];
  layer: LayerId;
}

const LAYER_TARGETS: Record<LayerId, { yaw: number; pitch: number; label: string }> = {
  L1: { yaw: 0.42, pitch: -0.34, label: 'Apex Gate Plane' },
  L2: { yaw: 1.24, pitch: -0.22, label: 'Meridian Receipt Ring' },
  L3: { yaw: -1.12, pitch: 0.28, label: 'Drift Envelope Shell' },
  L4: { yaw: -0.38, pitch: 0.46, label: 'Substrate Core Boundary' },
};

const T = 0.62;
const VERTS: Vec3[] = [
  { x: 0, y: -1.12, z: 0 },
  { x: 0, y: 1.12, z: 0 },
  { x: T, y: -0.52, z: T },
  { x: -T, y: -0.52, z: T },
  { x: -T, y: -0.52, z: -T },
  { x: T, y: -0.52, z: -T },
  { x: T, y: 0.52, z: T },
  { x: -T, y: 0.52, z: T },
  { x: -T, y: 0.52, z: -T },
  { x: T, y: 0.52, z: -T },
  { x: 1.05, y: 0, z: 0 },
  { x: 0, y: 0, z: 1.05 },
  { x: -1.05, y: 0, z: 0 },
  { x: 0, y: 0, z: -1.05 },
];

const FACES: PolyFace[] = [
  { indices: [0, 3, 2], layer: 'L1' },
  { indices: [0, 4, 3], layer: 'L1' },
  { indices: [0, 5, 4], layer: 'L1' },
  { indices: [0, 2, 5], layer: 'L1' },
  { indices: [2, 3, 11], layer: 'L2' },
  { indices: [3, 7, 11], layer: 'L2' },
  { indices: [11, 7, 6], layer: 'L2' },
  { indices: [2, 11, 6], layer: 'L2' },
  { indices: [2, 6, 10], layer: 'L2' },
  { indices: [5, 2, 10], layer: 'L2' },
  { indices: [9, 5, 10], layer: 'L2' },
  { indices: [6, 9, 10], layer: 'L2' },
  { indices: [3, 4, 12], layer: 'L3' },
  { indices: [4, 8, 12], layer: 'L3' },
  { indices: [8, 7, 12], layer: 'L3' },
  { indices: [7, 3, 12], layer: 'L3' },
  { indices: [4, 5, 13], layer: 'L3' },
  { indices: [5, 9, 13], layer: 'L3' },
  { indices: [9, 8, 13], layer: 'L3' },
  { indices: [8, 4, 13], layer: 'L3' },
  { indices: [1, 6, 7], layer: 'L4' },
  { indices: [1, 7, 8], layer: 'L4' },
  { indices: [1, 8, 9], layer: 'L4' },
  { indices: [1, 9, 6], layer: 'L4' },
];

const ANCHOR_NODES: { id: LayerId; vi: number }[] = [
  { id: 'L1', vi: 0 },
  { id: 'L2', vi: 10 },
  { id: 'L3', vi: 12 },
  { id: 'L4', vi: 1 },
];

function rotatePoint(p: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x1 = p.x * cy - p.z * sy;
  const z1 = p.x * sy + p.z * cy;
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  return { x: x1, y: y2, z: z2 };
}

function projectPoint(p: Vec3): { x: number; y: number; z: number } {
  const fov = 3.2;
  const scale = 98 * (fov / (fov - p.z * 0.45));
  return {
    x: 150 + p.x * scale,
    y: 150 + p.y * scale,
    z: p.z,
  };
}

function mixRgba(a: [number, number, number], b: [number, number, number], t: number, alpha: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * clamp);
  const g = Math.round(a[1] + (b[1] - a[1]) * clamp);
  const bl = Math.round(a[2] + (b[2] - a[2]) * clamp);
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

export const MeridianPolyhedronStage: React.FC<{
  activeLayer: LayerId;
  onSelectLayer?: (id: LayerId) => void;
}> = ({ activeLayer, onSelectLayer }) => {
  const target = LAYER_TARGETS[activeLayer];
  const [angles, setAngles] = useState<{ yaw: number; pitch: number }>({
    yaw: target.yaw,
    pitch: target.pitch,
  });
  const anglesRef = useRef(angles);
  anglesRef.current = angles;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    baseYaw: number;
    basePitch: number;
    moved: boolean;
  } | null>(null);

  // Finite spring transition only when selected layer changes (no perpetual RAF loop).
  useEffect(() => {
    const dest = LAYER_TARGETS[activeLayer];
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setAngles({ yaw: dest.yaw, pitch: dest.pitch });
      return;
    }

    const from = anglesRef.current;
    const startTime = performance.now();
    const duration = 380;
    let raf = 0;

    const step = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - elapsed, 3);
      setAngles({
        yaw: from.yaw + (dest.yaw - from.yaw) * ease,
        pitch: from.pitch + (dest.pitch - from.pitch) * ease,
      });
      if (elapsed < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [activeLayer]);

  const projectedAnchors = useMemo(() => {
    return ANCHOR_NODES.map((a) => {
      const p = projectPoint(rotatePoint(VERTS[a.vi], angles.yaw, angles.pitch));
      return { id: a.id, x: p.x, y: p.y };
    });
  }, [angles.pitch, angles.yaw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const size = 300;
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // Outer calibrated meridian ring
    ctx.save();
    ctx.strokeStyle = 'rgba(230, 130, 73, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(150, 150, 130, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const rotVerts = VERTS.map((v) => rotatePoint(v, angles.yaw, angles.pitch));
    const projVerts = rotVerts.map(projectPoint);
    const lightDir = { x: 0.55, y: -0.62, z: 0.56 };

    const drawRing3d = (pts: Vec3[], stroke: string, dash: number[] = []) => {
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      if (dash.length) ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach((pt, idx) => {
        const p = projectPoint(rotatePoint(pt, angles.yaw, angles.pitch));
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const eqPts = Array.from({ length: 40 }, (_, i) => {
      const th = (i / 40) * Math.PI * 2;
      return { x: Math.cos(th) * 1.24, y: 0, z: Math.sin(th) * 1.24 };
    });
    const merPts = Array.from({ length: 40 }, (_, i) => {
      const th = (i / 40) * Math.PI * 2;
      return { x: Math.cos(th) * 1.24, y: Math.sin(th) * 1.24, z: 0 };
    });

    drawRing3d(eqPts, 'rgba(255, 192, 139, 0.3)', [4, 4]);
    drawRing3d(merPts, 'rgba(148, 163, 184, 0.24)');

    const sortedFaces = FACES.map((face) => {
      const a = rotVerts[face.indices[0]];
      const b = rotVerts[face.indices[1]];
      const c = rotVerts[face.indices[2]];
      const ux = b.x - a.x;
      const uy = b.y - a.y;
      const uz = b.z - a.z;
      const vx = c.x - a.x;
      const vy = c.y - a.y;
      const vz = c.z - a.z;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      if (nx * a.x + ny * a.y + nz * a.z < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const avgZ = (a.z + b.z + c.z) / 3;
      const diff = Math.max(0, nx * lightDir.x + ny * lightDir.y + nz * lightDir.z);
      return {
        face,
        z: avgZ + (nz > 0 ? 0.2 : -0.2),
        diff,
      };
    }).sort((p, q) => p.z - q.z);

    for (const item of sortedFaces) {
      const active = item.face.layer === activeLayer;
      const pts = item.face.indices.map((vi) => projVerts[vi]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.fillStyle = active
        ? mixRgba([122, 54, 24], [255, 192, 139], 0.25 + item.diff * 0.72, 0.94)
        : mixRgba([4, 15, 48], [26, 48, 98], 0.2 + item.diff * 0.65, 0.88);
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineWidth = active ? 1.35 : 0.75;
      ctx.strokeStyle = active ? '#FFC08B' : 'rgba(230, 130, 73, 0.36)';
      ctx.stroke();
    }

    // Cardinal layer vertices
    for (const node of projectedAnchors) {
      const selected = node.id === activeLayer;
      ctx.beginPath();
      ctx.arc(node.x, node.y, selected ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = selected ? '#FFC08B' : '#07143A';
      ctx.fill();
      ctx.lineWidth = selected ? 2 : 1.25;
      ctx.strokeStyle = '#E68249';
      ctx.stroke();
    }
  }, [activeLayer, angles.pitch, angles.yaw, projectedAnchors]);

  const nudge = (deltaYaw: number) => {
    setAngles((prev) => ({ ...prev, yaw: prev.yaw + deltaYaw }));
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-full max-w-[300px] aspect-square touch-none cursor-grab active:cursor-grabbing select-none rounded-md border border-copper-500/25 bg-[radial-gradient(circle_at_48%_42%,rgba(230,130,73,0.14),rgba(2,11,41,0.92)_72%)]"
        onPointerDown={(e) => {
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            baseYaw: angles.yaw,
            basePitch: angles.pitch,
            moved: false,
          };
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
          setAngles({
            yaw: dragRef.current.baseYaw + dx * 0.012,
            pitch: Math.max(-1.05, Math.min(1.05, dragRef.current.basePitch + dy * 0.012)),
          });
        }}
        onPointerUp={(e) => {
          if (dragRef.current && !dragRef.current.moved && onSelectLayer) {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * 300;
            const py = ((e.clientY - rect.top) / rect.height) * 300;
            let best: LayerId | null = null;
            let bestDist = 42;
            for (const node of projectedAnchors) {
              const dist = Math.hypot(node.x - px, node.y - py);
              if (dist < bestDist) {
                bestDist = dist;
                best = node.id;
              }
            }
            if (best) onSelectLayer(best);
          }
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          role="img"
          aria-label={`Interactive 3D Meridian polyhedron focused on ${activeLayer}: ${target.label}`}
          className="h-full w-full block"
        />
        <span className="pointer-events-none absolute left-2.5 bottom-2 font-mono text-xs text-slate-300">
          Drag to orbit · {target.label}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-2" role="group" aria-label="Orbit 3D Meridian solid">
        <button
          type="button"
          onClick={() => nudge(-0.52)}
          aria-label="Rotate left -30 deg"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm border border-white/15 bg-navy-midnight/85 px-2.5 text-xs font-mono text-slate-200 hover:border-copper-300/60 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
          -30 deg
        </button>
        <button
          type="button"
          onClick={() => setAngles({ yaw: target.yaw, pitch: target.pitch })}
          className="inline-flex min-h-[44px] items-center justify-center rounded-sm border border-white/15 bg-navy-midnight/85 px-3 text-xs font-mono text-copper-300 hover:border-copper-300/60 hover:text-white transition-colors"
        >
          Align {activeLayer}
        </button>
        <button
          type="button"
          onClick={() => nudge(0.52)}
          aria-label="Rotate right +30 deg"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm border border-white/15 bg-navy-midnight/85 px-2.5 text-xs font-mono text-slate-200 hover:border-copper-300/60 hover:text-white transition-colors"
        >
          +30 deg
          <RotateCw className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default MeridianPolyhedronStage;
