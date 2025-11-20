
import { User, UserRole, UserStatus, Student, Session, SessionStatus, Schedule } from '../types';
import { MOCK_SHEIKH } from '../constants';

/**
 * REAL-FEEL BACKEND SERVICE
 * -------------------------
 * Uses LocalStorage to persist data.
 * Starts CLEAN (no fake students).
 * Only Sheikh account is pre-provisioned.
 */

const DB_KEYS = {
  USERS: 'hafiz_prod_users_v1',
};

// --- DATABASE INITIALIZATION ---

const initializeDB = (): User[] => {
  const existingUsersStr = localStorage.getItem(DB_KEYS.USERS);
  let users: User[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];

  // Ensure Sheikh exists and has correct credentials
  const sheikhIndex = users.findIndex(u => u.phoneNumber === MOCK_SHEIKH.phoneNumber);
  
  if (sheikhIndex === -1) {
    // Add Sheikh if not present
    users.push(MOCK_SHEIKH);
  } else {
    // Update Sheikh credentials to ensure they match constants (password fix)
    users[sheikhIndex] = { ...users[sheikhIndex], ...MOCK_SHEIKH };
  }
  
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  return users;
};

// Helper to get users fresh from DB
const getUsers = (): User[] => {
  const str = localStorage.getItem(DB_KEYS.USERS);
  return str ? JSON.parse(str) : initializeDB();
};

// Helper to save users to DB
const saveUsers = (users: User[]) => {
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
};

// Initialize on load
initializeDB();

export const api = {
  auth: {
    login: async (phone: string, pass: string): Promise<User> => {
      await new Promise(resolve => setTimeout(resolve, 800)); // network delay
      const users = getUsers();
      const user = users.find(u => u.phoneNumber === phone && u.password === pass);
      
      if (!user) throw new Error('Invalid phone number or password');
      if (user.status === UserStatus.SUSPENDED) throw new Error('Account suspended');
      
      return user;
    },
    
    requestOtp: async (phone: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real app, send SMS. Here just resolve.
      console.log(`OTP requested for ${phone}`);
    },
    
    verifyOtp: async (phone: string, code: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // FIXED OTP FOR ALL USERS
      if (code !== '123456') {
        throw new Error('Invalid OTP code');
      }
    },
    
    registerStudent: async (data: any): Promise<Student> => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const users = getUsers();
      
      if (users.some(u => u.phoneNumber === data.phone)) {
        throw new Error('Phone number already registered');
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
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = getUsers();
      return users.filter(u => u.role === UserRole.STUDENT) as Student[];
    },
    
    approveStudent: async (id: string, schedule: Schedule): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = getUsers();
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], status: UserStatus.ACTIVE, schedule };
        saveUsers(users);
      }
    },

    penalizeStudent: async (id: string, amount: number): Promise<void> => {
       // No fake delay needed for this
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
