import { store } from './store.js';
import { ui }    from './ui.js';

let currentFilter = 'all';

function refresh() {
  ui.render(store.getFiltered(currentFilter));
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
    onFilterChange(filter) {
      currentFilter = filter;
      ui.setFilter(filter);
      refresh();
    },
    onOrganize() {
      store.removeCompleted();
      refresh();
    },
  });
});
