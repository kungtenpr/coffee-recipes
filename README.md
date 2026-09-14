# สูตรกาแฟ (coffee-recipes)

เว็บส่วนตัวไว้เปิดดูสูตร V60 ของแต่ละเมล็ด แยกตามน้ำที่ใช้ — static site บน GitHub Pages
`https://kungtenpr.github.io/coffee-recipes/`

## โครงสร้าง

```
index.html          หน้าเดียว (hash routing: #/ · #/bean/<bean-id>/<recipe-id>)
app.js              render ทั้งหมดจาก data
styles.css
data/recipes.json   ← แก้สูตร/เพิ่มเมล็ด/เพิ่มน้ำ ที่นี่ที่เดียว
images/             รูปถุง (ไม่มีรูปก็ได้ จะแสดงเป็นการ์ดสี)
```

## data/recipes.json

- `current_water` — น้ำที่ใช้อยู่ตอนนี้ (ค่าเริ่มต้นของตัวเลือกน้ำ)
- `waters[]` — `id, name, ec_us_cm, temp_c, note`
- `beans[]` — `id, name, full_name, roaster, origin, process, roast, notes[], defect_pct[min,max], sort (mandatory|recommended|null), correction (push|pull), axis, color (hex), image (path|null), label_note`
- `recipes[]` — สูตร = เมล็ด × น้ำ · เรียงเก่า → ใหม่ (ตัวสุดท้ายของคู่ bean+water = สูตรล่าสุด)
  - `id, bean, water, version, status (baseline|dialled|archived), date, method`
  - `dose_g, water_g, ratio, temp_c, grind {grinder, clicks}`
  - `phase1_pours` (4:6 = 2), `pours[{g, at}]` — g ต่อครั้ง ต้องรวมได้ `water_g`
  - `swirl (allowed|forbidden)`, `time {min, max}|null`, `why[]`, `ladder[{symptom, steps[]}]`

เปลี่ยนน้ำ = เพิ่ม recipe ใหม่ ไม่ต้องแก้ของเก่า (ของเก่ายังดูได้จากแถบด้านบนหน้าสูตร)
เปิด console จะเตือนถ้า pours รวมไม่เท่า water_g หรือ id อ้างผิด

## รันในเครื่อง

```bash
python3 -m http.server 4175
```

## Deploy

push `main` → GitHub Pages (Deploy from a branch · main · /root) อัปเดตใน ~1 นาที
repo ตั้ง `core.sshCommand` ใช้คีย์ `~/.ssh/velai_deploy` (บัญชี kungtenpr) และ commit ด้วยอีเมล noreply ของ kungtenpr

รูปถุงเป็นภาพโปรโมตของ Fatman Coffee — ใช้ชั่วคราว ยังไม่ได้ขออนุญาตร้าน
