/**
 * version-manager.js
 * Módulo frontend para obtener la versión actual e historial desde Supabase.
 * Usa el cliente Supabase ya cargado globalmente en la app.
 */

const VERSION_FILE_URL = './version.json';
const SUPABASE_URL = 'https://otoxbmdzhqtrdvigoxfn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90b3hibWR6aHF0cmR2aWdveGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNTQxMjQsImV4cCI6MjA1NDkzMDEyNH0.tFb2VQ-Y-3nfBmELpeVTch20oHUvDDAknHTaWQhd0kk';

class VersionManager {
  constructor() {
    this._supabase = null;
    this._currentVersion = null;
  }

  _getSupabase() {
    if (this._supabase) return this._supabase;
    const createClientFn = window.supabase?.createClient || window.createClient;
    if (!createClientFn) throw new Error('Cliente Supabase no disponible');
    this._supabase = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
    return this._supabase;
  }

  /**
   * Obtiene la versión actual desde version.json (estático, sin servidor).
   * @returns {Promise<Object>} Datos de versión
   */
  async getCurrentVersion() {
    if (this._currentVersion) return this._currentVersion;
    try {
      const res = await fetch(VERSION_FILE_URL + '?t=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._currentVersion = await res.json();
      return this._currentVersion;
    } catch (err) {
      console.warn('⚠️ version-manager: No se pudo leer version.json:', err.message);
      return null;
    }
  }

  /**
   * Obtiene el historial de versiones desde Supabase.
   * @param {number} limit - Número máximo de registros
   * @returns {Promise<Array>}
   */
  async getVersionHistory(limit = 10) {
    try {
      const client = this._getSupabase();
      const { data, error } = await client
        .from('version_history')
        .select('id, version, name, description, build_date, commit_hash, created_at')
        .order('build_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('⚠️ version-manager: No se pudo obtener historial:', err.message);
      return [];
    }
  }

  /**
   * Compara la versión local con la más reciente en Supabase.
   * @returns {Promise<{hasUpdate: boolean, current: string, latest: string}>}
   */
  async checkForUpdates() {
    const [current, history] = await Promise.all([
      this.getCurrentVersion(),
      this.getVersionHistory(1)
    ]);

    if (!current || !history.length) {
      return { hasUpdate: false, current: current?.version || '0.0.0', latest: null };
    }

    const latest = history[0].version;
    const hasUpdate = latest !== current.version;

    return { hasUpdate, current: current.version, latest };
  }
}

export const versionManager = new VersionManager();
