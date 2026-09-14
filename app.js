'use strict';

const app = document.getElementById('app');
let DATA = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const SWIRL = { allowed: 'swirl ดริปเปอร์ท้ายเบาๆ', forbidden: 'ห้าม swirl ดริปเปอร์' };
const SORT = { mandatory: 'ต้องคัดเมล็ด', recommended: 'ควรคัดเมล็ด' };
const SERVE = { iced: 'เย็น', hot: 'ร้อน' };
const SERVE_ORDER = ['iced', 'hot'];

const byId = (list, id) => list.find((x) => x.id === id);
const water = (id) => byId(DATA.waters, id);
const bean = (id) => byId(DATA.beans, id);
const recipesOf = (beanId) => DATA.recipes.filter((r) => r.bean === beanId);

// one recipe per bean × water × serve; waters follow data order, iced before hot
function sortedRecipes(beanId) {
  const wIndex = (id) => DATA.waters.findIndex((w) => w.id === id);
  return recipesOf(beanId).sort((a, b) => (wIndex(a.water) - wIndex(b.water))
    || (SERVE_ORDER.indexOf(a.serve) - SERVE_ORDER.indexOf(b.serve)));
}
const defaultRecipe = (beanId) => sortedRecipes(beanId)[0] || null;

const beanStyle = (b) => `style="--bean:${esc(b.color)}"`;
// iced recipes count the ice in the server as part of the water
const totalWater = (r) => r.water_g + (r.ice_g || 0);
const ratioText = (r) => `1:${Math.round((totalWater(r) / r.dose_g) * 10) / 10}`;
const beanHref = (b, r) => `#/bean/${encodeURIComponent(b.id)}${r ? `/${encodeURIComponent(r.id)}` : ''}`;

function waterName(id) {
  const w = water(id);
  if (!w) return id;
  return w.ec_us_cm ? `${w.name} ${w.ec_us_cm}` : w.name;
}

function waterMeta(w) {
  const parts = [];
  if (w.ec_us_cm) parts.push(`EC ${w.ec_us_cm} µS/cm${w.temp_c ? ` @ ${w.temp_c} °C` : ''}`);
  if (w.note) parts.push(w.note);
  return esc(parts.join(' · '));
}

/* ---------- Home: Phantom tiles ---------- */

function tile(b) {
  return `
    <article class="tile" ${beanStyle(b)}>
      <span class="image">${b.image ? `<img src="${esc(b.image)}" alt="" loading="lazy">` : ''}</span>
      <a href="${beanHref(b, defaultRecipe(b.id))}">
        <h2>${esc(b.name)}</h2>
        <div class="content">
          <p>${esc(b.origin)} · ${esc(b.process)} · ${esc(b.roast)}</p>
          <p class="tasting">${b.notes.map(esc).join(' · ')}</p>
        </div>
      </a>
    </article>`;
}

function renderHome() {
  document.title = 'สูตรกาแฟ';
  app.innerHTML = `
    <header class="intro">
      <h1>สูตรกาแฟ V60</h1>
      <p>Timemore C3S · 4:6 · เลือกเมล็ด แล้วเลือกสูตรตามน้ำที่ใช้</p>
    </header>
    <section class="tiles">${DATA.beans.map(tile).join('')}</section>`;
}

/* ---------- Bean page: Phantom generic ---------- */

function spec(label, value, unit) {
  return `<div class="spec"><div class="v">${esc(value)}<small>${esc(unit)}</small></div><div class="k">${esc(label)}</div></div>`;
}

function pourList(r) {
  const phase1 = r.phase1_pours ?? 2;
  const phase1Pct = Math.round((r.pours.slice(0, phase1).reduce((s, p) => s + p.g, 0) / r.water_g) * 100);
  let cum = 0;

  const rows = r.pours.map((p, i) => {
    cum += p.g;
    const head = i === 0
      ? `<li class="phase">Phase 1 · ${phase1Pct}%<span>ปรับเปรี้ยว / หวาน</span></li>`
      : i === phase1
        ? `<li class="phase">Phase 2 · ${100 - phase1Pct}%<span>ปรับความเข้ม</span></li>`
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
        <div><div class="add">เวลารวม</div></div>
        <div class="at">${r.time ? `${esc(r.time.min)}–${esc(r.time.max)}` : ''}</div>
        ${r.finish_note ? `<p class="do">${esc(r.finish_note)}</p>` : ''}
      </li>`
    : '';

  return `
    <section>
      <h2 class="section-title">ลำดับการเท <small>${esc(r.method)} · อ่านเลขบนตาชั่ง</small></h2>
      ${r.prep_note ? `<p class="prep">${esc(r.prep_note)}</p>` : ''}
      <ol class="pours">${rows}${end}</ol>
      <p class="hint">เทรอบถัดไปเมื่อน้ำเกือบลงหมด</p>
    </section>`;
}

// fixed dose is scooped before sorting; water and pours scale to what's left
function sortedDoseBox(b, r) {
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
        ${r.ice_g ? `<td>${Math.round(r.ice_g * k)} g</td>` : ''}
        <td class="seq">${cums.map((c) => Math.round(c * k)).join(' · ')}</td>
      </tr>`;
  }).join('');
  return `
    <details class="box">
      <summary>คัดเมล็ดแล้วถั่วไม่ถึง ${r.dose_g} g</summary>
      <p class="meta">ตัก ${r.dose_g} g จากถุง → คัดเมล็ด → ชั่งที่เหลือ → ใช้น้ำ${r.ice_g ? 'และน้ำแข็ง' : ''}ตามแถวนั้น ไม่ต้องเติมถั่ว</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ถั่วหลังคัด</th><th>${r.ice_g ? 'น้ำร้อน' : 'น้ำรวม'}</th>${r.ice_g ? '<th>น้ำแข็ง</th>' : ''}<th>ตาชั่งแต่ละเท</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>`;
}

function whyBox(r) {
  if (!r.why || !r.why.length) return '';
  return `
    <details class="box">
      <summary>ทำไมสูตรนี้</summary>
      <ul class="why">${r.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
    </details>`;
}

function factsBox(b, w) {
  const defect = b.defect_pct ? `${b.defect_pct[0]}–${b.defect_pct[1]}%` : '–';
  return `
    <section class="box">
      <h2>ข้อมูลถั่ว</h2>
      <dl class="facts">
        <dt>ชื่อเต็ม</dt><dd>${esc(b.full_name)}</dd>
        <dt>โรงคั่ว</dt><dd>${esc(b.roaster)}</dd>
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
  const chips = [
    r.ice_g ? `<span class="chip">อัตราส่วนรวมน้ำแข็ง ${ratioText(r)}</span>` : '',
    r.swirl && SWIRL[r.swirl] ? `<span class="chip${r.swirl === 'forbidden' ? ' strong' : ''}">${SWIRL[r.swirl]}</span>` : '',
    b.sort ? `<span class="chip${b.sort === 'mandatory' ? ' strong' : ''}">${SORT[b.sort]}</span>` : '',
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
          ${spec(r.grind.grinder, r.grind.clicks, 'คลิก')}
        </div>
        <div class="chips">${chips}</div>
        ${pourList(r)}
      </div>
      <div class="col">
        ${sortedDoseBox(b, r)}
        ${whyBox(r)}
        ${factsBox(b, water(r.water))}
      </div>
    </div>`;
}

function renderBean(beanId, recipeId) {
  const b = bean(beanId);
  if (!b) return renderHome();

  const list = sortedRecipes(b.id);
  const r = (recipeId && list.find((x) => x.id === recipeId)) || list[0] || null;

  // row 1: waters (keep the same serve when switching) · row 2: iced / hot on this water
  const waterIds = [...new Set(list.map((x) => x.water))];
  const waterTabs = waterIds.map((wid) => {
    const target = list.find((x) => x.water === wid && r && x.serve === r.serve) || list.find((x) => x.water === wid);
    const current = r && r.water === wid ? ' aria-current="page"' : '';
    return `<a class="tab" href="${beanHref(b, target)}"${current}>${esc(waterName(wid))}</a>`;
  }).join('');
  const serveTabs = r ? list.filter((x) => x.water === r.water).map((x) => {
    const current = x.id === r.id ? ' aria-current="page"' : '';
    return `<a class="tab serve" href="${beanHref(b, x)}"${current}>${esc(SERVE[x.serve] || x.serve)}</a>`;
  }).join('') : '';
  const tabs = list.length
    ? `<div class="tab-rows">
        ${waterIds.length > 1 ? `<nav class="tabs" aria-label="น้ำ"><span class="tabs-label">น้ำ</span>${waterTabs}</nav>` : ''}
        ${serveTabs ? `<nav class="tabs" aria-label="เย็นหรือร้อน"><span class="tabs-label">เสิร์ฟ</span>${serveTabs}</nav>` : ''}
      </div>`
    : '';

  document.title = `${b.name} · สูตรกาแฟ`;
  app.innerHTML = `
    <div ${beanStyle(b)}>
      <a class="back" href="#/">← สูตรทั้งหมด</a>
      <header class="bean-head">
        <p class="eyebrow">${esc(b.roaster)} · ${esc(b.origin)}</p>
        <h1>${esc(b.name)}</h1>
        <p class="lede">${esc(b.process)} · ${esc(b.roast)}${r ? ` · น้ำ ${esc(waterName(r.water))} · ${esc(SERVE[r.serve] || '')}` : ''}</p>
      </header>
      <span class="banner">${b.image ? `<img src="${esc(b.image)}" alt="ถุง ${esc(b.name)}">` : ''}</span>
      ${tabs}
      ${r ? recipeBody(b, r) : `<section class="box"><h2>ถั่วตัวนี้ยังไม่มีสูตร</h2></section>`}
    </div>`;
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
  document.getElementById('menu-links').innerHTML = `<li><a href="#/">หน้าแรก</a></li>${DATA.beans.map((b) => {
    return `<li><a href="${beanHref(b, defaultRecipe(b.id))}">${esc(b.name)}</a></li>`;
  }).join('')}`;
  document.getElementById('updated').textContent = `สูตรกาแฟส่วนตัว · อัปเดต ${DATA.updated}`;
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
  .then((json) => { DATA = json; checkData(); buildMenu(); route(); })
  .catch((err) => {
    app.innerHTML = `<p class="error">โหลดสูตรไม่ได้ (${esc(err.message)})</p>`;
  });
