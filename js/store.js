const STORAGE_KEY = 'todo-app-v2';

let _mem = null;

function isAvailable() {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return true;
  } catch {
    return false;
  }
}

const available = isAvailable();

function load() {
  if (!available) return _mem ?? [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function persist(todos) {
  if (!available) { _mem = todos; return; }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    _mem = todos;
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 'soon'→3日後, 'week'→7日後, 'month'→30日後 の実日付(YYYY-MM-DD)を返す
function computeSortDate(deadline, baseTs) {
  const offsets = { soon: 3, days3: 3, week: 7, month: 30, today: 3, later: 30 };
  const days = offsets[deadline];
  if (days == null) return null;
  return new Date(baseTs + days * 86400000).toISOString().slice(0, 10);
}

export const store = {
  isStorageAvailable: () => available,

  getAll() { return load(); },

  add({ text, priority = 'medium', category = 'personal', deadline = null }) {
    const todos = load();
    const createdAt = Date.now();
    const todo = {
      id: makeId(),
      text,
      completed: false,
      pendingComplete: false,
      priority,
      category,
      deadline,
      deadlineSortDate: computeSortDate(deadline, createdAt),
      createdAt,
      completedAt: null,
    };
    todos.push(todo);
    persist(todos);
    return todo;
  },

  update(id, changes) {
    const todos = load().map(t => {
      if (t.id !== id) return t;
      const merged = { ...t, ...changes };
      if ('deadline' in changes) {
        merged.deadlineSortDate = computeSortDate(changes.deadline, t.createdAt);
      }
      return merged;
    });
    persist(todos);
    return todos;
  },

  toggle(id) {
    const todos = load().map(t => {
      if (t.id !== id) return t;
      if (t.completed) {
        return { ...t, completed: false, pendingComplete: false, completedAt: null };
      }
      return { ...t, pendingComplete: !t.pendingComplete };
    });
    persist(todos);
    return todos;
  },

  organizeCompleted() {
    const now = Date.now();
    const todos = load().map(t =>
      t.pendingComplete
        ? { ...t, completed: true, pendingComplete: false, completedAt: now }
        : t
    );
    persist(todos);
    return todos;
  },

  remove(id) {
    const todos = load().filter(t => t.id !== id);
    persist(todos);
    return todos;
  },

  getFiltered(filter) {
    const all = load();
    if (filter === 'all')       return all.filter(t => !t.completed);
    if (filter === 'completed') return all.filter(t =>  t.completed);
    if (filter === 'shopping')  return all.filter(t => !t.completed && t.category === 'shopping');
    return all.filter(t => !t.completed && t.category === filter);
  },

  getPendingCount() {
    return load().filter(t => t.pendingComplete && !t.completed).length;
  },

  clearCompleted() {
    const todos = load().filter(t => !t.completed);
    persist(todos);
    return todos;
  },
};
