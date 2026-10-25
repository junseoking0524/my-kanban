import JSZip from "jszip";
export type Topic = {
  id: string;
  title: string;
  note?: string;
  href?: string;
  color?: string;
  collapsed?: boolean;
  children: Topic[];
  cardId?: string;
  boardId?: string;
};
export type MindMap = {
  id: string;
  title: string;
  root: Topic;
  folder?: string;
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
type XTopic = {
  title?: string;
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
    children: Object.values(t.children || {})
      .flat()
      .map((c) => fromX(c, depth + 1, counter)),
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
export async function importXmind(data: ArrayBuffer): Promise<MindMap[]> {
  if (data.byteLength > 20 * 1024 * 1024)
    throw new Error("20MB 이하의 파일을 선택해주세요.");
  const zip = await JSZip.loadAsync(data);
  const entry = zip.file("content.json") || zip.file("content.xml");
  if (!entry) throw new Error("XMind 주제 데이터를 찾을 수 없습니다.");
  // Reject oversized inflated content before allocating it (JSZip's documented ZIP metadata is internal).
  const info = entry as unknown as { _data?: { uncompressedSize?: number } };
  if ((info._data?.uncompressedSize || 0) > 4 * 1024 * 1024)
    throw new Error("주제 데이터가 너무 큽니다 (최대 4MB).");
  const text = await entry.async("string");
  if (text.length > 4 * 1024 * 1024)
    throw new Error("주제 데이터가 너무 큽니다.");
  let sheets: { title: string; root: Topic }[];
  if (zip.file("content.json")) {
    const parsed = JSON.parse(text) as { title?: string; rootTopic: XTopic }[];
    if (!Array.isArray(parsed) || !parsed.length || parsed.length > 30)
      throw new Error("유효한 XMind 시트가 아닙니다 (최대 30개).");
    sheets = parsed.map((s) => ({
      title: s.title || "가져온 마인드맵",
      root: fromX(s.rootTopic),
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
  zip.file(
    "content.json",
    JSON.stringify([
      {
        id: map.id,
        class: "sheet",
        title: map.title,
        rootTopic: {
          ...toX(map.root),
          structureClass: "org.xmind.ui.map.unbalanced",
        },
      },
    ]),
  );
  zip.file(
    "metadata.json",
    JSON.stringify({ creator: { name: "Kanban Mindmap", version: "1.0" } }),
  );
  zip.file(
    "manifest.json",
    JSON.stringify({
      "file-entries": { "content.json": {}, "metadata.json": {} },
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
