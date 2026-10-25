import { useEffect, useMemo, useRef, useState } from "react";
import {
  download,
  exportXmind,
  findTopic,
  importXmind,
  layout,
  moveTopic,
  newMap,
  newTopic,
  parentOf,
  uid,
  validateMap,
} from "./mindmap";
import type { MindMap, Topic } from "./mindmap";
import "./mindmap.css";
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
    [panelTab, setPanelTab] = useState<"library" | "edit">("library"),
    [panning, setPanning] = useState(false);
  const current = maps.find((m) => m.id === active) || maps[0],
    topic = current
      ? findTopic(current.root, selected) || current.root
      : undefined;
  const model = useMemo(
    () => (current ? layout(current.root) : null),
    [current],
  );
  const history = useRef<Record<string, { past: Topic[]; future: Topic[] }>>(
    {},
  );
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
  }, [active, selected, ready]);
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
    const xs = model.nodes.map((n) => n.x),
      ys = model.nodes.map((n) => n.y);
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
    const map = latest.current.find((m) => m.id === id);
    setActive(id);
    setSelected(map?.root.id || "");
  };
  const chooseTopic = (mapId: string, id: string) => {
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
      h.past.push(structuredClone(current.root));
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
    setPanelTab("edit");
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
    (redo ? h.past : h.future).push(structuredClone(current.root));
    replace((m) => {
      m.root = root;
    }, false);
    setSelected(root.id);
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
    setPanelTab("library");
    setMaps((p) => [...p, m]);
    setActive(m.id);
    setSelected(m.root.id);
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
    setPanelTab("library");
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
      className="mm"
      aria-label="마인드맵 편집기"
      onKeyDown={(e) => {
        const el = e.target as HTMLElement;
        if (el.matches("input,textarea,select") || e.nativeEvent.isComposing)
          return;
        if (!el.closest(".mm-canvas")) return;
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
          setPanelTab("edit");
          requestAnimationFrame(() =>
            document.getElementById("mm-title")?.focus(),
          );
        }
      }}
    >
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
            setPanelTab("library");
            document
              .querySelector(".mm-inspector")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }}
        >
          📁 보관함 보기
        </button>
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
            <input
              aria-label="마인드맵 이름"
              value={current.title}
              onChange={(e) =>
                replace((m) => {
                  m.title = e.target.value;
                }, false)
              }
            />
            <button onClick={() => add()}>하위 주제 Tab</button>
            <button onClick={() => add(true)}>같은 단계 Enter</button>
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
                fingers.current.delete(e.pointerId);
                pinch.current = null;
                pan.current = null;
                setPanning(false);
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                fingers.current.clear();
                pinch.current = null;
                pan.current = null;
                setPanning(false);
              }}
              tabIndex={0}
              aria-label="마인드맵 캔버스"
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
                    {model.edges.map((edge) => {
                      const a = model.nodes.find((n) => n.topic.id === edge.a)!,
                        b = model.nodes.find((n) => n.topic.id === edge.b)!,
                        side = b.x > a.x ? 1 : -1;
                      const x1 = a.x + side * 84,
                        x2 = b.x - side * 84;
                      return (
                        <path
                          key={edge.b}
                          d={`M${x1},${a.y} C${(x1 + x2) / 2},${a.y} ${(x1 + x2) / 2},${b.y} ${x2},${b.y}`}
                          fill="none"
                          stroke={edge.color}
                          strokeWidth="2.5"
                        />
                      );
                    })}
                  </svg>
                  {model.nodes.map((n) => (
                    <div
                      key={n.topic.id}
                      className={`mm-node ${n.topic.id === topic.id ? "mm-selected" : ""} ${n.topic.id === current.root.id ? "mm-root" : ""}`}
                      style={{
                        left: n.x - 84,
                        top: n.y - 25,
                        borderColor: n.topic.color || n.color,
                      }}
                      draggable={n.topic.id !== current.root.id}
                      onDragStart={(e) => {
                        drag.current = n.topic.id;
                        e.dataTransfer.setData("text/plain", n.topic.id);
                        e.stopPropagation();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const id = drag.current;
                        if (id)
                          replace((m) => {
                            moveTopic(m.root, id, n.topic.id);
                          });
                        drag.current = "";
                      }}
                    >
                      <button
                        className="mm-topic"
                        onClick={() => {
                          setSelected(n.topic.id);
                          setPanelTab("edit");
                        }}
                        onDoubleClick={() => {
                          setSelected(n.topic.id);
                          setTimeout(
                            () => document.getElementById("mm-title")?.focus(),
                            0,
                          );
                        }}
                        title={n.topic.title}
                      >
                        {n.topic.title || "빈 주제"}
                        {n.topic.cardId ? " ▣" : ""}
                        {n.topic.note ? " ✎" : ""}
                      </button>
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
                </div>
              </div>
            </div>
            <aside className="mm-inspector">
              <div className="mm-panel-tabs">
                <button
                  className={panelTab === "library" ? "active" : ""}
                  onClick={() => setPanelTab("library")}
                >
                  📁 보관함
                </button>
                <button
                  className={panelTab === "edit" ? "active" : ""}
                  onClick={() => setPanelTab("edit")}
                >
                  주제 편집
                </button>
              </div>
              <div hidden={panelTab !== "library"}>
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
                    {[
                      ...new Set(maps.map((m) => m.folder).filter(Boolean)),
                    ].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={newFolder}>새 폴더로 이동</button>
                <p className="mm-help">
                  폴더 안의 맵 이름을 누르면 다시 열립니다. 펼침 화살표로 주제
                  구조를 보고, 주제를 누르면 해당 위치로 이동합니다.
                </p>
              </div>
              <div className="mm-edit-fields" hidden={panelTab !== "edit"}>
                <span className="mm-eyebrow">선택한 주제</span>
                <label>
                  제목
                  <input
                    id="mm-title"
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
                    rows={5}
                  />
                </label>
                <label>
                  링크
                  <input
                    aria-label="링크"
                    type="url"
                    placeholder="https://"
                    value={topic.href || ""}
                    onChange={(e) =>
                      edit((t) => {
                        t.href = e.target.value;
                      })
                    }
                  />
                </label>
                {/^https?:\/\//i.test(topic.href || "") && (
                  <a href={topic.href} target="_blank" rel="noreferrer">
                    링크 열기 ↗
                  </a>
                )}
                <label>
                  가지 색상
                  <input
                    type="color"
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
                <label>
                  이동할 상위 주제
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        replace((m) => {
                          moveTopic(m.root, topic.id, e.target.value);
                        });
                    }}
                    disabled={topic.id === current.root.id}
                  >
                    <option value="">상위 주제 선택…</option>
                    {(() => {
                      const list: Topic[] = [];
                      const walk = (t: Topic) => {
                        if (t.id === topic.id) return;
                        list.push(t);
                        t.children.forEach(walk);
                      };
                      walk(current.root);
                      return list.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ));
                    })()}
                  </select>
                </label>
                <button
                  onClick={() =>
                    edit((t) => {
                      t.collapsed = !t.collapsed;
                    })
                  }
                >
                  {topic.collapsed ? "하위 가지 펼치기" : "하위 가지 접기"}
                </button>
                <hr />
                <span className="mm-eyebrow">칸반 연결</span>
                {linked ? (
                  <>
                    <button onClick={() => onOpenCard(linked)}>
                      {linked.title} ↗
                    </button>
                    <p>
                      상태:{" "}
                      {linked.colId === "done"
                        ? "완료"
                        : linked.colId === "inprogress"
                          ? "진행 중"
                          : "할 일"}
                    </p>
                    <button
                      onClick={() =>
                        edit((t) => {
                          delete t.cardId;
                          delete t.boardId;
                        })
                      }
                    >
                      연결 해제
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled={linking}
                      onClick={async () => {
                        const mapId = current.id,
                          nodeId = topic.id;
                        setLinking(true);
                        try {
                          const card = await onCreateCard(
                            topic.title,
                            topic.note || "",
                          );
                          setMaps((prev) =>
                            prev.map((m) => {
                              if (m.id !== mapId) return m;
                              const copy = structuredClone(m),
                                t = findTopic(copy.root, nodeId);
                              if (t) {
                                t.cardId = card.id;
                                t.boardId = card.boardId;
                              }
                              return {
                                ...copy,
                                dirty: true,
                                updatedAt: new Date().toISOString(),
                              };
                            }),
                          );
                        } catch (e) {
                          alert("카드 생성 실패: " + (e as Error).message);
                        } finally {
                          setLinking(false);
                        }
                      }}
                    >
                      이 주제로 할 일 카드 만들기
                    </button>
                    <select
                      aria-label="기존 칸반 카드 연결"
                      value=""
                      onChange={(e) => {
                        const c = cards.find(
                          (c) => `${c.boardId}:${c.id}` === e.target.value,
                        );
                        if (c)
                          edit((t) => {
                            t.cardId = c.id;
                            t.boardId = c.boardId;
                          });
                      }}
                    >
                      <option value="">기존 카드 연결…</option>
                      {cards.map((c) => (
                        <option
                          key={`${c.boardId}:${c.id}`}
                          value={`${c.boardId}:${c.id}`}
                        >
                          {c.title}
                        </option>
                      ))}
                    </select>
                    {topic.cardId && (
                      <p>
                        연결된 카드가 삭제되었거나 아직 로드되지 않았습니다.
                      </p>
                    )}
                  </>
                )}
                <p className="mm-help">
                  빈 공간 드래그로 이동 · 휠로 확대/축소 · Shift+휠로 좌우 이동.
                  주제를 클릭하고 오른쪽에서 편집하세요. 더블클릭 또는 F2로 제목
                  편집 · Tab 하위 주제 · Enter 같은 단계 · Delete 삭제 ·
                  Ctrl/Cmd+Z 실행 취소. 가지를 다른 주제 위에 놓으면 하위로
                  이동합니다.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
