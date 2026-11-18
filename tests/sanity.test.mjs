import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../danchoo-print-enhancer.user.js', import.meta.url), 'utf8');

test('runs only on the middle/high-school solvePaper page', () => {
  assert.match(source, /@match\s+https:\/\/ai-plus\.ebs\.co\.kr\/mid\/xip\/solvePaper\.ebs\*/);
  assert.match(source, /location\.pathname\.toLowerCase\(\) !== '\/mid\/xip\/solvepaper\.ebs'/);
});

test('keeps EBS as the owner of the print workflow', () => {
  assert.doesNotMatch(source, /window\.print\s*\(/);
  assert.doesNotMatch(source, /@page\s*\{/);
  assert.match(source, /EBS의 기존 인쇄 설정과 미리보기는 유지/);
});

test('adds question and figure fragmentation protections', () => {
  assert.match(source, /break-inside:\s*avoid/);
  assert.match(source, /page-break-inside:\s*avoid/);
  assert.match(source, /collectTopLevelQuestionRoots/);
  assert.match(source, /data-dpe-question-block/);
});

test('does not send page data to a remote service', () => {
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|GM_xmlhttpRequest|WebSocket/);
  assert.match(source, /localStorage\.getItem/);
});
