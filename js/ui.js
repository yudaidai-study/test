const CATEGORY_LABEL = { work: '仕事', personal: '個人' };

let _filter = 'all';

function deadlineScore(dl) {
  if (dl === 'today') return 0;
  if (dl === 'week')  return 7;
  if (dl && dl !== 'later' && dl !== 'none') {
    const days = (new Date(dl + 'T00:00:00') - new Date()) / 86400000;
    return Math.max(0, days) + 14;
  }
  if (dl === 'later') return 365;
  return Infinity;
}

function deadlineHtml(dl) {
  if (!dl || dl === 'none') return '';
  if (dl === 'today') return '<span class="todo-deadline dl-today">今日まで</span>';
  if (dl === 'week')  return '<span class="todo-deadline dl-week">今週まで</span>';
  if (dl === 'later') return '<span class="todo-deadline dl-later">来週以降</span>';
  const d = new Date(dl + 'T00:00:00');
  return `<span class="todo-deadline dl-date">${d.getMonth() + 1}/${d.getDate()}まで</span>`;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const ui = {
  render(todos) {
    const list     = document.getElementById('todo-list');
    const emptyMsg = document.getElementById('empty-msg');

    const active    = todos.filter(t => !t.completed)
                           .sort((a, b) => deadlineScore(a.deadline) - deadlineScore(b.deadline));
    const completed = todos.filter(t =>  t.completed)
                           .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    const sorted = [...active, ...completed];

    list.innerHTML = sorted.map(t => `
      <li class="todo-item priority-${t.priority}${t.completed ? ' completed' : ''}" data-id="${t.id}">
        <button class="check-btn" aria-label="${t.completed ? '未完了に戻す' : '完了にする'}">
          ${t.completed ? '✓' : '○'}
        </button>
        <div class="todo-body">
          <span class="todo-text">${escHtml(t.text)}</span>
          ${deadlineHtml(t.deadline)}
        </div>
        <span class="todo-category">${escHtml(CATEGORY_LABEL[t.category] ?? t.category)}</span>
        <button class="delete-btn" aria-label="削除">✕</button>
        <div class="delete-overlay">削除</div>
      </li>
    `).join('');

    emptyMsg.classList.toggle('hidden', sorted.length > 0);
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

  bindEvents({ onAdd, onToggle, onRemove, onEdit, onFilterChange }) {
    document.querySelector('.filter-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (btn) onFilterChange(btn.dataset.filter);
    });

    document.getElementById('todo-list').addEventListener('click', e => {
      const item = e.target.closest('.todo-item');
      if (!item) return;
      const id = item.dataset.id;
      if (e.target.closest('.check-btn'))  onToggle(id);
      if (e.target.closest('.delete-btn')) onRemove(id);
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

    setupTouchGestures(onRemove, onEdit);
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

    // Priority
    document.querySelectorAll('#priority-group .chip').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-priority="${priority}"]`)?.classList.add('active');

    // Category
    document.querySelectorAll('#category-group .chip').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`)?.classList.add('active');

    // Deadline
    document.querySelectorAll('#deadline-group .chip').forEach(c => c.classList.remove('active'));
    dlDateRow.classList.add('hidden');
    if (!deadline || deadline === 'none') {
      document.querySelector('[data-deadline="none"]')?.classList.add('active');
    } else if (['today', 'week', 'later'].includes(deadline)) {
      document.querySelector(`[data-deadline="${deadline}"]`)?.classList.add('active');
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
      if (chip.dataset.deadline === 'date') {
        dlDateRow.classList.remove('hidden');
      } else {
        dlDateRow.classList.add('hidden');
      }
    };

    document.getElementById('modal-ok').onclick = () => {
      const finalText = mode === 'edit' ? editText.value.trim() : text;
      if (!finalText) return;

      const priority = document.querySelector('#priority-group .chip.active')?.dataset.priority ?? 'medium';
      const category = document.querySelector('#category-group .chip.active')?.dataset.category ?? 'personal';
      const dlChip   = document.querySelector('#deadline-group .chip.active')?.dataset.deadline ?? 'none';
      let deadline = null;
      if (dlChip === 'today' || dlChip === 'week' || dlChip === 'later') {
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

function setupTouchGestures(onRemove, onEdit) {
  const list = document.getElementById('todo-list');
  let startX = 0, startY = 0, activeItem = null;
  let pressTimer = null, gesture = null;

  function cancelPress() {
    clearTimeout(pressTimer);
    pressTimer = null;
  }

  list.addEventListener('touchstart', e => {
    const item = e.target.closest('.todo-item');
    if (!item || e.target.closest('.check-btn') || e.target.closest('.delete-btn')) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    activeItem = item;
    gesture = null;
    pressTimer = setTimeout(() => {
      if (gesture !== 'swipe') {
        gesture = 'press';
        navigator.vibrate?.(30);
        onEdit(activeItem?.dataset.id);
        activeItem = null;
      }
    }, 500);
  }, { passive: true });

  list.addEventListener('touchmove', e => {
    if (!activeItem) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) { cancelPress(); activeItem = null; return; }
    gesture = 'swipe';
    cancelPress();
    if (dx < -50) activeItem.classList.add('reveal-delete');
    else activeItem.classList.remove('reveal-delete');
  }, { passive: true });

  list.addEventListener('touchend', e => {
    cancelPress();
    if (!activeItem) { activeItem = null; gesture = null; return; }
    if (gesture === 'swipe') {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -120) {
        const id = activeItem.dataset.id;
        activeItem.style.opacity = '0';
        activeItem.style.transition = 'opacity 0.2s';
        setTimeout(() => onRemove(id), 200);
      } else {
        activeItem.classList.remove('reveal-delete');
      }
    }
    activeItem = null;
    gesture = null;
  });

  list.addEventListener('touchcancel', () => {
    cancelPress();
    if (activeItem) activeItem.classList.remove('reveal-delete');
    activeItem = null;
    gesture = null;
  });

  // Desktop: long mouse press to edit
  list.addEventListener('mousedown', e => {
    const item = e.target.closest('.todo-item');
    if (!item || e.target.closest('.check-btn') || e.target.closest('.delete-btn')) return;
    pressTimer = setTimeout(() => onEdit(item.dataset.id), 500);
  });
  list.addEventListener('mouseup',    cancelPress);
  list.addEventListener('mouseleave', cancelPress);
}
