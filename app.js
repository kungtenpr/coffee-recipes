'use strict';

const app = document.getElementById('app');
let DATA = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const SWIRL = { allowed: 'swirl ท้ายเบาๆ', forbidden: 'ห้าม swirl ท้าย' };
const SORT = { mandatory: 'ต้องคัดเมล็ด', recommended: 'ควรคัดเมล็ด' };

const byId = (list, id) => list.find((x) => x.id === id);
const water = (id) => byId(DATA.waters, id);
const bean = (id) => byId(DATA.beans, id);
const recipesOf = (beanId) => DATA.recipes.filter((r) => r.bean === beanId);

// one recipe per bean × water; if duplicated by mistake the later entry wins
function latestPerWater(beanId) {
  const byWater = new Map();
  for (const r of recipesOf(beanId)) byWater.set(r.water, r);
  return [...byWater.values()];
}

const beanStyle = (b) => `style="--bean:${esc(b.color)}"`;
const ratioText = (r) => `1:${r.ratio}`;
const beanHref = (b, r) => `#/bean/${encodeURIComponent(b.id)}${r ? `/${encodeURIComponent(r.id)}` : ''}`;

function media(b, cls = '') {
  return b.image
    ? `<img class="${cls}" src="${esc(b.image)}" alt="ถุง ${esc(b.name)}" loading="lazy">`
    : `<div class="${cls} placeholder" aria-hidden="true">${esc(b.name.slice(0, 1))}</div>`;
}

function waterMeta(w) {
  const parts = [];
  if (w.ec_us_cm) parts.push(`EC ${w.ec_us_cm} µS/cm${w.temp_c ? ` @ ${w.temp_c} °C` : ''}`);
  if (w.note) parts.push(w.note);
  return esc(parts.join(' · '));
}

/* ---------- Home ---------- */

function waterName(id) {
  const w = water(id);
  if (!w) return id;
  return w.ec_us_cm ? `${w.name} · ${w.ec_us_cm}` : w.name;
}

function card(b) {
  const recipes = latestPerWater(b.id);
  const rows = recipes.length
    ? recipes.map((r) => `
        <a class="water-row" href="${beanHref(b, r)}">
          <span class="wr-name">${esc(waterName(r.water))}</span>
          <span class="wr-spec">${r.dose_g} g · ${ratioText(r)} · ${r.temp_c}° · ${r.grind.clicks} คลิก</span>
        </a>`).join('')
    : '<p class="empty">ยังไม่มีสูตร</p>';

  return `
    <article class="card beaned" ${beanStyle(b)}>
      <a class="card-media" href="${beanHref(b, recipes[recipes.length - 1])}" tabindex="-1" aria-hidden="true">${media(b)}</a>
      <div class="card-body">
        <p class="eyebrow">${esc(b.roaster)} · ${esc(b.origin)}</p>
        <h2 class="bean-name"><a href="${beanHref(b, recipes[recipes.length - 1])}">${esc(b.name)}</a></h2>
        <p class="meta">${esc(b.process)} · ${esc(b.roast)}</p>
        <ul class="notes">${b.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        <div class="water-rows">${rows}</div>
      </div>
    </article>`;
}

function renderHome() {
  document.title = 'สูตรกาแฟ';
  app.innerHTML = `
    <header class="top wrap">
      <p class="eyebrow">V60 · Timemore C3S · 4:6</p>
      <h1 class="title">สูตรกาแฟ</h1>
      <p class="water-meta">เลือกเมล็ด แล้วเลือกสูตรตามน้ำที่ใช้</p>
    </header>
    <main class="wrap grid">${DATA.beans.map(card).join('')}</main>
    <footer class="wrap foot">อัปเดตล่าสุด ${esc(DATA.updated)}</footer>`;
}

/* ---------- Bean / recipe ---------- */

function stat(label, value, unit, sub) {
  return `
    <div class="stat">
      <div class="k">${esc(label)}</div>
      <div class="v">${esc(value)}<small>${esc(unit)}</small></div>
      ${sub ? `<div class="s">${esc(sub)}</div>` : ''}
    </div>`;
}

function pourList(r) {
  const phase1 = r.phase1_pours ?? 2;
  const phase1Pct = Math.round((r.pours.slice(0, phase1).reduce((s, p) => s + p.g, 0) / r.water_g) * 100);
  let cum = 0;

  const rows = r.pours.map((p, i) => {
    cum += p.g;
    const head = i === 0
      ? `<li class="phase">PHASE 1 · ${phase1Pct}% <span>ปรับเปรี้ยว / หวาน</span></li>`
      : i === phase1
        ? `<li class="phase">PHASE 2 · ${100 - phase1Pct}% <span>ปรับความเข้ม</span></li>`
        : '';
    return `${head}
      <li class="pour">
        <span class="n">${i + 1}</span>
        <div><div class="cum">${cum}<small> g</small></div><div class="add">เท +${p.g} g</div></div>
        <div class="at">${p.at ? esc(p.at) : ''}</div>
        ${p.note ? `<p class="do">${esc(p.note)}</p>` : ''}
      </li>`;
  }).join('');

  const end = r.time || r.finish_note
    ? `<li class="pour end">
        <span class="n">✓</span>
        <div><div class="add">เวลารวม</div></div>
        <div class="at">${r.time ? `${esc(r.time.min)}–${esc(r.time.max)}` : ''}</div>
        ${r.finish_note ? `<p class="do">${esc(r.finish_note)}</p>` : ''}
      </li>`
    : '';

  return `
    <section class="panel pours">
      <h2>ลำดับการเท <small>${esc(r.method)} · อ่านเลขบนตาชั่ง</small></h2>
      <ol>${rows}${end}</ol>
      <p class="hint">เทรอบถัดไปเมื่อน้ำเกือบลงหมด</p>
    </section>`;
}

// fixed dose is scooped before sorting; water and pours scale to what's left
function sortedDosePanel(b, r) {
  if (!b.sort) return '';
  let cum = 0;
  const cums = r.pours.map((p) => (cum += p.g));
  const rows = [0, 0.5, 1, 1.5].map((minus) => {
    const d = r.dose_g - minus;
    const k = d / r.dose_g;
    return `
      <tr>
        <td>${d.toFixed(1)} g</td>
        <td><b>${Math.round(r.water_g * k)} g</b></td>
        <td class="seq">${cums.map((c) => Math.round(c * k)).join(' · ')}</td>
      </tr>`;
  }).join('');
  return `
    <details class="panel">
      <summary>คัดเมล็ดแล้วถั่วไม่ถึง ${r.dose_g} g</summary>
      <p class="meta">ตัก ${r.dose_g} g จากถุง → คัดเมล็ด → ชั่งที่เหลือ → ใช้น้ำตามแถวนั้น ไม่ต้องเติมถั่ว</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ถั่วหลังคัด</th><th>น้ำรวม</th><th>ตาชั่งแต่ละเท</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>`;
}

function whyPanel(r) {
  if (!r.why || !r.why.length) return '';
  return `
    <details class="panel">
      <summary>ทำไมสูตรนี้</summary>
      <ul class="why">${r.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
    </details>`;
}

function factsPanel(b, w) {
  const defect = b.defect_pct ? `${b.defect_pct[0]}–${b.defect_pct[1]}%` : '–';
  return `
    <section class="panel">
      <h2>ข้อมูลถั่ว</h2>
      <dl class="facts">
        <dt>ชื่อเต็ม</dt><dd>${esc(b.full_name)}</dd>
        <dt>แหล่ง</dt><dd>${esc(b.origin)}</dd>
        <dt>โพรเซส</dt><dd>${esc(b.process)}</dd>
        <dt>คั่ว</dt><dd>${esc(b.roast)}</dd>
        <dt>แนวรส</dt><dd>${esc(b.axis)}</dd>
        <dt>เมล็ดเสีย</dt><dd>${defect}</dd>
        <dt>Notes</dt><dd><ul class="notes">${b.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></dd>
        ${w ? `<dt>น้ำ</dt><dd>${esc(w.name)}<br><span class="meta">${waterMeta(w)}</span></dd>` : ''}
      </dl>
    </section>`;
}

function recipeBody(b, r) {
  const w = water(r.water);
  const chips = [
    r.swirl && SWIRL[r.swirl] ? `<span class="chip${r.swirl === 'forbidden' ? ' strong' : ''}">${SWIRL[r.swirl]}</span>` : '',
    b.sort ? `<span class="chip${b.sort === 'mandatory' ? ' strong' : ''}">${SORT[b.sort]}</span>` : '',
  ].join('');

  return `
    <div class="col">
      <div class="chips">${chips}</div>
      <section class="stats">
        ${stat('ถั่ว', r.dose_g, 'g', '')}
        ${stat('น้ำ', r.water_g, 'g', ratioText(r))}
        ${stat('อุณหภูมิ', r.temp_c, '°C', '')}
        ${stat('บด', r.grind.clicks, 'คลิก', r.grind.grinder)}
      </section>
      ${pourList(r)}
    </div>
    <div class="col">
      ${sortedDosePanel(b, r)}
      ${whyPanel(r)}
      ${factsPanel(b, w)}
    </div>`;
}

function noRecipe(b) {
  return `
    <div class="col">
      <section class="panel">
        <h2>ถั่วตัวนี้ยังไม่มีสูตร</h2>
      </section>
    </div>
    <div class="col">${factsPanel(b, null)}</div>`;
}

function renderBean(beanId, recipeId) {
  const b = bean(beanId);
  if (!b) return renderHome();

  const list = recipesOf(b.id);
  const r = (recipeId && list.find((x) => x.id === recipeId)) || list[list.length - 1] || null;
  const tabs = list.map((x) => {
    const current = r && x.id === r.id ? ' aria-current="page"' : '';
    return `<a class="tab" href="${beanHref(b, x)}"${current}>${esc(waterName(x.water))}</a>`;
  }).join('');

  document.title = `${b.name} · สูตรกาแฟ`;
  app.innerHTML = `
    <div class="beaned" ${beanStyle(b)}>
      <header class="bean-head">
        <div class="wrap">
          <a class="back" href="#/">← สูตรทั้งหมด</a>
          <div class="bean-title">
            ${media(b, 'thumb')}
            <div>
              <p class="eyebrow">${esc(b.roaster)} · ${esc(b.origin)}</p>
              <h1 class="bean-name">${esc(b.name)}</h1>
              <p class="meta">${esc(b.process)} · ${esc(b.roast)}</p>
            </div>
          </div>
          ${list.length ? `<nav class="tabs" aria-label="สูตรตามน้ำ">${tabs}</nav>` : ''}
        </div>
      </header>
      <main class="wrap recipe">${r ? recipeBody(b, r) : noRecipe(b)}</main>
    </div>`;
}

/* ---------- Boot ---------- */

function checkData() {
  for (const r of DATA.recipes) {
    const sum = r.pours.reduce((s, p) => s + p.g, 0);
    if (sum !== r.water_g) console.warn(`[recipes] ${r.id}: pours sum ${sum} g ≠ water_g ${r.water_g} g`);
    if (!bean(r.bean)) console.warn(`[recipes] ${r.id}: unknown bean "${r.bean}"`);
    if (!water(r.water)) console.warn(`[recipes] ${r.id}: unknown water "${r.water}"`);
  }
}

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'bean') renderBean(parts[1], parts[2]);
  else renderHome();
}

window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

fetch('data/recipes.json', { cache: 'no-cache' })
  .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
  .then((json) => { DATA = json; checkData(); route(); })
  .catch((err) => {
    app.innerHTML = `<p class="wrap error">โหลดสูตรไม่ได้ (${esc(err.message)})</p>`;
  });
