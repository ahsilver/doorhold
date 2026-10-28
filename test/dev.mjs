
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite';
const SITE = process.argv[2], PORT = +process.argv[3] || 8787, DBF = process.argv[4] || '/tmp/pmdev/dev.db';
fs.mkdirSync((process.env.PMDIR||'/tmp/pmdev')+'/r2', { recursive: true });
fs.copyFileSync(path.join(SITE, '_worker.js'), (process.env.PMDIR||'/tmp/pmdev')+'/worker.mjs');
const worker = (await import((process.env.PMDIR||'/tmp/pmdev')+'/worker.mjs?' + Date.now())).default;
const sq = new DatabaseSync(DBF);
let ROOTS = null; const GLOBALS = new Set(['users', 'sessions', 'orgs', 'sqlite_master', 'sqlite_schema', 'sqlite_sequence', 'sec_events', 'auth_fails', 'mfa_em80', 'mfa_pending', 'trusted_devices', 'pw_resets', 'backups', 'sec_meta', 'staff32', 'mfa32', 'mfa_dev32', 'mfa_ch32', 'dash33', 'fb48']);
function leak(sql, args) {
  const co = globalThis.__PMCO; let ops;
  try { ops = sq.prepare('EXPLAIN ' + sql).all(...args); } catch (e) { return; }
  for (const o of ops) { if (o.opcode !== 'OpenRead' && o.opcode !== 'OpenWrite') continue;
    if (!ROOTS || !ROOTS.has(o.p2)) ROOTS = new Map(sq.prepare('SELECT rootpage, name, tbl_name FROM sqlite_master').all().map(r => [r.rootpage, r.tbl_name]));
    const t = ROOTS.get(o.p2); if (!t || GLOBALS.has(t) || t.startsWith('c' + co + '_')) continue;
    const msg = `LEAK co=${co} table=${t} sql=${sql.slice(0, 300).replace(/\s+/g, ' ')}`; console.error(msg); fs.appendFileSync((process.env.PMDIR || '/tmp/pmdev') + '/leaks.log', msg + '\n'); }
}
const QDMS = +process.env.PM_QDELAY || 0; let INBATCH = false; const QD = () => (QDMS && !INBATCH ? new Promise(r => setTimeout(r, QDMS)) : null);
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; }
  _s() { globalThis.__QN = (globalThis.__QN || 0) + 1; if (process.env.PM_QLOG) { (globalThis.__QS = globalThis.__QS || []).push(this.sql.slice(0, 90).replace(/\s+/g, ' ')); } if (process.env.PM_LEAKCHECK && globalThis.__PMCO > 1) leak(this.sql, this.args); return sq.prepare(this.sql); }
  async all() { await QD(); return { results: this._s().all(...this.args) }; }
  async first() { await QD(); return this._s().get(...this.args) ?? null; }
  async run() { await QD(); const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const DB = { prepare: s => new Stmt(s), async batch(st) { await QD(); sq.exec('BEGIN'); try { const out = []; for (const s of st) { if (/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql)) out.push({ results: s._s().all(...s.args) }); else { const r = s._s().run(...s.args); out.push({ meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }); } } sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } };
const FILES = { async put(k, stream) { const chunks = []; if (stream instanceof Uint8Array || typeof stream === 'string') chunks.push(Buffer.from(stream)); else for await (const c of stream) chunks.push(Buffer.from(c)); fs.writeFileSync((process.env.PMDIR||'/tmp/pmdev')+'/r2/' + k.replace(/\//g, '_'), Buffer.concat(chunks)); },
  async delete(k) { const f = (process.env.PMDIR||'/tmp/pmdev')+'/r2/' + k.replace(/\//g, '_'); try { fs.unlinkSync(f); } catch (e) {} },
  async get(k) { const f = (process.env.PMDIR||'/tmp/pmdev')+'/r2/' + k.replace(/\//g, '_'); if (!fs.existsSync(f)) return null; return { body: fs.readFileSync(f) }; } };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.pdf': 'application/pdf', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.csv': 'text/csv', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.ofx': 'application/x-ofx', '.woff2': 'font/woff2' };
const ASSETS = { async fetch(req) { const u = new URL(req.url); let p = path.join(SITE, u.pathname); if (u.pathname.endsWith('/')) p = path.join(p, 'index.html'); if (!fs.existsSync(p) || path.basename(p).startsWith('_') || p.endsWith('tab-site.json')) p = path.join(SITE, 'index.html'); return new Response(fs.readFileSync(p), { headers: { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' } }); } };
const env = { DB, FILES, ASSETS, ...(process.env.PM_ENV ? JSON.parse(process.env.PM_ENV) : {}) };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = new Request('http://localhost:' + PORT + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body, duplex: 'half' });
  const t0 = Date.now(); globalThis.__QN = 0; globalThis.__QS = [];
  try { const out = await worker.fetch(r, env, { waitUntil: p => Promise.resolve(p).catch(e => console.error('waitUntil', e)) }); if (process.env.PM_QLOG && req.url.startsWith('/api/')) { const agg = {}; for (const s of globalThis.__QS) agg[s] = (agg[s] || 0) + 1; console.log('REQ', req.method, req.url, Date.now() - t0, 'ms', globalThis.__QN, 'queries', JSON.stringify(Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 12))); } const h = {}; out.headers.forEach((v, k) => { h[k] = v; }); { const sc = out.headers.getSetCookie ? out.headers.getSetCookie() : []; if (sc.length > 1) h['set-cookie'] = sc; } res.writeHead(out.status, h); res.end(Buffer.from(await out.arrayBuffer())); }
  catch (e) { console.error(e); res.writeHead(500); res.end(String(e)); }
}).listen(PORT, () => console.log('dev on', PORT));
