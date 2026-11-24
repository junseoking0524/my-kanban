import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlaceReport, parseRank } from '../api/seoulthe1-place.js';

const H = ['확인 날짜', '키워드', '우리 병원 순위', '전일 순위', '전일 대비', '광고 병원 수'];
const row = (d, k, r, ads = '5') => [d, k, r, '', '', ads];

test('순위 문자열 해석', () => {
  assert.equal(parseRank('11등'), 11);
  assert.equal(parseRank('40위 내 미노출'), 'out');
  assert.equal(parseRank('미확인'), null);
});

test('최신 기록 기준으로 키워드별 순위와 전일·전주 대비를 만든다', () => {
  const rows = [H,
    row('2026-11-11', '판교도수치료', '6등'), row('2026-11-11', '분당통증의학과', '15등'),
    row('2026-11-17', '판교도수치료', '6등'), row('2026-11-17', '분당통증의학과', '22등'),
    row('2026-11-18', '판교도수치료', '6등'), row('2026-11-18', '분당통증의학과', '22등')];
  const m = buildPlaceReport(rows, '2026-11-19');
  assert.match(m.text, /11\/18 \(수\) 기록/);
  assert.match(m.text, /★ 판교도수치료 6등 \(—, 전주 —\)/);
  assert.match(m.text, /· 분당통증의학과 22등 \(—, 전주 ▼7\)/);
  assert.ok(m.alerts.some((a) => a.includes('전주 대비 7계단 하락')));
  assert.ok(!m.alerts.some((a) => a.includes('갱신 안 됨')));
});

test('기록 중단·이탈·핵심 키워드 하락·광고 증가를 알린다', () => {
  const rows = [H,
    row('2026-11-17', '판교정형외과', '8등', '6'), row('2026-11-17', '판교재활의학과', '30등'),
    row('2026-11-18', '판교정형외과', '11등', '10'), row('2026-11-18', '판교재활의학과', '40위 내 미노출')];
  const m = buildPlaceReport(rows, '2026-11-24');
  const t = m.alerts.join('\n');
  assert.match(t, /6일째 갱신 안 됨/);
  assert.match(t, /판교정형외과: 8등 → 11등 \(3계단 하락, 핵심 키워드\)/);
  assert.match(t, /판교정형외과: 10위 밖으로 밀림/);
  assert.match(t, /판교정형외과: 광고 병원 6 → 10곳/);
  assert.match(t, /판교재활의학과: 40위 밖으로 이탈/);
});

test('기록이 없으면 그 자체를 알린다', () => {
  assert.deepEqual(buildPlaceReport([H], '2026-11-24').alerts, ['순위 기록 없음']);
});
