import { store } from './store.js';
import { ui }    from './ui.js';

let currentFilter     = 'personal';
let currentPriorities = ['high', 'medium'];

function refresh() {
  const all = store.getFiltered(currentFilter);
  let filtered;
  if (currentFilter === 'shopping') {
    filtered = all;
  } else if (currentFilter === 'all') {
    filtered = all.filter(t => t.category === 'shopping' || currentPriorities.includes(t.priority));
  } else {
    filtered = all.filter(t => currentPriorities.includes(t.priority));
  }
  ui.render(filtered, store.getPendingCount());
}

function updateHeaderDate() {
  const el = document.getElementById('header-date');
  if (!el) return;
  const d    = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  el.textContent = `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!store.isStorageAvailable()) {
    ui.showBanner('プライベートモードのためデータは保存されません');
  }

  updateHeaderDate();
  ui.setFilter(currentFilter);
  refresh();

  ui.bindEvents({
    onAdd({ text, priority, category, deadline }) {
      store.add({ text, priority, category, deadline });
      refresh();
    },
    onToggle(id) {
      store.toggle(id);
      refresh();
    },
    onRemove(id) {
      store.remove(id);
      refresh();
    },
    onOrganize() {
      store.organizeCompleted();
      refresh();
    },
    onEdit(id) {
      const todo = store.getAll().find(t => t.id === id);
      if (!todo) return;
      ui.openModal({ mode: 'edit', ...todo }, ({ text, priority, category, deadline }) => {
        store.update(id, { text, priority, category, deadline });
        refresh();
      });
    },
    onFilterChange(filter) {
      currentFilter = filter;
      ui.setFilter(filter);
      refresh();
    },
    onClearHistory() {
      store.clearCompleted();
      refresh();
    },
    onPriorityFilterChange(priorities) {
      currentPriorities = priorities;
      refresh();
    },
  });
});
