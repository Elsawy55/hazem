
export enum UserRole {
  SHEIKH = 'SHEIKH',
  STUDENT = 'STUDENT',
  GUEST = 'GUEST'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

export enum SessionStatus {
  WAITING = 'WAITING',
  READY = 'READY', // Checked in
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABSENT = 'ABSENT'
}

export type Language = 'en' | 'ar';
export type DayOfWeek = 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

export interface Schedule {
  days: DayOfWeek[];
  startTime: string; // "16:00"
  endTime: string;   // "16:20"
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string;
  phoneNumber: string;
  password?: string; // In a real app, this would be hashed
  schedule?: Schedule;
}

export interface Student extends User {
  currentSurah: string;
  currentJuz: number;
  progress: number; // 0-100
  lastAttendance?: string;
  notes?: string; // Private notes for Sheikh
  totalFines: number; // Amount in EGP
}

export interface Session {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  scheduledTime: string;
  status: SessionStatus;
  notes?: string;
}

export interface QueueState {
  currentSessionId: string | null;
  sessions: Session[];
}

export interface AuthState {
  user: Student | User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}