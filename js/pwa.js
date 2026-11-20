import { APP_VERSION } from './config.js';

function compareVersions(a, b) {
  const pa = String(a).replace(/^v/i, '').split('.').map(Number);
  const pb = String(b).replace(/^v/i, '').split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}

export function initPWA({ installBtn, updateBtn, iosModal, toast }) {
  let deferredPrompt = null;
  let swReg = null;
  let latestVersion = null;
  let hasUpdate = false;
  let checking = false;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isStandalone = () =>
    (window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  function renderInstallBtn() {
    if (!installBtn) return;
    installBtn.hidden = isStandalone() || !(deferredPrompt || isIOS);
  }

  function renderUpdateBtn(statusText = null) {
    if (!updateBtn) return;
    updateBtn.classList.toggle('has-update', hasUpdate);
    if (statusText) {
      updateBtn.textContent = statusText;
    } else if (hasUpdate && latestVersion) {
      updateBtn.textContent = `↻ Update v${APP_VERSION} → v${latestVersion}`;
    } else {
      updateBtn.textContent = `v${APP_VERSION} • Update`;
    }
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    renderInstallBtn();
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        renderInstallBtn();
      } else if (isIOS && iosModal) {
        iosModal.classList.add('open');
      } else {
        toast('Look for "Install app" in your browser menu!');
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    renderInstallBtn();
    toast('Added to your tablet! 🎉');
  });

  async function fetchLiveVersion() {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.version;
  }

  async function applyUpdate() {
    renderUpdateBtn('↻ Updating…');
    try {
      if (swReg) {
        await swReg.update();
        const installing = swReg.installing;
        if (installing) {
          await new Promise((resolve) => {
            const done = () => resolve();
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' || installing.state === 'activated' || installing.state === 'redundant') {
                done();
              }
            });
            setTimeout(done, 4000);
          });
        }
        if (swReg.waiting) {
          swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Fall through to reload
    }
    window.location.reload();
  }

  async function checkForUpdates(silent = false) {
    if (checking) return;
    if (hasUpdate && !silent) {
      await applyUpdate();
      return;
    }

    checking = true;
    if (!silent) renderUpdateBtn(`v${APP_VERSION} • Checking…`);

    try {
      const live = await fetchLiveVersion();
      latestVersion = live;
      if (swReg) {
        swReg.update().catch(() => {});
      }
      if (compareVersions(live, APP_VERSION) > 0) {
        hasUpdate = true;
        renderUpdateBtn();
        if (!silent) {
          toast(`New version v${live} found! Tap again to update ✨`);
        }
      } else {
        hasUpdate = false;
        renderUpdateBtn(`v${APP_VERSION} • Latest ✓`);
        if (!silent) {
          toast(`You're on the latest version (v${APP_VERSION}) ✓`);
        }
      }
    } catch {
      renderUpdateBtn(`v${APP_VERSION} • Offline`);
      if (!silent) {
        toast(`Offline — running v${APP_VERSION}`);
      }
    } finally {
      checking = false;
    }
  }

  if (updateBtn) {
    updateBtn.addEventListener('click', () => checkForUpdates(false));
  }

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        swReg = await navigator.serviceWorker.register('./sw.js');
        swReg.addEventListener('updatefound', () => {
          const nw = swReg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              hasUpdate = true;
              renderUpdateBtn();
            }
          });
        });
      } catch {
        // SW unavailable (e.g. file://)
      }
      checkForUpdates(true);
    });
  } else {
    checkForUpdates(true);
  }

  renderInstallBtn();
  renderUpdateBtn();
}
