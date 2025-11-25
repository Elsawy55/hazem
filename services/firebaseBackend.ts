// services/firebaseBackend.ts
import { getDb } from '../firebaseConfig';
import { collection, getDocs, query, where, doc, setDoc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { User, UserRole, UserStatus, Student, Session, SessionStatus, Schedule } from '../types';
import { MOCK_SHEIKH } from '../constants';

const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';

// Initialize db
let db: any;
try {
  db = getDb();
} catch (e) {
  console.warn("DB not initialized");
}

export const api = {
  auth: {
    login: async (phone: string, pass: string): Promise<User> => {
      const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", phone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        if (phone === MOCK_SHEIKH.phoneNumber && pass === MOCK_SHEIKH.password) {
          await setDoc(doc(db, USERS_COLLECTION, MOCK_SHEIKH.id), MOCK_SHEIKH);
          return MOCK_SHEIKH;
        }
        throw new Error('رقم الهاتف غير مسجل');
      }

      const userData = querySnapshot.docs[0].data() as User;

      if (userData.password !== pass) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      if (userData.status === UserStatus.SUSPENDED) {
        throw new Error('تم إيقاف هذا الحساب');
      }

      return userData;
    },

    requestOtp: async (phone: string): Promise<void> => {
      console.log(`OTP requested for ${phone}`);
      return Promise.resolve();
    },

    verifyOtp: async (phone: string, code: string): Promise<void> => {
      if (code !== '123456') {
        throw new Error('كود التحقق غير صحيح');
      }
      return Promise.resolve();
    },

    registerStudent: async (data: any): Promise<Student> => {
      const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", data.phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
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
        totalFines: 0,

        // Initialize memorization fields
        startPage: 0,
        dailyWerdPages: 1,
        totalPagesMemorized: 0,
        memorizationPercentage: 0,
        initialMemorizedType: null,
        initialMemorizedValue: 0
      };

      await setDoc(doc(db, USERS_COLLECTION, newStudent.id), newStudent);

      return newStudent;
    }
  },

  sheikh: {
    getStudents: async (): Promise<Student[]> => {
      const db = getDb();
      const q = query(collection(db, USERS_COLLECTION), where("role", "==", UserRole.STUDENT));
      const querySnapshot = await getDocs(q);
      const students: Student[] = [];
      querySnapshot.forEach((d) => {
        students.push(d.data() as Student);
      });
      return students;
    },

    approveStudent: async (id: string, schedule: Schedule): Promise<void> => {
      const db = getDb();
      const studentRef = doc(db, USERS_COLLECTION, id);
      await updateDoc(studentRef, {
        status: UserStatus.ACTIVE,
        schedule: schedule
      });
    },

    updateSchedule: async (studentId: string, schedule: Schedule): Promise<void> => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      await updateDoc(studentRef, {
        schedule: schedule
      });
    },

    deleteStudent: async (studentId: string): Promise<void> => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      await deleteDoc(studentRef);
    },

    penalizeStudent: async (id: string, amount: number): Promise<void> => {
      const studentRef = doc(db, USERS_COLLECTION, id);
      const snap = await getDoc(studentRef);
      if (snap.exists()) {
        const currentFines = (snap.data() as Student).totalFines || 0;
        await updateDoc(studentRef, {
          totalFines: currentFines + amount
        });
      }
    },

    startSession: async (sessionId: string): Promise<void> => {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, {
        status: SessionStatus.IN_PROGRESS,
        startedAt: new Date().toISOString()
      });
    },

    completeSession: async (sessionId: string, notes?: string): Promise<Student | null> => {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) throw new Error('Session not found');
      const sessionData = sessionSnap.data() as Session;

      await updateDoc(sessionRef, {
        status: SessionStatus.COMPLETED,
        notes: notes || '',
        completedAt: new Date().toISOString()
      });

      // Update student progress
      const studentRef = doc(db, USERS_COLLECTION, sessionData.studentId);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        const student = studentSnap.data() as Student;
        const dailyWerd = student.dailyWerdPages || 1;
        const TOTAL_QURAN_PAGES = 604;

        let newTotal = (student.totalPagesMemorized || 0) + dailyWerd;
        if (newTotal > TOTAL_QURAN_PAGES) newTotal = TOTAL_QURAN_PAGES;

        const memorizationPercentage = (newTotal / TOTAL_QURAN_PAGES) * 100;

        await updateDoc(studentRef, {
          totalPagesMemorized: newTotal,
          memorizationPercentage: Math.min(Math.round(memorizationPercentage * 100) / 100, 100),
          lastAttendance: new Date().toISOString()
        });

        return { ...student, totalPagesMemorized: newTotal, memorizationPercentage };
      }
      return null;
    },

    skipSession: async (sessionId: string): Promise<void> => {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, {
        status: SessionStatus.WAITING
      });
    },

    markAbsent: async (sessionId: string): Promise<void> => {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, {
        status: SessionStatus.ABSENT
      });

      // Apply penalty
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data() as Session;
        const studentRef = doc(db, USERS_COLLECTION, sessionData.studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const currentFines = (studentSnap.data() as Student).totalFines || 0;
          await updateDoc(studentRef, {
            totalFines: currentFines + 30 // 30 EGP fine
          });
        }
      }
    },

    updateStudentMemorization: async (studentId: string, data: Partial<Student>): Promise<void> => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      await updateDoc(studentRef, data);
    }
  },

  student: {
    checkIn: async (studentId: string): Promise<Session> => {
      const db = getDb();
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) throw new Error('Student not found');
      const studentData = studentSnap.data() as Student;

      const sessionId = `session-${Date.now()}`;
      const newSession: Session = {
        id: sessionId,
        studentId: studentData.id,
        studentName: studentData.name,
        studentAvatar: studentData.avatarUrl,
        scheduledTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: SessionStatus.READY
      };

      await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), newSession);

      return newSession;
    },

    setupMemorization: async (studentId: string, data: {
      startPage: number;
      dailyWerdPages: number;
      initialMemorizedType: 'juz' | 'pages' | null;
      initialMemorizedValue: number;
    }): Promise<void> => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) throw new Error('Student not found');

      const TOTAL_QURAN_PAGES = 604;

      // Calculate initial pages memorized
      let initialPages = 0;
      if (data.initialMemorizedType === 'juz') {
        const pagesPerJuz = TOTAL_QURAN_PAGES / 30;
        initialPages = Math.round(data.initialMemorizedValue * pagesPerJuz);
      } else if (data.initialMemorizedType === 'pages') {
        initialPages = data.initialMemorizedValue;
      }

      if (initialPages > TOTAL_QURAN_PAGES) initialPages = TOTAL_QURAN_PAGES;

      const memorizationPercentage = (initialPages / TOTAL_QURAN_PAGES) * 100;

      await updateDoc(studentRef, {
        startPage: data.startPage,
        dailyWerdPages: data.dailyWerdPages,
        initialMemorizedType: data.initialMemorizedType,
        initialMemorizedValue: data.initialMemorizedValue,
        totalPagesMemorized: initialPages,
        memorizationPercentage: Math.min(Math.round(memorizationPercentage * 100) / 100, 100)
      });
    },

    getStudentHistory: async (studentId: string): Promise<Session[]> => {
      const q = query(
        collection(db, SESSIONS_COLLECTION),
        where("studentId", "==", studentId),
        where("status", "==", SessionStatus.COMPLETED)
      );
      const querySnapshot = await getDocs(q);
      const sessions: Session[] = [];
      querySnapshot.forEach((doc) => {
        sessions.push(doc.data() as Session);
      });
      // Sort by newest first (assuming ID is timestamp-based)
      return sessions.sort((a, b) => b.id.localeCompare(a.id));
    }
  }
};
