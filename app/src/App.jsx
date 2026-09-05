import React, { useState, useEffect } from 'react';
import { loadAppState, saveAppState, initialAppData } from './storage';
import LandingOnboarding from './components/LandingOnboarding';
import Homescreen from './components/Homescreen';
import { getRandomGoal } from './constants/goals';

export default function App() {
  const [appState, setAppState] = useState(() => loadAppState());

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  function handleCompleteOnboarding(onboardingData) {
    const selectedList = onboardingData.habits || [];
    const primaryHabit = selectedList[0] || 'tobacco';
    
    const chosenDateStr = onboardingData.startDate;
    const todayYmd = new Date().toISOString().split('T')[0];
    
    // Validasi aman tanggal mulai
    let startIso = new Date().toISOString();
    if (chosenDateStr) {
      if (chosenDateStr.includes('T')) {
        // Sudah format ISO lengkap
        startIso = chosenDateStr;
      } else if (chosenDateStr === todayYmd) {
        // Hari ini -> mulai detik ini
        startIso = new Date().toISOString();
      } else {
        // Tanggal masa lalu YYYY-MM-DD
        const parsed = new Date(`${chosenDateStr}T00:00:00`);
        startIso = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
      }
    }

    // Pastikan goal terisi atau dapat random
    let sharedGoal = onboardingData.savingsGoal;
    if (!sharedGoal || !sharedGoal.name) {
      const rand = getRandomGoal();
      sharedGoal = {
        name: rand.nameId,
        nameEn: rand.nameEn,
        target: rand.cost,
        icon: rand.icon,
        isCustom: false
      };
    }

    const cleanHabits = {};

    if (selectedList.includes('narcotics')) {
      cleanHabits.narcotics = {
        active: true,
        startDate: startIso,
        doseCost: onboardingData.doseCost || 200000,
        dosePeriod: onboardingData.dosePeriod || 'day',
        savingsGoal: sharedGoal
      };
    }

    if (selectedList.includes('gambling')) {
      cleanHabits.gambling = {
        active: true,
        startDate: startIso,
        savedTotal: 0,
        urgeCount: 0,
        history: [],
        savingsGoal: sharedGoal
      };
    }

    if (selectedList.includes('pmo')) {
      cleanHabits.pmo = {
        active: true,
        startDate: startIso
      };
    }

    if (selectedList.includes('tobacco')) {
      cleanHabits.tobacco = {
        active: true,
        startDate: startIso,
        cigsPerDay: onboardingData.cigsPerDay || 16,
        packPrice: onboardingData.packPrice || 35000,
        cigsPerPack: onboardingData.cigsPerPack || 20,
        savingsGoal: sharedGoal
      };
    }

    if (selectedList.includes('alcohol')) {
      cleanHabits.alcohol = {
        active: true,
        startDate: startIso,
        drinksPerWeek: onboardingData.drinksPerWeek || 4,
        drinkSessionCost: onboardingData.drinkSessionCost || 150000,
        savingsGoal: sharedGoal
      };
    }

    setAppState({
      hasOnboarded: true,
      lang: appState.lang || 'id',
      user: {
        name: onboardingData.name || 'Rocky',
        username: onboardingData.username || 'rocky_warrior',
        avatar: (onboardingData.name || 'Rocky').charAt(0).toUpperCase(),
        memberSince: startIso
      },
      activeHabit: primaryHabit,
      habits: cleanHabits,
      sharedGoal: sharedGoal,
      communityPosts: appState.communityPosts || initialAppData.communityPosts,
      checkins: []
    });
  }

  function handleLoginSuccess(userData, userState) {
    setAppState({
      ...initialAppData,
      hasOnboarded: true,
      isRegistered: true,
      lang: userState?.lang || appState.lang || 'id',
      user: {
        ...initialAppData.user,
        ...(userData || {})
      },
      activeHabit: userState?.activeHabit || Object.keys(userState?.habits || {})[0] || 'tobacco',
      habits: userState?.habits || {},
      checkins: userState?.checkins || [],
      chatMessages: userState?.chatMessages || [],
      sharedGoal: userState?.sharedGoal || null,
      communityPosts: appState.communityPosts || initialAppData.communityPosts
    });
  }

  function handleReset() {
    localStorage.clear();
    setAppState({ ...initialAppData, hasOnboarded: false });
  }

  function updateAppState(partial) {
    setAppState(prev => ({ ...prev, ...partial }));
  }

  if (!appState.hasOnboarded) {
    return (
      <LandingOnboarding 
        lang={appState.lang}
        onToggleLang={() => updateAppState({ lang: appState.lang === 'id' ? 'en' : 'id' })}
        onComplete={handleCompleteOnboarding}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <Homescreen 
      appState={appState}
      updateAppState={updateAppState}
      onReset={handleReset}
    />
  );
}
