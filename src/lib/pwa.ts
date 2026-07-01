export function registerPwa() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

  let refreshing = false;
  const hasActiveController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hasActiveController) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      window.setInterval(() => void registration.update(), 60 * 60 * 1000);
    });
  });
}
