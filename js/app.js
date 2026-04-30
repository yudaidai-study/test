import { store } from './store.js';
import { ui }    from './ui.js';

let currentFilter = 'all';

function refresh() {
  ui.render(store.getFiltered(currentFilter), store.getPendingCount());
}

document.addEventListener('DOMContentLoaded', () => {
  if (!store.isStorageAvailable()) {
    ui.showBanner('プライベートモードのためデータは保存されません');
  }

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
  });
});
