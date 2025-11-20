import React from 'react';
import { LogOut, Bell, Menu, User, BookOpen, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/Button';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth, logout, t, language, toggleLanguage } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 p-2 rounded-lg text-white">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t('appName')}</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
            >
              <Globe size={18} />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {auth.isAuthenticated && (
              <div className="flex items-center gap-2 sm:gap-4">
                <button className="p-2 text-slate-400 hover:text-primary-600 transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                
                <div className="hidden md:flex items-center gap-3 border-s border-slate-200 ps-4">
                  <div className="text-end hidden sm:block">
                    <p className="text-sm font-medium text-slate-800">{auth.user?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{auth.user?.role.toLowerCase()}</p>
                  </div>
                  <img 
                    src={auth.user?.avatarUrl} 
                    alt="Profile" 
                    className="w-9 h-9 rounded-full border-2 border-primary-100 object-cover"
                  />
                  <Button variant="ghost" size="sm" onClick={logout} icon={<LogOut size={16} className="rtl:rotate-180" />}>
                    
                  </Button>
                </div>
                
                <button 
                  className="md:hidden p-2 text-slate-600"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu size={24} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && auth.isAuthenticated && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3 animate-in slide-in-from-top-5 duration-200">
             <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <img 
                  src={auth.user?.avatarUrl} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-slate-800">{auth.user?.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{auth.user?.role.toLowerCase()}</p>
                </div>
             </div>
             <Button fullWidth variant="ghost" className="justify-start" icon={<User size={18}/>}>{t('profile')}</Button>
             <Button fullWidth variant="danger" className="justify-start" onClick={logout} icon={<LogOut size={18} className="rtl:rotate-180" />}>{t('logout')}</Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};