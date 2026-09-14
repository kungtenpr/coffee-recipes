# สูตรกาแฟ (coffee-recipes)

เว็บส่วนตัวไว้เปิดดูสูตร V60 ของแต่ละเมล็ด แยกตามน้ำที่ใช้ — static site บน GitHub Pages
หน้าตา: โครง **Phantom** ของ HTML5 UP (CC BY 3.0 · ต้องคงเครดิตท้ายเว็บ) เขียนใหม่ไม่ใช้ jQuery · สีโทนร้านกาแฟมืด (ทอง + Playfair Display)
`https://kungtenpr.github.io/coffee-recipes/`

## โครงสร้าง

```
index.html          หน้าเดียว (hash routing: #/ · #/bean/<bean-id>/<recipe-id>)
app.js              render ทั้งหมดจาก data
styles.css
data/recipes.json   ← แก้สูตร/เพิ่มเมล็ด/เพิ่มน้ำ ที่นี่ที่เดียว
images/             รูปถุง (ไม่มีรูปก็ได้ จะแสดงเป็นการ์ดสีประจำเมล็ด)
```

## data/recipes.json

- `waters[]` — `id, name, ec_us_cm, temp_c, note`
- `beans[]` — `id, name, full_name, roaster, origin, process, roast, notes[], defect_pct[min,max], sort (mandatory|recommended|null), correction (push|pull), axis, color (hex), image (path|null)`
- `recipes[]` — สูตร = เมล็ด × น้ำ (คู่ละ 1 สูตร)
  - `id, bean, water, method`
  - `dose_g, water_g, ratio, temp_c, grind {grinder, clicks}`
  - `phase1_pours` (4:6 = 2), `pours[{g, at, note}]` — g ต่อครั้ง ต้องรวมได้ `water_g` · note = ต้องทำอะไรตอนเท
  - `swirl (allowed|forbidden)`, `time {min, max}|null`, `finish_note`, `why[]`

**บนเว็บมีแต่สูตรที่เคาะแล้ว** — ไม่มีสถานะ/เวอร์ชัน/คำว่าประมาณ/ทดลอง ปรับสูตร = คุยจูนให้จบก่อน แล้วแก้ทับของเดิม · น้ำใหม่ = เพิ่ม water + recipe
เปิด console จะเตือนถ้า pours รวมไม่เท่า water_g หรือ id อ้างผิด

## รันในเครื่อง

```bash
python3 -m http.server 4175
```

## Deploy

push `main` → GitHub Pages (Deploy from a branch · main · /root) อัปเดตใน ~1 นาที
repo ตั้ง `core.sshCommand` ใช้คีย์ `~/.ssh/velai_deploy` (บัญชี kungtenpr) และ commit ด้วยอีเมล noreply ของ kungtenpr

รูปถุงเป็นภาพโปรโมตของ Fatman Coffee — ใช้ชั่วคราว ยังไม่ได้ขออนุญาตร้าน
