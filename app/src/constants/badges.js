// Definisi Trofi & Badge Pencapaian Komprehensif (AgainstMe Achievement System)
// Dari fase awal, bulanan, tahunan, hingga level Mythic 10 Tahun (3.650 Hari)
export function getWarriorRank(unlockedCount, lang = 'id') {
  if (unlockedCount >= 12) {
    return {
      title: lang === 'id' ? 'Legenda Merdeka Hidup (Mythic)' : 'Living Sovereign Legend',
      color: 'text-purple-700 bg-purple-50 border-purple-200'
    };
  } else if (unlockedCount >= 8) {
    return {
      title: lang === 'id' ? 'Pilar Kedaulatan Diri (Gold)' : 'Pillar of Self-Mastery',
      color: 'text-yellow-700 bg-yellow-50 border-yellow-200'
    };
  } else if (unlockedCount >= 4) {
    return {
      title: lang === 'id' ? 'Ksatria Tekad Baja (Silver)' : 'Silver Will Knight',
      color: 'text-blue-700 bg-blue-50 border-blue-200'
    };
  }
  return {
    title: lang === 'id' ? 'Inisiat Pejuang' : 'Warrior Initiate',
    color: 'text-amber-700 bg-amber-50 border-amber-200'
  };
}

export const BADGE_DEFINITIONS = [
  {
    id: 'first_24h',
    category: 'streak',
    nameId: 'Langkah Pertama',
    nameEn: 'First 24 Hours',
    descId: 'Melewati 24 jam pertama penuh perjuangan',
    descEn: 'Completed the critical first 24 hours',
    iconType: 'sun',
    tier: 'bronze',
    checkUnlocked: ({ totalDays }) => totalDays >= 1
  },
  {
    id: 'iron_will_7d',
    category: 'streak',
    nameId: 'Tekad Baja 7 Hari',
    nameEn: 'Iron Will 7 Days',
    descId: 'Mempertahankan kendali diri selama 1 minggu penuh',
    descEn: 'Maintained sovereignty for 1 full week',
    iconType: 'shield',
    tier: 'silver',
    checkUnlocked: ({ totalDays }) => totalDays >= 7
  },
  {
    id: 'champion_30d',
    category: 'streak',
    nameId: 'Ksatria 30 Hari',
    nameEn: '30-Day Warrior',
    descId: 'Satu bulan pemulihan neuroplastisitas otak',
    descEn: 'One full month of neural resetting',
    iconType: 'award',
    tier: 'silver',
    checkUnlocked: ({ totalDays }) => totalDays >= 30
  },
  {
    id: 'legend_90d',
    category: 'streak',
    nameId: 'Kedaulatan 90 Hari',
    nameEn: '90-Day Sovereign',
    descId: 'Reset total sistem dopamin dan kendali dorongan',
    descEn: 'Total dopamine reboot & impulse mastery',
    iconType: 'zap',
    tier: 'gold',
    checkUnlocked: ({ totalDays }) => totalDays >= 90
  },
  {
    id: 'half_year_180d',
    category: 'streak',
    nameId: 'Pilar Kokoh Setengah Tahun',
    nameEn: 'Half-Year Pillar (180 Days)',
    descId: '180 hari transformasi identitas baru yang tak tergoyahkan',
    descEn: '180 days of unshakable new identity transformation',
    iconType: 'compass',
    tier: 'gold',
    checkUnlocked: ({ totalDays }) => totalDays >= 180
  },

  // === FASE TAHUNAN & JANGKA PANJANG (1 TAHUN - 10 TAHUN) ===
  {
    id: 'year_one_365d',
    category: 'streak',
    nameId: 'Revolusi 1 Tahun (365 Hari)',
    nameEn: '1-Year Rebirth (365 Days)',
    descId: 'Satu siklus orbit bumi penuh dalam keadaan bersih total',
    descEn: 'One full earth orbit in absolute sobriety and power',
    iconType: 'flame',
    tier: 'platinum',
    checkUnlocked: ({ totalDays }) => totalDays >= 365
  },
  {
    id: 'year_three_1000d',
    category: 'streak',
    nameId: 'Tritunggal 3 Tahun (1.000 Hari)',
    nameEn: '1,000 Days Mastery (3 Years)',
    descId: 'Menembus batas 1.000 hari hidup merdeka dan berwibawa',
    descEn: 'Surpassed 1,000 days of autonomous strength',
    iconType: 'crown',
    tier: 'diamond',
    checkUnlocked: ({ totalDays }) => totalDays >= 1095
  },
  {
    id: 'year_five_1825d',
    category: 'streak',
    nameId: 'Setengah Dekade (5 Tahun)',
    nameEn: 'Half Decade Sovereign (5 Years)',
    descId: '5 tahun (1.825 hari) membuktikan kamu tuan atas dirimu sendiri',
    descEn: '5 years of undisputed self-mastery and inner peace',
    iconType: 'mountain',
    tier: 'master',
    checkUnlocked: ({ totalDays }) => totalDays >= 1825
  },
  {
    id: 'decade_ten_3650d',
    category: 'streak',
    nameId: 'Keabadian 10 Tahun (Satu Dekade)',
    nameEn: 'The Immortal Decade (10 Years)',
    descId: '3.650 hari kedaulatan mutlak. Adiksi adalah masa lalu yang tak berarti.',
    descEn: '3,650 days of ultimate transcendence. Addiction is forever buried.',
    iconType: 'star',
    tier: 'mythic',
    checkUnlocked: ({ totalDays }) => totalDays >= 3650
  },

  // === FASE FINANSIAL TINGKAT TINGGI ===
  {
    id: 'saver_1m',
    category: 'financial',
    nameId: 'Penyelamat Rp 1 Juta',
    nameEn: 'Savvy Saver Rp 1M',
    descId: 'Menyelamatkan uang Rp 1.000.000 dari kehancuran impuls',
    descEn: 'Saved Rp 1,000,000 from impulse destruction',
    iconType: 'piggy',
    tier: 'silver',
    checkUnlocked: ({ totalSaved }) => totalSaved >= 1000000
  },
  {
    id: 'saver_10m',
    category: 'financial',
    nameId: 'Benteng Finansial Rp 10 Juta',
    nameEn: 'Financial Fortress Rp 10M',
    descId: 'Menyelamatkan Rp 10.000.000 untuk masa depan nyata',
    descEn: 'Saved Rp 10,000,000 redirected into meaningful assets',
    iconType: 'vault',
    tier: 'gold',
    checkUnlocked: ({ totalSaved }) => totalSaved >= 10000000
  },
  {
    id: 'saver_50m',
    category: 'financial',
    nameId: 'Kekayaan Berdaulat Rp 50 Juta',
    nameEn: 'Sovereign Wealth Rp 50M',
    descId: 'Akumulasi dana yang diselamatkan menembus Rp 50.000.000',
    descEn: 'Accumulated over Rp 50,000,000 saved from addiction bleed',
    iconType: 'briefcase',
    tier: 'platinum',
    checkUnlocked: ({ totalSaved }) => totalSaved >= 50000000
  },

  // === FASE MINDSET & SOSIAL ===
  {
    id: 'community_hero',
    category: 'social',
    nameId: 'Pahlawan Komunitas',
    nameEn: 'Community Hero',
    descId: 'Berbagi inspirasi atau memberi respek sesama pejuang',
    descEn: 'Shared stories and uplifted fellow warriors',
    iconType: 'users',
    tier: 'silver',
    checkUnlocked: ({ communityInteractions }) => communityInteractions >= 1
  },
  {
    id: 'letter_author',
    category: 'mindset',
    nameId: 'Penjaga Waktu',
    nameEn: 'Time Capsule Keeper',
    descId: 'Menulis Surat untuk Diri Sendiri di masa depan',
    descEn: 'Composed a locked letter to future self',
    iconType: 'mail',
    tier: 'bronze',
    checkUnlocked: ({ hasFutureLetter }) => !!hasFutureLetter
  }
];
