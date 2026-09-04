export const pmoLevels = [
  { 
    maxDay: 3, 
    rank: 'Rank 1', 
    title: { en: 'Awakening Slave', id: 'Budak Impuls' }, 
    quote: { 
      en: 'The chains are breaking. The first 72 hours are purely about reclaiming your awareness.', 
      id: 'Rantai mulai goyah. 72 jam pertama adalah perang memperebutkan kesadaranmu kembali.' 
    } 
  },
  { 
    maxDay: 7, 
    rank: 'Rank 2', 
    title: { en: 'Struggling Rebel', id: 'Pemberontak' }, 
    quote: { 
      en: '1 week clean! Your dopamine receptors are starving for drama, but you denied them.', 
      id: '1 minggu bersih! Reseptor dopaminmu lagi kelaparan sensasi, tapi kamu tolak mentah-mentah.' 
    } 
  },
  { 
    maxDay: 21, 
    rank: 'Rank 3', 
    title: { en: 'Free Citizen', id: 'Warga Bebas' }, 
    quote: { 
      en: '21 days formed a new neural pathway. The fog is finally clearing from your mind.', 
      id: '21 hari membentuk jalur otak baru. Kabut otak mulai hilang, fokusmu kembali tajam.' 
    } 
  },
  { 
    maxDay: 60, 
    rank: 'Rank 4', 
    title: { en: 'Independent Citizen', id: 'Warga Mandiri' }, 
    quote: { 
      en: 'Your brain has washed out false dopamine loops. You are no longer a slave to impulses!', 
      id: 'Otakmu sudah membersihkan jalur dopamin palsu. Kamu bukan lagi budak impuls, kendali hidup ada di tanganmu!' 
    } 
  },
  { 
    maxDay: 90, 
    rank: 'Rank 5', 
    title: { en: 'Master of Self', id: 'Penakluk Nafsu' }, 
    quote: { 
      en: 'The reboot is nearly complete. Freedom is no longer an effort, it is who you are.', 
      id: 'Reboot otak hampir tuntas. Kebebasan bukan lagi perjuangan keras, tapi gaya hidup barumu.' 
    } 
  },
  { 
    maxDay: 9999, 
    rank: 'Rank 6', 
    title: { en: 'Sovereign Mind', id: 'Pria Berdaulat' }, 
    quote: { 
      en: 'Total mastery. You command your thoughts and body with unshakable sovereignty.', 
      id: 'Penguasaan total. Jiwa dan ragamu berdiri tegak tanpa bisa disandera layar kecil.' 
    } 
  }
];

export function getPmoRank(days, lang = 'id') {
  const lvl = pmoLevels.find(l => days <= l.maxDay) || pmoLevels[pmoLevels.length - 1];
  const prevMax = pmoLevels[pmoLevels.indexOf(lvl) - 1]?.maxDay || 0;
  const span = lvl.maxDay - prevMax;
  const cur = days - prevMax;
  const pct = Math.min(100, Math.max(10, Math.round((cur / span) * 100)));

  return {
    rank: lvl.rank,
    title: lvl.title[lang] || lvl.title['en'],
    quote: lvl.quote[lang] || lvl.quote['en'],
    maxDay: lvl.maxDay,
    pct
  };
}
