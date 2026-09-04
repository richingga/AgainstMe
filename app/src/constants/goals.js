// Target Alokasi Dana Impian & Bebas Finansial
// Clean & Elegant, Tanpa Emoji

export const RANDOM_DREAM_GOALS = [
  {
    nameId: 'Dana Darurat & Investasi Mandiri',
    nameEn: 'Emergency Fund & Portfolio',
    cost: 15000000
  },
  {
    nameId: 'Laptop Kerja Performa Tinggi',
    nameEn: 'High Performance Workstation',
    cost: 25000000
  },
  {
    nameId: 'Renovasi Ruang Kerja Minimalis',
    nameEn: 'Minimalist Workspace Remodel',
    cost: 20000000
  },
  {
    nameId: 'Upgrade Gadget Utama',
    nameEn: 'Flagship Smartphone Upgrade',
    cost: 18000000
  },
  {
    nameId: 'Aset Tanah Investasi Masa Depan',
    nameEn: 'Land Investment Asset',
    cost: 85000000
  },
  {
    nameId: 'Perjalanan Ibadah Bersama Keluarga',
    nameEn: 'Family Spiritual Journey',
    cost: 45000000
  },
  {
    nameId: 'Modal Portofolio Usaha Produktif',
    nameEn: 'Productive Business Capital',
    cost: 50000000
  },
  {
    nameId: 'Tabungan Kedaulatan Finansial',
    nameEn: 'Financial Sovereignty Reserve',
    cost: 100000000
  }
];

export function getRandomGoal() {
  const idx = Math.floor(Math.random() * RANDOM_DREAM_GOALS.length);
  return RANDOM_DREAM_GOALS[idx];
}
