import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDaily, kstDate, collect } from '../api/seoulthe1-daily.js';

const kw = [{ id: 'a', keyword: '판교신경외과', status: 'ELIGIBLE', locked: false },
  { id: 'b', keyword: '판교정형외과', status: 'ELIGIBLE', locked: false }];

test('어제 성과로 일일 메시지를 만든다', () => {
  const m = buildDaily({ keywords: kw, budget: 12000,
    y: { a: { id: 'a', impCnt: 20, clkCnt: 2, salesAmt: 154 }, b: { id: 'b', impCnt: 17, clkCnt: 0, salesAmt: 0 } },
    p: { a: { id: 'a', impCnt: 200, clkCnt: 0, salesAmt: 0 } } }, '2026-11-19');
  assert.match(m.text, /노출 37 · 클릭 2 · 비용 154원/);
  assert.match(m.text, /클릭 키워드: 판교신경외과 2회/);
  assert.equal(m.alerts.length, 0);
});

test('노출 0, 예산 소진, 비용 급증, 노출 불가 상태를 알린다', () => {
  const zero = buildDaily({ keywords: [{ ...kw[0], status: 'PAUSED' }], budget: 12000, y: {}, p: { a: { impCnt: 700, salesAmt: 700 } } }, '2026-11-19');
  assert.ok(zero.alerts.some((a) => a.includes('노출 0')));
  assert.ok(zero.alerts.some((a) => a.includes('노출 급감')));
  assert.ok(zero.alerts.some((a) => a.includes('노출 불가 상태 키워드 1개')));
  const hot = buildDaily({ keywords: kw, budget: 12000, y: { a: { impCnt: 50, clkCnt: 30, salesAmt: 10000 } }, p: { a: { impCnt: 350, salesAmt: 7000 } } }, '2026-11-19');
  assert.ok(hot.alerts.some((a) => a.includes('예산 소진 임박')));
  assert.ok(hot.alerts.some((a) => a.includes('비용 급증')));
});

test('KST 기준 어제 날짜', () => {
  assert.equal(kstDate(-1, new Date('2026-11-23T00:30:00Z')), '2026-11-22');
  assert.equal(kstDate(-1, new Date('2026-11-22T15:30:00Z')), '2026-11-22');
});

test('파워링크 캠페인만 모으고 합계 통계는 ids 로 조회한다', async () => {
  const calls = [];
  const call = async (m, uri, params) => {
    calls.push([uri, params]);
    if (uri === '/ncc/campaigns') return [{ nccCampaignId: 'c1', campaignTp: 'WEB_SITE' }, { nccCampaignId: 'c2', campaignTp: 'PLACE' }];
    if (uri === '/ncc/adgroups') return [{ nccAdgroupId: 'g1', dailyBudget: 12000 }];
    if (uri === '/ncc/keywords') return [{ nccKeywordId: 'a', keyword: '판교신경외과', status: 'ELIGIBLE' }];
    if (uri === '/stats') return { data: [{ id: 'a', impCnt: 1 }] };
  };
  const r = await collect(call, '2026-11-19');
  assert.equal(r.budget, 12000);
  assert.equal(calls.filter(([u]) => u === '/ncc/adgroups').length, 1);
  const st = calls.filter(([u]) => u === '/stats');
  assert.equal(st.length, 2);
  assert.ok(st.every(([, p]) => p.ids && !p.timeIncrement));
  assert.equal(JSON.parse(st[1][1].timeRange).since, '2026-11-12');
});
