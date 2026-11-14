// Leaguepedia Cargo API 헬퍼: 디스크 캐시 + 속도 제한 재시도
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(__dirname, 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const API = 'https://lol.fandom.com/api.php';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;
let delay = 2500;

async function rawQuery(params) {
  const qs = new URLSearchParams({ action: 'cargoquery', format: 'json', ...params });
  const key = crypto.createHash('sha1').update(qs.toString()).digest('hex');
  const file = path.join(CACHE_DIR, key + '.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let attempt = 0; attempt < 12; attempt++) {
    const wait = lastCall + delay - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    let json;
    try {
      const res = await fetch(API + '?' + qs.toString(), {
        headers: { 'User-Agent': 'esports-manager-data-fetch/0.1 (personal hobby project)' },
      });
      json = await res.json();
    } catch (e) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (json.error) {
      if (json.error.code === 'ratelimited') {
        delay = Math.min(delay + 500, 6000);
        const w = 20000 + attempt * 15000;
        process.stderr.write(`  [ratelimited] ${w / 1000}s 대기\n`);
        await sleep(w);
        continue;
      }
      throw new Error(JSON.stringify(json.error) + ' :: ' + qs.toString());
    }
    const rows = (json.cargoquery || []).map((r) => r.title);
    fs.writeFileSync(file, JSON.stringify(rows));
    return rows;
  }
  throw new Error('재시도 한도 초과: ' + qs.toString());
}

/** 모든 페이지를 가져온다 (500행 단위). */
export async function cargo({ tables, fields, where, join_on, group_by, order_by }) {
  const out = [];
  for (let offset = 0; ; offset += 500) {
    const p = { tables, fields, limit: '500', offset: String(offset) };
    if (where) p.where = where;
    if (join_on) p.join_on = join_on;
    if (group_by) p.group_by = group_by;
    if (order_by) p.order_by = order_by;
    const rows = await rawQuery(p);
    out.push(...rows);
    if (rows.length < 500) break;
  }
  return out;
}

export const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
export const inList = (arr) => '(' + arr.map(q).join(',') + ')';
export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
