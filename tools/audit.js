'use strict';
/* Loads each page at 15 viewports and reports horizontal overflow, elements
   wider than the screen, whether the cover fits one screen, and which
   navigation is showing. Serve the site first, then:

     node tools/audit.js http://127.0.0.1:5500/ http://127.0.0.1:5500/hu/

   Set CHROME if the browser lives elsewhere. */
const { spawn } = require('child_process');
const path = require('path');

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const profile = path.join(__dirname, '..', '.audit-profile');

const VIEWPORTS = [
  { w: 2560, h: 1440 }, { w: 1920, h: 1080 }, { w: 1536, h: 730 },
  { w: 1440, h: 900 }, { w: 1280, h: 620 }, { w: 1100, h: 800 },
  { w: 1024, h: 768 }, { w: 900, h: 700 }, { w: 820, h: 900 },
  { w: 768, h: 1024, m: true }, { w: 600, h: 900, m: true },
  { w: 430, h: 932, m: true }, { w: 390, h: 844, m: true },
  { w: 360, h: 640, m: true }, { w: 320, h: 568, m: true },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForChrome() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
    await sleep(250);
  }
  throw new Error('chrome did not start');
}

function cdp(ws) {
  let id = 0; const pending = new Map(); const listeners = [];
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result); }
    else if (msg.method) listeners.forEach(l => l(msg));
  });
  return {
    send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }),
    once: method => new Promise(res => listeners.push(m => { if (m.method === method) res(m.params); })),
  };
}

const PROBE = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const doc = document.documentElement;
  const wide = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || el.closest('dialog') || r.right < 0) return;   // the skip link parks off-screen left
    if (r.right > vw + 1) {
      const wrap = el.closest('.table-wrap');
      if (wrap && wrap !== el) return;                    // tables scroll on purpose
      wide.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : '') + ' ' + Math.round(r.left) + '→' + Math.round(r.right));
    }
  });
  const scroller = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.scrollWidth > el.clientWidth + 1 && !el.classList.contains('table-wrap') && el.tagName !== 'HTML') {
      scroller.push(el.tagName.toLowerCase() + '.' + String(el.className || '').trim().split(/\\s+/).join('.'));
    }
  });
  const cover = document.querySelector('.cover');
  const bottom = document.querySelector('.cover-bottom');
  const index = document.querySelector('.index');
  const pill = document.querySelector('.pill');
  const vis = el => el && getComputedStyle(el).display !== 'none';
  return {
    hOverflow: doc.scrollWidth - vw,
    wide: wide.slice(0, 6),
    scrollers: [...new Set(scroller)].slice(0, 5),
    coverH: cover ? Math.round(cover.getBoundingClientRect().height) : null,
    coverFits: cover ? Math.round(cover.getBoundingClientRect().height) <= vh + 1 : null,
    bottomVisible: bottom ? Math.round(bottom.getBoundingClientRect().bottom) <= vh + 1 : null,
    nav: (vis(index) ? 'index' : '') + (vis(pill) ? (vis(index) ? '+pill' : 'pill') : '') || 'none',
    vh,
  };
})()`;

async function run(url) {
  console.log('\\n== ' + url);
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  const c = cdp(ws);
  await c.send('Page.enable');
  for (const v of VIEWPORTS) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: 1, mobile: !!v.m });
    const loaded = c.once('Page.loadEventFired');
    await c.send('Page.navigate', { url });
    await loaded;
    await c.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>1)', awaitPromise: true });
    await sleep(250);
    const { result } = await c.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const r = result.value;
    const flags = [];
    if (r.hOverflow > 0) flags.push(`H-OVERFLOW ${r.hOverflow}px`);
    if (r.wide.length) flags.push('wide: ' + r.wide.join(' | '));
    if (r.scrollers.length) flags.push('scrolls: ' + r.scrollers.join(', '));
    if (r.coverFits === false) flags.push(`cover ${r.coverH}px > ${r.vh}px`);
    if (r.bottomVisible === false) flags.push('BOTTOM ROW BELOW FOLD');
    console.log(`${String(v.w).padStart(4)}x${String(v.h).padEnd(5)} ${r.nav.padEnd(10)} ${flags.length ? flags.join('; ') : 'ok'}`);
  }
  ws.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`);
}

(async () => {
  const chrome = spawn(CHROME, [`--headless=new`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  try {
    await waitForChrome();
    for (const url of process.argv.slice(2)) await run(url);
  } finally { chrome.kill(); }
})();
