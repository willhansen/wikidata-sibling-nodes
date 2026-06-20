(function () {
  'use strict';

  const IS_WIKIDATA = location.hostname === 'www.wikidata.org';
  const IS_WIKIPEDIA = location.hostname.endsWith('.wikipedia.org');
  const BTN_CLASS = 'wds-btn';

  const style = document.createElement('style');
  style.textContent = `
    .${BTN_CLASS} {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin: 2px 0 2px 8px;
      padding: 1px 6px;
      font-size: 11px;
      line-height: 1.5;
      color: #3366cc;
      background: #f8f9fa;
      border: 1px solid #a2a9b1;
      border-radius: 3px;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      vertical-align: middle;
    }
    .${BTN_CLASS}:hover {
      background: #ffffff;
      border-color: #3366cc;
      text-decoration: none;
    }
    .${BTN_CLASS}::before {
      content: '▸';
      font-size: 10px;
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
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';

    const refsContainer = stmtView.querySelector('.wikibase-statementview-references-container');
    if (refsContainer) {
      refsContainer.parentNode.insertBefore(btn, refsContainer);
    } else {
      stmtView.appendChild(document.createTextNode(' '));
      stmtView.appendChild(btn);
    }
  }

  function processWikidata() {
    document.querySelectorAll('.wikibase-statementview').forEach(addSiblingButton);
  }

  function getWikipediaQid() {
    const sidebarLink = document.querySelector(
      '#p-wikibase-otherprojects li#t-wikibase a, ' +
        '#p-tb li#t-wikibase a, ' +
        'li#t-wikibase a, ' +
        'a[href*="//www.wikidata.org/wiki/Q"]'
    );
    if (sidebarLink) {
      const m = sidebarLink.getAttribute('href').match(/\/wiki\/(Q\d+)/);
      if (m) return m[1];
    }
    return null;
  }

  function createWikipediaPanel(qid, claims) {
    const panel = document.createElement('div');
    panel.id = 'wds-panel';
    panel.style.cssText = `
      margin: 16px 0;
      padding: 12px 16px;
      border: 1px solid #a2a9b1;
      border-radius: 4px;
      background: #f8f9fa;
      font-size: 14px;
    `;

    const heading = document.createElement('div');
    heading.style.cssText = `
      font-weight: bold;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    heading.innerHTML =
      `Wikidata Siblings ` +
      `<a href="https://www.wikidata.org/wiki/${qid}" target="_blank" rel="noopener noreferrer" ` +
      `style="font-weight:normal;font-size:12px;">view on Wikidata ↗</a>`;
    panel.appendChild(heading);

    for (const [pid, stmts] of Object.entries(claims)) {
      for (const stmt of stmts) {
        const val = stmt.mainsnak?.datavalue?.value;
        if (!val || val.type !== 'wikibase-entityid') continue;
        const valueId = val.id;
        if (!valueId) continue;

        const row = document.createElement('div');
        row.style.cssText = 'padding: 2px 0; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;';

        const propLabel = document.createElement('span');
        propLabel.style.cssText = 'color: #54595d; font-size: 12px;';
        propLabel.textContent = pid;
        row.appendChild(propLabel);

        const valLabel = document.createElement('span');
        valLabel.style.cssText = 'margin-left: 4px;';
        const valLink = document.createElement('a');
        valLink.href = `https://www.wikidata.org/wiki/${valueId}`;
        valLink.target = '_blank';
        valLink.rel = 'noopener noreferrer';
        valLink.textContent = valueId;
        valLabel.appendChild(valLink);
        row.appendChild(valLabel);

        const btn = document.createElement('a');
        btn.className = BTN_CLASS;
        btn.title = `Find siblings via ${pid} = ${valueId}`;
        btn.href = buildQueryUrl(pid, valueId, '');
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        row.appendChild(btn);

        panel.appendChild(row);
      }
    }

    return panel;
  }

  async function processWikipedia() {
    const qid = getWikipediaQid();
    if (!qid) return;

    try {
      const url =
        `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
      const resp = await fetch(url);
      const data = await resp.json();
      const entity = data.entities[qid];
      if (!entity || !entity.claims) return;

      const panel = createWikipediaPanel(qid, entity.claims);

      const content = document.querySelector('#mw-content-text, .mw-body-content, #bodyContent');
      if (content) {
        content.prepend(panel);
      }
    } catch (e) {
      console.warn('WDS: failed to fetch Wikidata data', e);
    }
  }

  if (IS_WIKIDATA) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', processWikidata);
    } else {
      processWikidata();
    }
    const observer = new MutationObserver(function () {
      processWikidata();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else if (IS_WIKIPEDIA) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', processWikipedia);
    } else {
      processWikipedia();
    }
  }
})();
