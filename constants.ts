
import { Session, SessionStatus, User, UserRole, Student, UserStatus } from './types';

// FIXED SHEIKH CREDENTIALS
export const MOCK_SHEIKH: User = {
  id: 'sheikh-1',
  name: 'Hazem Emam',
  role: UserRole.SHEIKH,
  status: UserStatus.ACTIVE,
  avatarUrl: 'https://ui-avatars.com/api/?name=Sheikh+Abdullah&background=0D9488&color=fff',
  phoneNumber: '01040146888',
  password: '55667788' // Fixed password
};

// Empty arrays for a "Real DB" feel (no fake users)
export const MOCK_STUDENTS: Student[] = [];

export const INITIAL_SESSIONS: Session[] = [];

// Empty chart data structure
export const PROGRESS_DATA = [
  { name: 'Sat', pages: 0 },
  { name: 'Sun', pages: 0 },
  { name: 'Mon', pages: 0 },
  { name: 'Tue', pages: 0 },
  { name: 'Wed', pages: 0 },
  { name: 'Thu', pages: 0 },
  { name: 'Fri', pages: 0 },
];
