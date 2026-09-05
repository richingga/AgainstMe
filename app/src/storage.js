// Engine Sinkronisasi Dua Arah: Server (Registered) vs LocalStorage (Guest)
const STORAGE_KEY = 'againstme_state_v1';
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')
  ? `http://${window.location.hostname}:8090/api`
  : 'https://api.againstme.my.id/api';

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
  communityPosts: [],
  checkins: [],
  chatMessages: []
};

// 1. Load data lokal untuk Guest
export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialAppData;
    const parsed = JSON.parse(raw);
    // Filter postingan dummy lokal lama (id: p1, p2, p3) agar feed 100% murni server
    const rawPosts = parsed.communityPosts || [];
    const cleanLocalPosts = Array.isArray(rawPosts) ? rawPosts.filter(p => p && !['p1', 'p2', 'p3'].includes(p.id)) : [];

    return { 
      ...initialAppData,
      ...parsed,
      user: { ...initialAppData.user, ...(parsed.user || {}) },
      communityPosts: cleanLocalPosts,
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

// 7. API Admin: Ambil Daftar Seluruh Pengguna
export async function fetchAdminUsers(adminUsername) {
  const resp = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUser: adminUsername })
  });
  return await resp.json();
}

// 8. API Admin: Ban / Unban Pengguna
export async function banUserByAdmin(adminUsername, targetUsername, isBan) {
  const resp = await fetch(`${API_BASE_URL}/admin/ban-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUser: adminUsername, targetUser: targetUsername, ban: isBan })
  });
  return await resp.json();
}

// 9. POST Komunitas Baru (Simpan ke Server)
export async function postToCommunity(postData) {
  const resp = await fetch(`${API_BASE_URL}/community/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData)
  });
  return await resp.json();
}

// 10. GET Feed Komunitas Global
export async function fetchCommunityFeed() {
  const resp = await fetch(`${API_BASE_URL}/community/feed`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  return await resp.json();
}

// 11. Like/Unlike Post Komunitas
export async function toggleCommunityLike(postId, username, action) {
  const resp = await fetch(`${API_BASE_URL}/community/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, username, action })
  });
  return await resp.json();
}

// 12. Delete Post Komunitas
export async function deleteCommunityPost(postId, username) {
  const resp = await fetch(`${API_BASE_URL}/community/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, username })
  });
  return await resp.json();
}

