const CATEGORY_LABEL = { work: '仕事', personal: '個人' };

let _filter = 'all';
let _revealedItem = null;

function dismissReveal() {
  if (_revealedItem) {
    _revealedItem.classList.remove('reveal-delete');
    _revealedItem = null;
  }
}

const DL_COMPAT = { today: 'soon', later: 'month' };

function deadlineScore(dl) {
  const d = DL_COMPAT[dl] ?? dl;
  if (d === 'soon')  return 0;
  if (d === 'days3') return 3;
  if (d === 'week')  return 7;
  if (d === 'month') return 30;
  if (d && d !== 'none') {
    const days = (new Date(d + 'T00:00:00') - new Date()) / 86400000;
    return Math.max(0, days) + 50;
  }
  return Infinity;
}

function deadlineHtml(dl) {
  const d = DL_COMPAT[dl] ?? dl;
  if (!d || d === 'none') return '';
  if (d === 'soon' || d === 'days3') return '<span class="todo-deadline dl-soon">すぐ</span>';
  if (d === 'week')  return '<span class="todo-deadline dl-week">今週まで</span>';
  if (d === 'month') return '<span class="todo-deadline dl-month">今月まで</span>';
  const date = new Date(d + 'T00:00:00');
  return `<span class="todo-deadline dl-date">${date.getMonth() + 1}/${date.getDate()}まで</span>`;
}

function isDueSoon(dl) {
  if (!dl || dl === 'none') return false;
  if (dl === 'soon' || dl === 'days3' || dl === 'today') return true;
  if (dl === 'week' || dl === 'month' || dl === 'later') return false;
  const days = (new Date(dl + 'T00:00:00') - new Date()) / 86400000;
  return days <= 3;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const ui = {
  render(todos, pendingCount = 0) {
    const list     = document.getElementById('todo-list');
    const emptyMsg = document.getElementById('empty-msg');
    const organizeBtn = document.getElementById('btn-organize');

    const active  = todos.filter(t => !t.completed && !t.pendingComplete)
                         .sort((a, b) => deadlineScore(a.deadline) - deadlineScore(b.deadline));
    const pending = todos.filter(t => !t.completed &&  t.pendingComplete)
                         .sort((a, b) => deadlineScore(a.deadline) - deadlineScore(b.deadline));
    const done    = todos.filter(t =>  t.completed)
                         .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    const sorted  = [...active, ...pending, ...done];

    list.innerHTML = sorted.map(t => {
      const isDone     = t.completed || t.pendingComplete;
      const stateClass = t.completed ? ' completed' : (t.pendingComplete ? ' pending-complete' : '');
      const dueSoon    = isDueSoon(t.deadline) && !t.completed && !t.pendingComplete;
      return `
        <li class="todo-item priority-${t.priority}${stateClass}${dueSoon ? ' due-soon' : ''}" data-id="${t.id}">
          <button class="check-btn" aria-label="${isDone ? '未完了に戻す' : '完了にする'}">
            ${isDone ? '✓' : '○'}
          </button>
          <span class="todo-text">${escHtml(t.text)}</span>
          <div class="todo-meta">
            <span class="todo-category">${escHtml(CATEGORY_LABEL[t.category] ?? t.category)}</span>
            ${deadlineHtml(t.deadline)}
          </div>
          <div class="delete-overlay">削除</div>
        </li>
      `;
    }).join('');

    emptyMsg.classList.toggle('hidden', sorted.length > 0);

    if (organizeBtn) {
      organizeBtn.textContent = pendingCount > 0 ? `整理 (${pendingCount})` : '整理';
      organizeBtn.disabled    = pendingCount === 0;
    }
  },

  setFilter(filter) {
    _filter = filter;
    document.querySelectorAll('.tab').forEach(btn => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  },

  showBanner(msg) {
    const el = document.getElementById('banner');
    el.textContent = msg;
    el.classList.remove('hidden');
  },

  getInputValue() {
    return document.getElementById('new-todo').value.trim();
  },

  clearInput() {
    document.getElementById('new-todo').value = '';
  },

  bindEvents({ onAdd, onToggle, onRemove, onOrganize, onEdit, onFilterChange }) {
    document.querySelector('.filter-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (btn) onFilterChange(btn.dataset.filter);
    });

    document.getElementById('btn-organize').addEventListener('click', onOrganize);

    document.getElementById('todo-list').addEventListener('click', e => {
      const item = e.target.closest('.todo-item');
      if (!item) return;
      const id = item.dataset.id;

      if (e.target.closest('.delete-overlay')) {
        dismissReveal();
        onRemove(id);
        return;
      }
      // Dismiss overlay without acting if it was visible
      if (_revealedItem) {
        dismissReveal();
        return;
      }
      if (e.target.closest('.check-btn')) {
        onToggle(id);
        return;
      }
      // Tap on card body = edit
      onEdit(id);
    });

    document.getElementById('btn-add').addEventListener('click', () => {
      const text = ui.getInputValue();
      if (text) ui.openModal({ mode: 'add', text }, onAdd);
    });

    document.getElementById('new-todo').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const text = ui.getInputValue();
        if (text) ui.openModal({ mode: 'add', text }, onAdd);
      }
    });

    setupSwipe(onRemove);
  },

  openModal(
    { mode = 'add', text = '', priority = 'medium', category = 'personal', deadline = null },
    onConfirm
  ) {
    const modal       = document.getElementById('modal');
    const textRow     = document.getElementById('modal-text-row');
    const editText    = document.getElementById('edit-text');
    const okBtn       = document.getElementById('modal-ok');
    const dlDateRow   = document.getElementById('deadline-date-row');
    const dlDateInput = document.getElementById('deadline-date');

    modal.classList.remove('hidden');

    if (mode === 'edit') {
      textRow.classList.remove('hidden');
      editText.value = text;
      okBtn.textContent = '保存';
    } else {
      textRow.classList.add('hidden');
      okBtn.textContent = '追加';
    }

    document.querySelectorAll('#priority-group .chip').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-priority="${priority}"]`)?.classList.add('active');

    document.querySelectorAll('#category-group .chip').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`)?.classList.add('active');

    document.querySelectorAll('#deadline-group .chip').forEach(c => c.classList.remove('active'));
    dlDateRow.classList.add('hidden');
    const dlNorm = DL_COMPAT[deadline] ?? deadline;
    // map removed 'days3' to 'soon' in modal
    const dlModal = dlNorm === 'days3' ? 'soon' : dlNorm;
    if (!dlModal || dlModal === 'none') {
      document.querySelector('[data-deadline="none"]')?.classList.add('active');
    } else if (['soon', 'week', 'month'].includes(dlModal)) {
      document.querySelector(`[data-deadline="${dlModal}"]`)?.classList.add('active');
    } else {
      document.querySelector('[data-deadline="date"]')?.classList.add('active');
      dlDateInput.value = deadline;
      dlDateRow.classList.remove('hidden');
    }

    const close = () => modal.classList.add('hidden');
    document.getElementById('modal-cancel').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };

    document.getElementById('priority-group').onclick = e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#priority-group .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    };

    document.getElementById('category-group').onclick = e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#category-group .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    };

    document.getElementById('deadline-group').onclick = e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#deadline-group .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      dlDateRow.classList.toggle('hidden', chip.dataset.deadline !== 'date');
    };

    document.getElementById('modal-ok').onclick = () => {
      const finalText = mode === 'edit' ? editText.value.trim() : text;
      if (!finalText) return;

      const priority = document.querySelector('#priority-group .chip.active')?.dataset.priority ?? 'medium';
      const category = document.querySelector('#category-group .chip.active')?.dataset.category ?? 'personal';
      const dlChip   = document.querySelector('#deadline-group .chip.active')?.dataset.deadline ?? 'none';
      let deadline = null;
      if (['soon', 'week', 'month'].includes(dlChip)) {
        deadline = dlChip;
      } else if (dlChip === 'date') {
        deadline = dlDateInput.value || null;
      }

      onConfirm({ text: finalText, priority, category, deadline });
      if (mode === 'add') ui.clearInput();
      close();
    };
  },
};

function setupSwipe(onRemove) {
  const list = document.getElementById('todo-list');
  let startX = 0, startY = 0, activeItem = null, gesture = null;

  list.addEventListener('touchstart', e => {
    const item = e.target.closest('.todo-item');

    // Touching the currently revealed overlay → let click handle it
    if (_revealedItem && item === _revealedItem && e.target.closest('.delete-overlay')) return;

    dismissReveal();

    if (!item || e.target.closest('.check-btn')) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    activeItem = item;
    gesture = null;
  }, { passive: true });

  list.addEventListener('touchmove', e => {
    if (!activeItem) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) { activeItem = null; return; }
    gesture = 'swipe';
    if (dx < -50) {
      activeItem.classList.add('reveal-delete');
    } else {
      activeItem.classList.remove('reveal-delete');
      if (_revealedItem === activeItem) _revealedItem = null;
    }
  }, { passive: true });

  list.addEventListener('touchend', e => {
    if (!activeItem) { activeItem = null; gesture = null; return; }
    if (gesture === 'swipe') {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -50) {
        _revealedItem = activeItem;
      } else {
        activeItem.classList.remove('reveal-delete');
        if (_revealedItem === activeItem) _revealedItem = null;
      }
    }
    activeItem = null;
    gesture = null;
  });

  list.addEventListener('touchcancel', () => {
    if (activeItem) {
      activeItem.classList.remove('reveal-delete');
      if (_revealedItem === activeItem) _revealedItem = null;
    }
    activeItem = null;
    gesture = null;
  });
}
