import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getPmoRank } from '../constants/pmo';
import { formatCurrency, formatNumberInput, parseNumberInput } from '../utils/currency';
import { API_BASE_URL, registerUserOnServer, loginUserOnServer, resetPasswordOnServer, deleteAccountOnServer, fetchAdminUsers, banUserByAdmin, postToCommunity, fetchCommunityFeed, toggleCommunityLike, deleteCommunityPost } from '../storage';
import { getRandomGoal } from '../constants/goals';
import { HABIT_SOS_DATA } from '../constants/sosData';
import SmartBreathingModal from './SmartBreathingModal';
import ColdWaterModal from './ColdWaterModal';
import { generateStreakStoryCanvas } from '../utils/storyCanvas';
import { BADGE_DEFINITIONS, getWarriorRank } from '../constants/badges';
import { HEALTH_RECOVERY_DATA } from '../constants/healthRecovery';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

export default function Homescreen({ appState, updateAppState, onReset }) {
  const {
    user = { username: 'rocky_warrior', name: 'Rocky', email: '', photoUrl: null, bio: '', avatar: 'R' },
    lang = 'id',
    activeHabit,
    habits = {},
    communityPosts = [], 
    isRegistered = false, 
    checkins = [],
    lastReadMentionsTime = 0,
    lastReadChatTime = 0,
    aiProactiveHistory = [],
    chatMessages: savedChatMessages = [],
    streakFreezes = { available: 1, lastGrantedMonth: new Date().toISOString().slice(0, 7), usedDates: [] },
    urgeLogs = []
  } = appState;
  const habitData = habits[activeHabit] || {};

  // Fungsi simpan check-in mood harian (1 hari = 1 pilihan, bisa diganti kapan saja)
  async function handleSaveCheckin(moodId, moodLabel) {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Filter buang checkin hari ini agar selalu tersisa 1 pilihan untuk hari ini
    const otherDaysCheckins = (appState.checkins || []).filter(c => {
      const cDate = (c.timestamp || '').split('T')[0];
      return cDate !== todayStr;
    });

    const currentCheckin = {
      id: 'chk_' + Date.now(),
      habit: activeHabit,
      moodId,
      moodLabel,
      date: todayStr,
      timestamp: new Date().toISOString()
    };

    const updatedCheckins = [currentCheckin, ...otherDaysCheckins];
    updateAppState({ checkins: updatedCheckins });
    // Check-in tidak lagi memunculkan toast/notif mengganggu

    // Auto-share progres check-in ke Komunitas Pejuang jika user terdaftar
    if (isRegistered && user?.username) {
      const currentDays = timeDiff.days || 0;
      const targetHabitName = habitLabelMap[activeHabit] || 'PMO';
      const myRank = currentWarriorRank.title || 'Inisiat Pejuang';

      // Susun pesan natural check-in tanpa strip (-)
      const autoPostContent = lang === 'id'
        ? `Hari ke ${currentDays} tanpa ${targetHabitName}! Kondisiku hari ini terasa: ${moodLabel}. Tetap semangat berjuang bareng kawan kawan pejuang! 🔥`
        : `Day ${currentDays} free from ${targetHabitName}! Feeling ${moodLabel} today. Keep fighting together everyone! 🔥`;

      const autoCheckinPost = {
        id: String(Date.now()),
        userId: user?.username || 'user',
        username: user?.username || 'pejuang',
        name: user?.name || user?.username || 'Pejuang',
        avatar: (user?.name || 'P')[0].toUpperCase(),
        photoUrl: user?.photoUrl || null,
        habit: targetHabitName,
        streakDays: currentDays,
        rank: myRank,
        time: 'Just now',
        timeId: 'Barusan',
        content: autoPostContent,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        isLiked: false
      };

      // Optimistic update feed lokal
      updateAppState(prev => ({
        ...prev,
        communityPosts: [autoCheckinPost, ...(prev.communityPosts || [])]
      }));

      // Kirim ke server di latar belakang
      try {
        await postToCommunity(autoCheckinPost);
      } catch (err) {
        console.warn('Gagal sync auto check-in post:', err);
      }
    }
  }

  // Helper hitung waktu relatif dinamis (nyata)
  function getRelativeTimeStr(dateInput, targetLang = 'id') {
    if (!dateInput) return targetLang === 'id' ? 'Barusan' : 'Just now';
    const postTime = new Date(dateInput).getTime();
    if (isNaN(postTime)) return targetLang === 'id' ? 'Barusan' : 'Just now';
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - postTime) / 1000));
    
    if (diffSec < 60) return targetLang === 'id' ? 'Barusan' : 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return targetLang === 'id' ? `${diffMin} menit lalu` : `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return targetLang === 'id' ? `${diffHour} jam lalu` : `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return targetLang === 'id' ? `${diffDay} hari lalu` : `${diffDay}d ago`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return targetLang === 'id' ? `${diffWeek} minggu lalu` : `${diffWeek}w ago`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return targetLang === 'id' ? `${diffMonth} bulan lalu` : `${diffMonth}mo ago`;
    const diffYear = Math.floor(diffDay / 365);
    return targetLang === 'id' ? `${diffYear} tahun lalu` : `${diffYear}y ago`;
  }

  // Modals / Sheets state
  const [activeSheet, setActiveSheet] = useState(null); 
  const [toastMsg, setToastMsg] = useState(null);

  // Health Timeline, Urge Heatmap & Streak Freeze State
  const [activeHealthTab, setActiveHealthTab] = useState('timeline'); // 'timeline' | 'heatmap'
  const [urgeIntensity, setUrgeIntensity] = useState(3);
  const [urgeTriggerInput, setUrgeTriggerInput] = useState('');
  const [isLogUrgeModalOpen, setIsLogUrgeModalOpen] = useState(false);

  // Trofi & Badge Gallery State
  const [badgeCategoryTab, setBadgeCategoryTab] = useState('all'); // 'all' | 'streak' | 'financial' | 'mindset'
  const [selectedBadgeModal, setSelectedBadgeModal] = useState(null);

  // Hapus Akun & Data State (Google Play Requirement)
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Admin Moderation Console State (Khusus akun @admin)
  const isAdmin = user?.username === 'admin';
  const [adminUsersList, setAdminUsersList] = useState([]);
  const [isLoadingAdminUsers, setIsLoadingAdminUsers] = useState(false);

  // Touch gesture state untuk swipe/slide ganti habit
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  // Dedicated interactive SOS modals
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [isColdWaterOpen, setIsColdWaterOpen] = useState(false);

  // State Konfirmasi Hapus / Nonaktifkan Habit (Warning Data Hilang)
  const [habitToDelete, setHabitToDelete] = useState(null);

  // State Popup Setup Kalkulasi Habit Baru (seperti Onboarding)
  const [habitToConfigure, setHabitToConfigure] = useState(null);
  const [newHabitStartDate, setNewHabitStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newHabitCigsPerDay, setNewHabitCigsPerDay] = useState(16);
  const [newHabitCigsPerPack, setNewHabitCigsPerPack] = useState(20);
  const [newHabitPackPrice, setNewHabitPackPrice] = useState('35.000');
  const [newHabitDrinksPerWeek, setNewHabitDrinksPerWeek] = useState(4);
  const [newHabitSessionCost, setNewHabitSessionCost] = useState('150.000');
  const [newHabitDoseCost, setNewHabitDoseCost] = useState('200.000');
  const [newHabitDosePeriod, setNewHabitDosePeriod] = useState('day'); // 'day' | 'week' | 'month'

  // State Letter to Future Self
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterContent, setLetterContent] = useState('');
  const [letterUnlockDays, setLetterUnlockDays] = useState(30);
  const [isViewingLetter, setIsViewingLetter] = useState(false);

  // State Shareable Streak Card
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState('');

  // Relapse form state
  const [relapseReason, setRelapseReason] = useState(lang === 'id' ? 'Stres / Beban Pikiran' : 'Stress');
  const [relapseNotes, setRelapseNotes] = useState('');

  // Komunitas state
  const [postInput, setPostInput] = useState('');
  const [communityTab, setCommunityTab] = useState('all'); // 'all' | 'mentions'

  // Auth (Register / Login) Modal state
  const [authMode, setAuthMode] = useState('register');
  const [authName, setAuthName] = useState(user.name || '');
  const [authUsername, setAuthUsername] = useState(user.username || '');
  const [authEmail, setAuthEmail] = useState(user.email || '');
  const [authPassword, setAuthPassword] = useState('');
  const [authViewMode, setAuthViewMode] = useState('auth'); // 'auth' | 'forgot'
  const [authForgotIdentifier, setAuthForgotIdentifier] = useState('');
  const [authForgotEmail, setAuthForgotEmail] = useState('');
  const [authForgotNewPassword, setAuthForgotNewPassword] = useState('');

  // Edit Profile state
  const [editName, setEditName] = useState(user.name || '');
  const [editUsername, setEditUsername] = useState(user.username || '');
  const [editBio, setEditBio] = useState(user.bio || '');
  const [editPhotoPreview, setEditPhotoPreview] = useState(user.photoUrl || null);
  const fileInputRef = useRef(null);
  const backupFileInputRef = useRef(null);

  // Edit Goal (Barang Impian) state
  const activeGoal = habitData.savingsGoal || appState.sharedGoal || {
    name: 'Kaset Game GTA 6 & PS5 Pro',
    nameEn: 'GTA 6 Copy & PS5 Pro',
    target: 14000000,
    icon: '🎮'
  };
  const [goalNameInput, setGoalNameInput] = useState(activeGoal.name || '');
  const [goalTargetInput, setGoalTargetInput] = useState(formatNumberInput(activeGoal.target || 14000000));

  // Form input catat godaan manual
  const [customUrgeAmountFormatted, setCustomUrgeAmountFormatted] = useState('');
  const [customUrgeTrigger, setCustomUrgeTrigger] = useState(lang === 'id' ? 'Bosan' : 'Boredom');

  // Input edit tanggal berhenti
  const todayStr = new Date().toISOString().split('T')[0];
  const currentHabitDate = habitData.startDate ? habitData.startDate.split('T')[0] : todayStr;
  const [editDateValue, setEditDateValue] = useState(currentHabitDate);

  // Chat AI State (Persisten: dimuat dari appState / localStorage agar saat refresh history tetap ada)
  const defaultInitialChat = [
    {
      id: 'm1',
      sender: 'ai',
      text: lang === 'id' 
        ? `Hai ${user.name || 'kamu'}, aku Maya, kalau butuh temen ngobrol, cerita ke aku yaa..`
        : `Hey ${user.name || 'there'}, I'm Maya. If you need someone to talk to, just share with me..`
    }
  ];

  const [chatMessages, setChatMessages] = useState(() => {
    if (savedChatMessages && savedChatMessages.length > 0) {
      return savedChatMessages;
    }
    return defaultInitialChat;
  });
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Live timer calculation (ditaruh sebelum effect dan kalkulasi lain agar tidak ReferenceError)
  const [timeDiff, setTimeDiff] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function tick() {
      const start = new Date(habitData.startDate || Date.now()).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - start) / 1000));

      setTimeDiff({
        days: Math.floor(diffSec / 86400),
        hours: Math.floor((diffSec % 86400) / 3600),
        minutes: Math.floor((diffSec % 3600) / 60),
        seconds: diffSec % 60
      });
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [habitData.startDate]);

  // Sync state lokal chat ke global appState saat pesan bertambah
  function updateAndPersistChat(newMessages) {
    setChatMessages(newMessages);
    updateAppState({ chatMessages: newMessages });
  }

  // Load feed komunitas dari server saat buka tab komunitas atau saat aplikasi pertama dimuat
  useEffect(() => {
    function loadFeed() {
      fetchCommunityFeed()
        .then(res => {
          if (res && res.posts) {
            // Normalisasi post agar kompatibel dengan feed frontend (author & habit & streakDays & rank)
            // Filter buang dummy post lama jika ada yang nyasar
            const normalizedPosts = res.posts
              .filter(p => p && !['p1', 'p2', 'p3'].includes(p.id))
              .map(p => ({
                ...p,
                author: p.name || p.author || p.username || 'Pejuang',
                habit: p.habit || 'PMO',
                streakDays: p.streakDays !== undefined ? p.streakDays : (p.streak_days !== undefined ? p.streak_days : 0),
                rank: p.rank || 'Inisiat Pejuang',
                timeId: p.timeId || p.time_str || 'Barusan',
                time: p.time || p.time_str || 'Just now',
                isLiked: (p.likedBy || []).includes(user?.username || '')
              }));
            updateAppState({ communityPosts: normalizedPosts });
          }
        })
        .catch(err => console.error('Failed to fetch community feed:', err));
    }

    loadFeed();

    // Auto-polling setiap 3 detik jika tab komunitas aktif agar obrolan antar HP & PC langsung nyaut
    let pollInterval = null;
    if (activeSheet === 'community') {
      pollInterval = setInterval(loadFeed, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeSheet, user?.username]);

  // Hitung jumlah chat AI yang belum dibaca (pesan AI yang masuk setelah lastReadChatTime)
  const unreadAiCount = chatMessages.filter(m => {
    if (m.sender !== 'ai') return false;
    const msgTime = Number(m.id) || 0;
    return msgTime > (lastReadChatTime || 0);
  }).length;

  // AI Maya Proactive Check-in: memeriksa milestone streak & sapaan harian
  useEffect(() => {
    if (!activeHabit) return;
    const currentDays = timeDiff.days || 0;
    const milestoneDays = [1, 3, 7, 14, 30, 60, 90, 180, 365];
    const habitName = habitLabelMap[activeHabit] || activeHabit;
    const userName = user.name || 'kamu';

    let triggeredEventId = null;
    let proactiveText = null;

    // 1. Cek Milestone Streak (1, 3, 7, 14, dst.)
    if (milestoneDays.includes(currentDays)) {
      const eventKey = `milestone_${activeHabit}_${currentDays}`;
      if (!aiProactiveHistory.includes(eventKey)) {
        triggeredEventId = eventKey;
        proactiveText = lang === 'id'
          ? `Hai ${userName}, selamat yaa! Kamu udah berhasil bertahan ${currentDays} hari di kebiasaan ${habitName}. Aku bangga banget sama konsistensimu, terus melangkah yaa!`
          : `Hey ${userName}, congratulations! You made it to day ${currentDays} on ${habitName}. So proud of your consistency, keep going!`;
      }
    }

    // 2. Jika bukan milestone, cek sapaan harian jika belum check-in
    if (!triggeredEventId) {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const checkinToday = (checkins || []).some(c => c.date === todayDateStr);
      const dailyGreetKey = `daily_check_${todayDateStr}`;

      if (!checkinToday && !aiProactiveHistory.includes(dailyGreetKey)) {
        triggeredEventId = dailyGreetKey;
        proactiveText = lang === 'id'
          ? `Hai ${userName}, gimana kabarmu hari ini? Kalau ada godaan atau lagi gelisah, cerita ke aku yaa..`
          : `Hey ${userName}, how is your day going? If you feel any cravings or tension, just share with me..`;
      }
    }

    if (triggeredEventId && proactiveText) {
      const newAiMsg = {
        id: Date.now().toString(),
        sender: 'ai',
        text: proactiveText
      };
      const updatedList = [...chatMessages, newAiMsg];
      const updatedHistory = [...aiProactiveHistory, triggeredEventId];
      setChatMessages(updatedList);
      updateAppState({
        chatMessages: updatedList,
        aiProactiveHistory: updatedHistory
      });
    }
  }, [activeHabit, timeDiff.days, checkins]);

  useEffect(() => {
    if (habitData.startDate) {
      setEditDateValue(habitData.startDate.split('T')[0]);
    }
  }, [habitData.startDate, activeHabit]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }

  const myUsernameTag = `@${user.username || 'rocky_warrior'}`.toLowerCase();
  const mentionPosts = communityPosts.filter(p => p.content.toLowerCase().includes(myUsernameTag));
  // Filter postingan yang men-tag user dan dibuat SETELAH waktu terakhir user membuka tab komunitas
  const unreadMentionPosts = communityPosts.filter(p => {
    const mentionsMe = p.content.toLowerCase().includes(myUsernameTag);
    if (!mentionsMe) return false;
    const postTimestamp = Number(p.id) || 0;
    return postTimestamp > (lastReadMentionsTime || 0);
  });
  const unreadMentionCount = unreadMentionPosts.length;

  // Hitung uang hemat untuk rokok, alkohol, rehab (narkotika), atau judi
  const totalMoneySavedRaw = (() => {
    if (activeHabit === 'narcotics') {
      const totalDays = timeDiff.days + (timeDiff.hours / 24);
      let costPerDay = 200000;
      if (habitData.dosePeriod === 'month') {
        costPerDay = (habitData.doseCost || 6000000) / 30;
      } else if (habitData.dosePeriod === 'week') {
        costPerDay = (habitData.doseCost || 1400000) / 7;
      } else {
        costPerDay = habitData.doseCost || habitData.dailyDoseCost || 200000;
      }
      return Math.round(totalDays * costPerDay);
    }
    if (activeHabit === 'tobacco') {
      const totalDays = timeDiff.days + (timeDiff.hours / 24);
      const costPerDay = ((habitData.cigsPerDay || 16) / (habitData.cigsPerPack || 20)) * (habitData.packPrice || 35000);
      return Math.round(totalDays * costPerDay);
    }
    if (activeHabit === 'alcohol') {
      const totalDays = timeDiff.days + (timeDiff.hours / 24);
      const costPerDay = ((habitData.drinksPerWeek || 4) * (habitData.drinkSessionCost || 150000)) / 7;
      return Math.round(totalDays * costPerDay);
    }
    if (activeHabit === 'gambling') {
      return habitData.savedTotal || 0;
    }
    return 0;
  })();

  const pmoInfo = getPmoRank(timeDiff.days, lang);

  const habitLabelMap = {
    narcotics: 'Rehab',
    gambling: lang === 'id' ? 'Judi' : 'Gambling',
    pmo: 'PMO',
    tobacco: lang === 'id' ? 'Rokok' : 'Tobacco',
    alcohol: lang === 'id' ? 'Alkohol' : 'Alcohol'
  };

  const activeHabitKeys = Object.keys(habits).filter(k => habits[k]?.active);

  // Perhitungan progress % terhadap barang impian
  const currentGoalTarget = activeGoal.target || 14000000;
  const goalProgressPct = Math.min(100, Math.round((totalMoneySavedRaw / currentGoalTarget) * 100));

  // Hitung akumulasi statistik untuk Badge & Achievement (Memoized agar tidak looping berat per detik)
  const userStats = useMemo(() => {
    try {
      let maxDays = Number(timeDiff?.days) || 0;
      if (habits && typeof habits === 'object') {
        Object.keys(habits).forEach(k => {
          if (habits[k]?.startDate) {
            const start = new Date(habits[k].startDate).getTime();
            if (!isNaN(start)) {
              const days = Math.max(0, Math.floor((Date.now() - start) / (1000 * 86400)));
              if (days > maxDays) maxDays = days;
            }
          }
        });
      }

      const hasFutureLetter = habits && typeof habits === 'object' 
        ? Object.keys(habits).some(k => !!habits[k]?.futureLetter)
        : false;
      const myPostCount = (Array.isArray(communityPosts) ? communityPosts : []).filter(p => p && p.username === user?.username).length;
      const myLikesGiven = (Array.isArray(communityPosts) ? communityPosts : []).filter(p => p && p.isLiked).length;

      return {
        totalDays: maxDays,
        totalSaved: Number(totalMoneySavedRaw) || 0,
        hasFutureLetter,
        communityInteractions: myPostCount + myLikesGiven
      };
    } catch (err) {
      console.error('Error calculating userStats for badges:', err);
      return { totalDays: 0, totalSaved: 0, hasFutureLetter: false, communityInteractions: 0 };
    }
  }, [timeDiff.days, habits, totalMoneySavedRaw, communityPosts, user?.username]);

  // Memoized daftar trofi terbuka & tertutup serta Gelar Kedaulatan Pejuang
  const { unlockedBadges, lockedBadges, nextTargetBadge, currentWarriorRank } = useMemo(() => {
    const unlocked = BADGE_DEFINITIONS.filter(b => {
      try { return b.checkUnlocked(userStats); } catch(e) { return false; }
    });
    const locked = BADGE_DEFINITIONS.filter(b => {
      try { return !b.checkUnlocked(userStats); } catch(e) { return true; }
    });
    const next = locked.find(b => b.category === 'streak') || locked[0] || null;
    const rankInfo = getWarriorRank(unlocked.length, lang);
    return { unlockedBadges: unlocked, lockedBadges: locked, nextTargetBadge: next, currentWarriorRank: rankInfo };
  }, [userStats, lang]);

  function requireRegistration(featureName) {
    if (!isRegistered) {
      setActiveSheet('authModal');
      showToast(lang === 'id' 
        ? `Daftar akun gratis untuk ${featureName}!` 
        : `Create a free account to ${featureName}!`);
      return false;
    }
    return true;
  }

  function handleSaveUrge() {
    const amt = parseNumberInput(customUrgeAmountFormatted);
    if (amt <= 0) {
      showToast(lang === 'id' ? 'Ketik nominal uangnya dulu ya!' : 'Please enter an amount!');
      return;
    }

    const currentHistory = habitData.history || [];
    const newEntry = {
      id: Date.now().toString(),
      when: lang === 'id' ? 'Barusan' : 'Just now',
      amount: amt,
      trigger: customUrgeTrigger
    };

    updateAppState({
      habits: {
        ...habits,
        gambling: {
          ...habitData,
          savedTotal: (habitData.savedTotal || 0) + amt,
          urgeCount: (habitData.urgeCount || 0) + 1,
          history: [newEntry, ...currentHistory]
        }
      }
    });

    setCustomUrgeAmountFormatted('');
    setActiveSheet(null);
    showToast(lang === 'id' 
      ? `Hebat! ${formatCurrency(amt, lang)} masuk Celengan Penyelamat!` 
      : `Awesome! ${formatCurrency(amt, lang)} saved into piggybank!`);
  }

  function handleSaveNewDate() {
    if (!editDateValue) return;
    const todayYmd = new Date().toISOString().split('T')[0];
    const newIso = (editDateValue === todayYmd)
      ? new Date().toISOString()
      : new Date(`${editDateValue}T00:00:00`).toISOString();

    updateAppState({
      habits: {
        ...habits,
        [activeHabit]: {
          ...habitData,
          startDate: newIso
        }
      }
    });
    setActiveSheet(null);
    showToast(lang === 'id' ? 'Tanggal berhenti berhasil diperbarui!' : 'Quit date successfully updated!');
  }

  // Handle Log Godaan / Urge Tracker
  function handleSaveUrgeLog() {
    const newLog = {
      id: 'urge_' + Date.now(),
      timestamp: new Date().toISOString(),
      habit: activeHabit,
      trigger: urgeTriggerInput.trim() || (lang === 'id' ? 'Tiba-tiba / Spontan' : 'Spontaneous'),
      intensity: Number(urgeIntensity) || 3
    };

    const updatedLogs = [newLog, ...(urgeLogs || [])];
    updateAppState({ urgeLogs: updatedLogs });
    setIsLogUrgeModalOpen(false);
    setUrgeTriggerInput('');
    showToast(lang === 'id' ? 'Godaan berhasil dicatat & kamu tetap bertahan!' : 'Urge logged & you held strong!');
  }

  // Handle Gunakan Streak Freeze 1x Sebulan
  function handleUseStreakFreeze() {
    const todayStr = new Date().toISOString().split('T')[0];
    const curMonth = todayStr.slice(0, 7);
    
    let freezeState = streakFreezes || { available: 1, lastGrantedMonth: curMonth, usedDates: [] };
    if (freezeState.lastGrantedMonth !== curMonth) {
      freezeState = { available: 1, lastGrantedMonth: curMonth, usedDates: freezeState.usedDates || [] };
    }

    if (freezeState.available <= 0) {
      showToast(lang === 'id' ? 'Jatah Streak Freeze bulan ini sudah terpakai!' : 'Streak Freeze already used this month!');
      return;
    }

    const updatedFreeze = {
      available: 0,
      lastGrantedMonth: curMonth,
      usedDates: [todayStr, ...(freezeState.usedDates || [])]
    };

    updateAppState({ streakFreezes: updatedFreeze });
    showToast(lang === 'id' ? 'Streak Freeze aktif! Streak aman terlindungi hari ini.' : 'Streak Freeze activated! Streak protected today.');
  }

  // Handle Relapse (Kambuh) ramah & anti-shaming
  function handleConfirmRelapse() {
    const nowIso = new Date().toISOString();
    const existingRelapses = habitData.relapses || [];
    const newRelapseRecord = {
      id: Date.now().toString(),
      date: nowIso,
      reason: relapseReason,
      notes: relapseNotes.trim()
    };

    // Kirim pesan proaktif dari Maya untuk menguatkan user saat evaluasi kambuh
    const habitName = habitLabelMap[activeHabit] || activeHabit;
    const userName = user.name || 'kamu';
    const encouragementMsg = {
      id: Date.now().toString(),
      sender: 'ai',
      text: lang === 'id'
        ? `Hai ${userName}, aku tahu rasanya berat pas tersandung lagi di ${habitName}. Tapi ingat, perjalananmu gak balik ke nol, otakmu udah belajar berhari-hari untuk melawan. Istirahat sejenak, tarik napas, dan yuk kita mulai langkah pertama lagi bersama yaa..`
        : `Hey ${userName}, I know it feels tough to slip on ${habitName}. But remember, your journey is not zeroed out, your mind has already learned so much. Take a deep breath, and let's start taking the first step again together..`
    };
    const updatedMessages = [...chatMessages, encouragementMsg];
    setChatMessages(updatedMessages);

    updateAppState({
      chatMessages: updatedMessages,
      habits: {
        ...habits,
        [activeHabit]: {
          ...habitData,
          startDate: nowIso, // Reset titik awal ke detik ini
          relapses: [newRelapseRecord, ...existingRelapses]
        }
      }
    });

    setActiveSheet(null);
    setRelapseNotes('');
    showToast(lang === 'id' ? 'Kamu tidak gagal. Kamu cuma tersandung. Mari berdiri lagi!' : 'You did not fail. You slipped. Stand up and conquer!');
  }

  // Handle Ubah Goal Barang Impian (Bisa kustom atau Randomize)
  function handleSaveGoal(customGoalObj) {
    const newGoal = customGoalObj || {
      name: goalNameInput.trim() || 'Barang Impian',
      target: parseNumberInput(goalTargetInput) || 14000000,
      icon: '🎯'
    };

    updateAppState({
      sharedGoal: newGoal,
      habits: {
        ...habits,
        [activeHabit]: {
          ...habitData,
          savingsGoal: newGoal
        }
      }
    });
    setActiveSheet(null);
    showToast(lang === 'id' ? 'Target barang impian diperbarui!' : 'Dream goal updated!');
  }

  function handleRandomizeGoal() {
    const rand = getRandomGoal();
    const newGoal = {
      name: lang === 'id' ? rand.nameId : rand.nameEn,
      nameEn: rand.nameEn,
      target: rand.cost,
      icon: rand.icon,
      isCustom: false
    };
    setGoalNameInput(newGoal.name);
    setGoalTargetInput(formatNumberInput(newGoal.target));
    handleSaveGoal(newGoal);
  }

  // Handle posting ke feed komunitas dengan validasi filter kata terlarang
  async function handleCreatePost() {
    if (!requireRegistration(lang === 'id' ? 'membuat postingan di Komunitas' : 'post in the Community')) return;
    if (!postInput.trim()) return;

    const newPost = {
      id: String(Date.now()),
      userId: user?.username || 'user',
      username: user?.username || 'pejuang',
      name: user?.name || user?.username || 'Pejuang',
      avatar: (user?.name || 'Rocky')[0].toUpperCase(),
      photoUrl: user?.photoUrl || null,
      habit: habitLabelMap[activeHabit] || 'PMO',
      streakDays: timeDiff.days || 0,
      rank: currentWarriorRank.title || 'Inisiat Pejuang',
      time: 'Just now',
      timeId: 'Barusan',
      content: postInput.trim().replace(/Hari ke-(\d+)/gi, 'Hari ke $1').replace(/Hari-ke/gi, 'Hari ke'),
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      isLiked: false
    };

    // 1. Update State Lokal Langsung (Optimistic UI - Dijamin tidak stuck offline)
    updateAppState({
      communityPosts: [newPost, ...communityPosts]
    });
    setPostInput('');
    showToast(lang === 'id' ? 'Ceritamu terbit di komunitas!' : 'Post published to community!');

    // 2. Sync ke Server di Background
    try {
      const res = await postToCommunity(newPost);
      if (res && res.error) {
        // Jika kena filter badwords, baru beri peringatan dan rollback
        showToast(res.error);
        updateAppState({
          communityPosts: communityPosts.filter(p => p.id !== newPost.id)
        });
        return;
      }
      // Jika disensor, update konten yang disensor
      if (res && res.censored_content && res.censored_content !== newPost.content) {
        updateAppState({
          communityPosts: [
            { ...newPost, content: res.censored_content },
            ...communityPosts
          ]
        });
      }
    } catch (e) {
      console.warn('Background sync failed, kept in local state', e);
    }
  }

  // Handle Admin Hapus Postingan Komunitas
  async function handleDeleteCommunityPost(postId) {
    if (!isAdmin) return;
    if (window.confirm(lang === 'id' ? 'Hapus postingan ini dari komunitas?' : 'Delete this post?')) {
      try {
        const res = await deleteCommunityPost(postId, 'admin');
        if (res.success) {
          // Reload feed dari server
          const feedRes = await fetchCommunityFeed();
          if (feedRes.posts) {
            const cleanUpdatedPosts = feedRes.posts
              .filter(p => p && !['p1', 'p2', 'p3'].includes(p.id))
              .map(p => ({
                ...p,
                author: p.name || p.author || p.username || 'Pejuang',
                habit: p.habit || 'PMO',
                streakDays: p.streakDays !== undefined ? p.streakDays : (p.streak_days !== undefined ? p.streak_days : 0),
                rank: p.rank || 'Inisiat Pejuang',
                timeId: p.timeId || p.time_str || 'Barusan',
                time: p.time || p.time_str || 'Just now',
                isLiked: (p.likedBy || []).includes(user?.username || '')
              }));
            updateAppState({ communityPosts: cleanUpdatedPosts });
          }
          showToast(lang === 'id' ? 'Postingan berhasil dihapus' : 'Post deleted');
        } else {
          showToast(res.error || 'Gagal hapus postingan');
        }
      } catch (err) {
        showToast(lang === 'id' ? 'Gagal terhubung ke server' : 'Connection error');
      }
    }
  }

  // Handle Admin Load Users
  async function handleOpenAdminPanel() {
    setActiveSheet('adminPanel');
    setIsLoadingAdminUsers(true);
    try {
      const res = await fetchAdminUsers('admin');
      if (res.success) {
        setAdminUsersList(res.users || []);
      } else {
        showToast(res.error || 'Gagal memuat pengguna');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server');
    } finally {
      setIsLoadingAdminUsers(false);
    }
  }

  // Handle Admin Ban / Unban User
  async function handleToggleBanUser(targetUser, currentBanned) {
    const actionName = currentBanned ? 'buka blokir' : 'blokir (ban)';
    if (!window.confirm(`Yakin ingin ${actionName} @${targetUser}?`)) return;

    try {
      const res = await banUserByAdmin('admin', targetUser, !currentBanned);
      if (res.success) {
        setAdminUsersList(prev => prev.map(u => u.username === targetUser ? { ...u, isBanned: !currentBanned } : u));
        showToast(`Status @${targetUser} berhasil diperbarui`);
      } else {
        alert(res.error || 'Gagal memperbarui status user');
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan');
    }
  }

  // Handle Ekspor Backup JSON
  function handleExportBackup() {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        appName: 'AgainstMe',
        appState: appState
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `AgainstMe_Backup_${user.username || 'pejuang'}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast(lang === 'id' ? 'Cadangan data berhasil diunduh!' : 'Backup file downloaded!');
    } catch (err) {
      console.error('Export backup failed:', err);
      showToast(lang === 'id' ? 'Gagal mencadangkan data.' : 'Failed to export backup.');
    }
  }

  // Handle Impor Pulihkan Backup JSON
  function handleImportBackupFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.appState && !parsed.habits) {
          throw new Error('Format file backup tidak valid');
        }

        const restoredState = parsed.appState || parsed;
        updateAppState({
          ...restoredState,
          hasOnboarded: true
        });

        showToast(lang === 'id' ? 'Data berhasil dipulihkan secara utuh!' : 'Data restored successfully!');
        setActiveSheet(null);
      } catch (err) {
        console.error('Import backup failed:', err);
        showToast(lang === 'id' ? 'File backup tidak valid / rusak.' : 'Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleToggleLike(postId) {
    if (!requireRegistration(lang === 'id' ? 'memberikan respek' : 'give respect')) return;
    
    // Cari post untuk cek status like saat ini
    const post = communityPosts.find(p => p.id === postId);
    if (!post) return;
    
    const action = post.isLiked ? 'unlike' : 'like';
    
    try {
      const res = await toggleCommunityLike(postId, user?.username || '', action);
      if (res.success) {
        // Update lokal langsung untuk responsiveness
        const updated = communityPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              likes: res.likes,
              likedBy: res.likedBy,
              isLiked: res.likedBy.includes(user?.username || '')
            };
          }
          return p;
        });
        updateAppState({ communityPosts: updated });
      }
    } catch (err) {
      console.error('Toggle like error:', err);
    }
  }

  async function handleSendChat(textToSend) {
    const message = (textToSend || chatInput).trim();
    if (!message) return;

    if (!requireRegistration(lang === 'id' ? 'mengobrol dengan AI Companion' : 'chat with AI Companion')) return;

    const userMsg = { id: Date.now().toString(), sender: 'user', text: message };
    const updatedMessages = [...chatMessages, userMsg];
    updateAndPersistChat(updatedMessages);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const chatApiUrl = `${API_BASE_URL}/chat`;
      const res = await fetch(chatApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.username || 'guest_rocky',
          messages: updatedMessages,
          userContext: {
            name: user.name || 'Rocky',
            username: user.username || 'rocky',
            habits: activeHabitKeys.map(k => habitLabelMap[k] || k),
            days: timeDiff.days || 0
          }
        })
      });
      const data = await res.json();
      const reply = data.reply || (lang === 'id' ? 'Aku di sini nemenin kamu, tarik napas dalam-dalam dulu.' : 'I am here with you, take a deep breath.');
      const finalMessages = [...updatedMessages, { id: (Date.now() + 1).toString(), sender: 'ai', text: reply }];
      updateAndPersistChat(finalMessages);
    } catch (err) {
      const fallbackReply = lang === 'id'
        ? `Tahan, ${user.name || 'Rocky'}. Tarik napas dalam-dalam. Dorongan ini cuma bertahan 5-10 menit. Minum segelas air dingin sekarang juga!`
        : `Hold on, ${user.name || 'Rocky'}. Take a deep breath. This urge only lasts 5-10 minutes. Drink a glass of cold water right now!`;
      const finalMessages = [...updatedMessages, { id: (Date.now() + 1).toString(), sender: 'ai', text: fallbackReply }];
      updateAndPersistChat(finalMessages);
    } finally {
      setIsAiTyping(false);
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    if (authMode === 'register') {
      const cleanUsername = (authUsername || 'pejuang').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8);
      const registeredUser = {
        ...user,
        name: cleanUsername,
        username: cleanUsername,
        email: authEmail.trim(),
        avatar: cleanUsername.charAt(0).toUpperCase()
      };

      try {
        const res = await registerUserOnServer({
          name: registeredUser.name,
          username: cleanUsername,
          email: authEmail.trim(),
          password: authPassword,
          currentState: {
            activeHabit,
            habits,
            lang
          }
        });

        if (res.error) {
          showToast(res.error);
          return;
        }

        updateAppState({
          isRegistered: true,
          user: registeredUser,
          chatMessages: [
            {
              id: 'm1',
              sender: 'ai',
              text: lang === 'id' 
                ? `Hai ${cleanUsername}, aku Maya, kalau butuh temen ngobrol, cerita ke aku yaa..`
                : `Hey ${cleanUsername}, I'm Maya. If you need someone to talk to, just share with me..`
            }
          ]
        });
        setActiveSheet(null);
        showToast(lang === 'id' ? 'Pendaftaran berhasil! Datamu tersimpan aman di server.' : 'Registration successful! Data backed up to server.');
      } catch (err) {
        console.error('Register error:', err);
        const errMsg = err?.message || String(err);
        showToast(lang === 'id' ? `Gagal terhubung (${errMsg})` : `Connection failed (${errMsg})`);
      }
    } else {
      try {
        const res = await loginUserOnServer(authEmail.trim(), authPassword);
        if (res.error) {
          showToast(res.error);
          return;
        }

        // Pastikan data user dari server menimpa data lokal sepenuhnya
        const serverUser = res.user || {};
        updateAppState({
          isRegistered: true,
          user: {
            name: serverUser.name || 'Rocky',
            username: serverUser.username || 'rocky',
            email: serverUser.email || authEmail.trim(),
            photoUrl: serverUser.photoUrl || null,
            bio: serverUser.bio || '',
            avatar: serverUser.avatar || (serverUser.username || 'R').charAt(0).toUpperCase()
          },
          habits: res.state?.habits || habits,
          activeHabit: res.state?.activeHabit || activeHabit
        });
        setActiveSheet(null);
        showToast(lang === 'id' ? 'Login berhasil! Data server dipulihkan.' : 'Login successful! Server data restored.');
      } catch (err) {
        showToast(lang === 'id' ? 'Gagal terhubung ke server.' : 'Cannot connect to server.');
      }
    }
  }

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast(lang === 'id' ? 'Maksimal ukuran foto 2MB ya!' : 'Photo size must be under 2MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setEditPhotoPreview(uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  }

  function handleSaveProfile(e) {
    e.preventDefault();
    const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8) || user?.username || 'rocky';
    const cleanName = cleanUsername;
    const cleanPhoto = editPhotoPreview;

    const updatedUser = {
      ...user,
      name: cleanName,
      username: cleanUsername,
      bio: editBio.trim(),
      photoUrl: cleanPhoto
    };

    // Sinkronkan seluruh postingan milik user di feed komunitas dengan foto profil & nama baru
    const syncedCommunityPosts = (Array.isArray(communityPosts) ? communityPosts : []).map(post => {
      if (post.username === user.username || post.username === cleanUsername) {
        return {
          ...post,
          author: cleanName,
          username: cleanUsername,
          photoUrl: cleanPhoto
        };
      }
      return post;
    });

    updateAppState({ 
      user: updatedUser,
      communityPosts: syncedCommunityPosts
    });
    setActiveSheet('profile');
    showToast(lang === 'id' ? 'Profil & foto komunitas berhasil diperbarui!' : 'Profile & community photo updated!');
  }

  function handleSwipeNextHabit() {
    if (activeHabitKeys.length <= 1) return;
    const currentIndex = activeHabitKeys.indexOf(activeHabit);
    const nextIndex = (currentIndex + 1) % activeHabitKeys.length;
    const nextHabitKey = activeHabitKeys[nextIndex];
    updateAppState({ activeHabit: nextHabitKey });
  }

  function handleSwipePrevHabit() {
    if (activeHabitKeys.length <= 1) return;
    const currentIndex = activeHabitKeys.indexOf(activeHabit);
    const prevIndex = (currentIndex - 1 + activeHabitKeys.length) % activeHabitKeys.length;
    const prevHabitKey = activeHabitKeys[prevIndex];
    updateAppState({ activeHabit: prevHabitKey });
  }

  function onTouchStartHandler(e) {
    if (e.touches && e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  }

  function onTouchEndHandler(e) {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    if (e.changedTouches && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      
      // Deteksi swipe horizontal (minimal geser 45px dan tidak dominan vertikal)
      if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0) {
          // Geser ke kiri -> Habit selanjutnya
          handleSwipeNextHabit();
        } else {
          // Geser ke kanan -> Habit sebelumnya
          handleSwipePrevHabit();
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }

  function renderWithTags(text) {
    if (!text) return null;
    // Bersihkan karakter strip pada Hari ke-X menjadi Hari ke X
    const cleanedText = text.replace(/Hari ke-(\d+)/gi, 'Hari ke $1').replace(/Hari-ke/gi, 'Hari ke');
    const parts = cleanedText.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const isMe = part.toLowerCase() === myUsernameTag;
        return (
          <span 
            key={i} 
            onClick={(e) => {
              e.stopPropagation();
              setPostInput(prev => `${prev} ${part} `);
              showToast(lang === 'id' ? `Men-tag ${part}` : `Tagged ${part}`);
            }}
            className={`font-bold hover:underline cursor-pointer px-1 py-0.5 rounded ${
              isMe ? 'text-white bg-[#6367FF]' : 'text-[#6367FF] bg-[#ECE9FF]/60'
            }`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }

  return (
    <div className="min-h-screen w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex flex-col justify-between pb-24 md:pb-12 relative bg-[#FAF8FF]">
      {/* HEADER ELEGAN & MINIMALIS (CLEAN: HANYA AVATAR & BRANDING) */}
      <div className="px-5 pt-6 pb-4 flex justify-between items-center border-b border-[#DDD5FF]/40 md:border-none">
        {/* Avatar User (Klik untuk Buka Profil) */}
        <div 
          onClick={() => setActiveSheet('profile')}
          className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6367FF] to-[#8494FF] p-0.5 shadow-md shadow-[#6367FF]/20 active:scale-95 transition-transform overflow-hidden cursor-pointer"
        >
          {user.photoUrl ? (
            <img 
              src={user.photoUrl} 
              alt="Profile" 
              className="w-full h-full object-cover rounded-[14px]"
            />
          ) : (
            <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center font-black text-[#6367FF] text-sm">
              {(user?.username || user?.name || 'P').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Branding Tipografi: AgainstMe (A & M Kapital) */}
        <div className="flex items-center select-none">
          <span className="font-black text-sm tracking-tight text-[#1E1B38]">
            <span className="text-[#6367FF]">A</span>gainst<span className="text-[#6367FF]">M</span>e
          </span>
        </div>
      </div>

      {/* MULTI ADDICTION SLIDER / INDICATOR & SWIPE CONTAINER */}
      <div 
        onTouchStart={onTouchStartHandler}
        onTouchEnd={onTouchEndHandler}
        className="touch-pan-y"
      >
        {/* Habit Card Indicator (Dots & Title & Navigation Hint) */}
        {activeHabitKeys.length > 1 && (
          <div className="px-5 pt-1 pb-2 flex items-center justify-between">
            <button
              onClick={handleSwipePrevHabit}
              className="p-1 text-[#8494FF] hover:text-[#6367FF] active:scale-90 transition-all"
              aria-label="Previous Habit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#1E1B38] tracking-tight">
                {habitLabelMap[activeHabit] || activeHabit}
              </span>
              <div className="flex items-center gap-1.5 ml-1">
                {activeHabitKeys.map((k) => (
                  <button
                    key={k}
                    onClick={() => updateAppState({ activeHabit: k })}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeHabit === k
                        ? 'w-5 bg-[#6367FF]'
                        : 'w-1.5 bg-[#C9BEFF] hover:bg-[#8494FF]'
                    }`}
                    aria-label={`Switch to ${habitLabelMap[k] || k}`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSwipeNextHabit}
              className="p-1 text-[#8494FF] hover:text-[#6367FF] active:scale-90 transition-all"
              aria-label="Next Habit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {/* MAIN DASHBOARD CARDS (RESPONSIVE ADAPTIVE 2-COLUMN GRID) */}
        <div className="p-5 pt-2 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          
          {/* KOLOM KIRI (7 Kolom pada Desktop/Tablet): HERO STREAK, FINANSIAL & TOMBOL SOS */}
          <div className="md:col-span-7 space-y-4">
            {/* LIVE STREAK CARD */}
            <div className="bg-white border border-[#DDD5FF] rounded-3xl p-6 text-center shadow-xs relative overflow-hidden transition-all">
              <div className="text-[11px] font-bold text-[#8494FF] uppercase tracking-wider mb-1">
                {lang === 'id' ? 'Bersih Selama' : 'Clean Streak'}
              </div>

              <div className="text-6xl font-black text-[#1E1B38] tracking-tight my-1">
                {timeDiff.days}
              </div>
              <span className="text-sm font-extrabold text-[#6367FF] block mb-3.5">
                {lang === 'id' ? 'Hari' : 'Days'}
              </span>
              <div className="inline-block px-4 py-2 rounded-xl bg-[#FAF8FF] font-mono font-black text-xs tracking-widest text-[#6367FF] border border-[#DDD5FF]">
                {String(timeDiff.hours).padStart(2, '0')} : {String(timeDiff.minutes).padStart(2, '0')} : {String(timeDiff.seconds).padStart(2, '0')}
              </div>

          {/* 3 TOMBOL AKSI SEJAJAR: SIMPLE, KOMPAK & WARNA SERASI */}
          <div className="mt-5 pt-3.5 border-t border-[#DDD5FF]/60 grid grid-cols-3 gap-2 items-center">
            {/* 1. Kiri: Catatan Evaluasi */}
            <button 
              onClick={() => setActiveSheet('relapseHistory')}
              className="h-8 px-2 rounded-xl bg-white border border-[#DDD5FF] text-[#6D6796] hover:text-[#1E1B38] hover:bg-[#FAF8FF] font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all text-center"
              title={lang === 'id' ? 'Lihat Riwayat Evaluasi' : 'View Evaluation History'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8494FF] flex-shrink-0" />
              <span className="truncate">
                {habitData.relapses?.length || 0} {lang === 'id' ? 'evaluasi' : 'slips'}
              </span>
              <span className="text-[9px] text-[#6367FF] font-black">➔</span>
            </button>

            {/* 2. Tengah: Evaluasi Diri */}
            <button 
              onClick={() => setActiveSheet('relapseModal')} 
              className="h-8 px-2 rounded-xl bg-white border border-[#DDD5FF] text-[#6D6796] hover:text-[#1E1B38] hover:bg-[#FAF8FF] font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all text-center"
            >
              <svg className="w-3 h-3 stroke-[#6367FF] flex-shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span className="truncate">{lang === 'id' ? 'Evaluasi Diri' : 'Log Reset'}</span>
            </button>

            {/* 3. Kanan: Share */}
            <button
              onClick={async () => {
                const quoteText = activeHabit === 'pmo'
                  ? (getPmoRank(timeDiff.days, lang).quote || (lang === 'id' ? 'Setiap detik menahan diri adalah langkah merebut kembali kendali hidup.' : 'Every second of restraint is reclaiming control over life.'))
                  : (lang === 'id' ? 'Setiap detik menahan diri adalah langkah merebut kembali kendali hidup.' : 'Every second of restraint is reclaiming control over life.');
                
                try {
                  const canvas = await generateStreakStoryCanvas({
                    days: timeDiff.days,
                    userName: user.name || 'Pejuang',
                    userHandle: user.username || 'warrior',
                    userPhotoUrl: user.photoUrl || null,
                    habitLabel: habitLabelMap[activeHabit] || 'Pemulihan',
                    pmoRank: activeHabit === 'pmo' ? getPmoRank(timeDiff.days) : null,
                    quote: quoteText,
                    dateStr: new Date().toLocaleDateString('id-ID'),
                    lang
                  });

                  setStoryPreviewUrl(canvas.toDataURL('image/png'));
                } catch (e) {
                  console.error('Failed to generate story canvas', e);
                }
                setIsShareCardOpen(true);
              }}
              className="h-8 px-2 rounded-xl bg-white border border-[#DDD5FF] text-[#6D6796] hover:text-[#1E1B38] hover:bg-[#FAF8FF] font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all text-center"
            >
              <svg className="w-3 h-3 stroke-[#6367FF] flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span className="truncate">{lang === 'id' ? 'Bagikan' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* PMO MASTERY CARD (JIKA TAB PMO) */}
        {activeHabit === 'pmo' && (
          <div className="bg-white border border-[#DDD5FF] rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#FAF8FF] text-[#6367FF] border border-[#DDD5FF]">
                  {pmoInfo.rank}
                </span>
                <span className="font-extrabold text-sm text-[#1E1B38]">{pmoInfo.title}</span>
              </div>
              <span className="text-xs font-bold text-[#6367FF]">{timeDiff.days} / {pmoInfo.maxDay} {lang === 'id' ? 'hari' : 'days'}</span>
            </div>

            <div className="h-2 bg-[#FAF8FF] border border-[#DDD5FF] rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-[#8494FF] to-[#6367FF] transition-all duration-500 rounded-full"
                style={{ width: `${pmoInfo.pct}%` }}
              />
            </div>

            <div className="bg-[#FAF8FF] border border-[#DDD5FF] rounded-2xl p-3.5 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8494FF] block mb-1">
                {lang === 'id' ? `Motivasi Hari Ke-${timeDiff.days}` : `Day ${timeDiff.days} Insight`}
              </span>
              <p className="text-xs font-semibold text-[#1E1B38] leading-relaxed">
                "{pmoInfo.quote}"
              </p>
            </div>
          </div>
        )}

        {/* CELENGAN PENYELAMAT CARD (JIKA TAB GAMBLING) */}
        {activeHabit === 'gambling' && (
          <div className="bg-white border border-[#DDD5FF] rounded-3xl p-5 shadow-sm text-left">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ECE9FF] flex items-center justify-center">
                  <svg className="w-4 h-4 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="7" width="20" height="12" rx="4"/><path d="M17 7V5.5A2.5 2.5 0 0 0 14.5 3h-1a2.5 2.5 0 0 0-2.45 2H10a4 4 0 0 0-4 4v.5"/><circle cx="16.5" cy="13" r="1" fill="currentColor"/><path d="M5 19v2M11 19v2"/>
                  </svg>
                </div>
                <span className="font-extrabold text-sm text-[#1E1B38]">
                  {lang === 'id' ? 'Celengan Penyelamat' : 'Urge Piggybank'}
                </span>
              </div>
              <div className="text-base font-extrabold text-[#6367FF]">
                {formatCurrency(totalMoneySavedRaw, lang)}
              </div>
            </div>

            {/* Target Barang Impian / Reward Goal */}
            <div 
              onClick={() => {
                setGoalNameInput(activeGoal.name || '');
                setGoalTargetInput(formatNumberInput(activeGoal.target || 15000000));
                setActiveSheet('editGoal');
              }}
              className="bg-[#FAF8FF] border border-[#DDD5FF] rounded-2xl p-3.5 mb-3 cursor-pointer hover:border-[#6367FF] transition-colors text-left"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-[#ECE9FF] flex items-center justify-center text-[#6367FF] flex-shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="2" r="2" />
                    </svg>
                  </div>
                  <span className="font-extrabold text-xs text-[#1E1B38] truncate">
                    {lang === 'id' ? (activeGoal.name || 'Target Alokasi') : (activeGoal.nameEn || activeGoal.name)}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-[#6367FF] bg-[#ECE9FF] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                  {goalProgressPct}%
                </span>
              </div>

              <div className="w-full h-2 bg-[#DDD5FF]/60 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-[#6367FF] rounded-full transition-all duration-500" 
                  style={{ width: `${goalProgressPct}%` }}
                />
              </div>

              <div className="text-[10px] text-[#6D6796] flex justify-between items-center">
                <span>{lang === 'id' ? 'Target:' : 'Target:'} <strong className="text-[#1E1B38] font-bold">{formatCurrency(activeGoal.target, lang)}</strong></span>
                <span className="font-bold text-[#6367FF]">{formatCurrency(totalMoneySavedRaw, lang)}</span>
              </div>
            </div>

            <button 
              onClick={() => setActiveSheet('logUrge')}
              className="w-full py-3.5 rounded-xl bg-[#6367FF] hover:bg-[#8494FF] text-white font-bold text-xs shadow-md shadow-[#8494FF]/20 active:scale-[0.98] transition-all"
            >
              {lang === 'id' ? '+ Catat Godaan yang Berhasil Ditahan' : '+ Log Defeated Urge'}
            </button>

            {(habitData.history && habitData.history.length > 0) && (
              <div className="mt-4 pt-3 border-t border-[#C9BEFF]">
                <span className="text-[10px] font-bold text-[#6D6796] uppercase block mb-2">
                  {lang === 'id' ? 'Catatan Kemenangan Terakhir' : 'Recent Defeated Urges'}
                </span>
                <div className="space-y-1.5">
                  {habitData.history.slice(0, 3).map(h => (
                    <div key={h.id} className="flex justify-between items-center text-xs">
                      <span className="text-[#1E1B38] font-medium">{h.when} · {h.trigger}</span>
                      <span className="font-bold text-[#6367FF]">+{formatCurrency(h.amount, lang)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MONEY SAVED CARD DENGAN GOAL BARANG IMPIAN RANDOM/CUSTOM (REHAB, ROKOK & ALKOHOL) */}
        {(activeHabit === 'narcotics' || activeHabit === 'tobacco' || activeHabit === 'alcohol') && (
          <div className="bg-white border border-[#DDD5FF] rounded-3xl p-5 shadow-sm text-left space-y-3">
            <div>
              <span className="text-[11px] font-bold text-[#8494FF] block mb-1">
                {lang === 'id' ? 'Uang Dihemat' : 'Money Saved'}
              </span>
              <div className="text-2xl font-black text-[#1E1B38]">
                {formatCurrency(totalMoneySavedRaw, lang)}
              </div>
            </div>

            {/* Target Barang Impian / Reward Goal Card */}
            <div 
              onClick={() => {
                setGoalNameInput(activeGoal.name || '');
                setGoalTargetInput(formatNumberInput(activeGoal.target || 20000000));
                setActiveSheet('editGoal');
              }}
              className="bg-[#FAF8FF] border border-[#DDD5FF] rounded-2xl p-3.5 cursor-pointer hover:border-[#6367FF] transition-colors text-left"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-[#ECE9FF] flex items-center justify-center text-[#6367FF] flex-shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="2" r="2" />
                    </svg>
                  </div>
                  <span className="font-extrabold text-xs text-[#1E1B38] truncate">
                    {lang === 'id' ? (activeGoal.name || 'Target Alokasi') : (activeGoal.nameEn || activeGoal.name)}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-[#6367FF] bg-[#ECE9FF] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                  {goalProgressPct}%
                </span>
              </div>

              <div className="w-full h-2 bg-[#DDD5FF]/60 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-[#6367FF] rounded-full transition-all duration-500" 
                  style={{ width: `${goalProgressPct}%` }}
                />
              </div>

              <div className="text-[10px] text-[#6D6796] flex justify-between items-center">
                <span>{lang === 'id' ? 'Target:' : 'Target:'} <strong className="text-[#1E1B38] font-bold">{formatCurrency(activeGoal.target, lang)}</strong></span>
                <span className="font-bold text-[#6367FF]">{formatCurrency(totalMoneySavedRaw, lang)}</span>
              </div>
            </div>
          </div>
        )}

            {/* SOS EMERGENCY BUTTON (MINIMALIST CRISP PRO LOOK - FULL WIDTH MOBILE, COMPACT DESKTOP) */}
            <button 
              onClick={() => setActiveSheet('sos')}
              className="w-full md:w-auto md:self-start py-3.5 md:py-3 px-5 rounded-2xl bg-[#1E1B38] hover:bg-[#2A264F] text-white font-extrabold text-[13px] md:text-xs shadow-xs flex items-center justify-center gap-2.5 active:scale-[0.98] border border-[#DDD5FF]/30 transition-all group"
            >
              <div className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-[#FF6584] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-3 h-3 md:w-2.5 md:h-2.5 stroke-white" viewBox="0 0 24 24" fill="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7 7-7z"/>
                </svg>
              </div>
              <span className="tracking-wide font-bold whitespace-nowrap">
                {lang === 'id' ? 'Butuh Bantuan Darurat' : "Emergency Help (SOS)"}
              </span>
            </button>
          </div>

          {/* KOLOM KANAN (5 Kolom pada Desktop/Tablet): TIMELINE PEMULIHAN, TROFI & DAILY CHECK-IN */}
          <div className="md:col-span-5 space-y-4">
            {/* HEALTH RECOVERY TIMELINE WIDGET DI HOMESCREEN */}
            {(() => {
          const currentHabitRecovery = HEALTH_RECOVERY_DATA[activeHabit] || HEALTH_RECOVERY_DATA.tobacco;
          const habitStartSec = new Date(habitData.startDate || Date.now()).getTime();
          const elapsedSec = Math.max(0, Math.floor((Date.now() - habitStartSec) / 1000));
          const completedMilestones = currentHabitRecovery.filter(m => elapsedSec >= m.secondsRequired);
          const nextMilestone = currentHabitRecovery.find(m => elapsedSec < m.secondsRequired) || currentHabitRecovery[currentHabitRecovery.length - 1];
          const overallPct = Math.round((completedMilestones.length / currentHabitRecovery.length) * 100);

          return (
            <div 
              onClick={() => {
                setActiveSheet('healthTracker');
              }}
              className="bg-white border border-[#DDD5FF] rounded-3xl p-5 shadow-sm text-left cursor-pointer hover:border-[#6367FF] transition-all active:scale-[0.99] group relative overflow-hidden"
            >
              {/* Overlay Kunci Khusus Mode Tamu (Blur Bersih & Rapi Tanpa Tombol Buka Kunci) */}
              {!isRegistered && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    requireRegistration(lang === 'id' ? 'melihat Garis Waktu Pemulihan Tubuh' : 'view Body Recovery Timeline');
                  }}
                  className="absolute inset-0 bg-[#FAF8FF]/80 backdrop-blur-md z-10 flex flex-col items-center justify-center p-4 cursor-pointer text-center"
                >
                  <div className="w-9 h-9 rounded-2xl bg-white border border-[#DDD5FF] text-[#6367FF] flex items-center justify-center mb-1.5 shadow-sm">
                    <svg className="w-4 h-4 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <span className="text-xs font-black text-[#1E1B38]">
                    {lang === 'id' ? 'Garis Waktu Pemulihan Terkunci' : 'Recovery Timeline Locked'}
                  </span>
                  <span className="text-[10px] text-[#6D6796] mt-0.5">
                    {lang === 'id' ? 'Ketuk untuk mendaftar akun' : 'Tap to register an account'}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ECE9FF] text-[#6367FF] flex items-center justify-center flex-shrink-0 group-hover:bg-[#6367FF] group-hover:text-white transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1E1B38]">
                      {lang === 'id' ? 'Garis Waktu Pemulihan Tubuh' : 'Body Recovery Timeline'}
                    </h4>
                    <span className="text-[10px] text-[#6D6796]">
                      {completedMilestones.length} / {currentHabitRecovery.length} {lang === 'id' ? 'tahap biologis pulih' : 'stages restored'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-[#6367FF] bg-[#ECE9FF] px-2.5 py-1 rounded-xl">
                    {overallPct}%
                  </span>
                  <svg className="w-4 h-4 stroke-[#6D6796] group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>

              {/* Progress Bar Keseluruhan */}
              <div className="w-full h-2 bg-[#FAF8FF] border border-[#DDD5FF] rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-gradient-to-r from-[#8494FF] to-[#6367FF] rounded-full transition-all duration-500"
                  style={{ width: `${overallPct}%` }}
                />
              </div>

              {/* Tahap Saat Ini / Tahap Terdekat */}
              <div className="bg-[#FAF8FF] border border-[#DDD5FF]/80 rounded-2xl p-3 flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#6367FF] mt-1 flex-shrink-0 animate-pulse" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold text-[#1E1B38] block text-[11px]">
                    {lang === 'id' ? nextMilestone.titleId : nextMilestone.titleEn}
                  </span>
                  <span className="text-[10px] text-[#6D6796] block line-clamp-1">
                    {lang === 'id' ? nextMilestone.descId : nextMilestone.descEn}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* KARTU PREVIEW TROFI (HANYA USER TERDAFTAR, MODE TAMU BLUR BERSIH) */}
        {(() => {
          const unlockedBadges = BADGE_DEFINITIONS.filter(b => {
            try { return b.checkUnlocked(userStats); } catch(e) { return false; }
          });
          const lockedBadges = BADGE_DEFINITIONS.filter(b => {
            try { return !b.checkUnlocked(userStats); } catch(e) { return true; }
          });
          const nextTargetBadge = lockedBadges.find(b => b.category === 'streak') || lockedBadges[0] || null;

          return (
            <div 
              onClick={() => {
                if (!isRegistered) {
                  requireRegistration(lang === 'id' ? 'melihat Trofi' : 'view Trophies');
                } else {
                  setActiveSheet('badges');
                }
              }}
              className="p-5 bg-white border border-[#DDD5FF] rounded-3xl shadow-sm text-left space-y-3.5 relative overflow-hidden cursor-pointer hover:border-[#6367FF] transition-all"
            >
              {/* Overlay Kunci Khusus Mode Tamu (Blur Bersih Tanpa Tombol) */}
              {!isRegistered && (
                <div className="absolute inset-0 bg-[#FAF8FF]/80 backdrop-blur-md z-10 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-9 h-9 rounded-2xl bg-white border border-[#DDD5FF] text-[#6367FF] flex items-center justify-center mb-1.5 shadow-sm">
                    <svg className="w-4 h-4 stroke-[#6367FF]" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="7" />
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                    </svg>
                  </div>
                  <span className="text-xs font-black text-[#1E1B38]">
                    {lang === 'id' ? 'Trofi Terkunci' : 'Trophies Locked'}
                  </span>
                  <span className="text-[10px] text-[#6D6796] mt-0.5">
                    {lang === 'id' ? 'Ketuk untuk mendaftar akun' : 'Tap to register an account'}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#FAF8FF] border border-[#DDD5FF] flex items-center justify-center text-[#6367FF]">
                    <svg className="w-5 h-5 stroke-[#6367FF]" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="7" />
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1E1B38]">
                      {lang === 'id' ? 'Trofi' : 'Trophies'}
                    </h4>
                    <span className="text-[10px] font-bold text-[#8494FF]">
                      {unlockedBadges.length} / {BADGE_DEFINITIONS.length} {lang === 'id' ? 'Trofi Didapat' : 'Earned'}
                    </span>
                  </div>
                </div>

                <svg className="w-4 h-4 stroke-[#6D6796]" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              {/* Next Target Milestone Box */}
              {nextTargetBadge && (
                <div className="p-3 bg-[#FAF8FF] border border-[#DDD5FF] rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[10px] font-black uppercase text-[#8494FF] tracking-wider">
                      {lang === 'id' ? 'Target Trofi Terdekat' : 'Next Trophy Target'}
                    </span>
                    <span className="font-black text-[#6367FF]">
                      {nextTargetBadge.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#DDD5FF] flex items-center justify-center text-[#6367FF] flex-shrink-0">
                      <svg className="w-3.5 h-3.5 stroke-[#6367FF]" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-[#1E1B38] truncate">
                        {lang === 'id' ? nextTargetBadge.nameId : nextTargetBadge.nameEn}
                      </div>
                      <div className="text-[10px] text-[#6D6796] truncate">
                        {lang === 'id' ? nextTargetBadge.descId : nextTargetBadge.descEn}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* DAILY CHECK-IN CARD (1 HARI = 1 PILIHAN, BISA DIGANTI, HARI BARU RESET NORMAL) */}
        <div className="bg-white border border-[#DDD5FF] rounded-3xl p-5 shadow-sm text-left">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="font-extrabold text-sm text-[#1E1B38] min-w-0">
              {lang === 'id' ? 'Gimana kondisimu sekarang?' : 'How are you feeling right now?'}
            </div>
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const todayCheckin = (checkins || []).find(c => (c.timestamp || '').split('T')[0] === todayStr);
              return todayCheckin ? (
                <span className="text-[10px] font-extrabold text-[#6367FF] bg-[#ECE9FF] px-2.5 py-0.5 rounded-full border border-[#6367FF]/20 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6367FF] inline-block"></span>
                  {todayCheckin.moodLabel}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#6D6796] bg-white px-2 py-0.5 rounded-full border border-[#C9BEFF] whitespace-nowrap flex-shrink-0">
                  {lang === 'id' ? 'Belum check-in' : 'Not yet'}
                </span>
              );
            })()}
          </div>
          <div className="text-xs text-[#6D6796] mb-3.5">
            {lang === 'id' ? 'Pilih 1 kondisi harimu (bisa kamu ganti kapan saja).' : 'Pick 1 feeling today (switchable anytime).'}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'stressed', label: lang === 'id' ? 'Stres' : 'Stressed', color: 'border-[#6367FF]/30 text-[#6367FF] hover:bg-[#6367FF] hover:text-white' },
              { id: 'bored', label: lang === 'id' ? 'Bosan' : 'Bored', color: 'border-[#8494FF]/40 text-[#8494FF] hover:bg-[#8494FF] hover:text-white' },
              { id: 'calm', label: lang === 'id' ? 'Tenang' : 'Calm', color: 'border-[#8494FF]/40 text-[#6367FF] hover:bg-[#6367FF] hover:text-white' },
              { id: 'strong', label: lang === 'id' ? 'Kuat' : 'Strong', color: 'border-[#6367FF]/40 text-[#6367FF] hover:bg-[#6367FF] hover:text-white' }
            ].map(m => {
              const todayStr = new Date().toISOString().split('T')[0];
              const isSelectedToday = (checkins || []).some(c => c.moodId === m.id && (c.timestamp || '').split('T')[0] === todayStr);
              return (
                <button 
                  key={m.id}
                  onClick={() => handleSaveCheckin(m.id, m.label)}
                  className={`py-2.5 rounded-xl border font-extrabold text-xs transition-all active:scale-95 shadow-sm ${
                    isSelectedToday
                      ? 'bg-[#6367FF] text-white border-[#6367FF] shadow-[#6367FF]/30 ring-2 ring-[#8494FF]/50 scale-[1.02]'
                      : `bg-white ${m.color}`
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          </div>
          </div>
          </div>
          </div>

      {/* BOTTOM NAVIGATION (RESPONSIVE DOCK: COMPACT ON MOBILE, CENTERED FLOATING BAR ON DESKTOP) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-md md:bottom-4 md:rounded-3xl mx-auto bg-[#F7F5FF]/95 backdrop-blur-md border border-[#DDD5FF] p-3 flex justify-around items-center z-40 shadow-lg shadow-[#1E1B38]/5">
        <button className="flex flex-col items-center gap-1 text-[#6367FF]">
          <svg className="w-5 h-5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button 
          onClick={() => {
            setActiveSheet('community');
            updateAppState({ lastReadMentionsTime: Date.now() });
          }} 
          className="flex flex-col items-center gap-1 text-[#6D6796] hover:text-[#1E1B38] transition-colors relative"
        >
          <div className="relative">
            <svg className="w-5 h-5 stroke-[#6D6796]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {unreadMentionCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#FF6584] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md shadow-[#FF6584]/40 border border-white">
                {unreadMentionCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">{lang === 'id' ? 'Komunitas' : 'Community'}</span>
        </button>

        <button 
          onClick={() => {
            if (!requireRegistration(lang === 'id' ? 'mengobrol dengan AI Maya' : 'chat with Maya AI')) return;
            setActiveSheet('chat');
            updateAppState({ lastReadChatTime: Date.now() });
          }}
          className="flex flex-col items-center gap-1 text-[#6D6796] hover:text-[#1E1B38] transition-colors relative"
        >
          <div className="relative">
            <svg className="w-5 h-5 stroke-[#6D6796]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {unreadAiCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#6367FF] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md shadow-[#6367FF]/40 border border-white">
                {unreadAiCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">{lang === 'id' ? 'Chat AI' : 'AI Chat'}</span>
        </button>

        <button onClick={() => setActiveSheet('settings')} className="flex flex-col items-center gap-1 text-[#6D6796] hover:text-[#1E1B38] transition-colors">
          <svg className="w-5 h-5 stroke-[#6D6796]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span className="text-[10px] font-semibold">{lang === 'id' ? 'Pengaturan' : 'Settings'}</span>
        </button>
      </nav>

      {/* BOTTOM SHEETS / MODALS */}
      {activeSheet && (
        <div 
          onClick={() => setActiveSheet(null)}
          className="fixed inset-0 bg-[#1E1B38]/40 backdrop-blur-sm z-50 flex items-end justify-center animate-fadeIn"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#FAF8FF] rounded-t-[32px] p-6 max-h-[90vh] overflow-y-auto animate-slideUp text-left"
          >
            {/* Header Sheet */}
            <div className="flex justify-between items-center pb-4 border-b border-[#C9BEFF] mb-4">
              <h3 className="font-extrabold text-lg text-[#1E1B38] capitalize">
                {activeSheet === 'settings' && (lang === 'id' ? 'Pengaturan' : 'Settings')}
                {activeSheet === 'adminPanel' && (lang === 'id' ? 'Panel Moderasi Admin' : 'Admin Moderation')}
                {activeSheet === 'privacyPolicy' && (lang === 'id' ? 'Kebijakan Privasi' : 'Privacy Policy')}
                {activeSheet === 'manageHabits' && (lang === 'id' ? 'Kelola & Tambah Program Habit' : 'Manage & Add Habits')}
                {activeSheet === 'community' && (lang === 'id' ? 'Ruang Komunitas' : 'Community')}
                {activeSheet === 'profile' && (lang === 'id' ? 'Profil' : 'Profile')}
                {activeSheet === 'badges' && (lang === 'id' ? 'Trofi' : 'Trophies')}
                {activeSheet === 'editProfile' && (lang === 'id' ? 'Edit Profil' : 'Edit Profile')}
                {activeSheet === 'editGoal' && (lang === 'id' ? 'Target Barang Impian' : 'Dream Goal Reward')}
                {activeSheet === 'authModal' && (authMode === 'register' ? (lang === 'id' ? 'Daftar Akun' : 'Create Account') : (lang === 'id' ? 'Masuk Akun' : 'Log In'))}
                {activeSheet === 'chat' && (lang === 'id' ? 'Teman Berhenti' : 'Quit Companion')}
                {activeSheet === 'sos' && (lang === 'id' ? 'Pusat Bantuan Cepat' : 'SOS Rescue')}
                {activeSheet === 'logUrge' && (lang === 'id' ? 'Catat Godaan Judi' : 'Log Urge')}
                {activeSheet === 'editDate' && (lang === 'id' ? 'Ubah Tanggal Berhenti' : 'Edit Quit Date')}
                {activeSheet === 'relapseModal' && (lang === 'id' ? 'Catat Kambuh (Relapse)' : 'Log Relapse')}
                {activeSheet === 'relapseHistory' && (lang === 'id' ? 'Riwayat Relapse' : 'Relapse History')}
                {activeSheet === 'healthTracker' && (lang === 'id' ? 'Pemulihan Tubuh & Analisa Godaan' : 'Body Recovery & Urge Analysis')}
              </h3>
              <button 
                onClick={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full border border-[#C9BEFF] bg-white flex items-center justify-center font-bold text-[#1E1B38] hover:bg-[#C9BEFF]/30"
              >
                ✕
              </button>
            </div>

            {/* MODAL EDIT GOAL / TARGET BARANG IMPIAN */}
            {activeSheet === 'editGoal' && (
              <div className="space-y-4">
                <div className="bg-[#ECE9FF] border border-[#8494FF]/20 rounded-2xl p-4 text-xs text-[#1E1B38] leading-relaxed">
                  <span className="font-extrabold text-[#6367FF] block mb-1">
                    {lang === 'id' ? 'Beli Hadiah dari Uang Kemenanganmu' : 'Reward Yourself with Your Savings'}
                  </span>
                  {lang === 'id' 
                    ? 'Tulis barang apa yang mau kamu beli (pulau, dapur, kapal selam, Supra bapack, Lahan Sawit) atau ketuk tombol acak untuk ganti barang random.' 
                    : 'Type what you want to buy (island, kitchen, submarine, vintage Supra motorcycle, palm plantation) or tap randomize for fun ideas.'}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Nama Barang Impian' : 'Reward Name'}
                  </label>
                  <input 
                    type="text" 
                    value={goalNameInput}
                    onChange={e => setGoalNameInput(e.target.value)}
                    placeholder="Contoh: Kaset GTA 6 & PS5 Pro"
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] font-bold outline-none focus:border-[#6367FF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Harga Target ($ / Rp)' : 'Target Price ($ / IDR)'}
                  </label>
                  <input 
                    type="text" 
                    value={goalTargetInput}
                    onChange={e => setGoalTargetInput(formatNumberInput(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] font-bold outline-none focus:border-[#6367FF]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRandomizeGoal}
                    className="flex-1 py-3.5 rounded-xl border-2 border-[#6367FF] text-[#6367FF] font-extrabold text-xs bg-white active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                    </svg>
                    <span>{lang === 'id' ? 'Acak Target Baru' : 'Randomize Goal'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveGoal()}
                    className="flex-1 py-3.5 rounded-xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#8494FF]/30 active:scale-95 transition-transform"
                  >
                    {lang === 'id' ? 'Simpan Target' : 'Save Goal'}
                  </button>
                </div>
              </div>
            )}

            {/* SHEET KOMUNITAS */}
            {activeSheet === 'community' && (
              <div className="space-y-4">
                {/* Banner Info Ringkas Komunitas */}
                <div className="bg-[#C9BEFF]/30 border border-[#C9BEFF] rounded-2xl p-3.5 text-xs text-[#1E1B38]">
                  <span className="font-extrabold text-[#1E1B38] block">
                    {lang === 'id' ? 'Kamu tidak sendirian.' : 'You are not alone.'}
                  </span>
                  <span className="text-[11px] text-[#6D6796]">
                    {lang === 'id' ? 'Posting ceritamu atau tag dengan ' : 'Share your story or tag with '}
                    <span className="font-bold text-[#6367FF]">@username</span>
                  </span>
                </div>

                {/* Form Input Post Baru (Hanya untuk Terverifikasi, Tamu Terkunci) */}
                <div className="bg-white border border-[#C9BEFF] rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden">
                  {/* Bar Kunci Input Komunitas untuk Guest */}
                  {!isRegistered && (
                    <div 
                      onClick={() => requireRegistration(lang === 'id' ? 'membuat postingan di Komunitas' : 'post in the Community')}
                      className="absolute inset-0 bg-[#FAF8FF]/95 backdrop-blur-[2px] z-10 flex items-center justify-center px-4 cursor-pointer gap-2"
                    >
                      <svg className="w-4 h-4 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <span className="text-xs font-bold text-[#1E1B38]">
                        {lang === 'id' ? 'Daftar untuk gabung komunitas' : 'Register to join community'}
                      </span>
                    </div>
                  )}

                  <textarea 
                    value={postInput}
                    onChange={e => setPostInput(e.target.value)}
                    placeholder={
                      lang === 'id' 
                        ? `Tulis pesan, tips, atau sapa kawan (misal: Semangat @dimas_clean)...` 
                        : `Share your insight or tag someone (e.g. Keep going @dimas_clean)...`
                    }
                    className="w-full h-20 p-3 text-xs border border-[#C9BEFF] rounded-xl bg-[#FAF8FF]/40 text-[#1E1B38] outline-none resize-none focus:border-[#6367FF]"
                  />

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[10px] font-black text-[#6367FF] whitespace-nowrap bg-[#ECE9FF] px-2 py-0.5 rounded-md">
                      {lang === 'id' ? 'Tag Cepat' : 'Quick Tag'}
                    </span>
                    {(() => {
                      // Ambil user aktif baru-baru ini dari communityPosts (deduplikasi & filter selain diri sendiri)
                      const recentUsers = Array.from(
                        new Set(
                          (communityPosts || [])
                            .map(p => p.username)
                            .filter(u => u && u !== 'admin' && u !== (user?.username || ''))
                        )
                      ).slice(0, 8);
                      
                      const quickTags = ['@admin', ...recentUsers.map(u => `@${u}`)];
                      return quickTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setPostInput(prev => `${prev.trim()} ${tag} `);
                            showToast(lang === 'id' ? `Men-tag ${tag}` : `Tagged ${tag}`);
                          }}
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap transition-all active:scale-95 border ${
                            tag === '@admin' 
                              ? 'text-white bg-[#6367FF] border-[#6367FF] shadow-xs' 
                              : 'text-[#1E1B38] bg-white border-[#C9BEFF] hover:bg-[#FAF8FF]'
                          }`}
                        >
                          {tag}
                        </button>
                      ));
                    })()}
                  </div>

                  <button 
                    onClick={handleCreatePost}
                    className="w-full py-3 rounded-xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#6367FF]/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>{lang === 'id' ? 'Posting Cerita ke Komunitas' : 'Publish Post to Community'}</span>
                    {!isRegistered && <span className="text-[10px] opacity-80 font-normal">({lang === 'id' ? 'Butuh Daftar Akun' : 'Requires Account'})</span>}
                  </button>
                </div>

                {/* TAB FILTER TIMELINE: SEMUA POST VS MENTION SAYA */}
                <div className="pt-2">
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-1 bg-[#ECE9FF] p-1 rounded-xl border border-[#C9BEFF]/60">
                      <button
                        onClick={() => setCommunityTab('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          communityTab === 'all'
                            ? 'bg-[#6367FF] text-white shadow-sm'
                            : 'text-[#6D6796] hover:text-[#1E1B38]'
                        }`}
                      >
                        {lang === 'id' ? 'Semua Cerita' : 'All Posts'} ({communityPosts.length})
                      </button>
                      <button
                        onClick={() => setCommunityTab('mentions')}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                          communityTab === 'mentions'
                            ? 'bg-[#6367FF] text-white shadow-sm'
                            : 'text-[#6D6796] hover:text-[#1E1B38]'
                        }`}
                      >
                        <span>{lang === 'id' ? 'Menyebut Saya' : 'Mentions'}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                          communityTab === 'mentions' ? 'bg-white text-[#6367FF]' : 'bg-[#C9BEFF] text-[#1E1B38]'
                        }`}>
                          {mentionPosts.length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* List Postingan Sesuai Tab Filter */}
                  <div className="space-y-3">
                    {(communityTab === 'mentions' ? mentionPosts : communityPosts).map(post => {
                      const isMentioningMe = (post.content || '').toLowerCase().includes(myUsernameTag);
                      // Tampilkan foto profil user aktif jika postingan milik user saat ini
                      const isMyPost = post.username === (user?.username || '');
                      const displayPhoto = isMyPost ? (user?.photoUrl || post.photoUrl) : post.photoUrl;
                      const postUserInitial = (post.username || 'U').charAt(0).toUpperCase();

                      return (
                        <div 
                          key={post.id} 
                          className={`bg-white border rounded-2xl p-4 shadow-sm space-y-2 transition-all ${
                            isMentioningMe ? 'border-[#6367FF] ring-2 ring-[#6367FF]/20' : 'border-[#C9BEFF]'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2.5">
                              {displayPhoto ? (
                                <img 
                                  src={displayPhoto} 
                                  alt={`@${post.username}`} 
                                  className="w-8 h-8 rounded-full object-cover border border-[#6367FF]/30"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#ECE9FF] flex items-center justify-center font-black text-[#6367FF] text-xs">
                                  {postUserInitial}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    onClick={() => {
                                      setPostInput(prev => `${prev} @${post.username} `);
                                      showToast(lang === 'id' ? `Tag @${post.username}` : `Tag @${post.username}`);
                                    }}
                                    className="font-extrabold text-xs text-[#1E1B38] hover:text-[#6367FF] cursor-pointer"
                                  >
                                    @{post.username}
                                  </span>

                                  {isMentioningMe && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#6367FF] text-white text-[9px] font-black">
                                      {lang === 'id' ? 'MENYAPAMU' : 'TAGGED YOU'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-[#6D6796] mt-0.5">
                                  <span className="font-semibold text-[#6367FF]">
                                    {post.habit} · {lang === 'id' ? `Hari ke ${post.streakDays}` : `Day ${post.streakDays}`}
                                  </span>
                                  <span>·</span>
                                  <span>{getRelativeTimeStr(post.createdAt, lang)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Tombol Hapus Postingan Khusus Akun @admin */}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteCommunityPost(post.id)}
                                title="Hapus Postingan (Admin)"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <svg className="w-4 h-4 stroke-red-500" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  <line x1="10" y1="11" x2="10" y2="17"/>
                                  <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-[#1E1B38] leading-relaxed pt-1">
                            {renderWithTags(post.content)}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-[#C9BEFF]/50 text-xs">
                            <button 
                              onClick={() => handleToggleLike(post.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                                post.isLiked 
                                  ? 'bg-[#6367FF] text-white border-[#6367FF]' 
                                  : 'bg-[#FAF8FF] text-[#1E1B38] border-[#C9BEFF] hover:bg-[#ECE9FF]'
                              }`}
                            >
                              <svg className={`w-3.5 h-3.5 ${post.isLiked ? 'stroke-white fill-white' : 'stroke-[#6367FF] fill-none'}`} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                              <span>{lang === 'id' ? (post.isLiked ? 'Beri Respek' : 'Respek') : (post.isLiked ? 'Respected' : 'Respect')}</span>
                              <span>({post.likes})</span>
                            </button>
                            <button 
                              onClick={() => {
                                if (!requireRegistration(lang === 'id' ? 'membalas di Komunitas' : 'reply in Community')) return;
                                setPostInput(prev => `${prev} @${post.username} `);
                                showToast(lang === 'id' ? `Membalas @${post.username}` : `Replying @${post.username}`);
                              }}
                              className="text-[11px] font-bold text-[#6D6796] hover:text-[#6367FF]"
                            >
                              {lang === 'id' ? 'Balas / Mention' : 'Reply / Mention'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SHEET PROFIL */}
            {activeSheet === 'profile' && (
              <div className="space-y-4">
                <div className="p-5 bg-white border border-[#C9BEFF] rounded-3xl flex items-center gap-4 shadow-sm relative">
                  {user.photoUrl ? (
                    <img 
                      src={user.photoUrl} 
                      alt="Avatar" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#6367FF] shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#ECE9FF] flex items-center justify-center font-black text-[#6367FF] text-2xl border-2 border-[#6367FF]/20 shrink-0">
                      {(user?.name || 'R').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h4 className="font-extrabold text-lg text-[#1E1B38] leading-tight truncate">
                      @{user.username || 'pejuang'}
                    </h4>

                    <span className="text-[11px] text-[#6D6796] mt-0.5 block truncate">
                      {isRegistered 
                        ? (lang === 'id' ? 'Akun Terverifikasi Komunitas' : 'Verified Community Member') 
                        : (lang === 'id' ? 'Akun Tamu (Data Lokal)' : 'Guest Account (Local Data)')}
                    </span>
                  </div>

                  {isRegistered && (
                    <button 
                      onClick={() => {
                        setEditName(user.name || '');
                        setEditUsername(user.username || '');
                        setEditBio(user.bio || '');
                        setEditPhotoPreview(user.photoUrl || null);
                        setActiveSheet('editProfile');
                      }}
                      className="px-3 py-1.5 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] hover:bg-[#C9BEFF]/30 shrink-0"
                    >
                      {lang === 'id' ? 'Edit' : 'Edit'}
                    </button>
                  )}
                </div>

                {!isRegistered && (
                  <div className="p-4 bg-gradient-to-r from-[#ECE9FF] to-[#FAF8FF] border-2 border-[#6367FF]/30 rounded-2xl space-y-2">
                    <div className="font-extrabold text-xs text-[#1E1B38]">
                      {lang === 'id' ? 'Buka Akses Komunitas & Chat AI' : 'Unlock Community & AI Chat'}
                    </div>
                    <p className="text-[11px] text-[#1E1B38] leading-relaxed">
                      {lang === 'id' 
                        ? 'Daftar akun gratis agar kamu bisa posting cerita, saling tag @username, dan curhat sepuasnya bareng Chat AI tanpa hilang data.' 
                        : 'Register for free to publish community stories, tag fellow warriors, and chat with AI.'}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => {
                          setAuthMode('register');
                          setActiveSheet('authModal');
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#6367FF]/20 active:scale-95"
                      >
                        {lang === 'id' ? 'Daftar Akun Baru' : 'Create Free Account'}
                      </button>
                      <button 
                        onClick={() => {
                          setAuthMode('login');
                          setActiveSheet('authModal');
                        }}
                        className="px-4 py-2.5 rounded-xl border border-[#6367FF] text-[#6367FF] font-bold text-xs bg-white active:scale-95"
                      >
                        {lang === 'id' ? 'Masuk' : 'Log In'}
                      </button>
                    </div>
                  </div>
                )}

                {user.bio && (
                  <div className="p-4 bg-white border border-[#C9BEFF] rounded-2xl text-xs text-[#1E1B38] leading-relaxed italic">
                    "{user.bio}"
                  </div>
                )}

                {/* (Streak Freeze dipindah ke Dashboard di bawah Garis Waktu Pemulihan) */}

                <div className="p-4 bg-white border border-[#C9BEFF] rounded-2xl space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[#6D6796] block">{lang === 'id' ? 'Total Hari Bebas:' : 'Total Clean Days:'}</span>
                      <span className="font-black text-[#1E1B38] text-sm">{timeDiff.days} {lang === 'id' ? 'Hari' : 'Days'}</span>
                    </div>
                    <button
                      onClick={() => setActiveSheet('editDate')}
                      className="px-3 py-1.5 rounded-xl bg-[#ECE9FF] border border-[#8494FF]/40 text-[#6367FF] font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#C9BEFF]/40 active:scale-95 transition-all shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-3.5z"/>
                      </svg>
                      <span>{lang === 'id' ? 'Edit Tanggal Mulai' : 'Edit Start Date'}</span>
                    </button>
                  </div>
                  
                  <div className="pt-2 border-t border-[#C9BEFF]/40 flex justify-between items-center">
                    <div>
                      <span className="text-[#6D6796] block">{lang === 'id' ? 'Habit Dipantau:' : 'Tracked Habits:'}</span>
                      <span className="font-bold text-[#6367FF] text-xs">
                        {activeHabitKeys.map(k => habitLabelMap[k]).join(', ')}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveSheet('manageHabits')}
                      className="px-2.5 py-1 rounded-lg bg-[#ECE9FF] border border-[#8494FF]/40 text-[#6367FF] font-extrabold text-[11px] hover:bg-[#C9BEFF]/40 active:scale-95 transition-all"
                    >
                      {lang === 'id' ? '+ Tambah' : '+ Add'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-[#C9BEFF]/40 flex justify-between items-center">
                    <span className="text-[#6D6796]">{lang === 'id' ? 'Status Penyimpanan:' : 'Storage State:'}</span>
                    <span className="font-bold text-[#6367FF]">
                      {isRegistered 
                        ? (lang === 'id' ? 'Tersimpan Aman di Server' : 'Stored Securely on Server')
                        : (lang === 'id' ? 'Tersimpan Aman di Perangkat' : 'Stored Securely on Device')}
                    </span>
                  </div>
                </div>

                {/* LETTER TO FUTURE SELF CARD */}
                <div className="p-5 bg-gradient-to-br from-[#ECE9FF] to-[#FAF8FF] border-2 border-[#8494FF]/40 rounded-3xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#6367FF]/10 flex items-center justify-center text-[#6367FF] font-bold">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-extrabold text-sm text-[#1E1B38]">
                        {lang === 'id' ? 'Surat untuk Diri Sendiri' : 'Letter to Future Self'}
                      </h4>
                      <p className="text-[10px] text-[#6D6796] leading-relaxed">
                        {lang === 'id' 
                          ? 'Tulis pesan motivasi untuk dirimu di masa depan. Terkunci sampai waktu tiba.' 
                          : 'Write a motivational message for your future self. Locked until the time comes.'}
                      </p>
                    </div>
                  </div>
                  
                  {habitData.futureLetter ? (
                    <div className="space-y-2">
                      <div className="text-[11px] text-[#6D6796] flex items-center justify-between">
                        <span>
                          {lang === 'id' ? 'Ditulis pada:' : 'Written on:'} {new Date(habitData.futureLetter.createdAt).toLocaleDateString('id-ID')}
                        </span>
                        <span className="font-bold text-[#6367FF]">
                          {(() => {
                            const unlockDate = new Date(habitData.futureLetter.unlockDate);
                            const now = new Date();
                            const isUnlocked = now >= unlockDate;
                            if (isUnlocked) {
                              return lang === 'id' ? 'Terbuka' : 'Unlocked';
                            }
                            const daysLeft = Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24));
                            return `${daysLeft} ${lang === 'id' ? 'hari lagi' : 'days left'}`;
                          })()}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => {
                          const unlockDate = new Date(habitData.futureLetter.unlockDate);
                          const now = new Date();
                          if (now >= unlockDate) {
                            setIsViewingLetter(true);
                            setIsLetterModalOpen(true);
                          } else {
                            showToast(lang === 'id' ? 'Surat masih terkunci. Sabar ya, belum waktunya.' : 'Letter is still locked. Be patient.');
                          }
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#6367FF]/20 active:scale-95"
                      >
                        {(() => {
                          const unlockDate = new Date(habitData.futureLetter.unlockDate);
                          const now = new Date();
                          return now >= unlockDate 
                            ? (lang === 'id' ? 'Buka & Baca Surat' : 'Open & Read Letter')
                            : (lang === 'id' ? 'Lihat Status Surat' : 'View Letter Status');
                        })()}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsViewingLetter(false);
                        setLetterContent('');
                        setLetterUnlockDays(30);
                        setIsLetterModalOpen(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#6367FF]/20 active:scale-95"
                    >
                      {lang === 'id' ? 'Tulis Surat Sekarang' : 'Write Letter Now'}
                    </button>
                  )}
                </div>

                {isRegistered && (
                  <button
                    onClick={() => {
                      updateAppState({ isRegistered: false });
                      showToast(lang === 'id' ? 'Keluar ke Mode Tamu.' : 'Switched back to Guest Mode.');
                    }}
                    className="w-full py-3 rounded-xl border border-[#C9BEFF] text-[#6D6796] text-xs font-bold hover:bg-[#C9BEFF]/30"
                  >
                    {lang === 'id' ? 'Keluar Akun (Tetap Pakai Mode Tamu)' : 'Log Out (Stay on Guest Mode)'}
                  </button>
                )}
              </div>
            )}

            {/* HALAMAN DEDIKASI: TROFI (HALL OF FAME) */}
            {activeSheet === 'badges' && (() => {
              const unlockedCount = BADGE_DEFINITIONS.filter(b => {
                try { return b.checkUnlocked(userStats); } catch(e) { return false; }
              }).length;

              // Hitung Tingkatan Gelar Pejuang (Mastery Tier)
              const warriorRank = getWarriorRank(unlockedCount, lang);

              const filteredBadges = BADGE_DEFINITIONS.filter(b => {
                if (badgeCategoryTab === 'all') return true;
                return b.category === badgeCategoryTab;
              });

              // Urutkan: Yang sudah DIDAPAT di atas, lalu urutan bawaan
              const sortedBadges = [...filteredBadges].sort((a, b) => {
                const aUnlocked = (() => { try { return a.checkUnlocked(userStats); } catch(e) { return false; } })();
                const bUnlocked = (() => { try { return b.checkUnlocked(userStats); } catch(e) { return false; } })();
                if (aUnlocked && !bUnlocked) return -1;
                if (!aUnlocked && bUnlocked) return 1;
                return 0;
              });

              return (
                <div className="space-y-4 text-left">
                  {/* Header Ringkasan Tingkat Kedaulatan */}
                  <div className="p-4 bg-gradient-to-br from-white to-[#F5F2FF] border-2 border-[#DDD5FF] rounded-3xl space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#6D6796] tracking-wider block">
                          {lang === 'id' ? 'Tingkat Kedaulatan Saat Ini' : 'Current Mastery Tier'}
                        </span>
                        <h4 className="text-base font-black text-[#1E1B38]">
                          {warriorRank.title}
                        </h4>
                      </div>
                      <span className="text-xs font-black text-[#6367FF] bg-[#ECE9FF] px-3 py-1.5 rounded-xl border border-[#C9BEFF]">
                        {unlockedCount} / {BADGE_DEFINITIONS.length} {lang === 'id' ? 'Terbuka' : 'Unlocked'}
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-[#DDD5FF]/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#8494FF] to-[#6367FF] rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((unlockedCount / BADGE_DEFINITIONS.length) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tab Kategori Filter */}
                  <div className="flex gap-1.5 p-1 bg-[#ECE9FF]/50 border border-[#DDD5FF] rounded-2xl overflow-x-auto">
                    {[
                      { id: 'all', labelId: 'Semua', labelEn: 'All', count: BADGE_DEFINITIONS.length },
                      { id: 'streak', labelId: 'Waktu', labelEn: 'Time', count: BADGE_DEFINITIONS.filter(b => b.category === 'streak').length },
                      { id: 'financial', labelId: 'Finansial', labelEn: 'Financial', count: BADGE_DEFINITIONS.filter(b => b.category === 'financial').length },
                      { id: 'mindset', labelId: 'Jiwa', labelEn: 'Mindset', count: BADGE_DEFINITIONS.filter(b => b.category === 'mindset' || b.category === 'social').length }
                    ].map(tab => {
                      const isActive = badgeCategoryTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setBadgeCategoryTab(tab.id)}
                          className={`flex-1 min-w-[72px] py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            isActive
                              ? 'bg-[#6367FF] text-white shadow-md shadow-[#6367FF]/20'
                              : 'text-[#6D6796] hover:text-[#1E1B38] hover:bg-white/50'
                          }`}
                        >
                          <span>{lang === 'id' ? tab.labelId : tab.labelEn}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-white/25 text-white' : 'bg-[#DDD5FF] text-[#6D6796]'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* List Trofi Horizontal Elegan Tanpa Teks Kepotong */}
                  <div className="space-y-2.5">
                    {sortedBadges.map(badge => {
                      const isUnlocked = (() => {
                        try { return badge.checkUnlocked(userStats); } catch(e) { return false; }
                      })();

                      return (
                        <div
                          key={badge.id}
                          onClick={() => setSelectedBadgeModal(badge)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            isUnlocked
                              ? 'bg-white border-[#8494FF]/60 shadow-sm hover:border-[#6367FF]'
                              : 'bg-white/60 border-[#DDD5FF]/70 opacity-60'
                          }`}
                        >
                          {/* Icon Container */}
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isUnlocked 
                              ? 'bg-[#ECE9FF] text-[#6367FF] shadow-xs' 
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {badge.iconType === 'sun' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                              </svg>
                            )}
                            {badge.iconType === 'shield' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              </svg>
                            )}
                            {badge.iconType === 'award' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                              </svg>
                            )}
                            {badge.iconType === 'zap' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                              </svg>
                            )}
                            {badge.iconType === 'piggy' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.5-1 2-2.5.8-2.3.5-4-1-6.5V5z"/><circle cx="8" cy="11" r="1"/>
                              </svg>
                            )}
                            {badge.iconType === 'vault' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="15" y2="15"/>
                              </svg>
                            )}
                            {badge.iconType === 'users' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                              </svg>
                            )}
                            {badge.iconType === 'compass' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                              </svg>
                            )}
                            {badge.iconType === 'flame' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                              </svg>
                            )}
                            {badge.iconType === 'crown' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/>
                              </svg>
                            )}
                            {badge.iconType === 'mountain' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 3l4 8 5-5 5 15H2L8 3z"/>
                              </svg>
                            )}
                            {badge.iconType === 'star' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                              </svg>
                            )}
                            {badge.iconType === 'briefcase' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                              </svg>
                            )}
                            {badge.iconType === 'mail' && (
                              <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                              </svg>
                            )}
                          </div>

                          {/* Content Detail */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2 mb-1">
                              <h5 className="font-extrabold text-xs text-[#1E1B38] leading-tight">
                                {lang === 'id' ? badge.nameId : badge.nameEn}
                              </h5>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                                isUnlocked
                                  ? 'bg-[#ECE9FF] text-[#6367FF] border border-[#C9BEFF]'
                                  : 'bg-gray-100 text-gray-400'
                              }`}>
                                {isUnlocked ? (lang === 'id' ? 'Didapat' : 'Earned') : (lang === 'id' ? 'Terkunci' : 'Locked')}
                              </span>
                            </div>

                            <p className="text-[11px] text-[#6D6796] leading-relaxed">
                              {lang === 'id' ? badge.descId : badge.descEn}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* MODAL EDIT PROFIL */}
            {activeSheet === 'editProfile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    {editPhotoPreview ? (
                      <img 
                        src={editPhotoPreview} 
                        alt="Preview" 
                        className="w-20 h-20 rounded-full object-cover border-2 border-[#6367FF]"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#ECE9FF] flex items-center justify-center font-black text-[#6367FF] text-2xl">
                        {(editName || 'R').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-[#1E1B38] text-white text-[10px] font-bold p-1.5 rounded-full shadow-md hover:bg-[#6367FF] transition-colors flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <span className="text-[11px] text-[#6D6796]">
                    {lang === 'id' ? 'Ketuk kamera untuk upload foto profil' : 'Tap camera icon to upload photo'}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-[#1E1B38]">
                      {lang === 'id' ? 'Username' : 'Username'}
                    </label>
                    <span className="text-[10px] font-bold text-[#8494FF]">Maks. 8 Karakter</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 font-bold text-xs text-[#6D6796] select-none pointer-events-none">@</span>
                    <input 
                      type="text" 
                      maxLength={8}
                      value={editUsername}
                      onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8))}
                      className="w-full p-3 pl-8 rounded-xl border border-[#DDD5FF] bg-white text-xs text-[#1E1B38] font-bold outline-none focus:border-[#6367FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Bio / Kata Mutiara' : 'Bio / Personal Quote'}
                  </label>
                  <textarea 
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] outline-none resize-none focus:border-[#6367FF]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveSheet('profile')}
                    className="flex-1 py-3 rounded-xl border border-[#C9BEFF] font-bold text-xs text-[#1E1B38]"
                  >
                    {lang === 'id' ? 'Batal' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#6367FF]/25"
                  >
                    {lang === 'id' ? 'Simpan Profil' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* MODAL AUTH: DAFTAR / MASUK AKUN / RESET PASSWORD */}
            {activeSheet === 'authModal' && (
              authViewMode === 'forgot' ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!authForgotIdentifier.trim() || !authForgotEmail.trim() || !authForgotNewPassword) {
                      showToast(lang === 'id' ? 'Semua kolom wajib diisi!' : 'All fields are required!');
                      return;
                    }
                    if (authForgotNewPassword.length < 4) {
                      showToast(lang === 'id' ? 'Password baru minimal 4 karakter.' : 'Password must be at least 4 characters.');
                      return;
                    }
                    try {
                      const res = await resetPasswordOnServer(authForgotIdentifier.trim(), authForgotEmail.trim(), authForgotNewPassword);
                      if (res.error) {
                        showToast(res.error);
                        return;
                      }
                      if (res.user && res.state) {
                        updateAppState({
                          user: res.user,
                          isRegistered: true,
                          ...(res.state || {})
                        });
                        setAuthViewMode('auth');
                        setActiveSheet(null);
                        showToast(lang === 'id' ? 'Password berhasil diperbarui! Selamat datang kembali.' : 'Password reset successful!');
                      }
                    } catch (err) {
                      showToast(lang === 'id' ? 'Gagal reset password. Pastikan server aktif.' : 'Failed to reset password.');
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1E1B38]">
                      {lang === 'id' ? 'Pemulihan Akun' : 'Account Recovery'}
                    </h4>
                    <p className="text-xs text-[#6D6796] mt-1 leading-relaxed">
                      {lang === 'id' 
                        ? 'Masukkan username dan email yang terdaftar untuk membuat password baru.' 
                        : 'Enter your registered username and email to set a new password.'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                      {lang === 'id' ? 'Username Komunitas' : 'Username'}
                    </label>
                    <input 
                      type="text" 
                      required
                      value={authForgotIdentifier}
                      onChange={e => setAuthForgotIdentifier(e.target.value)}
                      placeholder="rocky_warrior"
                      className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] font-bold outline-none focus:border-[#6367FF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                      {lang === 'id' ? 'Email Terdaftar' : 'Registered Email'}
                    </label>
                    <input 
                      type="email" 
                      required
                      value={authForgotEmail}
                      onChange={e => setAuthForgotEmail(e.target.value)}
                      placeholder="rocky@example.com"
                      className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] outline-none focus:border-[#6367FF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                      {lang === 'id' ? 'Password Baru' : 'New Password'}
                    </label>
                    <input 
                      type="password" 
                      required
                      value={authForgotNewPassword}
                      onChange={e => setAuthForgotNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] outline-none focus:border-[#6367FF]"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthViewMode('auth')}
                      className="flex-1 py-3.5 rounded-2xl border border-[#C9BEFF] bg-white text-[#1E1B38] font-bold text-xs hover:bg-[#FAF8FF]"
                    >
                      {lang === 'id' ? 'Kembali' : 'Back'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 rounded-2xl bg-[#6367FF] text-white font-extrabold text-xs shadow-lg shadow-[#6367FF]/30 active:scale-[0.98] transition-all"
                    >
                      {lang === 'id' ? 'Simpan & Masuk' : 'Save & Log In'}
                    </button>
                  </div>
                </form>
              ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="flex border-b border-[#C9BEFF] pb-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
                      authMode === 'register' ? 'border-[#6367FF] text-[#6367FF]' : 'border-transparent text-[#6D6796]'
                    }`}
                  >
                    {lang === 'id' ? 'Daftar Akun Baru' : 'Register New Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
                      authMode === 'login' ? 'border-[#6367FF] text-[#6367FF]' : 'border-transparent text-[#6D6796]'
                    }`}
                  >
                    {lang === 'id' ? 'Masuk' : 'Log In'}
                  </button>
                </div>

                {authMode === 'register' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-[#1E1B38]">
                        {lang === 'id' ? 'Username' : 'Username'}
                      </label>
                      <span className="text-[10px] font-bold text-[#8494FF]">Maks. 8 Karakter</span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 font-bold text-xs text-[#6D6796] select-none pointer-events-none">@</span>
                      <input 
                        type="text" 
                        required
                        maxLength={8}
                        value={authUsername}
                        onChange={e => setAuthUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8))}
                        placeholder="pejuang"
                        className="w-full p-3 pl-8 rounded-xl border border-[#DDD5FF] bg-white text-xs text-[#1E1B38] font-bold outline-none focus:border-[#6367FF]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Alamat Email' : 'Email Address'}
                  </label>
                  <input 
                    type="email" 
                    required
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="rocky@example.com"
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] outline-none focus:border-[#6367FF]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-[#1E1B38]">
                      {lang === 'id' ? 'Kata Sandi' : 'Password'}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setAuthViewMode('forgot')}
                        className="text-[11px] font-bold text-[#6367FF] hover:underline"
                      >
                        {lang === 'id' ? 'Lupa Password?' : 'Forgot Password?'}
                      </button>
                    )}
                  </div>
                  <input 
                    type="password" 
                    required
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] outline-none focus:border-[#6367FF]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-[#6367FF] text-white font-extrabold text-sm shadow-lg shadow-[#6367FF]/25 active:scale-[0.98]"
                >
                  {authMode === 'register' 
                    ? (lang === 'id' ? 'Daftar Sekarang & Buka Akses Penuh' : 'Register & Unlock Full Access')
                    : (lang === 'id' ? 'Masuk ke Akun' : 'Sign In')}
                </button>

                <p className="text-[11px] text-center text-[#6D6796]">
                  {lang === 'id' 
                    ? 'Data streak lokalmu tidak akan hilang saat mendaftar.' 
                    : 'Your local streak data remains safe and intact.'}
                </p>
              </form>
              )
            )}

            {/* SOS RESCUE SHEET (RELEVAN KHUSUS TIAP HABIT + SMARTWATCH TOOL TRIGGER) */}
            {activeSheet === 'sos' && (() => {
              const sosConfig = HABIT_SOS_DATA[activeHabit] || HABIT_SOS_DATA.pmo;
              return (
                <div className="space-y-4">
                  {/* Warning Emosional Khusus Habit */}
                  <div className="bg-[#ECE9FF] border border-[#8494FF]/40 rounded-2xl p-4 text-xs">
                    <span className="font-extrabold text-[#6367FF] block mb-1 text-sm tracking-tight">
                      {lang === 'id' ? sosConfig.titleId : sosConfig.titleEn}
                    </span>
                    <p className="text-[#1E1B38] leading-relaxed font-semibold">
                      {lang === 'id' ? sosConfig.triggerWarningId : sosConfig.triggerWarningEn}
                    </p>
                  </div>

                  {/* 1. Trigger AI Langsung */}
                  <div 
                    onClick={() => {
                      if (!requireRegistration(lang === 'id' ? 'mengobrol dengan AI Maya' : 'chat with Maya AI')) return;
                      setActiveSheet('chat');
                      handleSendChat(lang === 'id' ? `SOS! Aku lagi sakau berat di kebiasaan ${habitLabelMap[activeHabit]}, tolong temenin dan kuatkan aku sekarang!` : `SOS! I have intense urge for ${habitLabelMap[activeHabit]}, guide me right now!`);
                    }}
                    className="p-4 bg-white border-2 border-[#6367FF] rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:bg-[#FAF8FF]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#6367FF] flex items-center justify-center text-white shadow-sm">
                        <svg className="w-5 h-5 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-[#1E1B38]">
                          {lang === 'id' ? 'Curhat Darurat Bareng Maya' : 'Emergency AI Companion Talk'}
                        </h5>
                        <p className="text-[11px] text-[#6D6796]">
                          {lang === 'id' ? 'Keluarkan beban pikiranmu detik ini tanpa dihakimi' : 'Release your thoughts right now'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[#6367FF] font-extrabold text-sm">➔</span>
                  </div>

                  {/* 2. Daftar Aksi SOS Spesifik Habit */}
                  <div className="space-y-2.5">
                    <h6 className="text-[11px] font-black uppercase tracking-wider text-[#6D6796]">
                      {lang === 'id' ? 'PILIHAN PANDUAN INTERAKTIF' : 'INTERACTIVE RESCUE PROTOCOLS'}
                    </h6>

                    {sosConfig.actions.map(act => (
                      <div
                        key={act.id}
                        onClick={() => {
                          if (act.id === '478') {
                            setIsBreathingOpen(true);
                          } else if (act.id === 'cold_water') {
                            setIsColdWaterOpen(true);
                          } else if (act.id === 'pushup') {
                            showToast(lang === 'id' ? 'Lakukan 20x push-up sekarang! Bakar dorongan jadi energi fisik!' : 'Drop and do 20 push-ups now!');
                          } else if (act.id === 'freeze_card' || act.id === 'lock_banking') {
                            showToast(lang === 'id' ? 'Tutup semua browser & app bank! Jauhkan HP dari tanganmu!' : 'Lock banking apps now!');
                          } else if (act.id === 'walk_away' || act.id === 'leave_room' || act.id === 'leave_venue') {
                            showToast(lang === 'id' ? 'Berdiri dan tinggalkan ruangan ini sekarang juga!' : 'Stand up and leave the place!');
                          } else if (act.id === 'flush_drugs') {
                            showToast(lang === 'id' ? 'Buang segera & putus kontak pemicu!' : 'Flush stash and block triggers!');
                          } else if (act.id === 'call_sponsor') {
                            showToast(lang === 'id' ? 'Segera hubungi orang terpercaya atau BNN 184!' : 'Call sponsor or support hotline!');
                          } else if (act.id === 'hydrate') {
                            showToast(lang === 'id' ? 'Minum air putih dingin perlahan-lahan...' : 'Drink cold water slowly...');
                          } else if (act.id === 'candy') {
                            showToast(lang === 'id' ? 'Kunyah permen mint untuk sensasi segar di mulut.' : 'Chew fresh mint candy.');
                          }
                        }}
                        className="p-3.5 bg-white border border-[#C9BEFF] hover:border-[#8494FF] rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#FAF8FF] border border-[#C9BEFF] flex items-center justify-center text-[#6367FF] flex-shrink-0">
                            {act.iconType === 'wind' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                              </svg>
                            )}
                            {act.iconType === 'droplet' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                              </svg>
                            )}
                            {act.iconType === 'activity' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                              </svg>
                            )}
                            {act.iconType === 'lock' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                            {act.iconType === 'log-out' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                              </svg>
                            )}
                            {act.iconType === 'trash' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            )}
                            {act.iconType === 'phone' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                            )}
                            {act.iconType === 'sparkles' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-[#1E1B38]">
                              {lang === 'id' ? act.titleId : act.titleEn}
                            </h5>
                            <p className="text-[11px] text-[#6D6796]">
                              {lang === 'id' ? act.descId : act.descEn}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#6367FF] bg-[#ECE9FF] px-3 py-1.5 rounded-xl border border-[#8494FF]/30 flex-shrink-0 min-w-[56px] text-center">
                          {act.id === '478' || act.id === 'cold_water' 
                            ? (lang === 'id' ? 'Buka' : 'Open') 
                            : (lang === 'id' ? 'Aksi' : 'Action')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 3. Tombol Aku Tersandung / Relapse Flow */}
                  <div className="pt-2 border-t border-[#C9BEFF]">
                    <button
                      onClick={() => setActiveSheet('relapseModal')}
                      className="w-full py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100/70 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 stroke-red-600" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      </svg>
                      <span>{lang === 'id' ? 'Aku Tersandung / Relapse Hari Ini' : 'I Slipped / Relapsed Today'}</span>
                    </button>
                  </div>

                  {/* Dopamine Menu Aksi Cepat */}
                  <div className="bg-[#FAF8FF] border border-[#C9BEFF] rounded-2xl p-4 space-y-2.5">
                    <h6 className="text-xs font-extrabold text-[#1E1B38] flex items-center gap-1.5">
                      <span>{lang === 'id' ? 'Menu Pengalih Cepat (3 Menit)' : 'Quick Reset Options (3 Min)'}</span>
                    </h6>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-[#1E1B38]">
                      <div className="bg-white p-2.5 rounded-xl border border-[#C9BEFF]/60 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        <span>{lang === 'id' ? 'Push-up 15x' : '15 Push-ups'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-[#C9BEFF]/60 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>{lang === 'id' ? 'Keluar Ruangan' : 'Step Outside'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-[#C9BEFF]/60 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                        <span>{lang === 'id' ? 'Putar Musik' : 'Play Music'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-[#C9BEFF]/60 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3h18v18H3zM9 9h6v6H9z" />
                        </svg>
                        <span>{lang === 'id' ? 'Bereskan Meja' : 'Tidy Up Desk'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Crisis Hotline */}
                  <div className="p-3 bg-red-50 border border-red-200/60 rounded-xl flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-red-800 block">
                        {lang === 'id' ? 'Butuh Bantuan Krisis?' : 'Need Crisis Support?'}
                      </span>
                      <span className="text-red-700/80">
                        {lang === 'id' ? 'Layanan Sejiwa / Kemenkes: Bebas Pulsa 119 ext 8' : 'Emergency Assistance: 119'}
                      </span>
                    </div>
                    <a
                      href="tel:119"
                      className="px-3 py-1.5 bg-red-600 text-white font-black text-xs rounded-lg active:scale-95 transition-transform"
                    >
                      {lang === 'id' ? 'Hubungi' : 'Call'}
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* CHAT AI SHEET */}
            {activeSheet === 'chat' && (
              <div className="space-y-4 flex flex-col h-[70vh]">
                <div className="p-3 bg-white border border-[#C9BEFF] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img 
                        src="/maya-avatar.jpg" 
                        alt="Maya Avatar" 
                        className="w-11 h-11 rounded-full object-cover border-2 border-[#6367FF]"
                      />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#1E1B38]">
                        {lang === 'id' ? 'Maya (AgainstMe AI)' : 'Maya (AgainstMe AI)'}
                      </h4>
                      <p className="text-[10px] text-[#6D6796] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        {lang === 'id' ? 'Siaga 24/7' : 'Online 24/7'}
                      </p>
                    </div>
                  </div>
                  {!isRegistered && (
                    <button 
                      onClick={() => {
                        setAuthMode('register');
                        setActiveSheet('authModal');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#6367FF] text-white text-[10px] font-bold"
                    >
                      {lang === 'id' ? 'Daftar Akun' : 'Register'}
                    </button>
                  )}
                </div>

                {!isRegistered && (
                  <div className="bg-[#C9BEFF]/30 border border-[#C9BEFF] rounded-xl p-2.5 text-[11px] text-[#1E1B38] leading-relaxed flex items-center justify-between">
                    <span>
                      {lang === 'id' 
                        ? 'Mode Tamu: Daftar akun untuk mengirim pesan & curhat.' 
                        : 'Guest Mode: Create an account to talk with AI.'}
                    </span>
                    <button 
                      onClick={() => {
                        setAuthMode('register');
                        setActiveSheet('authModal');
                      }}
                      className="underline font-bold text-[#6367FF]"
                    >
                      {lang === 'id' ? 'Daftar' : 'Sign Up'}
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2.5 p-2 scrollbar-none">
                  {chatMessages.map(m => (
                    <div 
                      key={m.id}
                      className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-[#6367FF] text-white rounded-tr-sm'
                            : 'bg-white border border-[#C9BEFF] text-[#1E1B38] rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isAiTyping && (
                    <div className="flex justify-start">
                      <div className="p-3 rounded-2xl bg-white border border-[#C9BEFF] text-xs text-[#6D6796] rounded-tl-sm">
                        {lang === 'id' ? 'Sedang mengetik balasan...' : 'Typing response...'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    lang === 'id' ? 'Aku lagi kepikiran mau relapse...' : 'I feel close to relapse...',
                    lang === 'id' ? 'Gimana cara ngusir rasa hampa?' : 'How to overcome emptiness?',
                    lang === 'id' ? 'Bantu aku grounding nafas' : 'Guide me in deep breathing'
                  ].map(quick => (
                    <button
                      key={quick}
                      onClick={() => handleSendChat(quick)}
                      className="px-2.5 py-1 rounded-full bg-[#C9BEFF]/30 hover:bg-[#C9BEFF]/60 text-[10px] font-semibold text-[#1E1B38] whitespace-nowrap"
                    >
                      {quick}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#C9BEFF]">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    placeholder={
                      isRegistered 
                        ? (lang === 'id' ? 'Ketik curhatan atau apa yang kamu rasakan...' : 'Type your thoughts or struggle...') 
                        : (lang === 'id' ? 'Daftar akun untuk mulai mengobrol...' : 'Register to start chatting...')
                    }
                    className="flex-1 p-3 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] outline-none focus:border-[#6367FF]"
                  />
                  <button 
                    onClick={() => handleSendChat()}
                    className="px-4 rounded-xl bg-[#6367FF] text-white font-bold text-xs active:scale-95 transition-transform"
                  >
                    {lang === 'id' ? 'Kirim' : 'Send'}
                  </button>
                </div>
              </div>
            )}

            {/* MODAL CATAT KAMBUH (RELAPSE FLOW RAMAH & ANTI-SHAMING) */}
            {activeSheet === 'relapseModal' && (
              <div className="space-y-4">
                <div className="bg-[#FAF8FF] border border-[#C9BEFF] rounded-2xl p-4 text-xs text-[#1E1B38] leading-relaxed shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-[#ECE9FF] flex items-center justify-center text-[#6367FF]">
                      <svg className="w-3.5 h-3.5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                        <path d="M8 12h8"/>
                      </svg>
                    </div>
                    <span className="font-extrabold text-[#6367FF] text-sm">
                      {lang === 'id' ? 'Tarik Napas... Kamu Tidak Gagal' : 'Take a Breath... You Did Not Fail'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6D6796]">
                    {lang === 'id'
                      ? 'Tersandung adalah bagian dari proses pemulihan otak. Hari-hari bersih yang sudah kamu lewati tidak sia-sia; otakmu sudah berubah lebih kuat dari sebelumnya. Mari jadikan ini data evaluasi.'
                      : 'A slip is part of neuro-recovery. The days you stayed clean were not wasted. Let us learn and stand right back up.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1.5">
                    {lang === 'id' ? 'Apa pemicu utama yang membuatmu tersandung?' : 'What was the main trigger?'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      lang === 'id' ? 'Stres / Beban Pikiran' : 'Stress',
                      lang === 'id' ? 'Bosan / Sendirian' : 'Boredom / Alone',
                      lang === 'id' ? 'Lelah / Begadang' : 'Fatigue / Late Night',
                      lang === 'id' ? 'Pengaruh Teman / Circle' : 'Peer Pressure',
                      lang === 'id' ? 'Scroll Sosmed / Trigger Visual' : 'Social Media Trigger'
                    ].map(trig => (
                      <button
                        key={trig}
                        type="button"
                        onClick={() => setRelapseReason(trig)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                          relapseReason === trig
                            ? 'bg-[#6367FF] text-white border-[#6367FF]'
                            : 'bg-white text-[#6D6796] border-[#C9BEFF]'
                        }`}
                      >
                        {trig}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1.5">
                    {lang === 'id' ? 'Pelajaran apa yang kamu dapat untuk langkah ke depan?' : 'What lesson did you learn for next time?'}
                  </label>
                  <textarea
                    rows="3"
                    value={relapseNotes}
                    onChange={e => setRelapseNotes(e.target.value)}
                    placeholder={lang === 'id' ? 'Misal: Jangan pegang HP sendirian di kamar lewat jam 11 malam...' : 'e.g. Keep phone outside bedroom after 11 PM...'}
                    className="w-full p-3.5 rounded-xl border border-[#C9BEFF] bg-white text-xs text-[#1E1B38] font-semibold outline-none focus:border-[#6367FF]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleConfirmRelapse}
                    className="w-full py-4 rounded-2xl bg-[#1E1B38] text-white font-extrabold text-xs shadow-lg active:scale-[0.98] transition-all"
                  >
                    {lang === 'id' ? 'Simpan Catatan, Reset Timer & Berdiri Lagi' : 'Log Slip, Reset Timer & Stand Up'}
                  </button>
                </div>
              </div>
            )}

            {/* MODAL RIWAYAT RELAPSE (DAFTAR TANGGAL & JUMLAH RELAPSE) */}
            {activeSheet === 'relapseHistory' && (
              <div className="space-y-4">
                <div className="bg-[#FAF8FF] border border-[#C9BEFF] rounded-2xl p-4 text-xs text-[#1E1B38] leading-relaxed flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-[#1E1B38] block mb-0.5 text-sm">
                      {lang === 'id' ? 'Total Tersandung:' : 'Total Slips Recorded:'}
                    </span>
                    <span className="text-xs text-[#6D6796]">
                      {lang === 'id' ? `Khusus kebiasaan ${habitLabelMap[activeHabit]}` : `For ${habitLabelMap[activeHabit]}`}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-[#6367FF] bg-[#ECE9FF] px-3.5 py-1.5 rounded-xl border border-[#6367FF]/20">
                    {habitData.relapses?.length || 0}x
                  </span>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {(!habitData.relapses || habitData.relapses.length === 0) ? (
                    <div className="p-8 text-center bg-white border border-[#C9BEFF] rounded-2xl flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#ECE9FF] flex items-center justify-center text-[#6367FF] mb-3">
                        <svg className="w-6 h-6 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-[#1E1B38]">
                        {lang === 'id' ? 'Belum Ada Riwayat Kambuh!' : 'Zero Slips Recorded!'}
                      </p>
                      <p className="text-[11px] text-[#6D6796] mt-1">
                        {lang === 'id' ? 'Pertahananmu masih sangat kokoh. Lanjutkan perjuanganmu!' : 'Your discipline is holding strong. Keep going!'}
                      </p>
                    </div>
                  ) : (
                    habitData.relapses.map((rel, idx) => {
                      const relDate = new Date(rel.date);
                      const dateFormatted = relDate.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={rel.id || idx} className="p-3.5 bg-white border border-[#C9BEFF] rounded-2xl text-xs space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-[#1E1B38]">
                              #{habitData.relapses.length - idx} · {rel.reason || 'Kambuh'}
                            </span>
                            <span className="text-[10px] font-bold text-[#6D6796] bg-[#C9BEFF]/30 px-2 py-0.5 rounded-md">
                              {dateFormatted}
                            </span>
                          </div>
                          {rel.notes && (
                            <p className="text-[11px] text-[#1E1B38] italic bg-[#FAF8FF]/70 p-2 rounded-lg border border-[#C9BEFF]/40">
                              "{rel.notes}"
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveSheet('relapseModal')}
                    className="w-full py-3.5 rounded-2xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#6367FF]/30 active:scale-95 transition-all"
                  >
                    + {lang === 'id' ? 'Catat Kambuh Baru' : 'Record New Slip'}
                  </button>
                </div>
              </div>
            )}

            {/* MODAL HEALTH RECOVERY TIMELINE & URGE HEATMAP TRACKER */}
            {activeSheet === 'healthTracker' && (() => {
              const currentHabitRecovery = HEALTH_RECOVERY_DATA[activeHabit] || HEALTH_RECOVERY_DATA.tobacco;
              const habitStartSec = new Date(habitData.startDate || Date.now()).getTime();
              const elapsedSec = Math.max(0, Math.floor((Date.now() - habitStartSec) / 1000));

              // Hitung distribusi jam godaan untuk Heatmap (24 jam)
              const hourCounts = Array(24).fill(0);
              const relevantLogs = (urgeLogs || []).filter(l => !l.habit || l.habit === activeHabit);
              relevantLogs.forEach(l => {
                if (l.timestamp) {
                  const hr = new Date(l.timestamp).getHours();
                  if (hr >= 0 && hr < 24) hourCounts[hr] += 1;
                }
              });
              const maxCountInHour = Math.max(1, ...hourCounts);

              return (
                <div className="space-y-4">
                  {/* Segment Switcher: Timeline vs Heatmap */}
                  <div className="flex p-1 bg-white border border-[#C9BEFF] rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setActiveHealthTab('timeline')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                        activeHealthTab === 'timeline'
                          ? 'bg-[#6367FF] text-white shadow-sm'
                          : 'text-[#6D6796] hover:text-[#1E1B38]'
                      }`}
                    >
                      {lang === 'id' ? 'Pemulihan Organ' : 'Recovery Timeline'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveHealthTab('heatmap')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                        activeHealthTab === 'heatmap'
                          ? 'bg-[#6367FF] text-white shadow-sm'
                          : 'text-[#6D6796] hover:text-[#1E1B38]'
                      }`}
                    >
                      {lang === 'id' ? 'Peta Jam Godaan' : 'Urge Patterns'}
                    </button>
                  </div>

                  {/* TAB 1: EVIDENCE-BASED HEALTH TIMELINE */}
                  {activeHealthTab === 'timeline' && (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-white border border-[#C9BEFF] rounded-2xl text-xs text-[#1E1B38] flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-[#1E1B38] block">
                            {lang === 'id' ? `Progres Biologis: ${habitLabelMap[activeHabit]}` : `Biological Reset: ${habitLabelMap[activeHabit]}`}
                          </span>
                          <span className="text-[11px] text-[#6D6796]">
                            {currentHabitRecovery.filter(m => elapsedSec >= m.secondsRequired).length} / {currentHabitRecovery.length} {lang === 'id' ? 'Tahap Tercapai' : 'Milestones Achieved'}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-black text-[#6367FF] bg-[#ECE9FF] px-2.5 py-1 rounded-lg">
                          {Math.round((currentHabitRecovery.filter(m => elapsedSec >= m.secondsRequired).length / currentHabitRecovery.length) * 100)}%
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                        {currentHabitRecovery.map((item, idx) => {
                          const isDone = elapsedSec >= item.secondsRequired;
                          const progressPct = isDone 
                            ? 100 
                            : Math.min(99, Math.round((elapsedSec / item.secondsRequired) * 100));

                          return (
                            <div 
                              key={idx}
                              className={`p-4 rounded-2xl border transition-all ${
                                isDone 
                                  ? 'bg-white border-[#8494FF]/60 shadow-sm' 
                                  : 'bg-[#FAF8FF]/70 border-[#C9BEFF]/60 opacity-80'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                                    isDone ? 'bg-[#6367FF] text-white' : 'bg-gray-100 text-gray-400'
                                  }`}>
                                    {isDone ? (
                                      <svg className="w-3.5 h-3.5 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    ) : (
                                      <span className="font-bold text-[10px]">{idx + 1}</span>
                                    )}
                                  </div>
                                  <h4 className="font-extrabold text-xs text-[#1E1B38]">
                                    {lang === 'id' ? item.titleId : item.titleEn}
                                  </h4>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                  isDone 
                                    ? 'bg-[#ECE9FF] text-[#6367FF]' 
                                    : 'bg-gray-100 text-[#6D6796]'
                                }`}>
                                  {isDone ? (lang === 'id' ? 'Pulih' : 'Restored') : `${progressPct}%`}
                                </span>
                              </div>

                              <p className="text-[11px] text-[#6D6796] leading-relaxed mb-2 pl-8">
                                {lang === 'id' ? item.descId : item.descEn}
                              </p>

                              {!isDone && (
                                <div className="w-full h-1.5 bg-[#C9BEFF]/30 rounded-full overflow-hidden ml-8 max-w-[calc(100%-2rem)]">
                                  <div 
                                    className="h-full bg-[#6367FF] rounded-full transition-all duration-300"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: URGE HEATMAP & PATTERN RECOGNITION */}
                  {activeHealthTab === 'heatmap' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-white border border-[#C9BEFF] rounded-2xl space-y-2 text-left">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-xs text-[#1E1B38]">
                            {lang === 'id' ? 'Distribusi Jam Rawan Godaan' : 'Vulnerable Hours Distribution'}
                          </span>
                          <span className="text-[10px] text-[#6D6796]">
                            {relevantLogs.length} {lang === 'id' ? 'Data Tercatat' : 'Logs Analyzed'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6D6796] leading-relaxed">
                          {lang === 'id' 
                            ? 'Kotak yang lebih gelap menandakan jam-jam di mana kamu paling sering merasakan dorongan impuls.' 
                            : 'Darker blocks represent peak hours when craving impulses strike most frequently.'}
                        </p>

                        {/* 24-Hour Blocks Grid */}
                        <div className="grid grid-cols-6 gap-1.5 pt-2">
                          {hourCounts.map((count, hr) => {
                            const intensityLevel = count === 0 
                              ? 'bg-gray-50 text-gray-400 border-gray-200' 
                              : count / maxCountInHour > 0.6 
                              ? 'bg-[#6367FF] text-white border-[#6367FF] shadow-sm' 
                              : 'bg-[#ECE9FF] text-[#6367FF] border-[#C9BEFF]';

                            return (
                              <div 
                                key={hr} 
                                className={`p-2 rounded-xl border text-center transition-all ${intensityLevel}`}
                              >
                                <span className="block text-[9px] font-black">{String(hr).padStart(2, '0')}:00</span>
                                <span className="block text-[11px] font-extrabold mt-0.5">{count}x</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Log Godaan Button & List */}
                      <div className="p-4 bg-white border border-[#C9BEFF] rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-xs text-[#1E1B38]">
                            {lang === 'id' ? 'Catatan Godaan Terakhir' : 'Recent Urge Entries'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsLogUrgeModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-[#6367FF] text-white font-extrabold text-[11px] shadow-sm hover:bg-[#4F53EB] active:scale-95 transition-all"
                          >
                            + {lang === 'id' ? 'Catat Godaan' : 'Log Urge'}
                          </button>
                        </div>

                        {relevantLogs.length === 0 ? (
                          <p className="text-[11px] text-[#6D6796] text-center py-4">
                            {lang === 'id' ? 'Belum ada catatan godaan. Ketuk "+ Catat Godaan" saat dorongan datang.' : 'No urges logged yet. Tap "+ Log Urge" when cravings strike.'}
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {relevantLogs.slice(0, 5).map(log => {
                              const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const dateStr = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                              return (
                                <div key={log.id} className="p-2.5 rounded-xl bg-[#FAF8FF] border border-[#C9BEFF] flex justify-between items-center text-xs">
                                  <div>
                                    <span className="font-bold text-[#1E1B38] block">{log.trigger}</span>
                                    <span className="text-[10px] text-[#6D6796]">{dateStr} · {timeStr}</span>
                                  </div>
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#ECE9FF] text-[#6367FF]">
                                    {lang === 'id' ? 'Level' : 'Intensity'} {log.intensity}/5
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* MODAL EDIT TANGGAL BERHENTI */}
            {activeSheet === 'editDate' && (
              <div className="space-y-4">
                <div className="bg-white border border-[#C9BEFF] rounded-2xl p-4 text-xs text-[#1E1B38] leading-relaxed">
                  <span className="font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? `Kapan kamu mulai berhenti ${habitLabelMap[activeHabit]}?` : `When did you quit ${habitLabelMap[activeHabit]}?`}
                  </span>
                  {lang === 'id' 
                    ? 'Jika kamu sebetulnya sudah mulai berhenti beberapa hari atau bulan lalu, sesuaikan tanggalnya di sini. Streak & levelmu akan langsung dihitung otomatis.'
                    : 'If you actually started earlier, adjust the date here. Your streak and progress will update instantly.'}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1.5">
                    {lang === 'id' ? 'Pilih Tanggal Mulai' : 'Select Start Date'}
                  </label>
                  <input 
                    type="date"
                    max={todayStr}
                    value={editDateValue}
                    onChange={e => setEditDateValue(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-[#C9BEFF] bg-white text-[#1E1B38] font-bold text-base outline-none focus:border-[#6367FF]"
                  />
                </div>

                <button 
                  onClick={handleSaveNewDate}
                  className="w-full py-4 rounded-2xl bg-[#6367FF] text-white font-extrabold text-sm shadow-lg shadow-[#6367FF]/25 active:scale-[0.98] transition-all"
                >
                  {lang === 'id' ? 'Simpan Tanggal & Hitung Ulang' : 'Save & Recalculate'}
                </button>
              </div>
            )}

            {/* MODAL CATAT GODAAN KHUSUS JUDI */}
            {activeSheet === 'logUrge' && (
              <div className="space-y-4">
                <div className="bg-[#ECE9FF] border border-[#8494FF]/20 rounded-2xl p-4 text-xs text-[#1E1B38] leading-relaxed">
                  <span className="font-extrabold text-[#6367FF] block mb-1">
                    {lang === 'id' ? 'Ubah Hasrat Jadi Tabungan' : 'Redirect Urge Into Real Savings'}
                  </span>
                  {lang === 'id' 
                    ? 'Berapa rupiah uang yang tadi hampir kamu masukkan ke judi/deposit? Ketik di bawah. Setiap kamu berhasil menahan diri, uang ini dianggap terselamatkan.'
                    : 'How much money were you about to deposit/bet? Log it here. Each time you resist, it goes to your piggybank.'}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1.5">
                    {lang === 'id' ? 'Nominal yang Batal Dipertaruhkan (Rp)' : 'Saved Amount ($ / IDR)'}
                  </label>
                  <input 
                    type="text"
                    placeholder={lang === 'id' ? 'Contoh: 50.000' : 'e.g. 50.000'}
                    value={customUrgeAmountFormatted}
                    onChange={e => setCustomUrgeAmountFormatted(formatNumberInput(e.target.value))}
                    className="w-full p-3.5 rounded-xl border border-[#C9BEFF] bg-white text-[#1E1B38] font-black text-lg outline-none focus:border-[#6367FF]"
                  />
                  <span className="text-[11px] text-[#6D6796] mt-1 block">
                    {lang === 'id' 
                      ? 'Format otomatis titik ribuan (misal: 500000 jadi 500.000).' 
                      : 'Automatic thousands separator formatting.'}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1.5">
                    {lang === 'id' ? 'Apa pemicu godaannya tadi?' : 'What triggered this urge?'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      lang === 'id' ? 'Bosan' : 'Boredom',
                      lang === 'id' ? 'Stres' : 'Stress',
                      lang === 'id' ? 'Lihat Iklan' : 'Saw Ads',
                      lang === 'id' ? 'Teman' : 'Peer',
                      lang === 'id' ? 'Kesepian' : 'Loneliness',
                      lang === 'id' ? 'Pengen Balas Modal' : 'Chasing Loss'
                    ].map(trig => (
                      <button
                        key={trig}
                        type="button"
                        onClick={() => setCustomUrgeTrigger(trig)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          customUrgeTrigger === trig
                            ? 'border-[#6367FF] bg-[#ECE9FF] text-[#6367FF]'
                            : 'border-[#C9BEFF] bg-white text-[#6D6796]'
                        }`}
                      >
                        {trig}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleSaveUrge}
                  className="w-full py-4 rounded-2xl bg-[#6367FF] text-white font-extrabold text-sm shadow-lg shadow-[#8494FF]/30 active:scale-[0.98] transition-all"
                >
                  {lang === 'id' ? 'Selamatkan Uang Ini — Aku Gak Judi' : "Save This Money — I Didn't Gamble"}
                </button>
              </div>
            )}

            {/* MANAGE / ADD HABITS SHEET (CLEAN, ELEGAN & TERSTRUKTUR) */}
            {activeSheet === 'manageHabits' && (
              <div className="space-y-4">
                <div className="bg-white border border-[#DDD5FF] rounded-2xl p-4 text-xs text-[#1E1B38] leading-relaxed shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#6367FF]"></span>
                    <span className="font-extrabold text-[#6367FF] text-xs">
                      {lang === 'id' ? 'Kustomisasi Program Pemulihan' : 'Customize Recovery Programs'}
                    </span>
                  </div>
                  <p className="text-[#6D6796] text-[11px] leading-relaxed">
                    {lang === 'id' 
                      ? 'Kamu bisa menambah atau menonaktifkan pemantauan kebiasaan kapan saja. Timer streak setiap habit berjalan mandiri.' 
                      : 'You can toggle habits anytime. Each habit runs on its own independent streak timer.'}
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: 'narcotics',
                      name: 'Rehab (Narkotika & Zat)',
                      desc: lang === 'id' ? 'Pemulihan zat adiktif, penanganan sakau & hemat jutaan rupiah dari dosis.' : 'Overcome chemical dependency, craving relief & save on doses.',
                      badge: lang === 'id' ? 'Kritis' : 'Critical'
                    },
                    {
                      id: 'gambling',
                      name: lang === 'id' ? 'Judi Online & Slot' : 'Gambling & Slots',
                      desc: lang === 'id' ? 'Hentikan impuls deposit dan catat celengan penyelamat godaan.' : 'Block impulse deposits and track urge savings.',
                      badge: lang === 'id' ? 'Finansial' : 'Financial'
                    },
                    {
                      id: 'pmo',
                      name: 'PMO (Porn & Masturbation)',
                      desc: lang === 'id' ? 'Reset dopamin alami dan pulihkan fokus mental lewat 6 rank ksatria.' : 'Natural dopamine reset and mental focus across 6 mastery ranks.',
                      badge: lang === 'id' ? 'Dopamin' : 'Dopamine'
                    },
                    {
                      id: 'tobacco',
                      name: lang === 'id' ? 'Rokok & Vaping' : 'Smoking & Vaping',
                      desc: lang === 'id' ? 'Bersihkan paru-paru dan tabung uang rokok ke target impian.' : 'Cleanse lungs and convert cigarette expenses into dream goals.',
                      badge: lang === 'id' ? 'Kesehatan' : 'Health'
                    },
                    {
                      id: 'alcohol',
                      name: lang === 'id' ? 'Alkohol & Minuman Keras' : 'Alcohol & Drinking',
                      desc: lang === 'id' ? 'Pemulihan organ hati, kejernihan pikiran, dan hemat jutaan rupiah.' : 'Liver recovery, mental clarity, and massive financial savings.',
                      badge: lang === 'id' ? 'Organ' : 'Health'
                    }
                  ].map(h => {
                    const isCurrentlyActive = !!habits[h.id]?.active;
                    return (
                      <div 
                        key={h.id}
                        className={`p-4 rounded-2xl border transition-all text-left space-y-2.5 ${
                          isCurrentlyActive 
                            ? 'bg-white border-[#6367FF]/50 shadow-sm' 
                            : 'bg-[#FAF8FF] border-[#DDD5FF]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-sm text-[#1E1B38]">{h.name}</span>
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#ECE9FF] text-[#6367FF] border border-[#6367FF]/20">
                                {h.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6D6796] mt-1 leading-snug">{h.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#DDD5FF]/60">
                          <div className="text-[10px] font-bold">
                            {isCurrentlyActive ? (
                              <span className="text-[#6367FF] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6367FF]"></span>
                                {lang === 'id' ? 'Aktif Dipantau' : 'Active'}
                              </span>
                            ) : (
                              <span className="text-[#6D6796]">
                                {lang === 'id' ? 'Belum Aktif' : 'Inactive'}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isCurrentlyActive) {
                                if (activeHabitKeys.length <= 1) {
                                  showToast(lang === 'id' ? 'Minimal harus ada 1 habit yang aktif dipantau!' : 'At least 1 habit must remain active!');
                                  return;
                                }
                                setHabitToDelete(h);
                              } else {
                                setHabitToConfigure(h);
                                setNewHabitStartDate(new Date().toISOString().split('T')[0]);
                              }
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm ${
                              isCurrentlyActive
                                ? 'bg-[#FAF8FF] border border-[#DDD5FF] text-[#6D6796] hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                : 'bg-[#6367FF] hover:bg-[#4F53EB] text-white shadow-[#6367FF]/20'
                            }`}
                          >
                            {isCurrentlyActive 
                              ? (lang === 'id' ? 'Nonaktifkan' : 'Remove') 
                              : (lang === 'id' ? '+ Tambah' : '+ Add')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SETTINGS CONTENT */}
            {activeSheet === 'settings' && (
              <div className="space-y-4">
                {/* Program Habit Pemulihan */}
                <div className="bg-white border border-[#DDD5FF] rounded-2xl p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <div className="text-sm font-bold text-[#1E1B38]">
                      {lang === 'id' ? 'Program Habit Pemulihan' : 'Recovery Habits'}
                    </div>
                    <div className="text-xs text-[#6D6796]">
                      {lang === 'id' ? `${activeHabitKeys.length} habit aktif dipantau` : `${activeHabitKeys.length} active habits`}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSheet('manageHabits')}
                    className="px-3 py-1.5 rounded-xl bg-[#6367FF] text-white font-black text-xs hover:bg-[#4F53EB] active:scale-95 transition-all shadow-md shadow-[#6367FF]/20 flex items-center gap-1"
                  >
                    <span>{lang === 'id' ? 'Kelola' : 'Manage'}</span>
                  </button>
                </div>

                {/* Cadangan & Pulihkan Data JSON (Data Sovereignty) */}
                <div className="bg-white border border-[#DDD5FF] rounded-2xl p-4 space-y-3 shadow-sm">
                  <div>
                    <div className="text-sm font-extrabold text-[#1E1B38]">
                      {lang === 'id' ? 'Cadangan & Pemulihan Data' : 'Backup & Data Recovery'}
                    </div>
                    <div className="text-xs text-[#6D6796]">
                      {lang === 'id' 
                        ? 'Simpan riwayat perjuanganmu sebagai file JSON atau pindahkan ke HP lain.' 
                        : 'Export your recovery history to a JSON file or restore on another device.'}
                    </div>
                  </div>

                  {/* Hidden file input untuk restore */}
                  <input
                    type="file"
                    ref={backupFileInputRef}
                    onChange={handleImportBackupFile}
                    accept=".json"
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="py-2.5 px-3 rounded-xl bg-[#ECE9FF] text-[#6367FF] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-[#DDD5FF] active:scale-95 transition-all border border-[#8494FF]/30"
                    >
                      <svg className="w-4 h-4 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      <span>{lang === 'id' ? 'Cadangkan' : 'Export'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current && backupFileInputRef.current.click()}
                      className="py-2.5 px-3 rounded-xl bg-white text-[#1E1B38] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-[#FAF8FF] active:scale-95 transition-all border border-[#C9BEFF]"
                    >
                      <svg className="w-4 h-4 stroke-[#1E1B38]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span>{lang === 'id' ? 'Pulihkan File' : 'Restore Backup'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-[#C9BEFF] rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-[#1E1B38]">
                        {lang === 'id' ? 'Bahasa Aplikasi' : 'App Language'}
                      </div>
                      <div className="text-xs text-[#6D6796]">
                        {lang === 'id' ? 'Bahasa Indonesia (ID)' : 'English (EN)'}
                      </div>
                    </div>
                    <div className="flex items-center bg-[#FAF9FF] p-1 rounded-xl border border-[#C9BEFF]">
                      <button
                        onClick={() => updateAppState({ lang: 'id' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          lang === 'id'
                            ? 'bg-[#6367FF] text-white shadow-sm'
                            : 'text-[#6D6796] hover:text-[#1E1B38]'
                        }`}
                      >
                        ID
                      </button>
                      <button
                        onClick={() => updateAppState({ lang: 'en' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          lang === 'en'
                            ? 'bg-[#6367FF] text-white shadow-sm'
                            : 'text-[#6D6796] hover:text-[#1E1B38]'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#C9BEFF]/50">
                    <div>
                      <div className="text-sm font-bold text-[#1E1B38]">
                        {lang === 'id' ? 'Status Akun' : 'Account Status'}
                      </div>
                      <div className="text-xs text-[#6367FF] font-bold">
                        {isRegistered ? `@${user?.username || 'user'}` : (lang === 'id' ? 'Mode Tamu' : 'Guest Mode')}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#6367FF]">
                      {isRegistered 
                        ? (lang === 'id' ? 'Sinkron Server' : 'Server Synced') 
                        : (lang === 'id' ? 'Lokal di Perangkat' : 'Local Device')}
                    </span>
                  </div>
                </div>

                {/* Privacy Policy Link Card */}
                <div 
                  onClick={() => setActiveSheet('privacyPolicy')}
                  className="bg-white border border-[#DDD5FF] rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:border-[#8494FF] transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8FF] border border-[#DDD5FF] flex items-center justify-center text-[#6367FF]">
                      <svg className="w-4 h-4 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#1E1B38]">
                        {lang === 'id' ? 'Kebijakan Privasi & Keamanan' : 'Privacy Policy & Security'}
                      </div>
                      <div className="text-[11px] text-[#6D6796]">
                        {lang === 'id' ? 'Komitmen perlindungan data pengguna' : 'Our commitment to user data protection'}
                      </div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 stroke-[#6D6796]" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>

                {/* Tombol Rahasia Khusus Administrator (@admin) */}
                {isAdmin && (
                  <div 
                    onClick={handleOpenAdminPanel}
                    className="bg-gradient-to-r from-[#1E1B38] to-[#2E285C] border border-[#8494FF]/40 rounded-2xl p-4 flex justify-between items-center cursor-pointer shadow-md text-white group hover:border-[#6367FF] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#C9BEFF]">
                        <svg className="w-4 h-4 stroke-[#C9BEFF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <circle cx="12" cy="11" r="3"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>Panel Moderasi Admin</span>
                          <span className="px-1.5 py-0.2 rounded bg-[#6367FF] text-[9px] font-black text-white uppercase tracking-wider">Khusus @admin</span>
                        </div>
                        <div className="text-[11px] text-[#C9BEFF]">
                          Kelola user terdaftar & moderasi komunitas
                        </div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 stroke-[#C9BEFF] group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                )}

                {isRegistered ? (
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={onReset}
                      className="w-full py-3.5 rounded-xl bg-white border border-[#DDD5FF] text-[#6D6796] hover:text-[#1E1B38] hover:bg-[#FAF8FF] font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 stroke-[#6D6796]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      <span>{lang === 'id' ? 'Keluar dari Akun (Logout)' : 'Log Out from Account'}</span>
                    </button>

                    <button
                      onClick={() => setIsDeleteAccountModalOpen(true)}
                      className="w-full py-3 rounded-xl bg-red-50 border border-red-200/80 text-red-600 font-extrabold text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 stroke-red-600" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      <span>{lang === 'id' ? 'Hapus Akun & Seluruh Data Permanen' : 'Delete Account & All Data Permanently'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={onReset}
                      className="w-full py-3 rounded-xl border border-[#DDD5FF] text-[#6367FF] font-bold text-xs hover:bg-[#FAF8FF]"
                    >
                      {lang === 'id' ? 'Reset Ulang Perjalanan (Mulai Dari Awal)' : 'Reset All Progress (Start Fresh)'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(lang === 'id' ? 'Yakin hapus seluruh data tersimpan di perangkat ini?' : 'Delete all local data?')) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-red-50 border border-red-200/80 text-red-600 font-extrabold text-xs hover:bg-red-100 transition-colors"
                    >
                      {lang === 'id' ? 'Hapus Seluruh Data Perangkat' : 'Wipe All Device Data'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PANEL MODERASI ADMIN (KHUSUS AKUN @admin) */}
            {activeSheet === 'adminPanel' && (
              <div className="space-y-4 text-left text-xs text-[#1E1B38]">
                <div className="p-4 bg-gradient-to-br from-[#1E1B38] to-[#2E285C] border border-[#8494FF]/40 rounded-2xl text-white space-y-2">
                  <span className="text-[10px] font-black uppercase text-[#C9BEFF] tracking-wider block">
                    KONSOL ADMINISTRATOR
                  </span>
                  <h4 className="font-extrabold text-base text-white">
                    Pusat Kendali Pengguna & Komunitas
                  </h4>
                  <p className="text-[#C9BEFF] text-[11px] leading-relaxed">
                    Pantau akun terdaftar di SQLite STB dan blokir akun yang menggunakan username tidak pantas atau spammer.
                  </p>
                </div>

                <div className="flex justify-between items-center px-1">
                  <span className="font-bold text-xs text-[#1E1B38]">
                    Daftar Pengguna ({adminUsersList.length})
                  </span>
                  <button
                    onClick={handleOpenAdminPanel}
                    className="text-[11px] font-bold text-[#6367FF] hover:underline"
                  >
                    Muat Ulang
                  </button>
                </div>

                {isLoadingAdminUsers ? (
                  <div className="p-8 text-center text-[#6D6796] animate-pulse">
                    Memuat data pengguna dari STB...
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                    {adminUsersList.map(u => (
                      <div 
                        key={u.username}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          u.isBanned 
                            ? 'bg-red-50/70 border-red-200' 
                            : 'bg-white border-[#DDD5FF]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-[#1E1B38] truncate">{u.name}</span>
                            <span className="font-bold text-[11px] text-[#6367FF] truncate">@{u.username}</span>
                            {u.isBanned && (
                              <span className="px-1.5 py-0.2 rounded bg-red-600 text-white font-black text-[9px]">
                                DIBLOKIR
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#6D6796] truncate">{u.email}</div>
                          <div className="text-[9px] text-[#8494FF] mt-0.5">Terdaftar: {u.createdAt?.slice(0, 10)}</div>
                        </div>

                        {u.username !== 'admin' && (
                          <button
                            onClick={() => handleToggleBanUser(u.username, u.isBanned)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors ${
                              u.isBanned
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {u.isBanned ? 'Buka Blokir' : 'Blokir (Ban)'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HALAMAN KEBIJAKAN PRIVASI (GOOGLE PLAY STORE REQUIREMENT) */}
            {activeSheet === 'privacyPolicy' && (
              <div className="space-y-4 text-left text-xs leading-relaxed text-[#1E1B38]">
                <div className="p-4 bg-gradient-to-br from-white to-[#FAF8FF] border border-[#DDD5FF] rounded-2xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-[#8494FF] tracking-wider block">
                    {lang === 'id' ? 'Komitmen Privasi Kedaulatan' : 'Privacy & Sovereignty'}
                  </span>
                  <h4 className="font-extrabold text-sm text-[#1E1B38]">
                    {lang === 'id' ? 'Data Kamu Milik Kamu Sepenuhnya' : 'Your Data Belongs to You'}
                  </h4>
                  <p className="text-[#6D6796] text-[11px]">
                    {lang === 'id' 
                      ? 'AgainstMe dibangun dengan prinsip Zero-Exploitation. Perjalanan pemulihanmu adalah privasi sakral yang wajib dilindungi.' 
                      : 'AgainstMe is built with Zero-Exploitation principles. Your recovery is strictly private and guarded.'}
                  </p>
                </div>

                <div className="space-y-3 p-1">
                  <div className="space-y-1">
                    <h5 className="font-bold text-[#1E1B38]">
                      {lang === 'id' ? '1. Data Apa yang Disimpan?' : '1. What Data Do We Store?'}
                    </h5>
                    <p className="text-[#6D6796] text-[11px]">
                      {lang === 'id' 
                        ? 'Hanya tanggal mulai berhenti, pilihan habit yang dipantau, catatan check-in harian, dan ringkasan obrolan dengan AI Maya. Kami TIDAK mengumpulkan nomor KTP, nomor HP, kontak buku telepon, atau lokasi GPS.' 
                        : 'Only your quit start date, monitored habit categories, daily check-in ratings, and conversation logs with Maya AI. We do NOT collect identity numbers, phone contacts, or GPS location.'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-bold text-[#1E1B38]">
                      {lang === 'id' ? '2. Penggunaan Data' : '2. How Data Is Used'}
                    </h5>
                    <p className="text-[#6D6796] text-[11px]">
                      {lang === 'id' 
                        ? 'Data hanya digunakan untuk menghitung progres streak, kalkulasi uang yang dihemat, serta memberikan panduan personal oleh AI Maya. Kami TIDAK PERNAH menjual atau membagikan data kepada pihak pengiklan mana pun.' 
                        : 'Data is strictly utilized to calculate clean streak progress, money saved, and provide tailored AI encouragement. We NEVER sell or share personal data with advertisers.'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-bold text-[#1E1B38]">
                      {lang === 'id' ? '3. Hak Menghapus Data (Right to be Forgotten)' : '3. Right to Delete (Account Erasure)'}
                    </h5>
                    <p className="text-[#6D6796] text-[11px]">
                      {lang === 'id' 
                        ? 'Kamu berhak menghapus akun dan seluruh data riwayatmu secara permanen kapan saja melalui menu Pengaturan > Hapus Akun. Sekali dihapus, data langsung musnah dari basis data dan tidak bisa dipulihkan.' 
                        : 'You retain the absolute right to delete your account and entire history permanently anytime via Settings > Delete Account. Erasure is immediate and irreversible.'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-bold text-[#1E1B38]">
                      {lang === 'id' ? '4. Kontak Pengembang' : '4. Developer Contact'}
                    </h5>
                    <p className="text-[#6D6796] text-[11px]">
                      {lang === 'id' 
                        ? 'Untuk pertanyaan keamanan atau permohonan data, hubungi tim kami di support@againstme.id.' 
                        : 'For security inquiries or data requests, contact us at support@againstme.id.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSheet('settings')}
                  className="w-full py-3 rounded-xl bg-[#6367FF] text-white font-bold text-xs shadow-sm active:scale-95 transition-all mt-4"
                >
                  {lang === 'id' ? 'Kembali ke Pengaturan' : 'Back to Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST NOTIFIKASI SUKSES (CENTER ATAS, RINGKAS, MINIMALIS) */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[85vw] pointer-events-none animate-fadeIn">
          <div className="px-3.5 py-1.5 bg-[#1E1B38]/90 backdrop-blur-md text-white text-[11px] font-semibold rounded-full shadow-lg shadow-[#1E1B38]/20 flex items-center gap-2 border border-[#8494FF]/30">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6367FF] shadow-sm shadow-[#6367FF] flex-shrink-0" />
            <span className="truncate leading-tight text-white">{toastMsg}</span>
          </div>
        </div>
      )}

      {/* DEDICATED INTERACTIVE SOS MODALS */}
      <SmartBreathingModal
        isOpen={isBreathingOpen}
        onClose={() => setIsBreathingOpen(false)}
        lang={lang}
      />

      <ColdWaterModal
        isOpen={isColdWaterOpen}
        onClose={() => setIsColdWaterOpen(false)}
        lang={lang}
      />

      {/* MODAL LETTER TO FUTURE SELF */}
      {isLetterModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[9999] animate-fadeIn">
          <div className="w-full max-w-md bg-[#FAF8FF] rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto animate-slideUp">
            <div className="flex justify-between items-center pb-4 border-b border-[#C9BEFF] mb-4">
              <h3 className="font-extrabold text-lg text-[#1E1B38]">
                {isViewingLetter 
                  ? (lang === 'id' ? 'Surat Terbuka' : 'Letter Unlocked')
                  : (lang === 'id' ? 'Tulis Surat untuk Diri Sendiri' : 'Write Letter to Future Self')}
              </h3>
              <button onClick={() => setIsLetterModalOpen(false)} className="text-2xl text-[#6D6796] hover:text-[#1E1B38]">×</button>
            </div>

            {isViewingLetter && habitData.futureLetter ? (
              <div className="space-y-4">
                <div className="p-4 bg-white border-2 border-[#C9BEFF] rounded-2xl">
                  <div className="text-[10px] text-[#6D6796] mb-3 flex justify-between">
                    <span>{lang === 'id' ? 'Ditulis pada:' : 'Written on:'} {new Date(habitData.futureLetter.createdAt).toLocaleDateString('id-ID')}</span>
                    <span>{lang === 'id' ? 'Dibuka pada:' : 'Opened on:'} {new Date().toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="text-sm text-[#1E1B38] leading-relaxed whitespace-pre-wrap italic">
                    {habitData.futureLetter.content}
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-[#ECE9FF] to-[#FAF8FF] rounded-2xl border border-[#8494FF]/40">
                  <p className="text-xs text-[#1E1B38] leading-relaxed">
                    {lang === 'id' 
                      ? 'Selamat! Kamu berhasil mencapai milestone ini. Bangga sama dirimu yang kuat dan konsisten.' 
                      : 'Congratulations! You reached this milestone. Be proud of your strength and consistency.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    const updatedHabits = {
                      ...habits,
                      [activeHabit]: {
                        ...habitData,
                        futureLetter: null
                      }
                    };
                    updateAppState({ habits: updatedHabits });
                    setIsLetterModalOpen(false);
                    showToast(lang === 'id' ? 'Surat dihapus. Kamu bisa tulis surat baru.' : 'Letter deleted. You can write a new one.');
                  }}
                  className="w-full py-3 rounded-xl border border-[#C9BEFF] text-[#6D6796] text-xs font-bold hover:bg-[#C9BEFF]/30"
                >
                  {lang === 'id' ? 'Hapus Surat & Tulis Baru' : 'Delete & Write New Letter'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-[#ECE9FF] to-[#FAF8FF] rounded-2xl border border-[#8494FF]/40">
                  <p className="text-xs text-[#1E1B38] leading-relaxed">
                    {lang === 'id' 
                      ? 'Tulis pesan untuk dirimu di masa depan. Ini akan terkunci sampai hari yang kamu tentukan. Bayangkan bagaimana bangganya dirimu nanti saat membaca ini.' 
                      : 'Write a message for your future self. It will be locked until your chosen date. Imagine how proud you will be when reading this.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-2">
                    {lang === 'id' ? 'Kapan surat ini boleh dibuka?' : 'When can this letter be opened?'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 60, 90].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setLetterUnlockDays(days)}
                        className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                          letterUnlockDays === days
                            ? 'bg-[#6367FF] text-white shadow-md'
                            : 'bg-white border border-[#C9BEFF] text-[#6D6796] hover:border-[#6367FF]'
                        }`}
                      >
                        {days} {lang === 'id' ? 'Hari' : 'Days'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#6D6796] mt-1.5">
                    {lang === 'id' 
                      ? `Surat akan terbuka pada: ${new Date(Date.now() + letterUnlockDays * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID')}` 
                      : `Letter will unlock on: ${new Date(Date.now() + letterUnlockDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US')}`}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-2">
                    {lang === 'id' ? 'Tulis suratmu di sini:' : 'Write your letter here:'}
                  </label>
                  <textarea
                    value={letterContent}
                    onChange={e => setLetterContent(e.target.value)}
                    placeholder={lang === 'id' 
                      ? 'Halo diri sendiri di masa depan...\n\nAku bangga kamu bertahan sampai sekarang. Ingat kenapa kamu memulai journey ini...' 
                      : 'Dear future me...\n\nI am proud you made it this far. Remember why you started this journey...'}
                    className="w-full h-48 p-4 rounded-2xl border-2 border-[#C9BEFF] bg-white text-xs text-[#1E1B38] leading-relaxed resize-none focus:border-[#6367FF] outline-none"
                  />
                  <p className="text-[10px] text-[#6D6796] mt-1">
                    {letterContent.length} {lang === 'id' ? 'karakter' : 'characters'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!letterContent.trim()) {
                      showToast(lang === 'id' ? 'Surat masih kosong.' : 'Letter is empty.');
                      return;
                    }
                    
                    const unlockDate = new Date(Date.now() + letterUnlockDays * 24 * 60 * 60 * 1000);
                    const updatedHabits = {
                      ...habits,
                      [activeHabit]: {
                        ...habitData,
                        futureLetter: {
                          content: letterContent,
                          createdAt: new Date().toISOString(),
                          unlockDate: unlockDate.toISOString(),
                          unlockDays: letterUnlockDays
                        }
                      }
                    };
                    
                    updateAppState({ habits: updatedHabits });
                    setIsLetterModalOpen(false);
                    showToast(lang === 'id' ? `Surat tersimpan. Terkunci sampai ${letterUnlockDays} hari lagi.` : `Letter saved. Locked for ${letterUnlockDays} days.`);
                  }}
                  disabled={!letterContent.trim()}
                  className="w-full py-3.5 rounded-xl bg-[#6367FF] hover:bg-[#4F53EB] disabled:bg-[#C9BEFF] disabled:cursor-not-allowed text-white font-black text-xs shadow-lg shadow-[#6367FF]/30 active:scale-95 transition-all"
                >
                  {lang === 'id' ? 'Simpan & Kunci Surat' : 'Save & Lock Letter'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP MODAL: WARNING KONFIRMASI HAPUS DATA HABIT */}
      {habitToDelete && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] animate-fadeIn px-4"
          onClick={() => setHabitToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <span className="text-3xl">⚠️</span>
              </div>
              
              <h3 className="font-extrabold text-lg text-[#1E1B38]">
                {lang === 'id' ? 'PERINGATAN' : 'WARNING'}
              </h3>
              
              <p className="text-sm text-[#1E1B38] leading-relaxed">
                {lang === 'id' 
                  ? `Menonaktifkan program "${habitToDelete.name}" akan MENGHAPUS SEMUA DATA progres, timer streak, dan riwayat yang tersimpan untuk habit ini secara permanen!` 
                  : `Disabling "${habitToDelete.name}" will PERMANENTLY DELETE ALL progress data, streak timer, and history for this habit!`}
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setHabitToDelete(null)}
                  className="flex-1 py-3 rounded-xl border-2 border-[#C9BEFF] text-[#6367FF] font-bold text-sm hover:bg-[#C9BEFF]/20 active:scale-95 transition-all"
                >
                  {lang === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    const updatedHabits = { ...habits };
                    delete updatedHabits[habitToDelete.id];
                    
                    const remainingKeys = Object.keys(updatedHabits).filter(k => updatedHabits[k]?.active);
                    const newActive = remainingKeys.length > 0 ? remainingKeys[0] : null;
                    
                    updateAppState({ 
                      habits: updatedHabits, 
                      activeHabit: newActive 
                    });
                    
                    setHabitToDelete(null);
                    showToast(lang === 'id' ? `Program ${habitToDelete.name} dihapus.` : `${habitToDelete.name} deleted.`);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-lg shadow-red-600/30 active:scale-95 transition-all"
                >
                  {lang === 'id' ? 'Ya, Hapus Data' : 'Yes, Delete Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SHAREABLE STREAK CARD (FULL PORTRAIT 9:16 STORY) */}
      {isShareCardOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] animate-fadeIn p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-sm flex flex-col items-center my-auto">
            {/* Header Modal */}
            <div className="w-full flex justify-between items-center pb-3 mb-3 text-white">
              <h3 className="font-extrabold text-base tracking-wide">
                Share Streak
              </h3>
              <button 
                onClick={() => setIsShareCardOpen(false)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Container Preview yang dilihat user (responsif di layar HP) */}
            <div className="w-full aspect-[9/16] max-h-[70vh] rounded-[32px] overflow-hidden shadow-2xl border border-white/25 bg-[#16132D]">
              {storyPreviewUrl ? (
                <img 
                  src={storyPreviewUrl} 
                  alt="Streak Story Preview" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60 text-xs font-bold">
                  Memuat Story...
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2.5 mt-4">
              <button
                onClick={async () => {
                  try {
                    const quoteText = activeHabit === 'pmo'
                      ? (getPmoRank(timeDiff.days, lang).quote || (lang === 'id' ? 'Setiap detik menahan diri adalah langkah merebut kembali kendali hidup.' : 'Every second of restraint is reclaiming control over life.'))
                      : (lang === 'id' ? 'Setiap detik menahan diri adalah langkah merebut kembali kendali hidup.' : 'Every second of restraint is reclaiming control over life.');

                    const canvas = await generateStreakStoryCanvas({
                      days: timeDiff.days,
                      userName: user.name || 'Pejuang',
                      userHandle: user.username || 'warrior',
                      userPhotoUrl: user.photoUrl || null,
                      habitLabel: habitLabelMap[activeHabit] || 'Pemulihan',
                      pmoRank: activeHabit === 'pmo' ? getPmoRank(timeDiff.days) : null,
                      quote: quoteText,
                      dateStr: new Date().toLocaleDateString('id-ID'),
                      lang
                    });

                    const base64Data = canvas.toDataURL('image/png');

                    // 1. Coba Native Share Android (Capacitor Share + Filesystem)
                    try {
                      const fileName = `againstme_${timeDiff.days}hari_${Date.now()}.png`;
                      const savedFile = await Filesystem.writeFile({
                        path: fileName,
                        data: base64Data,
                        directory: Directory.Cache
                      });

                      const canShareResult = await Share.canShare();
                      if (canShareResult && canShareResult.value) {
                        await Share.share({
                          title: 'AgainstMe Streak Story',
                          text: lang === 'id' 
                            ? `Saya sudah bersih dan berjuang selama ${timeDiff.days} hari di AgainstMe! #AgainstMe` 
                            : `I have been clean and fighting for ${timeDiff.days} days on AgainstMe! #AgainstMe`,
                          url: savedFile.uri,
                          dialogTitle: lang === 'id' ? 'Bagikan Perjalanan Pemulihan' : 'Share Recovery Journey'
                        });
                        return;
                      }
                    } catch (nativeShareErr) {
                      console.log('Capacitor native share skipped or cancelled', nativeShareErr);
                    }

                    // 2. Fallback Web Share API (Standar Browser Mobile)
                    if (navigator.share) {
                      canvas.toBlob(async blob => {
                        if (!blob) return;
                        const file = new File([blob], `againstme-story-${timeDiff.days}hari.png`, { type: 'image/png' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                          try {
                            await navigator.share({
                              files: [file],
                              title: 'AgainstMe Streak Story',
                              text: `Saya sudah bersih ${timeDiff.days} hari di AgainstMe!`
                            });
                            return;
                          } catch (e) {
                            console.log('Web share cancelled', e);
                          }
                        }
                      }, 'image/png');
                    } else {
                      // 3. Fallback Download Manual jika device tidak support share popup
                      const link = document.createElement('a');
                      link.download = `againstme-story-${timeDiff.days}hari.png`;
                      link.href = base64Data;
                      link.click();
                      showToast(lang === 'id' ? 'Story berhasil disimpan ke galeri HP!' : 'Story saved to gallery!');
                    }
                  } catch (error) {
                    console.error('Share process error:', error);
                    showToast(lang === 'id' ? 'Gagal memproses gambar story.' : 'Failed to process story image.');
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-[#6367FF] hover:bg-[#4F53EB] text-white font-black text-sm shadow-lg shadow-[#6367FF]/40 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                <span>Share</span>
              </button>

              <button
                onClick={() => setIsShareCardOpen(false)}
                className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs active:scale-95 transition-all"
              >
                {lang === 'id' ? 'Tutup' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP KONFIRMASI HAPUS AKUN PERMANEN (GOOGLE PLAY COMPLIANCE) */}
      {isDeleteAccountModalOpen && (
        <div 
          onClick={() => setIsDeleteAccountModalOpen(false)}
          className="fixed inset-0 bg-[#1E1B38]/60 z-[110] flex items-center justify-center p-5 animate-fadeIn"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-red-200 text-left space-y-4 animate-scaleUp"
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <svg className="w-4 h-4 stroke-red-600" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </div>
                <h4 className="font-extrabold text-sm text-red-600">
                  {lang === 'id' ? 'Hapus Akun Permanen' : 'Delete Account'}
                </h4>
              </div>
              <button 
                onClick={() => setIsDeleteAccountModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#6D6796] leading-relaxed">
              {lang === 'id' 
                ? 'Tindakan ini tidak dapat dibatalkan. Seluruh riwayat streak, trofi, catatan check-in, dan obrolan AI akan dimusnahkan secara permanen dari server.' 
                : 'This action is irreversible. All streak records, badges, check-ins, and AI chat logs will be permanently destroyed.'}
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsDeletingAccount(true);
                try {
                  const res = await deleteAccountOnServer(user?.username || '', deleteAccountPassword);
                  if (res.error) {
                    showToast(res.error);
                    setIsDeletingAccount(false);
                    return;
                  }
                  showToast(lang === 'id' ? 'Akun Anda berhasil dihapus permanen.' : 'Account deleted successfully.');
                  localStorage.clear();
                  setTimeout(() => {
                    window.location.reload();
                  }, 1200);
                } catch (err) {
                  showToast(lang === 'id' ? 'Gagal menghubungi server.' : 'Server communication failed.');
                  setIsDeletingAccount(false);
                }
              }}
              className="space-y-3 pt-1"
            >
              <div>
                <label className="text-[11px] font-bold text-[#1E1B38] block mb-1">
                  {lang === 'id' ? 'Konfirmasi Kata Sandi Akun' : 'Confirm Account Password'}
                </label>
                <input
                  type="password"
                  required
                  value={deleteAccountPassword}
                  onChange={e => setDeleteAccountPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 rounded-xl border border-red-200 bg-white text-xs outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  {lang === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAccount}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white text-xs font-extrabold shadow-md shadow-red-600/30 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isDeletingAccount 
                    ? (lang === 'id' ? 'Menghapus...' : 'Deleting...') 
                    : (lang === 'id' ? 'Ya, Hapus Akun' : 'Delete Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP DETAIL TROFI PENGHARGAAN */}
      {selectedBadgeModal && (() => {
        const isUnlocked = (() => {
          try { return selectedBadgeModal.checkUnlocked(userStats); } catch(e) { return false; }
        })();

        return (
          <div 
            onClick={() => setSelectedBadgeModal(null)}
            className="fixed inset-0 bg-[#1E1B38]/60 z-[100] flex items-center justify-center p-5 animate-fadeIn"
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border-2 border-[#C9BEFF] text-center space-y-4 animate-scaleUp"
            >
              <div className="flex justify-end">
                <button 
                  onClick={() => setSelectedBadgeModal(null)}
                  className="w-7 h-7 rounded-full bg-[#FAF8FF] border border-[#DDD5FF] text-xs font-bold text-[#6D6796] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Big Icon */}
              <div className="flex justify-center">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${
                  isUnlocked ? 'bg-[#ECE9FF] text-[#6367FF] shadow-lg shadow-[#6367FF]/20 ring-4 ring-[#8494FF]/30' : 'bg-gray-100 text-gray-400'
                }`}>
                  <svg className="w-10 h-10 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
              </div>

              <div>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                  isUnlocked ? 'bg-[#ECE9FF] text-[#6367FF] border border-[#C9BEFF]' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isUnlocked ? (lang === 'id' ? 'TROFI DIDAPAT' : 'BADGE EARNED') : (lang === 'id' ? 'MASIH TERKUNCI' : 'LOCKED')}
                </span>

                <h3 className="text-lg font-black text-[#1E1B38] mt-2.5">
                  {lang === 'id' ? selectedBadgeModal.nameId : selectedBadgeModal.nameEn}
                </h3>
                <span className="text-[11px] font-bold text-[#8494FF] uppercase tracking-wider block mt-0.5">
                  Tier: {selectedBadgeModal.tier.toUpperCase()} • {selectedBadgeModal.category.toUpperCase()}
                </span>
              </div>

              <div className="p-4 bg-[#FAF8FF] border border-[#DDD5FF] rounded-2xl text-xs text-[#1E1B38] font-medium leading-relaxed text-left">
                {lang === 'id' ? selectedBadgeModal.descId : selectedBadgeModal.descEn}
              </div>

              <div className="text-[11px] text-[#6D6796]">
                {isUnlocked 
                  ? (lang === 'id' ? 'Pencapaian ini membuktikan keteguhan kedaulatan dirimu.' : 'This badge stands as proof of your resolute self-mastery.')
                  : (lang === 'id' ? 'Terus berjuang setiap detik untuk membuka penghargaan ini.' : 'Stay sovereign every single second to unlock this achievement.')}
              </div>

              <button
                type="button"
                onClick={() => setSelectedBadgeModal(null)}
                className="w-full py-3 rounded-2xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#6367FF]/20 active:scale-95"
              >
                {lang === 'id' ? 'Tutup & Terus Berjuang' : 'Close & Keep Fighting'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* POPUP MODAL: CATAT GODAAN (URGE TRACKER) */}
      {isLogUrgeModalOpen && (
        <div 
          onClick={() => setIsLogUrgeModalOpen(false)}
          className="fixed inset-0 bg-[#1E1B38]/60 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-fadeIn"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border-2 border-[#C9BEFF] text-left space-y-4 animate-scaleUp"
          >
            <div className="flex justify-between items-center pb-2 border-b border-[#DDD5FF]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6367FF] block">
                  {lang === 'id' ? 'Pelacak Pola Impuls' : 'Craving Pattern Tracker'}
                </span>
                <h4 className="text-sm font-black text-[#1E1B38]">
                  {lang === 'id' ? 'Catat Godaan yang Berhasil Ditahan' : 'Log Defeated Urge'}
                </h4>
              </div>
              <button 
                onClick={() => setIsLogUrgeModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#FAF8FF] border border-[#DDD5FF] text-xs font-bold text-[#6D6796] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                {lang === 'id' ? 'Apa pemicu godaannya?' : 'What triggered this craving?'}
              </label>
              <input
                type="text"
                placeholder={lang === 'id' ? 'Misal: Stres kerja, liat sosmed, nongkrong' : 'e.g. Work stress, late night scroll, peers'}
                value={urgeTriggerInput}
                onChange={e => setUrgeTriggerInput(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#DDD5FF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] focus:border-[#6367FF] outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-[#1E1B38]">
                  {lang === 'id' ? 'Tingkat Intensitas Godaan' : 'Craving Intensity'}
                </label>
                <span className="text-xs font-black text-[#6367FF]">{urgeIntensity} / 5</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={urgeIntensity}
                onChange={e => setUrgeIntensity(Number(e.target.value))}
                className="w-full accent-[#6367FF] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[#6D6796] font-bold mt-1">
                <span>{lang === 'id' ? 'Ringan' : 'Mild'}</span>
                <span>{lang === 'id' ? 'Sedang' : 'Moderate'}</span>
                <span>{lang === 'id' ? 'Ekstrem' : 'Extreme'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveUrgeLog}
              className="w-full py-3.5 rounded-xl bg-[#6367FF] hover:bg-[#4F53EB] text-white font-black text-xs shadow-lg shadow-[#6367FF]/30 active:scale-95 transition-all"
            >
              {lang === 'id' ? 'Simpan Catatan & Aku Berhasil Menahan' : 'Save & I Held Strong'}
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL: SETUP KALKULASI HABIT BARU (PERSIS SEPERTI ONBOARDING AWAL) */}
      {habitToConfigure && (
        <div 
          onClick={() => setHabitToConfigure(null)}
          className="fixed inset-0 bg-[#1E1B38]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-[#C9BEFF] text-left space-y-4 max-h-[85vh] overflow-y-auto animate-scaleUp"
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#DDD5FF]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6367FF] block">
                  {lang === 'id' ? 'Tambah Program Baru' : 'New Program Setup'}
                </span>
                <h4 className="text-sm font-black text-[#1E1B38]">
                  {habitToConfigure.name}
                </h4>
              </div>
              <button 
                onClick={() => setHabitToConfigure(null)}
                className="w-7 h-7 rounded-full bg-[#FAF8FF] border border-[#DDD5FF] text-xs font-bold text-[#6D6796] flex items-center justify-center hover:bg-[#ECE9FF]"
              >
                ✕
              </button>
            </div>

            {/* Tanggal Mulai Berhenti */}
            <div>
              <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                {lang === 'id' ? 'Mulai berhenti sejak kapan?' : 'Quit date'}
              </label>
              <input
                type="date"
                value={newHabitStartDate}
                onChange={e => setNewHabitStartDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#DDD5FF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] focus:border-[#6367FF] outline-none"
              />
              <span className="text-[10px] text-[#6D6796] mt-1 block">
                {lang === 'id' ? 'Bisa pilih hari ini atau tanggal lampau jika sudah mulai duluan.' : 'Pick today or past date if already started.'}
              </span>
            </div>

            {/* FORM KHUSUS ROKOK (BATANG & HARGA) */}
            {habitToConfigure.id === 'tobacco' && (
              <div className="space-y-3 pt-3 border-t border-[#DDD5FF]">
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Berapa batang rokok sehari biasanya?' : 'Cigarettes per day?'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newHabitCigsPerDay}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNewHabitCigsPerDay(val === '' ? '' : Number(val));
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#DDD5FF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] focus:border-[#6367FF] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Isi rokok per bungkus?' : 'Cigarettes per pack?'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newHabitCigsPerPack}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNewHabitCigsPerPack(val === '' ? '' : Number(val));
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#DDD5FF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] focus:border-[#6367FF] outline-none"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Harga per bungkus (Rp)' : 'Price per pack (Rp)'}
                  </label>
                  <input
                    type="text"
                    value={newHabitPackPrice}
                    onChange={e => setNewHabitPackPrice(formatNumberInput(parseNumberInput(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border border-[#DDD5FF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] focus:border-[#6367FF] outline-none"
                    placeholder="35.000"
                  />
                </div>
              </div>
            )}

            {/* FORM KHUSUS ALKOHOL */}
            {habitToConfigure.id === 'alcohol' && (
              <div className="space-y-3 pt-3 border-t border-[#DDD5FF]">
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Berapa kali minum dalam seminggu?' : 'Drinking sessions per week?'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newHabitDrinksPerWeek}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNewHabitDrinksPerWeek(val === '' ? '' : Number(val));
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#DDD5FF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] focus:border-[#6367FF] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Biaya sekali sesi minum (Rp)' : 'Cost per session (Rp)'}
                  </label>
                  <input
                    type="text"
                    value={newHabitSessionCost}
                    onChange={e => setNewHabitSessionCost(formatNumberInput(parseNumberInput(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border border-[#DDD5FF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] focus:border-[#6367FF] outline-none"
                    placeholder="150.000"
                  />
                </div>
              </div>
            )}

            {/* FORM KHUSUS REHAB (BIAYA DOSIS) */}
            {habitToConfigure.id === 'narcotics' && (
              <div className="space-y-3 pt-3 border-t border-[#DDD5FF]">
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Hitung biaya zat berdasarkan apa?' : 'Calculate dose expense by?'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF8FF] border border-[#DDD5FF] rounded-xl">
                    {[
                      { id: 'day', label: lang === 'id' ? 'Per Hari' : 'Daily' },
                      { id: 'week', label: lang === 'id' ? 'Per Minggu' : 'Weekly' },
                      { id: 'month', label: lang === 'id' ? 'Per Bulan' : 'Monthly' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setNewHabitDosePeriod(p.id);
                          if (p.id === 'day' && newHabitDoseCost === '1.400.000') setNewHabitDoseCost('200.000');
                          if (p.id === 'week') setNewHabitDoseCost('1.400.000');
                          if (p.id === 'month') setNewHabitDoseCost('6.000.000');
                        }}
                        className={`py-2 rounded-lg text-xs font-black transition-all ${
                          newHabitDosePeriod === p.id
                            ? 'bg-[#6367FF] text-white shadow-sm'
                            : 'text-[#6D6796] hover:text-[#1E1B38]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' 
                      ? `Pengeluaran ${newHabitDosePeriod === 'day' ? 'per hari' : newHabitDosePeriod === 'week' ? 'per minggu' : 'per bulan'} (Rp)` 
                      : `Expense ${newHabitDosePeriod === 'day' ? 'per day' : newHabitDosePeriod === 'week' ? 'per week' : 'per month'} (Rp)`}
                  </label>
                  <input
                    type="text"
                    value={newHabitDoseCost}
                    onChange={e => setNewHabitDoseCost(formatNumberInput(parseNumberInput(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border border-[#DDD5FF] bg-[#FAF8FF] text-xs font-bold text-[#1E1B38] focus:border-[#6367FF] outline-none"
                    placeholder="200.000"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const hId = habitToConfigure.id;
                const todayYmd = new Date().toISOString().split('T')[0];
                // Jika habit dimulai hari ini, pakai waktu detik ini agar timer mulai dari 00:00:00
                const startIso = (newHabitStartDate === todayYmd)
                  ? new Date().toISOString()
                  : new Date(newHabitStartDate + 'T00:00:00').toISOString();

                const newHabitConfig = {
                  active: true,
                  startDate: startIso,
                  savedTotal: 0,
                  history: [],
                  urgeCount: 0,
                  relapses: [],
                  cigsPerDay: newHabitCigsPerDay || 16,
                  packPrice: parseNumberInput(newHabitPackPrice) || 35000,
                  cigsPerPack: newHabitCigsPerPack || 20,
                  drinksPerWeek: newHabitDrinksPerWeek || 4,
                  drinkSessionCost: parseNumberInput(newHabitSessionCost) || 150000,
                  dosePeriod: newHabitDosePeriod || 'day',
                  doseCost: parseNumberInput(newHabitDoseCost) || 200000,
                  dailyDoseCost: newHabitDosePeriod === 'month' 
                    ? Math.round((parseNumberInput(newHabitDoseCost) || 6000000) / 30)
                    : newHabitDosePeriod === 'week'
                    ? Math.round((parseNumberInput(newHabitDoseCost) || 1400000) / 7)
                    : (parseNumberInput(newHabitDoseCost) || 200000),
                  savingsGoal: activeGoal
                };

                const updatedHabits = {
                  ...habits,
                  [hId]: newHabitConfig
                };

                updateAppState({ habits: updatedHabits, activeHabit: hId });
                setHabitToConfigure(null);
                showToast(lang === 'id' ? `Program ${habitToConfigure.name} berhasil diaktifkan!` : `${habitToConfigure.name} tracking started!`);
              }}
              className="w-full py-3.5 rounded-xl bg-[#6367FF] hover:bg-[#4F53EB] text-white font-black text-xs shadow-lg shadow-[#6367FF]/30 active:scale-95 transition-all mt-2"
            >
              {lang === 'id' ? 'Mulai Pantau Program' : 'Start Tracking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
