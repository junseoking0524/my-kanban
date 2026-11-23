import { useEffect, useState } from "react";

// 서울더원 파워링크 모니터링: /api/seoulthe1-monitor 가 읽어온 구글 시트 대시보드를 보여준다 (읽기 전용).
type Metric = { label: string; cur: string; prev: string; change: string };
type Alert = { label: string; threshold: string; value: string; status: string };
type Rec = { action: string; count: string };
type Kw = { keyword: string; group: string; action: string; diagnosis: string; bid: string; proposed: string;
  target: string; rank: string; imp: string; clk: string; cost: string; reason: string };
type Data = { sheetUrl: string; period: { start: string; end: string; prevStart: string; prevEnd: string };
  metrics: Metric[]; alerts: Alert[]; alertCount: string; recs: Rec[]; keywords: Kw[] };

const ACTION_BG: Record<string, string> = { "상향": "#e2efda", "하향": "#fce4d6", "OFF": "#f8cbad", "보류": "#fff2cc" };
const box: React.CSSProperties = { background: "#fff", border: "1px solid #e1e3e8", borderRadius: 10, padding: "12px 14px" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11, color: "#71717a", fontWeight: 600, padding: "4px 6px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { fontSize: 12, padding: "5px 6px", borderTop: "1px solid #f1f2f4", verticalAlign: "top" };
const num: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

export default function MonitorView() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<{ msg: string; url?: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/seoulthe1-monitor")
      .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || `HTTP ${r.status}`), { url: j.sheetUrl }); return j; })
      .then(j => { if (alive) setData(j); })
      .catch((e: Error & { url?: string }) => { if (alive) setError({ msg: e.message, url: e.url }); });
    return () => { alive = false; };
  }, []);

  if (error) return (
    <div style={{ ...box, fontSize: 12.5, lineHeight: 1.6, color: "#52525b" }}>
      <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>모니터링 데이터를 불러오지 못했습니다</div>
      {error.msg}
      {error.url && <div style={{ marginTop: 8 }}><a href={error.url} target="_blank" rel="noreferrer">구글 시트 대시보드 열기 ↗</a></div>}
    </div>
  );
  if (!data) return <div style={{ textAlign: "center", color: "var(--text-light)", paddingTop: 60, fontSize: 13 }}>불러오는 중…</div>;

  const alertsOn = data.alerts.filter(a => a.status === "알림");
  const actionable = data.keywords.filter(k => k.action !== "유지" || k.diagnosis === "상한 판단");
  const list = showAll ? data.keywords : actionable;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#52525b" }}>
          {data.period.start} ~ {data.period.end} <span style={{ color: "#a1a1aa" }}>(전주 {data.period.prevStart} ~ {data.period.prevEnd})</span>
        </div>
        <a href={data.sheetUrl} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontSize: 11.5 }}>구글 시트 대시보드 열기 ↗</a>
      </div>

      <div style={{ ...box, borderColor: alertsOn.length ? "#f4cccc" : "#d9ead3", background: alertsOn.length ? "#fff7f7" : "#f7fbf5" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>알림 {alertsOn.length}건</div>
        {alertsOn.length === 0 ? <div style={{ fontSize: 12, color: "#52525b" }}>기준을 넘은 항목이 없습니다.</div> :
          alertsOn.map(a => (
            <div key={a.label} style={{ fontSize: 12, color: "#7f1d1d", padding: "2px 0" }}>
              • {a.label}: 현재 {a.value} <span style={{ color: "#a1a1aa" }}>(기준 {a.threshold})</span>
            </div>))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        <div style={box}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>주간 지표</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>지표</th><th style={{ ...th, textAlign: "right" }}>이번 주</th><th style={{ ...th, textAlign: "right" }}>전주</th><th style={{ ...th, textAlign: "right" }}>증감</th></tr></thead>
            <tbody>{data.metrics.map(m => (
              <tr key={m.label}><td style={td}>{m.label}</td><td style={num}>{m.cur}</td><td style={{ ...num, color: "#71717a" }}>{m.prev}</td><td style={num}>{m.change}</td></tr>))}
            </tbody>
          </table>
          <div style={{ fontSize: 10.5, color: "#a1a1aa", marginTop: 6 }}>API 비용은 VAT 별도, 광고관리 화면은 VAT 포함(×1.1)</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>입찰 추천</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {data.recs.map(r => (
              <div key={r.action} style={{ background: ACTION_BG[r.action] || "#f1f2f4", borderRadius: 8, padding: "6px 10px", minWidth: 58 }}>
                <div style={{ fontSize: 10.5, color: "#52525b" }}>{r.action}</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{r.count}</div>
              </div>))}
          </div>
          <div style={{ fontSize: 10.5, color: "#a1a1aa", marginTop: 8, lineHeight: 1.5 }}>
            추천은 자동 반영되지 않습니다. 반영은 PC의 모니터링 툴에서 미리보기 확인 후 apply --execute 로만.
          </div>
        </div>
      </div>

      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{showAll ? `전체 키워드 ${data.keywords.length}개` : `확인할 키워드 ${actionable.length}개`}</div>
          <button onClick={() => setShowAll(v => !v)} style={{ marginLeft: "auto", fontSize: 11, color: "#52525b", textDecoration: "underline" }}>
            {showAll ? "확인할 것만" : "전체 보기"}
          </button>
        </div>
        <div style={{ overflowX: "auto" }} data-noswipe>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr>{["추천", "키워드", "현재→추천", "순위(목표)", "노출/클릭", "비용", "근거"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{list.map(k => (
              <tr key={k.keyword}>
                <td style={td}><span style={{ background: ACTION_BG[k.action] || "#f1f2f4", borderRadius: 6, padding: "1px 6px", fontSize: 11 }}>{k.action}</span></td>
                <td style={{ ...td, fontWeight: 600 }}>{k.keyword}</td>
                <td style={num}>{k.bid}{k.proposed && k.proposed !== k.bid ? ` → ${k.proposed}` : ""}</td>
                <td style={num}>{k.rank || "-"} ({k.target || "-"})</td>
                <td style={num}>{k.imp}/{k.clk}</td>
                <td style={num}>{k.cost}</td>
                <td style={{ ...td, color: "#52525b", fontSize: 11.5 }}>{k.diagnosis === "상한 판단" ? <b style={{ color: "#b91c1c" }}>상한 판단 · </b> : null}{k.reason}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
