'use strict';

const app = document.getElementById('app');
let DATA = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const SWIRL = { allowed: 'swirl ดริปเปอร์ท้ายเบาๆ', forbidden: 'ห้าม swirl ดริปเปอร์' };
const SERVE = { iced: 'เย็น', hot: 'ร้อน' };
const SERVE_ORDER = ['iced', 'hot'];
const TUNE_HREF = '#/tune';
const WATER_HREF = '#/water';
const LAST_KEY = 'coffee-recipes:last';

const set = (id) => DATA.sets.find((s) => s.id === id);
const recipesOf = (setId) => DATA.recipes
  .filter((r) => r.set === setId)
  .sort((a, b) => SERVE_ORDER.indexOf(a.serve) - SERVE_ORDER.indexOf(b.serve));
const recipeHref = (r) => `#/set/${encodeURIComponent(r.set)}/${encodeURIComponent(r.serve)}`;

// iced recipes count the ice in the server as part of the water
const totalWater = (r) => r.water_g + (r.ice_g || 0);
const ratioText = (r) => `1:${Math.round((totalWater(r) / r.dose_g) * 10) / 10}`;

// remember the last set/serve so each home opens on its own gear
function loadLast() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY)) || {}; } catch { return {}; }
}
function saveLast(r) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ set: r.set, serve: r.serve })); } catch { /* storage off */ }
}

/* ---------- Recipe page ---------- */

function spec(label, value, unit) {
  return `<div class="spec"><div class="v">${esc(value)}<small>${esc(unit)}</small></div><div class="k">${esc(label)}</div></div>`;
}

function pourList(r) {
  // phase headers only for 4:6 (first 40 % = sweet/sour, rest = strength)
  const phase1 = r.phase1_pours || 0;
  const phase1G = r.pours.slice(0, phase1).reduce((s, p) => s + p.g, 0);
  let cum = 0;

  const rows = r.pours.map((p, i) => {
    cum += p.g;
    const head = !phase1 ? ''
      : i === 0
        ? `<li class="phase">Phase 1<span>${phase1G} g · ปรับเปรี้ยว / หวาน</span></li>`
        : i === phase1
          ? `<li class="phase">Phase 2<span>${r.water_g - phase1G} g · ปรับความเข้ม</span></li>`
          : '';
    return `${head}
      <li class="pour">
        <span class="n">${i + 1}</span>
        <div><div class="cum">${cum}<small>g</small></div><div class="add">เท +${p.g} g</div></div>
        <div class="at">${p.at ? esc(p.at) : ''}</div>
        ${p.note ? `<p class="do">${esc(p.note)}</p>` : ''}
      </li>`;
  }).join('');

  const end = r.time || r.finish_note
    ? `<li class="pour end">
        <span class="n">✓</span>
        <div><div class="add">น้ำไหลหมด</div></div>
        <div class="at">${r.time ? `${esc(r.time.min)}–${esc(r.time.max)}` : ''}</div>
        ${r.finish_note ? `<p class="do">${esc(r.finish_note)}</p>` : ''}
      </li>`
    : '';

  return `
    <section>
      <h2 class="section-title">ลำดับการเท <small>${esc(r.method)} · อ่านเลขบนตาชั่ง</small></h2>
      ${r.prep_note ? `<p class="prep">${esc(r.prep_note)}</p>` : ''}
      <ol class="pours">${rows}${end}</ol>
      <p class="hint">เทรอบถัดไปตามเวลา · น้ำรอบก่อนควรเกือบลงหมด</p>
    </section>`;
}

function whyBox(r) {
  if (!r.why || !r.why.length) return '';
  return `
    <details class="box">
      <summary>ทำไมสูตรนี้</summary>
      <ul class="why">${r.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
    </details>`;
}

function gearBox(s) {
  return `
    <section class="box">
      <h2>อุปกรณ์${esc(s.name)}</h2>
      <dl class="facts">
        <dt>ดริปเปอร์</dt><dd>${esc(s.dripper)}</dd>
        <dt>เครื่องบด</dt><dd>${esc(s.grinder)}</dd>
        <dt>น้ำชง</dt><dd>${esc(s.water)}${s.water_alt ? `<br><span class="meta">${esc(s.water_alt)}</span>` : ''}${DATA.water && DATA.water.set === s.id ? `<br><a class="inline-link" href="${WATER_HREF}">สูตรน้ำและจูนน้ำ →</a>` : ''}</dd>
        <dt>น้ำแข็ง</dt><dd>${esc(s.ice)}</dd>
      </dl>
    </section>`;
}

function recipeBody(s, r) {
  const dial = s.grind_step > 1 ? `<span class="chip">หน้าปัด ${(r.grind.clicks / 10).toFixed(1)}</span>` : '';
  const chips = [
    r.ice_g ? `<span class="chip">อัตราส่วนรวมน้ำแข็ง ${ratioText(r)}</span>` : '',
    dial,
    r.swirl && SWIRL[r.swirl] ? `<span class="chip${r.swirl === 'forbidden' ? ' strong' : ''}">${SWIRL[r.swirl]}</span>` : '',
  ].join('');

  return `
    <div class="recipe">
      <div class="col">
        <div class="specs">
          ${spec('ถั่ว', r.dose_g, 'g')}
          ${r.ice_g
            ? spec(`น้ำร้อน · +น้ำแข็ง ${r.ice_g} g`, r.water_g, 'g')
            : spec(`น้ำ · ${ratioText(r)}`, r.water_g, 'g')}
          ${spec('อุณหภูมิ', r.temp_c, '°C')}
          ${spec(s.grinder, r.grind.clicks, 'คลิก')}
        </div>
        <div class="chips">${chips}</div>
        ${pourList(r)}
      </div>
      <div class="col">
        <a class="box tune-cta" href="${TUNE_HREF}">รสยังไม่ตรงใจ? <b>ปรับรสเอง →</b></a>
        ${whyBox(r)}
        ${gearBox(s)}
      </div>
    </div>`;
}

function renderRecipe(setId, serve) {
  const last = loadLast();
  const s = set(setId) || set(last.set) || DATA.sets[0];
  const list = recipesOf(s.id);
  const r = list.find((x) => x.serve === (serve || last.serve)) || list[0];
  if (!r) {
    app.innerHTML = '<section class="box"><h2>ชุดนี้ยังไม่มีสูตร</h2></section>';
    return;
  }
  saveLast(r);

  // row 1: gear set (keep the same serve when switching) · row 2: iced / hot
  const setTabs = DATA.sets.map((x) => {
    const target = recipesOf(x.id).find((y) => y.serve === r.serve) || recipesOf(x.id)[0];
    if (!target) return '';
    const current = x.id === s.id ? ' aria-current="page"' : '';
    return `<a class="tab" href="${recipeHref(target)}"${current}>${esc(x.name)}</a>`;
  }).join('');
  const serveTabs = list.map((x) => {
    const current = x.id === r.id ? ' aria-current="page"' : '';
    return `<a class="tab serve" href="${recipeHref(x)}"${current}>${esc(SERVE[x.serve] || x.serve)}</a>`;
  }).join('');

  document.title = `${s.name} ${SERVE[r.serve] || ''} · สูตรกาแฟ`;
  app.innerHTML = `
    <header class="bean-head">
      <p class="eyebrow">${esc(s.dripper)} · ${esc(s.grinder)}</p>
      <h1>${esc(s.name)} · ${esc(SERVE[r.serve] || '')}</h1>
      <p class="lede">สูตรกลางสำหรับทุกเมล็ด · จูนต่อด้วยหน้าปรับรสเอง</p>
    </header>
    <div class="tab-rows">
      <nav class="tabs" aria-label="ชุดอุปกรณ์"><span class="tabs-label">ชุด</span>${setTabs}</nav>
      <nav class="tabs" aria-label="เย็นหรือร้อน"><span class="tabs-label">เสิร์ฟ</span>${serveTabs}</nav>
    </div>
    ${recipeBody(s, r)}`;
}

/* ---------- Tuning guide: "want X → adjust Y" ---------- */

const KNOB = { grind: '⚙️', temp: '🌡️', water: '💧', pour: '🫗', aura: '🫧', a: '🧪' };

const tuneText = (s) => esc(String(s ?? '').replaceAll('{grind}', '1 ขั้น'));

function tuneCard(t) {
  return `
    <article class="tune">
      <h3>${esc(t.goal)}</h3>
      <p class="move"><span class="knob" aria-hidden="true">${KNOB[t.knob] || ''}</span>${esc(t.move)} <b>${tuneText(t.step)}</b></p>
      <dl>
        ${t.where ? `<dt>เทตรงไหน</dt><dd>${esc(t.where)}</dd>` : ''}
        ${t.trade ? `<dt>แลกกับ</dt><dd>${esc(t.trade)}</dd>` : ''}
        ${t.next ? `<dt>ยังไม่ได้</dt><dd>${tuneText(t.next)}</dd>` : ''}
        ${t.limit ? `<dt>เพดาน</dt><dd>${esc(t.limit)}</dd>` : ''}
      </dl>
    </article>`;
}

function renderTune() {
  const t = DATA.tuning;
  if (!t) return renderRecipe();
  document.title = 'ปรับรสเอง · สูตรกาแฟ';
  app.innerHTML = `
    <a class="back" href="#/">← สูตร</a>
    <header class="intro">
      <h1>ปรับรสเอง</h1>
      <p>อยากได้แบบไหน → ปรับตรงไหน · ${esc(t.grind_note)}</p>
      ${DATA.water ? `<p class="tune-link"><a href="${WATER_HREF}">จูนน้ำ อยู่อีกหน้า →</a></p>` : ''}
    </header>
    <section class="box tune-rules">
      <h2>ก่อนเริ่ม</h2>
      <ul class="why">${t.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    </section>
    ${t.bean_hints ? `
      <section class="box tune-rules">
        <h2>เมล็ดใหม่ เริ่มจากสูตรกลาง แล้ว…</h2>
        <dl class="facts">${t.bean_hints.map((h) => `<dt>${esc(h.bean)}</dt><dd>${esc(h.do)}</dd>`).join('')}</dl>
      </section>` : ''}
    ${t.groups.map((g) => `
      <section class="tune-group">
        <h2 class="section-title">${esc(g.title)}</h2>
        <div class="tunes">${g.items.map(tuneCard).join('')}</div>
      </section>`).join('')}
    <section class="tune-group">
      <h2 class="section-title">จำง่ายๆ</h2>
      <ul class="tune-sum">${t.summary.map((s) => `
        <li><span class="knob" aria-hidden="true">${KNOB[s.knob] || ''}</span><b>${esc(s.move)}</b> = ${esc(s.gain)}<span>ระวัง${esc(s.risk)}</span></li>`).join('')}
      </ul>
    </section>
    <section class="box">
      <h2>อยากได้สองอย่างที่ขัดกัน</h2>
      <p class="meta">${esc(t.conflict.want)}</p>
      <p class="tune-do">${tuneText(t.conflict.do)}</p>
    </section>`;
}

/* ---------- Water: brew-water recipe + tuning ---------- */

function renderWater() {
  const w = DATA.water;
  if (!w) return renderRecipe();
  const s = set(w.set);
  document.title = 'สูตรน้ำ · สูตรกาแฟ';
  const rows = w.recipe.rows.map((r) => `
    <tr>
      <td>${r.knob ? `<span class="knob" aria-hidden="true">${KNOB[r.knob]}</span>` : ''}${esc(r.what)}</td>
      <td class="amount">${r.g ? `<b>${r.g}</b> g` : esc(r.fill)}</td>
    </tr>`).join('');

  app.innerHTML = `
    <a class="back" href="#/">← สูตร</a>
    <header class="intro">
      <h1>สูตรน้ำ</h1>
      <p>${esc(w.intro)}${s ? ` · ${esc(s.dripper)} · ${esc(s.grinder)}` : ''}</p>
      <p class="tune-link"><a href="${TUNE_HREF}">จูนเบอร์บดและอุณหภูมิ อยู่อีกหน้า →</a></p>
    </header>
    <div class="recipe">
      <div class="col">
        <section class="box">
          <h2>1 · ${esc(w.concentrate.title)}</h2>
          <ol class="why steps">${w.concentrate.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
          <p class="meta">${esc(w.concentrate.note)}</p>
        </section>
        <section class="box">
          <h2>2 · ${esc(w.recipe.title)}</h2>
          <div class="table-wrap">
            <table class="water-mix"><tbody>${rows}</tbody></table>
          </div>
          <p class="meta">${esc(w.recipe.note)}</p>
        </section>
        <p class="prep">${esc(w.ice)}</p>
      </div>
      <div class="col">
        <section class="box tune-rules">
          <h2>ก่อนจูนน้ำ</h2>
          <ul class="why">${w.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        </section>
      </div>
    </div>
    <section class="tune-group">
      <h2 class="section-title">จูนน้ำ</h2>
      <div class="tunes">${w.items.map(tuneCard).join('')}</div>
    </section>
    <section class="tune-group">
      <h2 class="section-title">สูตรทางเลือก</h2>
      <div class="tunes">${w.alternatives.map((a) => `
        <article class="tune">
          <h3>${esc(a.name)}</h3>
          <p class="move">${esc(a.mix)}</p>
          <dl><dt>เหมาะกับ</dt><dd>${esc(a.when)}</dd></dl>
        </article>`).join('')}
      </div>
    </section>`;
}

/* ---------- Menu ---------- */

const body = document.body;
const menu = document.getElementById('menu');
const toggle = document.querySelector('.menu-toggle');
const backdrop = document.querySelector('.menu-backdrop');

function setMenu(open) {
  body.classList.toggle('menu-open', open);
  backdrop.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  menu.inert = !open;
  if (open) menu.querySelector('a').focus();
}

toggle.addEventListener('click', () => setMenu(true));
menu.querySelector('.menu-close').addEventListener('click', () => { setMenu(false); toggle.focus(); });
menu.addEventListener('click', (e) => { if (e.target.closest('#menu-links a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false); });
backdrop.addEventListener('click', () => setMenu(false));

function buildMenu() {
  const links = DATA.sets.flatMap((s) => recipesOf(s.id).map((r) => (
    `<li><a href="${recipeHref(r)}">${esc(s.name)} · ${esc(SERVE[r.serve] || r.serve)}</a></li>`
  )));
  document.getElementById('menu-links').innerHTML = `${links.join('')}<li><a href="${TUNE_HREF}">ปรับรสเอง</a></li>${DATA.water ? `<li><a href="${WATER_HREF}">สูตรน้ำ</a></li>` : ''}`;
  document.getElementById('updated').textContent = `สูตรกาแฟส่วนตัว · อัปเดต ${DATA.updated}`;
}

/* ---------- Boot ---------- */

function checkData() {
  for (const r of DATA.recipes) {
    const sum = r.pours.reduce((s, p) => s + p.g, 0);
    if (sum !== r.water_g) console.warn(`[recipes] ${r.id}: pours sum ${sum} g ≠ water_g ${r.water_g} g`);
    if (!set(r.set)) console.warn(`[recipes] ${r.id}: unknown set "${r.set}"`);
  }
}

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'tune') renderTune();
  else if (parts[0] === 'water') renderWater();
  else if (parts[0] === 'set') renderRecipe(parts[1], parts[2]);
  else renderRecipe();
}

window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

fetch('data/recipes.json', { cache: 'no-cache' })
  .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
  .then((json) => { DATA = json; checkData(); buildMenu(); route(); })
  .catch((err) => {
    app.innerHTML = `<p class="error">โหลดสูตรไม่ได้ (${esc(err.message)})</p>`;
  });
