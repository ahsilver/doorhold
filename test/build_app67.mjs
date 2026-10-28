// Stamp the mobile app (site/app) with a content hash so phones pick up a new version: node test/build_app67.mjs
// Writes ?v=<hash> into site/app/index.html and VERSION into site/app/sw.js (the service worker drops the old cache on activate).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const D = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'site', 'app');
const h = crypto.createHash('sha1'); for (const f of ['app.js', 'app.css', 'manifest.webmanifest']) h.update(fs.readFileSync(path.join(D, f))); const V = h.digest('hex').slice(0, 10);
const ix = path.join(D, 'index.html'); fs.writeFileSync(ix, fs.readFileSync(ix, 'utf8').replace(/(\/app\/app\.(?:js|css)\?v=)[\w_]+/g, '$1' + V));
const sw = path.join(D, 'sw.js'); fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${V}';`));
console.log(JSON.stringify({ app_version: V }));
