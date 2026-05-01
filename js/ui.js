const CATEGORY_LABEL = { work: '仕事', personal: '個人', urgent: '緊急', other: 'その他' };
const CHECK_ICON = { done: '✓', todo: '○' };

let _filter = 'all';

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export const ui = {
  render(todos, filter = 'all') {
    const list = document.getElementById('todo-list');
    const emptyMsg = document.getElementById('empty-msg');
    const historyControls = document.getElementById('history-controls');

    historyControls.classList.toggle('hidden', filter !== 'history');

    let sorted;
    if (filter === 'history') {
      sorted = [...todos].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    } else {
      const active = todos.filter(t => !t.completed).sort((a, b) => b.createdAt - a.createdAt);
      const done   = todos.filter(t =>  t.completed).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
      sorted = [...active, ...done];
    }

    list.innerHTML = sorted.map(t => `
      <li class="todo-item priority-${t.priority} ${t.completed ? 'completed' : ''}" data-id="${t.id}">
        <button class="check-btn" aria-label="${t.completed ? '未完了に戻す' : '完了にする'}">
          ${t.completed ? CHECK_ICON.done : CHECK_ICON.todo}
        </button>
        <div class="todo-body">
          <span class="todo-text">${escHtml(t.text)}</span>
          ${filter === 'history' && t.completedAt
            ? `<span class="completed-date">完了: ${formatDate(t.completedAt)}</span>`
            : ''}
        </div>
        <span class="todo-category">${CATEGORY_LABEL[t.category] ?? t.category}</span>
        <button class="delete-btn" aria-label="削除">✕</button>
        <div class="delete-overlay">削除</div>
      </li>
    `).join('');

    emptyMsg.classList.toggle('hidden', sorted.length > 0);
  },

  setFilter(filter) {
    _filter = filter;
    document.querySelectorAll('.tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
      btn.setAttribute('aria-selected', btn.dataset.filter === filter ? 'true' : 'false');
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

  bindEvents({ onAdd, onToggle, onRemove, onFilterChange, onClearHistory }) {
    // Filter tabs
    document.querySelector('.filter-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (btn) onFilterChange(btn.dataset.filter);
    });

    // Todo list: event delegation
    document.getElementById('todo-list').addEventListener('click', e => {
      const item = e.target.closest('.todo-item');
      if (!item) return;
      const id = item.dataset.id;
      if (e.target.closest('.check-btn'))  onToggle(id);
      if (e.target.closest('.delete-btn')) onRemove(id);
    });

    // Clear history button
    document.getElementById('btn-clear-history').addEventListener('click', () => {
      if (confirm('完了済みのタスクをすべて削除しますか？')) onClearHistory();
    });

    // Add button & Enter key
    document.getElementById('btn-add').addEventListener('click', () => {
      const text = ui.getInputValue();
      if (text) ui.openModal(text, onAdd);
    });

    document.getElementById('new-todo').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const text = ui.getInputValue();
        if (text) ui.openModal(text, onAdd);
      }
    });

    // Swipe-to-delete
    setupSwipe(onRemove);
  },

  openModal(text, onAdd) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');

    // Reset selections
    document.querySelectorAll('#priority-group .chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('#category-group .chip').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-priority="high"]').classList.add('active');
    document.querySelector('[data-category="work"]').classList.add('active');

    const close = () => modal.classList.add('hidden');

    document.getElementById('modal-cancel').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };

    // Chip toggles
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

    document.getElementById('modal-ok').onclick = () => {
      const priority = document.querySelector('#priority-group .chip.active')?.dataset.priority ?? 'medium';
      const category = document.querySelector('#category-group .chip.active')?.dataset.category ?? 'other';
      onAdd({ text, priority, category });
      ui.clearInput();
      close();
    };
  },
};

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setupSwipe(onRemove) {
  const list = document.getElementById('todo-list');
  let startX = 0, startY = 0, activeItem = null;

  list.addEventListener('touchstart', e => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    activeItem = item;
  }, { passive: true });

  list.addEventListener('touchmove', e => {
    if (!activeItem) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) { activeItem = null; return; } // vertical scroll
    if (dx < -50) activeItem.classList.add('reveal-delete');
    else activeItem.classList.remove('reveal-delete');
  }, { passive: true });

  list.addEventListener('touchend', e => {
    if (!activeItem) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -120) {
      const id = activeItem.dataset.id;
      activeItem.style.opacity = '0';
      activeItem.style.transition = 'opacity 0.2s';
      setTimeout(() => onRemove(id), 200);
    } else {
      activeItem.classList.remove('reveal-delete');
    }
    activeItem = null;
  });
}
