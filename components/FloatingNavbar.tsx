import React from 'react';
import { Home, Calendar, Clock, User, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FloatingNavbarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
}

export const FloatingNavbar: React.FC<FloatingNavbarProps> = ({ activeSection, onNavigate }) => {
    const { t } = useApp();

    const navItems = [
        { id: 'home', icon: Home, label: t('dashboard') },
        { id: 'schedule', icon: Calendar, label: t('mySchedule') },
        { id: 'history', icon: Activity, label: t('sessionHistory') },
        { id: 'profile', icon: User, label: t('profile') },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md">
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl p-2 flex justify-between items-center">
                {navItems.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-primary-500 text-white shadow-lg scale-105'
                                    : 'text-slate-400 hover:text-primary-500 hover:bg-primary-50'
                                }`}
                        >
                            <item.icon size={isActive ? 24 : 20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[10px] font-medium mt-1 ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
