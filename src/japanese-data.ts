// 일본어 학습 시트(단어장/문법/회화·핵심문장/기사목록/수업 표현)의 행을 대시보드용으로 정리한다.
export type Raw = { fetchedAt?: string; words?: string[][]; grammar?: string[][]; talk?: string[][]; articles?: string[][]; lesson?: string[][] };
export type Word = { date: string; articleId: string; word: string; reading: string; hun: string; meaning: string; unknown: boolean; count: number };
export type Grammar = { date: string; pattern: string; form: string; meaning: string; jlpt: string; example: string; learned: boolean; count: number };
export type Talk = { date: string; kind: string; situation: string; ja: string; meaning: string; memorized: boolean };
export type Article = { date: string; id: string; published: string; title: string; titleKo: string; topic: string; grammar: string; url: string };
export type Lesson = { date: string; no: string; intent: string; mine: string; verdict: string; natural: string; pron: string; meaning: string; casual: string; point: string; memorized: boolean; reviews: number; lastReview: string };
export type Study = { fetchedAt: string; words: Word[]; grammar: Grammar[]; talk: Talk[]; articles: Article[]; lesson: Lesson[] };

const cell = (r: string[], i: number) => (r[i] ?? '').toString().trim();
const bool = (v: string) => v.toUpperCase() === 'TRUE';
const num = (v: string) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const rows = (v?: string[][]) => (Array.isArray(v) ? v : []).filter(r => Array.isArray(r) && r.some(c => (c ?? '').toString().trim()));

export function parseStudy(raw: Raw): Study {
  return {
    fetchedAt: raw.fetchedAt ?? '',
    words: rows(raw.words).filter(r => cell(r, 2)).map(r => ({ date: cell(r, 0), articleId: cell(r, 1), word: cell(r, 2), reading: cell(r, 3), hun: cell(r, 4), meaning: cell(r, 5), unknown: bool(cell(r, 9)), count: num(cell(r, 10)) || 1 })),
    grammar: rows(raw.grammar).filter(r => cell(r, 2)).map(r => ({ date: cell(r, 0), pattern: cell(r, 2), form: cell(r, 3), meaning: cell(r, 4), jlpt: cell(r, 5), example: cell(r, 6), learned: bool(cell(r, 8)), count: num(cell(r, 9)) || 1 })),
    talk: rows(raw.talk).filter(r => cell(r, 5)).map(r => ({ date: cell(r, 0), kind: cell(r, 2), situation: cell(r, 3), ja: cell(r, 5), meaning: cell(r, 7), memorized: bool(cell(r, 9)) })),
    articles: rows(raw.articles).filter(r => cell(r, 1)).map(r => ({ date: cell(r, 0), id: cell(r, 1), published: cell(r, 2), title: cell(r, 3), titleKo: cell(r, 4), topic: cell(r, 5), grammar: cell(r, 6), url: cell(r, 7) })),
    lesson: rows(raw.lesson).filter(r => cell(r, 5) || cell(r, 3)).map(r => ({ date: cell(r, 0), no: cell(r, 1), intent: cell(r, 2), mine: cell(r, 3), verdict: cell(r, 4), natural: cell(r, 5), pron: cell(r, 6), meaning: cell(r, 7), casual: cell(r, 8), point: cell(r, 9), memorized: bool(cell(r, 12)), reviews: num(cell(r, 13)), lastReview: cell(r, 14) })),
  };
}

// 한국 시간 기준 날짜(YYYY-MM-DD)
export const kstDate = (d = new Date()) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
export const shiftDate = (date: string, days: number) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

// 날짜별 학습량: 기사 + 단어 + 문법 + 회화 + 수업 표현 행 수
export function activity(s: Study) {
  const map: Record<string, number> = {};
  for (const r of [...s.articles, ...s.words, ...s.grammar, ...s.talk, ...s.lesson]) if (isDate(r.date)) map[r.date] = (map[r.date] ?? 0) + 1;
  return map;
}

// 오늘(없으면 어제)부터 거꾸로 이어진 학습일 수
export function streak(s: Study, today = kstDate()) {
  const days = activity(s);
  let d = days[today] ? today : shiftDate(today, -1), n = 0;
  while (days[d]) { n++; d = shiftDate(d, -1); }
  return n;
}

// 복습 우선순위: 아직 못 외운 표현 중 복습 횟수가 적고 오래 안 본 것부터
export function reviewQueue(s: Study, limit = 5) {
  return s.lesson.filter(l => !l.memorized && l.natural)
    .sort((a, b) => a.reviews - b.reviews || (a.lastReview || '0').localeCompare(b.lastReview || '0') || a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function topWords(s: Study, limit = 10) {
  const seen = new Map<string, Word>();
  for (const w of s.words) { const prev = seen.get(w.word); if (!prev || w.count > prev.count) seen.set(w.word, w); }
  return [...seen.values()].sort((a, b) => b.count - a.count || b.date.localeCompare(a.date)).slice(0, limit);
}

export function summarize(s: Study, today = kstDate()) {
  const uniq = (xs: string[]) => new Set(xs).size;
  const pct = (done: number, all: number) => (all ? Math.round((done / all) * 100) : 0);
  const memorized = s.lesson.filter(l => l.memorized).length + s.talk.filter(t => t.memorized).length;
  const sentences = s.lesson.length + s.talk.length;
  return {
    articles: s.articles.length,
    words: uniq(s.words.map(w => w.word)),
    unknownWords: s.words.filter(w => w.unknown).length,
    grammar: uniq(s.grammar.map(g => g.pattern)),
    grammarLearned: s.grammar.filter(g => g.learned).length,
    lesson: s.lesson.length,
    sentences, memorized, memorizedPct: pct(memorized, sentences),
    streak: streak(s, today),
    lastStudy: Object.keys(activity(s)).sort().pop() ?? '',
  };
}

// 漢字（かな） 표기를 루비(후리가나) 조각으로 나눈다
export type Seg = { text: string; ruby?: string };
export function furigana(text: string): Seg[] {
  const out: Seg[] = [], re = /([㐀-鿿々〆ヶ]+)（([぀-ヿー]+)）/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[1], ruby: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
