import React, { useState } from 'react';
import { BookOpen, UserCircle, GraduationCap, Globe, Lock, Phone, AlertCircle, ChevronRight, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const LoginView: React.FC = () => {
  const { login, register, requestOtp, verifyOtp, t, language, toggleLanguage } = useApp();
  
  const [mode, setMode] = useState<string>('selection');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    otp: '',
    currentSurah: '',
    currentJuz: 1
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(formData.phone, formData.password);
    } catch (err: any) {
      setError(err.message || t('invalidCredentials'));
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await requestOtp(formData.phone);
      setMode('student-register-2');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await verifyOtp(formData.phone, formData.otp);
      setMode('student-register-3');
    } catch (err: any) {
      setError(t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await register({
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        currentSurah: formData.currentSurah,
        currentJuz: formData.currentJuz
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // --- COMPONENTS ---

  const LanguageToggle = () => (
    <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
      <button 
        onClick={toggleLanguage}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors px-3 py-2 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 hover:shadow-md"
      >
        <Globe size={18} />
        <span>{language === 'en' ? 'العربية' : 'English'}</span>
      </button>
    </div>
  );

  const renderSelection = () => (
    <div className="grid grid-cols-1 gap-4 mt-8">
      <Card 
        className="cursor-pointer hover:border-primary-500 transition-all group"
        onClick={() => setMode('sheikh-login')}
      >
        <div className="flex items-center gap-4">
          <div className="bg-primary-50 p-3 rounded-xl text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
            <UserCircle size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">{t('roleSheikh')}</h3>
            <p className="text-sm text-slate-500">{t('roleSheikhDesc')}</p>
          </div>
        </div>
      </Card>

      <Card 
        className="cursor-pointer hover:border-primary-500 transition-all group"
        onClick={() => setMode('student-login')}
      >
        <div className="flex items-center gap-4">
          <div className="bg-primary-50 p-3 rounded-xl text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
            <GraduationCap size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">{t('roleStudent')}</h3>
            <p className="text-sm text-slate-500">{t('roleStudentDesc')}</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderLogin = (titleKey: string) => (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">{t(titleKey as any)}</h3>
        <p className="text-sm text-slate-500">{t('enterCredentials')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Phone size={14} /> {t('phoneLabel')}
          </label>
          <input 
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-primary-500 outline-none"
            placeholder="010..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Lock size={14} /> {t('password')}
          </label>
          <input 
            type="password"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-primary-500 outline-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-2 rounded-lg">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button fullWidth onClick={handleLogin} disabled={loading}>
          {loading ? '...' : t('loginAction')}
        </Button>

        {mode === 'student-login' && (
           <div className="text-center pt-2">
             <p className="text-sm text-slate-500">
               {t('dontHaveAccount')} <button onClick={() => setMode('student-register-1')} className="text-primary-600 font-bold hover:underline">{t('registerNow')}</button>
             </p>
           </div>
        )}

        <Button fullWidth variant="ghost" onClick={() => setMode('selection')}>
          {t('back')}
        </Button>
      </div>
    </Card>
  );

  const renderRegisterStep1 = () => (
    <Card>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">{t('registerAction')}</h3>
        <p className="text-sm text-slate-500">{t('phoneLabel')}</p>
      </div>
      <div className="space-y-4">
        <input 
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-primary-500 outline-none"
            placeholder="+20..."
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button fullWidth onClick={handleRequestOtp} disabled={loading}>{t('sendOtp')}</Button>
        
        <div className="text-center pt-2">
             <p className="text-sm text-slate-500">
               {t('alreadyHaveAccount')} <button onClick={() => setMode('student-login')} className="text-primary-600 font-bold hover:underline">{t('loginNow')}</button>
             </p>
        </div>
        
        <Button fullWidth variant="ghost" onClick={() => setMode('selection')}>{t('back')}</Button>
      </div>
    </Card>
  );

  const renderRegisterStep2 = () => (
    <Card>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">{t('verify')}</h3>
        <p className="text-sm text-slate-500">{t('otpSent')} {formData.phone}</p>
      </div>
      <div className="space-y-4">
        <input 
            type="text"
            maxLength={6}
            value={formData.otp}
            onChange={e => setFormData({...formData, otp: e.target.value})}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-primary-500 outline-none text-center text-2xl tracking-widest"
            placeholder="000000"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button fullWidth onClick={handleVerifyOtp} disabled={loading}>{t('verify')}</Button>
        <Button fullWidth variant="ghost" onClick={() => setMode('student-register-1')}>{t('back')}</Button>
      </div>
    </Card>
  );

  const renderRegisterStep3 = () => (
    <Card>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">{t('profile')}</h3>
        <p className="text-sm text-slate-500">{t('fillAllFields')}</p>
      </div>
      <div className="space-y-3">
        <input type="text" placeholder={t('fullName')} className="w-full p-2 border rounded-lg"
           value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <input type="password" placeholder={t('createPassword')} className="w-full p-2 border rounded-lg"
           value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
        <div className="flex gap-2">
          <input type="text" placeholder={t('currentSurahLabel')} className="flex-1 p-2 border rounded-lg"
             value={formData.currentSurah} onChange={e => setFormData({...formData, currentSurah: e.target.value})} />
          <input type="number" placeholder={t('currentJuzLabel')} className="w-20 p-2 border rounded-lg"
             value={formData.currentJuz} onChange={e => setFormData({...formData, currentJuz: parseInt(e.target.value)})} />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button fullWidth onClick={handleRegister} disabled={loading}>{t('confirmApproval')}</Button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative">
      <LanguageToggle />
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto bg-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6">
            <BookOpen size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">{t('welcomeTitle')}</h2>
          <p className="text-slate-500">{t('welcomeSubtitle')}</p>
        </div>

        {mode === 'selection' && renderSelection()}
        {mode === 'sheikh-login' && renderLogin('sheikhLogin')}
        {mode === 'student-login' && renderLogin('studentLogin')}
        {mode === 'student-register-1' && renderRegisterStep1()}
        {mode === 'student-register-2' && renderRegisterStep2()}
        {mode === 'student-register-3' && renderRegisterStep3()}

        <p className="text-center text-xs text-slate-400 pt-8">{t('appCopyright')}</p>
      </div>
    </div>
  );
};
