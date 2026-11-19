import { useState } from "react";
import { importantInfo } from "./important-info-data";
import type { InfoEntry } from "./important-info-data";
import "./important-info.css";

const categories = [
  { id: "all", label: "전체" },
  { id: "business", label: "사업자" },
  { id: "address", label: "주소" },
  { id: "accounts", label: "계좌" },
] as const;
const entities = [...new Set(importantInfo.map((entry) => entry.entity))];
const normalize = (text: string) =>
  text.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");

export default function ImportantInfo() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [entity, setEntity] = useState("all");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const [manualCopy, setManualCopy] = useState("");
  const tokens = query.trim().split(/\s+/).filter(Boolean).map(normalize);
  const entries = importantInfo.filter((entry) => {
    const text = normalize(
      [
        entry.entity,
        entry.title,
        ...entry.keywords,
        ...entry.fields.flatMap((f) => [f.label, f.value]),
      ].join(" "),
    );
    return (
      (category === "all" || category === entry.category) &&
      (entity === "all" || entity === entry.entity) &&
      tokens.every((token) => text.includes(token))
    );
  });
  const copy = async (text: string, key: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setManualCopy("");
      setCopied(key);
      setMessage("복사했습니다. 필요한 곳에 붙여넣으세요.");
    } catch {
      setManualCopy(text);
      setCopied("");
      setMessage(
        "자동 복사가 차단되었습니다. 아래 복사용 텍스트를 선택해 복사해 주세요.",
      );
    }
  };
  const reset = () => {
    setQuery("");
    setCategory("all");
    setEntity("all");
  };
  const groupText = (entry: InfoEntry) =>
    entry.fields
      .filter((f) => f.value.trim())
      .map((f) => `${f.label}: ${f.value}`)
      .join("\n");
  return (
    <section
      className="important-info"
      aria-label="주요 정보 보관함"
      data-noswipe
    >
      <header className="ii-heading">
        <div>
          <span className="ii-eyebrow">QUICK REFERENCE</span>
          <h1>
            주요 정보 <span className="ii-readonly">읽기 전용</span>
          </h1>
          <p>주소부터 계좌번호까지, 찾고 복사하는 나의 정보 보관함.</p>
        </div>
        <span className="ii-total">{importantInfo.length}개 정보 카드</span>
      </header>
      <div className="ii-search-panel">
        <label htmlFor="important-info-search">어떤 정보가 필요한가요?</label>
        <div className="ii-search-box">
          <span aria-hidden="true">⌕</span>
          <input
            id="important-info-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="마니페스타, 영문주소, 은행, 계좌번호…"
            autoComplete="off"
          />
          {query && (
            <button aria-label="검색어 지우기" onClick={() => setQuery("")}>
              ×
            </button>
          )}
        </div>
        <div className="ii-filters" role="group" aria-label="정보 종류">
          {categories.map((c) => (
            <button
              key={c.id}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="ii-entities" role="group" aria-label="이름별 찾기">
          <button
            aria-pressed={entity === "all"}
            onClick={() => setEntity("all")}
          >
            모든 이름
          </button>
          {entities.map((name) => (
            <button
              key={name}
              aria-pressed={entity === name}
              onClick={() => setEntity(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="ii-results">
        <span>
          검색 결과 <strong>{entries.length}</strong>
        </span>
        <span>항목별 복사 · 카드 전체 복사</span>
      </div>
      <p className="ii-notice" role="status" aria-live="polite">
        {message ||
          "아직 전달받지 않은 주소·사업자번호·계좌번호는 ‘등록 대기’로 표시됩니다."}
      </p>
      {manualCopy && (
        <label className="ii-manual-copy">
          복사용 텍스트
          <textarea
            readOnly
            aria-label="복사용 텍스트"
            value={manualCopy}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      )}
      {entries.length ? (
        <div className="ii-grid">
          {entries.map((entry) => (
            <article
              className="ii-card"
              key={entry.id}
              aria-label={`${entry.entity} ${entry.title}`}
            >
              <header>
                <div>
                  <span className="ii-entity">{entry.entity}</span>
                  <h2>{entry.title}</h2>
                </div>
                <button
                  className="ii-copy-all"
                  disabled={!groupText(entry)}
                  onClick={() => copy(groupText(entry), entry.id)}
                >
                  {copied === entry.id ? "복사됨" : "전체 복사"}
                </button>
              </header>
              <div className="ii-card-fields">
                {entry.fields.map((field, i) => {
                  const key = `${entry.id}-${i}`;
                  return (
                    <div className="ii-field" key={field.label}>
                      <div className="ii-field-label">
                        <span>{field.label}</span>
                        <button
                          aria-label={`${entry.entity} ${entry.title} ${field.label} 복사`}
                          disabled={!field.value.trim()}
                          onClick={() => copy(field.value, key)}
                        >
                          {copied === key ? "복사됨" : "복사"}
                        </button>
                      </div>
                      <pre className={field.value ? "" : "ii-pending"}>
                        <code>{field.value || "등록 대기"}</code>
                      </pre>
                    </div>
                  );
                })}
              </div>
              <footer>
                {categories.find((c) => c.id === entry.category)?.label} ·
                선택해서 복사할 수도 있어요
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="ii-empty">
          <span aria-hidden="true">⌕</span>
          <h2>일치하는 정보가 없어요</h2>
          <p>이름·은행·주소로 검색하거나 필터를 바꿔보세요.</p>
          <button onClick={reset}>전체 정보 보기</button>
        </div>
      )}
    </section>
  );
}
