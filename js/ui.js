const CATEGORY_LABEL = { work: '仕事', personal: '個人', urgent: '緊急', other: 'その他' };

let _filter = 'personal';

export const ui = {
  render(todos) {
    const list = document.getElementById('todo-list');
    const emptyMsg = document.getElementById('empty-msg');

    const sorted = _filter === 'done'
      ? todos  // already sorted by completedAt desc from store
      : [...todos].sort((a, b) => b.createdAt - a.createdAt);

    list.innerHTML = sorted.map(t => {
      if (_filter === 'done') {
        return `
      <li class="todo-item priority-${t.priority} completed" data-id="${t.id}">
        <button class="check-btn" aria-label="元に戻す">✓</button>
        <span class="todo-text">${escHtml(t.text)}</span>
        <span class="todo-category">${CATEGORY_LABEL[t.category] ?? t.category}</span>
        <span class="todo-date">${formatDate(t.completedAt)}</span>
        <button class="delete-btn" aria-label="削除">✕</button>
        <div class="delete-overlay">削除</div>
      </li>`;
      }
      return `
      <li class="todo-item priority-${t.priority}" data-id="${t.id}">
        <button class="check-btn" aria-label="完了にする">○</button>
        <span class="todo-text">${escHtml(t.text)}</span>
        <span class="todo-category">${CATEGORY_LABEL[t.category] ?? t.category}</span>
        <button class="delete-btn" aria-label="削除">✕</button>
        <div class="delete-overlay">削除</div>
      </li>`;
    }).join('');

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

  bindEvents({ onAdd, onToggle, onRemove, onFilterChange }) {
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

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

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
