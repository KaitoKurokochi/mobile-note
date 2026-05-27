// ── Report: fetch reports.md from my_notes and render with @ buttons ─────────

const REPORT_OWNER = 'KaitoKurokochi';
const REPORT_REPO  = 'my_notes';

async function fetchMyNotesFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPORT_OWNER}/${REPORT_REPO}/contents/${path}`,
    { headers: syncHeaders() }
  );
  if (!res.ok) throw Object.assign(new Error(`${res.status}`), { status: res.status });
  const meta = await res.json();
  return decodeURIComponent(escape(atob(meta.content.replace(/\n/g, ''))));
}

let reportMentionItems = [];

async function loadReport() {
  const container = document.getElementById('report-container');

  if (!getToken()) {
    container.innerHTML = '<p class="placeholder">トークンが未設定です。Formタブでトークンを設定してください。</p>';
    return;
  }

  container.innerHTML = '<p class="placeholder">Loading...</p>';
  reportMentionItems = [];

  try {
    const md = await fetchMyNotesFile('reports.md');
    const { html, items } = markdownToHtml(md);
    reportMentionItems = items;

    const div = document.createElement('div');
    div.className = 'report-body';
    div.innerHTML = html;

    // Attach @ buttons
    div.querySelectorAll('.mr-item[data-idx]').forEach(el => {
      const idx = Number(el.dataset.idx);
      const btn = document.createElement('button');
      btn.className = 'mr-mention-btn';
      btn.textContent = '@';
      btn.addEventListener('click', () => {
        setMention(reportMentionItems[idx]);
        switchTab('form');
      });
      el.querySelector('.mr-item-header').appendChild(btn);
    });

    container.innerHTML = '';
    container.appendChild(div);
  } catch (e) {
    let msg;
    if (e.status === 404) {
      msg = '<p class="placeholder">レポートはまだ生成されていません</p>';
    } else if (e.status === 403) {
      msg = '<p class="error-msg">アクセス拒否 (403): PATに <code>Contents: read</code> 権限を追加してください。</p>';
    } else if (e.status === 401) {
      msg = '<p class="error-msg">認証エラー (401): トークンが無効です。Formタブでトークンを再設定してください。</p>';
    } else {
      msg = `<p class="error-msg">読み込み失敗: ${e.message}</p>`;
    }
    container.innerHTML = msg;
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Extract label_key from "(#NNN, label_key)" suffix, e.g. "Task text (#42, my_home_page)" → "my_home_page"
function extractSourceLabel(text) {
  const m = text.match(/\(#\d+,\s*([^)]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

function markdownToHtml(md) {
  const lines = md.split('\n');

  // ── Pass 1: parse into token objects ───────────────────────────────────────
  const tokens = [];
  for (const line of lines) {
    if (line.startsWith('### ')) {
      tokens.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      tokens.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('# ')) {
      tokens.push({ type: 'h1', text: line.slice(2).trim() });
    } else if (line.startsWith('> ')) {
      tokens.push({ type: 'summary', text: line.slice(2).trim() });
    } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      tokens.push({ type: 'check', text: line.slice(6).trim(), checked: line.startsWith('- [x] ') });
    } else if (line.startsWith('- ')) {
      tokens.push({ type: 'item', text: line.slice(2).trim() });
    } else if (line.startsWith('  *')) {
      tokens.push({ type: 'detail', text: line.trim().replace(/\*/g, '') });
    } else if (line.startsWith('  `')) {
      tokens.push({ type: 'since', text: line.trim().replace(/`/g, '') });
    } else {
      tokens.push({ type: 'blank' });
    }
  }

  // ── Pass 2: skip h2/h3 headings whose section has no content ──────────────
  const HEADING_TYPES = new Set(['h1', 'h2', 'h3']);
  const CONTENT_TYPES = new Set(['summary', 'check', 'item', 'detail', 'since']);
  const skipIdx = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'h2' && t.type !== 'h3') continue;
    let hasContent = false;
    for (let j = i + 1; j < tokens.length; j++) {
      if (HEADING_TYPES.has(tokens[j].type)) break;
      if (CONTENT_TYPES.has(tokens[j].type)) { hasContent = true; break; }
    }
    if (!hasContent) skipIdx.add(i);
  }

  // ── Pass 3: render ─────────────────────────────────────────────────────────
  let html = '';
  let currentSection = '';      // current h2 text (may be "Phase: ..." subheading)
  let currentTopSection = '';   // last h2 text that is NOT a Phase: subheading
                                // used as the label hint for items inside Phase: blocks
  let idx = 0;
  const items = [];
  let openItem = false;

  function closeItem() {
    if (openItem) { html += '</div>'; openItem = false; }
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // Always update section tracking for h2, even when skipped for rendering,
    // so that items inside Phase: blocks inherit the correct parent section
    // (e.g. "🔬 Research" which is itself an empty wrapper heading).
    if (t.type === 'h2') {
      const isPhase = t.text.startsWith('Phase:');
      currentSection = t.text;
      if (!isPhase) currentTopSection = t.text;
    }

    if (skipIdx.has(i)) continue;

    if (t.type === 'h1') {
      closeItem();
      html += `<h2 class="mr-title">${esc(t.text)}</h2>`;
    } else if (t.type === 'h2') {
      closeItem();
      const isPhase = currentSection.startsWith('Phase:');
      html += `<h3 class="${isPhase ? 'mr-phase' : 'mr-cat'}">${esc(currentSection)}</h3>`;
    } else if (t.type === 'h3') {
      closeItem();
      html += `<h4 class="mr-subcat">${esc(t.text)}</h4>`;
    } else if (t.type === 'summary') {
      closeItem();
      html += `<p class="mr-summary">${esc(t.text)}</p>`;
    } else if (t.type === 'check') {
      closeItem();
      const checkSourceLabel = extractSourceLabel(t.text);
      // Use top-level section for label guessing so Phase: items map back to their parent label
      const itemSection = currentSection.startsWith('Phase:') ? currentTopSection : currentSection;
      items.push({ title: t.text, section: itemSection, sourceLabel: checkSourceLabel });
      console.debug('[mobile-note] item pushed:', { title: t.text, section: itemSection, sourceLabel: checkSourceLabel });
      const doneClass = t.checked ? ' mr-item-done' : '';
      html += `<div class="mr-item${doneClass}" data-idx="${idx++}"><div class="mr-item-header"><span class="mr-item-text">${esc(t.text)}</span></div>`;
      openItem = true;
    } else if (t.type === 'item') {
      closeItem();
      const itemSourceLabel = extractSourceLabel(t.text);
      const itemSection = currentSection.startsWith('Phase:') ? currentTopSection : currentSection;
      items.push({ title: t.text, section: itemSection, sourceLabel: itemSourceLabel });
      console.debug('[mobile-note] item pushed:', { title: t.text, section: itemSection, sourceLabel: itemSourceLabel });
      html += `<div class="mr-item" data-idx="${idx++}"><div class="mr-item-header"><span class="mr-item-text">${esc(t.text)}</span></div>`;
      openItem = true;
    } else if (t.type === 'detail' && openItem) {
      html += `<span class="mr-detail-text">${esc(t.text)}</span>`;
    } else if (t.type === 'since' && openItem) {
      html += `<span class="mr-since">${esc(t.text)}</span>`;
    } else {
      closeItem();
    }
  }
  closeItem();

  return { html, items };
}
