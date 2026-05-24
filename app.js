// ── Config ────────────────────────────────────────────────────────────────────

const NOTE_OWNER = 'KaitoKurokochi';
const NOTE_REPO  = 'my_notes';
const GITHUB_API = `https://api.github.com/repos/${NOTE_OWNER}/${NOTE_REPO}/issues`;

// ── Tab navigation ────────────────────────────────────────────────────────────

let notesLoaded  = false;
let reportLoaded = false;

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));

  if (name === 'notes'  && !notesLoaded)  { notesLoaded  = true; loadNotes(); }
  if (name === 'report' && !reportLoaded) { reportLoaded = true; loadReport(); }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Mention state ─────────────────────────────────────────────────────────────

let currentMention = null;

function setMention(item) {
  currentMention = item;
  renderMentionBadge();
}

function renderMentionBadge() {
  const badge = document.getElementById('mention-badge');
  if (!badge) return;
  if (currentMention) {
    const sec = currentMention.section ? ` · ${currentMention.section}` : '';
    badge.classList.remove('hidden');
    badge.querySelector('.mention-badge-text').textContent = `@ ${currentMention.title}`;
    badge.querySelector('.mention-badge-section').textContent = sec;
  } else {
    badge.classList.add('hidden');
  }
}

// ── Token setup ───────────────────────────────────────────────────────────────

function renderTokenSetup() {
  const c = document.getElementById('form-container');
  c.innerHTML = `
    <div class="token-setup">
      <p>GitHub Personal Access Token (fine-grained PAT) を入力してください。<br>トークンはこのブラウザのlocalStorageにのみ保存されます。</p>
      <input type="password" id="token-input" class="token-input" placeholder="ghp_xxxxxxxxxxxx" />
      <button class="submit-btn" id="token-save">保存</button>
    </div>
  `;
  document.getElementById('token-save').addEventListener('click', () => {
    const val = document.getElementById('token-input').value.trim();
    if (!val) return;
    localStorage.setItem(TOKEN_KEY, val);
    init();
  });
}

// ── Form ──────────────────────────────────────────────────────────────────────

let selectedLabel = null;
const selectedRoles = new Set();

function renderForm() {
  const c = document.getElementById('form-container');
  const labels = getLabels();
  const roles  = getRoles();

  if (!selectedLabel && labels.length) selectedLabel = labels[0];

  c.innerHTML = `
    <form class="note-form" id="note-form" autocomplete="off">

      <div>
        <p class="section-title">Label</p>
        <div class="label-row" id="label-row"></div>
      </div>

      <div>
        <p class="section-title">Role</p>
        <div class="role-row" id="role-row"></div>
      </div>

      <div id="mention-badge" class="mention-badge hidden">
        <span class="mention-badge-text"></span><span class="mention-badge-section"></span>
        <button type="button" class="mention-clear">✕</button>
      </div>

      <textarea id="note-input" class="note-textarea" placeholder="気づき・タスク・アイデアを書く" rows="5"></textarea>

      <button type="submit" class="submit-btn">Save</button>
      <p id="form-status" class="form-status"></p>

    </form>
  `;

  // Labels
  const labelRow = document.getElementById('label-row');

  function addLabelPill(l) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'label-pill' + (l === selectedLabel ? ' selected' : '');
    pill.textContent = l;
    pill.addEventListener('click', () => {
      selectedLabel = l;
      labelRow.querySelectorAll('.label-pill').forEach(p => p.classList.toggle('selected', p.textContent === l));
    });
    labelRow.insertBefore(pill, labelRow.querySelector('.label-add-btn'));
  }

  labels.forEach(l => addLabelPill(l));

  // Add label button
  const addLabelBtn = document.createElement('button');
  addLabelBtn.type = 'button';
  addLabelBtn.className = 'label-add-btn';
  addLabelBtn.textContent = '+';
  addLabelBtn.addEventListener('click', openLabelModal);
  labelRow.appendChild(addLabelBtn);

  // Manage labels button
  const manageBtn = document.createElement('button');
  manageBtn.type = 'button';
  manageBtn.className = 'label-manage-btn';
  manageBtn.textContent = '✎';
  manageBtn.addEventListener('click', openLabelModal);
  labelRow.appendChild(manageBtn);

  function openLabelModal() {
    const overlay = document.createElement('div');
    overlay.className = 'label-modal-overlay';

    const sheet = document.createElement('div');
    sheet.className = 'label-modal-sheet';

    function close() {
      overlay.remove();
      pushSync();
      renderForm();
    }

    // Header
    const header = document.createElement('div');
    header.className = 'label-modal-header';
    const title = document.createElement('span');
    title.textContent = 'Manage Labels';
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'label-modal-done';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', close);
    header.appendChild(title);
    header.appendChild(doneBtn);

    // List
    const list = document.createElement('ul');
    list.className = 'label-modal-list';

    function renderList() {
      list.innerHTML = '';
      getLabels().forEach((l, idx) => {
        const item = document.createElement('li');
        item.className = 'label-modal-item';

        const nameEl = document.createElement('span');
        nameEl.className = 'label-modal-name';
        nameEl.textContent = l;

        const renameBtn = document.createElement('button');
        renameBtn.type = 'button';
        renameBtn.className = 'label-modal-rename';
        renameBtn.textContent = '✎';
        renameBtn.addEventListener('click', () => {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'label-modal-rename-input';
          input.value = l;
          item.replaceChild(input, nameEl);
          input.focus();
          input.select();

          function commitRename() {
            const val = input.value.trim();
            if (val && val !== l) {
              const ls = getLabels();
              ls[idx] = val;
              localStorage.setItem(LABELS_KEY, JSON.stringify(ls));
              if (selectedLabel === l) selectedLabel = val;
            }
            renderList();
          }
          input.addEventListener('blur', commitRename);
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.removeEventListener('blur', commitRename); renderList(); }
          });
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'label-modal-delete';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
          const ls = getLabels().filter((_, i) => i !== idx);
          localStorage.setItem(LABELS_KEY, JSON.stringify(ls));
          if (selectedLabel === l) selectedLabel = ls[0] || null;
          renderList();
        });

        item.appendChild(nameEl);
        item.appendChild(renameBtn);
        item.appendChild(delBtn);
        list.appendChild(item);
      });
    }

    renderList();

    // Add new label row
    const addRow = document.createElement('div');
    addRow.className = 'label-modal-add';
    const addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.className = 'label-modal-add-input';
    addInput.placeholder = 'New label';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'label-modal-add-btn';
    addBtn.textContent = 'Add';

    function addLabel() {
      const val = addInput.value.trim();
      if (!val) return;
      const ls = getLabels();
      if (ls.includes(val)) { addInput.value = ''; return; }
      ls.push(val);
      localStorage.setItem(LABELS_KEY, JSON.stringify(ls));
      selectedLabel = val;
      addInput.value = '';
      renderList();
    }

    addBtn.addEventListener('click', addLabel);
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } });

    addRow.appendChild(addInput);
    addRow.appendChild(addBtn);

    sheet.appendChild(header);
    sheet.appendChild(list);
    sheet.appendChild(addRow);
    overlay.appendChild(sheet);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
  }

  // Roles
  const roleRow = document.getElementById('role-row');
  roles.forEach(({ key, icon }) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'role-pill' + (selectedRoles.has(key) ? ' selected' : '');
    pill.textContent = icon;
    pill.dataset.label = key;
    pill.addEventListener('click', () => {
      if (selectedRoles.has(key)) selectedRoles.delete(key);
      else selectedRoles.add(key);
      pill.classList.toggle('selected');
    });
    roleRow.appendChild(pill);
  });

  // Mention clear
  document.getElementById('mention-badge').querySelector('.mention-clear').addEventListener('click', () => {
    currentMention = null;
    renderMentionBadge();
  });

  renderMentionBadge();

  // Submit
  document.getElementById('note-form').addEventListener('submit', async e => {
    e.preventDefault();
    const text   = document.getElementById('note-input').value.trim();
    const status = document.getElementById('form-status');
    if (!text || !selectedLabel) return;

    const btn = document.querySelector('.submit-btn');
    btn.disabled = true;
    status.textContent = '保存中...';
    status.className = 'form-status';

    const roleStr  = [...selectedRoles].map(r => `[${r}]`).join('');
    const refLine  = currentMention
      ? `> ref: ${currentMention.title}${currentMention.section ? ` (${currentMention.section})` : ''}\n\n`
      : '';
    const body  = refLine + text;
    const title = `[${selectedLabel}]${roleStr} ` + text.slice(0, 72) + (text.length > 72 ? '…' : '');

    try {
      const res = await fetch(GITHUB_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body, labels: ['note'] }),
      });
      if (res.status === 401) { localStorage.removeItem(TOKEN_KEY); renderTokenSetup(); return; }
      if (!res.ok) throw new Error(`${res.status}`);

      document.getElementById('note-input').value = '';
      selectedRoles.clear();
      currentMention = null;
      renderMentionBadge();
      roleRow.querySelectorAll('.role-pill').forEach(p => p.classList.remove('selected'));
      status.textContent = '保存しました ✓';
      status.className = 'form-status ok';
      notesLoaded = false; // force reload next time
    } catch (err) {
      status.textContent = `エラー: ${err.message}`;
      status.className = 'form-status err';
    } finally {
      btn.disabled = false;
      setTimeout(() => { const s = document.getElementById('form-status'); if (s) { s.textContent = ''; s.className = 'form-status'; } }, 4000);
    }
  });
}

// ── Notes list ────────────────────────────────────────────────────────────────

function esc2(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function parseTitleParts(title) {
  const brackets = [...title.matchAll(/\[(.+?)\]/g)].map(m => m[1]);
  return { label: brackets[0] || '', roles: brackets.slice(1), text: title.replace(/^(\[[^\]]+\])+\s*/, '') };
}

function buildTitle(label, roles, text) {
  return `[${label}]${roles.map(r => `[${r}]`).join('')} ${text}`;
}

async function updateIssue(number, patch) {
  const res = await fetch(`${GITHUB_API}/${number}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`${res.status}`);
}

let _dropdown = null;
function closeDropdown() { if (_dropdown) { _dropdown.remove(); _dropdown = null; } }
document.addEventListener('click', closeDropdown);

function showDropdown(anchor, options, onSelect) {
  closeDropdown();
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'edit-dropdown';
  const top = rect.bottom + 6;
  el.style.top  = `${Math.min(top, window.innerHeight - 200)}px`;
  el.style.left = `${Math.max(8, rect.left)}px`;
  el.addEventListener('click', e => e.stopPropagation());
  options.forEach(({ label, value }) => {
    const row = document.createElement('div');
    row.className = 'edit-dropdown-item';
    row.textContent = label;
    row.addEventListener('click', () => { closeDropdown(); onSelect(value); });
    el.appendChild(row);
  });
  document.body.appendChild(el);
  _dropdown = el;
}

function buildNoteItem(issue) {
  const date = new Date(issue.created_at).toLocaleDateString('ja-JP', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const { label, roles, text } = parseTitleParts(issue.title);
  const roleIconMap = Object.fromEntries(getRoles().map(({ key, icon }) => [key, icon]));

  const item = document.createElement('div');
  item.className = 'note-item';

  function replaceWith(newTitle) {
    item.replaceWith(buildNoteItem({ ...issue, title: newTitle }));
  }

  const tagsDiv = document.createElement('div');
  tagsDiv.className = 'note-item-tags';

  if (label) {
    const tag = document.createElement('span');
    tag.className = 'note-item-tag';
    tag.textContent = label;
    tag.addEventListener('click', e => {
      e.stopPropagation();
      const opts = getLabels().filter(l => l !== label).map(l => ({ label: l, value: l }));
      showDropdown(tag, opts, newLabel => {
        const t = buildTitle(newLabel, roles, text);
        replaceWith(t);
        updateIssue(issue.number, { title: t }).catch(() => replaceWith(issue.title));
      });
    });
    tagsDiv.appendChild(tag);
  }

  roles.forEach(roleKey => {
    const span = document.createElement('span');
    span.className = 'note-item-role';
    span.textContent = roleIconMap[roleKey] ?? roleKey;
    span.title = roleKey;
    span.addEventListener('click', e => {
      e.stopPropagation();
      const t = buildTitle(label, roles.filter(r => r !== roleKey), text);
      replaceWith(t);
      updateIssue(issue.number, { title: t }).catch(() => replaceWith(issue.title));
    });
    tagsDiv.appendChild(span);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'note-item-add-role';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', e => {
    e.stopPropagation();
    const opts = getRoles().filter(r => !roles.includes(r.key)).map(r => ({ label: `${r.icon} ${r.key}`, value: r.key }));
    showDropdown(addBtn, opts, roleKey => {
      const t = buildTitle(label, [...roles, roleKey], text);
      replaceWith(t);
      updateIssue(issue.number, { title: t }).catch(() => replaceWith(issue.title));
    });
  });
  tagsDiv.appendChild(addBtn);

  item.appendChild(tagsDiv);

  const body = document.createElement('p');
  body.className = 'note-item-body';
  body.innerHTML = esc2(issue.body || issue.title);
  item.appendChild(body);

  const dateSpan = document.createElement('span');
  dateSpan.className = 'note-item-date';
  dateSpan.textContent = date;
  item.appendChild(dateSpan);

  return item;
}

async function loadNotes() {
  const c = document.getElementById('notes-container');
  c.innerHTML = '<p class="placeholder">Loading...</p>';
  try {
    const res = await fetch(
      `${GITHUB_API}?labels=note&state=open&per_page=20&sort=created&direction=desc`,
      { headers: { 'Authorization': `Bearer ${getToken()}`, 'Accept': 'application/vnd.github+json' } }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const issues = await res.json();
    c.innerHTML = '';
    if (!issues.length) { c.innerHTML = '<p class="placeholder">まだノートがありません</p>'; return; }
    issues.forEach(issue => c.appendChild(buildNoteItem(issue)));
  } catch (err) {
    c.innerHTML = `<p class="error-msg">読み込み失敗: ${err.message}</p>`;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  if (!getToken()) { renderTokenSetup(); return; }
  await pullSync();
  renderForm();
}

init();
