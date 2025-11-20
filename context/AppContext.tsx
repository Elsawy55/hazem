import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AuthState, User, UserRole, UserStatus, QueueState, Session, SessionStatus, Student, Language, Schedule } from '../types';

// -------------------------------------------------------------
// IMPORTANT: Switching to Firebase Backend for Production
// -------------------------------------------------------------
import { api } from '../services/firebaseBackend'; 
// import { api } from '../services/localBackend'; // Commented out for production

import { translations, TranslationKey } from '../translations';

interface AppContextType {
  auth: AuthState;
  queue: QueueState;
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  
  // Auth Actions
  login: (phone: string, pass: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  checkAuth: () => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;

  // Queue Actions
  checkIn: (studentId: string) => Promise<void>;
  startSession: () => void;
  completeSession: (sessionId: string, notes?: string) => void;
  skipSession: (sessionId: string) => void;
  markAbsent: (sessionId: string) => void;
  
  // Getters
  getActiveSession: () => Session | undefined;
  getNextSession: () => Session | undefined;
  getCurrentStudent: () => Student | undefined;

  // Sheikh Actions
  getAllStudents: () => Promise<Student[]>;
  getPendingStudents: () => Promise<Student[]>;
  approveStudent: (id: string, schedule: Schedule) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: undefined
  });

  const [language, setLanguage] = useState<Language>('ar');

  const [queue, setQueue] = useState<QueueState>({
    currentSessionId: null,
    sessions: [], 
  });

  // Initialize Auth on Load
  useEffect(() => {
    const savedUser = localStorage.getItem('hafiz_user_session');
    if (savedUser) {
      setAuth({
        user: JSON.parse(savedUser),
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
    
    setQueue({ currentSessionId: null, sessions: [] });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    let text = translations[language][key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(`{{${paramKey}}}`, String(paramValue));
      });
    }
    return text;
  }, [language]);

  // --- AUTHENTICATION ---

  const login = async (phone: string, pass: string) => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: undefined }));
      const user = await api.auth.login(phone, pass);
      localStorage.setItem('hafiz_user_session', JSON.stringify(user));
      setAuth({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      setAuth(prev => ({ ...prev, isLoading: false, error: err.message }));
      throw err;
    }
  };

  const requestOtp = async (phone: string) => {
    await api.auth.requestOtp(phone);
  };

  const verifyOtp = async (phone: string, code: string) => {
    await api.auth.verifyOtp(phone, code);
  };

  const register = async (data: any) => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: undefined }));
      const user = await api.auth.registerStudent(data);
      localStorage.setItem('hafiz_user_session', JSON.stringify(user));
      setAuth({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      setAuth(prev => ({ ...prev, isLoading: false, error: err.message }));
      throw err;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('hafiz_user_session');
    setAuth({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const checkAuth = async () => {
    const savedUser = localStorage.getItem('hafiz_user_session');
    if (savedUser) {
       const user = JSON.parse(savedUser);
       if (user.role === UserRole.STUDENT) {
          try {
            const allStudents = await api.sheikh.getStudents();
            const freshUser = allStudents.find(u => u.id === user.id);
            if (freshUser) {
               localStorage.setItem('hafiz_user_session', JSON.stringify(freshUser));
               setAuth(prev => ({ ...prev, user: freshUser }));
            }
          } catch (e) {
            console.error("Failed to refresh auth", e);
          }
       }
    }
  };

  // --- QUEUE MANAGEMENT ---

  const checkIn = useCallback(async (studentId: string) => {
    try {
      const session = await api.student.checkIn(studentId);
      setQueue(prev => ({
        ...prev,
        sessions: [...prev.sessions, session]
      }));
    } catch (err: any) {
      console.error("Check-in failed:", err);
      alert(err.message);
    }
  }, []);

  const startSession = useCallback(() => {
    setQueue(prev => {
      const nextReady = prev.sessions.find(s => s.status === SessionStatus.READY);
      if (!nextReady) return prev;
      return {
        ...prev,
        currentSessionId: nextReady.id,
        sessions: prev.sessions.map(s => {
          if (s.id === nextReady.id) return { ...s, status: SessionStatus.IN_PROGRESS };
          return s;
        })
      };
    });
  }, []);

  const completeSession = useCallback((sessionId: string, notes?: string) => {
    setQueue(prev => ({
      ...prev,
      currentSessionId: null,
      sessions: prev.sessions.map(s => 
        s.id === sessionId ? { ...s, status: SessionStatus.COMPLETED, notes } : s
      )
    }));
  }, []);

  const skipSession = useCallback((sessionId: string) => {
     setQueue(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => 
        s.id === sessionId ? { ...s, status: SessionStatus.WAITING } : s
      )
    }));
  }, []);

  const markAbsent = useCallback((sessionId: string) => {
    const session = queue.sessions.find(s => s.id === sessionId);
    if (session) {
       api.sheikh.penalizeStudent(session.studentId, 30).catch(console.error);
    }
    
    setQueue(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => 
        s.id === sessionId ? { ...s, status: SessionStatus.ABSENT } : s
      )
    }));
  }, [queue.sessions]);

  const getActiveSession = useCallback(() => {
    return queue.sessions.find(s => s.status === SessionStatus.IN_PROGRESS);
  }, [queue.sessions]);

  const getNextSession = useCallback(() => {
    return queue.sessions.find(s => s.status === SessionStatus.READY || (s.status === SessionStatus.WAITING && !queue.sessions.some(pr => pr.status === SessionStatus.READY && pr.id !== s.id)));
  }, [queue.sessions]);

  const getCurrentStudent = useCallback(() => {
    if (auth.user?.role === UserRole.STUDENT) {
      return auth.user as Student;
    }
    return undefined;
  }, [auth.user]);

  // --- SHEIKH ACTIONS ---
  
  const getAllStudents = async () => {
    try {
      return await api.sheikh.getStudents();
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const getPendingStudents = async () => {
    try {
      const students = await api.sheikh.getStudents();
      return students.filter(s => s.status === UserStatus.PENDING);
    } catch (e) {
      return [];
    }
  };

  const approveStudent = async (id: string, schedule: Schedule) => {
    await api.sheikh.approveStudent(id, schedule);
  };

  return (
    <AppContext.Provider value={{ 
      auth, queue, language, toggleLanguage, t, 
      login, logout, register, checkAuth, requestOtp, verifyOtp,
      checkIn, startSession, completeSession, skipSession, markAbsent,
      getActiveSession, getNextSession, getCurrentStudent,
      getAllStudents, getPendingStudents, approveStudent
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
