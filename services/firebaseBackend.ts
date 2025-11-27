import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  addDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { app, db, auth } from '../firebaseConfig';
import {
  UserRole,
  UserStatus,
  Student,
  Sheikh,
  Session,
  SessionStatus,
  QueueState,
  Hadith,
  SheikhHadithSettings,
  StudentDailyHadith,
  DayOfWeek
} from '../types';
import { NAWAWI_HADITHS } from '../data/nawawi';
import { TOTAL_QURAN_PAGES } from '../constants';

// Collection references
const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';
const HADITHS_COLLECTION = 'hadiths';
const HADITH_SETTINGS_COLLECTION = 'hadith_settings';
const STUDENT_HADITH_COLLECTION = 'student_hadiths';

// Helper to get DB instance (for consistency with existing code style)
const getDb = () => db;

export const api = {
  auth: {
    // ... existing auth methods ...
    login: async (emailOrPhone: string, password: string) => {
      let email = emailOrPhone.trim();
      if (!email.includes('@')) {
        email = `${emailOrPhone}@hafiz.com`;
      }
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, userCredential.user.uid));
        if (userDoc.exists()) {
          return { user: userCredential.user, userData: userDoc.data() as Student | Sheikh };
        }
        throw new Error('User data not found');
      } catch (error: any) {
        // Auto-create Admin Logic
        if (emailOrPhone.trim() === '01040146888' && password === '123456') {
          try {
            console.log("Attempting to auto-create admin account...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const adminUser: Sheikh = {
              id: userCredential.user.uid,
              name: 'Admin Sheikh',
              phoneNumber: emailOrPhone.trim(),
              role: UserRole.SHEIKH,
              status: UserStatus.ACTIVE,
              avatarUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' // Default avatar
            };
            await setDoc(doc(db, USERS_COLLECTION, adminUser.id), adminUser);
            return { user: userCredential.user, userData: adminUser };
          } catch (createError) {
            console.error("Failed to auto-create admin:", createError);
            // If creation fails (e.g. user exists but wrong password), throw original error
            throw error;
          }
        }
        throw error;
      }
    },

    logout: async () => {
      await signOut(auth);
    },

    getCurrentUser: async (uid: string) => {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
      return userDoc.exists() ? userDoc.data() as Student | Sheikh : null;
    },

    requestOtp: async (phone: string) => {
      console.log("Requesting OTP for", phone);
      // Placeholder for Firebase Phone Auth
    },

    verifyOtp: async (phone: string, code: string) => {
      console.log("Verifying OTP", phone, code);
      // Placeholder
    },

    registerStudent: async (data: any): Promise<Student> => {
      // Create auth user (mock or real)
      // For now, just create the doc assuming auth is handled or this is part of a flow
      // Actually, register usually involves createUserWithEmailAndPassword

      let email = data.email ? data.email.trim() : undefined;
      if (!email && data.phone) {
        email = `${data.phone}@hafiz.com`;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password || '123456'); // Default pass
      const student: Student = {
        id: userCredential.user.uid,
        ...data,
        role: UserRole.STUDENT,
        status: UserStatus.PENDING,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, USERS_COLLECTION, student.id), student);
      return student;
    }
  },

  sheikh: {
    getStudents: async (): Promise<Student[]> => {
      const q = query(collection(db, USERS_COLLECTION), where("role", "==", UserRole.STUDENT));
      const querySnapshot = await getDocs(q);
      const students: Student[] = [];
      querySnapshot.forEach((doc) => {
        students.push(doc.data() as Student);
      });
      return students;
    },

    updateStudentStatus: async (studentId: string, status: UserStatus) => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      await updateDoc(studentRef, { status });
    },

    deleteStudent: async (studentId: string) => {
      const db = getDb();
      // 1. Delete all sessions for this student
      const sessionsQ = query(collection(db, SESSIONS_COLLECTION), where("studentId", "==", studentId));
      const sessionsSnap = await getDocs(sessionsQ);
      const sessionDeletes = sessionsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(sessionDeletes);

      // 2. Delete all hadith records for this student
      const hadithQ = query(collection(db, STUDENT_HADITH_COLLECTION), where("studentId", "==", studentId));
      const hadithSnap = await getDocs(hadithQ);
      const hadithDeletes = hadithSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(hadithDeletes);

      // 3. Delete the user document
      await deleteDoc(doc(db, USERS_COLLECTION, studentId));
    },

    getSessions: async (dateStr: string): Promise<Session[]> => {
      // In a real app, you'd filter by date range or specific date
      // For now, fetching all and filtering client-side or simple query
      const q = query(collection(db, SESSIONS_COLLECTION));
      const querySnapshot = await getDocs(q);
      const sessions: Session[] = [];
      querySnapshot.forEach((doc) => {
        sessions.push(doc.data() as Session);
      });
      return sessions;
    },

    subscribeToSessions: (callback: (sessions: Session[]) => void) => {
      const db = getDb();
      const q = query(collection(db, SESSIONS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
        const sessions: Session[] = [];
        snapshot.forEach((doc) => {
          sessions.push(doc.data() as Session);
        });
        callback(sessions);
      });
    },

    approveStudent: async (studentId: string) => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      await updateDoc(studentRef, { status: UserStatus.ACTIVE });
    },

    updateSchedule: async (studentId: string, schedule: any) => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      await updateDoc(studentRef, { schedule });
    },

    updateStudentMemorization: async (studentId: string, data: any) => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      await updateDoc(studentRef, {
        startPage: data.startPage,
        dailyWerdPages: data.dailyWerdPages,
        initialMemorizedType: data.initialMemorizedType,
        initialMemorizedValue: data.initialMemorizedValue
      });
    },

    startSession: async (sessionId: string) => {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, { status: SessionStatus.IN_PROGRESS });
    },

    completeSession: async (sessionId: string, notes: string): Promise<Student | null> => {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, {
        status: SessionStatus.COMPLETED,
        notes: notes
      });

      // Get session to find student
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const session = sessionSnap.data() as Session;
        const studentRef = doc(db, USERS_COLLECTION, session.studentId);
        const studentSnap = await getDoc(studentRef);
        return studentSnap.exists() ? studentSnap.data() as Student : null;
      }
      return null;
    },

    skipSession: async (sessionId: string) => {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, { status: SessionStatus.ABSENT });
    },
    markAbsent: async (sessionId: string) => {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, { status: SessionStatus.ABSENT });
    }
  },

  student: {
    updateProgress: async (studentId: string, data: any) => {
      const studentRef = doc(db, USERS_COLLECTION, studentId);

      // Calculate memorization percentage
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

    setupMemorization: async (studentId: string, data: any) => {
      // Same as updateProgress for now, but explicit naming for setup
      await api.student.updateProgress(studentId, data);
    },

    checkIn: async (studentId: string): Promise<Session> => {
      const db = getDb();
      // Fetch student details for avatar/name
      const studentRef = doc(db, USERS_COLLECTION, studentId);
      const studentSnap = await getDoc(studentRef);
      const studentData = studentSnap.exists() ? studentSnap.data() as Student : { name: 'Unknown', avatarUrl: '' };

      const sessionData: Session = {
        id: doc(collection(db, SESSIONS_COLLECTION)).id, // Generate ID
        studentId,
        studentName: studentData.name,
        studentAvatar: studentData.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        status: SessionStatus.WAITING,
        scheduledTime: new Date().toLocaleTimeString()
      };

      await setDoc(doc(db, SESSIONS_COLLECTION, sessionData.id), { ...sessionData, createdAt: new Date().toISOString() });
      return sessionData;
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
      const offset = today.getTimezoneOffset() * 60000;
      const localDate = new Date(today.getTime() - offset);
      const dateStr = localDate.toISOString().split('T')[0];

      const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const currentDayCode = daysMap[today.getDay()] as DayOfWeek;

      if (!settings.activeDays.includes(currentDayCode)) return;

      if (settings.lastAssignmentDate === dateStr) return;

      let nextHadithId = settings.lastAssignedHadithId + 1;
      const MAX_HADITHS = 42;

      if (nextHadithId > MAX_HADITHS) {
        if (settings.distributionMode === 'loop') {
          nextHadithId = 1;
        } else {
          return;
        }
      }

      const students = await api.sheikh.getStudents();
      const activeStudents = students.filter(s => s.status === UserStatus.ACTIVE);

      for (const student of activeStudents) {
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

      await api.hadith.updateSettings({
        lastAssignedHadithId: nextHadithId,
        lastAssignmentDate: dateStr
      });
    },

    assignHadithForStudent: async (studentId: string, dateStr: string) => {
      const db = getDb();
      const settings = await api.hadith.getSettings();

      if (!settings.isEnabled) return;

      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localDate = new Date(now.getTime() - offset);
      const todayStr = localDate.toISOString().split('T')[0];

      if (dateStr !== todayStr) return;

      const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const currentDayCode = daysMap[localDate.getDay()] as DayOfWeek;

      if (!settings.activeDays.includes(currentDayCode)) return;

      let hadithIdToAssign = settings.lastAssignedHadithId;

      if (settings.lastAssignmentDate !== dateStr) {
        await api.hadith.assignDailyHadithForAllStudents();
        return;
      }

      const assignment: StudentDailyHadith = {
        id: `${studentId}-${dateStr}`,
        studentId: studentId,
        hadithId: hadithIdToAssign,
        date: dateStr,
        status: 'ASSIGNED',
        assignedAt: new Date().toISOString()
      };

      await setDoc(doc(db, STUDENT_HADITH_COLLECTION, assignment.id), assignment);
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
        await api.hadith.assignHadithForStudent(studentId, dateStr);

        const retrySnapshot = await getDocs(q);
        if (retrySnapshot.empty) return null;

        const assignment = retrySnapshot.docs[0].data() as StudentDailyHadith;
        const hadithRef = doc(db, HADITHS_COLLECTION, assignment.hadithId.toString());
        const hadithSnap = await getDoc(hadithRef);
        if (!hadithSnap.exists()) return null;
        return { assignment, hadith: hadithSnap.data() as Hadith };
      }

      const assignment = snapshot.docs[0].data() as StudentDailyHadith;

      const hadithRef = doc(db, HADITHS_COLLECTION, assignment.hadithId.toString());
      const hadithSnap = await getDoc(hadithRef);

      if (!hadithSnap.exists()) {
        // Auto-seed if missing
        const localHadith = NAWAWI_HADITHS.find(h => h.id === assignment.hadithId);
        if (localHadith) {
          await setDoc(hadithRef, localHadith);
          return {
            assignment,
            hadith: localHadith
          };
        }
        return null;
      }

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

      const hadithRef = doc(db, HADITHS_COLLECTION, hadithId.toString());
      const hadithSnap = await getDoc(hadithRef);
      const hadith = hadithSnap.exists() ? hadithSnap.data() as Hadith : null;

      const studentList = [];
      let seen = 0;
      let done = 0;

      for (const assign of assignments) {
        if (assign.status === 'SEEN') seen++;
        if (assign.status === 'MARKED_DONE') done++;

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
