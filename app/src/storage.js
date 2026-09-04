// Engine Sinkronisasi Dua Arah: Server (Registered) vs LocalStorage (Guest)
const STORAGE_KEY = 'againstme_state_v1';
const API_BASE_URL = `http://${window.location.hostname}:8090/api`;

export const initialAppData = {
  hasOnboarded: false,
  lang: 'id', // 'id' | 'en'
  isRegistered: false, // true jika terdaftar di server
  lastReadMentionsTime: Date.now(), // timestamp tanda sudah baca mention
  lastReadChatTime: Date.now(), // timestamp tanda sudah baca chat Maya
  aiProactiveHistory: [], // daftar id event proaktif yang sudah dikirimkan agar tidak duplikat
  streakFreezes: {
    available: 1, // jatah freeze bulanan
    lastGrantedMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
    usedDates: [] // tanggal ISO streak freeze digunakan
  },
  urgeLogs: [], // [{ id, timestamp: ISO, habit, trigger, intensity, note }]
  user: {
    name: 'Rocky',
    username: 'rocky_warrior',
    email: '',
    bio: 'Menolak kalah dari diri sendiri.',
    avatar: 'R',
    photoUrl: null,
    memberSince: new Date().toISOString()
  },
  activeHabit: '',
  habits: {
    gambling: {
      active: false,
      startDate: null,
      savedTotal: 0,
      urgeCount: 0,
      history: [],
      relapses: [] // [{ date: ISO, reason: '' }]
    },
    pmo: {
      active: false,
      startDate: null,
      relapses: []
    },
    tobacco: {
      active: false,
      startDate: null,
      cigsPerDay: 16,
      packPrice: 35000,
      cigsPerPack: 20,
      savingsGoal: { name: 'HP Baru', target: 2000000 },
      relapses: []
    },
    alcohol: {
      active: false,
      startDate: null,
      drinksPerWeek: 4,
      drinkSessionCost: 150000,
      relapses: []
    }
  },
  communityPosts: [
    {
      id: 'p1',
      author: 'Dimas',
      username: 'dimas_clean',
      habit: 'PMO',
      streakDays: 14,
      time: '15m ago',
      timeId: '15m lalu',
      content: 'Hari ke-14 bebas PMO! Kuncinya kalau otak mulai mikir aneh-aneh pas malam, langsung lempar HP ke meja terus push-up 20 kali. Semangat buat @rocky_warrior dan kawan-kawan! 🔥',
      likes: 12,
      isLiked: false
    },
    {
      id: 'p2',
      author: 'Bayu',
      username: 'bayu_anti_slot',
      habit: 'Judi',
      streakDays: 30,
      time: '1h ago',
      timeId: '1j lalu',
      content: 'Satu bulan penuh gak deposit receh maupun gede. Dulu ngerasa rugi kalau gak balas kekalahan, sekarang sadar kalau gak main itu udah auto menang 100%. Uang tabungan utuh!',
      likes: 28,
      isLiked: true
    },
    {
      id: 'p3',
      author: 'Eko',
      username: 'eko_fresh',
      habit: 'Rokok',
      streakDays: 7,
      time: '3h ago',
      timeId: '3j lalu',
      content: 'Nafas udah mulai lega, gak batuk pas bangun tidur. @dimas_clean makasih sarannya buat selalu bawa permen jahe pas nongkrong bareng temen!',
      likes: 9,
      isLiked: false
    }
  ],
  checkins: [],
  chatMessages: []
};

// 1. Load data lokal untuk Guest
export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialAppData;
    const parsed = JSON.parse(raw);
    return { 
      ...initialAppData, 
      ...parsed,
      user: { ...initialAppData.user, ...(parsed.user || {}) },
      communityPosts: parsed.communityPosts || initialAppData.communityPosts,
      chatMessages: parsed.chatMessages || [],
      aiProactiveHistory: parsed.aiProactiveHistory || [],
      lastReadChatTime: parsed.lastReadChatTime || Date.now(),
      streakFreezes: parsed.streakFreezes || initialAppData.streakFreezes,
      urgeLogs: parsed.urgeLogs || []
    };
  } catch (err) {
    console.error('Failed to load local state', err);
    return initialAppData;
  }
}

  // 2. Simpan data: Jika terdaftar kirim ke Server DB, sekaligus backup ke LocalStorage
export async function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Jika user sudah terdaftar di server, sync langsung ke Server API
    if (state.isRegistered && state.user?.username) {
      fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: state.user.username,
          user: state.user,
          state: {
            activeHabit: state.activeHabit,
            habits: state.habits,
            checkins: state.checkins,
            lang: state.lang,
            chatMessages: state.chatMessages || [],
            // Simpan timestamp sinkronisasi terakhir agar server mencatat progres terus berlanjut
            lastSyncedAt: new Date().toISOString()
          }
        })
      }).catch(e => console.warn('Server sync background notice:', e));
    }
  } catch (err) {
    console.error('Failed to save state', err);
  }
}

// 3. API Pendaftaran Akun ke Server
export async function registerUserOnServer({ name, username, email, password, currentState }) {
  const resp = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      username,
      email,
      password,
      state: currentState
    })
  });
  return await resp.json();
}

// 4. API Login Akun ke Server (Menarik data dari DB Server)
export async function loginUserOnServer(emailOrUsername, password) {
  const resp = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailOrUsername,
      password
    })
  });
  return await resp.json();
}

// 5. API Reset Password Akun (Verifikasi Username + Email)
export async function resetPasswordOnServer(identifier, email, newPassword) {
  const resp = await fetch(`${API_BASE_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier,
      email,
      newPassword
    })
  });
  return await resp.json();
}

// 6. API Hapus Akun Permanen (Wajib Google Play Store Compliance)
export async function deleteAccountOnServer(username, password) {
  const resp = await fetch(`${API_BASE_URL}/delete-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password
    })
  });
  return await resp.json();
}

