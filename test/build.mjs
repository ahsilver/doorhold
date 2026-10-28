// Build the served bundle: node test/build.mjs   (run after every change to site/app.js or site/app.css, before publishing)
// site/app.js + site/app.css stay readable (edit those). This writes site/app.min.js + site/app.min.css and points index.html at them
// with a content-hash ?v= so browsers can keep them forever (see site/_headers) and still get every new version.
// esbuild: /tmp/esb/node_modules/.bin/esbuild (npm i esbuild in /tmp/esb if missing); without it the files are copied unminified.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
const SITE = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'site');
const ESB = ['/tmp/esb/node_modules/.bin/esbuild', process.env.ESBUILD].find(p => p && fs.existsSync(p));
const out = {};
// one build id for app + server: hash of the readable sources
const BUILD = crypto.createHash('sha1').update(fs.readFileSync(path.join(SITE, 'app.js'))).update(fs.readFileSync(path.join(SITE, 'app.css'))).digest('hex').slice(0, 10);
for (const [src, dst, loader] of [['app.js', 'app.min.js', 'js'], ['app.css', 'app.min.css', 'css']]) {
  const inp = path.join(SITE, src), o = path.join(SITE, dst);
  if (ESB) execFileSync(ESB, [inp, '--minify', `--loader:.${loader}=${loader}`, '--target=es2020,safari14', '--legal-comments=none', '--log-level=warning', '--outfile=' + o], { stdio: 'inherit', timeout: 120000 });
  else fs.copyFileSync(inp, o);
  if (dst === 'app.min.js') { const t = fs.readFileSync(o, 'utf8'); if (!t.includes('__PM_BUILD__')) throw new Error('build id placeholder missing in app.min.js'); fs.writeFileSync(o, t.split('__PM_BUILD__').join(BUILD)); }
  out[dst] = crypto.createHash('sha1').update(fs.readFileSync(o)).digest('hex').slice(0, 10);
}
let ix = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
ix = ix.replace(/\/app(?:\.min)?\.css\?v=[\w-]+/, '/app.min.css?v=' + out['app.min.css']).replace(/\/app(?:\.min)?\.js\?v=[\w-]+/, '/app.min.js?v=' + out['app.min.js']);
fs.writeFileSync(path.join(SITE, 'index.html'), ix);
const wf = path.join(SITE, '_worker.js'); const wt = fs.readFileSync(wf, 'utf8'); if (!/const PM_BUILD = '[^']*';/.test(wt)) throw new Error('PM_BUILD line missing in _worker.js'); fs.writeFileSync(wf, wt.replace(/const PM_BUILD = '[^']*';/, `const PM_BUILD = '${BUILD}';`)); 
console.log(JSON.stringify({ build: BUILD, minified: !!ESB, ...Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v + ' ' + fs.statSync(path.join(SITE, k)).size + ' bytes'])) }));
