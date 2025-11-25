// services/firebaseBackend.ts
import { getDb } from '../firebaseConfig';
import { collection, getDocs, query, where, doc, setDoc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { User, UserRole, UserStatus, Student, Session, SessionStatus, Schedule, Hadith, SheikhHadithSettings, StudentDailyHadith, DayOfWeek } from '../types';
import { MOCK_SHEIKH } from '../constants';
import { NAWAWI_HADITHS } from '../data/nawawi';

const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';
const HADITHS_COLLECTION = 'nawawi_hadiths';
const HADITH_SETTINGS_COLLECTION = 'hadith_settings';
const STUDENT_HADITH_COLLECTION = 'student_daily_hadith';

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
  },

  hadith: {
    seedHadiths: async (): Promise<void> => {
      const db = getDb();
      const q = query(collection(db, HADITHS_COLLECTION));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("Seeding Hadiths...");
        for (const hadith of NAWAWI_HADITHS) {
          await setDoc(doc(db, HADITHS_COLLECTION, hadith.id.toString()), hadith);
        }
      }
    },

    getSettings: async (): Promise<SheikhHadithSettings> => {
      const db = getDb();
      const docRef = doc(db, HADITH_SETTINGS_COLLECTION, 'default');
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        return snapshot.data() as SheikhHadithSettings;
      } else {
        // Default settings
        const defaultSettings: SheikhHadithSettings = {
          id: 'default',
          isEnabled: true,
          activeDays: ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'],
          startFromHadithId: 1,
          distributionMode: 'sequential',
          lastAssignedHadithId: 0
        };
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
      }
    },

    updateSettings: async (settings: Partial<SheikhHadithSettings>): Promise<void> => {
      const db = getDb();
      const docRef = doc(db, HADITH_SETTINGS_COLLECTION, 'default');
      await updateDoc(docRef, settings);
    },

    assignDailyHadithForAllStudents: async (): Promise<void> => {
      const db = getDb();
      const settings = await api.hadith.getSettings();

      if (!settings.isEnabled) return;

      const today = new Date();
      // Use local date string to avoid timezone issues (e.g. Egypt UTC+2)
      const offset = today.getTimezoneOffset() * 60000;
      const localDate = new Date(today.getTime() - offset);
      const dateStr = localDate.toISOString().split('T')[0];

      // Check if today is active day
      // Note: 'THU' vs 'Thu' - ensure mapping is correct. 
      // JS getDay() returns 0-6. 
      // Let's rely on the DayOfWeek type matching the settings.
      // Mapping: SUN, MON, TUE, WED, THU, FRI, SAT
      const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const currentDayCode = daysMap[today.getDay()] as DayOfWeek;

      if (!settings.activeDays.includes(currentDayCode)) return;

      // Check if already assigned today
      if (settings.lastAssignmentDate === dateStr) return;

      // Determine next hadith
      let nextHadithId = settings.lastAssignedHadithId + 1;

      // Check if we exceeded available hadiths (assuming 42 for Nawawi, or check DB count)
      // For simplicity, let's check against our seed data length or a hard limit
      const MAX_HADITHS = 42;

      if (nextHadithId > MAX_HADITHS) {
        if (settings.distributionMode === 'loop') {
          nextHadithId = 1;
        } else {
          return; // Stop assigning
        }
      }

      // Get all active students
      const students = await api.sheikh.getStudents();
      const activeStudents = students.filter(s => s.status === UserStatus.ACTIVE);

      // Assign to each student
      for (const student of activeStudents) {
        // Check if student already has assignment for today (double safety)
        const q = query(
          collection(db, STUDENT_HADITH_COLLECTION),
          where("studentId", "==", student.id),
          where("date", "==", dateStr)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          const assignment: StudentDailyHadith = {
            id: `${student.id}-${dateStr}`,
            studentId: student.id,
            hadithId: nextHadithId,
            date: dateStr,
            status: 'ASSIGNED',
            assignedAt: new Date().toISOString()
          };
          await setDoc(doc(db, STUDENT_HADITH_COLLECTION, assignment.id), assignment);
        }
      }

      // Update settings
      await api.hadith.updateSettings({
        lastAssignedHadithId: nextHadithId,
        lastAssignmentDate: dateStr
      });
    },

    getTodayHadithForStudent: async (studentId: string): Promise<{ assignment: StudentDailyHadith, hadith: Hadith } | null> => {
      const db = getDb();
      const today = new Date();
      const offset = today.getTimezoneOffset() * 60000;
      const localDate = new Date(today.getTime() - offset);
      const dateStr = localDate.toISOString().split('T')[0];

      const q = query(
        collection(db, STUDENT_HADITH_COLLECTION),
        where("studentId", "==", studentId),
        where("date", "==", dateStr)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Auto-assign if not done yet (for standalone student view)
        await api.hadith.assignDailyHadithForAllStudents();
        const retrySnapshot = await getDocs(q);
        if (retrySnapshot.empty) return null;

        const assignment = retrySnapshot.docs[0].data() as StudentDailyHadith;
        const hadithRef = doc(db, HADITHS_COLLECTION, assignment.hadithId.toString());
        const hadithSnap = await getDoc(hadithRef);
        if (!hadithSnap.exists()) return null;
        return { assignment, hadith: hadithSnap.data() as Hadith };
      }

      const assignment = snapshot.docs[0].data() as StudentDailyHadith;

      // Fetch hadith details
      const hadithRef = doc(db, HADITHS_COLLECTION, assignment.hadithId.toString());
      const hadithSnap = await getDoc(hadithRef);

      if (!hadithSnap.exists()) return null;

      return {
        assignment,
        hadith: hadithSnap.data() as Hadith
      };
    },

    markHadithAsDone: async (assignmentId: string): Promise<void> => {
      const db = getDb();
      const ref = doc(db, STUDENT_HADITH_COLLECTION, assignmentId);
      await updateDoc(ref, {
        status: 'MARKED_DONE'
      });
    },

    markHadithAsSeen: async (assignmentId: string): Promise<void> => {
      const db = getDb();
      const ref = doc(db, STUDENT_HADITH_COLLECTION, assignmentId);
      const snap = await getDoc(ref);
      if (snap.exists() && (snap.data() as StudentDailyHadith).status === 'ASSIGNED') {
        await updateDoc(ref, {
          status: 'SEEN'
        });
      }
    },

    getHadithStats: async (date: string): Promise<{
      hadith: Hadith | null,
      totalAssigned: number,
      seenCount: number,
      doneCount: number,
      students: { name: string, status: string }[]
    }> => {
      const db = getDb();

      // Get assignments for date
      const q = query(
        collection(db, STUDENT_HADITH_COLLECTION),
        where("date", "==", date)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { hadith: null, totalAssigned: 0, seenCount: 0, doneCount: 0, students: [] };
      }

      const assignments = snapshot.docs.map(d => d.data() as StudentDailyHadith);
      const hadithId = assignments[0].hadithId;

      // Get Hadith info
      const hadithRef = doc(db, HADITHS_COLLECTION, hadithId.toString());
      const hadithSnap = await getDoc(hadithRef);
      const hadith = hadithSnap.exists() ? hadithSnap.data() as Hadith : null;

      // Get student names (could be optimized)
      const studentList = [];
      let seen = 0;
      let done = 0;

      for (const assign of assignments) {
        if (assign.status === 'SEEN') seen++;
        if (assign.status === 'MARKED_DONE') done++;

        // Fetch student name
        const studentRef = doc(db, USERS_COLLECTION, assign.studentId);
        const studentSnap = await getDoc(studentRef);
        const name = studentSnap.exists() ? (studentSnap.data() as Student).name : 'Unknown';

        studentList.push({ name, status: assign.status });
      }

      return {
        hadith,
        totalAssigned: assignments.length,
        seenCount: seen,
        doneCount: done,
        students: studentList
      };
    }
  }
};
