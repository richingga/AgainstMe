// Konfigurasi SOS Darurat Khusus Tiap Habit & Tool Interaktif (Clean UI - strictly no emojis)
export const HABIT_SOS_DATA = {
  narcotics: {
    titleId: 'Pencegah Sakau & Craving Narkotika',
    titleEn: 'Substance Craving & Relapse Blocker',
    triggerWarningId: 'Zat ini cuma minjam kebahagiaan hari esok buat hancurin tubuhmu sekarang. Lawan sensasi fisiknya, badai ini pasti lewat!',
    triggerWarningEn: 'This substance is only borrowing tomorrow’s joy to destroy your body today. Ride the wave, your body is healing!',
    actions: [
      {
        id: 'cold_water',
        iconType: 'droplet',
        titleId: 'Kompres Es / Mandi Air Dingin (Mammalian Dive Reflex)',
        titleEn: 'Ice Face Dip (Mammalian Dive Reflex)',
        descId: 'Rangsang saraf vagus untuk turunkan denyut jantung sakau & reset lonjakan adrenalin.',
        descEn: 'Trigger vagus nerve to slow down racing heart rate and reset physical adrenaline rush.'
      },
      {
        id: '478',
        iconType: 'wind',
        titleId: 'Latihan Napas 4-7-8 Stabilisasi Syaraf',
        titleEn: '4-7-8 Nervous System Calming Breath',
        descId: 'Kendalikan sistem saraf parasimpatis saat fisik gelisah atau gemetar.',
        descEn: 'Activate parasympathetic nervous system during somatic restlessness.'
      },
      {
        id: 'flush_drugs',
        iconType: 'trash',
        titleId: 'Buang / Hancurkan Stok & Putus Kontak',
        titleEn: 'Flush Stash & Delete Dealer Contact',
        descId: 'Segera siram sisa barang ke kloset dan blokir nomor penjual / teman toksik.',
        descEn: 'Immediately flush any stash down the toilet and block dealer/trigger contacts.'
      },
      {
        id: 'call_sponsor',
        iconType: 'phone',
        titleId: 'Hubungi Pendamping / BNN Hotline (184)',
        titleEn: 'Call Sponsor or Narcotics Hotline',
        descId: 'Jangan isolasi diri sendirian. Bicara ke orang terpercaya atau konselor sekarang!',
        descEn: 'Do not isolate yourself. Speak with your recovery buddy or counselor immediately!'
      }
    ]
  },
  gambling: {
    titleId: 'Pencegah Godaan Judi',
    titleEn: 'Gambling Urge Blocker',
    triggerWarningId: 'Deposit impulsif adalah jebakan ilusi. Bandarmu menang saat kamu klik transfer!',
    triggerWarningEn: 'Impulsive deposit is an illusion. The house wins the moment you hit transfer!',
    actions: [
      {
        id: '478',
        iconType: 'wind',
        titleId: 'Latihan Napas 4-7-8',
        titleEn: '4-7-8 Breathing Technique',
        descId: 'Tarik 4 detik, tahan 7 detik, hembuskan 8 detik untuk normalkan detak jantung.',
        descEn: 'Inhale 4s, hold 7s, exhale 8s to calm the nervous system.'
      },
      {
        id: 'lock_banking',
        iconType: 'lock',
        titleId: 'Kunci / Logout M-Banking Sekarang',
        titleEn: 'Lock & Log Out Banking App',
        descId: 'Beri jeda 15 menit agar otak logismu mengambil alih nafsu deposit.',
        descEn: 'Create a 15-minute barrier to let your prefrontal cortex regain control.'
      },
      {
        id: 'cold_water',
        iconType: 'droplet',
        titleId: 'Basuh Muka dengan Air Es Dingin',
        titleEn: 'Cold Water Face Splash',
        descId: 'Aktifkan Mammalian Dive Reflex untuk meredakan dorongan impulsif seketika.',
        descEn: 'Activate mammalian dive reflex to drop heart rate instantly.'
      }
    ]
  },
  pmo: {
    titleId: 'Protokol Darurat Menolak PMO',
    titleEn: 'PMO Emergency Protocol',
    triggerWarningId: 'Layar birahi adalah racun dopamin murah yang merusak fokus dan kedaulatan dirimu!',
    triggerWarningEn: 'Pixelated lust is cheap dopamine that drains your sovereign power and focus!',
    actions: [
      {
        id: 'pushup',
        iconType: 'activity',
        titleId: 'Push-up Cepat 20 Kali',
        titleEn: 'Drop & Do 20 Push-ups',
        descId: 'Alihkan aliran darah dari organ reproduksi ke otot rangka besarmu.',
        descEn: 'Divert blood flow from reproductive organs to major skeletal muscles.'
      },
      {
        id: 'cold_water',
        iconType: 'droplet',
        titleId: 'Basuh Muka Air Es Dingin',
        titleEn: 'Cold Water Reset',
        descId: 'Guyur wajah dengan air es untuk memutuskan lingkaran pikiran kotor seketika.',
        descEn: 'Reset neurological loops by immersing face in cold water for 30s.'
      },
      {
        id: 'leave_room',
        iconType: 'log-out',
        titleId: 'Tinggalkan Kamar / Ruang Sendiri',
        titleEn: 'Leave The Private Room',
        descId: 'Pergi ke ruang tamu atau tempat umum. Jangan pernah berduaan dengan HP di kamar tertutup!',
        descEn: 'Step out into a public or shared space. Never stay isolated with a screen!'
      }
    ]
  },
  tobacco: {
    titleId: 'Penahan Sakau Nikotin Rokok & Vape',
    titleEn: 'Nicotine Craving Defense',
    triggerWarningId: 'Puncak sakau nikotin cuma berlangsung 3-5 menit. Tubuhmu sedang membersihkan racun!',
    triggerWarningEn: 'Nicotine craving wave peaks at 3-5 minutes. Your lungs are detoxifying right now!',
    actions: [
      {
        id: 'cold_water',
        iconType: 'droplet',
        titleId: 'Minum Segelas Air Dingin Pelan-Pelan',
        titleEn: 'Sip a Glass of Ice-Cold Water',
        descId: 'Gunakan sedotan atau teguk perlahan untuk memuaskan fiksasi oral tanpa asap.',
        descEn: 'Satisfy oral fixation through cold water sips and cleanse oral receptors.'
      },
      {
        id: '478',
        iconType: 'wind',
        titleId: 'Latihan Napas 4-7-8 Paru-Paru',
        titleEn: 'Deep Lung Breathing (4-7-8)',
        descId: 'Gantikan tarikan asap beracun dengan udara bersih yang menyegarkan otak.',
        descEn: 'Replace toxic smoke inhale with pure calming oxygen.'
      },
      {
        id: 'candy',
        iconType: 'sparkles',
        titleId: 'Kunyah Permen Karet / Permen Mint Pedas',
        titleEn: 'Chew Strong Mint Candy or Gum',
        descId: 'Rasa menthol pedas memberikan sensasi tenggorokan pengganti hisapan nikotin.',
        descEn: 'Strong mint shock satisfies throat hit sensations.'
      }
    ]
  },
  alcohol: {
    titleId: 'Penahan Dorongan Alkohol',
    titleEn: 'Alcohol Urge Defense',
    triggerWarningId: 'Segelas racun ini akan menghapus semua progres kesehatan dan kendali emosimu!',
    triggerWarningEn: 'A single drink will derail your mental clarity and vital organ recovery!',
    actions: [
      {
        id: 'hydrate',
        iconType: 'droplet',
        titleId: 'Minum 500ml Air Putih / Isotonik',
        titleEn: 'Down 500ml of Cold Water / Electrolytes',
        descId: 'Dehidrasi sering kali disalahartikan tubuh sebagai dorongan ingin minum alkohol.',
        descEn: 'Dehydration is frequently misinterpreted by the brain as alcohol craving.'
      },
      {
        id: 'cold_water',
        iconType: 'droplet',
        titleId: 'Basuh Leher & Muka Air Es',
        titleEn: 'Cold Water Reset',
        descId: 'Dinginkan sensor saraf di leher untuk meredakan ketegangan tubuh.',
        descEn: 'Cool down neck receptors to alleviate physical tension.'
      },
      {
        id: 'leave_venue',
        iconType: 'log-out',
        titleId: 'Tinggalkan Lingkungan Pemicu Sekarang',
        titleEn: 'Leave The Drinking Setting Now',
        descId: 'Jangan uji kekuatanmu di dekat botol atau tongkrongan mabuk. Segera pulang!',
        descEn: 'Do not test willpower near trigger environments. Remove yourself immediately!'
      }
    ]
  }
};
