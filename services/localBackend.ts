
import { User, UserRole, UserStatus, Student, Session, SessionStatus, Schedule } from '../types';
import { MOCK_SHEIKH } from '../constants';

/**
 * LOCAL DATABASE SERVICE
 * ----------------------
 * This service uses the browser's LocalStorage to act as a real, persistent database.
 * Data remains saved even if you refresh or close the browser.
 */

const DB_KEYS = {
  USERS: 'hafiz_db_users',
  SESSIONS: 'hafiz_db_sessions'
};

// --- DATABASE INITIALIZATION ---

const initializeDB = (): User[] => {
  const existingUsersStr = localStorage.getItem(DB_KEYS.USERS);
  let users: User[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];

  // Ensure Sheikh exists and has correct credentials from your request
  const sheikhIndex = users.findIndex(u => u.phoneNumber === '01040146888');
  
  if (sheikhIndex === -1) {
    // Add Sheikh if not present
    const sheikh: User = {
      ...MOCK_SHEIKH,
      phoneNumber: '01040146888',
      password: 'sheikh_password_fixed' // You can change this in constants if needed, using MOCK_SHEIKH val
    };
    // Ensure we use the MOCK_SHEIKH values exactly
    users.push(MOCK_SHEIKH);
  } else {
    // Update Sheikh credentials to ensure they match the constants
    users[sheikhIndex] = { ...users[sheikhIndex], ...MOCK_SHEIKH };
  }
  
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  return users;
};

// Helper: Get all users
const getUsers = (): User[] => {
  const str = localStorage.getItem(DB_KEYS.USERS);
  return str ? JSON.parse(str) : initializeDB();
};

// Helper: Save users
const saveUsers = (users: User[]) => {
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
};

// Initialize on load
initializeDB();

export const api = {
  auth: {
    login: async (phone: string, pass: string): Promise<User> => {
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const users = getUsers();
      const user = users.find(u => u.phoneNumber === phone && u.password === pass);
      
      if (!user) throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة');
      if (user.status === UserStatus.SUSPENDED) throw new Error('تم إيقاف هذا الحساب');
      
      return user;
    },
    
    requestOtp: async (phone: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log(`OTP sent to ${phone}: 123456`);
    },
    
    verifyOtp: async (phone: string, code: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      // FIXED OTP FOR ALL USERS as requested
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
        password: data.password, // Stored as plain text for this local demo
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
      return users.filter(u => u.role === UserRole.STUDENT) as Student[];
    },
    
    approveStudent: async (id: string, schedule: Schedule): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = getUsers();
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], status: UserStatus.ACTIVE, schedule };
        saveUsers(users);
      }
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
    }
  },
  
  student: {
    checkIn: async (studentId: string): Promise<Session> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = getUsers();
      const student = users.find(u => u.id === studentId);
      
      if (!student) throw new Error('Student not found');
      
      // In a real DB, we would save the session here.
      // For this Local Backend, we create the object which AppContext adds to the queue.
      
      return {
        id: `session-${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        studentAvatar: student.avatarUrl,
        scheduledTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: SessionStatus.READY
      };
    }
  }
};
