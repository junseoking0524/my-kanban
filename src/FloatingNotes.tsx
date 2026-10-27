import { useRef } from "react";
export type FloatingNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  title?: string;
  kind?: "summary";
  sourceIds?: string[];
};
export function PositionHandle({
  x,
  y,
  zoom,
  offsetX = 0,
  offsetY = 0,
  onCommit,
}: {
  x: number;
  y: number;
  zoom: number;
  offsetX?: number;
  offsetY?: number;
  onCommit: (x: number, y: number) => void;
}) {
  const start = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  return (
    <button
      className="mm-position-handle"
      aria-label="박스 위치 이동"
      title="드래그하여 위치 이동"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start.current = { x, y, px: e.clientX, py: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        e.stopPropagation();
        const el = e.currentTarget.parentElement!;
        el.style.left = `${Math.max(110, Math.min(19000, s.x + (e.clientX - s.px) / zoom)) - offsetX}px`;
        el.style.top = `${Math.max(80, Math.min(19000, s.y + (e.clientY - s.py) / zoom)) - offsetY}px`;
      }}
      onPointerUp={(e) => {
        const s = start.current;
        if (!s) return;
        start.current = null;
        e.stopPropagation();
        e.currentTarget.releasePointerCapture(e.pointerId);
        onCommit(
          Math.max(110, Math.min(19000, s.x + (e.clientX - s.px) / zoom)),
          Math.max(80, Math.min(19000, s.y + (e.clientY - s.py) / zoom)),
        );
      }}
      onPointerCancel={(e) => {
        if (start.current) {
          const el = e.currentTarget.parentElement!;
          el.style.left = `${x - offsetX}px`;
          el.style.top = `${y - offsetY}px`;
        }
        start.current = null;
      }}
    >
      ⠿
    </button>
  );
}
export default function FloatingNotes({
  notes,
  zoom,
  onChange,
  onDelete,
}: {
  notes: FloatingNote[];
  zoom: number;
  onChange: (id: string, patch: Partial<FloatingNote>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {notes.map((n) => (
        <div
          className={`mm-floating mm-node ${n.kind === "summary" ? "mm-summary-card" : ""}`}
          key={n.id}
          style={{
            left: n.x,
            top: n.y,
            background: n.color,
            borderColor: "#e0bf67",
          }}
        >
          <PositionHandle
            x={n.x}
            y={n.y}
            zoom={zoom}
            onCommit={(x, y) => onChange(n.id, { x, y })}
          />
          <div className="mm-floating-heading">
            {n.kind === "summary" ? "Σ 서머리" : "독립 메모"}{" "}
            <button aria-label="독립 메모 삭제" onClick={() => onDelete(n.id)}>
              ×
            </button>
          </div>
          {n.kind === "summary" && (
            <input
              aria-label="서머리 이름"
              value={n.title || "서머리"}
              onChange={(e) => onChange(n.id, { title: e.target.value })}
            />
          )}
          <textarea
            aria-label={n.kind === "summary" ? "서머리 내용" : "독립 메모 내용"}
            placeholder="아이디어나 메모를 자유롭게 적으세요"
            value={n.text}
            onChange={(e) => onChange(n.id, { text: e.target.value })}
          />
          {n.kind === "summary" && (
            <small className="mm-summary-source-count">
              근거 노드 {n.sourceIds?.length || 0}개 · 내용 스냅샷
            </small>
          )}
          <select
            aria-label="독립 메모 색상"
            value={n.color}
            onChange={(e) => onChange(n.id, { color: e.target.value })}
          >
            <option value="#fff4bf">노랑</option>
            <option value="#dff4e8">초록</option>
            <option value="#e7eafd">보라</option>
            <option value="#ffe5e7">분홍</option>
          </select>
        </div>
      ))}
    </>
  );
}
