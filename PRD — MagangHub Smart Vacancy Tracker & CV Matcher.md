# PRODUCT REQUIREMENTS DOCUMENT

## MagangHub Smart Vacancy Tracker & CV Matcher

**Versi:** 2.0  
**Status:** Revised Architecture  
**Platform:** Web Application + PWA  
**Frontend:** Vanilla JavaScript  
**Backend:** Cloudflare Pages Functions / Workers  
**Database:** Tidak ada untuk MVP  
**Hosting:** Cloudflare  
**Target biaya:** Gratis / Rp0 untuk MVP

---

# 1. Product Overview

MagangHub Smart Vacancy Tracker adalah aplikasi web yang membantu pelamar Program Pemagangan Nasional MagangHub Kemnaker mencari lowongan secara lebih cepat, sederhana, dan strategis.

Aplikasi tidak menggantikan MagangHub.

MagangHub tetap digunakan sebagai platform resmi untuk:

- login;
- pendaftaran;
- pengiriman lamaran;
- proses seleksi;
- pengelolaan akun peserta.

Aplikasi ini berfungsi sebagai:

> **Smart Opportunity Finder untuk membantu pengguna menemukan lowongan MagangHub yang paling cocok dan paling layak diprioritaskan berdasarkan persyaratan, CV, skill, kuota, jumlah pelamar, lokasi, dan tingkat persaingan.**

---

# 2. Problem Statement

MagangHub menyediakan banyak lowongan, tetapi pengguna harus membuka dan membaca banyak posisi untuk mengetahui:

- apakah program studinya diterima;
- apakah jenjang pendidikannya sesuai;
- berapa jumlah kuota;
- berapa jumlah pelamar;
- seberapa ketat persaingannya;
- apakah skill pada CV sesuai;
- posisi mana yang lebih layak diprioritaskan.

Aplikasi ini harus mengubah proses:

```text
Cari → buka lowongan → baca → kembali → cari lagi
```

menjadi:

```text
Masukkan profil
        ↓
Filter otomatis
        ↓
Cek Eligibility
        ↓
Hitung Match
        ↓
Analisis Persaingan
        ↓
Ranking
        ↓
Pilih lowongan terbaik
        ↓
Daftar di MagangHub
```

---

# 3. Core Product Questions

Aplikasi harus membantu user menjawab:

```text
1. Apakah saya memenuhi syarat?

2. Seberapa cocok lowongan ini dengan CV saya?

3. Seberapa ketat persaingannya?

4. Posisi mana yang sebaiknya saya lamar terlebih dahulu?
```

---

# 4. Product Positioning

Jangan membuat aplikasi hanya sebagai clone tampilan MagangHub.

Core value aplikasi adalah:

```text
MAGANGHUB
menyediakan lowongan + pendaftaran

MAGANGFINDER
membantu user memilih lowongan terbaik
```

---

# 5. Working Product Name

Nama development:

```text
MagangFinder
```

Repository:

```text
magangfinder
```

Alternatif nama:

```text
MagangRadar
MagangScout
MagangMatch
MagangHub Explorer
```

Gunakan `MagangFinder` sebagai nama sementara di UI.

---

# 6. Technology Architecture

## 6.1 Frontend

Gunakan:

```text
HTML5
CSS3
Vanilla JavaScript ES6+
```

Jangan menggunakan:

```text
React
Next.js
Vue
Angular
Svelte
Bootstrap
Tailwind
jQuery
```

Tujuan:

- ringan;
- cepat;
- mudah dipahami;
- minim dependency;
- cocok untuk hosting gratis.

---

# 7. Backend

Gunakan:

```text
Cloudflare Pages Functions
```

atau jika struktur deployment lebih cocok:

```text
Cloudflare Workers
```

Prioritas utama:

```text
Cloudflare Pages + Pages Functions
```

Backend tetap menggunakan JavaScript.

Tidak menggunakan:

```text
Python
Flask
FastAPI
Django
Express server tradisional
Render
VPS
```

---

# 8. Infrastructure

Target architecture:

```text
                   INTERNET

                      │
                      ▼

            ┌─────────────────┐
            │   Cloudflare    │
            │     Pages       │
            └────────┬────────┘
                     │
             ┌───────┴───────┐
             │               │
             ▼               ▼

      Static Frontend     Functions API

      index.html          /api/vacancies
      styles.css          /api/detail
      app.js              /api/filters
      PWA                 /api/health

                             │
                             ▼

                     MagangHub Kemnaker
                    Next.js Server Action
```

---

# 9. Hosting

Target production:

```text
Cloudflare Pages
```

Contoh URL:

```text
https://magangfinder.pages.dev
```

API:

```text
https://magangfinder.pages.dev/api/vacancies
```

Karena frontend dan backend satu origin, frontend cukup memanggil:

```javascript
fetch("/api/vacancies")
```

Tidak perlu konfigurasi CORS antara frontend dan backend sendiri.

---

# 10. Database

MVP:

```text
NO DATABASE
```

Jangan menggunakan:

```text
Supabase
Firebase
MongoDB
MySQL
PostgreSQL
D1
KV
```

kecuali nantinya dibutuhkan pada versi berikutnya.

Data personal user disimpan menggunakan:

```text
localStorage
```

---

# 11. Local Data

Simpan:

```text
User Profile
CV text
Skills
Bookmarks
Compare List
Theme
Filter Preference
Recently Viewed
```

menggunakan browser storage.

Prefix:

```text
magangfinder_profile
magangfinder_bookmarks
magangfinder_compare
magangfinder_theme
magangfinder_filters
magangfinder_recent
```

---

# 12. Existing Python Script

Repository saat ini mungkin memiliki script Python seperti:

```text
maganghub_tracker.py
```

Script tersebut berisi request yang sudah terbukti dapat mengambil data MagangHub.

Jangan langsung menghapus script tersebut.

Gunakan sebagai:

```text
REFERENCE IMPLEMENTATION
```

Antigravity harus:

1. Membaca script tersebut.
2. Memahami request.
3. Memahami headers.
4. Memahami payload.
5. Memahami parsing RSC response.
6. Memahami field response MagangHub.
7. Memindahkan logic tersebut ke JavaScript.
8. Verifikasi output JavaScript sama dengan Python.
9. Setelah JS benar-benar bekerja, Python tidak lagi menjadi runtime dependency.

---

# 13. MagangHub Data Source

Saat ini MagangHub menggunakan Next.js Server Action.

Contoh konfigurasi existing:

```text
Endpoint:
https://maganghub.kemnaker.go.id/magang-nasional/lowongan
```

Request menggunakan:

```text
POST
Accept: text/x-component
Next-Action: SERVER_ACTION_ID
Content-Type: text/plain;charset=UTF-8
```

Payload:

```json
[
  {
    "page": 1,
    "sort": "least_applicants",
    "keyword": "backend"
  }
]
```

---

# 14. Important Server Action Rule

`SERVER_ACTION_ID` tidak boleh dianggap API identifier permanen.

Contoh:

```javascript
const SERVER_ACTION_ID =
  "4042e54ac927b18cee0deb2e4ec2ecee4980c12ec1";
```

Ini adalah internal implementation MagangHub.

MagangHub dapat mengubahnya sewaktu-waktu.

Karena itu seluruh integration harus berada pada adapter khusus.

---

# 15. MagangHub Adapter

Buat:

```text
functions/_lib/maganghub.js
```

Isi tanggung jawab:

```javascript
fetchVacancies()
fetchVacancyDetail()

buildMagangHubRequest()

parseRSCResponse()

normalizeVacancy()

validateMagangHubResponse()
```

Frontend dilarang mengetahui struktur internal Server Action MagangHub.

---

# 16. Adapter Architecture

```text
MagangHub
    │
    ▼
maganghub.js
    │
    ▼
normalize.js
    │
    ▼
Normalized Vacancy
    │
    ▼
API
    │
    ▼
Frontend
```

Jika API MagangHub berubah:

```text
ubah maganghub.js
```

Jangan sampai harus mengubah:

```text
app.js
matcher.js
UI
filter
bookmark
compare
```

---

# 17. JavaScript Equivalent Existing Fetch

Server-side JavaScript dapat menggunakan pola:

```javascript
const response = await fetch(
  MAGANGHUB_ENDPOINT,
  {
    method: "POST",

    headers: {
      Accept: "text/x-component",
      "Next-Action": SERVER_ACTION_ID,
      "Content-Type": "text/plain;charset=UTF-8",
      Referer:
        "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",

      Origin:
        "https://maganghub.kemnaker.go.id"
    },

    body: JSON.stringify([params])
  }
);
```

Kemudian:

```javascript
const text = await response.text();
```

---

# 18. RSC Response Parser

Python existing menggunakan marker seperti:

```text
1:{"data":
```

JavaScript harus memiliki parser terisolasi.

Contoh:

```javascript
function parseRSCResponse(text) {

    const marker = '1:{"data":';

    const index = text.indexOf(marker);

    if (index === -1) {
        throw new Error(
            "MAGANGHUB_RSC_DATA_NOT_FOUND"
        );
    }

    const line = text
        .slice(index + 2)
        .split("\n")[0];

    return JSON.parse(line);
}
```

Jangan meletakkan parser langsung dalam endpoint handler.

---

# 19. Parser Resilience

Parsing RSC merupakan bagian paling rawan berubah.

Buat:

```text
parseRSCResponse()
```

yang mudah diganti.

Tambahkan validation.

Jika response format berubah:

```text
jangan mengembalikan data kosong seolah berhasil
```

Return error jelas:

```json
{
  "success": false,
  "error": "MAGANGHUB_RESPONSE_CHANGED"
}
```

---

# 20. Project Structure

Gunakan struktur:

```text
magangfinder/
│
├── public/
│   │
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── manifest.json
│   ├── service-worker.js
│   │
│   └── assets/
│       ├── icons/
│       └── images/
│
├── functions/
│   │
│   ├── api/
│   │   ├── vacancies.js
│   │   ├── vacancy/
│   │   │   └── [id].js
│   │   ├── filters.js
│   │   └── health.js
│   │
│   └── _lib/
│       ├── maganghub.js
│       ├── normalize.js
│       ├── matcher.js
│       ├── scoring.js
│       ├── cache.js
│       └── utils.js
│
├── data/
│   ├── regions.json
│   ├── study-programs.json
│   ├── education.json
│   └── minimum-wages.json
│
├── legacy/
│   └── maganghub_tracker.py
│
├── README.md
├── wrangler.toml
├── package.json
└── .gitignore
```

Jika Cloudflare config terbaru tidak membutuhkan `wrangler.toml`, sesuaikan dengan deployment environment.

---

# 21. NPM Dependencies

Target:

```text
ZERO RUNTIME DEPENDENCY
```

Gunakan Web APIs bawaan Cloudflare.

Contoh:

```text
fetch
Request
Response
URL
URLSearchParams
Cache API
crypto
```

Node hanya boleh digunakan untuk:

```text
development tooling
Cloudflare CLI
local testing
```

Bukan sebagai runtime application server.

---

# 22. Main Features

MVP harus memiliki:

```text
Live Vacancy Search
Multi Filter
Vacancy Detail

Eligibility Checker

Smart Profile Matcher
Smart CV Matcher

Match Score

Competition Index

Priority Score

Hidden Gem Detection

Recommended For You

Bookmarks

Compare Vacancy

Exclude Keywords

UMK Information

Data Freshness

Dark Mode

Responsive Mobile

PWA
```

---

# 23. User Flow

```text
User membuka MagangFinder
        ↓
Lowongan terbaru muncul
        ↓
User menggunakan Search / Filter
        ↓
User membuka "Profil Saya"
        ↓
Isi pendidikan, prodi, lokasi, skill, CV
        ↓
Data disimpan localStorage
        ↓
Frontend menghitung:
Eligibility
Match
Competition
Priority
        ↓
Lowongan otomatis diranking
        ↓
User melihat:
Recommended
Hidden Gems
Low Competition
        ↓
User membuka detail
        ↓
Bookmark / Compare
        ↓
Klik "Daftar di MagangHub"
```

---

# 24. Search

Search field:

```text
Cari posisi, perusahaan, atau skill...
```

Search dapat mencocokkan:

```text
positionName
organizer.name
description
requirements
skills
curriculum
```

Gunakan:

```text
debounce 400ms
```

Jangan request server setiap karakter.

---

# 25. Search Request

Frontend:

```javascript
fetch(
  `/api/vacancies?keyword=${encodeURIComponent(keyword)}&page=1`
);
```

Browser dilarang langsung melakukan request:

```text
browser
↓
maganghub.kemnaker.go.id
```

Harus:

```text
browser
↓
/api/vacancies
↓
Cloudflare Function
↓
MagangHub
```

---

# 26. Filter

Support:

```text
Keyword

Program Studi

Jenjang

Provinsi

Kabupaten / Kota

Jenis Instansi

Eligibility

Match Score

Competition

Availability

Kuota

Excluded Keyword
```

---

# 27. Sorting

Options:

```text
Rekomendasi Untuk Saya

Match Tertinggi

Persaingan Terendah

Pelamar Terendah

Kuota Terbesar

Terbaru

Nama Posisi
```

---

# 28. Quick Filter

Tambahkan chip:

```text
🔥 Recommended

💎 Hidden Gems

🟢 Low Competition

🎯 Match ≥80%

🏢 BUMN

🏛 Pemerintah

💼 Swasta

🆕 Terbaru
```

---

# 29. Profile

Modal:

```text
Profil / CV Saya
```

Field:

```text
Jenjang Pendidikan

Program Studi

Provinsi

Kabupaten / Kota

Skill

CV Text
```

Nama bersifat optional.

---

# 30. CV Input

MVP tidak perlu upload PDF.

Gunakan:

```text
Paste teks CV
```

Contoh:

```text
Backend Developer dengan pengalaman Laravel,
PHP, MySQL, REST API, JavaScript dan Git...
```

Future version baru mempertimbangkan PDF parsing.

---

# 31. Privacy

Profile dan CV:

```text
disimpan lokal di browser
```

Bukan:

```text
Cloudflare DB
server database
third-party AI
```

UI harus menjelaskan:

> Data profil dan CV Anda disimpan pada perangkat ini dan digunakan untuk menghitung kecocokan lowongan.

---

# 32. Eligibility Checker

Pisahkan:

```text
ELIGIBILITY
```

dari:

```text
MATCH SCORE
```

Eligibility adalah hard requirements.

Check utama:

```text
Program Studi
Jenjang
```

Return:

```text
ELIGIBLE

NOT_ELIGIBLE

UNKNOWN
```

---

# 33. Eligibility Rules

Contoh:

User:

```text
S1 Informatika
```

Lowongan:

```text
S1
Informatika / Teknik Informatika
```

Result:

```text
ELIGIBLE
```

Jika:

```text
S1 Akuntansi saja
```

Result:

```text
NOT_ELIGIBLE
```

Jika data persyaratan tidak tersedia:

```text
UNKNOWN
```

Jangan mengasumsikan eligible.

---

# 34. Match Score

Formula initial:

```text
Skill Match               40%

Program Studi             25%

Job / Experience Keyword  20%

Location Preference       10%

Jenjang                     5%
```

Total:

```text
100
```

---

# 35. Skill Matching

Normalize:

```text
lowercase
trim
punctuation
aliases
```

Alias example:

```text
js
→ javascript

node
→ node.js

reactjs
→ react

postgres
→ postgresql

restful api
→ rest api
```

---

# 36. Skill Explanation

Card/detail:

```text
92% Match

✓ Laravel ditemukan
✓ PHP ditemukan
✓ REST API ditemukan
✓ MySQL ditemukan
✓ Git ditemukan
⚠ Docker belum ditemukan
```

Match score wajib explainable.

---

# 37. Competition Index

Gunakan:

```text
Applicants Per Slot =
totalApplications / approvedQuantity
```

Example:

```text
24 applicants
10 quota
```

Result:

```text
2.4 applicants / slot
```

---

# 38. Competition Category

Default:

```text
0–2
Sangat Rendah

>2–5
Rendah

>5–10
Sedang

>10–20
Tinggi

>20
Sangat Tinggi
```

Simpan thresholds pada config.

Jangan hard-code di banyak tempat.

---

# 39. Important Competition Rule

Jangan menyebut:

```text
Peluang Lolos 80%
```

karena jumlah pelamar tidak sama dengan probability acceptance.

Gunakan:

```text
Competition Score
Tingkat Persaingan
Pelamar per posisi
```

---

# 40. MagangHub competitiveScore

Jika MagangHub response memiliki:

```text
competitiveScore
```

simpan sebagai raw source field:

```javascript
sourceCompetitiveScore
```

Jangan otomatis menyebutnya sebagai probability user lolos.

Jika digunakan di UI, beri label yang jelas sesuai makna data sumber.

---

# 41. Priority Score

Buat:

```text
Priority Score
```

Formula:

```text
Match Score          55%

Competition          30%

Available Quota      10%

Freshness             5%
```

Tujuannya:

```text
menentukan mana yang layak dilamar dahulu
```

---

# 42. Hidden Gem

Badge:

```text
💎 Hidden Gem
```

Default criteria:

```text
Eligibility = ELIGIBLE

Match >= 70

Applicants Per Slot <= 5

Quota > 0
```

---

# 43. Recommended Tab

Tab:

```text
Untuk Kamu
```

sorting:

```text
Eligibility
↓
Priority Score
↓
Match
↓
Competition
```

---

# 44. Vacancy Card

Card wajib memiliki:

```text
Logo / monogram

Position

Company

Company Type

Location

Eligibility

Match

Hidden Gem

Quota

Applicants

Applicants / Slot

Competition

Education

Study Program

Skill

Estimated UMK

Data Freshness
```

CTA:

```text
Detail

Simpan

Bandingkan

Daftar di MagangHub ↗
```

---

# 45. Vacancy Detail

Modal/detail page menampilkan:

```text
Position Name

Company

Institution Type

Location

Description

Curriculum

Requirements

Education

Study Programs

Skills

Quota

Applicants

Applicants per Slot

Competition

Eligibility Explanation

Match Explanation

UMK

Fetched At
```

---

# 46. Direct MagangHub Link

Format:

```text
https://maganghub.kemnaker.go.id/
magang-nasional/lowongan/{JOB_ID}
```

CTA selalu membuka official website.

Gunakan:

```text
target="_blank"
rel="noopener noreferrer"
```

---

# 47. Normalized Vacancy Schema

API internal:

```json
{
  "id": "",
  "title": "",
  "company": "",
  "companyType": "",

  "logo": null,

  "province": "",
  "city": "",
  "location": "",

  "quota": 0,
  "applicants": 0,

  "sourceCompetitiveScore": null,

  "educationLevels": [],
  "studyPrograms": [],
  "skills": [],

  "description": "",
  "curriculum": "",
  "requirements": "",

  "sourceUrl": "",

  "publishedAt": null,
  "fetchedAt": ""
}
```

Frontend hanya boleh menggunakan normalized schema.

---

# 48. API Endpoints

MVP:

```text
GET /api/vacancies

GET /api/vacancy/:id

GET /api/filters

GET /api/health
```

Tidak perlu:

```text
POST /api/match
```

untuk MVP apabila matching dilakukan browser-side.

---

# 49. Matching Location

Prefer matching dilakukan di:

```text
frontend
```

karena:

```text
CV tidak perlu dikirim server
```

Flow:

```text
API vacancy data
        +
local profile
        ↓
matcher.js
        ↓
Match Score
```

Ini lebih privacy-friendly.

---

# 50. GET /api/vacancies

Query:

```text
keyword
page
sort
```

Tambahkan filter API upstream hanya jika MagangHub mendukungnya.

Filtering lain boleh dilakukan frontend.

Response:

```json
{
  "success": true,

  "meta": {
    "total": 100,
    "currentPage": 1,
    "lastPage": 5
  },

  "fetchedAt": "ISO_DATETIME",

  "items": []
}
```

---

# 51. API Error Format

```json
{
  "success": false,

  "error": "MAGANGHUB_UNAVAILABLE",

  "message":
    "Data MagangHub sementara tidak dapat diakses."
}
```

Possible errors:

```text
MAGANGHUB_UNAVAILABLE

MAGANGHUB_TIMEOUT

MAGANGHUB_RESPONSE_CHANGED

MAGANGHUB_PARSE_ERROR

INVALID_REQUEST

INTERNAL_ERROR
```

---

# 52. Cache Strategy

Cache MagangHub responses.

Target TTL:

```text
10 minutes
```

Cache key:

```text
keyword + page + sort
```

Concept:

```text
100 users
    ↓
request "backend page 1"
    ↓
Cloudflare Cache
    ↓
1 upstream request MagangHub
```

---

# 53. Cache Rules

Data vacancy boleh cache:

```text
5–10 minutes
```

Jangan cache:

```text
forever
```

Expose:

```text
fetchedAt
```

agar user tahu freshness data.

---

# 54. Data Freshness

UI:

```text
Diperbarui 3 menit lalu
```

atau:

```text
Data diperbarui pukul 21:20
```

---

# 55. Request Protection

Backend wajib:

```text
validate query

limit input length

timeout handling

cache

controlled retry

response validation
```

Jangan:

```text
infinite retry

arbitrary URL proxy

high-frequency polling
```

---

# 56. Search Debounce

Frontend:

```text
400 ms
```

Jangan:

```text
B
→ API

Ba
→ API

Bac
→ API

Back
→ API
```

Gunakan:

```text
Backend
[400ms]
→ 1 API request
```

---

# 57. Pagination

Gunakan:

```text
Load More
```

Default:

```text
20 results/page
```

Jika jumlah upstream ditentukan MagangHub, ikuti pagination MagangHub.

---

# 58. Loading UI

Gunakan:

```text
skeleton cards
```

Jangan hanya fullscreen spinner.

---

# 59. Bookmark

Store:

```text
magangfinder_bookmarks
```

Reload tidak boleh menghapus bookmark.

---

# 60. Compare

Max:

```text
4 vacancies
```

Floating bar:

```text
3 lowongan dipilih

[Bandingkan]

[Hapus Semua]
```

---

# 61. Compare Table

Compare:

```text
Position

Company

Location

Eligibility

Match

Priority

Quota

Applicants

Applicants/Slot

Competition

Education

Study Program

Skills

UMK
```

---

# 62. Exclude Keywords

Input:

```text
Kecualikan kata
```

Example:

```text
sales, marketing, accounting
```

Jika position match exclusion:

```text
hide card
```

---

# 63. UMK Data

Local master:

```text
data/minimum-wages.json
```

UI:

```text
Estimasi Uang Saku

± RpX.XXX.XXX / bulan

Berdasarkan upah minimum wilayah
```

Jangan menyebut:

```text
Gaji
```

---

# 64. Missing UMK

Jika tidak ditemukan:

```text
Data upah wilayah belum tersedia
```

Jangan membuat angka estimasi palsu.

---

# 65. Homepage

Desktop example:

```text
┌─────────────────────────────────────┐

 MagangFinder

 Cari | Hidden Gems | Tersimpan

                      [Profil Saya]

---------------------------------------

 Temukan MagangHub yang
 Paling Layak Kamu Lamar

 Cari berdasarkan kecocokan profil,
 kuota, dan tingkat persaingan.

 [ Backend Developer...       ] 🔍

 [Buat Profil / CV]

---------------------------------------

 🔥 Recommended
 💎 Hidden Gems
 🟢 Low Competition
 🎯 Match >80%

---------------------------------------

 127 cocok

 18 Hidden Gems

 34 low competition

---------------------------------------

 JOB CARDS...

└─────────────────────────────────────┘
```

---

# 66. Job Card Example

```text
Backend Developer

PT Example Technology

Bandung, Jawa Barat


ELIGIBLE

92% MATCH

💎 HIDDEN GEM


✓ Informatika
✓ S1
✓ Laravel
✓ PHP
✓ REST API

⚠ Docker tidak ditemukan


Kuota
10

Pelamar
24

🟢 Rendah
2.4 pelamar / posisi


Estimasi uang saku
± RpX.XXX.XXX


♡ Simpan

⚖ Bandingkan

Detail


[ Daftar di MagangHub ↗ ]
```

---

# 67. Responsive

Target:

```text
Mobile
Tablet
Desktop
```

Breakpoints:

```text
<768px

768–1024px

>1024px
```

---

# 68. Mobile UX

Mobile priority:

```text
Search

Quick Filter

Filter Drawer

Job Card

Profile Modal

Detail

Bookmark

Apply CTA
```

Apply button harus mudah dijangkau.

---

# 69. Design System

Style:

```text
Modern
Minimal
Professional
Clean
Soft glassmorphism
```

Jangan terlalu banyak:

```text
blur
gradient
animation
shadow
```

Fokus keterbacaan.

---

# 70. CSS Variables

Gunakan:

```css
:root {

    --bg: ...;

    --surface: ...;

    --surface-secondary: ...;

    --text: ...;

    --text-secondary: ...;

    --primary: ...;

    --success: ...;

    --warning: ...;

    --danger: ...;

    --border: ...;

    --radius: ...;

    --shadow: ...;
}
```

---

# 71. Theme

Support:

```text
Light

Dark

System
```

Store:

```text
magangfinder_theme
```

---

# 72. PWA

Harus installable.

Files:

```text
manifest.json

service-worker.js
```

Static cache:

```text
HTML

CSS

JS

icons
```

Jangan menyimpan vacancy response secara permanen di PWA cache.

---

# 73. Offline Behavior

Jika offline:

UI tetap dapat terbuka.

Tampilkan:

```text
Anda sedang offline.

Data lowongan terbaru membutuhkan koneksi internet.
```

Bookmark dan profile tetap dapat dibuka.

---

# 74. Accessibility

Minimum:

```text
semantic HTML

keyboard navigation

focus state

input labels

aria-label

sufficient contrast

modal keyboard support
```

---

# 75. URL State

Search:

```text
/?q=backend
```

Filter:

```text
/?q=backend&province=jawa-barat&match=70
```

Reload tidak boleh kehilangan state utama.

---

# 76. Security

Tidak boleh:

```text
menyimpan credential MagangHub

menyimpan cookie session MagangHub

mengambil password

auto login

auto apply

proxy arbitrary URL

render HTML eksternal tanpa sanitization
```

---

# 77. HTML Sanitization

Description MagangHub:

```text
treat as untrusted input
```

Jika format HTML:

```text
sanitize
```

atau gunakan safe text rendering.

Jangan:

```javascript
element.innerHTML = remoteData;
```

tanpa sanitization.

---

# 78. Health Endpoint

```text
GET /api/health
```

Response:

```json
{
  "success": true,
  "service": "magangfinder",
  "status": "ok"
}
```

Optional:

```text
MagangHub connectivity status
```

tetapi jangan melakukan request upstream pada setiap health request jika tidak diperlukan.

---

# 79. Application State

Frontend:

```javascript
const state = {

    vacancies: [],

    profile: null,

    filters: {},

    bookmarks: [],

    compare: [],

    currentPage: 1,

    totalPages: 1,

    loading: false,

    error: null

};
```

---

# 80. Frontend Modules

Jika tetap ingin tanpa bundler, gunakan native ES Modules.

Example:

```text
public/js/

app.js

api.js

state.js

ui.js

matcher.js

scoring.js

storage.js

filters.js

utils.js
```

Prefer struktur modular dibanding satu `app.js` ribuan baris.

---

# 81. Recommended Frontend Structure

```text
public/
│
├── index.html
├── styles.css
│
└── js/
    ├── app.js
    ├── api.js
    ├── state.js
    ├── ui.js
    ├── matcher.js
    ├── scoring.js
    ├── storage.js
    ├── filters.js
    └── utils.js
```

Load:

```html
<script type="module" src="/js/app.js"></script>
```

---

# 82. Backend Module Responsibilities

## maganghub.js

```text
upstream requests
headers
payload
RSC parsing
```

## normalize.js

```text
MagangHub → internal schema
```

## cache.js

```text
Cloudflare cache abstraction
```

## utils.js

```text
response helpers
validation
```

---

# 83. Frontend Match Modules

## matcher.js

```text
profile matching
skill matching
program study matching
education matching
keyword matching
```

## scoring.js

```text
competition
priority
hidden gem
```

---

# 84. No AI Requirement

MVP tidak membutuhkan:

```text
OpenAI
Gemini
Claude
Groq
Qwen
Embedding
Vector DB
Machine Learning
```

Matching harus deterministic.

Keuntungan:

```text
gratis
cepat
explainable
privacy-friendly
```

---

# 85. Future AI

AI hanya dipertimbangkan nanti untuk:

```text
CV semantic matching

skill extraction

CV improvement

job description summarization
```

Tidak masuk MVP.

---

# 86. Development Phases

## Phase 1 — Investigation

Antigravity wajib:

```text
inspect repository

read Python tracker

test current Python response

inspect MagangHub response

identify important fields

document data mapping
```

---

# 87. Phase 2 — JavaScript Port

Port:

```text
Python urllib request
        ↓
Cloudflare fetch()

Python RSC parser
        ↓
JS parseRSCResponse()

Python display fields
        ↓
normalized JSON API
```

Test Python vs JS.

---

# 88. Phase 3 — API

Implement:

```text
/api/health

/api/vacancies

/api/vacancy/:id

/api/filters
```

Pastikan live data berfungsi sebelum mengerjakan UI kompleks.

---

# 89. Phase 4 — Base UI

Implement:

```text
Homepage

Search

Filter

Cards

Pagination

Detail Modal

Loading

Error State
```

---

# 90. Phase 5 — Smart Matching

Implement:

```text
Profile

Eligibility

Skill Match

Job Match

Match Explanation

Competition

Priority Score

Hidden Gems
```

---

# 91. Phase 6 — Productivity

Implement:

```text
Bookmark

Compare

Exclude Filter

URL State

Recently Viewed
```

---

# 92. Phase 7 — Production Polish

Implement:

```text
responsive

dark mode

PWA

accessibility

cache optimization

performance

Cloudflare deployment
```

---

# 93. Important Development Priority

Urutan:

```text
REAL DATA
    ↓
WORKING CLOUDFLARE API
    ↓
NORMALIZATION
    ↓
SEARCH
    ↓
DETAIL
    ↓
FILTER
    ↓
PROFILE
    ↓
MATCH
    ↓
COMPETITION
    ↓
RANKING
    ↓
BOOKMARK
    ↓
COMPARE
    ↓
PWA
    ↓
VISUAL POLISH
```

Jangan kebalik.

---

# 94. Do Not Prioritize UI First

Dilarang menghabiskan waktu terlebih dahulu pada:

```text
gradient

animations

logo

glass effect

complex cards
```

sementara API belum bekerja.

Live data adalah priority #1.

---

# 95. Acceptance Test — API

Request:

```text
GET /api/vacancies?keyword=backend&page=1
```

Expected:

```text
HTTP 200

success = true

items.length > 0
```

jika MagangHub memiliki hasil.

---

# 96. Acceptance Test — Data

Compare minimal satu vacancy antara:

```text
existing Python script
```

dan:

```text
new JavaScript API
```

Harus cocok untuk:

```text
id

positionName

company

quota

applicants

city
```

---

# 97. Acceptance Test — Competition

Input:

```text
quota = 10

applicants = 24
```

Expected:

```text
2.4 applicants / slot
```

---

# 98. Acceptance Test — Eligibility

Profile:

```text
S1
Informatika
```

Vacancy:

```text
S1
Informatika
```

Expected:

```text
ELIGIBLE
```

---

# 99. Acceptance Test — Hidden Gem

```text
Eligibility = ELIGIBLE

Match = 88

Applicants/Slot = 2.4

Quota > 0
```

Expected:

```text
Hidden Gem = true
```

---

# 100. Acceptance Test — Storage

Create:

```text
Profile

Bookmark
```

Refresh browser.

Expected:

```text
data still exists
```

---

# 101. Acceptance Test — Mobile

Test Chrome viewport:

```text
375 × 812
```

Check:

```text
No horizontal scroll

Search works

Filter drawer works

Cards readable

Modal usable

Apply CTA visible
```

---

# 102. Error State

Jika MagangHub gagal:

```text
Tidak dapat mengambil data MagangHub saat ini.

[Coba Lagi]
```

Jangan:

```text
show fake vacancies
```

---

# 103. No Permanent Mock Data

Mock diperbolehkan:

```text
development only
```

Harus memiliki jelas:

```javascript
const USE_MOCK_DATA = false;
```

Production wajib menggunakan real MagangHub data.

---

# 104. Future V1.1

Setelah MVP:

```text
Applicant history

Applicant growth

Saved searches

Browser notifications

Telegram alerts

Deadline tracking

Application tracker

Daily new vacancies

Competition trend chart
```

---

# 105. Future Cloudflare Storage

Jika membutuhkan server persistence:

Prioritas:

```text
Cloudflare D1

Cloudflare KV
```

Tetapi jangan implementasikan hanya karena tersedia.

Gunakan ketika ada kebutuhan nyata.

---

# 106. Possible D1 Usage Later

Future:

```text
historical applicant snapshots

vacancy history

public aggregate statistics
```

---

# 107. Possible KV Usage Later

Future:

```text
server cache

configuration

latest Server Action metadata
```

MVP gunakan caching sederhana terlebih dahulu.

---

# 108. Future Cron

Cloudflare scheduled worker dapat digunakan nanti untuk:

```text
snapshot applicant count

new vacancy detection
```

Contoh:

```text
every 30–60 minutes
```

Bukan bagian MVP.

---

# 109. Application Tracker Future

User dapat menandai:

```text
Belum Dilamar

Akan Dilamar

Sudah Dilamar

Seleksi

Interview

Lolos

Tidak Lolos
```

Awalnya cukup localStorage.

---

# 110. Important Terminology

Gunakan:

```text
Kuota
Pelamar
Pelamar per Posisi
Tingkat Persaingan
Match Score
Priority Score
Eligibility
Hidden Gem
```

Hindari:

```text
Peluang Lolos 90%
Chance of Acceptance
Guaranteed
```

---

# 111. Data Disclaimer

Footer/detail tooltip:

> MagangFinder bukan layanan resmi Kemnaker. Data lowongan berasal dari informasi MagangHub dan dapat berubah sewaktu-waktu. Pendaftaran tetap dilakukan melalui platform resmi MagangHub.

---

# 112. Product Success Metric

Goal:

```text
1000 lowongan
      ↓
100 relevan
      ↓
50 eligible
      ↓
25 match tinggi
      ↓
8 competition menarik
      ↓
3–5 prioritas utama
```

User tidak perlu membuka puluhan lowongan secara manual.

---

# 113. Performance Target

Target:

```text
Static UI immediately available

Search responsive

No full page reload

No major layout shift

Minimal JS payload

Minimal external assets
```

---

# 114. README

Wajib berisi:

```text
Overview

Architecture

Features

Cloudflare setup

Local development

Deployment

MagangHub adapter

RSC parsing

Scoring rules

Privacy

Known limitations

Disclaimer
```

---

# 115. Local Development

Gunakan Cloudflare tooling untuk menjalankan Pages Functions locally.

Target developer command:

```bash
npm run dev
```

Production:

```text
Git push
↓
Cloudflare deployment
```

---

# 116. package.json

Gunakan package hanya untuk development tooling.

Contoh conceptual:

```json
{
  "scripts": {
    "dev": "wrangler pages dev public",
    "deploy": "wrangler pages deploy public"
  }
}
```

Sesuaikan syntax dengan Cloudflare tooling yang benar pada saat implementasi.

Jangan menambahkan dependencies aplikasi yang tidak diperlukan.

---

# 117. Deployment Goal

Ideal workflow:

```text
Edit code
    ↓
git add
    ↓
git commit
    ↓
git push
    ↓
Cloudflare automatic deployment
    ↓
magangfinder.pages.dev
```

---

# 118. Important Antigravity Instructions

Antigravity harus membaca seluruh PRD sebelum coding.

Sebelum melakukan perubahan:

```text
1. Inspect seluruh repository.

2. Temukan maganghub_tracker.py.

3. Jalankan / pahami script tersebut.

4. Dokumentasikan response MagangHub aktual.

5. Jangan hapus Python script sebelum JS replacement terbukti bekerja.

6. Port logic request Python ke Cloudflare JavaScript.

7. Port parser RSC.

8. Buat normalization layer.

9. Test endpoint JS dengan live MagangHub.

10. Bandingkan hasil dengan Python.

11. Setelah API stabil baru kerjakan frontend.

12. Jangan menggunakan framework berat.

13. Jangan menggunakan database.

14. Jangan menggunakan AI API.

15. Jangan menggunakan dummy data sebagai production fallback.

16. Jangan membuat auto apply.

17. Jangan meminta atau menyimpan credential MagangHub.

18. Gunakan caching untuk mengurangi request upstream.

19. Jangan melakukan request MagangHub langsung dari browser.

20. Semua upstream MagangHub request harus melalui Cloudflare Function.
```

---

# 119. Architecture Decision

Final MVP stack:

```text
FRONTEND

HTML
CSS
Vanilla JavaScript


BACKEND

Cloudflare Pages Functions
JavaScript


API SOURCE

MagangHub
Next.js Server Action


MATCH ENGINE

Vanilla JavaScript
Browser-side


PROFILE

localStorage


CV

localStorage


BOOKMARK

localStorage


DATABASE

None


HOSTING

Cloudflare Pages


PWA

Yes


AI

None


MONTHLY HOSTING TARGET

Rp0
```

---

# 120. Final Development Objective

Project dianggap berhasil jika user dapat membuka:

```text
https://magangfinder.pages.dev
```

kemudian:

```text
mencari lowongan MagangHub nyata

memfilter lowongan

melihat kuota

melihat jumlah pelamar

melihat competition

membuat profil

paste CV

melihat eligibility

melihat match score

melihat alasan match

melihat recommendation

menemukan Hidden Gems

bookmark

compare

dan akhirnya membuka MagangHub resmi
untuk melakukan pendaftaran
```

tanpa:

```text
Python server

database

paid API

paid hosting

AI API

account registration
```

---

# 121. Final Rule for Coding Agent

**FUNCTIONALITY BEFORE BEAUTY.**

Prioritas pertama:

> Apakah data MagangHub nyata dapat diambil secara stabil melalui Cloudflare Function?

Jika jawabannya belum:

```text
jangan lanjut ke UI kompleks.
```

Urutan final:

```text
MAGANGHUB CONNECTION
        ↓
RSC PARSER
        ↓
NORMALIZED API
        ↓
CACHE
        ↓
SEARCH
        ↓
FILTER
        ↓
PROFILE
        ↓
ELIGIBILITY
        ↓
MATCHING
        ↓
COMPETITION
        ↓
SMART PRIORITY
        ↓
HIDDEN GEMS
        ↓
BOOKMARK
        ↓
COMPARE
        ↓
PWA
        ↓
DESIGN POLISH
        ↓
CLOUDFLARE PRODUCTION DEPLOY
```