import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AuthState, User, UserRole, UserStatus, QueueState, Session, SessionStatus, Student, Language, Schedule } from '../types';
import { api } from '../services/api';
// import { api } from '../services/localBackend'; // Switched to local for development

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
  getNextSession: () => Session | undefined;
  getCurrentStudent: () => Student | undefined;

  // Sheikh Actions
  getAllStudents: () => Promise<Student[]>;
  getPendingStudents: () => Promise<Student[]>;
  approveStudent: (id: string, schedule: Schedule) => Promise<void>;
  updateSchedule: (studentId: string, schedule: Schedule) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  updateStudentMemorization: (studentId: string, data: Partial<Student>) => Promise<void>;
  setupMemorization: (data: any) => Promise<void>;

  // Queue Actions
  checkIn: (studentId: string) => Promise<void>;
  startSession: () => void;
  completeSession: (sessionId: string, notes?: string) => Promise<Student | null>;
  skipSession: (sessionId: string) => void;
  markAbsent: (sessionId: string) => void;
  getActiveSession: () => Session | undefined;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  getStudentHistory: (studentId: string) => Promise<Session[]>;
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

    // Load existing sessions from localStorage
    const savedSessions = localStorage.getItem('hafiz_db_sessions');
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions);
        setQueue({ currentSessionId: null, sessions });
      } catch (e) {
        console.error('Failed to load sessions:', e);
        setQueue({ currentSessionId: null, sessions: [] });
      }
    } else {
      setQueue({ currentSessionId: null, sessions: [] });
    }

    // Listen for storage changes to sync across tabs (Local Simulation of Real-time)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hafiz_db_sessions') {
        const newSessions = e.newValue ? JSON.parse(e.newValue) : [];
        setQueue(prev => ({ ...prev, sessions: newSessions }));
      } else if (e.key === 'hafiz_db_users') {
        // Sync user data if the current user is updated
        const newUsers = e.newValue ? JSON.parse(e.newValue) : [];
        const currentUser = localStorage.getItem('hafiz_user_session');

        if (currentUser) {
          const parsedUser = JSON.parse(currentUser);
          const updatedUser = newUsers.find((u: any) => u.id === parsedUser.id);

          if (updatedUser) {
            // Only update if there are actual changes to avoid loops
            if (JSON.stringify(updatedUser) !== JSON.stringify(parsedUser)) {
              console.log('Syncing updated user data from storage event');
              localStorage.setItem('hafiz_user_session', JSON.stringify(updatedUser));
              setAuth(prev => ({ ...prev, user: updatedUser }));
            }
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll for session and user changes every 2 seconds (for same-tab updates)
    const pollInterval = setInterval(() => {
      // 1. Poll Sessions
      const currentSessions = localStorage.getItem('hafiz_db_sessions');
      if (currentSessions) {
        try {
          const sessions = JSON.parse(currentSessions);
          setQueue(prev => {
            // Only update if sessions actually changed
            if (JSON.stringify(prev.sessions) !== JSON.stringify(sessions)) {
              return { ...prev, sessions };
            }
            return prev;
          });
        } catch (e) {
          console.error('Failed to poll sessions:', e);
        }
      }

      // 2. Poll User Data (for Schedule Updates)
      const currentUserStr = localStorage.getItem('hafiz_user_session');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.role === 'student') { // Only poll for students
          const allUsersStr = localStorage.getItem('hafiz_db_users');
          if (allUsersStr) {
            try {
              const allUsers = JSON.parse(allUsersStr);
              const freshUser = allUsers.find((u: any) => u.id === currentUser.id);

              if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
                console.log('Polling detected user update (schedule change?)');
                localStorage.setItem('hafiz_user_session', JSON.stringify(freshUser));
                setAuth(prev => ({ ...prev, user: freshUser }));
              }
            } catch (e) {
              console.error('Failed to poll users:', e);
            }
          }
        }
      }
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
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
      localStorage.setItem('hafiz_user_session', JSON.stringify(user.userData));
      setAuth({ user: user.userData, isAuthenticated: true, isLoading: false });
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
    console.log("checkAuth started");
    const savedUser = localStorage.getItem('hafiz_user_session');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      console.log("Current user in storage:", user);
      if (user.role === UserRole.STUDENT) {
        try {
          const allStudents = await api.sheikh.getStudents();
          console.log("All students fetched:", allStudents);
          const freshUser = allStudents.find(u => u.id === user.id);
          console.log("Fresh user data:", freshUser);
          if (freshUser) {
            localStorage.setItem('hafiz_user_session', JSON.stringify(freshUser));
            setAuth(prev => ({ ...prev, user: freshUser }));
            console.log("Auth state updated");
          }
        } catch (e) {
          console.error("Failed to refresh auth", e);
        }
      }
    } else {
      console.log("No saved user found");
    }
  };

  // --- QUEUE MANAGEMENT ---

  const checkIn = useCallback(async (studentId: string) => {
    try {
      // First, refresh the student data to get the latest schedule
      const allStudents = await api.sheikh.getStudents();
      const freshStudent = allStudents.find(s => s.id === studentId);

      if (freshStudent && auth.user?.id === studentId) {
        // Update the auth state with fresh data
        localStorage.setItem('hafiz_user_session', JSON.stringify(freshStudent));
        setAuth(prev => ({ ...prev, user: freshStudent }));
      }

      const session = await api.student.checkIn(studentId);
      setQueue(prev => ({
        ...prev,
        sessions: [...prev.sessions, session]
      }));
    } catch (err: any) {
      console.error("Check-in failed:", err);
      alert(err.message);
    }
  }, [auth.user]);

  const startSession = useCallback(async () => {
    const nextSession = queue.sessions.find(s => s.status === SessionStatus.READY) ||
      queue.sessions.find(s => s.status === SessionStatus.WAITING);

    if (nextSession) {
      await api.sheikh.startSession(nextSession.id);
      setQueue(prev => ({
        ...prev,
        currentSessionId: nextSession.id,
        sessions: prev.sessions.map(s => {
          if (s.id === nextSession.id) return { ...s, status: SessionStatus.IN_PROGRESS };
          return s;
        })
      }));
    }
  }, [queue.sessions]);

  const completeSession = async (sessionId: string, notes?: string) => {
    const updatedStudent = await api.sheikh.completeSession(sessionId, notes || '');
    setQueue(prev => ({
      ...prev,
      currentSessionId: null,
      sessions: prev.sessions.map(s =>
        s.id === sessionId ? { ...s, status: SessionStatus.COMPLETED, notes } : s
      )
    }));
    return updatedStudent;
  };

  const skipSession = useCallback(async (sessionId: string) => {
    await api.sheikh.skipSession(sessionId);
    setQueue(prev => ({
      ...prev,
      sessions: prev.sessions.map(s =>
        s.id === sessionId ? { ...s, status: SessionStatus.WAITING } : s
      )
    }));
  }, []);

  const markAbsent = useCallback(async (sessionId: string) => {
    await api.sheikh.markAbsent(sessionId);
    setQueue(prev => ({
      ...prev,
      sessions: prev.sessions.map(s =>
        s.id === sessionId ? { ...s, status: SessionStatus.ABSENT } : s
      )
    }));
  }, []);

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

  const approveStudent = async (id: string) => {
    await api.sheikh.approveStudent(id);
  };

  const updateSchedule = async (studentId: string, schedule: Schedule) => {
    await api.sheikh.updateSchedule(studentId, schedule);
  };

  const deleteStudent = async (studentId: string) => {
    await api.sheikh.deleteStudent(studentId);
  };

  const updateStudentMemorization = async (studentId: string, data: Partial<Student>) => {
    await api.sheikh.updateStudentMemorization(studentId, data);
  };

  const setupMemorization = async (data: any) => {
    if (auth.user?.id) {
      await api.student.setupMemorization(auth.user.id, data);

      // Fetch the updated user from the backend to ensure we have the calculated fields (like percentage)
      const allStudents = await api.sheikh.getStudents();
      const updatedUser = allStudents.find(u => u.id === auth.user?.id);

      if (updatedUser) {
        // Update local storage session
        localStorage.setItem('hafiz_user_session', JSON.stringify(updatedUser));

        // Update state
        setAuth(prev => ({ ...prev, user: updatedUser }));
      }
    }
  };

  const getStudentHistory = async (studentId: string) => {
    return await api.student.getStudentHistory(studentId);
  };

  return (
    <AppContext.Provider value={{
      auth, queue, language, toggleLanguage, t,
      login, logout, register, checkAuth, requestOtp, verifyOtp,
      checkIn, startSession, completeSession, skipSession, markAbsent,
      getActiveSession, getNextSession, getCurrentStudent,
      getAllStudents, getPendingStudents, approveStudent,
      updateSchedule, deleteStudent, updateStudentMemorization, setupMemorization, getStudentHistory
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
