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

function markdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let currentSection = '';
  let idx = 0;
  const items = [];
  let openItem = false;

  function closeItem() {
    if (openItem) { html += '</div>'; openItem = false; }
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      closeItem();
      html += `<h2 class="mr-title">${esc(line.slice(2))}</h2>`;
    } else if (line.startsWith('## ')) {
      closeItem();
      currentSection = line.slice(3).trim();
      html += `<h3 class="mr-cat">${esc(currentSection)}</h3>`;
    } else if (line.startsWith('> ')) {
      closeItem();
      html += `<p class="mr-summary">${esc(line.slice(2))}</p>`;
    } else if (line.startsWith('- ')) {
      closeItem();
      const title = line.slice(2).replace(/^\S+\s/, '').trim();
      items.push({ title, section: currentSection });
      html += `<div class="mr-item" data-idx="${idx++}"><div class="mr-item-header"><span class="mr-item-text">${esc(line.slice(2))}</span></div>`;
      openItem = true;
    } else if (line.startsWith('  *') && openItem) {
      html += `<span class="mr-detail-text">${esc(line.trim().replace(/\*/g, ''))}</span>`;
    } else if (line.startsWith('  `') && openItem) {
      html += `<span class="mr-since">${esc(line.trim().replace(/`/g, ''))}</span>`;
    } else {
      closeItem();
    }
  }
  closeItem();

  return { html, items };
}
