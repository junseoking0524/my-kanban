import { useState, useCallback, useEffect } from 'react';

const FONT = "'Nanum Gothic', 'Apple SD Gothic Neo', sans-serif";

const CAL_LABELS = [
  { id: 'family', ko: '가족', color: '#E74C3C', text: '#fff' },
  { id: 'junseok', ko: '준석', color: '#555F6E', text: '#fff' },
  { id: 'default', ko: '기본', color: '#F5C518', text: '#333' },
  { id: 'business', ko: '대상업무', color: '#2980B9', text: '#fff' },
  { id: 'noupdate', ko: '미분류', color: '#1A1A1A', text: '#fff' },
];
const PERSONAL_LABELS = ['family', 'default', 'noupdate'];
const getLbl = (id) => CAL_LABELS.find((l) => l.id === id) || CAL_LABELS[2];

const BOARDS_DEF = [
  {
    id: 'work',
    title: '업무 칸반보드',
    titleEn: 'WORK BOARD',
    cols: [
      { id: 'todo', ko: '할 일', en: 'TO DO', ja: 'やること' },
      { id: 'inprogress', ko: '진행 중', en: 'IN PROGRESS', ja: '進行中' },
      { id: 'done', ko: '완료', en: 'DONE', ja: '完了' },
    ],
  },
  {
    id: 'personal',
    title: '개인 주요사항',
    titleEn: 'PERSONAL',
    cols: [
      { id: 'check', ko: '확인', en: 'CHECK', ja: '確認' },
      { id: 'carry', ko: '챙길 것', en: 'TO BRING', ja: '持ち物' },
      { id: 'done2', ko: '완료', en: 'DONE', ja: '完了' },
    ],
  },
];

function parseDate(raw) {
  if (!raw) return '';
  const s = raw.trim().replace(/[.\s]/g, '');
  const y = new Date().getFullYear();
  if (/^\d{8}$/.test(s))
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const md = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (md) return `${y}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`;
  if (/^\d{4}$/.test(s)) {
    const m = s.slice(0, 2),
      d = s.slice(2, 4);
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) return `${y}-${m}-${d}`;
  }
  return raw.trim();
}

// ── Sheets API 연동 ──────────────────────────────────────────
async function apiFetch(method, boardId, body, cardId) {
  const url = cardId
    ? `/api/cards?boardId=${boardId}&id=${cardId}`
    : `/api/cards?boardId=${boardId}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === 'GET') return res.json();
  return res.ok;
}

const iStyle = {
  width: '100%',
  fontSize: 13,
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #EFEFEF',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: FONT,
  background: '#FAFAFA',
  color: '#333',
};
const lStyle = {
  fontSize: 10,
  color: '#BBB',
  display: 'block',
  marginBottom: 4,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};
const btnS = {
  fontSize: 11,
  padding: '3px 10px',
  borderRadius: 4,
  border: '1px solid #E0E0E0',
  background: '#fff',
  color: '#555',
  cursor: 'pointer',
  fontFamily: FONT,
};

// ── 우측 패널 ──────────────────────────────────────────────────────────
function SidePanel({ form, setForm, cols, mode, onSave, onDelete, onClose }) {
  const lbl = getLbl(form.labelId);
  const [dateRaw, setDateRaw] = useState(form.dueDate || '');
  const handleDateBlur = () => {
    const p = parseDate(dateRaw);
    setDateRaw(p);
    setForm((f) => ({ ...f, dueDate: p }));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 292,
        background: '#fff',
        borderLeft: '1px solid #EBEBEB',
        boxShadow: '-6px 0 24px rgba(0,0,0,0.07)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          padding: '13px 16px 12px',
          borderBottom: '1px solid #F2F2F2',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: lbl.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111', flex: 1 }}>
          {mode === 'add' ? '새 카드 추가' : '카드 편집'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 15,
            color: '#CCC',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 13,
        }}
      >
        <div>
          <label style={lStyle}>캘린더 분류</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {CAL_LABELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setForm((f) => ({ ...f, labelId: l.id }))}
                style={{
                  fontSize: 10,
                  padding: '3px 9px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontWeight: 700,
                  background: form.labelId === l.id ? l.color : '#F5F5F5',
                  color: form.labelId === l.id ? l.text : '#999',
                  border:
                    form.labelId === l.id
                      ? `1.5px solid ${l.color}`
                      : '1.5px solid transparent',
                }}
              >
                {l.ko}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={lStyle}>상태 (컬럼)</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {cols.map((c) => (
              <button
                key={c.id}
                onClick={() => setForm((f) => ({ ...f, colId: c.id }))}
                style={{
                  fontSize: 11,
                  padding: '4px 11px',
                  borderRadius: 5,
                  cursor: 'pointer',
                  fontFamily: FONT,
                  background: form.colId === c.id ? '#111' : '#F5F5F5',
                  color: form.colId === c.id ? '#fff' : '#888',
                  border: 'none',
                  fontWeight: form.colId === c.id ? 700 : 400,
                }}
              >
                {c.ko}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={lStyle}>제목</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="카드 제목"
            autoFocus
            style={iStyle}
          />
        </div>
        <div>
          <label style={lStyle}>메모</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="메모 (선택)"
            rows={4}
            style={{ ...iStyle, resize: 'vertical', lineHeight: 1.55 }}
          />
        </div>
        <div>
          <label style={lStyle}>
            마감일{' '}
            <span style={{ fontWeight: 400, color: '#CCC' }}>
              (0530 · 5/30 · 2026-05-30)
            </span>
          </label>
          <input
            value={dateRaw}
            onChange={(e) => {
              setDateRaw(e.target.value);
              setForm((f) => ({ ...f, dueDate: e.target.value }));
            }}
            onBlur={handleDateBlur}
            placeholder="예) 0530"
            style={iStyle}
          />
        </div>
        <div
          style={{
            background: '#FAFAFA',
            borderRadius: 8,
            padding: '10px 12px',
            border: '1px solid #F0F0F0',
          }}
        >
          <p
            style={{
              margin: '0 0 5px',
              fontSize: 10,
              color: '#CCC',
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            미리보기
          </p>
          <div style={{ borderLeft: `3px solid ${lbl.color}`, paddingLeft: 8 }}>
            <span
              style={{
                fontSize: 9,
                padding: '1px 6px',
                borderRadius: 8,
                background: lbl.color,
                color: lbl.text,
                fontWeight: 700,
                marginBottom: 4,
                display: 'inline-block',
              }}
            >
              {lbl.ko}
            </span>
            <p
              style={{
                margin: '3px 0 1px',
                fontSize: 12,
                fontWeight: 700,
                color: '#111',
              }}
            >
              {form.title || '—'}
            </p>
            {form.note && (
              <p style={{ margin: 0, fontSize: 10, color: '#AAA' }}>
                {form.note}
              </p>
            )}
            {form.dueDate && (
              <p style={{ margin: '3px 0 0', fontSize: 10, color: '#BABABA' }}>
                {form.dueDate}
              </p>
            )}
          </div>
        </div>
      </div>
      <div
        style={{
          padding: '11px 16px',
          borderTop: '1px solid #F2F2F2',
          display: 'flex',
          gap: 7,
        }}
      >
        <button
          onClick={onSave}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 6,
            border: 'none',
            background: '#111',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: FONT,
          }}
        >
          저장
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #EFEFEF',
            background: '#fff',
            color: '#AAA',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: FONT,
          }}
        >
          취소
        </button>
        {mode === 'edit' && (
          <button
            onClick={onDelete}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: '#FFF0EE',
              color: '#D04040',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

// ── 캘린더 ──────────────────────────────────────────────────────────────
function MiniCalendar({ allCards, onDateClick }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const weeks = [];
  let day = 1 - firstDay;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++, day++) week.push(day);
    weeks.push(week);
    if (day > daysInMonth) break;
  }
  const cardsByDate = {};
  allCards.forEach((c) => {
    if (c.dueDate) {
      if (!cardsByDate[c.dueDate]) cardsByDate[c.dueDate] = [];
      cardsByDate[c.dueDate].push(c);
    }
  });
  const pad = (n) => String(n).padStart(2, '0');
  const monthNames = [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #EFEFEF',
        borderRadius: 10,
        padding: '14px 14px 12px',
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={() => {
            if (viewMonth === 0) {
              setViewMonth(11);
              setViewYear((y) => y - 1);
            } else setViewMonth((m) => m - 1);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#AAA',
            fontSize: 14,
            padding: '0 6px',
          }}
        >
          ‹
        </button>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#111',
          }}
        >
          {viewYear}년 {monthNames[viewMonth]}
        </span>
        <button
          onClick={() => {
            if (viewMonth === 11) {
              setViewMonth(0);
              setViewYear((y) => y + 1);
            } else setViewMonth((m) => m + 1);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#AAA',
            fontSize: 14,
            padding: '0 6px',
          }}
        >
          ›
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,1fr)',
          marginBottom: 4,
        }}
      >
        {dayNames.map((d, i) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: i === 0 ? '#E74C3C' : i === 6 ? '#2980B9' : '#BBB',
              padding: '2px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div
          key={wi}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            marginBottom: 2,
          }}
        >
          {week.map((d, di) => {
            if (d < 1 || d > daysInMonth) return <div key={di} />;
            const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
            const dots = cardsByDate[dateStr] || [];
            const isToday =
              d === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear === today.getFullYear();
            return (
              <div
                key={di}
                onClick={() => onDateClick(dateStr)}
                style={{
                  textAlign: 'center',
                  padding: '3px 1px',
                  cursor: 'pointer',
                  borderRadius: 6,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#F5F5F5')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday
                      ? '#fff'
                      : di === 0
                      ? '#E74C3C'
                      : di === 6
                      ? '#2980B9'
                      : '#333',
                    background: isToday ? '#111' : 'transparent',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {d}
                </span>
                {dots.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: 2,
                      marginTop: 1,
                    }}
                  >
                    {dots.slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: getLbl(c.labelId).color,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div
        style={{
          borderTop: '1px solid #F5F5F5',
          marginTop: 10,
          paddingTop: 8,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 10px',
        }}
      >
        {CAL_LABELS.map((l) => (
          <div
            key={l.id}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: l.color,
              }}
            />
            <span style={{ fontSize: 10, color: '#AAA' }}>{l.ko}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 휴지통 드롭존 ──────────────────────────────────────────────────────
function TrashZone({ dragging, onDrop }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop();
      }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: 240,
        height: over ? 140 : 100,
        borderTop: `2px dashed ${
          over ? '#D04040' : dragging ? '#CCC' : '#E0E0E0'
        }`,
        borderRight: `2px dashed ${
          over ? '#D04040' : dragging ? '#CCC' : '#E0E0E0'
        }`,
        borderRadius: '0 12px 0 0',
        background: over ? '#FFF0EE' : dragging ? '#F7F7F7' : '#FAFAFA',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 0.18s',
        opacity: dragging ? 1 : 0.35,
        zIndex: 600,
        cursor: dragging ? 'copy' : 'default',
        pointerEvents: dragging ? 'auto' : 'none',
      }}
    >
      <span style={{ fontSize: 28, color: over ? '#D04040' : '#CCC' }}>🗑</span>
      <span
        style={{
          fontSize: 11,
          color: over ? '#D04040' : '#BBB',
          fontFamily: FONT,
          fontWeight: over ? 700 : 400,
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        {over ? '놓으면 삭제됩니다' : '드래그하여 삭제'}
      </span>
    </div>
  );
}

// ── 단일 보드 ──────────────────────────────────────────────────────────
function Board({
  boardDef,
  panelState,
  setPanelState,
  hidePersonal,
  allCardsRef,
  globalDragging,
  setGlobalDragging,
  onTrashDrop,
}) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [dragOverCard, setDragOverCard] = useState(null);

  useEffect(() => {
    apiFetch('GET', boardDef.id)
      .then((data) => {
        setCards(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [boardDef.id]);

  allCardsRef[boardDef.id] = cards;

  onTrashDrop[boardDef.id] = async (cardId) => {
    setCards((p) => p.filter((c) => c.id !== cardId));
    if (panelState?.form?.id === cardId) setPanelState(null);
    await apiFetch('DELETE', boardDef.id, null, cardId);
  };

  const byCol = (colId) => {
    let filtered = cards.filter((c) => c.colId === colId);
    if (hidePersonal && boardDef.id === 'work')
      filtered = filtered.filter((c) => !PERSONAL_LABELS.includes(c.labelId));
    return filtered;
  };

  const isMyPanel = panelState?.boardId === boardDef.id;
  const openAdd = (colId) =>
    setPanelState({
      boardId: boardDef.id,
      mode: 'add',
      form: { colId, title: '', note: '', dueDate: '', labelId: 'default' },
    });
  const openEdit = (card) =>
    setPanelState({ boardId: boardDef.id, mode: 'edit', form: { ...card } });

  const handleSave = async () => {
    if (!panelState?.form?.title?.trim()) return;
    const f = {
      ...panelState.form,
      dueDate: parseDate(panelState.form.dueDate),
    };
    if (panelState.mode === 'add') {
      const newCard = { id: 'c' + Date.now(), ...f };
      setCards((p) => [...p, newCard]);
      await apiFetch('POST', boardDef.id, newCard);
    } else {
      setCards((p) => p.map((c) => (c.id === f.id ? { ...c, ...f } : c)));
      await apiFetch('PUT', boardDef.id, f);
    }
    setPanelState(null);
  };

  const handleDelete = async () => {
    const id = panelState.form.id;
    setCards((p) => p.filter((c) => c.id !== id));
    setPanelState(null);
    await apiFetch('DELETE', boardDef.id, null, id);
  };

  const delCard = async (id) => {
    setCards((p) => p.filter((c) => c.id !== id));
    if (panelState?.form?.id === id) setPanelState(null);
    await apiFetch('DELETE', boardDef.id, null, id);
  };

  const setForm = useCallback(
    (updater) => {
      setPanelState((p) =>
        p
          ? {
              ...p,
              form: typeof updater === 'function' ? updater(p.form) : updater,
            }
          : p
      );
    },
    [setPanelState]
  );

  const onDrop = (colId, overCardId) => {
    if (!dragging) return;
    setCards((prev) => {
      const final = prev.map((c) => (c.id === dragging ? { ...c, colId } : c));
      if (!overCardId || overCardId === dragging) return final;
      const col = final.filter((c) => c.colId === colId),
        rest = final.filter((c) => c.colId !== colId);
      const fi = col.findIndex((c) => c.id === dragging),
        ti = col.findIndex((c) => c.id === overCardId);
      if (fi === -1 || ti === -1) return final;
      const r = [...col];
      const [m] = r.splice(fi, 1);
      r.splice(ti, 0, m);
      return [...rest, ...r];
    });
    setDragging(null);
    setDragOverCol(null);
    setDragOverCard(null);
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 10,
          borderBottom: '1px solid #EBEBEB',
          paddingBottom: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
          {boardDef.title}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#BBB',
            letterSpacing: 2,
          }}
        >
          {boardDef.titleEn}
        </span>
      </div>

      {loading ? (
        <div
          style={{
            fontSize: 12,
            color: '#CCC',
            padding: '20px 0',
            textAlign: 'center',
          }}
        >
          불러오는 중...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          {boardDef.cols.map((col) => (
            <div
              key={col.id}
              style={{ flex: 1, minWidth: 0 }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(col.id, null);
              }}
            >
              <div style={{ marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: '#111' }}
                  >
                    {col.ko}
                  </span>
                  <span
                    style={{ fontSize: 9, color: '#CCC', letterSpacing: 1.2 }}
                  >
                    {col.en}
                  </span>
                  <span style={{ fontSize: 9, color: '#E0E0E0' }}>
                    {col.ja}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 10,
                      color: '#CCC',
                      fontWeight: 600,
                    }}
                  >
                    {byCol(col.id).length}
                  </span>
                </div>
                <div
                  style={{
                    height: 2,
                    borderRadius: 2,
                    marginTop: 4,
                    background: dragOverCol === col.id ? '#579DFF' : '#EBEBEB',
                    transition: 'background 0.15s',
                  }}
                />
              </div>
              {byCol(col.id).map((card) => {
                const lbl = getLbl(card.labelId);
                const isSelected =
                  isMyPanel && panelState?.form?.id === card.id;
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDragging(card.id);
                      setGlobalDragging({
                        cardId: card.id,
                        boardId: boardDef.id,
                      });
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setDragOverCol(null);
                      setDragOverCard(null);
                      setGlobalDragging(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverCard(card.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDrop(col.id, card.id);
                    }}
                    onMouseDown={(e) => {
                      if (e.target.closest('button')) return;
                    }}
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      if (dragging) return;
                      openEdit(card);
                    }}
                    style={{
                      background: isSelected ? '#F7F8FF' : '#fff',
                      border:
                        dragOverCard === card.id && dragging !== card.id
                          ? '1px solid #579DFF'
                          : isSelected
                          ? '1px solid #C5CAFF'
                          : '1px solid #EFEFEF',
                      borderLeft: `3px solid ${lbl.color}`,
                      borderRadius: 7,
                      padding: '6px 8px',
                      marginBottom: 5,
                      cursor: 'pointer',
                      opacity: dragging === card.id ? 0.35 : 1,
                      position: 'relative',
                      transition: 'box-shadow 0.1s,border 0.1s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.boxShadow =
                        '0 1px 6px rgba(0,0,0,0.08)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.boxShadow = 'none')
                    }
                  >
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        delCard(card.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        background: 'none',
                        border: 'none',
                        padding: '1px 3px',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: '#D8D8D8',
                        lineHeight: 1,
                        borderRadius: 3,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = '#D04040')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = '#D8D8D8')
                      }
                    >
                      ✕
                    </button>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 8,
                          background: lbl.color,
                          color: lbl.text,
                          fontWeight: 700,
                        }}
                      >
                        {lbl.ko}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: '0 0 2px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1A1A1A',
                        lineHeight: 1.4,
                        paddingRight: 20,
                      }}
                    >
                      {card.title}
                    </p>
                    {card.note && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10,
                          color: '#AAA',
                          lineHeight: 1.3,
                        }}
                      >
                        {card.note}
                      </p>
                    )}
                    {card.dueDate && (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#BABABA',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          marginTop: 3,
                        }}
                      >
                        ⏰ {card.dueDate}
                      </span>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => openAdd(col.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  fontSize: 11,
                  padding: '5px 7px',
                  borderRadius: 5,
                  border: '1px dashed #E0E0E0',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#BABABA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: FONT,
                }}
              >
                + 추가
              </button>
            </div>
          ))}
        </div>
      )}
      {isMyPanel && (
        <SidePanel
          form={panelState.form}
          setForm={setForm}
          cols={boardDef.cols}
          mode={panelState.mode}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelState(null)}
        />
      )}
    </div>
  );
}

// ── 앱 루트 ───────────────────────────────────────────────────────────
export default function App() {
  const [panelState, setPanelState] = useState(null);
  const [hidePersonal, setHidePersonal] = useState(false);
  const [globalDragging, setGlobalDragging] = useState(null);
  const allCardsRef = {};
  const onTrashDrop = {};

  const handleDateClick = (dateStr) => {
    setPanelState({
      boardId: 'work',
      mode: 'add',
      form: {
        colId: 'todo',
        title: '',
        note: '',
        dueDate: dateStr,
        labelId: 'default',
      },
    });
  };

  const allCards = Object.values(allCardsRef).flat();

  return (
    <div
      style={{ fontFamily: FONT, background: '#FAFAFA', minHeight: '100vh' }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap');`}</style>
      <div
        style={{
          padding: '14px 20px 10px',
          borderBottom: '1px solid #EBEBEB',
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: '#BABABA',
            fontStyle: 'italic',
            letterSpacing: 0.2,
          }}
        >
          Manifesting aura; making the intangible tangible.
        </p>
        <label
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            cursor: 'pointer',
            fontSize: 12,
            color: '#888',
            userSelect: 'none',
          }}
        >
          <div
            onClick={() => setHidePersonal((v) => !v)}
            style={{
              width: 34,
              height: 18,
              borderRadius: 10,
              background: hidePersonal ? '#111' : '#DDD',
              position: 'relative',
              transition: 'background 0.2s',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 2,
                left: hidePersonal ? 18 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </div>
          개인일정 숨기기
        </label>
      </div>
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 240,
            flexShrink: 0,
            padding: '18px 14px',
            position: 'sticky',
            top: 0,
          }}
        >
          <MiniCalendar allCards={allCards} onDateClick={handleDateClick} />
        </div>
        <div
          style={{
            flex: 1,
            padding: '18px 20px 18px 6px',
            marginRight: panelState ? 300 : 0,
            transition: 'margin-right 0.22s ease',
            minWidth: 0,
          }}
        >
          {BOARDS_DEF.filter((b) => !(hidePersonal && b.id === 'personal')).map(
            (b) => (
              <Board
                key={b.id}
                boardDef={b}
                panelState={panelState}
                setPanelState={setPanelState}
                hidePersonal={hidePersonal}
                allCardsRef={allCardsRef}
                globalDragging={globalDragging}
                setGlobalDragging={setGlobalDragging}
                onTrashDrop={onTrashDrop}
              />
            )
          )}
        </div>
      </div>
      {panelState && (
        <div
          onClick={() => setPanelState(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 499 }}
        />
      )}
      <TrashZone
        dragging={globalDragging}
        onDrop={() => {
          if (globalDragging) {
            onTrashDrop[globalDragging.boardId]?.(globalDragging.cardId);
            setGlobalDragging(null);
          }
        }}
      />
    </div>
  );
}
