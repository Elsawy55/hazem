import { User, UserRole, UserStatus, Student, Session, SessionStatus, Schedule, AuditLog, SheikhHadithSettings, StudentDailyHadith, Hadith } from '../types';
import { MOCK_SHEIKH } from '../constants';

const DB_KEYS = {
  USERS: 'hafiz_db_users',
  SESSIONS: 'hafiz_db_sessions',
  AUDIT_LOGS: 'hafiz_db_audit_logs'
};

const TOTAL_QURAN_PAGES = 604;

// --- DATABASE INITIALIZATION ---

const initializeDB = (): User[] => {
  const existingUsersStr = localStorage.getItem(DB_KEYS.USERS);
  let users: User[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];

  const sheikhIndex = users.findIndex(u => u.phoneNumber === '01065332836');

  if (sheikhIndex === -1) {
    users.push(MOCK_SHEIKH);
  } else {
    users[sheikhIndex] = { ...users[sheikhIndex], ...MOCK_SHEIKH };
  }

  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  return users;
};

const getUsers = (): User[] => {
  const str = localStorage.getItem(DB_KEYS.USERS);
  return str ? JSON.parse(str) : initializeDB();
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
};

const getSessions = (): Session[] => {
  const str = localStorage.getItem(DB_KEYS.SESSIONS);
  return str ? JSON.parse(str) : [];
};

const saveSessions = (sessions: Session[]) => {
  localStorage.setItem(DB_KEYS.SESSIONS, JSON.stringify(sessions));
};

const getAuditLogs = (): AuditLog[] => {
  const str = localStorage.getItem(DB_KEYS.AUDIT_LOGS);
  return str ? JSON.parse(str) : [];
};

const saveAuditLogs = (logs: AuditLog[]) => {
  localStorage.setItem(DB_KEYS.AUDIT_LOGS, JSON.stringify(logs));
};

const addAuditLog = (action: AuditLog['action'], details: string, performedBy: string) => {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    action,
    details,
    performedBy,
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog);
  saveAuditLogs(logs);
  return newLog;
};

// --- MEMORIZATION HELPER FUNCTIONS ---

const convertJuzToPages = (juzCount: number): number => {
  const pagesPerJuz = TOTAL_QURAN_PAGES / 30;
  return Math.round(juzCount * pagesPerJuz);
};

const calculatePercentage = (totalPages: number): number => {
  const percentage = (totalPages / TOTAL_QURAN_PAGES) * 100;
  return Math.min(Math.round(percentage * 100) / 100, 100);
};

initializeDB();

export const api = {
  auth: {
    login: async (phone: string, pass: string): Promise<{ user: any, userData: User }> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = getUsers();
      const user = users.find(u => u.phoneNumber === phone && u.password === pass);

      if (!user) throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة');
      if (user.status === UserStatus.SUSPENDED) throw new Error('تم إيقاف هذا الحساب');
      if (user.archived) throw new Error('تم حذف هذا الحساب');

      return { user: { uid: user.id, email: user.phoneNumber }, userData: user };
    },

    requestOtp: async (phone: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log(`OTP sent to ${phone}: 123456`);
    },

    verifyOtp: async (phone: string, code: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (code !== '123456') {
        throw new Error('كود التحقق غير صحيح');
      }
    },

    registerStudent: async (data: any): Promise<Student> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      const users = getUsers();

      if (users.some(u => u.phoneNumber === data.phone)) {
        throw new Error('رقم الهاتف مسجل بالفعل');
      }

      const newStudent: Student = {
        id: `student-${Date.now()}`,
        name: data.name,
        phoneNumber: data.phone,
        password: data.password,
        role: UserRole.STUDENT,
        status: UserStatus.PENDING,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`,
        currentSurah: data.currentSurah || 'Al-Fatiha',
        currentJuz: data.currentJuz || 1,
        progress: 0,
        totalFines: 0
      };

      users.push(newStudent);
      saveUsers(users);

      return newStudent;
    }
  },

  sheikh: {
    getStudents: async (): Promise<Student[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = getUsers();
      return users.filter(u => u.role === UserRole.STUDENT && !u.archived) as Student[];
    },

    getSessions: async (dateStr: string): Promise<Session[]> => {
      const sessions = JSON.parse(localStorage.getItem(DB_KEYS.SESSIONS) || '[]');
      return sessions;
    },

    subscribeToSessions: (callback: (sessions: Session[]) => void) => {
      // Mock subscription using polling
      const interval = setInterval(() => {
        const sessions = JSON.parse(localStorage.getItem(DB_KEYS.SESSIONS) || '[]');
        callback(sessions);
      }, 1000);
      return () => clearInterval(interval);
    },

    approveStudent: async (id: string, schedule?: Schedule): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = getUsers();
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], status: UserStatus.ACTIVE, schedule };
        saveUsers(users);
        addAuditLog('APPROVE', `Approved student ${users[idx].name}`, MOCK_SHEIKH.id);
      }
    },

    updateSchedule: async (studentId: string, schedule: Schedule): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = getUsers();
      const idx = users.findIndex(u => u.id === studentId);
      if (idx !== -1) {
        users[idx] = { ...users[idx], schedule };
        saveUsers(users);
        addAuditLog('SCHEDULE_ASSIGN', `Updated schedule for ${users[idx].name}`, MOCK_SHEIKH.id);
      }
    },

    deleteStudent: async (studentId: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = getUsers();
      const idx = users.findIndex(u => u.id === studentId);
      if (idx !== -1) {
        users[idx] = { ...users[idx], archived: true, deletedAt: new Date().toISOString() };
        saveUsers(users);
      }
    },

    updateProfile: async (data: Partial<User>): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = getUsers();
      const idx = users.findIndex(u => u.role === UserRole.SHEIKH);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...data };
        saveUsers(users);
      }
    },

    getAuditLogs: async (): Promise<AuditLog[]> => {
      return getAuditLogs();
    },

    penalizeStudent: async (id: string, amount: number): Promise<void> => {
      const users = getUsers();
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        const student = users[idx] as Student;
        student.totalFines = (student.totalFines || 0) + amount;
        users[idx] = student;
        saveUsers(users);
      }
    },

    completeSession: async (sessionId: string, notes?: string): Promise<Student | null> => {
      const sessions = getSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) throw new Error('Session not found');

      const session = sessions[sessionIndex];
      session.status = SessionStatus.COMPLETED;
      session.notes = notes;
      sessions[sessionIndex] = session;
      saveSessions(sessions);

      // Update student memorization progress
      const users = getUsers();
      const studentIndex = users.findIndex(u => u.id === session.studentId);
      if (studentIndex !== -1) {
        const student = users[studentIndex] as Student;
        const dailyWerd = student.dailyWerdPages || 1;
        let newTotal = (student.totalPagesMemorized || 0) + dailyWerd;
        if (newTotal > TOTAL_QURAN_PAGES) newTotal = TOTAL_QURAN_PAGES;

        const updatedStudent = {
          ...student,
          totalPagesMemorized: newTotal,
          memorizationPercentage: calculatePercentage(newTotal),
          lastAttendance: new Date().toISOString()
        } as Student;

        users[studentIndex] = updatedStudent;
        saveUsers(users);

        addAuditLog('SESSION_COMPLETE', `Completed session for ${student.name}. Progress: ${newTotal}/${TOTAL_QURAN_PAGES} pages`, MOCK_SHEIKH.id);

        return updatedStudent;
      }
      return null;
    },

    updateStudentMemorization: async (studentId: string, data: Partial<Student>): Promise<void> => {
      const users = getUsers();
      const idx = users.findIndex(u => u.id === studentId);
      if (idx !== -1) {
        const student = users[idx] as Student;
        users[idx] = { ...student, ...data };
        saveUsers(users);
        addAuditLog('SCHEDULE_ASSIGN', `Updated memorization settings for ${student.name}`, MOCK_SHEIKH.id);
      }
    },

    startSession: async (sessionId: string): Promise<void> => {
      const sessions = getSessions();
      const idx = sessions.findIndex(s => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx].status = SessionStatus.IN_PROGRESS;
        saveSessions(sessions);
        addAuditLog('SESSION_START', `Started session for ${sessions[idx].studentName}`, MOCK_SHEIKH.id);
      }
    },

    skipSession: async (sessionId: string): Promise<void> => {
      const sessions = getSessions();
      const idx = sessions.findIndex(s => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx].status = SessionStatus.WAITING;
        saveSessions(sessions);
      }
    },

    markAbsent: async (sessionId: string): Promise<void> => {
      const sessions = getSessions();
      const idx = sessions.findIndex(s => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx].status = SessionStatus.ABSENT;
        saveSessions(sessions);

        // Apply penalty
        const users = getUsers();
        const studentIdx = users.findIndex(u => u.id === sessions[idx].studentId);
        if (studentIdx !== -1) {
          const student = users[studentIdx] as Student;
          student.totalFines = (student.totalFines || 0) + 30; // 30 EGP fine
          users[studentIdx] = student;
          saveUsers(users);
        }

        addAuditLog('ABSENT', `Marked ${sessions[idx].studentName} absent`, MOCK_SHEIKH.id);
      }
    }
  },

  student: {
    checkIn: async (studentId: string): Promise<Session> => {
      const users = getUsers();
      const student = users.find(u => u.id === studentId);

      if (!student) throw new Error('Student not found');

      const sessions = getSessions();

      // Check for existing active session
      const existingSession = sessions.find(s =>
        s.studentId === studentId &&
        (s.status === SessionStatus.WAITING || s.status === SessionStatus.READY || s.status === SessionStatus.IN_PROGRESS)
      );

      if (existingSession) {
        throw new Error('You are already checked in.');
      }

      const now = new Date();

      const session: Session = {
        id: `session-${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        studentAvatar: student.avatarUrl,
        scheduledTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: SessionStatus.WAITING,
        notes: ''
      };

      sessions.push(session);
      saveSessions(sessions);

      addAuditLog('CHECK_IN', `Student ${student.name} checked in`, student.id);

      return session;
    },

    setupMemorization: async (studentId: string, data: {
      startPage: number;
      dailyWerdPages: number;
      initialMemorizedType: 'juz' | 'pages' | 'surah' | null;
      initialMemorizedValue: number;
    }): Promise<void> => {
      const users = getUsers();
      const idx = users.findIndex(u => u.id === studentId);
      if (idx === -1) throw new Error('Student not found');

      const student = users[idx] as Student;

      // Calculate initial pages memorized
      let initialPages = 0;
      if (data.initialMemorizedType === 'juz') {
        initialPages = convertJuzToPages(data.initialMemorizedValue);
      } else if (data.initialMemorizedType === 'pages' || data.initialMemorizedType === 'surah') {
        initialPages = data.initialMemorizedValue;
      }

      if (initialPages > TOTAL_QURAN_PAGES) initialPages = TOTAL_QURAN_PAGES;

      users[idx] = {
        ...student,
        startPage: data.startPage,
        dailyWerdPages: data.dailyWerdPages,
        initialMemorizedType: data.initialMemorizedType,
        initialMemorizedValue: data.initialMemorizedValue,
        totalPagesMemorized: initialPages,
        memorizationPercentage: calculatePercentage(initialPages)
      } as Student;

      saveUsers(users);
      addAuditLog('REGISTER', `Setup memorization for ${student.name}. Initial: ${initialPages} pages`, student.id);
    },

    getStudentHistory: async (studentId: string): Promise<Session[]> => {
      const sessions = getSessions();
      return sessions
        .filter(s => s.studentId === studentId && s.status === SessionStatus.COMPLETED)
        .sort((a, b) => b.id.localeCompare(a.id)); // Sort by newest first (assuming ID is timestamp-based)
    }
  },

  hadith: {
    seedHadiths: async (): Promise<void> => {
      console.log("Local: seedHadiths");
    },

    getSettings: async (): Promise<SheikhHadithSettings> => {
      const str = localStorage.getItem('hafiz_db_hadith_settings');
      if (str) return JSON.parse(str);
      return {
        id: 'default',
        isEnabled: true,
        activeDays: ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'],
        startFromHadithId: 1,
        distributionMode: 'sequential',
        lastAssignedHadithId: 0
      };
    },

    updateSettings: async (settings: Partial<SheikhHadithSettings>): Promise<void> => {
      const current = await api.hadith.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem('hafiz_db_hadith_settings', JSON.stringify(updated));
    },

    assignDailyHadithForAllStudents: async (): Promise<void> => {
      console.log("Local: assignDailyHadithForAllStudents");
    },

    assignHadithForStudent: async (studentId: string, dateStr: string) => {
      console.log("Local: assignHadithForStudent", studentId, dateStr);
    },

    getTodayHadithForStudent: async (studentId: string): Promise<{ assignment: StudentDailyHadith, hadith: Hadith } | null> => {
      return null;
    },

    markHadithAsDone: async (assignmentId: string): Promise<void> => {
      console.log("Local: markHadithAsDone", assignmentId);
    },

    markHadithAsSeen: async (assignmentId: string): Promise<void> => {
      console.log("Local: markHadithAsSeen", assignmentId);
    },

    getHadithStats: async (date: string): Promise<{
      hadith: Hadith | null,
      totalAssigned: number,
      seenCount: number,
      doneCount: number,
      students: { name: string, status: string }[]
    }> => {
      return { hadith: null, totalAssigned: 0, seenCount: 0, doneCount: 0, students: [] };
    }
  }
};
