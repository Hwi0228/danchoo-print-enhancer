import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../danchoo-print-enhancer.user.js', import.meta.url), 'utf8');
const fixture = await readFile(new URL('./print-fixture.html', import.meta.url), 'utf8');

test('targets only the middle/high-school solvePaper page', () => {
  assert.ok(source.includes('@match        https://ai-plus.ebs.co.kr/mid/xip/solvePaper.ebs*'));
  assert.ok(source.includes("location.pathname.toLowerCase() !== '/mid/xip/solvepaper.ebs'"));
});

test('preserves EBS native print workflow', () => {
  assert.ok(!source.includes('window.print('));
  assert.ok(!source.includes('@page {'));
  assert.ok(source.includes('EBS 기본 인쇄 흐름을 유지'));
});

test('groups sibling fragments between numbered question stems', () => {
  assert.ok(source.includes('groupQuestionFragments'));
  assert.ok(source.includes('findFirstQuestionStart'));
  assert.ok(source.includes('data-dpe-question-group'));
  assert.ok(fixture.includes('3. 두 개의 컵'));
  assert.ok(fixture.includes('class="options"'));
  assert.ok(fixture.includes('4. 다음 그림'));
});

test('uses a restrained red-accent workbook style', () => {
  assert.ok(source.includes('#d92836'));
  assert.ok(source.includes('data-dpe-number'));
  assert.ok(source.includes('break-inside:avoid'));
});

test('does not send page data to a remote service', () => {
  assert.ok(!source.includes('XMLHttpRequest'));
  assert.ok(!source.includes('GM_xmlhttpRequest'));
  assert.ok(!source.includes('WebSocket'));
  assert.ok(source.includes('localStorage.getItem'));
});