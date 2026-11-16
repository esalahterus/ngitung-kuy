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

Ngitung Kuy merupakan aplikasi web berbasis HTML, CSS, dan JavaScript yang dapat dijalankan langsung melalui browser tanpa instalasi tambahan.

Langkah-langkah:

1. Download file ZIP Ngitung Kuy.
2. Ekstrak file ZIP tersebut.
3. Buka folder hasil ekstraksi.
4. Cari file `index.html`.
5. Klik dua kali `index.html` untuk menjalankan aplikasi.
6. Aplikasi akan terbuka melalui browser, seperti Google Chrome atau Microsoft Edge.

Alternatifnya, aplikasi dapat dimainkan secara online melalui GitHub Pages: <https://esalahterus.github.io/ngitung-kuy>


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
