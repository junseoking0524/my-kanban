import { useCallback, useEffect, useState } from 'react';
import { parseStudy, summarize, reviewQueue, topWords, activity, furigana, kstDate, shiftDate } from './japanese-data';
import type { Study, Lesson } from './japanese-data';
import './japanese.css';

const SHEET_URL = import.meta.env.VITE_JP_SHEET_URL as string | undefined;

function Ruby({ text }: { text: string }) {
  return <>{furigana(text).map((s, i) => s.ruby ? <ruby key={i}>{s.text}<rt>{s.ruby}</rt></ruby> : <span key={i}>{s.text}</span>)}</>;
}

async function fetchStudy(fresh = false): Promise<Study> {
  const r = await fetch(`/api/japanese${fresh ? '?fresh=1' : ''}`);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `불러오기 실패 (${r.status})`);
  return parseStudy(body);
}

function ReviewCard({ l }: { l: Lesson }) {
  const [open, setOpen] = useState(false);
  return <button className={`jp-review${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open}>
    <span className="jp-review-q">{l.intent || l.meaning}</span>
    {open ? <span className="jp-review-a">
      <span className="jp-ja"><Ruby text={l.natural}/></span>
      {l.pron && <small>{l.pron}</small>}
      {l.casual && <span className="jp-casual">편하게: <Ruby text={l.casual}/></span>}
      {l.point && <small className="jp-point">{l.point}</small>}
    </span> : <small>눌러서 일본어 보기 · 복습 {l.reviews}회</small>}
  </button>;
}

export default function JapaneseDashboard() {
  const [study, setStudy] = useState<Study | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const apply = useCallback((p: Promise<Study>) => p.then(v => { setStudy(v); setError(''); }, (e: unknown) => setError(e instanceof Error ? e.message : '불러오기 실패')).finally(() => setLoading(false)), []);
  const load = (fresh = false) => { setLoading(true); apply(fetchStudy(fresh)); };
  useEffect(() => { apply(fetchStudy()); }, [apply]);

  const today = kstDate();
  const header = <header className="jp-heading"><div><span className="jp-eyebrow">日本語 · NHK EASY</span><h1>일본어 학습</h1><p>{today} 기준{study?.fetchedAt ? ` · ${new Date(study.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })} 동기화` : ''}</p></div>
    <div className="jp-actions"><button onClick={() => load(true)} disabled={loading}>{loading ? '불러오는 중…' : '새로고침'}</button>{SHEET_URL && <a href={SHEET_URL} target="_blank" rel="noopener noreferrer">학습 시트 ↗</a>}</div></header>;
  if (!study) return <div className="jp">{header}<p className="jp-status" role="status">{error || '학습 시트를 불러오는 중…'}</p></div>;

  const sum = summarize(study, today), queue = reviewQueue(study), words = topWords(study, 12), days = activity(study);
  const unknown = study.words.filter(w => w.unknown);
  const grid = Array.from({ length: 28 }, (_, i) => shiftDate(today, i - 27));
  const articles = [...study.articles].sort((a, b) => b.date.localeCompare(a.date));
  const grammar = [...study.grammar].sort((a, b) => b.count - a.count || b.date.localeCompare(a.date));
  const jlpt = ['N5', 'N4', 'N3', 'N2', 'N1'].map(k => [k, study.grammar.filter(g => g.jlpt === k).length] as const).filter(([, n]) => n);

  return <div className="jp">
    {header}
    {error && <p className="jp-status" role="status">{error} · 마지막으로 불러온 내용을 표시해요.</p>}
    <div className="jp-stats">
      {([['연속 학습', sum.streak, '일', sum.lastStudy ? `마지막 학습 ${sum.lastStudy}` : '아직 기록 없음'],
        ['읽은 기사', sum.articles, '편', 'NHK EASY'],
        ['단어', sum.words, '개', `모름 체크 ${sum.unknownWords}개`],
        ['문법', sum.grammar, '개', `익힘 ${sum.grammarLearned}개`],
        ['문장 외움', sum.memorizedPct, '%', `${sum.memorized} / ${sum.sentences}문장`]] as const).map(([label, value, unit, sub]) =>
        <div key={label}><span>{label}</span><strong>{value}<small>{unit}</small></strong><p>{sub}</p></div>)}
    </div>

    <section className="jp-card"><h3>최근 4주 학습</h3>
      <div className="jp-heat" role="img" aria-label="최근 28일 학습 기록">
        {grid.map(d => { const n = days[d] ?? 0, lv = n === 0 ? 0 : n < 5 ? 1 : n < 12 ? 2 : 3;
          return <span key={d} className={`lv${lv}${d === today ? ' today' : ''}`} title={`${d} · ${n}개 학습`}/>; })}
      </div>
      <p className="jp-note">한 칸이 하루예요. 그날 시트에 들어간 기사·단어·문법·문장 수로 색이 진해져요.</p>
    </section>

    <div className="jp-grid">
      <section className="jp-card"><h3>오늘의 복습 <small>전화 수업 표현 · 덜 본 순서</small></h3>
        {queue.length ? queue.map((l, i) => <ReviewCard key={`${l.date}-${i}`} l={l}/>) : <p className="jp-note">복습할 수업 표현이 없어요. 전부 외웠거나 아직 등록 전이에요.</p>}
      </section>
      <section className="jp-card"><h3>최근 읽은 기사</h3>
        {articles.slice(0, 6).map(a => <a key={a.id} className="jp-article" href={a.url} target="_blank" rel="noopener noreferrer">
          <span className="jp-tag">{a.topic || '기사'}</span><b>{a.title}</b><small>{a.titleKo}</small><small>{a.date}{a.grammar ? ` · ${a.grammar}` : ''}</small></a>)}
        {!articles.length && <p className="jp-note">아직 학습한 기사가 없어요.</p>}
      </section>
    </div>

    <div className="jp-grid">
      <section className="jp-card"><h3>자주 나온 단어</h3>
        <div className="jp-words">{words.map(w => <div key={w.word} title={w.hun}><ruby>{w.word}<rt>{w.reading}</rt></ruby><small>{w.meaning}</small>{w.count > 1 && <em>{w.count}회</em>}</div>)}</div>
        {unknown.length > 0 && <><h4>모름 체크한 단어 {unknown.length}개</h4><div className="jp-words">{unknown.slice(0, 12).map(w => <div key={w.word + w.date}><ruby>{w.word}<rt>{w.reading}</rt></ruby><small>{w.meaning}</small></div>)}</div></>}
      </section>
      <section className="jp-card"><h3>문법 {jlpt.length > 0 && <small>{jlpt.map(([k, n]) => `${k} ${n}`).join(' · ')}</small>}</h3>
        {grammar.slice(0, 8).map((g, i) => <div key={g.pattern + i} className="jp-row"><div><b>{g.pattern}</b>{g.jlpt && <span className="jp-tag">{g.jlpt}</span>}{g.learned && <span className="jp-tag done">익힘</span>}<small>{g.meaning}</small></div>{g.count > 1 && <em>{g.count}회</em>}</div>)}
        {!grammar.length && <p className="jp-note">아직 정리한 문법이 없어요.</p>}
      </section>
    </div>
    <p className="jp-note">이 화면은 학습 시트를 읽기만 해요. 외움·모름 체크는 시트에서 바꾸면 새로고침 후 반영돼요.</p>
  </div>;
}
