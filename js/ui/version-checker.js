/**
 * version-checker.js
 * Verificador automático de versiones en el cliente.
 * Muestra una notificación cuando hay una nueva versión disponible.
 *
 * Modo estático (producción/GitHub Pages): lee version.json directamente.
 * Modo API (desarrollo local): consulta el servidor Express.
 */
class VersionChecker {
  constructor(options = {}) {
    this.options = {
      checkInterval: options.checkInterval || 5 * 60 * 1000, // 5 minutos
      versionFileUrl: options.versionFileUrl || './version.json',
      apiEndpoint: options.apiEndpoint || null, // null = modo estático
      autoReload: options.autoReload !== false,
      showNotification: options.showNotification !== false,
      debug: options.debug || false
    };

    this._lastKnownVersion = null;
    this._intervalId = null;
    this._notificationShown = false;
  }

  _log(...args) {
    if (this.options.debug) console.log('[VersionChecker]', ...args);
  }

  async _fetchVersion() {
    const url = this.options.apiEndpoint || (this.options.versionFileUrl + '?t=' + Date.now());
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async _check() {
    try {
      const data = await this._fetchVersion();
      const remoteVersion = data.version;

      if (!remoteVersion) return;

      if (!this._lastKnownVersion) {
        this._lastKnownVersion = remoteVersion;
        this._log(`Versión inicial detectada: ${remoteVersion}`);
        return;
      }

      if (remoteVersion !== this._lastKnownVersion && !this._notificationShown) {
        this._log(`Nueva versión detectada: ${this._lastKnownVersion} → ${remoteVersion}`);
        this._notificationShown = true;
        if (this.options.showNotification) {
          this._showUpdateBanner(remoteVersion, data.description || '');
        }
      }
    } catch (err) {
      this._log('Error al verificar versión:', err.message);
    }
  }

  _showUpdateBanner(version, description) {
    // Eliminar banner previo si existe
    const prev = document.getElementById('version-update-banner');
    if (prev) prev.remove();

    const banner = document.createElement('div');
    banner.id = 'version-update-banner';
    banner.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      background: #1e40af; color: #fff; border-radius: 12px;
      padding: 16px 20px; max-width: 340px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5;
      animation: slideInBanner 0.3s ease;
    `;

    const descText = description ? `<p style="margin:4px 0 0;opacity:.85;font-size:12px;">${description}</p>` : '';

    banner.innerHTML = `
      <style>
        @keyframes slideInBanner {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      </style>
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <span style="font-size:22px;">🔄</span>
        <div style="flex:1;">
          <strong>Nueva versión disponible</strong>
          <p style="margin:2px 0 0;opacity:.9;">v${version} lista para cargar.</p>
          ${descText}
        </div>
        <button id="vc-close" style="
          background:none;border:none;color:#93c5fd;cursor:pointer;
          font-size:18px;line-height:1;padding:0;margin-left:4px;
        " title="Cerrar">✕</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="vc-reload" style="
          flex:1;background:#3b82f6;color:#fff;border:none;border-radius:8px;
          padding:8px 12px;cursor:pointer;font-size:13px;font-weight:600;
        ">Actualizar ahora</button>
        <button id="vc-dismiss" style="
          flex:1;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:8px;
          padding:8px 12px;cursor:pointer;font-size:13px;
        ">Más tarde</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('vc-reload').addEventListener('click', () => {
      banner.remove();
      window.location.reload(true);
    });

    document.getElementById('vc-dismiss').addEventListener('click', () => {
      banner.remove();
    });

    document.getElementById('vc-close').addEventListener('click', () => {
      banner.remove();
    });
  }

  start() {
    this._log('Iniciando verificador de versiones...');
    this._check(); // Verificación inicial
    this._intervalId = setInterval(() => this._check(), this.options.checkInterval);
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }
}

// ─── Inicialización automática ───────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    window.versionChecker = new VersionChecker({
      // En localhost usa la API; en producción usa el archivo estático
      apiEndpoint: isLocalhost ? 'http://localhost:3000/api/version/check' : null,
      versionFileUrl: './version.json',
      checkInterval: 5 * 60 * 1000,
      autoReload: true,
      showNotification: true,
      debug: isLocalhost
    });

    window.versionChecker.start();
  });
}
