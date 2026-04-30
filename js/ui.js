const CATEGORY_LABEL = { work: '仕事', personal: '個人', urgent: '緊急', shopping: '買い物', other: 'その他' };
const CHECK_ICON = { done: '✓', todo: '○' };

let _filter = 'all';

function deadlineClass(deadline) {
  if (!deadline) return '';
  const diffMs = new Date(deadline + 'T23:59:59') - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1)  return 'deadline-urgent';
  if (diffDays < 3)  return 'deadline-soon';
  return '';
}

function formatDeadline(deadline) {
  if (!deadline) return null;
  const [, m, d] = deadline.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

function renderItem(t) {
  const dlClass = deadlineClass(t.deadline);
  const dlText  = formatDeadline(t.deadline);
  return `
    <li class="todo-item priority-${t.priority ?? 'none'} ${t.completed ? 'completed' : ''}" data-id="${t.id}">
      <button class="check-btn" aria-label="${t.completed ? '未完了に戻す' : '完了にする'}">
        ${t.completed ? CHECK_ICON.done : CHECK_ICON.todo}
      </button>
      <span class="todo-text">${escHtml(t.text)}</span>
      ${dlText ? `<span class="todo-deadline ${dlClass}">${dlText}</span>` : ''}
      <span class="todo-category">${CATEGORY_LABEL[t.category] ?? t.category}</span>
      <button class="delete-btn" aria-label="削除">✕</button>
      <div class="delete-overlay">削除</div>
    </li>
  `;
}

export const ui = {
  render(todos) {
    const list            = document.getElementById('todo-list');
    const shoppingSection = document.getElementById('shopping-section');
    const shoppingList    = document.getElementById('shopping-list');
    const emptyMsg        = document.getElementById('empty-msg');

    if (_filter === 'all') {
      // Split active todos into non-shopping and shopping
      const regular  = todos.filter(t => t.category !== 'shopping').sort((a, b) => b.createdAt - a.createdAt);
      const shopping = todos.filter(t => t.category === 'shopping').sort((a, b) => b.createdAt - a.createdAt);

      list.innerHTML = regular.map(renderItem).join('');

      if (shopping.length > 0) {
        shoppingSection.classList.remove('hidden');
        shoppingList.innerHTML = shopping.map(renderItem).join('');
      } else {
        shoppingSection.classList.add('hidden');
      }

      emptyMsg.classList.toggle('hidden', regular.length > 0 || shopping.length > 0);
    } else {
      shoppingSection.classList.add('hidden');

      // For 'done' tab show completed sorted by completedAt; others sorted by createdAt
      const sorted = _filter === 'done'
        ? todos.slice().sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
        : todos.slice().sort((a, b) => b.createdAt - a.createdAt);

      list.innerHTML = sorted.map(renderItem).join('');
      emptyMsg.classList.toggle('hidden', sorted.length > 0);
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

  bindEvents({ onAdd, onToggle, onRemove, onFilterChange, onOrganize }) {
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

    // Shopping list: event delegation
    document.getElementById('shopping-list').addEventListener('click', e => {
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

    // Organize button: removes all completed todos
    document.getElementById('btn-organize').addEventListener('click', onOrganize);

    // Swipe-to-delete on both lists
    setupSwipe('todo-list',     onRemove);
    setupSwipe('shopping-list', onRemove);
  },

  openModal(text, onAdd) {
    const modal        = document.getElementById('modal');
    const deadlineInput = document.getElementById('deadline-input');
    modal.classList.remove('hidden');

    // Reset selections
    document.querySelectorAll('#priority-group .chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('#category-group .chip').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-priority="high"]').classList.add('active');
    document.querySelector('[data-category="work"]').classList.add('active');
    deadlineInput.value = '';
    setModalFieldsDisabled(false);

    const close = () => modal.classList.add('hidden');

    document.getElementById('modal-cancel').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };

    // Priority chip toggles (when not disabled)
    document.getElementById('priority-group').onclick = e => {
      const chip = e.target.closest('.chip');
      if (!chip || chip.disabled) return;
      document.querySelectorAll('#priority-group .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    };

    // Category chip toggles — disable priority & deadline when 買い物
    document.getElementById('category-group').onclick = e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#category-group .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      setModalFieldsDisabled(chip.dataset.category === 'shopping');
    };

    // Open calendar picker directly when date input is clicked
    deadlineInput.onclick = () => {
      if (!deadlineInput.disabled) {
        try { deadlineInput.showPicker(); } catch (_) {}
      }
    };

    document.getElementById('modal-ok').onclick = () => {
      const isShopping = document.querySelector('#category-group .chip.active')?.dataset.category === 'shopping';
      const priority   = isShopping ? null : (document.querySelector('#priority-group .chip.active')?.dataset.priority ?? 'medium');
      const category   = document.querySelector('#category-group .chip.active')?.dataset.category ?? 'other';
      const deadline   = isShopping ? null : (deadlineInput.value || null);
      onAdd({ text, priority, category, deadline });
      ui.clearInput();
      close();
    };
  },
};

function setModalFieldsDisabled(disabled) {
  const priorityGroup = document.getElementById('priority-group');
  const deadlineGroup = document.getElementById('deadline-group');
  priorityGroup.classList.toggle('disabled', disabled);
  deadlineGroup.classList.toggle('disabled', disabled);
  document.querySelectorAll('#priority-group .chip').forEach(c => { c.disabled = disabled; });
  document.getElementById('deadline-input').disabled = disabled;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setupSwipe(listId, onRemove) {
  const list = document.getElementById(listId);
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
    if (Math.abs(dy) > Math.abs(dx)) { activeItem = null; return; }
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
