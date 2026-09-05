import React, { useState } from 'react';
import { formatNumberInput, parseNumberInput } from '../utils/currency';
import { getRandomGoal } from '../constants/goals';
import { loginUserOnServer, resetPasswordOnServer } from '../storage';

export default function LandingOnboarding({ onComplete, onLoginSuccess, lang, onToggleLang }) {
  const [step, setStep] = useState('landing'); // 'landing' | 'step1' | 'step2'

  // Modal Login & Reset Password dari Halaman Depan
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' | 'forgot'
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Multi-select habit: default Judi, PMO, Rokok
  const [selectedHabits, setSelectedHabits] = useState(['gambling', 'pmo', 'tobacco']);

  // Tanggal mulai berhenti (default: hari ini)
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);

  // Detail Rokok jika dipilih
  const [cigsPerDay, setCigsPerDay] = useState(16);
  const [cigsPerPack, setCigsPerPack] = useState(20);
  const [packPrice, setPackPrice] = useState('35.000');

  // Detail Alkohol jika dipilih
  const [drinksPerWeek, setDrinksPerWeek] = useState('4');
  const [drinkSessionCost, setDrinkSessionCost] = useState('150.000');

  // Detail Rehab jika dipilih (Periode Hari / Minggu / Bulan & Biaya)
  const [doseCost, setDoseCost] = useState('200.000');
  const [dosePeriod, setDosePeriod] = useState('day'); // 'day' | 'week' | 'month'

  // Custom Saving Goal (Barang Impian)
  const [customGoalName, setCustomGoalName] = useState('');
  const [customGoalTarget, setCustomGoalTarget] = useState('');

  // Profil pengguna: nama & username unik untuk komunitas
  const [userName, setUserName] = useState('');
  const [usernameTag, setUsernameTag] = useState('');

  const habitOptions = [
    {
      id: 'narcotics',
      label: 'Rehab',
      desc: lang === 'id' ? 'Narkotika, zat adiktif, hemat biaya dosis harian & syaraf bersih' : 'Substances, save dose expenses & neural recovery'
    },
    {
      id: 'gambling',
      label: lang === 'id' ? 'Judi' : 'Gambling',
      desc: lang === 'id' ? 'Celengan Penyelamat godaan & barang impian' : 'Urge Piggybank savings & dream rewards'
    },
    {
      id: 'pmo',
      label: 'PMO',
      desc: lang === 'id' ? 'Reboot otak & level kedaulatan pria berdaulat' : 'Brain reboot & sovereignty rank progression'
    },
    {
      id: 'tobacco',
      label: lang === 'id' ? 'Rokok' : 'Tobacco',
      desc: lang === 'id' ? 'Paru-paru bersih & tabungan harian nyata' : 'Clean lungs & tangible daily savings'
    },
    {
      id: 'alcohol',
      label: lang === 'id' ? 'Alkohol' : 'Alcohol',
      desc: lang === 'id' ? 'Kesehatan organ & kejernihan pikiran' : 'Organ health & mental clarity'
    }
  ];

  function toggleHabit(id) {
    if (selectedHabits.includes(id)) {
      if (selectedHabits.length === 1) return; // minimal pilih 1
      setSelectedHabits(selectedHabits.filter(h => h !== id));
    } else {
      setSelectedHabits([...selectedHabits, id]);
    }
  }

  function finish() {
    // Tanggal mulai otomatis hari ini detik ini
    const startIso = new Date().toISOString();

    // Jika user kosongkan barang impian, pilihkan barang random
    let goalObj;
    if (customGoalName.trim() && parseNumberInput(customGoalTarget) > 0) {
      goalObj = {
        name: customGoalName.trim(),
        target: parseNumberInput(customGoalTarget),
        isCustom: true
      };
    } else {
      const rand = getRandomGoal();
      goalObj = {
        name: lang === 'id' ? rand.nameId : rand.nameEn,
        target: rand.cost,
        icon: rand.icon,
        isCustom: false
      };
    }

    onComplete({
      habits: selectedHabits,
      startDate: startIso,
      cigsPerDay: Number(cigsPerDay) || 16,
      cigsPerPack: Number(cigsPerPack) || 20,
      packPrice: parseNumberInput(packPrice) || 35000,
      drinksPerWeek: parseNumberInput(drinksPerWeek) || 4,
      drinkSessionCost: parseNumberInput(drinkSessionCost) || 150000,
      doseCost: parseNumberInput(doseCost) || 200000,
      dosePeriod: dosePeriod || 'day',
      savingsGoal: goalObj,
      name: 'Pejuang',
      username: 'pejuang'
    });
  }

  // --- LANDING SCREEN ---
  if (step === 'landing') {
    return (
      <div className="min-h-screen max-w-md mx-auto flex flex-col justify-between p-6">
        {/* Top bar */}
        <div className="flex justify-between items-center pt-2">
          <span className="font-black text-base tracking-tight text-[#1E1B38] select-none">
            <span className="text-[#6367FF]">A</span>gainst<span className="text-[#6367FF]">M</span>e
          </span>
          <button 
            onClick={onToggleLang}
            className="w-10 h-10 rounded-xl border border-[#C9BEFF] bg-white text-xs font-black text-[#6367FF] shadow-sm hover:bg-[#FAF8FF] active:scale-95 transition-all flex items-center justify-center"
          >
            {lang.toUpperCase()}
          </button>
        </div>

        {/* Hero */}
        <div className="my-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECE9FF] text-[#6367FF] text-xs font-bold mb-4">
            <svg className="w-3.5 h-3.5 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>{lang === 'id' ? '100% Mode Tamu Privasi Penuh' : '100% Private Guest Mode'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#1E1B38] tracking-tight leading-tight mb-3">
            {lang === 'id' ? (
              <>Musuh terbesarmu adalah dirimu kemarin.</>
            ) : (
              <>The fight is against me, for me.</>
            )}
          </h1>

          <p className="text-xs sm:text-sm text-[#6D6796] leading-relaxed max-w-xs mx-auto mb-8">
            {lang === 'id'
              ? 'Aplikasi pemulihan adiksi tanpa penghakiman. Pantau streak, kumpulkan tabungan nyata, dan taklukkan dirimu sendiri.'
              : 'Judgment-free recovery companion. Track clean streaks, reclaim real money, and master yourself.'}
          </p>

          <button
            onClick={() => setStep('step1')}
            className="w-full py-4 rounded-2xl bg-[#6367FF] text-white font-extrabold text-base shadow-xl shadow-[#6367FF]/30 hover:opacity-95 active:scale-[0.98] transition-all"
          >
            {lang === 'id' ? 'Mulai Perjalanan Barumu' : 'Start Your Journey'}
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginError('');
              setIsLoginModalOpen(true);
            }}
            className="w-full mt-3 py-3.5 rounded-2xl bg-white border border-[#C9BEFF] text-[#6367FF] font-black text-sm shadow-sm hover:bg-[#FAF8FF] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span>{lang === 'id' ? 'Sudah Punya Akun? Masuk di Sini' : 'Already have an account? Log In'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-[#6D6796]">
            {lang === 'id' ? 'Data tersimpan aman di perangkatmu sendiri' : 'All data stays securely on your device'}
          </p>
        </div>

        {/* MODAL LOGIN & RESET PASSWORD POPUP DARI HALAMAN DEPAN */}
        {isLoginModalOpen && (
          <div 
            onClick={() => setIsLoginModalOpen(false)}
            className="fixed inset-0 bg-[#1E1B38]/50 backdrop-blur-sm z-50 flex items-end justify-center animate-fadeIn p-0 sm:p-4"
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#FAF8FF] rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl animate-slideUp text-left space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#C9BEFF]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#6367FF] text-white flex items-center justify-center font-black text-sm">
                    A
                  </div>
                  <h3 className="font-extrabold text-base text-[#1E1B38]">
                    {authView === 'login'
                      ? (lang === 'id' ? 'Masuk ke Akun Pejuang' : 'Log In to Warrior Account')
                      : (lang === 'id' ? 'Reset Password Akun' : 'Reset Account Password')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-[#C9BEFF] bg-white flex items-center justify-center font-bold text-[#1E1B38] hover:bg-[#C9BEFF]/30"
                >
                  ✕
                </button>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold leading-relaxed">
                  {loginError}
                </div>
              )}

              {loginSuccessMsg && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold leading-relaxed">
                  {loginSuccessMsg}
                </div>
              )}

              {authView === 'login' ? (
                /* FORM LOGIN */
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!loginIdentifier.trim() || !loginPassword) {
                      setLoginError(lang === 'id' ? 'Email/username dan password wajib diisi.' : 'Email/username and password are required.');
                      return;
                    }
                    setIsLoggingIn(true);
                    setLoginError('');
                    setLoginSuccessMsg('');
                    try {
                      const res = await loginUserOnServer(loginIdentifier.trim(), loginPassword);
                      if (res.error) {
                        setLoginError(res.error);
                        return;
                      }
                      if (onLoginSuccess) {
                        onLoginSuccess(res.user, res.state);
                      }
                    } catch (err) {
                      setLoginError(lang === 'id' ? 'Gagal terhubung ke server. Pastikan server aktif.' : 'Cannot connect to server.');
                    } finally {
                      setIsLoggingIn(false);
                    }
                  }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                      {lang === 'id' ? 'Email atau Username' : 'Email or Username'}
                    </label>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      placeholder={lang === 'id' ? 'Misal: jon atau jon@gmail.com' : 'e.g. warrior or warrior@mail.com'}
                      className="w-full p-3.5 rounded-xl border border-[#C9BEFF] bg-white text-xs font-semibold text-[#1E1B38] outline-none focus:border-[#6367FF]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-[#1E1B38]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginError('');
                          setLoginSuccessMsg('');
                          setAuthView('forgot');
                        }}
                        className="text-[11px] font-bold text-[#6367FF] hover:underline"
                      >
                        {lang === 'id' ? 'Lupa Password?' : 'Forgot Password?'}
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3.5 rounded-xl border border-[#C9BEFF] bg-white text-xs font-semibold text-[#1E1B38] outline-none focus:border-[#6367FF]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3.5 rounded-xl bg-[#6367FF] text-white font-extrabold text-xs shadow-lg shadow-[#6367FF]/30 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isLoggingIn 
                        ? (lang === 'id' ? 'Memulihkan Data...' : 'Restoring...') 
                        : (lang === 'id' ? 'Masuk & Pulihkan Data Saya' : 'Log In & Restore Data')}
                    </button>
                  </div>
                </form>
              ) : (
                /* FORM RESET PASSWORD */
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!loginIdentifier.trim() || !forgotEmail.trim() || !forgotNewPassword) {
                      setLoginError(lang === 'id' ? 'Semua kolom verifikasi wajib diisi.' : 'All fields are required.');
                      return;
                    }
                    if (forgotNewPassword.length < 4) {
                      setLoginError(lang === 'id' ? 'Password baru minimal 4 karakter.' : 'Password must be at least 4 characters.');
                      return;
                    }
                    setIsLoggingIn(true);
                    setLoginError('');
                    setLoginSuccessMsg('');
                    try {
                      const res = await resetPasswordOnServer(loginIdentifier.trim(), forgotEmail.trim(), forgotNewPassword);
                      if (res.error) {
                        setLoginError(res.error);
                        return;
                      }
                      // Jika sukses, langsung pulihkan akun & login
                      if (onLoginSuccess) {
                        onLoginSuccess(res.user, res.state);
                      }
                    } catch (err) {
                      setLoginError(lang === 'id' ? 'Gagal reset password. Pastikan server aktif.' : 'Failed to reset password.');
                    } finally {
                      setIsLoggingIn(false);
                    }
                  }}
                  className="space-y-3.5"
                >
                  <p className="text-xs text-[#6D6796] leading-relaxed">
                    {lang === 'id' 
                      ? 'Verifikasi identitas akunmu dengan memasukkan username dan email yang kamu gunakan saat mendaftar.' 
                      : 'Verify your account by providing the username and email used during registration.'}
                  </p>

                  <div>
                    <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                      {lang === 'id' ? 'Username' : 'Username'}
                    </label>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      placeholder="Misal: jon"
                      className="w-full p-3.5 rounded-xl border border-[#C9BEFF] bg-white text-xs font-semibold text-[#1E1B38] outline-none focus:border-[#6367FF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                      {lang === 'id' ? 'Email Terdaftar' : 'Registered Email'}
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="Misal: jon@gmail.com"
                      className="w-full p-3.5 rounded-xl border border-[#C9BEFF] bg-white text-xs font-semibold text-[#1E1B38] outline-none focus:border-[#6367FF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                      {lang === 'id' ? 'Password Baru' : 'New Password'}
                    </label>
                    <input
                      type="password"
                      required
                      value={forgotNewPassword}
                      onChange={e => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3.5 rounded-xl border border-[#C9BEFF] bg-white text-xs font-semibold text-[#1E1B38] outline-none focus:border-[#6367FF]"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginError('');
                        setAuthView('login');
                      }}
                      className="flex-1 py-3.5 rounded-xl border border-[#C9BEFF] bg-white text-[#1E1B38] font-bold text-xs hover:bg-[#FAF8FF]"
                    >
                      {lang === 'id' ? 'Kembali ke Login' : 'Back to Login'}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="flex-1 py-3.5 rounded-xl bg-[#6367FF] text-white font-extrabold text-xs shadow-lg shadow-[#6367FF]/30 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isLoggingIn 
                        ? (lang === 'id' ? 'Memproses...' : 'Processing...') 
                        : (lang === 'id' ? 'Simpan & Masuk' : 'Save & Log In')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- ONBOARDING FLOW ---
  const hasFinanceHabit = selectedHabits.includes('tobacco') || selectedHabits.includes('alcohol') || selectedHabits.includes('gambling') || selectedHabits.includes('narcotics');

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col justify-between p-6">
      {/* Top Header with Back & Step */}
      <div className="flex items-center justify-between pt-2 mb-6">
        <button
          onClick={() => {
            if (step === 'step1') setStep('landing');
            else if (step === 'step2') setStep('step1');
          }}
          className="w-10 h-10 rounded-full border border-[#C9BEFF] bg-white flex items-center justify-center text-[#1E1B38]"
        >
          <svg className="w-5 h-5 stroke-[#1E1B38]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="text-xs font-bold text-[#6D6796]">
          {step === 'step1' && (hasFinanceHabit ? (lang === 'id' ? 'LANGKAH 1 DARI 2' : 'STEP 1 OF 2') : (lang === 'id' ? 'LANGKAH TERAKHIR' : 'FINAL STEP'))}
          {step === 'step2' && (lang === 'id' ? 'LANGKAH TERAKHIR' : 'FINAL STEP')}
        </span>
        <button 
          onClick={onToggleLang}
          className="w-10 h-10 rounded-full border border-[#C9BEFF] bg-white text-xs font-bold text-[#1E1B38] shadow-sm"
        >
          {lang.toUpperCase()}
        </button>
      </div>

      {/* STEP 1: PILIH HABIT MULTI-SELECT */}
      {step === 'step1' && (
        <div className="my-auto">
          <h2 className="text-2xl font-extrabold text-[#1E1B38] mb-2">
            {lang === 'id' ? 'Apa yang ingin kamu taklukkan?' : 'What do you want to conquer?'}
          </h2>
          <p className="text-xs text-[#6D6796] mb-6">
            {lang === 'id' 
              ? 'Bisa pilih lebih dari satu kebiasaan sekaligus.' 
              : 'You can select multiple habits at once.'}
          </p>

          <div className="space-y-3 mb-6">
            {habitOptions.map(h => {
              const isSelected = selectedHabits.includes(h.id);
              return (
                <div
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#6367FF] bg-white shadow-sm'
                      : 'border-[#C9BEFF] bg-white/50 opacity-70'
                  }`}
                >
                  <div>
                    <h4 className="font-extrabold text-[#1E1B38] text-base">{h.label}</h4>
                    <p className="text-xs text-[#6D6796] mt-0.5">{h.desc}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-[#6367FF] bg-[#6367FF] text-white' : 'border-[#C9BEFF] bg-white'
                  }`}>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (hasFinanceHabit) setStep('step2');
              else finish();
            }}
            className="w-full py-4 rounded-2xl bg-[#6367FF] text-white font-bold text-base shadow-lg shadow-[#6367FF]/25 active:scale-[0.98]"
          >
            {hasFinanceHabit 
              ? (lang === 'id' ? `Lanjutkan (${selectedHabits.length} Terpilih)` : `Continue (${selectedHabits.length} Selected)`)
              : (lang === 'id' ? 'Mulai Perjalanan' : 'Start Journey')}
          </button>
        </div>
      )}

      {/* STEP 2: HITUNG DETAIL & TARGET BARANG IMPIAN (GOAL) */}
      {step === 'step2' && (
        <div className="my-auto space-y-4 max-h-[75vh] overflow-y-auto pr-1 scrollbar-none">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1E1B38] mb-1 tracking-tight">
              {lang === 'id' ? 'Alokasi Pengalihan Dana' : 'Fund Reallocation Target'}
            </h2>
            <p className="text-xs text-[#6D6796] leading-relaxed">
              {lang === 'id' ? 'Tentukan target tujuan finansial dari dana yang berhasil kamu selamatkan.' : 'Define meaningful milestones for your reclaimed finances.'}
            </p>
          </div>

          {/* Form Barang Impian (Goal) */}
          <div className="bg-white border border-[#C9BEFF] rounded-3xl p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF8FF]">
              <div className="w-7 h-7 rounded-lg bg-[#ECE9FF] flex items-center justify-center text-[#6367FF]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h4 className="font-extrabold text-xs text-[#1E1B38]">
                {lang === 'id' ? 'Target Alokasi Dana Hemat' : 'Savings Allocation Goal'}
              </h4>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1E1B38] block mb-1">
                {lang === 'id' ? 'Mau dialihkan untuk beli apa?' : 'What reward would you like to buy?'}
              </label>
              <input 
                type="text" 
                placeholder={lang === 'id' ? 'Contoh: Tabungan Impian, Gadget Baru, Modal Usaha' : 'e.g. Dream Savings, New Device, Business'}
                value={customGoalName}
                onChange={e => setCustomGoalName(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-[#1E1B38] font-semibold text-xs outline-none focus:border-[#6367FF]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1E1B38] block mb-1">
                {lang === 'id' ? 'Estimasi Nominal Target (Rp)' : 'Target Price (IDR)'}
              </label>
              <input 
                type="text" 
                placeholder={lang === 'id' ? '15.000.000' : '15,000,000'}
                value={customGoalTarget}
                onChange={e => setCustomGoalTarget(formatNumberInput(e.target.value))}
                className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-[#1E1B38] font-bold text-sm outline-none focus:border-[#6367FF]"
              />
            </div>
          </div>

          {/* Biaya Habit Rokok/Alkohol */}
          <div className="bg-white border border-[#C9BEFF] rounded-3xl p-5 space-y-3">
            {selectedHabits.includes('tobacco') && (
              <>
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Rokok: Berapa batang per hari?' : 'Cigarettes smoked per day?'}
                  </label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={cigsPerDay}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setCigsPerDay(val === '' ? '' : Number(val));
                    }}
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-[#1E1B38] font-bold text-sm outline-none focus:border-[#6367FF]"
                    placeholder="16"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Rokok: Isi berapa batang per bungkus?' : 'Cigarettes per pack?'}
                  </label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={cigsPerPack}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setCigsPerPack(val === '' ? '' : Number(val));
                    }}
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-[#1E1B38] font-bold text-sm outline-none focus:border-[#6367FF]"
                    placeholder="20"
                  />
                  <span className="text-[10px] text-[#6D6796] mt-0.5 block">
                    {lang === 'id' ? 'Contoh: 12, 16, atau 20 batang per bungkus' : 'e.g. 12, 16, or 20 per pack'}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Rokok: Harga per bungkus' : 'Cost per pack'}
                  </label>
                  <input 
                    type="text" 
                    value={packPrice}
                    onChange={e => setPackPrice(formatNumberInput(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-[#1E1B38] font-bold text-sm outline-none focus:border-[#6367FF]"
                    placeholder="35.000"
                  />
                </div>
              </>
            )}

            {selectedHabits.includes('alcohol') && (
              <>
                <div className="pt-2 border-t border-[#C9BEFF]">
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Alkohol: Berapa sesi minum per minggu?' : 'Drinking sessions per week?'}
                  </label>
                  <input 
                    type="text" 
                    value={drinksPerWeek}
                    onChange={e => setDrinksPerWeek(formatNumberInput(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-[#1E1B38] font-bold text-sm outline-none focus:border-[#6367FF]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Alkohol: Rata-rata biaya per sesi' : 'Average cost per session'}
                  </label>
                  <input 
                    type="text" 
                    value={drinkSessionCost}
                    onChange={e => setDrinkSessionCost(formatNumberInput(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-[#1E1B38] font-bold text-sm outline-none focus:border-[#6367FF]"
                  />
                </div>
              </>
            )}

            {/* FORM KHUSUS REHAB (BIAYA DOSIS / ZAT FLEKSIBEL: HARI / MINGGU / BULAN) */}
            {selectedHabits.includes('narcotics') && (
              <div className="space-y-3 pt-2 border-t border-[#C9BEFF]">
                <div>
                  <label className="text-xs font-bold text-[#1E1B38] block mb-1">
                    {lang === 'id' ? 'Rehab: Hitung biaya zat/paket berdasarkan apa?' : 'Rehab: Calculate dose expense by?'}
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
                          setDosePeriod(p.id);
                          if (p.id === 'day' && doseCost === '1.400.000') setDoseCost('200.000');
                          if (p.id === 'week') setDoseCost('1.400.000');
                          if (p.id === 'month') setDoseCost('6.000.000');
                        }}
                        className={`py-2 rounded-lg text-xs font-black transition-all ${
                          dosePeriod === p.id
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
                      ? `Perkiraan biaya zat ${dosePeriod === 'day' ? 'per hari' : dosePeriod === 'week' ? 'per minggu' : 'per bulan'} (Rp)` 
                      : `Estimated expense ${dosePeriod === 'day' ? 'per day' : dosePeriod === 'week' ? 'per week' : 'per month'} (Rp)`}
                  </label>
                  <input
                    type="text"
                    value={doseCost}
                    onChange={e => setDoseCost(formatNumberInput(parseNumberInput(e.target.value)))}
                    className="w-full p-3 rounded-xl border border-[#C9BEFF] bg-[#FAF8FF] text-[#1E1B38] font-bold text-sm outline-none focus:border-[#6367FF]"
                    placeholder="200.000"
                  />
                  <span className="text-[10px] text-[#6D6796] mt-0.5 block">
                    {lang === 'id' ? 'Uang nyata yang kamu selamatkan dari pembelian zat adiktif.' : 'Real money saved from buying substance doses.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={finish}
            className="w-full py-4 rounded-2xl bg-[#6367FF] text-white font-bold text-base shadow-lg shadow-[#6367FF]/25 active:scale-[0.98]"
          >
            {lang === 'id' ? 'Mulai Perjalanan' : 'Start Journey'}
          </button>
        </div>
      )}
    </div>
  );
}
