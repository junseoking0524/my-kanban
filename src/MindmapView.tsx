import { useEffect, useMemo, useRef, useState } from "react";
import {
  download,
  exportXmind,
  findTopic,
  importXmind,
  mapLayout,
  newMap,
  newTopic,
  parentOf,
  uid,
  validateMap,
} from "./mindmap";
import type { MindMap, Topic } from "./mindmap";
import "./mindmap.css";
import FloatingNotes, { PositionHandle } from "./FloatingNotes";
import { summaryDraft } from "./mindmap-summary";
type CardRef = { id: string; title: string; colId: string; boardId: string };
type Props = {
  cards: CardRef[];
  onCreateCard: (title: string, note: string) => Promise<CardRef>;
  onOpenCard: (card: CardRef) => void;
};
const KEY = "kanban.mindmaps.v1";
const ACTIVE_KEY = "kanban.mindmaps.active.v1";
function storedActive() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || "";
  } catch {
    return "";
  }
}
function MapLibrary({
  maps,
  active,
  selected,
  onMap,
  onTopic,
  onFolder,
}: {
  maps: MindMap[];
  active: string;
  selected: string;
  onMap: (id: string) => void;
  onTopic: (mapId: string, id: string) => void;
  onFolder: () => void;
}) {
  const [search, setSearch] = useState("");
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setFolded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const folders = [...new Set(maps.map((m) => m.folder || "미분류"))].sort();
  const branch = (t: Topic, mapId: string, depth = 0): React.ReactNode => (
    <div key={t.id}>
      <div
        className={`mm-tree-row ${active === mapId && selected === t.id ? "is-selected" : ""}`}
        style={{ paddingLeft: 12 + depth * 12 }}
      >
        <button
          className="mm-tree-toggle"
          aria-label={`${t.title} 목록 ${folded.has(t.id) ? "펼치기" : "접기"}`}
          disabled={!t.children.length}
          onClick={() => toggle(t.id)}
        >
          {t.children.length ? (folded.has(t.id) ? "▸" : "▾") : "·"}
        </button>
        <button
          className="mm-tree-name"
          title={t.title}
          onClick={() => onTopic(mapId, t.id)}
        >
          {t.title || "빈 주제"}
        </button>
      </div>
      {!folded.has(t.id) && t.children.map((c) => branch(c, mapId, depth + 1))}
    </div>
  );
  return (
    <div className="mm-library">
      <div className="mm-library-heading">
        <strong>
          마인드맵 보관함 <small>{maps.length}</small>
        </strong>
        <button onClick={onFolder} title="현재 맵을 새 폴더로 이동">
          ＋ 폴더
        </button>
      </div>
      <input
        aria-label="보관함 검색"
        placeholder="맵 이름으로 찾기"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <p className="mm-library-hint">
        새 맵을 만들어도 기존 맵은 여기 보관됩니다.
      </p>
      <div className="mm-library-list">
        {folders.map((folder) => {
          const list = maps.filter(
            (m) =>
              (m.folder || "미분류") === folder &&
              m.title.toLowerCase().includes(search.toLowerCase()),
          );
          if (!list.length) return null;
          return (
            <details key={folder} open>
              <summary>
                📁 {folder} <small>{list.length}</small>
              </summary>
              {list.map((m) => (
                <div key={m.id} className="mm-map-entry">
                  <div
                    className={`mm-tree-row mm-map-row ${active === m.id ? "is-active" : ""}`}
                  >
                    <button
                      className="mm-tree-toggle"
                      aria-label={`${m.title} 주제 목록`}
                      onClick={() => {
                        if (active !== m.id) {
                          onMap(m.id);
                          setFolded((p) => {
                            const n = new Set(p);
                            n.delete(m.id);
                            return n;
                          });
                        } else toggle(m.id);
                      }}
                    >
                      {active !== m.id || folded.has(m.id) ? "▸" : "▾"}
                    </button>
                    <button
                      className="mm-tree-name"
                      title={m.title}
                      onClick={() => onMap(m.id)}
                    >
                      ▧ {m.title || "이름 없는 맵"}
                      {maps.filter((x) => x.title === m.title).length > 1
                        ? ` (${maps.filter((x) => x.title === m.title).findIndex((x) => x.id === m.id) + 1})`
                        : ""}
                      {m.dirty ? " •" : ""}
                    </button>
                  </div>
                  {active === m.id && !folded.has(m.id) && branch(m.root, m.id)}
                </div>
              ))}
            </details>
          );
        })}
        {!maps.some((m) =>
          m.title.toLowerCase().includes(search.toLowerCase()),
        ) && <p>검색 결과가 없습니다.</p>}
      </div>
    </div>
  );
}
function cached(): MindMap[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter(validateMap) : [];
  } catch {
    return [];
  }
}
async function request(method: string, body?: object) {
  const r = await fetch("/api/mindmaps", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error("클라우드 응답을 읽지 못했습니다.");
  }
  if (!r.ok) throw new Error(data.error || "저장 실패");
  return data;
}
export default function MindmapView({
  cards,
  onCreateCard,
  onOpenCard,
}: Props) {
  const [maps, setMaps] = useState<MindMap[]>(cached),
    [active, setActive] = useState(storedActive),
    [selected, setSelected] = useState(""),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [localError, setLocalError] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [zoom, setZoom] = useState(1),
    [linking, setLinking] = useState(false),
    [panning, setPanning] = useState(false),
    [focus, setFocus] = useState(
      () => new URLSearchParams(location.search).get("focus") === "1",
    ),
    [toolsVisible, setToolsVisible] = useState(true),
    [panelVisible, setPanelVisible] = useState(true),
    [connectTo, setConnectTo] = useState(""),
    [connectionLabel, setConnectionLabel] = useState(""),
    [editingId, setEditingId] = useState(""),
    [selectedEdge, setSelectedEdge] = useState(""),
    [picked, setPicked] = useState<string[]>([]),
    [selectMode, setSelectMode] = useState(false),
    [advanced, setAdvanced] = useState(false),
    [linkDraft, setLinkDraft] = useState<{
      from: string;
      x: number;
      y: number;
    } | null>(null),
    [selectionRect, setSelectionRect] = useState<{
      x: number;
      y: number;
      w: number;
      h: number;
    } | null>(null),
    [summary, setSummary] = useState<{
      title: string;
      text: string;
      sourceIds: string[];
    } | null>(null);
  const marquee = useRef<{ x: number; y: number } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const current = maps.find((m) => m.id === active) || maps[0],
    topic = current
      ? findTopic(current.root, selected) || current.root
      : undefined;
  const model = useMemo(() => (current ? mapLayout(current) : null), [current]);
  const history = useRef<
    Record<string, { past: MindMap[]; future: MindMap[] }>
  >({});
  const frame = useRef<HTMLDivElement>(null),
    file = useRef<HTMLInputElement>(null),
    latest = useRef(maps),
    inflight = useRef(false),
    alive = useRef(true),
    drag = useRef("");
  useEffect(() => {
    if (active) {
      try {
        localStorage.setItem(ACTIVE_KEY, active);
      } catch {
        /* optional preference */
      }
    }
  }, [active]);
  useEffect(() => {
    latest.current = maps;
  }, [maps]);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    request("GET")
      .then((d) => {
        if (cancelled) return;
        const remote: MindMap[] = Array.isArray(d.maps)
          ? d.maps.filter(validateMap)
          : [];
        const local = cached();
        const merged = [...remote];
        for (const m of local) {
          const i = merged.findIndex((x) => x.id === m.id);
          if (i < 0) {
            merged.push({ ...m, revision: undefined, dirty: true });
          } else if (m.dirty) {
            if (m.revision === merged[i].revision) merged[i] = m;
            else
              merged.push({
                ...m,
                id: uid(),
                revision: undefined,
                title: m.title + " (복구본)",
                dirty: true,
              });
          }
        }
        setMaps(merged.length ? merged : [newMap()]);
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e.message));
          setReady(true);
          setMaps((p) => (p.length ? p : [newMap()]));
        }
      });
    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(maps));
      queueMicrotask(() => setLocalError(""));
    } catch {
      queueMicrotask(() =>
        setLocalError(
          "브라우저 복구본을 저장할 공간이 부족합니다. 파일 백업을 다운로드해주세요.",
        ),
      );
    }
  }, [maps, ready]);
  useEffect(() => {
    if (!ready || error || inflight.current || !maps.some((m) => m.dirty))
      return;
    const timer = setTimeout(async () => {
      inflight.current = true;
      setBusy(true);
      try {
        for (const snapshot of latest.current.filter((m) => m.dirty)) {
          const result = await request("POST", { map: snapshot });
          if (!alive.current) break;
          setMaps((prev) =>
            prev.map((m) =>
              m.id === snapshot.id
                ? {
                    ...m,
                    revision: result.revision,
                    dirty: m.updatedAt !== snapshot.updatedAt,
                  }
                : m,
            ),
          );
        }
      } catch (e) {
        if (alive.current) setError((e as Error).message);
      } finally {
        inflight.current = false;
        if (alive.current) {
          setBusy(false);
          setRetry((v) => v + 1);
        }
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [maps, ready, error, retry]);
  const viewRef = useRef({ model, zoom, selected });
  useEffect(() => {
    viewRef.current = { model, zoom, selected };
  }, [model, zoom, selected]);
  useEffect(() => {
    const el = frame.current;
    if (!ready || !el) return;
    const reveal = () => {
      const { model, zoom, selected } = viewRef.current;
      if (!model) return;
      const n =
        model.nodes.find((n) => n.topic.id === selected) || model.nodes[0];
      el.scrollLeft = Math.max(0, n.x * zoom - el.clientWidth / 2);
      el.scrollTop = Math.max(0, n.y * zoom - el.clientHeight / 2);
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, current?.mode, ready]);
  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const changeZoom = (next: number, clientX?: number, clientY?: number) => {
    const el = frame.current;
    if (!el) return;
    next = Math.max(0.2, Math.min(2.5, next));
    const rect = el.getBoundingClientRect(),
      x = clientX === undefined ? el.clientWidth / 2 : clientX - rect.left,
      y = clientY === undefined ? el.clientHeight / 2 : clientY - rect.top;
    const old = viewRef.current.zoom,
      px = (el.scrollLeft + x) / old,
      py = (el.scrollTop + y) / old;
    viewRef.current = { ...viewRef.current, zoom: next };
    setZoom(next);
    requestAnimationFrame(() => {
      el.scrollLeft = px * next - x;
      el.scrollTop = py * next - y;
    });
  };
  useEffect(() => {
    const el = frame.current;
    if (!ready || !el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        el.scrollLeft += e.deltaY + e.deltaX;
      } else
        changeZoom(
          viewRef.current.zoom * Math.exp(-e.deltaY * 0.002),
          e.clientX,
          e.clientY,
        );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [ready]);
  const fit = () => {
    const el = frame.current;
    if (!el || !model) return;
    const xs = [
        ...model.nodes.map((n) => n.x),
        ...(current?.floating || []).flatMap((n) => [
          n.x,
          n.x + (n.kind === "summary" ? 320 : 250),
        ]),
      ],
      ys = [
        ...model.nodes.map((n) => n.y),
        ...(current?.floating || []).flatMap((n) => [
          n.y,
          n.y + (n.kind === "summary" ? 330 : 180),
        ]),
      ];
    const minX = Math.min(...xs) - 110,
      maxX = Math.max(...xs) + 110,
      minY = Math.min(...ys) - 70,
      maxY = Math.max(...ys) + 70;
    const z = Math.max(
      0.2,
      Math.min(
        1.5,
        (el.clientWidth - 40) / (maxX - minX),
        (el.clientHeight - 40) / (maxY - minY),
      ),
    );
    viewRef.current = { ...viewRef.current, zoom: z };
    setZoom(z);
    requestAnimationFrame(() =>
      el.scrollTo({
        left: ((minX + maxX) / 2) * z - el.clientWidth / 2,
        top: ((minY + maxY) / 2) * z - el.clientHeight / 2,
        behavior: "smooth",
      }),
    );
  };
  const chooseMap = (id: string) => {
    setPicked([]);
    setEditingId("");
    const map = latest.current.find((m) => m.id === id);
    setActive(id);
    setSelected(map?.root.id || "");
  };
  const chooseTopic = (mapId: string, id: string) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const { model, zoom } = viewRef.current;
        const node = model?.nodes.find((n) => n.topic.id === id),
          el = frame.current;
        if (node && el)
          el.scrollTo({
            left: node.x * zoom - el.clientWidth / 2,
            top: node.y * zoom - el.clientHeight / 2,
            behavior: "smooth",
          });
      }),
    );
    setActive(mapId);
    setSelected(id);
    const map = latest.current.find((m) => m.id === mapId);
    if (map) {
      const copy = structuredClone(map);
      let changed = false;
      const open = (t: Topic): boolean => {
        if (t.id === id) return true;
        for (const c of t.children) {
          if (open(c)) {
            if (t.collapsed) {
              t.collapsed = false;
              changed = true;
            }
            return true;
          }
        }
        return false;
      };
      open(copy.root);
      if (changed)
        setMaps((p) =>
          p.map((m) =>
            m.id === mapId
              ? {
                  ...copy,
                  dirty: true,
                  updatedAt: new Date().toISOString() + uid(),
                }
              : m,
          ),
        );
    }
  };
  const replace = (fn: (m: MindMap) => void, record = true) => {
    if (!current) return;
    const copy = structuredClone(current);
    if (record) {
      const h = history.current[current.id] || { past: [], future: [] };
      h.past.push(structuredClone(current));
      h.past = h.past.slice(-50);
      h.future = [];
      history.current[current.id] = h;
    }
    fn(copy);
    copy.updatedAt = new Date().toISOString() + ":" + uid();
    copy.dirty = true;
    if (!validateMap(copy)) {
      setError("최대 2,000개 주제, 50단계, 800KB까지 저장할 수 있습니다.");
      return;
    }
    setMaps((p) => p.map((m) => (m.id === copy.id ? copy : m)));
  };
  const edit = (fn: (t: Topic) => void) => {
    if (topic)
      replace((m) => {
        const t = findTopic(m.root, topic.id);
        if (t) fn(t);
      });
  };
  const add = (sibling = false) => {
    if (!topic || !current) return;
    const n = newTopic();
    replace((m) => {
      const dest =
        (sibling ? parentOf(m.root, topic.id) : findTopic(m.root, topic.id)) ||
        m.root;
      dest.collapsed = false;
      const i = dest.children.findIndex((c) => c.id === topic.id);
      dest.children.splice(
        sibling && i >= 0 ? i + 1 : dest.children.length,
        0,
        n,
      );
    });
    setSelected(n.id);
    setPicked([n.id]);
    setEditingId(n.id);
  };
  const remove = () => {
    if (!topic || !current || topic.id === current.root.id) return;
    if (
      topic.children.length &&
      !confirm(
        "이 주제와 하위 가지를 삭제할까요? 실행 취소로 복원할 수 있습니다.",
      )
    )
      return;
    const p = parentOf(current.root, topic.id);
    if (p) {
      replace((m) => {
        const parent = findTopic(m.root, p.id)!;
        parent.children = parent.children.filter((c) => c.id !== topic.id);
        const ids = new Set<string>();
        const walk = (t: Topic) => {
          ids.add(t.id);
          t.children.forEach(walk);
        };
        walk(m.root);
        m.links = m.links?.filter((l) => ids.has(l.from) && ids.has(l.to));
      });
      setSelected(p.id);
    }
  };
  const undo = (redo = false) => {
    if (!current) return;
    const h = history.current[current.id];
    const source = redo ? h?.future : h?.past;
    if (!h || !source?.length) return;
    const root = source.pop()!;
    (redo ? h.past : h.future).push(structuredClone(current));
    replace((m) => {
      m.root = root.root;
      m.floating = root.floating;
      m.positions = root.positions;
      m.links = root.links;
      m.mode = root.mode;
      m.layoutPositions = root.layoutPositions;
    }, false);
    setSelected(root.root.id);
  };
  const center = () => {
    if (!model || !frame.current) return;
    setZoom(1);
    frame.current.scrollTo({
      left: model.width / 2 - frame.current.clientWidth / 2,
      top: model.height / 2 - frame.current.clientHeight / 2,
      behavior: "smooth",
    });
  };
  const addMap = () => {
    const m = newMap();
    let index = 1;
    let name = "새 마인드맵";
    while (maps.some((x) => x.title === name)) {
      index++;
      name = `새 마인드맵 ${index}`;
    }
    m.title = name;
    m.root.title = name;
    m.folder = current?.folder;

    setMaps((p) => [...p, m]);
    setActive(m.id);
    setSelected(m.root.id);
  };
  const addFloating = () => {
    if (!model || !frame.current) return;
    const el = frame.current;
    const n = {
      id: uid(),
      text: "",
      x: Math.max(110, (el.scrollLeft + el.clientWidth / 2) / zoom - 120),
      y: Math.max(80, (el.scrollTop + el.clientHeight / 2) / zoom - 40),
      color: "#fff4bf",
    };
    replace((m) => {
      m.floating = [...(m.floating || []), n];
    });
  };
  const setPosition = (id: string, x: number, y: number) =>
    replace((m) => {
      const mode = m.mode || "mindmap";
      const stored =
        m.layoutPositions?.[mode] ||
        (mode === "flow" ? m.positions : undefined) ||
        {};
      const original = model?.nodes.find((n) => n.topic.id === id);
      const group = picked.includes(id) && picked.length > 1 ? picked : [id];
      const next = { ...stored };
      for (const target of group) {
        const n = model?.nodes.find((n) => n.topic.id === target);
        if (!n || !original) continue;
        next[target] = {
          x: Math.max(110, Math.min(19000, n.x + x - original.x)),
          y: Math.max(80, Math.min(19000, n.y + y - original.y)),
        };
      }
      m.layoutPositions = { ...m.layoutPositions, [mode]: next };
      if (mode === "flow") m.positions = next;
    });
  const worldPoint = (x: number, y: number) => {
    const el = frame.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: (x - r.left + el.scrollLeft) / zoom,
      y: (y - r.top + el.scrollTop) / zoom,
    };
  };
  const finishConnection = (from: string, to: string) => {
    if (!current || from === to || !findTopic(current.root, to)) return;
    if (
      (current.links || []).some((l) => l.from === from && l.to === to) ||
      parentOf(current.root, to)?.id === from
    )
      return;
    replace((m) => {
      m.links = [...(m.links || []), { id: uid(), from, to, label: "" }];
    });
  };
  const pickNode = (id: string, multiple: boolean) => {
    setSelectedEdge("");
    setSelected(id);
    setPicked((prev) =>
      multiple
        ? prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
        : [id],
    );
  };
  const renameEdge = () => {
    const edge = model?.edges.find((e) => e.id === selectedEdge);
    if (!edge) return;
    const label = prompt("연결선 이름", edge.label || "");
    if (label === null) return;
    replace((m) => {
      if (selectedEdge.startsWith("tree-")) {
        const t = findTopic(m.root, edge.b);
        if (t) t.edgeLabel = label;
      } else
        m.links = m.links?.map((l) =>
          l.id === selectedEdge ? { ...l, label } : l,
        );
    });
  };
  const removeEdge = () => {
    if (!selectedEdge || selectedEdge.startsWith("tree-")) return;
    replace((m) => {
      m.links = m.links?.filter((l) => l.id !== selectedEdge);
    });
    setSelectedEdge("");
  };
  const startSummary = () => {
    if (!current || picked.length < 2) return;
    const d = summaryDraft(current, picked);
    setSummary({
      title: d.title,
      text: d.text,
      sourceIds: d.topics.map((t) => t.id),
    });
  };
  const saveSummary = () => {
    if (!summary || !model) return;
    const nodes = model.nodes.filter((n) =>
      summary.sourceIds.includes(n.topic.id),
    );
    const x = Math.min(18500, Math.max(...nodes.map((n) => n.x)) + 220),
      y = Math.max(80, Math.min(...nodes.map((n) => n.y)) - 40);
    replace((m) => {
      m.floating = [
        ...(m.floating || []),
        {
          id: uid(),
          kind: "summary",
          title: summary.title,
          text: summary.text,
          sourceIds: summary.sourceIds,
          x,
          y,
          color: "#e7eafd",
        },
      ];
    });
    setSummary(null);
    setPicked([]);
  };
  const dropFlow = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!drag.current || !frame.current) return;
    const el = frame.current,
      r = el.getBoundingClientRect();
    setPosition(
      drag.current,
      Math.max(
        110,
        Math.min(19000, (e.clientX - r.left + el.scrollLeft) / zoom),
      ),
      Math.max(80, Math.min(19000, (e.clientY - r.top + el.scrollTop) / zoom)),
    );
    drag.current = "";
  };
  const allTopics: Topic[] = [];
  if (current) {
    const walk = (t: Topic) => {
      allTopics.push(t);
      t.children.forEach(walk);
    };
    walk(current.root);
  }
  const exitFocus = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    setFocus(false);
    const u = new URL(location.href);
    u.searchParams.delete("focus");
    window.history.replaceState(null, "", u);
  };
  const fullScreen = async () => {
    setFocus(true);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await sectionRef.current?.requestFullscreen();
    } catch {
      /* fixed focus view remains available */
    }
  };
  const newFolder = () => {
    const value = prompt(
      "현재 맵을 보관할 폴더 이름을 입력하세요.",
      current?.folder || "",
    );
    if (value === null || !value.trim()) return;
    replace((m) => {
      m.folder = value.trim().slice(0, 80);
    }, false);
  };
  const importFile = async (f: File) => {
    if (f.size > 20 * 1024 * 1024) {
      alert("20MB 이하의 파일을 선택해주세요.");
      return;
    }
    if (
      !confirm(
        "주제·계층·메모·링크를 가져옵니다. 이미지·첨부·관계선·경계·일부 서식은 가져오거나 다시 내보내지 않습니다. 원본 .xmind 파일을 별도로 보관해주세요. 계속할까요?",
      )
    )
      return;
    try {
      setBusy(true);
      let added: MindMap[];
      if (f.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(await f.text());
        if (
          !Array.isArray(parsed) ||
          !parsed.length ||
          parsed.length > 30 ||
          !parsed.every(validateMap)
        )
          throw new Error("유효한 마인드맵 백업이 아닙니다.");
        added = parsed.map((m) => ({
          ...m,
          id: uid(),
          revision: undefined,
          title: m.title + " (복원)",
          dirty: true,
        }));
      } else {
        added = await importXmind(await f.arrayBuffer());
      }
      setMaps((p) => [...p, ...added]);
      setActive(added[0].id);
      setSelected(added[0].root.id);
    } catch (e) {
      alert("가져오기 실패: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const exportFile = async () => {
    if (!current) return;
    try {
      download(
        await exportXmind(current),
        current.title.replace(/[\\/:*?"<>|]/g, "_") + ".xmind",
      );
    } catch (e) {
      alert("내보내기 실패: " + (e as Error).message);
    }
  };
  const linked = topic?.cardId
    ? cards.find((c) => c.id === topic.cardId && c.boardId === topic.boardId)
    : undefined;
  return (
    <section
      ref={sectionRef}
      className={`mm ${focus ? "mm-focus" : ""} ${!toolsVisible ? "mm-tools-hidden" : ""} ${current?.mode === "graph" ? "mm-galaxy" : "mm-logic-studio"}`}
      aria-label="마인드맵 편집기"
      onKeyDown={(e) => {
        const el = e.target as HTMLElement;
        if (el.matches("input,textarea,select") || e.nativeEvent.isComposing)
          return;
        if (!el.closest(".mm-canvas") || el.closest(".mm-floating")) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          undo(e.shiftKey);
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          add();
        }
        if (e.key === "Enter") {
          e.preventDefault();
          add(true);
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          remove();
        }
        if (e.key === "F2") {
          e.preventDefault();

          setEditingId(topic?.id || "");
        }
      }}
    >
      {focus && (
        <div className="mm-focusbar">
          <strong>{current?.title || "마인드맵 작업실"}</strong>
          <span>집중 작업실</span>
          <button onClick={() => setToolsVisible((v) => !v)}>
            {toolsVisible ? "도구 접기" : "도구 펼치기"}
          </button>
          <button onClick={() => setPanelVisible((v) => !v)}>
            {panelVisible ? "패널 숨기기" : "패널 열기"}
          </button>
          <button onClick={fullScreen}>전체 화면</button>
          <button onClick={exitFocus}>집중 종료</button>
        </div>
      )}
      <div className="mm-toolbar">
        <select
          aria-label="마인드맵 선택"
          value={current?.id || ""}
          onChange={(e) => {
            chooseMap(e.target.value);
          }}
        >
          {maps.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
              {m.dirty ? " •" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            document
              .querySelector(".mm-inspector")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }}
        >
          📁 보관함 보기
        </button>
        {!focus && (
          <>
            <button onClick={() => setFocus(true)}>집중 모드</button>
            <button onClick={fullScreen}>전체 화면</button>
            <a
              className="mm-workroom-link"
              href="?view=mindmap&focus=1"
              target="_blank"
              rel="noreferrer"
            >
              전용 작업실 ↗
            </a>
          </>
        )}
        <button onClick={addMap} disabled={!ready}>
          ＋ 새 맵
        </button>
        <button onClick={() => file.current?.click()} disabled={!ready}>
          .xmind / 백업 가져오기
        </button>
        <input
          ref={file}
          type="file"
          accept=".xmind,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
        <button onClick={exportFile} disabled={!current}>
          .xmind 내보내기
        </button>
        <button
          onClick={() =>
            download(
              new Blob([JSON.stringify(maps, null, 2)], {
                type: "application/json",
              }),
              "mindmaps-backup.json",
            )
          }
        >
          전체 백업
        </button>
        <span className="mm-save" role="status">
          {!ready
            ? "불러오는 중…"
            : error
              ? "클라우드 저장 중단"
              : busy
                ? "처리 중…"
                : maps.some((m) => m.dirty)
                  ? "저장 대기…"
                  : "클라우드 저장 완료"}
        </span>
      </div>
      {(error || localError) && (
        <div className="mm-error" role="alert">
          {error} {localError}{" "}
          {error && (
            <>
              <button
                onClick={() => {
                  setError("");
                  setRetry((v) => v + 1);
                }}
              >
                저장 재시도
              </button>
              <button
                onClick={() => {
                  if (!current) return;
                  const copy = {
                    ...structuredClone(current),
                    id: uid(),
                    title: current.title + " (복사본)",
                    revision: undefined,
                    dirty: true,
                  };
                  setMaps((p) => [
                    ...p.map((m) =>
                      m.id === current.id ? { ...m, dirty: false } : m,
                    ),
                    copy,
                  ]);
                  setActive(copy.id);
                  setError("");
                }}
              >
                현재 맵을 복사본으로 저장
              </button>
            </>
          )}
        </div>
      )}
      {ready && current && model && topic && (
        <>
          <div className="mm-actions">
            {selectedEdge && (
              <>
                <button onClick={renameEdge}>연결 이름 편집</button>
                <button
                  onClick={removeEdge}
                  disabled={selectedEdge.startsWith("tree-")}
                >
                  추가 연결 삭제
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (topic) setEditingId(topic.id);
              }}
            >
              이름 편집 F2
            </button>
            <button
              className={selectMode ? "mm-active-tool" : ""}
              aria-pressed={selectMode}
              onClick={() => {
                setSelectMode((v) => !v);
                setPicked([]);
              }}
            >
              여러 개 선택
            </button>
            <button
              onClick={startSummary}
              disabled={
                picked.length < 2 || (current.floating?.length || 0) >= 100
              }
            >
              Σ 서머리 만들기 ({picked.length})
            </button>
            <button
              onClick={() => setAdvanced((v) => !v)}
              aria-expanded={advanced}
            >
              노드 옵션
            </button>
            <select
              aria-label="정리 방식"
              value={current.mode || "mindmap"}
              onChange={(e) =>
                replace((m) => {
                  m.mode = e.target.value as "mindmap" | "flow" | "graph";
                })
              }
            >
              <option value="mindmap">박스형 로직 트리</option>
              <option value="flow">순서도</option>
              <option value="graph">우주 그래프</option>
            </select>
            <button
              onClick={addFloating}
              disabled={(current.floating?.length || 0) >= 100}
            >
              ＋ 독립 메모
            </button>
            {
              <button
                onClick={() =>
                  replace((m) => {
                    const mode = m.mode || "mindmap";
                    m.layoutPositions = { ...m.layoutPositions, [mode]: {} };
                    if (mode === "flow") m.positions = {};
                  })
                }
              >
                자동 정렬
              </button>
            }
            <input
              aria-label="마인드맵 이름"
              value={current.title}
              onChange={(e) =>
                replace((m) => {
                  m.title = e.target.value;
                }, false)
              }
            />
            <button onClick={() => add()}>
              {current.mode === "flow" ? "다음 단계 Tab" : "하위 주제 Tab"}
            </button>
            <button onClick={() => add(true)}>
              {current.mode === "flow" ? "분기 단계 Enter" : "같은 단계 Enter"}
            </button>
            <button onClick={() => undo()}>↶ 실행 취소</button>
            <button onClick={() => undo(true)}>↷ 다시 실행</button>
            <button onClick={remove} disabled={topic.id === current.root.id}>
              가지 삭제
            </button>
            <div className="mm-zoom">
              <button aria-label="축소" onClick={() => changeZoom(zoom / 1.15)}>
                −
              </button>
              <input
                className="mm-zoom-slider"
                aria-label="확대 비율"
                type="range"
                min="20"
                max="250"
                step="5"
                value={Math.round(zoom * 100)}
                onChange={(e) => changeZoom(Number(e.target.value) / 100)}
              />
              {Math.round(zoom * 100)}%
              <button aria-label="확대" onClick={() => changeZoom(zoom * 1.15)}>
                ＋
              </button>
              <button onClick={center}>중심 보기</button>
              <button onClick={fit}>전체 보기</button>
              <button
                aria-label="왼쪽으로 이동"
                onClick={() =>
                  frame.current?.scrollBy({ left: -240, behavior: "smooth" })
                }
              >
                ←
              </button>
              <button
                aria-label="오른쪽으로 이동"
                onClick={() =>
                  frame.current?.scrollBy({ left: 240, behavior: "smooth" })
                }
              >
                →
              </button>
            </div>
          </div>
          {advanced && (
            <div className="mm-node-options">
              <label>
                선택 노드 이름
                <input
                  id="mm-title"
                  aria-label="선택 노드 이름"
                  value={topic.title}
                  onChange={(e) =>
                    edit((t) => {
                      t.title = e.target.value;
                    })
                  }
                />
              </label>
              <label>
                메모
                <textarea
                  aria-label="메모"
                  value={topic.note || ""}
                  onChange={(e) =>
                    edit((t) => {
                      t.note = e.target.value;
                    })
                  }
                />
              </label>
              <label>
                링크
                <input
                  aria-label="링크"
                  value={topic.href || ""}
                  onChange={(e) =>
                    edit((t) => {
                      t.href = e.target.value;
                    })
                  }
                />
              </label>
              <label>
                색상
                <input
                  type="color"
                  aria-label="노드 색상"
                  value={
                    /^#[0-9a-f]{6}$/i.test(topic.color || "")
                      ? topic.color
                      : "#6475d9"
                  }
                  onChange={(e) =>
                    edit((t) => {
                      t.color = e.target.value;
                    })
                  }
                />
              </label>
              {current.mode === "flow" && (
                <>
                  <select
                    aria-label="순서도 박스 모양"
                    value={topic.shape || "process"}
                    onChange={(e) =>
                      edit((t) => {
                        t.shape = e.target.value as Topic["shape"];
                      })
                    }
                  >
                    <option value="process">처리</option>
                    <option value="decision">판단</option>
                    <option value="terminal">시작/끝</option>
                  </select>
                  <input
                    aria-label="분기 이름"
                    placeholder="분기 이름 (예/아니오)"
                    value={topic.edgeLabel || ""}
                    onChange={(e) =>
                      edit((t) => {
                        t.edgeLabel = e.target.value;
                      })
                    }
                  />
                </>
              )}
              <select
                aria-label="추가 연결 대상"
                value={connectTo}
                onChange={(e) => setConnectTo(e.target.value)}
              >
                <option value="">연결할 노드</option>
                {allTopics
                  .filter((t) => t.id !== topic.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
              <input
                aria-label="연결선 이름"
                placeholder="연결선 이름"
                value={connectionLabel}
                onChange={(e) => setConnectionLabel(e.target.value)}
              />
              <button
                disabled={!connectTo}
                onClick={() => {
                  replace((m) => {
                    m.links = [
                      ...(m.links || []),
                      {
                        id: uid(),
                        from: topic.id,
                        to: connectTo,
                        label: connectionLabel,
                      },
                    ];
                  });
                  setConnectTo("");
                  setConnectionLabel("");
                }}
              >
                방향 화살표 추가
              </button>
              {linked ? (
                <button onClick={() => onOpenCard(linked)}>칸반 열기</button>
              ) : (
                <button
                  disabled={linking}
                  onClick={async () => {
                    setLinking(true);
                    try {
                      const card = await onCreateCard(
                        topic.title,
                        topic.note || "",
                      );
                      edit((t) => {
                        t.cardId = card.id;
                        t.boardId = card.boardId;
                      });
                    } catch (e) {
                      alert(String(e));
                    } finally {
                      setLinking(false);
                    }
                  }}
                >
                  칸반 카드 만들기
                </button>
              )}
            </div>
          )}
          <div className="mm-nav-hint">
            빈 공간 드래그로 이동 · 휠로 확대/축소 · Shift+휠로 좌우 이동 ·
            모바일은 두 손가락으로 확대/축소
          </div>
          <div className="mm-workspace">
            <div
              ref={frame}
              className={`mm-canvas ${panning ? "is-panning" : ""}`}
              onPointerDown={(e) => {
                if (e.button !== 0 && e.button !== 1) return;
                if ((e.target as HTMLElement).closest(".mm-node")) return;
                if (selectMode || e.shiftKey) {
                  const point = worldPoint(e.clientX, e.clientY);
                  marquee.current = point;
                  setSelectionRect({ ...point, w: 0, h: 0 });
                  e.currentTarget.setPointerCapture(e.pointerId);
                  return;
                }
                fingers.current.set(e.pointerId, {
                  x: e.clientX,
                  y: e.clientY,
                });
                if (fingers.current.size === 2) {
                  const [a, b] = [...fingers.current.values()];
                  pinch.current = {
                    distance: Math.hypot(a.x - b.x, a.y - b.y),
                    zoom: viewRef.current.zoom,
                  };
                  pan.current = null;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  return;
                }
                const el = e.currentTarget;
                pan.current = {
                  id: e.pointerId,
                  x: e.clientX,
                  y: e.clientY,
                  left: el.scrollLeft,
                  top: el.scrollTop,
                };
                el.setPointerCapture(e.pointerId);
                setPanning(true);
              }}
              onPointerMove={(e) => {
                if (marquee.current) {
                  const p = worldPoint(e.clientX, e.clientY),
                    start = marquee.current;
                  setSelectionRect({
                    x: Math.min(start.x, p.x),
                    y: Math.min(start.y, p.y),
                    w: Math.abs(p.x - start.x),
                    h: Math.abs(p.y - start.y),
                  });
                  return;
                }
                if (fingers.current.has(e.pointerId))
                  fingers.current.set(e.pointerId, {
                    x: e.clientX,
                    y: e.clientY,
                  });
                if (fingers.current.size === 2 && pinch.current) {
                  const [a, b] = [...fingers.current.values()];
                  changeZoom(
                    (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
                      Math.max(1, pinch.current.distance),
                    (a.x + b.x) / 2,
                    (a.y + b.y) / 2,
                  );
                  return;
                }
                const p = pan.current;
                if (!p || p.id !== e.pointerId) return;
                e.currentTarget.scrollLeft = p.left - (e.clientX - p.x);
                e.currentTarget.scrollTop = p.top - (e.clientY - p.y);
              }}
              onPointerUp={(e) => {
                if (marquee.current) {
                  const p = worldPoint(e.clientX, e.clientY),
                    start = marquee.current;
                  setPicked(
                    model.nodes
                      .filter(
                        (n) =>
                          n.x >= Math.min(start.x, p.x) &&
                          n.x <= Math.max(start.x, p.x) &&
                          n.y >= Math.min(start.y, p.y) &&
                          n.y <= Math.max(start.y, p.y),
                      )
                      .map((n) => n.topic.id),
                  );
                  marquee.current = null;
                  setSelectionRect(null);
                  if (e.currentTarget.hasPointerCapture(e.pointerId))
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  return;
                }
                fingers.current.delete(e.pointerId);
                pinch.current = null;
                pan.current = null;
                setPanning(false);
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                marquee.current = null;
                setSelectionRect(null);
                fingers.current.clear();
                pinch.current = null;
                pan.current = null;
                setPanning(false);
              }}
              tabIndex={0}
              aria-label="마인드맵 캔버스"
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={dropFlow}
            >
              <div
                style={{
                  width: model.width * zoom,
                  height: model.height * zoom,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: model.width,
                    height: model.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                    position: "absolute",
                  }}
                >
                  <svg
                    width={model.width}
                    height={model.height}
                    className="mm-lines"
                    aria-hidden="true"
                  >
                    <defs>
                      <marker
                        id="mm-flow-arrow"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto-start-reverse"
                      >
                        <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
                      </marker>
                    </defs>
                    {(current.floating || [])
                      .filter((n) => n.kind === "summary")
                      .map((note) => {
                        const sources = model.nodes.filter((n) =>
                          note.sourceIds?.includes(n.topic.id),
                        );
                        if (!sources.length) return null;
                        const x = Math.min(...sources.map((n) => n.x)) - 105,
                          y = Math.min(...sources.map((n) => n.y)) - 45,
                          w = Math.max(...sources.map((n) => n.x)) - x + 105,
                          h = Math.max(...sources.map((n) => n.y)) - y + 45;
                        return (
                          <g key={note.id} className="mm-summary-boundary">
                            <rect x={x} y={y} width={w} height={h} rx="18" />
                            <path
                              d={`M${x + w},${y + h / 2} L${note.x},${note.y + 50}`}
                            />
                          </g>
                        );
                      })}
                    {selectionRect && (
                      <rect
                        className="mm-marquee"
                        x={selectionRect.x}
                        y={selectionRect.y}
                        width={selectionRect.w}
                        height={selectionRect.h}
                      />
                    )}
                    {linkDraft &&
                      (() => {
                        const a = model.nodes.find(
                          (n) => n.topic.id === linkDraft.from,
                        );
                        return a ? (
                          <path
                            className="mm-link-draft"
                            d={`M${a.x},${a.y} L${linkDraft.x},${linkDraft.y}`}
                          />
                        ) : null;
                      })()}
                    {model.edges.map((edge) => {
                      const a = model.nodes.find((n) => n.topic.id === edge.a),
                        b = model.nodes.find((n) => n.topic.id === edge.b);
                      if (!a || !b) return null;
                      const flow = current.mode === "flow",
                        down = b.y >= a.y;
                      const y1 =
                          a.y +
                          (down ? 1 : -1) *
                            (a.topic.shape === "decision" ? 36 : 25),
                        y2 =
                          b.y -
                          (down ? 1 : -1) *
                            (b.topic.shape === "decision" ? 36 : 25);
                      const side = b.x > a.x ? 1 : -1,
                        x1 = a.x + side * 84,
                        x2 = b.x - side * 84;
                      const custom = flow && !edge.id.startsWith("tree-");
                      const lane = Math.max(a.x, b.x) + 150;
                      const graph = current.mode === "graph";
                      const d = graph
                        ? `M${a.x},${a.y} L${b.x},${b.y}`
                        : custom
                          ? `M${a.x + 84},${a.y} L${lane},${a.y} L${lane},${b.y} L${b.x + 84},${b.y}`
                          : flow
                            ? `M${a.x},${y1} L${a.x},${(y1 + y2) / 2} L${b.x},${(y1 + y2) / 2} L${b.x},${y2}`
                            : `M${x1},${a.y} C${(x1 + x2) / 2},${a.y} ${(x1 + x2) / 2},${b.y} ${x2},${b.y}`;
                      return (
                        <g key={edge.id}>
                          <path
                            d={d}
                            fill="none"
                            stroke={edge.color}
                            strokeWidth={current.mode === "graph" ? 1.2 : 2.2}
                            opacity={current.mode === "graph" ? 0.38 : 0.9}
                            markerEnd={flow ? "url(#mm-flow-arrow)" : undefined}
                          />
                          <path
                            d={d}
                            fill="none"
                            stroke={
                              selectedEdge === edge.id
                                ? "#b4a1e977"
                                : "transparent"
                            }
                            strokeWidth="14"
                            pointerEvents="stroke"
                            className="mm-edge-hit"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEdge(edge.id);
                            }}
                          />
                          {edge.label && (
                            <text
                              x={
                                custom
                                  ? lane + 8
                                  : flow
                                    ? (a.x + b.x) / 2
                                    : (x1 + x2) / 2
                              }
                              y={flow ? (y1 + y2) / 2 - 7 : (a.y + b.y) / 2 - 8}
                              textAnchor={custom ? "start" : "middle"}
                              className="mm-edge-label"
                            >
                              {edge.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  {model.nodes.map((n) => (
                    <div
                      key={n.topic.id}
                      data-node-id={n.topic.id}
                      className={`mm-node ${n.topic.id === topic.id ? "mm-selected" : ""} ${picked.includes(n.topic.id) ? "mm-picked" : ""} ${n.topic.id === current.root.id ? "mm-root" : ""} ${current.mode === "graph" ? "mm-graph-node" : current.mode === "flow" ? `mm-flow-node mm-${n.topic.shape || "process"}` : ""}`}
                      style={{
                        left: n.x - (current.mode === "graph" ? 20 : 84),
                        top:
                          n.y -
                          (current.mode === "graph"
                            ? 20
                            : current.mode === "flow" &&
                                n.topic.shape === "decision"
                              ? 36
                              : 25),
                        borderColor: n.topic.color || n.color,
                      }}
                      draggable={editingId !== n.topic.id}
                      onDragStart={(e) => {
                        drag.current = n.topic.id;
                        e.dataTransfer.setData("text/plain", n.topic.id);
                        e.stopPropagation();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={dropFlow}
                    >
                      {
                        <>
                          <PositionHandle
                            x={n.x}
                            y={n.y}
                            zoom={zoom}
                            offsetX={current.mode === "graph" ? 20 : 84}
                            offsetY={
                              current.mode === "graph"
                                ? 20
                                : current.mode === "flow" &&
                                    n.topic.shape === "decision"
                                  ? 36
                                  : 25
                            }
                            onCommit={(x, y) => setPosition(n.topic.id, x, y)}
                          />
                          {current.mode === "flow" &&
                            n.topic.shape === "decision" && (
                              <svg
                                className="mm-decision-shape"
                                viewBox="0 0 168 72"
                                aria-hidden="true"
                              >
                                <polygon
                                  points="84,1 167,36 84,71 1,36"
                                  fill="#f7f4ff"
                                  stroke={n.color}
                                  strokeWidth="2"
                                />
                              </svg>
                            )}
                        </>
                      }
                      <button
                        className="mm-connect-port"
                        aria-label={`${n.topic.title} 연결점`}
                        title="다른 노드로 드래그하여 연결"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setLinkDraft({
                            from: n.topic.id,
                            ...worldPoint(e.clientX, e.clientY),
                          });
                        }}
                        onPointerMove={(e) => {
                          if (!e.currentTarget.hasPointerCapture(e.pointerId))
                            return;
                          e.stopPropagation();
                          setLinkDraft({
                            from: n.topic.id,
                            ...worldPoint(e.clientX, e.clientY),
                          });
                        }}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          const target = document
                            .elementFromPoint(e.clientX, e.clientY)
                            ?.closest("[data-node-id]")
                            ?.getAttribute("data-node-id");
                          if (target) finishConnection(n.topic.id, target);
                          setLinkDraft(null);
                          if (e.currentTarget.hasPointerCapture(e.pointerId))
                            e.currentTarget.releasePointerCapture(e.pointerId);
                        }}
                        onPointerCancel={() => setLinkDraft(null)}
                      >
                        ●
                      </button>
                      {editingId === n.topic.id ? (
                        <input
                          className="mm-inline-title"
                          aria-label="노드 이름"
                          autoFocus
                          value={n.topic.title}
                          onChange={(e) =>
                            replace((m) => {
                              findTopic(m.root, n.topic.id)!.title =
                                e.target.value;
                            })
                          }
                          onBlur={() => setEditingId("")}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (
                              !e.nativeEvent.isComposing &&
                              (e.key === "Enter" || e.key === "Escape")
                            )
                              setEditingId("");
                          }}
                        />
                      ) : (
                        <button
                          className="mm-topic"
                          onClick={(e) =>
                            pickNode(
                              n.topic.id,
                              e.shiftKey ||
                                e.ctrlKey ||
                                e.metaKey ||
                                selectMode,
                            )
                          }
                          onDoubleClick={() => {
                            setSelected(n.topic.id);
                            setEditingId(n.topic.id);
                          }}
                          title={n.topic.note || n.topic.title}
                        >
                          {n.topic.title || "이름 없는 노드"}
                          {n.topic.cardId ? " ▣" : ""}
                        </button>
                      )}
                      {n.topic.children.length > 0 && (
                        <button
                          className="mm-fold"
                          aria-label={
                            n.topic.collapsed ? "가지 펼치기" : "가지 접기"
                          }
                          onClick={() =>
                            replace((m) => {
                              const t = findTopic(m.root, n.topic.id)!;
                              t.collapsed = !t.collapsed;
                            })
                          }
                        >
                          {n.topic.collapsed ? "+" : "−"}
                        </button>
                      )}
                    </div>
                  ))}
                  <FloatingNotes
                    notes={current.floating || []}
                    zoom={zoom}
                    onChange={(id, patch) =>
                      replace((m) => {
                        m.floating = m.floating?.map((n) =>
                          n.id === id ? { ...n, ...patch } : n,
                        );
                      })
                    }
                    onDelete={(id) =>
                      replace((m) => {
                        m.floating = m.floating?.filter((n) => n.id !== id);
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <aside className="mm-inspector" hidden={!panelVisible}>
              <MapLibrary
                maps={maps}
                active={current.id}
                selected={topic.id}
                onMap={chooseMap}
                onTopic={chooseTopic}
                onFolder={newFolder}
              />
              <label className="mm-folder-picker">
                현재 맵의 폴더
                <select
                  aria-label="현재 맵의 폴더"
                  value={current.folder || ""}
                  onChange={(e) =>
                    replace((m) => {
                      m.folder = e.target.value;
                    }, false)
                  }
                >
                  <option value="">미분류</option>
                  {[...new Set(maps.map((m) => m.folder).filter(Boolean))].map(
                    (f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button onClick={newFolder}>새 폴더로 이동</button>
              <p className="mm-help">
                노드 이름은 더블클릭 또는 F2로 편집합니다. 노드 옆 ● 연결점을
                다른 노드로 드래그해 연결하세요. Shift+클릭 또는 ‘여러 개
                선택’으로 묶어서 서머리를 만드세요.
              </p>
            </aside>
          </div>
        </>
      )}
      {summary && (
        <div className="mm-modal-backdrop">
          <div
            className="mm-summary-editor"
            role="dialog"
            aria-modal="true"
            aria-label="서머리 만들기"
          >
            <h3>선택한 {summary.sourceIds.length}개 노드에서 인사이트 정리</h3>
            <p>
              선택한 내용·반복 키워드·연결 관계를 바탕으로 만든 초안입니다. 핵심
              인사이트를 확인하고 수정하세요.
            </p>
            <label>
              서머리 이름
              <input
                aria-label="서머리 초안 이름"
                value={summary.title}
                onChange={(e) =>
                  setSummary({ ...summary, title: e.target.value })
                }
              />
            </label>
            <textarea
              aria-label="서머리 초안"
              value={summary.text}
              onChange={(e) => setSummary({ ...summary, text: e.target.value })}
              rows={14}
            />
            <div>
              <button onClick={() => setSummary(null)}>취소</button>
              <button className="mm-primary" onClick={saveSummary}>
                캔버스에 서머리 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
