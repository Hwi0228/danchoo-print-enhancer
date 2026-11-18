// ==UserScript==
// @name         DANCHOO Print Enhancer
// @namespace    https://github.com/Hwi0228/danchoo-print-enhancer
// @version      0.2.0
// @description  EBS DANCHOO+ 기존 인쇄 미리보기에 문항 단위 페이지 분할 보정 적용
// @author       Hwi0228
// @match        https://ai-plus.ebs.co.kr/mid/xip/solvePaper.ebs*
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.2.0';
  const HOST_ID = 'dpe-toolbar-host';
  const STYLE_ID = 'dpe-layout-styles';
  const ENABLED_CLASS = 'dpe-layout-enabled';
  const QUESTION_ATTR = 'data-dpe-question-block';
  const SETTINGS_KEY = 'dpe.settings.v2';
  const QUESTION_LEAD = /^\s*(\d{1,2})\s*[.)]\s*\S/;
  const WRAPPER_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'LI', 'TD', 'TR']);
  const SCAN_TAGS = 'div,section,article,li,td,tr,p,h1,h2,h3,h4';
  const MAX_QUESTION_TEXT = 12000;
  const MAX_ANCESTOR_DEPTH = 10;

  if (location.hostname !== 'ai-plus.ebs.co.kr') return;
  if (location.pathname.toLowerCase() !== '/mid/xip/solvepaper.ebs') return;
  if (!document.body || document.getElementById(HOST_ID)) return;

  let enabled = readEnabled();
  let host;
  let shadow;
  let scanQueued = false;
  const watchedFrames = new WeakSet();
  const observedDocuments = new WeakSet();
  const activeObservers = new Set();
  let lastStats = { documents: 0, questions: 0, frames: 0 };

  installStyles(document);
  buildToolbar();
  scanAllDocuments();
  startObserver();

  window.addEventListener('beforeprint', scanAllDocuments, true);
  window.addEventListener('afterprint', () => queueScan(), true);
  window.addEventListener('pagehide', restoreTemporaryState, true);

  function readEnabled() {
    try {
      const value = localStorage.getItem(SETTINGS_KEY);
      return value === null ? true : value === 'true';
    } catch {
      return true;
    }
  }

  function saveEnabled() {
    try {
      localStorage.setItem(SETTINGS_KEY, String(enabled));
    } catch {
      setStatus('설정 저장은 제한됐지만 현재 페이지에는 적용됩니다.');
    }
  }

  function installStyles(doc) {
    if (!doc || !doc.head || doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        -webkit-column-break-inside: avoid !important;
      }
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] h1,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] h2,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] h3,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] h4 {
        break-after: avoid-page !important;
        page-break-after: avoid !important;
      }
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] img,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] svg,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] canvas,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] figure,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] table,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] blockquote,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] pre {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        max-width: 100% !important;
      }
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] p,
      html.${ENABLED_CLASS} [${QUESTION_ATTR}] li {
        orphans: 2;
        widows: 2;
      }
      @media print {
        #${HOST_ID} { display:none !important; }
        html.${ENABLED_CLASS} [${QUESTION_ATTR}] {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          -webkit-column-break-inside: avoid !important;
        }
      }
    `;
    doc.head.appendChild(style);
  }

  function buildToolbar() {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial;position:fixed;right:20px;bottom:20px;z-index:2147483000;';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host{all:initial;color-scheme:light;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
        *{box-sizing:border-box}
        .panel{width:300px;border:1px solid #d7dce3;border-radius:13px;overflow:hidden;background:#fff;color:#18212f;box-shadow:0 10px 34px rgba(15,23,42,.2);font-size:13px;line-height:1.45}
        .head{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#17243b;color:#fff;padding:10px 12px}
        .title{font-size:13px;font-weight:750}.version{font-size:10px;color:#cbd5e1}
        .content{padding:11px 12px}.desc{margin:0 0 9px;color:#64748b;font-size:11px}
        .row{display:flex;gap:7px}.row button{flex:1}
        button{min-height:34px;border:1px solid #d5dbe5;border-radius:8px;padding:6px 9px;background:#fff;color:#1e293b;font:inherit;font-weight:650;cursor:pointer}
        button.primary{background:#2455d6;border-color:#2455d6;color:#fff}
        button:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
        .status{margin-top:9px;padding:8px 9px;border-radius:8px;background:#f1f5f9;color:#475569;font-size:11px;min-height:36px}
        .state{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700}
        .dot{width:8px;height:8px;border-radius:50%;background:#16a34a}.off .dot{background:#94a3b8}
        .hint{margin:8px 0 0;color:#94a3b8;font-size:10px}
        .minimize{border:0;background:transparent;color:#dbeafe;min-height:26px;padding:3px 5px}
        .collapsed{display:none}.minimized{width:auto}.minimized .content{display:none}
        @media(max-width:480px){.panel{width:min(300px,calc(100vw - 36px))}}
      </style>
      <section class="panel" aria-label="DANCHOO Print Enhancer">
        <header class="head">
          <div><div class="title">DANCHOO Print Enhancer</div><div class="version">v${VERSION} · solvePaper</div></div>
          <button class="minimize" id="minimize" type="button">접기</button>
        </header>
        <div class="content">
          <p class="desc">EBS의 기존 인쇄 설정과 미리보기는 유지하고, 문항이 페이지·단 사이에서 잘리지 않도록 보정합니다.</p>
          <div class="row">
            <button class="primary" id="toggle" type="button">문항 묶음 보정 켜짐</button>
            <button id="rescan" type="button">다시 검사</button>
          </div>
          <div class="status" id="status" role="status" aria-live="polite">페이지 구조를 확인하고 있습니다.</div>
          <p class="hint">보정 적용 후 EBS의 인쇄 버튼을 그대로 사용하세요. 용지·매수·레이아웃·컬러 설정은 변경하지 않습니다.</p>
        </div>
      </section>
      <button class="collapsed" id="expand" type="button">DPE 인쇄 보정</button>
    `;
    document.documentElement.appendChild(host);

    shadow.getElementById('toggle').addEventListener('click', () => {
      enabled = !enabled;
      saveEnabled();
      scanAllDocuments();
      syncToolbar();
    });
    shadow.getElementById('rescan').addEventListener('click', () => {
      scanAllDocuments();
      setStatus(formatStats(lastStats));
    });
    shadow.getElementById('minimize').addEventListener('click', () => {
      shadow.querySelector('.panel').classList.add('minimized');
      shadow.getElementById('expand').classList.remove('collapsed');
    });
    shadow.getElementById('expand').addEventListener('click', () => {
      shadow.querySelector('.panel').classList.remove('minimized');
      shadow.getElementById('expand').classList.add('collapsed');
    });
    syncToolbar();
  }

  function syncToolbar() {
    if (!shadow) return;
    const button = shadow.getElementById('toggle');
    button.textContent = enabled ? '문항 묶음 보정 켜짐' : '문항 묶음 보정 꺼짐';
    button.classList.toggle('primary', enabled);
    shadow.querySelector('.state')?.classList.toggle('off', !enabled);
  }

  function startObserver() {
    observeDocument(document);
  }

  function observeDocument(doc) {
    if (!doc?.documentElement || observedDocuments.has(doc) || typeof MutationObserver === 'undefined') return;
    observedDocuments.add(doc);
    const docObserver = new MutationObserver((records) => {
      const hasRelevantAddition = records.some((record) =>
        Array.from(record.addedNodes).some((node) => {
          if (node === host || node.nodeType !== Node.ELEMENT_NODE) return false;
          return node.tagName === 'IFRAME' || Boolean(node.querySelector?.('iframe,div,section,article'));
        })
      );
      if (hasRelevantAddition) queueScan();
    });
    docObserver.observe(doc.documentElement, { childList: true, subtree: true });
    activeObservers.add(docObserver);
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scanAllDocuments();
    });
  }

  function collectDocuments(attachObservers = true) {
    const docs = [];
    const seen = new WeakSet();
    const visit = (doc) => {
      if (!doc || seen.has(doc)) return;
      seen.add(doc);
      docs.push(doc);
      let frames = [];
      try {
        frames = Array.from(doc.querySelectorAll('iframe'));
      } catch {
        return;
      }
      for (const frame of frames) {
        if (!watchedFrames.has(frame)) {
          watchedFrames.add(frame);
          frame.addEventListener('load', queueScan, { once: false });
        }
        try {
          const childDoc = frame.contentDocument;
          if (childDoc && childDoc.location.origin === location.origin) {
            if (attachObservers) observeDocument(childDoc);
            visit(childDoc);
          }
        } catch {
          // Cross-origin frames are intentionally left untouched.
        }
      }
    };
    visit(document);
    return docs;
  }

  function scanAllDocuments() {
    const docs = collectDocuments();
    updateToolbarVisibility();
    let questions = 0;
    let frames = Math.max(0, docs.length - 1);

    for (const doc of docs) {
      if (!doc.documentElement || !doc.body) continue;
      doc.querySelectorAll('[' + QUESTION_ATTR + ']').forEach((el) => el.removeAttribute(QUESTION_ATTR));
      installStyles(doc);
      if (enabled) {
        doc.documentElement.classList.add(ENABLED_CLASS);
        const detected = detectQuestionBlocks(doc);
        questions += detected.length;
      } else {
        doc.documentElement.classList.remove(ENABLED_CLASS);
        doc.querySelectorAll('[' + QUESTION_ATTR + ']').forEach((el) => el.removeAttribute(QUESTION_ATTR));
      }
    }

    lastStats = { documents: docs.length, questions, frames };
    setStatus(formatStats(lastStats));
    syncToolbar();
  }

  function detectQuestionBlocks(doc) {
    const nodes = Array.from(doc.querySelectorAll(SCAN_TAGS));
    const marked = new Set();

    for (const node of nodes) {
      const number = leadingQuestionNumber(node);
      if (number === null || isInsideToolbar(node) || !isVisible(node)) continue;

      let current = node;
      const ownRoots = collectTopLevelQuestionRoots(node);
      let best = isLikelyWrapper(node) && (ownRoots.length === 0 || (ownRoots.length === 1 && ownRoots[0].number === number)) ? node : null;
      for (let depth = 0; depth < MAX_ANCESTOR_DEPTH; depth += 1) {
        const parent = current.parentElement;
        if (!parent || parent === doc.body || parent === doc.documentElement) break;
        const roots = collectTopLevelQuestionRoots(parent);
        if (roots.length !== 1 || roots[0].number !== number) break;
        if (isLikelyWrapper(parent)) best = parent;
        current = parent;
      }

      if (best && isLikelyWrapper(best) && !isNestedQuestionCandidate(best, marked)) {
        marked.add(best);
      }
    }

    // A question wrapper may be discovered more than once through its heading and first paragraph.
    for (const el of marked) el.setAttribute(QUESTION_ATTR, '1');
    return Array.from(marked);
  }

  function collectTopLevelQuestionRoots(root) {
    const collectChildren = (parent, depth) => {
      const found = [];
      if (depth > 16 || found.length > 40) return found;

      for (const child of Array.from(parent.children)) {
        if (isIgnoredElement(child) || isInsideToolbar(child)) continue;
        const number = leadingQuestionNumber(child);
        const nested = collectChildren(child, depth + 1);

        if (number !== null) {
          const nestedHasMultipleQuestions = nested.length > 1 || nested.some((item) => item.number !== number);
          if (nestedHasMultipleQuestions) found.push(...nested);
          else found.push({ element: child, number });
        } else {
          found.push(...nested);
        }

        if (found.length > 40) return found;
      }
      return found;
    };
    return collectChildren(root, 0);
  }

  function leadingQuestionNumber(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
    const raw = typeof element.innerText === 'string' ? element.innerText : element.textContent;
    const text = String(raw || '').replace(/[\u00a0\u200b]/g, ' ').trim();
    if (text.length < 4 || text.length > MAX_QUESTION_TEXT) return null;
    const match = text.match(QUESTION_LEAD);
    return match ? Number(match[1]) : null;
  }

  function isLikelyWrapper(element) {
    if (!element || !WRAPPER_TAGS.has(element.tagName)) return false;
    if (!isVisible(element)) return false;
    const text = String(element.innerText || element.textContent || '').trim();
    if (text.length < 18 || text.length > MAX_QUESTION_TEXT) return false;
    return element.children.length >= 1 || Boolean(element.querySelector('img,svg,canvas,table,figure'));
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    if (element.closest('#' + HOST_ID)) return false;
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    return !style || (style.display !== 'none' && style.visibility !== 'hidden');
  }

  function isIgnoredElement(element) {
    return ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG'].includes(element.tagName);
  }

  function isInsideToolbar(element) {
    return Boolean(element.closest('#' + HOST_ID));
  }

  function isNestedQuestionCandidate(element, candidates) {
    for (const candidate of candidates) {
      if (candidate !== element && candidate.contains(element)) return true;
    }
    return false;
  }

  function updateToolbarVisibility() {
    if (!host || !document.body) return;
    const text = String(document.body.innerText || '');
    const previewLabels = ['인쇄', '대상', '페이지', '매수', '레이아웃', '컬러'];
    const ebsPrintDialogOpen = previewLabels.every((label) => text.includes(label));
    host.style.display = ebsPrintDialogOpen ? 'none' : '';
  }

  function formatStats(stats) {
    if (!enabled) return '보정이 꺼져 있습니다. EBS 기본 인쇄 설정만 사용합니다.';
    if (stats.questions > 0) {
      return `문항 묶음 ${stats.questions}개 감지 · 같은 출처 문서 ${stats.documents}개 검사`;
    }
    return '문항 블록을 자동 감지하지 못했습니다. EBS 기본 인쇄에는 영향을 주지 않습니다.';
  }

  function setStatus(message) {
    const status = shadow && shadow.getElementById('status');
    if (status) status.textContent = message;
  }

  function restoreTemporaryState() {
    activeObservers.forEach((item) => item.disconnect());
    activeObservers.clear();
    for (const doc of collectDocuments(false)) {
      if (!doc.documentElement) continue;
      doc.documentElement.classList.remove(ENABLED_CLASS);
      doc.querySelectorAll('[' + QUESTION_ATTR + ']').forEach((el) => el.removeAttribute(QUESTION_ATTR));
    }
  }
})();
