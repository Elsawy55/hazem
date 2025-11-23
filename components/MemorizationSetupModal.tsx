import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, ChevronRight, ChevronLeft, Calculator, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/Button';
import { SURAH_NAMES, JUZ_NAMES } from '../constants';

interface MemorizationSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

type Step = 'welcome' | 'start' | 'werd' | 'previous' | 'summary';

export default function MemorizationSetupModal({ isOpen, onClose, onSave }: MemorizationSetupModalProps) {
    const { setupMemorization, t, language } = useApp();
    const [step, setStep] = useState<Step>('welcome');

    // Form State
    const [startType, setStartType] = useState<'juz' | 'page' | 'surah'>('juz');
    const [startValue, setStartValue] = useState<number>(1);
    const [dailyWerd, setDailyWerd] = useState<number>(1);
    const [hasPrevious, setHasPrevious] = useState<boolean | null>(null);
    const [previousType, setPreviousType] = useState<'juz' | 'pages' | 'surah'>('juz');
    const [previousValue, setPreviousValue] = useState<number>(0);

    // Calculated State
    const [calculatedStartPage, setCalculatedStartPage] = useState<number>(1);
    const [calculatedTotalMemorized, setCalculatedTotalMemorized] = useState<number>(0);
    const [calculatedPercentage, setCalculatedPercentage] = useState<number>(0);

    useEffect(() => {
        if (isOpen) {
            setStep('welcome');
            // Reset form
            setStartType('juz');
            setStartValue(1);
            setDailyWerd(1);
            setHasPrevious(null);
            setPreviousType('juz');
            setPreviousValue(0);
        }
    }, [isOpen]);

    // Calculation Logic
    useEffect(() => {
        // Calculate Start Page
        let sPage = 1;
        if (startType === 'juz') {
            sPage = Math.round((startValue - 1) * 20) + 1; // Approx 20 pages per juz
            if (sPage < 1) sPage = 1;
        } else if (startType === 'surah') {
            // For Surah, startValue is the Surah ID, so we find the start page
            const surah = SURAH_NAMES.find(s => s.id === startValue);
            sPage = surah ? surah.startPage : 1;
        } else {
            sPage = startValue;
        }
        setCalculatedStartPage(sPage);

        // Calculate Total Memorized
        let total = 0;
        if (hasPrevious) {
            if (previousType === 'juz') {
                total = Math.round(previousValue * 20);
            } else {
                total = previousValue;
            }
        }
        setCalculatedTotalMemorized(total);

        // Calculate Percentage
        const pct = Math.min((total / 604) * 100, 100);
        setCalculatedPercentage(Math.round(pct * 100) / 100);

    }, [startType, startValue, hasPrevious, previousType, previousValue]);

    const handleNext = () => {
        if (step === 'welcome') setStep('start');
        else if (step === 'start') setStep('werd');
        else if (step === 'werd') setStep('previous');
        else if (step === 'previous') setStep('summary');
    };

    const handleBack = () => {
        if (step === 'start') setStep('welcome');
        else if (step === 'werd') setStep('start');
        else if (step === 'previous') setStep('werd');
        else if (step === 'summary') setStep('previous');
    };

    const handleFinish = async () => {
        try {
            await setupMemorization({
                startPage: calculatedStartPage,
                dailyWerdPages: dailyWerd,
                initialMemorizedType: hasPrevious ? previousType : null,
                initialMemorizedValue: hasPrevious ? previousValue : 0
            });
            onSave();
        } catch (error) {
            console.error("Failed to save memorization setup:", error);
            // Optionally show error to user
            onSave(); // Close anyway to prevent getting stuck? Or keep open?
            // If we close, we might leave partial state. But better than crash.
        }
    };

    if (!isOpen) return null;

    const isRtl = language === 'ar';
    const chevronNext = isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />;

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            dir={isRtl ? 'rtl' : 'ltr'}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header / Progress */}
                <div className="bg-slate-50 p-6 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 id="modal-title" className="text-xl font-bold text-slate-800">
                            {step === 'welcome' && t('welcome')}
                            {step === 'start' && t('startPoint')}
                            {step === 'werd' && t('dailyWerd')}
                            {step === 'previous' && t('previousMemorization')}
                            {step === 'summary' && t('summary')}
                        </h2>
                        <div className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                            {step === 'welcome' ? '1/5' : step === 'start' ? '2/5' : step === 'werd' ? '3/5' : step === 'previous' ? '4/5' : '5/5'}
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-500 transition-all duration-500 ease-out"
                            style={{ width: step === 'welcome' ? '20%' : step === 'start' ? '40%' : step === 'werd' ? '60%' : step === 'previous' ? '80%' : '100%' }}
                        ></div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* STEP 1: WELCOME */}
                    {step === 'welcome' && (
                        <div className="text-center space-y-6 py-4 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="w-24 h-24 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <BookOpen size={48} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">{t('welcomeHafiz')}</h3>
                                <p className="text-slate-500 leading-relaxed">
                                    {t('setupDescription')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: START POINT */}
                    {step === 'start' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <label className="block text-sm font-medium text-slate-700 mb-2">{t('whereToStart')}</label>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <button
                                    onClick={() => setStartType('juz')}
                                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${startType === 'juz' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                >
                                    {t('juz')}
                                </button>
                                <button
                                    onClick={() => setStartType('page')}
                                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${startType === 'page' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                >
                                    {t('page')}
                                </button>
                                <button
                                    onClick={() => setStartType('surah')}
                                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${startType === 'surah' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                >
                                    {t('surah')}
                                </button>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                {startType === 'juz' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('selectJuz')}</label>
                                        <select
                                            value={startValue}
                                            onChange={(e) => setStartValue(parseInt(e.target.value))}
                                            className="w-full text-lg font-bold bg-white border-2 border-slate-200 rounded-xl p-4 focus:border-primary-500 outline-none transition-colors"
                                        >
                                            {JUZ_NAMES.map(juz => (
                                                <option key={juz.id} value={juz.id}>
                                                    {language === 'ar' ? juz.nameAr : juz.nameEn}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-center text-sm text-slate-400 mt-3">
                                            {t('startsAtPage')}: <span className="font-bold text-slate-800">{Math.round((startValue - 1) * 20) + 1}</span>
                                        </p>
                                    </div>
                                )}

                                {startType === 'page' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('enterPage')} (1-604)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="604"
                                            value={startValue}
                                            onChange={(e) => setStartValue(parseInt(e.target.value) || 1)}
                                            className="w-full text-center text-3xl font-bold bg-white border-2 border-slate-200 rounded-xl p-4 focus:border-primary-500 outline-none transition-colors"
                                        />
                                    </div>
                                )}

                                {startType === 'surah' && (
                                    <div className="text-center">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('selectSurah')}</label>
                                        <select
                                            value={startValue}
                                            onChange={(e) => setStartValue(parseInt(e.target.value))}
                                            className="w-full text-lg font-bold bg-white border-2 border-slate-200 rounded-xl p-4 focus:border-primary-500 outline-none transition-colors"
                                        >
                                            {SURAH_NAMES.map(surah => (
                                                <option key={surah.id} value={surah.id}>
                                                    {surah.id}. {language === 'ar' ? surah.nameAr : surah.nameEn}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DAILY WERD */}
                    {step === 'werd' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-800 mb-2">{t('howManyPages')}</h3>
                                <p className="text-slate-500 text-sm">{t('dailyGoalDescription')}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 5].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setDailyWerd(num)}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2
                      ${dailyWerd === num
                                                ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md transform scale-[1.02]'
                                                : 'border-slate-100 hover:border-primary-200 hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <span className="text-2xl font-bold">{num}</span>
                                        <span className="text-xs font-medium uppercase">{t('pages')}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-400">{t('orCustom')}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <Calculator size={20} className="text-slate-400" />
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    placeholder={t('enterCustomAmount')}
                                    value={dailyWerd}
                                    onChange={(e) => setDailyWerd(parseInt(e.target.value) || 1)}
                                    className="bg-transparent border-none outline-none flex-1 font-bold text-slate-800 placeholder:font-normal"
                                />
                                <span className="text-sm text-slate-500 font-medium">{t('pages')}</span>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: PREVIOUS MEMORIZATION */}
                    {step === 'previous' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800 text-center">{t('haveYouMemorized')}</h3>

                            <div className="flex gap-4 justify-center mb-8">
                                <button
                                    onClick={() => setHasPrevious(true)}
                                    className={`px-8 py-3 rounded-xl border-2 font-bold transition-all ${hasPrevious === true ? 'border-primary-500 bg-primary-600 text-white shadow-lg' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {t('yes')}
                                </button>
                                <button
                                    onClick={() => { setHasPrevious(false); setPreviousValue(0); }}
                                    className={`px-8 py-3 rounded-xl border-2 font-bold transition-all ${hasPrevious === false ? 'border-slate-800 bg-slate-800 text-white shadow-lg' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {t('no')}
                                </button>
                            </div>

                            {hasPrevious && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex gap-2 mb-4 p-1 bg-white rounded-lg border border-slate-200">
                                        <button
                                            onClick={() => setPreviousType('juz')}
                                            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${previousType === 'juz' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {t('juz')}
                                        </button>
                                        <button
                                            onClick={() => setPreviousType('pages')}
                                            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${previousType === 'pages' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {t('pages')}
                                        </button>
                                        <button
                                            onClick={() => setPreviousType('surah')}
                                            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${previousType === 'surah' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {t('surah')}
                                        </button>
                                    </div>

                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        {previousType === 'juz' ? t('howManyJuz') : t('howManyPages')}
                                    </label>
                                    <input
                                        type="number"
                                        value={previousValue}
                                        onChange={(e) => setPreviousValue(parseInt(e.target.value) || 0)}
                                        className="w-full text-center text-3xl font-bold bg-white border-2 border-slate-200 rounded-xl p-4 focus:border-primary-500 outline-none transition-colors"
                                    />
                                    {previousType === 'surah' && (
                                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1 justify-center">
                                            <AlertCircle size={12} /> {t('surahManualNote')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 5: SUMMARY */}
                    {step === 'summary' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <CheckCircle size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">{t('allSet')}</h3>
                                <p className="text-slate-500">{t('confirmDetails')}</p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-slate-500 text-sm">{t('startPage')}</span>
                                    <span className="font-bold text-slate-800">{calculatedStartPage}</span>
                                </div>
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-slate-500 text-sm">{t('dailyWerd')}</span>
                                    <span className="font-bold text-slate-800">{dailyWerd} {t('pages')}</span>
                                </div>
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-slate-500 text-sm">{t('totalMemorized')}</span>
                                    <span className="font-bold text-slate-800">{calculatedTotalMemorized} {t('pages')}</span>
                                </div>
                                <div className="p-4 bg-primary-50 flex justify-between items-center">
                                    <span className="text-primary-700 font-medium">{t('currentPercentage')}</span>
                                    <span className="font-bold text-2xl text-primary-700">{calculatedPercentage}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
                    {step !== 'welcome' && (
                        <Button variant="ghost" onClick={handleBack} className="flex-1">
                            {t('back')}
                        </Button>
                    )}

                    {step === 'summary' ? (
                        <Button onClick={handleFinish} className="flex-[2] bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
                            {t('finishSetup')}
                        </Button>
                    ) : (
                        <Button onClick={handleNext} className="flex-[2] shadow-lg shadow-primary-200">
                            {t('next')} {chevronNext}
                        </Button>
                    )}
                </div>

            </div>
        </div>
    );
}
