if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/test/sw.js', { scope: '/test/' })
      .catch(err => console.warn('Service Worker registration failed:', err));
  });
}
