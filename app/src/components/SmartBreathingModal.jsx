import React, { useState, useEffect, useRef } from 'react';

export default function SmartBreathingModal({ isOpen, onClose, lang }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'inhale' (4s) | 'hold' (7s) | 'exhale' (8s)
  const [counter, setCounter] = useState(4);
  const [cycle, setCycle] = useState(1);
  const totalCycles = 4;

  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      setCounter(4);
      setCycle(1);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Auto start first cycle
    startBreathing();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  function startBreathing() {
    setCycle(1);
    runCycleStep('inhale', 4, 1);
  }

  function runCycleStep(currentPhase, secondsLeft, currentCycleNum) {
    setPhase(currentPhase);
    setCounter(secondsLeft);

    let sec = secondsLeft;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      sec -= 1;
      setCounter(sec);

      if (sec <= 0) {
        clearInterval(timerRef.current);
        if (currentPhase === 'inhale') {
          runCycleStep('hold', 7, currentCycleNum);
        } else if (currentPhase === 'hold') {
          runCycleStep('exhale', 8, currentCycleNum);
        } else if (currentPhase === 'exhale') {
          if (currentCycleNum < totalCycles) {
            setCycle(currentCycleNum + 1);
            runCycleStep('inhale', 4, currentCycleNum + 1);
          } else {
            setPhase('done');
          }
        }
      }
    }, 1000);
  }

  if (!isOpen) return null;

  const circleScale = phase === 'inhale' 
    ? 'scale-125 transition-transform duration-[4000ms] ease-out' 
    : phase === 'hold' 
    ? 'scale-125' 
    : phase === 'exhale' 
    ? 'scale-75 transition-transform duration-[8000ms] ease-in' 
    : 'scale-100';

  const phaseColors = {
    inhale: 'bg-[#ECE9FF] text-[#6367FF] border-[#8494FF]',
    hold: 'bg-[#FFDBFD] text-[#6367FF] border-[#8494FF]',
    exhale: 'bg-[#ECE9FF] text-[#6367FF] border-[#6367FF]',
    done: 'bg-[#ECE9FF] text-[#6367FF] border-[#8494FF]',
    idle: 'bg-[#FAF8FF] text-[#1E1B38] border-[#C9BEFF]'
  };

  const phaseTitle = {
    inhale: lang === 'id' ? 'TARIK NAPAS LEWAT HIDUNG' : 'INHALE DEEP THROUGH NOSE',
    hold: lang === 'id' ? 'TAHAN NAPAS' : 'HOLD YOUR BREATH',
    exhale: lang === 'id' ? 'HEMBUSKAN LEWAT MULUT' : 'EXHALE THROUGH MOUTH',
    done: lang === 'id' ? 'SESI SELESAI' : 'SESSION COMPLETED',
    idle: lang === 'id' ? 'SIAPKAN DIRI' : 'GET READY'
  };

  const phaseSub = {
    inhale: lang === 'id' ? 'Rasakan dada & perutmu mengembang...' : 'Feel your chest and abdomen expand...',
    hold: lang === 'id' ? 'Tenang... kendalikan detak jantungmu...' : 'Stay calm... slow your heart rate...',
    exhale: lang === 'id' ? 'Keluarkan seluruh beban & dorongan nafsu...' : 'Release all tension and cravings...',
    done: lang === 'id' ? 'Keren! Detak jantung & pikiranmu sekarang jauh lebih tenang.' : 'Great job! Your nervous system is grounded.',
    idle: ''
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-[#1E1B38]/60 backdrop-blur-md z-[60] flex items-center justify-center p-5 animate-fadeIn text-center"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-[36px] p-6 shadow-2xl border border-[#C9BEFF] space-y-6 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF8FF] border border-[#C9BEFF] flex items-center justify-center text-xs font-bold text-[#1E1B38] hover:bg-[#C9BEFF]/40"
        >
          ✕
        </button>

        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#6D6796] block mb-1">
            {lang === 'id' ? `Latihan Napas · Siklus ${cycle} dari ${totalCycles}` : `Breathing Protocol · Cycle ${cycle} of ${totalCycles}`}
          </span>
          <h3 className="font-black text-base text-[#1E1B38]">
            {phaseTitle[phase]}
          </h3>
          <p className="text-xs text-[#6D6796] mt-1 h-4">
            {phaseSub[phase]}
          </p>
        </div>

        {/* Lingkaran Smartwatch Pulse Animasi */}
        <div className="py-6 flex items-center justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Halo ring luar */}
            <div className={`absolute inset-0 rounded-full border-4 border-dashed border-[#C9BEFF]/60 ${phase === 'hold' ? 'animate-spin' : ''}`}></div>

            {/* Bulatan utama yang membesar mengecil */}
            <div className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center shadow-lg transition-all ${phaseColors[phase]} ${circleScale}`}>
              {phase === 'done' ? (
                <svg className="w-10 h-10 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <>
                  <span className="text-4xl font-black tracking-tight">{counter}</span>
                  <span className="text-[10px] font-extrabold uppercase mt-0.5">{lang === 'id' ? 'Detik' : 'Sec'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div>
          {phase === 'done' ? (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#8494FF]/30 active:scale-95 transition-transform"
            >
              {lang === 'id' ? 'Selesai & Kembali' : 'Finish & Close'}
            </button>
          ) : (
            <button
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                startBreathing();
              }}
              className="px-4 py-2 rounded-xl bg-[#FAF8FF] border border-[#C9BEFF] text-[#1E1B38] font-bold text-xs hover:bg-[#C9BEFF]/30 active:scale-95 transition-transform inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 stroke-[#1E1B38]" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              <span>{lang === 'id' ? 'Ulangi dari Awal' : 'Restart Protocol'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
