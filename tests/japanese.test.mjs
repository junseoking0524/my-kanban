import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStudy,summarize,reviewQueue,topWords,streak,furigana} from '../src/japanese-data.ts';
const raw={fetchedAt:'2026-10-19T00:00:00Z',
 words:[['2026-10-18','a1','気象庁','きしょうちょう','','기상청','','','','FALSE','1'],['2026-10-19','a2','以上','いじょう','','이상','','','','TRUE','2'],['2026-10-18','a1','以上','いじょう','','이상','','','','FALSE','1'],['','','','','','','','','','FALSE','']],
 grammar:[['2026-10-18','a1','〜によると','','~에 따르면','N3','','','TRUE','2']],
 talk:[['2026-10-18','a1','실전 표현','','','今調べているところです。','','조사 중','','FALSE']],
 articles:[['2026-10-18','a1','2026-10-16','T','제목','재난','','https://x','']],
 lesson:[['2026-10-19','1','A','x','고쳐요','勉強（べんきょう）です','','','','','','','FALSE','2','2026-10-19'],['2026-10-19','1','B','y','정답','日常会話（にちじょうかいわ）','','','','','','','FALSE','0',''],['2026-10-19','1','C','z','정답','外（そと）','','','','','','','TRUE','0','']]};
test('parses sheet rows and skips empty checkbox rows',()=>{const s=parseStudy(raw);assert.equal(s.words.length,3);assert.equal(s.lesson.length,3);assert.equal(s.words[1].unknown,true);});
test('summary counts unique words and memorized sentences',()=>{const sum=summarize(parseStudy(raw),'2026-10-19');assert.equal(sum.words,2);assert.equal(sum.unknownWords,1);assert.equal(sum.memorized,1);assert.equal(sum.sentences,4);assert.equal(sum.memorizedPct,25);assert.equal(sum.streak,2);assert.equal(sum.lastStudy,'2026-10-19');});
test('streak allows today to be empty but breaks on a gap',()=>{const s=parseStudy(raw);assert.equal(streak(s,'2026-10-20'),2);assert.equal(streak(s,'2026-10-21'),0);});
test('review queue skips memorized and puts least-reviewed first',()=>{assert.deepEqual(reviewQueue(parseStudy(raw)).map(l=>l.intent),['B','A']);});
test('top words dedupe by word keeping highest count',()=>{const w=topWords(parseStudy(raw));assert.equal(w[0].word,'以上');assert.equal(w[0].count,2);assert.equal(w.length,2);});
test('furigana splits kanji（kana）',()=>{assert.deepEqual(furigana('AIを使（つか）って'),[{text:'AIを'},{text:'使',ruby:'つか'},{text:'って'}]);});
