# PRD — "AgainstMe — Quit Addiction"
**Produk:** Web App (PWA) Pendamping Berhenti Kecanduan
**Versi:** 0.2 (Draft) — 4 September 2026
**Owner:** Yang Mulia

---

## 1. Ringkasan Produk

Bebas adalah web app yang membantu orang berhenti dari kecanduan (pornografi/PMO, rokok, obat-obatan, alkohol) melalui pelacakan progres harian, kalkulator penghematan uang, dukungan komunitas anonim, dan asisten AI yang siap menemani saat craving datang.

**Satu kalimat:** "Teman berhenti yang gak pernah tidur — catat streak, lihat uang yang kamu hemat, dan minta tolong AI kapanpun cravings nyerang."

---

## 2. Problem (Kenapa App Ini Perlu)

1. Orang yang mau berhenti kecanduan butuh ** accountability harian**, tapi malu/kagak punya orang untuk diajak cerita.
2. Motivasi cepat luntur karena **progresnya gak keliatan** — gak ada angka nyata (hari bebas, rupiah hemat).
3. Craving datang kapan aja (jam 2 pagi), saat **gak ada teman yang bisa dihubungi**.
4. App existing umumnya bahasa Inggris, mahal (premium), atau fokus satu kecanduan saja.

---

## 3. Tujuan & Metrik Sukses

**Tujuan produk:** Membantu user bertahan 1 hari lagi, setiap hari.

**Metrik (contoh untuk fase MVP):**
- **Activation:** ≥ 60% guest baru bikin "perjalanan" (journey) pertama dalam < 2 menit.
- **Retention:** ≥ 25% user balik di hari ke-7 (D7), ≥ 10% di hari ke-30.
- **Impact:** Total hari bebas & total rupiah dihemat (agregat, anonim) — angka ini jadi social proof.
- **SOS effectiveness:** ≥ 40% sesi craving SOS berakhir tanpa relapse (self-report user).

---

## 4. Persona Target

1. **Rizky (24, perokok 6 tahun)** — pengen berhenti karena boros + pengen hidup sehat. Butuh: counter hemat + streak biar kerasa "worth it".
2. **Dewi (29, alkohol)** — berhenti demi keluarga. Butuh: privasi tinggi, journaling, AI untuk curhat tanpa takut dinilai.
3. **Aldi (19, PMO)** — malu cerita ke siapapun. Butuh: komunitas anonim + fitur distraction saat urge datang.

---

## 5. Scope MVP (Build First — Jangan Nambah-Nambah 😄)

| ID | Fitur | Deskripsi Singkat |
|----|-------|-------------------|
| F0 | **Guest Mode** | Pakai tanpa login. Data disimpan di browser (localStorage) + tombol Export/Import (biar pindah HP gak hilang). |
| F1 | **Onboarding 60 Detik** | Pilih kecanduan → tanggal/jam terakhir pakai → harga yang biasa dibelanjakan per hari/minggu. Selesai. |
| F2 | **Streak & Counter** | Hitung hari:jam:menit bebas. Gede di homescreen. Kalau relapse, reset dengan tanpa drama (no shaming). |
| F3 | **Kalkulator Hemat** | Rokok/alkohol/obat: tampil "Rp X berhasil dihemat" live. Opsi set target belanja dari uang hemat (misal: PS5, umroh). |
| F4 | **Check-in Harian** | 1 menit/hari: mood (emoji) + catatan singkat. Kalau skip gak apa-apa, gak dihukum. |
| F5 | **SOS Craving** | Tombol besar "Lagi Goda!". Jalanin: timer 5 menit (urge surfing) + breathing guide + tombol chat AI. |
| F6 | **AI Companion** | Chat dasar dengan system prompt ketat: suportif, gak menghakimi, gak kasih advice medis, arahkan ke profesional kalau berat. |
| F7 | **Login (Opsional)** | Akun email/Google untuk sinkron progres ke cloud. Guest bisa upgrade kapan aja (import data lokal). |

---

## 6. Backlog Fase 2 & 3 (Belakangan Aja)

- **Relapse flow (prioritas naik ke fase 1.5):** saat user relapse, gak ada shaming — modal "Kamu udah dapat X hari sebelumnya, itu bukan hilang. Mau mulai lagi sekarang?" + AI ajak analisa trigger singkat (pilih: stress, bosan, teman, lobby, dst) → dicatat buat pola pribadi.
- **Shareable Streak Card (fase 1.5):** Generate kartu visual cantik ("Day 47 • Rp 1.2M saved • AgainstMe") — share ke IG Story/WA Status. Mesin viral + trofi kebanggaan user.
- **Dopamine Menu / Replacement Activities (fase 1.5):** User bikin daftar personal pengganti craving (pushup, mandi dingin, jalan, telepon teman). Muncul otomatis pas SOS. Evidence-based competing response.
- **Letter to Future Self (fase 2):** Hari 1 nulis surat buat diri sendiri 90 hari lagi. Hari ke-90 surat "terbuka" — momen emosional powerful.
- **Supporter Mode (fase 2):** Orang terdekat opt-in dapet update halus ("Aldi is 30 days strong 💪") TANPA lihat detail kecanduan/journal. Accountability tanpa bongkar privasi.
- **Crisis Escalation (WAJIB sebelum rilis publik):** AI deteksi tanda bahaya (depresi berat, bicara bunuh diri) → langsung tampilkan hotline profesional per negara (ID: BNN 184, Into The Light). Bukan fitur pamer — tanggung jawab moral.
- **Urge Heatmap (fase 2-3):** Visualisasi kalender kapan craving paling sering (hari apa, jam berapa). User bisa antisipasi & siapkan distraction.
- **Streak Freeze 1x/bulan (fase 2):** Kayak Duolingo — sekali sebulan boleh "freeze" streak kalau keadaan darurat. Mengurangi all-or-nothing thinking.
- **Mini Journal Voice-to-Text (fase 2-3):** Pas craving, user bisa ngomong, app transkrip otomatis. Data bisa dianalisa AI buat pattern recognition.
- Komunitas/forum anonim (dengan moderasi AI, auto-blur konten trigger)
- Accountability buddy (matching otomatis)
- Badge & milestone (7/30/90/365 hari)
- Health timeline ("setelah 72 jam nikotin mulai keluar dari darah", dst — sumber medis valid wajib)
- Push notification (PWA)
- Proyeksi masa depan ("1 tahun lagi uang hematmu = Rp X")
- Papan "cerita berhasil" (read-only untuk user baru, inspire)
- Wrap jadi APK (Capacitor/TWA) → Play Store

---

## 7. User Flow Kunci

### Flow 1: First Time (Guest)
```
Buka link → Landing 1 layar (1 value prop + tombol "Mulai Gratis")
→ Pilih kecanduan → Input "terakhir pakai kapan?" + "biasanya habis berapa per minggu?"
→ Loading 2 detik → Homescreen dengan streak 00:00:05 & "Kamu sudah hemat Rp 0"
```

### Flow 2: Check-in Harian
```
Notif/buka app → "Gimana harimu?" pilih emoji mood
→ Opsional tulis catatan 1 baris → Done (confetti kecil) → Balik lagi besok
```

### Flow 3: SOS Craving (PALING PENTING)
```
Klik "Lagi Goda!" → Layar meredup, kalm → Pilihan:
  [Nafas 4-7-8] [Timer 5 Menit] [Ngobrol sama AI] [Baca cerita yang berhasil]
→ Kalau lewat: "Kamu udah menang lawan 5 menit. Nggak sendiri kok."
```

---

## 8. Kebutuhan Non-Fungsional

- **Privasi dulu:** Data kecanduan itu sensitif banget. Guest = zero PII. Login = email aja, gak perlu verifikasi nomor HP.
- **Ringan:** Target bundle < 500KB. Harus lancar di HP kentang + koneksi 3G (banyak target user pakai HP entry-level).
- **AI Safety:** AI WAJIB menolak kasih nasihat medis/dosis obat. Kalau user nunjukin tanda bahaya (penarikan berat, bunuh diri) → AI arahkan ke layanan profesional & hotline resmi (verifikasi nomor hotline resmi terbaru sebelum rilis, mis. layanan kesehatan Kemenkes).
- **UX tanpa drama:** Relapse itu manusiawi. Gak ada streak-shaming, gak ada notifikasi menyindir.

---

## 9. Tech Stack (Rekomendasi)

- **Frontend:** React + Vite + Tailwind CSS (banyak tutorial, AI coding agent paling ngerti stack ini) — deploy gratis di Vercel/Netlify.
- **Backend & DB:** Supabase (gratisan: auth + PostgreSQL + realtime sudah jadi satu). Cocok untuk guest→login upgrade.
- **AI:** Mulai dari yang gratis: Gemini API (free tier) atau lewat 9Router combo. Nanti bisa upgrade.
- **PWA:** vite-plugin-pwa biar bisa install di homescreen + offline.
- **Repo:** GitHub (private dulu).

---

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| AI ngasih response berbahaya | System prompt ketat + filter kata kunci + disclaimer permanen |
| Komunitas jadi ruang trigger (misal cerita detail kecanduan) | Aturan komunitas + moderasi AI + auto-blur konten sensitif |
| Kebocoran data sensitif | Minim PII, enkripsi, gak pernah jual/bagi data (tulis di privacy policy) |
| Churn tinggi setelah relapse | UX anti-shaming: relapse = "mulai lagi dari 0 hari? Gak. Kamu cuma lanjut perjalanan." |

---

## 11. Roadmap

- **Sprint 0 (Minggu 1):** Final PRD ini + wireframe low-fi + bikin repo
- **Sprint 1 (Minggu 2–3):** F0–F3 (guest, onboarding, streak, hemat + Urge Piggybank judi + Komunitas Pejuang @username + Multi-currency $ & IDR)
- **Sprint 2 (Minggu 4–5):** F4–F6 (check-in, SOS + Dopamine Menu, AI companion + Crisis Escalation)
- **Sprint 2.5 (Minggu 5–6):** Relapse flow (anti-shaming + trigger logging) + Shareable Streak Card
- **Sprint 3 (Minggu 6–7):** F7 Auth Optional (Guest view only / Register to post & chat AI) + Letter to Future Self + polish
- **Sprint 4 (Minggu 8):** Beta ke komunitas kecil (grup WA/forum) + feedback loop
- **Fase 2:** Supporter Mode, Urge Heatmap, Streak Freeze, Voice Journal, Komunitas
- **Fase 3:** Accountability buddy, Badge system, Health timeline, Push notif, wrap APK → Play Store

---

## 12. Keputusan Produk (FINAL)

1. **Nama aplikasi:** AgainstMe — Quit Addiction
   - Tagline kandidat: *"The fight is against me, for me."* / *"Lawan yang lama, jadi yang baru."*
2. **Bahasa UI:** Bilingual (EN default + ID) — target audiens global, bukan cuma Indonesia.
   - Implementasi: i18n dari awal (react-i18next / i18next), jangan hardcode string. EN sebagai fallback.
3. **AI companion:** Via 9Router combo (infrastruktur sudah jalan di STB).
   - Wajib backend proxy (serverless function / edge function) — API key TIDAK BOLEH ada di frontend browser user.
   - System prompt AI companion harus disimpan di backend, bukan di client.
4. **Jenis kecanduan (fixed list, 5 kategori):**
   - 🚬 Rokok (Tobacco)
   - 🎰 Judi / Judol (Gambling)
   - 📱 PMO / Pornografi
   - 🍺 Alkohol
   - 💊 Narkoba / Obat-obatan
5. **Kalkulator hemat (dinamis per kecanduan):**
   - **Rokok:** Onboarding tanya batang/hari + harga per bungkus → hemat otomatis terhitung selama streak jalan.
   - **Alkohol:** Onboarding tanya frekuensi minum + rata-rata pengeluaran per sesi → hemat otomatis.
   - **Narkoba/Obat:** Onboarding tanya rata-rata pengeluaran per minggu/bulan → hemat otomatis.
   - **PMO / Pornografi:** 
     - TANPA pertanyaan konsumsi (zero friction onboarding). Langsung mulai — streak timer jalan otomatis.
     - **UI Khusus Homescreen:** Ketika tab PMO dipilih, kartu "Uang Dihemat" disembunyikan. Sebagai gantinya muncul **Kartu Level & Motivasi Reboot Otak**:
       - Level progresif berdasarkan jumlah hari bersih:
         - Hari 1–3: **Rank 1 — Budak Impuls** (Fase pemulihan kesadaran & grounding 72 jam awal)
         - Hari 4–7: **Rank 2 — Pemberontak** (1 minggu menolak kelaparan dopamin palsu)
         - Hari 8–21: **Rank 3 — Warga Bebas** (Pembentukan neuroplastisitas baru, kabut otak hilang)
         - Hari 22–60: **Rank 4 — Warga Mandiri** (Kendali penuh, respons terhadap bosan/stres ter-reset)
         - Hari 61–90: **Rank 5 — Penakluk Nafsu** (Reboot otak hampir tuntas, gaya hidup baru)
         - Hari >90: **Rank 6 — Pria Berdaulat** (Penguasaan diri total)
       - Setiap rank dilengkapi pesan motivasi psikologis harian yang relate dengan fase reboot otak.
   - **Judi/Judol:** Model "Urge Piggybank" (Celengan Penyelamat) — BUKAN onboarding statis. Setiap kali user pengen judi (merasa godaan), dia buka app dan ketik nominal yang mau dipake judi (misal Rp 200.000). Nominal itu "ditabung" secara virtual, diakumulasi. Counter menampilkan total uang yang berhasil "diselamatkan" + konteks belanja: "Uangmu sudah cukup buat beli Nintendo Switch 🎮". Ini mengubah momen godaan jadi momen penyelamatan uang — setiap godaan yang dikalahkan justru nambah tabungan Celengan Penyelamat.
   - Data konsumsi bisa di-update user kapan saja (harga naik, kebiasaan berubah).
4. **Branding/vibe:** Hangat & calm — palet warna:
   - Base: warm cream / soft sand (background, bukan putih mata menyala)
   - Accent: terracotta / warm amber (CTA, streak fire)
   - Support: sage green / muted teal (progress, kalm)
   - Text: warm dark brown/charcoal (bukan hitam pekat)
   - Tipografi: rounded sans (friendly, non-clinical) — misal Nunito / Plus Jakarta Sans
   - Vibe: "sore hari di ruangan hangat", bukan "klinik rehabilitasi"

---

*Dokumen ini living document — revisi kapan aja sesuai hasil belajar dari user.*
