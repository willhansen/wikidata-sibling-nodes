(function () {
  'use strict';

  const BTN_CLASS = 'wds-btn';

  const style = document.createElement('style');
  style.textContent = `
    .${BTN_CLASS} {
      display: inline-block;
      margin: 6px 0 2px 32px;
      padding: 2px 10px 2px 8px;
      font-size: 13px;
      line-height: 1.6;
      color: #3366cc;
      background: #f8f9fa;
      border: 1px solid #a2a9b1;
      border-radius: 3px;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .${BTN_CLASS}:hover {
      background: #ffffff;
      border-color: #3366cc;
    }
    .${BTN_CLASS}::before {
      content: '\u25b8 ';
      font-size: 11px;
    }
  `;
  document.head.appendChild(style);

  function buildQueryUrl(pid, qid, label) {
    const comment = label ? `# ${label} siblings\n` : '';
    const query = comment + [
      'SELECT ?item ?itemLabel ?itemDescription WHERE {',
      `  ?item wdt:${pid} wd:${qid}.`,
      '  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }',
      '}',
      'LIMIT 500',
    ].join('\n');
    return 'https://query.wikidata.org/#' + encodeURIComponent(query);
  }

  function extractValueId(stmtView) {
    const valueEl = stmtView.querySelector(
      '.wikibase-snakview-value.wikibase-snakview-variation-valuesnak'
    );
    if (!valueEl) return null;
    const link = valueEl.querySelector('a[href*="/wiki/Q"]');
    if (!link) return null;
    const m = link.getAttribute('href').match(/\/wiki\/(Q\d+)/);
    return m ? m[1] : null;
  }

  function extractValueLabel(stmtView) {
    const valueEl = stmtView.querySelector(
      '.wikibase-snakview-value.wikibase-snakview-variation-valuesnak'
    );
    if (!valueEl) return '';
    const link = valueEl.querySelector('a');
    return link ? link.textContent.trim() : valueEl.textContent.trim().split('\n')[0].trim();
  }

  function addSiblingButton(stmtView) {
    if (stmtView.querySelector('.' + BTN_CLASS)) return;

    const groupView = stmtView.closest('.wikibase-statementgroupview');
    if (!groupView) return;
    const pid = groupView.getAttribute('data-property-id');
    if (!pid) return;

    const qid = extractValueId(stmtView);
    if (!qid) return;

    const valLabel = extractValueLabel(stmtView);
    const btn = document.createElement('a');
    btn.className = BTN_CLASS;
    btn.title = `Find siblings via ${pid} = ${valLabel}`;
    btn.href = buildQueryUrl(pid, qid, valLabel);
    btn.textContent = 'siblings';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';

    const refsContainer = stmtView.querySelector(
      '.wikibase-statementview-references-container'
    );
    if (refsContainer) {
      refsContainer.parentNode.insertBefore(btn, refsContainer);
    } else {
      stmtView.appendChild(document.createTextNode(' '));
      stmtView.appendChild(btn);
    }
  }

  function process() {
    document.querySelectorAll('.wikibase-statementview').forEach(addSiblingButton);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', process);
  } else {
    process();
  }

  const observer = new MutationObserver(function () {
    process();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
