// services/firebaseBackend.ts
import { getDb } from '../firebaseConfig';
import { collection, getDocs, query, where, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { User, UserRole, UserStatus, Student, Session, SessionStatus, Schedule } from '../types';
import { MOCK_SHEIKH } from '../constants';

/**
 * REAL FIREBASE BACKEND
 * Connects to Firestore Database
 */

const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';

export const api = {
  auth: {
    login: async (phone: string, pass: string): Promise<User> => {
      const db = getDb();
      // البحث عن المستخدم برقم الهاتف
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
      // في التطبيق الحقيقي، هنا يتم استدعاء Firebase Auth أو خدمة SMS
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
      const db = getDb();
      // التحقق مما إذا كان الرقم موجوداً
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
        totalFines: 0
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

    penalizeStudent: async (id: string, amount: number): Promise<void> => {
       const db = getDb();
       const studentRef = doc(db, USERS_COLLECTION, id);
       const snap = await getDoc(studentRef);
       if (snap.exists()) {
         const currentFines = (snap.data() as Student).totalFines || 0;
         await updateDoc(studentRef, {
            totalFines: currentFines + amount
         });
       }
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
    }
  }
};
