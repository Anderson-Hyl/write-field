'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const storageKey = 'write-field.design-scene.v1';
  const sourceText = 'traverse :: (Traversable t, Applicative f) => (a -> f b) -> t a -> f (t b)';
  const candidates = [
    { title: '一段解释', kind: 'paragraph', text: 'map 保留每一项各自的解析结果，而 traverse 可以用 Maybe 把这些结果组合起来：只有每一项都成功，才得到完整的列表。这里的“一项失败，整体失败”来自 Maybe 的组合方式，并不是所有 Applicative 都如此。' },
    { title: '代码例子', kind: 'code', text: '```haskell\nmap (readMaybe :: String -> Maybe Int) ["12", "oops", "7"]\n-- [Just 12,Nothing,Just 7]\n\ntraverse (readMaybe :: String -> Maybe Int) ["12", "oops", "7"]\n-- Nothing\n```' }
  ];
  const fixtureAnswers = {
    '换个例子看看': '如果把 Maybe 换成列表，组合的含义就变了。例如 traverse (\\x -> [x, -x]) [1, 2] 会产生四种组合。\n\n所以“有一项失败就整体失败”适合描述前面的 Maybe 例子，却不足以概括 Traversable。这是预置的解释示例，本页没有执行代码。',
    '给我一个候选段落': '可以先把表达收窄到这个 Maybe 例子，再补一句适用边界。下面“选择采用”里保留了一段解释和代码例子，你可以只选需要的部分，也可以继续自己写。',
    '从哪里开始？': '可以先让读者遇到一个问题：手里有一组字符串，每一项都可能解析失败。你想保留每一项的结果，还是只在全部成功时得到一个完整列表？\n\n从这个差异进入 map 与 traverse，比一开始堆出类型定义更具体。也可以直接从类型讲起，取决于这篇文章想面对谁。',
    '先比较两种讲法': '从例子开始，读者先知道为什么需要它；从类型开始，更容易直接看出 t 与 f 的位置变化。\n\n这篇可以先用 Maybe 例子建立直觉，再回到类型说明边界。只是一条候选路径，不必现在定下来。'
  };
  const newThread = () => ({ turns: [], draft: '' });
  function seed(blank) {
    const blocks = blank ? [{ id: 'b1', kind: 'paragraph', text: '' }] : [
      { id: 'p1', kind: 'paragraph', text: '学习 Haskell 时，我很早就遇到了 map：给它一个函数，再给它一个列表，就能逐项变换其中的值。但当这个函数本身也带着一种效果，事情开始变得有趣。' },
      { id: 'p2', kind: 'heading', text: '## 先遇到一个小问题' },
      { id: 'p3', kind: 'paragraph', text: '假设有一组字符串，我们想把它们读成整数。某一项可能不合法，所以每次读取的结果都是 Maybe Int。逐项读取以后，我们真正想拿到什么？' },
      { id: 'p4', kind: 'code', text: '```haskell\nmap (readMaybe :: String -> Maybe Int) ["12", "oops", "7"]\n-- [Just 12,Nothing,Just 7]\n```' },
      { id: 'p5', kind: 'paragraph', text: 'map 留下了每一项各自的结果。有时这正是我们需要的；另一些时候，我们希望在全部解析成功以后，才继续处理那份完整的整数列表。' },
      { id: 'p6', kind: 'heading', text: '## 把效果组合起来' },
      { id: 'p7', kind: 'paragraph', text: '这里先停一下。我想把“逐项处理”与“组合效果”的区别讲清楚，再回到 traverse 的类型。' }
    ];
    const s = { title: blank ? '关于 Traversable' : '从 map 到 traverse', blocks, note: '', noteDraft: '', active: blank ? 'topic' : 'p1', threads: { topic: newThread() }, undo: [] };
    if (!blank) s.threads.p1 = { draft: '', turns: [
      { role: 'user', text: 'map 不是已经逐项处理了吗，traverse 多做了什么？' },
      { role: 'assistant', text: '关键在于，如何组织每一项带回来的效果。\n\nmap 得到“每一项的结果”；traverse 则借助 Applicative 把效果组合起来，得到“一个包含整个结构的结果”。在这个 Maybe 例子里，一项失败，整体就是 Nothing。', basis: blocks[0].text, scopeLabel: '当前段 + 签名摘录', receipt: blocks[0].text + '\n\n资料摘录：\n' + sourceText, anchor: 'p1' }
    ] };
    return s;
  }
  let scenes = { writing: seed(false), blank: seed(true) }, mode = 'writing', pending = null, run = null, focusOnly = false;
  let nextID = 1, composing = new Set(), lastDialogTrigger = null;
  const s = () => scenes[mode];
  const thread = () => s().threads[s().active] ||= newThread();
  const currentBlock = () => s().blocks.find(b => b.id === s().active);
  const currentText = () => currentBlock()?.text || '';
  function validScene(v) {
    return v && typeof v.title === 'string' && typeof v.note === 'string' && typeof v.active === 'string'
      && Array.isArray(v.blocks) && v.blocks.length > 0 && v.blocks.every(b => typeof b.id === 'string' && typeof b.text === 'string' && ['paragraph','heading','code'].includes(b.kind))
      && v.threads && typeof v.threads === 'object' && Object.values(v.threads).every(t => t && Array.isArray(t.turns) && typeof t.draft === 'string' && t.turns.every(r => r && ['user','assistant','error'].includes(r.role) && typeof r.text === 'string'));
  }
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && validScene(saved.writing) && validScene(saved.blank)) {
      scenes = saved;
      for (const value of Object.values(scenes)) {
        value.undo = [];
        if (value.active !== 'topic' && !value.blocks.some(b => b.id === value.active)) value.active = 'topic';
      }
    }
  } catch { storageAvailable = false; }
  function save() {
    if (composing.size) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(scenes));
      storageAvailable = true;
      $('saveStatus').textContent = '已保存在此浏览器';
    } catch {
      storageAvailable = false;
      $('saveStatus').textContent = '仅本页暂存 · 请导出留存';
    }
  }
  function notify(text) { $('feedbackText').textContent = text; $('feedback').hidden = false; }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', '#i-' + name); svg.append(use); return svg;
  }
  function fit(input) { input.style.height = 'auto'; input.style.height = Math.max(36, input.scrollHeight + 2) + 'px'; }
  function layout() {
    if (matchMedia('(max-width: 800px)').matches) { $('discussionMargin').style.paddingTop = '0px'; return; }
    const target = s().active === 'topic' ? $('paper').querySelector('.paper-topline') : document.getElementById('block-' + s().active);
    if (target) $('discussionMargin').style.paddingTop = Math.max(0, target.getBoundingClientRect().top - $('paper').getBoundingClientRect().top - 1) + 'px';
  }
  function updateCount() {
    const count = s().blocks.map(b => b.text).join('').replace(/\s/g, '').length;
    $('wordCount').textContent = count + ' 字符';
    $('undoInsert').disabled = !s().undo?.length;
  }
  function markActive() {
    $('blocks').querySelectorAll('.block').forEach(el => { const on = el.dataset.id === s().active; el.classList.toggle('active', on); el.querySelector('button').setAttribute('aria-expanded', String(on && !$('discussionCard').hidden)); });
    $('discussionMargin').classList.toggle('topic', s().active === 'topic');
  }
  function renderBlocks() {
    $('blocks').replaceChildren();
    s().blocks.forEach((b, i) => {
      const section = document.createElement('section'); section.id = 'block-' + b.id; section.dataset.id = b.id; section.dataset.kind = b.kind; section.className = 'block' + (b.inserted ? ' inserted' : '');
      const input = document.createElement('textarea'); input.value = b.text; input.rows = 1; input.spellcheck = false; input.setAttribute('aria-label', '正文第 ' + (i + 1) + ' 段'); input.placeholder = '可以先写一句，也可以在旁边一起想想。';
      input.addEventListener('focus', () => { if (s().active !== b.id && b.text.trim()) selectAnchor(b.id, false); });
      input.addEventListener('input', e => {
        fit(input); layout();
        if (e.isComposing || composing.has(input)) return;
        b.text = input.value; updateCount(); updateStale(); save();
      });
      input.addEventListener('compositionend', () => { b.text = input.value; fit(input); updateCount(); updateStale(); });
      const port = document.createElement('button'); port.className = 'paragraph-port'; port.append(icon('chat')); port.title = '讨论这一段'; port.setAttribute('aria-label', '讨论第 ' + (i + 1) + ' 段'); port.setAttribute('aria-controls', 'discussionCard'); port.addEventListener('click', () => selectAnchor(b.id, true));
      section.append(input, port); $('blocks').append(section); fit(input);
    });
    markActive(); updateCount(); layout();
  }
  function selectAnchor(id, moveFocus) {
    if (composing.size) return;
    // Keep the running discussion in place while the author keeps typing.
    if (run && !moveFocus) return;
    if (id !== 'topic' && !s().blocks.some(b => b.id === id)) { notify('原段落已不存在，请重新选择讨论位置。'); return; }
    if (run) cancelRun(false);
    s().active = id;
    if (moveFocus && focusOnly) toggleFocus();
    $('discussionCard').hidden = false; $('reopenDiscussion').hidden = true;
    renderDiscussion(); markActive(); layout(); save();
    if (moveFocus) { $('question').focus({ preventScroll: true }); $('discussionCard').scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
  }
  function renderDiscussion() {
    const isTopic = s().active === 'topic';
    $('discussionScope').textContent = isTopic ? '关于这篇' : '段旁讨论';
    $('discussionTitle').textContent = isTopic ? '还没落笔，也可以先聊聊' : s().active === 'p1' ? '都是逐项处理，差别在哪？' : '就从这一段继续想';
    $('anchorQuote').hidden = isTopic;
    $('anchorQuote').textContent = currentText().length > 68 ? currentText().slice(0, 68) + '…' : currentText() || '这一段还没有文字';
    $('question').value = thread().draft; $('turns').replaceChildren();
    if (!thread().turns.length) {
      const empty = document.createElement('p'); empty.className = 'muted'; empty.style.fontSize = '.875rem'; empty.textContent = isTopic ? '你想写些什么？从一个困惑、一个例子，或还没成形的念头开始。' : '这段里，有什么想再想一想？'; $('turns').append(empty);
    }
    thread().turns.forEach(t => {
      const row = document.createElement('div'); row.className = 'turn ' + t.role;
      const label = document.createElement('div'); label.className = 'turn-label'; label.textContent = t.role === 'user' ? '你' : t.role === 'error' ? '本页预览' : 'AI · 示例';
      const body = document.createElement('div'); body.className = 'turn-body'; body.textContent = t.text; row.append(label, body);
      if (t.receipt) {
        const details = document.createElement('details'); details.className = 'receipt';
        const summary = document.createElement('summary'); summary.textContent = '本次参考 · ' + t.scopeLabel;
        const pre = document.createElement('pre'); pre.textContent = t.receipt; details.append(summary, pre); row.append(details);
        const stale = document.createElement('p'); stale.className = 'stale'; stale.textContent = '正文已有变化 · 这条答复保留发送时的版本'; stale.dataset.basis = t.basis || ''; stale.dataset.anchor = t.anchor || 'topic'; row.append(stale);
      }
      $('turns').append(row);
    });
    $('suggestions').replaceChildren();
    (isTopic ? ['从哪里开始？', '先比较两种讲法'] : ['换个例子看看', '给我一个候选段落']).forEach(text => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.addEventListener('click', () => { $('question').value = text; thread().draft = text; save(); $('question').focus(); }); $('suggestions').append(button);
    });
    $('adoptButton').disabled = !thread().turns.some(t => t.role === 'assistant');
    document.querySelector('[name=readScope][value=paragraph]').checked = true;
    $('scopeOptions').hidden = true; $('scopeButton').setAttribute('aria-expanded', 'false');
    updateScopeLabel(); updateStale();
  }
  function updateStale() {
    $('turns').querySelectorAll('.stale').forEach(el => {
      const text = el.dataset.anchor === 'title' ? s().title : el.dataset.anchor === 'topic' ? s().blocks.map(b => b.text).join('\n\n') : s().blocks.find(b => b.id === el.dataset.anchor)?.text;
      el.hidden = text === el.dataset.basis;
    });
  }
  function updateScopeLabel() {
    const full = document.querySelector('[name=readScope]:checked').value === 'article';
    $('scopeButton').textContent = '本次：' + (full ? '全文' : s().active === 'topic' ? '关于这篇' : '当前段') + ($('includeSource').checked ? ' + 资料' : '');
  }
  function render() {
    $('articleTitle').value = s().title; $('documentName').textContent = mode === 'blank' ? 'Traversable · 开题' : 'Traversable 随笔';
    $('documentSubtitle').textContent = mode === 'blank' ? '不用先有提纲，也不急着写第一句。' : '从一个小问题出发，理解效果的组合。';
    $('noteDisplay').textContent = s().note || '有想留下的取舍，再记一句。'; $('noteDisplay').classList.toggle('muted', !s().note);
    $('editNote').textContent = s().note ? '编辑想法…' : '写下想法…';
    $('discussionCard').hidden = false; $('reopenDiscussion').hidden = true;
    renderBlocks(); renderDiscussion(); layout();
  }
  function cancelRun(announce = true) {
    if (!run) return;
    clearTimeout(run.timer); const destination = run.thread;
    destination.turns.push({ role: 'error', text: '已取消这次示例展示。问题仍在，可以继续写或重新提问。' });
    run = null; $('generation').hidden = true; $('sendButton').disabled = false; renderDiscussion(); save();
    if (announce) notify('已取消，正文未发生变化。');
  }
  function ask(event) {
    event.preventDefault(); if (composing.size || run) return;
    const question = $('question').value.trim(); if (!question) { $('question').focus(); return; }
    const destination = thread(), anchor = s().active;
    const full = document.querySelector('[name=readScope]:checked').value === 'article';
    const basis = full ? s().blocks.map(b => b.text).join('\n\n') : anchor === 'topic' ? s().title : currentText();
    const scopeLabel = (full ? '全文' : anchor === 'topic' ? '关于这篇' : '当前段') + ($('includeSource').checked ? ' + 签名摘录' : '');
    // The preview records the exact selected material; no text is transmitted.
    const receipt = (anchor === 'topic' && !full ? '题目：' + s().title : basis) + ($('includeSource').checked ? '\n\n资料摘录：\n' + sourceText : '');
    destination.turns.push({ role: 'user', text: question }); destination.draft = ''; $('question').value = '';
    const answer = fixtureAnswers[question];
    if (!answer) {
      destination.turns.push({ role: 'error', text: '问题已留下。这版尚未连接 AI，不能回答自由提问；可选下面的示例问法体验后续交互。' }); renderDiscussion(); save(); notify('已保留你的问题，未发送到任何模型。'); return;
    }
    renderDiscussion(); $('generation').hidden = false; $('sendButton').disabled = true;
    const token = { thread: destination, timer: null, trigger: { kind: 'authorAsk', id: 'ask-' + Date.now() + '-' + nextID++, question } }; run = token;
    // A short, author-triggered UI simulation, never a background AI trigger.
    token.timer = setTimeout(() => {
      if (run !== token) return;
      destination.turns.push({ role: 'assistant', text: answer, trigger: token.trigger, basis, receipt, scopeLabel, anchor: full ? 'topic' : anchor === 'topic' ? 'title' : anchor });
      run = null; $('generation').hidden = true; $('sendButton').disabled = false;
      renderDiscussion(); $('turns').scrollTop = $('turns').scrollHeight; save(); notify('示例答复已留在旁边，正文没有改变。');
    }, 650);
  }
  function openDialog(id) { if (composing.size) return; lastDialogTrigger = document.activeElement; $(id).showModal(); }
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('close', () => { if (lastDialogTrigger?.isConnected) lastDialogTrigger.focus({ preventScroll: true }); }));
  function openNote() { $('noteInput').value = s().noteDraft || s().note || ''; openDialog('noteDialog'); }
  function buildPreview() {
    const chosen = [...document.querySelectorAll('[name=candidate]:checked')].map(el => candidates[Number(el.value)]);
    $('insertPreview').textContent = chosen.map(c => c.text).join('\n\n') || '尚未选择内容。'; $('confirmAdopt').disabled = chosen.length === 0;
  }
  function openAdopt() {
    if (!thread().turns.some(t => t.role === 'assistant')) return;
    pending = { mode, blocks: s().blocks.map(b => ({ id: b.id, text: b.text })) };
    $('candidateChoices').replaceChildren();
    candidates.forEach((c, i) => {
      const label = document.createElement('label'); label.className = 'candidate-choice';
      const check = document.createElement('input'); check.type = 'checkbox'; check.name = 'candidate'; check.value = String(i); check.checked = i === 0; check.addEventListener('change', buildPreview);
      const content = document.createElement('div'); const title = document.createElement('strong'); title.textContent = c.title;
      const preview = document.createElement(c.kind === 'code' ? 'pre' : 'p'); preview.textContent = c.text; content.append(title, preview); label.append(check, content); $('candidateChoices').append(label);
    });
    $('insertPosition').replaceChildren();
    s().blocks.forEach((b, i) => { const option = document.createElement('option'); option.value = b.id; option.textContent = '第 ' + (i + 1) + ' 段之后 · ' + (b.text.slice(0, 24) || '空段'); $('insertPosition').append(option); });
    const end = document.createElement('option'); end.value = 'end'; end.textContent = '文章末尾'; $('insertPosition').append(end);
    $('insertPosition').value = s().active === 'topic' ? 'end' : s().active;
    $('adoptError').hidden = true; buildPreview(); openDialog('adoptDialog');
  }
  function confirmAdopt() {
    if (!pending || pending.mode !== mode) return;
    const selected = [...document.querySelectorAll('[name=candidate]:checked')].map(el => candidates[Number(el.value)]); if (!selected.length) return;
    const position = $('insertPosition').value;
    const index = position === 'end' ? s().blocks.length : s().blocks.findIndex(b => b.id === position) + 1;
    const original = pending.blocks.find(b => b.id === position);
    if (position !== 'end' && (index === 0 || !original || s().blocks[index - 1].text !== original.text)) {
      $('adoptError').textContent = '插入位置已有变化，请取消后重新选择。'; $('adoptError').hidden = false; return;
    }
    const inserted = selected.map(c => ({ id: 'adopt-' + Date.now() + '-' + nextID++, kind: c.kind, text: c.text, inserted: true }));
    s().blocks.splice(index, 0, ...inserted); s().undo ||= []; s().undo.push(inserted.map(b => ({ id: b.id, text: b.text })));
    $('adoptDialog').close(); pending = null; renderBlocks(); save();
    document.getElementById('block-' + inserted[0].id).scrollIntoView({ block: 'center', behavior: 'auto' });
    notify('已插入你选中的 ' + inserted.length + ' 块内容。顶部的“撤销采用”可以收回，原讨论仍在。');
  }
  function undoAdopt() {
    const entry = s().undo?.at(-1); if (!entry || composing.size) return;
    if (entry.some(old => !s().blocks.some(b => b.id === old.id && b.text === old.text))) { notify('采用的内容已有修改，已保留你的文字。请在正文中按需编辑。'); return; }
    const ids = new Set(entry.map(b => b.id)); s().blocks = s().blocks.filter(b => !ids.has(b.id)); s().undo.pop();
    if (ids.has(s().active)) s().active = 'topic'; render(); save(); notify('已撤销这次采用，其它段落和讨论保持原样。');
  }
  function toggleFocus() {
    if (composing.size) return;
    focusOnly = !focusOnly; $('workspace').classList.toggle('focus-mode', focusOnly); $('focusButton').setAttribute('aria-pressed', String(focusOnly)); $('focusButton').querySelector('span').textContent = focusOnly ? '显示旁注' : '只看稿';
    $('blocks').querySelectorAll('textarea').forEach(fit); layout();
  }
  document.addEventListener('compositionstart', e => composing.add(e.target));
  document.addEventListener('compositionend', e => { composing.delete(e.target); if (e.target === $('question')) thread().draft = e.target.value; if (e.target === $('articleTitle')) s().title = e.target.value; if (e.target === $('noteInput')) s().noteDraft = e.target.value; save(); });
  $('question').addEventListener('input', e => { if (!e.isComposing && !composing.has(e.target)) { thread().draft = e.target.value; save(); } });
  $('question').addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('askForm').requestSubmit(); } });
  $('articleTitle').addEventListener('input', e => { if (!e.isComposing && !composing.has(e.target)) { s().title = e.target.value; save(); } });
  $('noteInput').addEventListener('input', e => { if (!e.isComposing && !composing.has(e.target)) { s().noteDraft = e.target.value; save(); } });
  $('askForm').addEventListener('submit', ask);
  $('scopeButton').addEventListener('click', () => { const show = $('scopeOptions').hidden; $('scopeOptions').hidden = !show; $('scopeButton').setAttribute('aria-expanded', String(show)); });
  $('scopeOptions').addEventListener('change', updateScopeLabel);
  $('cancelGeneration').addEventListener('click', () => cancelRun());
  $('sceneSelect').addEventListener('change', () => {
    if (composing.size) { $('sceneSelect').value = mode; return; }
    cancelRun(false); save(); mode = $('sceneSelect').value; render(); $('feedback').hidden = true; window.scrollTo({ top: 0, behavior: 'auto' });
  });
  $('topicDiscussion').addEventListener('click', () => selectAnchor('topic', true));
  $('anchorQuote').addEventListener('click', () => {
    const input = document.querySelector('#block-' + s().active + ' textarea'); if (input) { input.focus({ preventScroll: true }); input.scrollIntoView({ block: 'center', behavior: 'auto' }); }
  });
  $('closeDiscussion').addEventListener('click', () => { $('discussionCard').hidden = true; $('reopenDiscussion').hidden = false; markActive(); $('reopenDiscussion').focus(); });
  $('reopenDiscussion').addEventListener('click', () => selectAnchor(s().active, true));
  $('sourceToolbar').addEventListener('click', () => openDialog('sourceDialog'));
  $('openSource').addEventListener('click', () => openDialog('sourceDialog'));
  $('editNote').addEventListener('click', openNote); $('noteFromDiscussion').addEventListener('click', openNote);
  $('saveNote').addEventListener('click', () => { if (composing.size) return; s().note = $('noteInput').value.trim(); s().noteDraft = ''; $('noteDialog').close(); $('noteDisplay').textContent = s().note || '有想留下的取舍，再记一句。'; $('noteDisplay').classList.toggle('muted', !s().note); $('editNote').textContent = s().note ? '编辑想法…' : '写下想法…'; save(); notify(s().note ? '已留下你的想法，正文未改变。' : '当前笔记已清空。'); });
  $('adoptButton').addEventListener('click', openAdopt); $('confirmAdopt').addEventListener('click', confirmAdopt); $('undoInsert').addEventListener('click', undoAdopt);
  $('focusButton').addEventListener('click', toggleFocus);
  $('addParagraph').addEventListener('click', () => { if (composing.size) return; const b = { id: 'new-' + Date.now() + '-' + nextID++, kind: 'paragraph', text: '' }; s().blocks.push(b); renderBlocks(); save(); const input = document.querySelector('#block-' + b.id + ' textarea'); input.focus(); });
  $('exportButton').addEventListener('click', () => {
    if (composing.size) return;
    const markdown = '# ' + s().title + '\n\n' + s().blocks.map(b => b.text).join('\n\n') + '\n';
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = (s().title || '未命名文章').replace(/[\\/:*?"<>|]/g, '-') + '.md'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('已发起 Markdown 下载。导出仅包含正文，不含旁注与应用标记。');
  });
  $('dismissFeedback').addEventListener('click', () => $('feedback').hidden = true);
  $('aboutButton').addEventListener('click', () => openDialog('aboutDialog'));
  window.addEventListener('resize', () => { $('blocks').querySelectorAll('textarea').forEach(fit); layout(); });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(layout).observe($('paper'));
  render();
  $('saveStatus').textContent = storageAvailable ? '仅保存在此浏览器' : '仅本页暂存 · 请导出留存';
})();
