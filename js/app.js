import { store } from './store.js';
import { ui }    from './ui.js';

let currentFilter     = 'personal';
let currentPriorities = ['high', 'medium'];

function refresh() {
  let todos = store.getFiltered(currentFilter);
  todos = todos.filter(t => currentPriorities.includes(t.priority));
  ui.render(todos, currentFilter);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!store.isStorageAvailable()) {
    ui.showBanner('プライベートモードのためデータは保存されません');
  }

  ui.setFilter(currentFilter);
  refresh();

  ui.bindEvents({
    onAdd({ text, priority, category, dueDate }) {
      store.add({ text, priority, category, dueDate });
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
    onPriorityFilterChange(priorities) {
      currentPriorities = priorities;
      refresh();
    },
  });
});
