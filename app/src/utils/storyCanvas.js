// Generator Gambar Story 9:16 (1080 x 1920) Murni HTML5 Canvas
// 100% Bebas bug overlap html2canvas, tajam kristal, glassmorphism asli, rasio 9:16 presisi

export async function generateStreakStoryCanvas({
  days = 0,
  userName = 'Pejuang',
  userHandle = 'warrior',
  userPhotoUrl = null,
  habitLabel = 'Pemulihan',
  pmoRank = null,
  quote = 'Setiap detik menahan diri adalah langkah merebut kembali kendali hidup.',
  dateStr = new Date().toLocaleDateString('id-ID'),
  lang = 'id'
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // 1. Background Gradient Mewah (Deep Indigo ke Iris Glow)
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
  bgGrad.addColorStop(0, '#130F26');
  bgGrad.addColorStop(0.35, '#1E1B38');
  bgGrad.addColorStop(0.7, '#2F2963');
  bgGrad.addColorStop(1, '#6367FF');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Ambient Glow Spheres (Efek Cahaya Halus di Latar Belakang)
  const glow1 = ctx.createRadialGradient(200, 250, 20, 200, 250, 450);
  glow1.addColorStop(0, 'rgba(132, 148, 255, 0.28)');
  glow1.addColorStop(1, 'rgba(132, 148, 255, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, 1080, 800);

  const glow2 = ctx.createRadialGradient(880, 1650, 30, 880, 1650, 500);
  glow2.addColorStop(0, 'rgba(255, 101, 132, 0.22)');
  glow2.addColorStop(1, 'rgba(255, 101, 132, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 1000, 1080, 920);

  // Helper rounded rect
  function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // 3. Header: Avatar & Username di Kiri, Brand di Kanan
  const headerY = 130;
  
  // Render Avatar (Foto User Jika Ada, atau Inisial)
  let userImgLoaded = false;
  if (userPhotoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = userPhotoUrl;
      });
      ctx.save();
      ctx.beginPath();
      ctx.arc(130, headerY, 44, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 130 - 44, headerY - 44, 88, 88);
      ctx.restore();

      // Border lingkaran foto
      ctx.save();
      ctx.beginPath();
      ctx.arc(130, headerY, 44, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();
      ctx.restore();
      userImgLoaded = true;
    } catch (e) {
      userImgLoaded = false;
    }
  }

  if (!userImgLoaded) {
    // Avatar Circle Fallback (Inisial)
    ctx.save();
    ctx.beginPath();
    ctx.arc(130, headerY, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    // Inisial Avatar
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 40px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (userName || 'R').charAt(0).toUpperCase();
    ctx.fillText(initial, 130, headerY + 2);
    ctx.restore();
  }

  // Nama & Username User
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 34px Plus Jakarta Sans, sans-serif';
  ctx.fillText(userName || 'Pejuang', 195, headerY - 6);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '600 24px Plus Jakarta Sans, sans-serif';
  ctx.fillText(`@${userHandle || 'warrior'}`, 195, headerY + 28);

  // Brand Capsule "AgainstMe" di Kanan
  const brandWidth = 240;
  const brandHeight = 64;
  const brandX = 1080 - 90 - brandWidth;
  const brandY = headerY - 32;

  drawRoundedRect(brandX, brandY, brandWidth, brandHeight, 32);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.stroke();

  // Teks Brand: AgainstMe (A & M Lebih Besar / Bold)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 30px Plus Jakarta Sans, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('AgainstMe', brandX + brandWidth / 2, brandY + brandHeight / 2 + 1);

  // 4. Sub-heading "BERSIH SELAMA"
  ctx.textAlign = 'center';
  ctx.fillStyle = '#C9BEFF';
  ctx.font = '900 28px Plus Jakarta Sans, sans-serif';
  ctx.fillText(lang === 'id' ? 'BERSIH SELAMA' : 'CLEAN FOR', 540, 390);

  // 5. Glassmorphism Card Box Utama (Pusat Streak)
  const cardX = 90;
  const cardY = 440;
  const cardW = 900;
  const cardH = 680;

  ctx.save();
  // Shadow lembut di belakang kaca
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 25;

  drawRoundedRect(cardX, cardY, cardW, cardH, 56);
  // Lapisan kaca transparan dengan gradien halus atas-bawah
  const glassGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  glassGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.12)');
  glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
  ctx.fillStyle = glassGrad;
  ctx.fill();
  ctx.restore();

  // Border kaca berkilau
  drawRoundedRect(cardX, cardY, cardW, cardH, 56);
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
  ctx.lineWidth = 3;
  ctx.strokeStyle = borderGrad;
  ctx.stroke();

  // KONTEN DALAM KACA (Terhitung Presisi Tanpa Tabrakan!):
  // Angka Hari (Besar & Megah, Bersih Privasi Tanpa Nama Habit/Rank)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '950 230px Plus Jakarta Sans, sans-serif';
  ctx.fillText(String(days), 540, 740);

  // Label "HARI BEBAS" (Ditempatkan Aman di Bawah Angka)
  ctx.fillStyle = '#FAF9FF';
  ctx.font = '900 46px Plus Jakarta Sans, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText(lang === 'id' ? 'HARI BEBAS' : 'DAYS CLEAN', 540, 880);
  ctx.letterSpacing = '0px';

  // 6. Kutipan Motivasi (Quote Box dengan Pembungkus Teks Rapi)
  const quoteY = 1260;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = '600 italic 32px Plus Jakarta Sans, sans-serif';

  // Multi-line wrap quote
  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  wrapText(`"${quote}"`, 540, quoteY, 820, 52);

  // 8. Footer Pembatas & Tagline Resmi di Bagian Bawah
  const footerLineY = 1760;
  ctx.beginPath();
  ctx.moveTo(90, footerLineY);
  ctx.lineTo(990, footerLineY);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '700 24px Plus Jakarta Sans, sans-serif';
  ctx.fillText('The fight is against me, for me.', 90, 1820);

  ctx.textAlign = 'right';
  ctx.fillText(dateStr, 990, 1820);

  return canvas;
}
