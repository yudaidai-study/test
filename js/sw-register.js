if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/01_ToDoApp/sw.js', {
      scope: '/01_ToDoApp/',
      updateViaCache: 'none',   // sw.js 自体はHTTPキャッシュを使わず毎回サーバーから取得
    })
    .then(reg => reg.update())  // 起動のたびに更新チェックを強制
    .catch(err => console.warn('Service Worker registration failed:', err));
  });
}
