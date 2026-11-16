# Ngitung Kuy

Aplikasi web latihan matematika interaktif untuk melatih kecepatan, ketelitian, dan kemampuan berhitung lewat 10 mode permainan.

**Demo:** <https://esalahterus.github.io/ngitung-kuy>

## Fitur

- **10 mode permainan** — Learning, Timed, Time-Based, Connect, Puzzle, Min-Max, True/False, Number Grid, Number Puzzle, dan Mirror Symmetry.
- **Dua bahasa** — Indonesia (default) dan English, dapat diganti dari Pengaturan tanpa reload.
- **Tema** — Terang, Gelap, atau Otomatis.
- **Efek suara & musik latar** — suara klik, keypad, benar, dan salah, serta musik latar. Dapat dimatikan satu per satu.
- **Animasi** — dapat dimatikan dari Pengaturan.
- **Panduan bermain** di setiap mode (tujuan, cara bermain, aturan, skor, tips).
- **Skor terbaik & progres** tersimpan otomatis di browser (`localStorage`).
- **Pengaturan per mode** — operasi, rentang angka, dan tingkat kesulitan (untuk mode yang mendukungnya).

## Mode Permainan

| Mode | Deskripsi singkat |
|---|---|
| Learning | Latihan soal dengan keypad numerik |
| Timed | Pilihan ganda, 10 detik per soal |
| Time-Based | Timer count-up dengan bonus streak |
| Connect | Hubungkan soal dengan jawabannya dengan menyeret |
| Puzzle | Susun persamaan dengan drag-and-drop |
| Min-Max | Urutkan operasi dari nilai terbesar ke terkecil |
| True/False | Benar/Salah, 10 level |
| Number Grid | Cocokkan pasangan angka pada grid |
| Number Puzzle | Slide puzzle 1–15 |
| Mirror Symmetry | Lengkapi pola cermin kiri–kanan |

## Menjalankan Secara Lokal

Aplikasi ini murni HTML, CSS, dan JavaScript statis. Cukup sajikan foldernya lewat server statis (membuka `index.html` langsung dari `file://` tidak disarankan karena audio dan beberapa API browser bekerja lebih andal lewat HTTP):

```bash
# salah satu
python3 -m http.server 8000
npx serve .
```

Lalu buka <http://localhost:8000>.

## Struktur Project

```
index.html              Halaman utama (semua view dalam satu halaman)
css/
  style.css             Gaya dasar, tema, pengaturan
  dashboard.css         Dashboard dan komponen umum
  games.css             Gaya khusus permainan
js/
  storage.js            Penyimpanan localStorage (skor, progres, pengaturan)
  settings.js           Manajer pengaturan (suara, musik, animasi, tema, bahasa)
  game-engine.js        MathEngine, BaseGame, timer, interaksi drag, SoundService
  translations.js       Terjemahan Indonesia & English (NgitungKuy.I18n)
  app.js                Dashboard, navigasi, pengaturan, bantuan
  games/                Satu file per mode permainan
assets/sounds/          click, keypad, correct, wrong, background-music
```

## Pengaturan

| Pengaturan | Keterangan |
|---|---|
| Suara | Efek suara klik, keypad, benar, dan salah |
| Musik | Musik latar |
| Animasi | Menyalakan/mematikan animasi dan transisi |
| Tema | Terang / Gelap / Otomatis |
| Bahasa | Indonesia / English |


## Teknologi

HTML, CSS, dan JavaScript vanilla. Tidak ada build step maupun dependensi eksternal.

## Author

**Esa Adya Syawal**

GitHub: https://github.com/esalahterus
