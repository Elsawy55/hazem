import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, MapPin, BookOpen, Award, ChevronRight, AlertTriangle, Activity, Flag, UserX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SessionStatus, Session, StudentDailyHadith, Hadith, DayOfWeek, UserRole, Student } from '../types';
import { TOTAL_QURAN_PAGES } from '../constants';
import MemorizationSetupModal from '../components/MemorizationSetupModal';
import { FloatingNavbar } from '../components/FloatingNavbar';
import { StudentHadithCard } from '../components/StudentHadithCard';
import { api } from '../services/api';

// Mock data for the chart - in a real app this would come from the backend
const mockProgressData = [
  { day: 'Sat', pages: 2 },
  { day: 'Sun', pages: 3 },
  { day: 'Mon', pages: 1 },
  { day: 'Tue', pages: 4 },
  { day: 'Wed', pages: 2 },
  { day: 'Thu', pages: 5 },
  { day: 'Fri', pages: 3 },
];

export const StudentDashboard = () => {
  const { auth, queue, checkIn, language, t, getStudentHistory } = useApp();
  const student = auth.user?.role === UserRole.STUDENT ? auth.user as Student : null;
  const isCheckedIn = queue.sessions.some(s => s.studentId === student?.id && (s.status === SessionStatus.WAITING || s.status === SessionStatus.READY || s.status === SessionStatus.IN_PROGRESS));
  const [history, setHistory] = useState<Session[]>([]);

  useEffect(() => {
    if (student) {
      getStudentHistory(student.id).then(setHistory);
    }
  }, [student]);

  const [showSetup, setShowSetup] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [dailyHadith, setDailyHadith] = useState<{ assignment: StudentDailyHadith, hadith: Hadith } | null>(null);

  // Scroll spy for navbar
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'schedule', 'history'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch daily Hadith
  useEffect(() => {
    const fetchHadith = async () => {
      if (student) {
        try {
          const data = await api.hadith.getTodayHadithForStudent(student.id);
          setDailyHadith(data);
        } catch (error) {
          console.error("Error fetching daily hadith:", error);
        }
      }
    };
    fetchHadith();
  }, [student]);

  if (!student) return null;

  // 1. Identify Sessions
  const activeSession = queue.sessions.find(s =>
    s.studentId === student.id &&
    (s.status === SessionStatus.WAITING || s.status === SessionStatus.READY || s.status === SessionStatus.IN_PROGRESS)
  );

  const completedSession = queue.sessions.find(s =>
    s.studentId === student.id &&
    (s.status === SessionStatus.COMPLETED || s.status === SessionStatus.ABSENT)
  );

  const currentActive = queue.sessions.find(s => s.status === SessionStatus.IN_PROGRESS);

  // 2. Calculate Queue Position
  const waitingBeforeMe = activeSession ? queue.sessions.filter(s =>
    (s.status === SessionStatus.WAITING || s.status === SessionStatus.READY) &&
    s.scheduledTime < activeSession.scheduledTime &&
    s.id !== activeSession.id
  ).length : 0;

  // 3. Check-in Eligibility Logic
  const checkInStatus = () => {
    if (!student.schedule?.startTime) return { allowed: true };
    const now = new Date();
    const [hours, minutes] = student.schedule.startTime.split(':').map(Number);
    const scheduleDate = new Date();
    scheduleDate.setHours(hours, minutes, 0, 0);
    const diffMinutes = (now.getTime() - scheduleDate.getTime()) / (1000 * 60);
    if (diffMinutes >= -10 && diffMinutes <= 30) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: language === 'ar'
        ? `يبدأ التسجيل قبل الموعد بـ 10 دقائق (${student.schedule.startTime})`
        : `Check-in starts 10 mins before schedule (${student.schedule.startTime})`
    };
  };

  const status = checkInStatus();
  const showAbsentCard = completedSession?.status === SessionStatus.ABSENT;

  return (
    <div className="pb-24 space-y-6">
      <div id="home">
        {/* Header and Welcome */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {t('welcome')}, {student.name.split(' ')[0]}
            </h1>
            <p className="text-slate-500">{t('studentDashboard')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
            <Award size={16} className="me-2" />
            {t('memorizationSetup')}
          </Button>
        </div>

        {/* Hadith Card */}
        {dailyHadith && (
          <div className="mb-8">
            <StudentHadithCard
              hadith={dailyHadith.hadith}
              assignment={dailyHadith.assignment}
              onUpdate={async () => {
                const data = await api.hadith.getTodayHadithForStudent(student.id);
                setDailyHadith(data);
              }}
            />
          </div>
        )}

        {/* Status Card */}
        {completedSession && !showAbsentCard ? (
          <Card className="bg-green-50 border-green-100 mb-8">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award size={32} />
              </div>
              <h3 className="text-xl font-bold text-green-800">{t('sessionCompleted')}</h3>
              <p className="text-green-700">{t('completedMsg')}</p>
              <div className="mt-6 p-4 bg-white rounded-xl border border-green-100 max-w-sm mx-auto">
                <p className="text-sm text-slate-500">{t('sheikhNote')}:</p>
                <p className="text-slate-800 italic">"{completedSession.notes || t('defaultNote')}"</p>
              </div>
            </div>
          </Card>
        ) : showAbsentCard ? (
          <Card className="bg-red-50 border-red-100 mb-8">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserX size={32} />
              </div>
              <h3 className="text-xl font-bold text-red-800">{language === 'ar' ? 'تم تسجيلك غائب' : 'Marked Absent'}</h3>
              <p className="text-red-700">{language === 'ar' ? 'لقد تم تسجيلك غائب لهذه الجلسة' : 'You have been marked absent for this session'}</p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-visible mb-8 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
            <div className="flex flex-col md:flex-row gap-6 pt-2">
              <div className="flex-1 space-y-4">
                {isCheckedIn && activeSession && (
                  <div className="flex items-center gap-2 text-primary-700 font-medium bg-primary-50 w-fit px-3 py-1 rounded-full text-sm mb-2">
                    <Clock size={16} />
                    <span>{t('startedAt')}: {activeSession.scheduledTime}</span>
                  </div>
                )}

                <h3 className="text-3xl font-bold text-slate-800">
                  {isCheckedIn ? (activeSession?.status === SessionStatus.IN_PROGRESS ? t('youAreLive') : t('youAreNext', { pos: waitingBeforeMe + 1 })) : t('checkInToJoin')}
                </h3>

                <p className="text-slate-500">
                  {t('currentSurah')}: <span className="font-semibold text-slate-800">{student.currentSurah}</span>
                </p>

                {!isCheckedIn ? (
                  <div className="space-y-2">
                    <Button
                      size="lg"
                      fullWidth
                      onClick={() => {
                        if (status.allowed) {
                          checkIn(student.id);
                        } else {
                          alert(status.message);
                        }
                      }}
                      className={!status.allowed ? "opacity-75" : ""}
                      disabled={!status.allowed}
                    >
                      <MapPin className="me-2" /> {t('checkIn')}
                    </Button>
                    {!status.allowed && student.schedule?.startTime && (
                      <p className="text-xs text-amber-600 text-center">
                        {status.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-500">{t('currentSession')}:</span>
                      <span className="font-medium text-slate-800">{currentActive?.studentName || t('statusWaiting') + '...'}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 animate-pulse w-full"></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">{t('pleaseWait')}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Main Progress Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Circular Progress */}
          <div className="md:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-primary-300"></div>
            <h3 className="text-slate-500 font-medium mb-4">{t('memorizationProgress')}</h3>

            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="88" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray={2 * Math.PI * 88} strokeDashoffset={2 * Math.PI * 88 * (1 - (student.memorizationPercentage || 0) / 100)} className="text-primary-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-800">{(student.memorizationPercentage || 0).toFixed(1)}%</span>
                <span className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{t('completed')}</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">{t('totalMemorized')}: <span className="font-bold text-slate-800">{student.totalPagesMemorized || 0}</span> / {TOTAL_QURAN_PAGES}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between group hover:border-primary-200 transition-all">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-100 transition-colors"><BookOpen size={24} /></div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{t('current')}</span>
              </div>
              <div>
                <h4 className="text-slate-500 text-sm font-medium mb-1">{t('dailyWerd')}</h4>
                <p className="text-3xl font-bold text-slate-800">{student.dailyWerdPages || 0} <span className="text-sm font-normal text-slate-400">{t('pages')}</span></p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between group hover:border-amber-200 transition-all">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-100 transition-colors"><Flag size={24} /></div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{t('target')}</span>
              </div>
              <div>
                <h4 className="text-slate-500 text-sm font-medium mb-1">{t('startPage')}</h4>
                <p className="text-3xl font-bold text-slate-800">{student.startPage || '-'}</p>
              </div>
            </div>

            <div className="col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={20} className="text-primary-500" />{t('weeklyProgress')}</h3>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockProgressData}>
                    <defs>
                      <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="pages" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPages)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule & History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schedule Card */}
        <div id="schedule">
          <Card className="bg-white border-slate-100 p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock size={20} /></div>
              <h3 className="text-lg font-bold text-slate-800">{t('mySchedule')}</h3>
            </div>
            {student.schedule ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">{t('days')}</span>
                  <div className="flex gap-1">
                    {student.schedule.days.map((day: DayOfWeek) => (
                      <span key={day} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600">{day}</span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">{t('startTime')}</span>
                  <span className="font-bold text-slate-800">{student.schedule.startTime}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">{t('endTime')}</span>
                  <span className="font-bold text-slate-800">{student.schedule.endTime}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Clock size={32} className="mx-auto mb-2 opacity-20" />
                <p>{t('noScheduleToday')}</p>
              </div>
            )}
          </Card>
        </div>

        {/* History Card */}
        <div id="history">
          <Card className="bg-white border-slate-100 p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20} /></div>
              <h3 className="text-lg font-bold text-slate-800">{t('sessionHistory')}</h3>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {history.length > 0 ? (
                history.map((session: Session) => (
                  <div key={session.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium text-slate-400">{new Date(parseInt(session.id.split('-')[1])).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{session.scheduledTime}</span>
                    </div>
                    {session.notes && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 mb-1">{t('notes')}:</p>
                        <p className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-100 italic">"{session.notes}"</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Activity size={32} className="mx-auto mb-2 opacity-20" />
                  <p>{t('noHistory')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <FloatingNavbar
        activeSection={activeSection}
        onNavigate={(section) => {
          setActiveSection(section);
          const el = document.getElementById(section);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      <MemorizationSetupModal
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onSave={() => setShowSetup(false)}
      />
    </div>
  );
};