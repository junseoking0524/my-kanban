import { useState } from "react";
import "./memo.css";

const KEY = "kanban.scratchpad.v1";
type Memo = { version: 1; text: string; updatedAt: string };
function readMemo(): { memo: Memo; error: string; locked: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw)
      return {
        memo: { version: 1, text: "", updatedAt: "" },
        error: "",
        locked: false,
      };
    const value = JSON.parse(raw);
    if (
      value?.version !== 1 ||
      typeof value.text !== "string" ||
      typeof value.updatedAt !== "string"
    )
      throw new Error();
    return { memo: value, error: "", locked: false };
  } catch {
    return {
      memo: { version: 1, text: "", updatedAt: "" },
      error:
        "기존 메모를 읽을 수 없어 덮어쓰기를 막았습니다. 같은 브라우저에서 저장소 접근을 확인해 주세요.",
      locked: true,
    };
  }
}
function codeBlock(text: string) {
  const runs = text.match(/`+/g) || [];
  const fence = "`".repeat(
    runs.reduce((max, run) => Math.max(max, run.length + 1), 3),
  );
  return `${fence}\n${text}\n${fence}`;
}
export default function MemoView() {
  const [boot] = useState(readMemo);
  const [memo, setMemo] = useState(boot.memo);
  const [error, setError] = useState(boot.error);
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const save = (text: string, manual = false) => {
    const next: Memo = {
      version: 1,
      text,
      updatedAt: new Date().toISOString(),
    };
    setMemo(next);
    if (boot.locked) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setError("");
      setMessage(manual ? "저장했습니다." : "자동 저장됨");
    } catch {
      setError(
        "기기에 저장하지 못했습니다. 이 화면의 내용은 유지됩니다. 코드 블록으로 복사해 보관한 뒤 다시 저장해 주세요.",
      );
      setMessage("");
    }
  };
  const copyBlock = async () => {
    const block = codeBlock(memo.text);
    setOutput(block);
    try {
      await navigator.clipboard.writeText(block);
      setMessage("코드 블록을 복사했습니다. 원하는 곳에 붙여넣으세요.");
    } catch {
      setMessage(
        "코드 블록을 출력했습니다. 아래 복사용 텍스트를 선택해 복사해 주세요.",
      );
    }
  };
  return (
    <section className="memo-pad" aria-label="메모 스크래치패드" data-noswipe>
      <header className="memo-heading">
        <div>
          <span className="memo-eyebrow">SCRATCHPAD</span>
          <h1>메모</h1>
          <p>할 일은 아니지만 챙겨두면 좋은 것들. 생각나는 대로 적어두세요.</p>
        </div>
        <div className="memo-buttons">
          <button onClick={() => save(memo.text, true)} disabled={boot.locked}>
            저장하기
          </button>
          <button className="memo-primary" onClick={copyBlock}>
            코드 블록 출력·복사
          </button>
        </div>
      </header>
      <div className="memo-status" role="status" aria-live="polite">
        {error
          ? "저장 상태를 확인해 주세요."
          : message ||
            (memo.updatedAt
              ? "저장된 메모를 불러왔습니다."
              : "입력하면 이 기기에 자동 저장됩니다.")}
        {memo.updatedAt && !error && (
          <time dateTime={memo.updatedAt}>
            {new Date(memo.updatedAt).toLocaleString("ko-KR")}
          </time>
        )}
      </div>
      {error && (
        <p className="memo-error" role="alert">
          {error}
        </p>
      )}
      <label className="memo-label" htmlFor="scratchpad-text">
        자유 메모
      </label>
      <textarea
        id="scratchpad-text"
        className="memo-editor"
        value={memo.text}
        disabled={boot.locked}
        onChange={(e) => {
          save(e.target.value);
          setOutput(null);
        }}
        placeholder={"나중에 찾아볼 것\n챙기면 좋을 것\n떠오른 아이디어…"}
        spellCheck={false}
      />
      <footer className="memo-foot">
        <span>{memo.text.length.toLocaleString()}자</span>
        <span>
          현재 브라우저·홈 화면 앱에 보관됩니다. 다른 기기로 동기화하지 않으며,
          브라우저 데이터 삭제 시 지워질 수 있습니다.
        </span>
      </footer>
      {output !== null && (
        <section className="memo-output" aria-label="코드 블록 출력">
          <div className="memo-output-heading">
            <h2>코드 블록</h2>
            <button onClick={() => setOutput(null)}>출력 닫기</button>
          </div>
          <pre>
            <code>{memo.text}</code>
          </pre>
          <label htmlFor="scratchpad-copy">복사용 텍스트</label>
          <textarea
            id="scratchpad-copy"
            readOnly
            value={output}
            onFocus={(e) => e.currentTarget.select()}
            rows={6}
          />
        </section>
      )}
    </section>
  );
}
