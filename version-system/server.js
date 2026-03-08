require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// CORS - permitir frontend local y GitHub Pages
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://angelqt01.github.io',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  methods: ['GET'],
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Ruta de version.json (en la raíz del proyecto)
const VERSION_FILE = path.join(__dirname, '..', 'version.json');

// ─── GET /api/version/check ────────────────────────────────────────────────
// Devuelve la versión actual desde version.json
app.get('/api/version/check', (req, res) => {
  try {
    if (!fs.existsSync(VERSION_FILE)) {
      return res.status(404).json({ error: 'version.json no encontrado' });
    }
    const data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    res.json({
      version: data.version,
      name: data.name,
      buildDate: data.buildDate,
      environment: data.environment || 'production'
    });
  } catch (err) {
    console.error('Error leyendo version.json:', err.message);
    res.status(500).json({ error: 'Error interno al leer la versión' });
  }
});

// ─── GET /api/version/history ─────────────────────────────────────────────
// Devuelve el historial de versiones desde Supabase
app.get('/api/version/history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  try {
    const { data, error } = await supabase
      .from('version_history')
      .select('id, version, name, description, build_date, commit_hash, created_at')
      .order('build_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ history: data || [], total: data?.length || 0 });
  } catch (err) {
    console.error('Error obteniendo historial:', err.message);
    res.status(500).json({ error: 'Error al obtener historial de versiones' });
  }
});

// ─── GET /api/version/latest ──────────────────────────────────────────────
// Devuelve la versión más reciente del historial
app.get('/api/version/latest', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('version_history')
      .select('version, name, description, build_date')
      .order('build_date', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error obteniendo última versión:', err.message);
    res.status(500).json({ error: 'Error al obtener la última versión' });
  }
});

// ─── Healthcheck ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Version API escuchando en http://localhost:${PORT}`);
  console.log(`   GET /api/version/check`);
  console.log(`   GET /api/version/history?limit=10`);
  console.log(`   GET /api/version/latest`);
});
