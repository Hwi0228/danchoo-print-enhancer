// ==UserScript==
// @name         DANCHOO Print Enhancer
// @namespace    https://github.com/Hwi0228/danchoo-print-enhancer
// @version      0.1.0
// @description  EBS DANCHOO+ 시험지 인쇄 레이아웃 도구
// @author       Hwi0228
// @match        https://ai-plus.ebs.co.kr/*
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const HOST_ID = 'dpe-ui-host';
  const TARGET = 'data-dpe-target';
  const HIDDEN = 'data-dpe-hidden';
  const PRINT_CLASS = 'dpe-printing';
  const PICK_CLASS = 'dpe-picking';
  const STORE = 'dpe.settings.v1';
  const DEFAULTS = {
    paper: 'A4',
    orientation: 'portrait',
    columns: '1',
    fontSize: 11,
    lineHeight: 1.55,
    margin: 'normal'
  };
  const MARGINS = {
    narrow: '9mm 9mm 10mm',
    normal: '14mm 14mm 15mm',
    wide: '19mm 18mm 20mm'
  };

  if (location.hostname !== 'ai-plus.ebs.co.kr' || !document.body) return;
  if (document.getElementById(HOST_ID)) return;
  const routeMatches = /exam|paper|prbm|itemsearch|lrnstts/i.test(location.pathname);
  const pageMatches = /시험지|문항 상세/.test((document.body.innerText || '').slice(0, 30000));
  if (!routeMatches && !pageMatches) return;

  let settings = readSettings();
  let target = null;
  let picking = false;
  let host;
  let shadow;

  installPrintStyles();
  buildPanel();
  window.addEventListener('beforeprint', () => {
    if (target && target.isConnected) isolateTarget(target);
  });
  window.addEventListener('afterprint', restorePage);
  window.addEventListener('pagehide', restorePage);

  function readSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
      return { ...DEFAULTS, ...sanitize(saved) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function sanitize(value) {
    if (!value || typeof value !== 'object') return {};
    const result = {};
    if (['A4', 'A5', 'Letter'].includes(value.paper)) result.paper = value.paper;
    if (['portrait', 'landscape'].includes(value.orientation)) result.orientation = value.orientation;
    if (['1', '2'].includes(String(value.columns))) result.columns = String(value.columns);
    if (Number.isFinite(Number(value.fontSize))) result.fontSize = clamp(Number(value.fontSize), 9, 14);
    if (Number.isFinite(Number(value.lineHeight))) result.lineHeight = clamp(Number(value.lineHeight), 1.2, 1.9);
    if (['narrow', 'normal', 'wide'].includes(value.margin)) result.margin = value.margin;
    return result;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORE, JSON.stringify(settings));
    } catch {
      setStatus('설정을 저장하지 못했습니다. 현재 설정은 계속 적용됩니다.');
    }
  }

  function installPrintStyles() {
    const style = document.createElement('style');
    style.id = 'dpe-print-styles';
    style.textContent = [
      '@media screen {',
      'body.' + PICK_CLASS + ' *:hover { outline:2px dashed #2563eb !important; outline-offset:2px !important; cursor:crosshair !important; }',
      '[' + TARGET + '] { outline:2px solid rgba(37,99,235,.55); outline-offset:2px; }',
      '}',
      '@media print {',
      '@page { size:A4 portrait; margin:14mm 14mm 15mm; }',
      'html, body { width:auto !important; min-width:0 !important; height:auto !important; margin:0 !important; padding:0 !important; overflow:visible !important; background:#fff !important; color:#111 !important; }',
      'body.' + PRINT_CLASS + ' [' + HIDDEN + '] { display:none !important; }',
      'body.' + PRINT_CLASS + ' #' + HOST_ID + ' { display:none !important; }',
      'body.' + PRINT_CLASS + ' [' + TARGET + '] { display:block !important; width:100% !important; max-width:none !important; height:auto !important; max-height:none !important; margin:0 !important; padding:0 !important; overflow:visible !important; border:0 !important; box-shadow:none !important; background:#fff !important; color:#111 !important; font-family:"Noto Sans KR","Malgun Gothic",sans-serif !important; font-size:var(--dpe-font-size,11pt) !important; line-height:var(--dpe-line-height,1.55) !important; column-count:var(--dpe-columns,1) !important; column-gap:9mm !important; column-fill:auto !important; }',
      'body.' + PRINT_CLASS + ' [' + TARGET + '] * { max-width:100% !important; box-sizing:border-box !important; color:inherit; line-height:inherit; }',
      'body.' + PRINT_CLASS + ' [' + TARGET + '] img, body.' + PRINT_CLASS + ' [' + TARGET + '] svg, body.' + PRINT_CLASS + ' [' + TARGET + '] canvas, body.' + PRINT_CLASS + ' [' + TARGET + '] video { max-width:100% !important; height:auto !important; break-inside:avoid !important; }',
      'body.' + PRINT_CLASS + ' [' + TARGET + '] tr, body.' + PRINT_CLASS + ' [' + TARGET + '] figure, body.' + PRINT_CLASS + ' [' + TARGET + '] blockquote, body.' + PRINT_CLASS + ' [' + TARGET + '] pre { break-inside:avoid !important; }',
      'body.' + PRINT_CLASS + ' [' + TARGET + '] button, body.' + PRINT_CLASS + ' [' + TARGET + '] input, body.' + PRINT_CLASS + ' [' + TARGET + '] select, body.' + PRINT_CLASS + ' [' + TARGET + '] textarea { display:none !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildPanel() {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647;';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = [
      '<style>',
      ':host{all:initial;color-scheme:light}*{box-sizing:border-box}.panel{width:292px;border:1px solid #d7dce3;border-radius:14px;background:#fff;color:#18212f;box-shadow:0 10px 36px #0f172a2e;font:13px/1.45 system-ui,sans-serif;overflow:hidden}',
      '.top{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#101828;color:white}.brand{font-weight:750}.version{font-size:10px;color:#cbd5e1}.body{padding:12px}.desc{margin:0 0 10px;color:#64748b;font-size:11px}',
      '.actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}button,select,input{font:inherit}button{min-height:35px;border:1px solid #d5dbe5;border-radius:8px;padding:7px 9px;background:#fff;color:#1e293b;cursor:pointer;font-weight:650}button.primary{background:#2455d6;border-color:#2455d6;color:#fff}.status{min-height:30px;margin-top:10px;padding:7px 9px;border-radius:8px;background:#f1f5f9;color:#475569;font-size:11px}',
      '.settings{display:none;margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0}.settings.open{display:block}.field{display:grid;grid-template-columns:82px 1fr;align-items:center;gap:8px;margin:8px 0}.field label{font-size:11px;color:#475569}.field select{width:100%;min-height:30px;border:1px solid #d5dbe5;border-radius:7px;padding:4px;background:#fff}.range{display:flex;align-items:center;gap:8px}.range input{width:100%}.range output{min-width:34px;text-align:right;font-size:11px}.foot{display:flex;justify-content:space-between;gap:8px;margin-top:10px}.small{font-size:10px;color:#94a3b8}.collapsed{display:none}.pick-mode{background:#fffbeb;border-color:#f59e0b;color:#92400e}',
      '@media(max-width:480px){.panel{width:min(292px,calc(100vw - 28px))}}',
      '</style>',
      '<section class="panel" aria-label="DANCHOO Print Enhancer">',
      '<header class="top"><div><div class="brand">DANCHOO Print Enhancer</div><div class="version">v0.1.0</div></div><button id="collapse">접기</button></header>',
      '<div class="body"><p class="desc">인쇄할 시험지 본문을 선택하고 레이아웃을 조절하세요.</p>',
      '<div class="actions"><button id="pick">인쇄 영역 선택</button><button class="primary" id="print">인쇄 / PDF 저장</button></div>',
      '<div class="actions"><button id="toggle">인쇄 설정</button><button id="clear">선택 해제</button></div>',
      '<div class="status" id="status" role="status" aria-live="polite">먼저 시험지 본문 영역을 선택하세요.</div>',
      '<div class="settings" id="settings">',
      '<div class="field"><label for="paper">용지</label><select id="paper"><option>A4</option><option>A5</option><option>Letter</option></select></div>',
      '<div class="field"><label for="orientation">방향</label><select id="orientation"><option value="portrait">세로</option><option value="landscape">가로</option></select></div>',
      '<div class="field"><label for="columns">단 구성</label><select id="columns"><option value="1">1단</option><option value="2">2단</option></select></div>',
      '<div class="field"><label for="fontSize">글자 크기</label><div class="range"><input id="fontSize" type="range" min="9" max="14" step=".5"><output id="fontSizeOut"></output></div></div>',
      '<div class="field"><label for="lineHeight">줄 간격</label><div class="range"><input id="lineHeight" type="range" min="1.2" max="1.9" step=".05"><output id="lineHeightOut"></output></div></div>',
      '<div class="field"><label for="margin">여백</label><select id="margin"><option value="narrow">좁게</option><option value="normal">보통</option><option value="wide">넓게</option></select></div>',
      '<div class="foot"><span class="small">설정은 브라우저에 저장됩니다.</span><button id="reset">초기화</button></div></div>',
      '<div class="foot"><span class="small">EBS 비공식 개인 도구</span><span class="small">v0.1.0</span></div></div></section>'
    ].join('');
    document.documentElement.appendChild(host);

    const $ = (id) => shadow.getElementById(id);
    $('pick').addEventListener('click', startPicking);
    $('print').addEventListener('click', printTarget);
    $('clear').addEventListener('click', clearTarget);
    $('toggle').addEventListener('click', () => $('settings').classList.toggle('open'));
    $('collapse').addEventListener('click', () => shadow.querySelector('.panel').classList.toggle('collapsed'));
    $('reset').addEventListener('click', () => {
      settings = { ...DEFAULTS };
      saveSettings();
      syncControls();
      updateTargetStyles();
      setStatus('인쇄 설정을 기본값으로 되돌렸습니다.');
    });
    ['paper', 'orientation', 'columns', 'margin'].forEach((key) => {
      $(key).addEventListener('change', (event) => updateSetting(key, event.target.value));
    });
    ['fontSize', 'lineHeight'].forEach((key) => {
      $(key).addEventListener('input', (event) => updateSetting(key, Number(event.target.value)));
    });
    syncControls();
  }

  function syncControls() {
    ['paper', 'orientation', 'columns', 'margin', 'fontSize', 'lineHeight'].forEach((key) => {
      shadow.getElementById(key).value = String(settings[key]);
    });
    shadow.getElementById('fontSizeOut').value = settings.fontSize + 'pt';
    shadow.getElementById('lineHeightOut').value = settings.lineHeight.toFixed(2);
  }

  function updateSetting(key, value) {
    settings = { ...DEFAULTS, ...settings, [key]: value };
    settings = { ...DEFAULTS, ...sanitize(settings) };
    saveSettings();
    syncControls();
    updateTargetStyles();
  }

  function updateTargetStyles() {
    if (!target) return;
    target.style.setProperty('--dpe-font-size', settings.fontSize + 'pt');
    target.style.setProperty('--dpe-line-height', String(settings.lineHeight));
    target.style.setProperty('--dpe-columns', settings.columns);
    const old = document.getElementById('dpe-page-rule');
    if (old) old.remove();
    const page = document.createElement('style');
    page.id = 'dpe-page-rule';
    page.textContent = '@media print{@page{size:' + settings.paper + ' ' + settings.orientation + ';margin:' + MARGINS[settings.margin] + '}}';
    document.head.appendChild(page);
  }

  function startPicking() {
    if (picking) return;
    picking = true;
    document.body.classList.add(PICK_CLASS);
    shadow.getElementById('pick').classList.add('pick-mode');
    shadow.getElementById('pick').textContent = '본문을 클릭하세요 (Esc 취소)';
    setStatus('시험지 본문을 감싸는 영역을 클릭하세요.');
    document.addEventListener('click', onPickClick, true);
    document.addEventListener('keydown', onPickKey, true);
  }

  function stopPicking() {
    picking = false;
    document.body.classList.remove(PICK_CLASS);
    shadow.getElementById('pick').classList.remove('pick-mode');
    shadow.getElementById('pick').textContent = '인쇄 영역 선택';
    document.removeEventListener('click', onPickClick, true);
    document.removeEventListener('keydown', onPickKey, true);
  }

  function onPickKey(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    stopPicking();
    setStatus('영역 선택을 취소했습니다.');
  }

  function onPickClick(event) {
    const path = event.composedPath ? event.composedPath() : [];
    if (path.includes(host) || host.contains(event.target)) return;
    const element = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!element || element === document.body || element === document.documentElement) {
      setStatus('본문 안쪽을 선택해 주세요.');
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    clearTarget(false);
    target = element;
    target.setAttribute(TARGET, '1');
    updateTargetStyles();
    stopPicking();
    setStatus('인쇄 영역을 지정했습니다. 인쇄 버튼을 눌러 확인하세요.');
  }

  function clearTarget(showMessage = true) {
    stopPicking();
    restorePage();
    if (target) {
      target.removeAttribute(TARGET);
      target.style.removeProperty('--dpe-font-size');
      target.style.removeProperty('--dpe-line-height');
      target.style.removeProperty('--dpe-columns');
    }
    target = null;
    if (showMessage) setStatus('인쇄 영역 선택을 해제했습니다.');
  }

  function isolateTarget(element) {
    restorePage();
    let current = element;
    while (current && current !== document.body && current.parentElement) {
      const parent = current.parentElement;
      Array.from(parent.children).forEach((sibling) => {
        if (sibling !== current) sibling.setAttribute(HIDDEN, '1');
      });
      if (parent === document.body) break;
      current = parent;
    }
    document.body.classList.add(PRINT_CLASS);
  }

  function restorePage() {
    document.querySelectorAll('[' + HIDDEN + ']').forEach((node) => node.removeAttribute(HIDDEN));
    document.body.classList.remove(PRINT_CLASS);
  }

  function printTarget() {
    if (!target || !target.isConnected) {
      setStatus('먼저 인쇄할 본문 영역을 선택하세요.');
      startPicking();
      return;
    }
    updateTargetStyles();
    isolateTarget(target);
    setStatus('인쇄 창을 여는 중입니다. 프린터 또는 PDF 저장을 선택하세요.');
    requestAnimationFrame(() => window.print());
  }

  function setStatus(message) {
    const node = shadow && shadow.getElementById('status');
    if (node) node.textContent = message;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
