import JSZip from "jszip";
import type { FloatingNote } from "./FloatingNotes";
export type Topic = {
  id: string;
  title: string;
  note?: string;
  href?: string;
  color?: string;
  collapsed?: boolean;
  children: Topic[];
  shape?: "process" | "decision" | "terminal";
  edgeLabel?: string;
  core?: boolean;
  independent?: boolean;
  cardId?: string;
  boardId?: string;
};
export type MindMap = {
  id: string;
  title: string;
  root: Topic;
  folder?: string;
  mode?: "mindmap" | "flow" | "graph";
  layoutPositions?: Partial<
    Record<
      "mindmap" | "flow" | "graph",
      Record<string, { x: number; y: number }>
    >
  >;
  floating?: FloatingNote[];
  positions?: Record<string, { x: number; y: number }>;
  links?: { id: string; from: string; to: string; label: string }[];
  updatedAt: string;
  revision?: string;
  dirty?: boolean;
};
export const uid = () => crypto.randomUUID();
export const newTopic = (title = "새 주제"): Topic => ({
  id: uid(),
  title,
  children: [],
});
export const newMap = (): MindMap => ({
  id: uid(),
  title: "새 마인드맵",
  root: newTopic("중심 주제"),
  updatedAt: new Date().toISOString(),
  dirty: true,
});
export function findTopic(t: Topic, id: string): Topic | undefined {
  if (t.id === id) return t;
  for (const c of t.children) {
    const found = findTopic(c, id);
    if (found) return found;
  }
}
export function parentOf(t: Topic, id: string): Topic | undefined {
  if (t.children.some((c) => c.id === id)) return t;
  for (const c of t.children) {
    const p = parentOf(c, id);
    if (p) return p;
  }
}
export function moveTopic(root: Topic, id: string, target: string) {
  const node = findTopic(root, id),
    p = parentOf(root, id),
    dest = findTopic(root, target);
  if (!node || !p || !dest || findTopic(node, target)) return false;
  p.children = p.children.filter((c) => c.id !== id);
  dest.children.push(node);
  dest.collapsed = false;
  return true;
}
export function validateMap(value: unknown): value is MindMap {
  if (!value || typeof value !== "object") return false;
  const m = value as MindMap;
  const ids = new Set<string>();
  let count = 0;
  const check = (t: Topic, depth: number): boolean => {
    if (
      !t ||
      typeof t.id !== "string" ||
      !t.id ||
      ids.has(t.id) ||
      typeof t.title !== "string" ||
      !Array.isArray(t.children) ||
      (t.core !== undefined && typeof t.core !== "boolean") ||
      (t.independent !== undefined && typeof t.independent !== "boolean") ||
      depth > 50 ||
      ++count > 2000
    )
      return false;
    ids.add(t.id);
    return t.children.every((c) => check(c, depth + 1));
  };
  return (
    typeof m.id === "string" &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(m.id) &&
    typeof m.title === "string" &&
    check(m.root, 0) &&
    (!m.mode ||
      m.mode === "mindmap" ||
      m.mode === "flow" ||
      m.mode === "graph") &&
    (!m.floating ||
      (Array.isArray(m.floating) &&
        m.floating.length <= 100 &&
        new Set(m.floating.map((n) => n?.id)).size === m.floating.length &&
        m.floating.every(
          (n) =>
            n &&
            typeof n.id === "string" &&
            !ids.has(n.id) &&
            typeof n.text === "string" &&
            typeof n.color === "string" &&
            (!n.kind || n.kind === "summary") &&
            (!n.title || typeof n.title === "string") &&
            (!n.sourceIds ||
              (Array.isArray(n.sourceIds) &&
                n.sourceIds.length <= 2000 &&
                n.sourceIds.every((id) => typeof id === "string"))) &&
            Number.isFinite(n.x) &&
            Number.isFinite(n.y) &&
            n.x >= -1000 &&
            n.y >= -1000 &&
            n.x <= 20000 &&
            n.y <= 20000,
        ))) &&
    (!m.positions ||
      (typeof m.positions === "object" &&
        Object.values(m.positions).every(
          (p) =>
            p &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= -1000 &&
            p.y >= -1000 &&
            p.x <= 20000 &&
            p.y <= 20000,
        ))) &&
    (!m.layoutPositions ||
      (typeof m.layoutPositions === "object" &&
        Object.values(m.layoutPositions).every(
          (set) =>
            set &&
            typeof set === "object" &&
            Object.values(set).every(
              (p) =>
                p &&
                Number.isFinite(p.x) &&
                Number.isFinite(p.y) &&
                p.x >= -1000 &&
                p.y >= -1000 &&
                p.x <= 20000 &&
                p.y <= 20000,
            ),
        ))) &&
    (!m.links ||
      (Array.isArray(m.links) &&
        m.links.length <= 500 &&
        m.links.every(
          (l) =>
            l &&
            typeof l.id === "string" &&
            ids.has(l.from) &&
            ids.has(l.to) &&
            typeof l.label === "string",
        ))) &&
    JSON.stringify(m).length < 790000
  );
}
export function layout(root: Topic) {
  const nodes: { topic: Topic; x: number; y: number; color: string }[] = [],
    edges: { a: string; b: string; color: string }[] = [];
  const colors = ["#6475d9", "#d39748", "#389f8e", "#bf7295", "#718999"];
  const height = (t: Topic): number =>
    t.collapsed || !t.children.length
      ? 76
      : Math.max(
          76,
          t.children.reduce((s, c) => s + height(c), 0),
        );
  const right = root.children.filter((_, i) => i % 2 === 0),
    left = root.children.filter((_, i) => i % 2 !== 0);
  const total = Math.max(
    400,
    right.reduce((s, c) => s + height(c), 0),
    left.reduce((s, c) => s + height(c), 0),
  );
  const depth = (t: Topic): number =>
    t.collapsed ? 0 : Math.max(0, ...t.children.map((c) => 1 + depth(c)));
  const d = Math.max(1, depth(root)),
    cx = d * 240 + 230,
    cy = total / 2 + 80;
  nodes.push({ topic: root, x: cx, y: cy, color: "#27272a" });
  const walk = (
    t: Topic,
    x: number,
    y: number,
    side: number,
    color: string,
  ) => {
    nodes.push({ topic: t, x, y, color: t.color || color });
    if (!t.collapsed) {
      let top = y - height(t) / 2;
      for (const c of t.children) {
        const h = height(c);
        edges.push({ a: t.id, b: c.id, color: c.color || color });
        walk(c, x + side * 240, top + h / 2, side, c.color || color);
        top += h;
      }
    }
  };
  if (!root.collapsed)
    for (const [list, side] of [
      [left, -1],
      [right, 1],
    ] as [Topic[], number][]) {
      let top = cy - list.reduce((s, c) => s + height(c), 0) / 2;
      for (const c of list) {
        const h = height(c),
          color = c.color || colors[root.children.indexOf(c) % colors.length];
        edges.push({ a: root.id, b: c.id, color });
        walk(c, cx + side * 240, top + h / 2, side, color);
        top += h;
      }
    }
  return { nodes, edges, width: cx * 2, height: total + 160 };
}

function singleLayout(map: MindMap) {
  let base = layout(map.root);
  if (!map.mode || map.mode === "mindmap") {
    const nodes: typeof base.nodes = [],
      edges: typeof base.edges = [];
    const colors = ["#657b6a", "#a58e68", "#7d84bd", "#b77885", "#609a9f"];
    const size = (t: Topic): number =>
      t.collapsed || !t.children.length
        ? 90
        : t.children.reduce((a, c) => a + size(c), 0);
    const walk = (t: Topic, x: number, top: number, color: string) => {
      const h = size(t);
      nodes.push({ topic: t, x, y: top + h / 2, color: t.color || color });
      if (!t.collapsed) {
        let y = top;
        for (const [i, c] of t.children.entries()) {
          const col = t === map.root ? colors[i % colors.length] : color;
          edges.push({ a: t.id, b: c.id, color: col });
          walk(c, x + 260, y, col);
          y += size(c);
        }
      }
    };
    walk(map.root, 230, 120, "#334e43");
    base = {
      nodes,
      edges,
      width: Math.max(1200, ...nodes.map((n) => n.x + 280)),
      height: Math.max(650, size(map.root) + 240),
    };
  }
  if (map.mode === "graph") {
    const nodes: typeof base.nodes = [],
      edges: typeof base.edges = [];
    const colors = ["#a78bfa", "#67d4cf", "#ecaa74", "#de86bd", "#8ea8fa"];
    const total = map.root.children.length;
    nodes.push({ topic: map.root, x: 1000, y: 850, color: "#c8b8ff" });
    const scatter = (
      t: Topic,
      x: number,
      y: number,
      angle: number,
      depth: number,
      color: string,
    ) => {
      nodes.push({ topic: t, x, y, color: t.color || color });
      if (t.collapsed) return;
      t.children.forEach((c, i) => {
        const a =
          angle +
          (i - (t.children.length - 1) / 2) *
            Math.min(0.7, 2.7 / Math.max(1, t.children.length));
        const radius = 160 + depth * 35;
        edges.push({ a: t.id, b: c.id, color });
        scatter(
          c,
          Math.max(140, x + Math.cos(a) * radius),
          Math.max(120, y + Math.sin(a) * radius),
          a,
          depth + 1,
          color,
        );
      });
    };
    if (!map.root.collapsed)
      map.root.children.forEach((c, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, total),
          color = colors[i % colors.length];
        edges.push({ a: map.root.id, b: c.id, color });
        scatter(
          c,
          1000 + Math.cos(a) * 330,
          850 + Math.sin(a) * 330,
          a,
          1,
          color,
        );
      });
    // Deterministic force layout: connected ideas cluster; a small seeded offset breaks collinear starts.
    if (nodes.length > 1 && nodes.length <= 180) {
      nodes.forEach((n, i) => {
        if (!i) return;
        let seed = 0;
        for (const c of n.topic.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
        n.x += (seed % 73) - 36;
        n.y += ((seed >>> 8) % 61) - 30;
      });
      const index = new Map(nodes.map((n, i) => [n.topic.id, i]));
      const springs = [
        ...edges.map((e) => [e.a, e.b]),
        ...(map.links || []).map((l) => [l.from, l.to]),
      ];
      for (let step = 0; step < 100; step++) {
        const dx = nodes.map(() => 0),
          dy = nodes.map(() => 0);
        for (let i = 0; i < nodes.length; i++)
          for (let j = i + 1; j < nodes.length; j++) {
            const x = nodes[i].x - nodes[j].x,
              y = nodes[i].y - nodes[j].y,
              d = Math.max(4, Math.hypot(x, y)),
              force = 34000 / d;
            dx[i] += (x / d) * force;
            dy[i] += (y / d) * force;
            dx[j] -= (x / d) * force;
            dy[j] -= (y / d) * force;
          }
        for (const [a, b] of springs) {
          const i = index.get(a),
            j = index.get(b);
          if (i === undefined || j === undefined) continue;
          const x = nodes[j].x - nodes[i].x,
            y = nodes[j].y - nodes[i].y,
            d = Math.max(1, Math.hypot(x, y)),
            force = (d * d) / 230;
          dx[i] += (x / d) * force;
          dy[i] += (y / d) * force;
          dx[j] -= (x / d) * force;
          dy[j] -= (y / d) * force;
        }
        const limit = 20 * (1 - step / 100) + 0.4;
        nodes.forEach((n, i) => {
          if (!i) return;
          const d = Math.max(1, Math.hypot(dx[i], dy[i]));
          n.x = Math.max(
            140,
            Math.min(1860, n.x + (dx[i] / d) * Math.min(d, limit)),
          );
          n.y = Math.max(
            140,
            Math.min(1560, n.y + (dy[i] / d) * Math.min(d, limit)),
          );
        });
      }
    }
    base = {
      nodes,
      edges,
      width: Math.max(2000, ...nodes.map((n) => n.x + 350)),
      height: Math.max(1700, ...nodes.map((n) => n.y + 280)),
    };
  }
  if (map.mode === "flow") {
    const nodes: typeof base.nodes = [],
      edges: typeof base.edges = [];
    const width = (t: Topic): number =>
      t.collapsed || !t.children.length
        ? 240
        : t.children.reduce((s, c) => s + width(c), 0);
    const walk = (t: Topic, left: number, depth: number) => {
      const w = width(t),
        pos = map.positions?.[t.id];
      nodes.push({
        topic: t,
        x: pos?.x ?? left + w / 2,
        y: pos?.y ?? 120 + depth * 160,
        color: t.color || "#6475d9",
      });
      if (!t.collapsed) {
        let x = left;
        for (const c of t.children) {
          edges.push({ a: t.id, b: c.id, color: c.color || "#6475d9" });
          walk(c, x, depth + 1);
          x += width(c);
        }
      }
    };
    walk(map.root, 150, 0);
    base = {
      nodes,
      edges,
      width: Math.max(1100, ...nodes.map((n) => n.x + 300)),
      height: Math.max(700, ...nodes.map((n) => n.y + 200)),
    };
  }
  const stored =
    map.layoutPositions?.[map.mode || "mindmap"] ||
    (map.mode === "flow" ? map.positions : undefined);
  base.nodes = base.nodes.map((n) =>
    stored?.[n.topic.id] ? { ...n, ...stored[n.topic.id] } : n,
  );
  base.width = Math.max(base.width, ...base.nodes.map((n) => n.x + 310));
  base.height = Math.max(base.height, ...base.nodes.map((n) => n.y + 230));
  const visible = new Set(base.nodes.map((n) => n.topic.id));
  const edges = base.edges.map((e) => ({
    ...e,
    id: "tree-" + e.b,
    label: findTopic(map.root, e.b)?.edgeLabel || "",
  }));
  for (const l of map.links || [])
    if (visible.has(l.from) && visible.has(l.to))
      edges.push({
        a: l.from,
        b: l.to,
        id: l.id,
        label: l.label,
        color: "#9b72bb",
      });
  return {
    ...base,
    edges,
    width: Math.max(
      base.width,
      ...(map.floating || []).map(
        (n) => n.x + (n.kind === "summary" ? 400 : 310),
      ),
    ),
    height: Math.max(
      base.height,
      ...(map.floating || []).map(
        (n) => n.y + (n.kind === "summary" ? 380 : 260),
      ),
    ),
  };
}

type XTopic = {
  title?: string;
  position?: { x: number; y: number };
  href?: string;
  notes?: { plain?: { content?: string } };
  children?: Record<string, XTopic[]>;
  branch?: string;
  style?: { properties?: Record<string, string> };
};
function fromX(t: XTopic, depth = 0, counter = { n: 0 }): Topic {
  if (depth > 50 || ++counter.n > 2000)
    throw new Error("최대 2,000개 주제, 50단계까지 지원합니다.");
  return {
    id: uid(),
    title: String(t.title || "주제"),
    note: t.notes?.plain?.content || "",
    href: t.href || "",
    color: t.style?.properties?.["line-color"],
    collapsed: t.branch === "folded",
    children: (t.children?.attached || []).map((c) =>
      fromX(c, depth + 1, counter),
    ),
  };
}
function xmlTopic(el: Element, depth = 0, counter = { n: 0 }): Topic {
  if (depth > 50 || ++counter.n > 2000)
    throw new Error("최대 2,000개 주제, 50단계까지 지원합니다.");
  const child = (e: Element, name: string) =>
    Array.from(e.children).find((c) => c.localName === name);
  const children = child(el, "children");
  return {
    id: uid(),
    title: child(el, "title")?.textContent || "주제",
    note: child(el, "notes")?.textContent || "",
    href:
      el.getAttributeNS("http://www.w3.org/1999/xlink", "href") ||
      el.getAttribute("href") ||
      "",
    collapsed: el.getAttribute("branch") === "folded",
    children: children
      ? Array.from(children.children)
          .filter((e) => e.localName === "topics")
          .flatMap((e) =>
            Array.from(e.children)
              .filter((c) => c.localName === "topic")
              .map((c) => xmlTopic(c, depth + 1, counter)),
          )
      : [],
  };
}
export function mapLayout(map: MindMap) {
  const roots = [
    { ...map.root, children: map.root.children.filter((t) => !t.independent) },
    ...map.root.children.filter((t) => t.independent),
  ];
  if (roots.length === 1) return singleLayout(map);
  const nodes: ReturnType<typeof singleLayout>["nodes"] = [],
    edges: ReturnType<typeof singleLayout>["edges"] = [];
  let top = 120;
  let first = true;
  for (const root of roots) {
    const part = singleLayout({
      ...map,
      root,
      links: [],
      positions: undefined,
      layoutPositions: undefined,
      floating: [],
    });
    const minY = Math.min(...part.nodes.map((n) => n.y)),
      maxY = Math.max(...part.nodes.map((n) => n.y));
    const delta = first ? 0 : top - minY;
    nodes.push(...part.nodes.map((n) => ({ ...n, y: n.y + delta })));
    edges.push(...part.edges);
    top = maxY + delta + 260;
    first = false;
  }
  const positions =
    map.layoutPositions?.[map.mode || "mindmap"] ||
    (map.mode === "flow" ? map.positions : undefined);
  for (const n of nodes) {
    const p = positions?.[n.topic.id];
    if (p) {
      n.x = p.x;
      n.y = p.y;
    }
  }
  const visible = new Set(nodes.map((n) => n.topic.id));
  for (const link of map.links || [])
    if (visible.has(link.from) && visible.has(link.to))
      edges.push({
        a: link.from,
        b: link.to,
        id: link.id,
        label: link.label,
        color: "#9b72bb",
      });
  return {
    nodes,
    edges,
    width: Math.max(
      1200,
      ...nodes.map((n) => n.x + 330),
      ...(map.floating || []).map((n) => n.x + 400),
    ),
    height: Math.max(
      800,
      ...nodes.map((n) => n.y + 260),
      ...(map.floating || []).map((n) => n.y + 380),
    ),
  };
}

function fingerprint(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
export async function importXmind(data: ArrayBuffer): Promise<MindMap[]> {
  if (data.byteLength > 20 * 1024 * 1024)
    throw new Error("20MB 이하의 파일을 선택해주세요.");
  const zip = await JSZip.loadAsync(data);
  let nativeBackup: { map: MindMap; fingerprint: string } | undefined;
  const native = zip.file("kanban-map.json");
  if (native) {
    const info = native as unknown as { _data?: { uncompressedSize?: number } };
    if ((info._data?.uncompressedSize || 0) > 800000)
      throw new Error("백업 데이터가 너무 큽니다.");
    const raw = await native.async("string");
    if (raw.length > 800000) throw new Error("백업 데이터가 너무 큽니다.");
    try {
      nativeBackup = JSON.parse(raw);
    } catch {
      /* fall back to XMind content */
    }
  }
  const entry = zip.file("content.json") || zip.file("content.xml");
  if (!entry) throw new Error("XMind 주제 데이터를 찾을 수 없습니다.");
  // Reject oversized inflated content before allocating it (JSZip's documented ZIP metadata is internal).
  const info = entry as unknown as { _data?: { uncompressedSize?: number } };
  if ((info._data?.uncompressedSize || 0) > 4 * 1024 * 1024)
    throw new Error("주제 데이터가 너무 큽니다 (최대 4MB).");
  const text = await entry.async("string");
  if (text.length > 4 * 1024 * 1024)
    throw new Error("주제 데이터가 너무 큽니다.");
  if (
    nativeBackup &&
    nativeBackup.fingerprint === fingerprint(text) &&
    validateMap(nativeBackup.map)
  )
    return [
      {
        ...nativeBackup.map,
        id: uid(),
        revision: undefined,
        dirty: true,
        updatedAt: new Date().toISOString(),
      },
    ];
  let sheets: { title: string; root: Topic; floating?: FloatingNote[] }[];
  if (zip.file("content.json")) {
    const parsed = JSON.parse(text) as { title?: string; rootTopic: XTopic }[];
    if (!Array.isArray(parsed) || !parsed.length || parsed.length > 30)
      throw new Error("유효한 XMind 시트가 아닙니다 (최대 30개).");
    sheets = parsed.map((s) => ({
      title: s.title || "가져온 마인드맵",
      root: fromX(s.rootTopic),
      floating: (s.rootTopic.children?.detached || []).map((t, i) => ({
        id: uid(),
        text: [t.title || "", t.notes?.plain?.content || ""]
          .filter(Boolean)
          .join("\n"),
        x: Math.max(110, Math.min(19000, t.position?.x ?? 300 + i * 280)),
        y: Math.max(80, Math.min(19000, t.position?.y ?? 300)),
        color: "#fff4bf",
      })),
    }));
  } else {
    const dom = new DOMParser().parseFromString(text, "application/xml");
    if (dom.querySelector("parsererror"))
      throw new Error("XMind XML 형식이 올바르지 않습니다.");
    sheets = Array.from(dom.getElementsByTagNameNS("*", "sheet")).map((s) => {
      const root = Array.from(s.children).find((c) => c.localName === "topic");
      if (!root) throw new Error("중심 주제가 없습니다.");
      return {
        title:
          Array.from(s.children).find((c) => c.localName === "title")
            ?.textContent || "가져온 마인드맵",
        root: xmlTopic(root),
      };
    });
  }
  if (!sheets.length || sheets.length > 30)
    throw new Error("가져올 시트가 없습니다 (최대 30개).");
  const maps = sheets.map((s) => ({
    ...s,
    id: uid(),
    updatedAt: new Date().toISOString(),
    dirty: true,
  }));
  if (!maps.every(validateMap))
    throw new Error("지원 범위를 초과한 마인드맵입니다.");
  return maps;
}
function toX(t: Topic): object {
  return {
    id: t.id,
    class: "topic",
    title: t.title,
    notes: { plain: { content: t.note || "" } },
    ...(t.href ? { href: t.href } : {}),
    ...(t.collapsed ? { branch: "folded" } : {}),
    ...(t.color
      ? { style: { id: uid(), properties: { "line-color": t.color } } }
      : {}),
    children: { attached: t.children.map(toX) },
  };
}
export async function exportXmind(map: MindMap) {
  const zip = new JSZip();

  const content = JSON.stringify([
    {
      id: map.id,
      class: "sheet",
      title: map.title,
      relationships: (map.links || []).map((l) => ({
        id: l.id,
        end1Id: l.from,
        end2Id: l.to,
        title: l.label,
      })),
      rootTopic: {
        ...toX(map.root),
        children: {
          attached: map.root.children.filter((t) => !t.independent).map(toX),
          detached: [
            ...map.root.children.filter((t) => t.independent).map(toX),
            ...(map.floating || []).map((n) => ({
              id: n.id,
              title: n.text,
              position: { x: n.x, y: n.y },
              class: "topic",
            })),
          ],
        },
        structureClass:
          map.mode === "flow"
            ? "org.xmind.ui.org-chart.down"
            : "org.xmind.ui.map.unbalanced",
      },
    },
  ]);
  zip.file("content.json", content);
  zip.file(
    "kanban-map.json",
    JSON.stringify({ map, fingerprint: fingerprint(content) }),
  );
  zip.file(
    "metadata.json",
    JSON.stringify({ creator: { name: "Kanban Mindmap", version: "1.0" } }),
  );
  zip.file(
    "manifest.json",
    JSON.stringify({
      "file-entries": {
        "content.json": {},
        "metadata.json": {},
        "kanban-map.json": {},
      },
    }),
  );
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.xmind.workbook",
  });
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
