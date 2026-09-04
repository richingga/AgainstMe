import React, { useState, useEffect, useRef } from 'react';

export default function ColdWaterModal({ isOpen, onClose, lang }) {
  const [step, setStep] = useState(1); // 1: Persiapan, 2: Countdown 30s, 3: Selesai
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSecondsLeft(30);
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
  }, [isOpen]);

  function startTimer() {
    setStep(2);
    setSecondsLeft(30);
    setIsRunning(true);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsRunning(false);
          setStep(3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setSecondsLeft(30);
    setStep(1);
  }

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-[#1E1B38]/60 backdrop-blur-md z-[60] flex items-center justify-center p-5 animate-fadeIn text-center"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-[36px] p-6 shadow-2xl border border-[#C9BEFF] space-y-5 relative text-left"
      >
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF8FF] border border-[#C9BEFF] flex items-center justify-center text-xs font-bold text-[#1E1B38] hover:bg-[#C9BEFF]/40"
        >
          ✕
        </button>

        <div className="text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 block mb-1">
            {lang === 'id' ? 'Trik Fisiologis · Mammalian Dive Reflex' : 'Physiological Protocol · Dive Reflex'}
          </span>
          <h3 className="font-black text-lg text-[#1E1B38]">
            {lang === 'id' ? 'Cold Water Reset' : 'Cold Water Reset'}
          </h3>
          <p className="text-xs text-[#6D6796] mt-1">
            {lang === 'id' 
              ? 'Suhu dingin pada wajah memicu reflek menyelam seketika: detak jantung melambat & memutus sakau dopamin.'
              : 'Freezing temperature on your face triggers a reflex that drops heart rate and cuts dopamine cravings.'}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200/70 rounded-2xl p-4 space-y-2.5 text-xs text-sky-950">
              <div className="font-extrabold text-sky-800 flex items-center gap-1.5">
                <svg className="w-4 h-4 stroke-sky-800" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>{lang === 'id' ? 'Instruksi Cepat:' : 'Quick Instructions:'}</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-[11px] leading-relaxed">
                <li>{lang === 'id' ? 'Ambil air es dingin di mangkuk atau nyalakan keran air dingin.' : 'Get cold ice water or run freezing tap water.'}</li>
                <li>{lang === 'id' ? 'Basuh atau celupkan seluruh wajah (terutama area mata, pipi, dahi).' : 'Splash or submerge whole face (eyes, cheeks, forehead).'}</li>
                <li>{lang === 'id' ? 'Tekan leher belakang dengan handuk/air dingin.' : 'Apply cold water to the back of your neck.'}</li>
              </ul>
            </div>

            <button
              onClick={startTimer}
              className="w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-lg shadow-sky-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{lang === 'id' ? 'Mulai Timer Basuh 30 Detik' : 'Start 30-Second Reset Timer'}</span>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-32 h-32 mx-auto rounded-full bg-sky-100 border-4 border-sky-400 flex flex-col items-center justify-center animate-pulse">
              <span className="text-4xl font-black text-sky-700">{secondsLeft}</span>
              <span className="text-[10px] font-extrabold text-sky-600 uppercase">{lang === 'id' ? 'Detik Lagi' : 'Sec Left'}</span>
            </div>
            <p className="text-xs text-[#1E1B38] font-semibold">
              {lang === 'id' ? 'Basuh wajah terus-menerus dengan air es dingin...' : 'Keep splashing cold water over your face & neck...'}
            </p>
            <button
              onClick={handleReset}
              className="text-xs text-[#6D6796] underline font-bold"
            >
              {lang === 'id' ? 'Batal / Reset' : 'Cancel / Reset'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-3 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#ECE9FF] border-2 border-[#6367FF] flex items-center justify-center text-[#6367FF]">
              <svg className="w-8 h-8 stroke-[#6367FF]" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-[#1E1B38]">
                {lang === 'id' ? 'Selesai! Sensasi Dingin Berhasil' : 'Reset Finished!'}
              </h4>
              <p className="text-xs text-[#6D6796] mt-1">
                {lang === 'id'
                  ? 'Keringkan wajah dengan handuk. Rasakan detak jantungmu yang sudah jauh lebih lambat dan terkendali.'
                  : 'Dry your face. Notice your slower heart rate and regained mental clarity.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-[#6367FF] text-white font-extrabold text-xs shadow-md shadow-[#8494FF]/30 active:scale-95 transition-all"
            >
              {lang === 'id' ? 'Kembali ke Beranda' : 'Return to Dashboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
