const STORAGE_KEY = 'todo-app-v1';

let _mem = null; // fallback when localStorage is unavailable

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
  if (!available) {
    _mem = todos;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    _mem = todos; // storage full — keep in memory
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const store = {
  isStorageAvailable: () => available,

  getAll() { return load(); },

  add({ text, priority = 'medium', category = 'other' }) {
    const todos = load();
    const todo = {
      id: makeId(),
      text,
      completed: false,
      priority,
      category,
      createdAt: Date.now(),
      completedAt: null,
    };
    todos.push(todo);
    persist(todos);
    return todo;
  },

  toggle(id) {
    const todos = load().map(t =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null }
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
    if (filter === 'all')     return all;
    if (filter === 'history') return all.filter(t => t.completed);
    return all.filter(t => t.category === filter);
  },

  clearCompleted() {
    const todos = load().filter(t => !t.completed);
    persist(todos);
    return todos;
  },
};
