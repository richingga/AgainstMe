// Helper format dan parsing mata uang multi-bahasa
export function formatCurrency(amount, lang = 'id') {
  const num = typeof amount === 'number' ? amount : (parseInt(amount, 10) || 0);
  if (lang === 'en') {
    // Kurs konversi ilustratif: Rp 16.000 = $1
    const usd = (num / 16000).toFixed(1);
    const cleanUsd = usd.endsWith('.0') ? usd.slice(0, -2) : usd;
    return `$${Number(cleanUsd).toLocaleString('en-US')}`;
  }
  // Format Indonesia pakai titik pemisah ribuan
  return `Rp ${num.toLocaleString('id-ID')}`;
}

// Format input angka otomatis dengan titik (ID: 500000 -> 500.000) atau koma (EN)
export function formatNumberInput(rawStr) {
  if (!rawStr) return '';
  const digitsOnly = rawStr.toString().replace(/\D/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString('id-ID');
}

export function parseNumberInput(formattedStr) {
  if (!formattedStr) return 0;
  const digitsOnly = formattedStr.toString().replace(/\D/g, '');
  return parseInt(digitsOnly, 10) || 0;
}
