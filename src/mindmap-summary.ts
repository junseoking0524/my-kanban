import type { MindMap, Topic } from "./mindmap";
export function summaryDraft(map: MindMap, ids: string[]) {
  const selected = new Set(ids),
    topics: Topic[] = [];
  const walk = (t: Topic) => {
    if (selected.has(t.id)) topics.push(t);
    t.children.forEach(walk);
  };
  walk(map.root);
  const stop = new Set([
    "대한",
    "위한",
    "관련",
    "내용",
    "진행",
    "그리고",
    "하기",
    "여부",
    "합니다",
    "있습니다",
    "새",
    "주제",
    "the",
    "and",
    "with",
  ]);
  const freq = new Map<string, number>();
  for (const t of topics) {
    const tokens = new Set(
      (t.title + " " + (t.note || ""))
        .toLowerCase()
        .match(/[가-힣a-z0-9]{2,}/g) || [],
    );
    for (const w of tokens)
      if (!stop.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
  }
  const common = [...freq]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w);
  const relations: string[] = [];
  const rel = (t: Topic) => {
    for (const c of t.children) {
      if (selected.has(t.id) && selected.has(c.id))
        relations.push(
          `${t.title} → ${c.title}${c.edgeLabel ? " (" + c.edgeLabel + ")" : ""}`,
        );
      rel(c);
    }
  };
  rel(map.root);
  for (const l of map.links || [])
    if (selected.has(l.from) && selected.has(l.to)) {
      const a = topics.find((t) => t.id === l.from),
        b = topics.find((t) => t.id === l.to);
      if (a && b)
        relations.push(
          `${a.title} → ${b.title}${l.label ? " (" + l.label + ")" : ""}`,
        );
    }
  const titles = topics.map((t) => t.title || "이름 없는 노드");
  const insight = common.length
    ? `선택한 ${topics.length}개 항목에서 ‘${common.join("·")}’가 반복됩니다. 이 공통 주제를 기준으로 항목을 묶고, 중복되는 작업과 먼저 결정해야 할 사항을 함께 검토할 수 있습니다.`
    : relations.length
      ? `선택한 항목 사이에 ${relations.length}개의 연결이 있습니다. ‘${relations[0]}’의 선후 관계를 먼저 확인하고, 각 단계의 완료 조건을 정리하는 것이 다음 작업의 출발점입니다.`
      : `‘${titles.slice(0, 3).join("’, ‘")}’를 함께 검토할 항목으로 묶었습니다. 각 항목의 공통 목표와 차이를 확인한 뒤 하나의 실행 과제로 연결해보세요.`;
  const text = `핵심 인사이트 (편집 가능한 초안)\n${insight}\n\n선택 내용\n${topics.map((t) => "• " + t.title + (t.note ? " — " + t.note : "")).join("\n")}\n\n${relations.length ? "확인된 연결\n" + relations.map((r) => "• " + r).join("\n") : "다음 질문\n• 이 항목들이 함께 해결하려는 문제는 무엇인가요?"}\n\n다음 행동\n• 공통 목표, 담당자, 완료 기준을 확정하세요.\n\n※ 선택한 텍스트·연결 관계만 사용한 초안입니다. 결론은 직접 확인하고 수정하세요.`;
  return {
    title: common.length
      ? common.slice(0, 2).join(" · ") + " 인사이트"
      : "선택한 " + topics.length + "개 노드의 서머리",
    text,
    topics,
  };
}
