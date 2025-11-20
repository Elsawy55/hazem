
import React, { useState, useEffect, useMemo } from 'react';
import { Play, CheckCircle, SkipForward, UserX, Calendar, Clock, Users, UserPlus, Search, MessageCircle, Phone, BookOpen, LayoutDashboard, AlertTriangle, Banknote } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SessionStatus, Student, Schedule, UserStatus, DayOfWeek } from '../types';

type TabType = 'live' | 'schedule' | 'students' | 'requests';

export const SheikhDashboard: React.FC = () => {
  const { 
    queue, startSession, completeSession, skipSession, markAbsent, getActiveSession, 
    getAllStudents, approveStudent,
    t, language 
  } = useApp();
  
  const activeSession = getActiveSession();
  const [note, setNote] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('live');
  
  // Data State
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Approval Logic
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Schedule>({ days: ['MON', 'THU'], startTime: '16:00', endTime: '16:20' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    const students = await getAllStudents();
    setAllStudents(students);
  };

  const handleComplete = () => {
    if (activeSession) {
      completeSession(activeSession.id, note);
      setNote('');
    }
  };

  const handleApprove = async () => {
    if (selectedStudent) {
      await approveStudent(selectedStudent.id, scheduleForm);
      setSelectedStudent(null);
      loadData();
    }
  };

  // --- DERIVED DATA ---
  
  const pendingStudents = useMemo(() => allStudents.filter(s => s.status === UserStatus.PENDING), [allStudents]);
  
  // Daily Schedule Logic
  const dayMapping: Record<number, DayOfWeek> = { 6: 'SAT', 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI' };
  const currentDay = dayMapping[new Date().getDay()];
  
  const todaysSchedule = useMemo(() => {
    return allStudents
      .filter(s => s.status === UserStatus.ACTIVE && s.schedule?.days.includes(currentDay))
      .sort((a, b) => (a.schedule?.startTime || '').localeCompare(b.schedule?.startTime || ''));
  }, [allStudents, currentDay]);

  // Filtered Students for Directory
  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => 
      s.status === UserStatus.ACTIVE && 
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phoneNumber.includes(searchTerm))
    );
  }, [allStudents, searchTerm]);

  const iconStyles = language === 'ar' ? "rtl:rotate-180" : "";

  const StatsBar = () => (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 text-primary-600 mb-2">
           <Users size={20} />
           <span className="font-bold">{t('totalStudents')}</span>
        </div>
        <p className="text-2xl font-bold text-slate-800">{allStudents.filter(s => s.status === UserStatus.ACTIVE).length}</p>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 text-amber-500 mb-2">
           <Calendar size={20} />
           <span className="font-bold">{t('sessionsToday')}</span>
        </div>
        <p className="text-2xl font-bold text-slate-800">{todaysSchedule.length}</p>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 text-blue-500 mb-2">
           <UserPlus size={20} />
           <span className="font-bold">{t('requests')}</span>
        </div>
        <p className="text-2xl font-bold text-slate-800">{pendingStudents.length}</p>
      </div>
    </div>
  );

  const Taskbar = () => (
    <div className="sticky top-20 z-30 flex justify-center mb-8 animate-in slide-in-from-top-2">
      <div className="bg-white p-1.5 rounded-full shadow-lg border border-slate-100 inline-flex items-center gap-1">
        {[
          { id: 'live', label: t('liveSessionControl'), icon: <Clock size={18} /> },
          { id: 'schedule', label: t('todaysSchedule'), icon: <Calendar size={18} /> },
          { id: 'students', label: t('myStudents'), icon: <Users size={18} /> },
          { id: 'requests', label: t('requests'), icon: <UserPlus size={18} />, count: pendingStudents.length }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count ? (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center font-bold
                ${activeTab === tab.id ? 'bg-white text-primary-600' : 'bg-red-500 text-white'}
              `}>
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <StatsBar />
      <Taskbar />

      {/* --- TAB CONTENT --- */}

      {/* 1. LIVE SESSION */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="lg:col-span-2 space-y-6">
             {activeSession ? (
            <Card className="border-primary-200 ring-4 ring-primary-50/50">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-6">
                <div className="relative">
                  <img 
                    src={activeSession.studentAvatar} 
                    alt={activeSession.studentName} 
                    className="w-24 h-24 rounded-2xl object-cover shadow-md"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full border-2 border-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    Live
                  </div>
                </div>
                <div className="text-center md:text-start flex-1">
                  <h3 className="text-2xl font-bold text-slate-800">{activeSession.studentName}</h3>
                  <p className="text-slate-500 mb-3">{t('reciting')} {t('currentSurah')}</p>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-400">
                    <Clock size={16} />
                    <span>{t('startedAt')} {activeSession.scheduledTime}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <textarea 
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 outline-none h-24 bg-slate-50"
                  placeholder={t('addNotes')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                   <Button onClick={handleComplete} icon={<CheckCircle size={18} />} className="py-3">{t('finishSession')}</Button>
                   <Button variant="danger" onClick={() => {}} icon={<SkipForward size={18} className={iconStyles} />}>{t('stopEarly')}</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center py-12 border-dashed border-2 border-slate-200 bg-slate-50/50">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
                <Play size={32} className="ms-1 rtl:rotate-180" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">{t('readyToStart')}</h3>
              <p className="text-slate-500 mb-6 text-center max-w-sm">
                {queue.sessions.filter(s => s.status === SessionStatus.READY).length} {t('studentsReady')}
              </p>
              <Button size="lg" onClick={startSession}>{t('startNextSession')}</Button>
            </Card>
          )}
          
           <div>
             <h3 className="font-bold text-slate-700 mb-4">{t('queue')}</h3>
             <div className="space-y-3">
               {queue.sessions.filter(s => s.status === SessionStatus.WAITING || s.status === SessionStatus.READY).length === 0 && (
                  <p className="text-slate-400 text-sm italic">{t('noStudentsQueue')}</p>
               )}
               {queue.sessions.filter(s => s.status === SessionStatus.WAITING || s.status === SessionStatus.READY).map((session) => (
                 <div key={session.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <img src={session.studentAvatar} className="w-12 h-12 rounded-full" />
                       <div>
                         <h4 className="font-bold text-slate-800">{session.studentName}</h4>
                         <Badge status={session.status} />
                       </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button size="sm" variant="secondary" onClick={() => skipSession(session.id)}><SkipForward size={16}/></Button>
                       <Button size="sm" variant="ghost" onClick={() => markAbsent(session.id)}><UserX size={16}/></Button>
                    </div>
                 </div>
               ))}
             </div>
           </div>
          </div>
          
          <div className="space-y-6">
             <h2 className="text-xl font-bold text-slate-800">{t('todaysSchedule')}</h2>
             <Card className="p-0 overflow-hidden">
               <div className="divide-y divide-slate-50">
                 {queue.sessions.map((session) => (
                   <div key={session.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-400 w-10">{session.scheduledTime}</span>
                        <span className="text-sm font-semibold text-slate-800">{session.studentName}</span>
                      </div>
                      <Badge status={session.status} />
                   </div>
                 ))}
                 {queue.sessions.length === 0 && (
                   <div className="p-6 text-center text-slate-400 text-sm">{t('noScheduleToday')}</div>
                 )}
               </div>
             </Card>
          </div>
        </div>
      )}

      {/* 2. DAILY SCHEDULE (NEW) */}
      {activeTab === 'schedule' && (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{t('scheduleFor')} {t(currentDay as any || 'today')}</h2>
            <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">{todaysSchedule.length} Sessions</span>
          </div>

          {todaysSchedule.length === 0 ? (
             <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
                <p className="text-slate-500">{t('noScheduleToday')}</p>
             </div>
          ) : (
            <div className="space-y-4">
              {todaysSchedule.map((student) => (
                <div key={student.id} className="flex gap-4 group">
                   <div className="w-20 pt-4 text-right">
                      <p className="font-bold text-slate-800">{student.schedule?.startTime}</p>
                      <p className="text-xs text-slate-400">{student.schedule?.endTime}</p>
                   </div>
                   <div className="flex-1 bg-white p-4 rounded-xl border border-slate-100 shadow-sm group-hover:shadow-md transition-shadow flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img src={student.avatarUrl} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                           <h3 className="font-bold text-slate-800">{student.name}</h3>
                           <p className="text-xs text-slate-500 flex items-center gap-1">
                             <BookOpen size={12} /> {student.currentSurah}
                           </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Contact Button Sim */}
                         <a 
                           href={`https://wa.me/${student.phoneNumber.replace('+', '')}`} 
                           target="_blank" 
                           rel="noreferrer"
                           className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                         >
                           <MessageCircle size={18} />
                         </a>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. MY STUDENTS DIRECTORY (NEW) */}
      {activeTab === 'students' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
           <div className="flex flex-col sm:flex-row gap-4 justify-between">
             <div className="relative flex-1 max-w-md">
               <Search className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 rtl:left-auto rtl:right-3" size={20} />
               <input 
                 type="text" 
                 placeholder={t('searchStudents')} 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 outline-none"
               />
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredStudents.map(student => (
               <Card key={student.id} className="relative group hover:-translate-y-1 transition-transform duration-300 overflow-visible">
                 <div className="flex items-center gap-4 mb-4">
                   <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                   <div>
                     <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{student.name}</h3>
                     <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                       <Phone size={12} /> {student.phoneNumber}
                     </div>
                   </div>
                 </div>
                 
                 <div className="space-y-4 mb-4">
                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-xl">
                       <div>
                         <p className="text-xs text-slate-500 mb-1">{t('currentJuz')}</p>
                         <p className="font-bold text-slate-800">{student.currentJuz}</p>
                       </div>
                       <div>
                         <p className="text-xs text-slate-500 mb-1">{t('progress')}</p>
                         <p className="font-bold text-primary-600">{student.progress}%</p>
                       </div>
                       <div className={`${student.totalFines > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                         <p className="text-xs opacity-80 mb-1">{t('totalFines')}</p>
                         <p className="font-bold flex items-center justify-center gap-1">
                           {student.totalFines > 0 && <AlertTriangle size={10} />}
                           {student.totalFines}
                         </p>
                       </div>
                    </div>
                    
                    <div className="flex justify-between text-sm px-1">
                       <span className="text-slate-500">{t('scheduleFor')}</span>
                       <span className="font-medium text-slate-800 text-xs">
                         {student.schedule?.days.join(', ')}
                       </span>
                    </div>
                 </div>

                 <div className="flex gap-2 mt-auto pt-4 border-t border-slate-50">
                    <Button fullWidth size="sm" variant="secondary" icon={<MessageCircle size={16} />}>
                        {t('contact')}
                    </Button>
                 </div>
               </Card>
             ))}
             {filteredStudents.length === 0 && (
               <div className="col-span-full text-center py-12 text-slate-400">
                 No students found.
               </div>
             )}
           </div>
        </div>
      )}

      {/* 4. REQUESTS (EXISTING) */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold text-slate-800">{t('newStudents')}</h2>
             <Button variant="secondary" onClick={loadData} icon={<Clock size={16} />}>{t('refreshStatus')}</Button>
           </div>

           {pendingStudents.length === 0 ? (
             <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Users className="mx-auto text-slate-300 mb-3" size={48} />
                <p className="text-slate-500">{t('noPendingStudents')}</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {pendingStudents.map(student => (
                 <Card key={student.id}>
                   <div className="flex items-center gap-4 mb-4">
                     <img src={student.avatarUrl} alt="" className="w-14 h-14 rounded-full bg-slate-100" />
                     <div>
                       <h3 className="font-bold text-lg">{student.name}</h3>
                       <p className="text-sm text-slate-500">{student.phoneNumber}</p>
                       <p className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full w-fit mt-1">{student.currentSurah}</p>
                     </div>
                   </div>
                   <Button fullWidth onClick={() => setSelectedStudent(student)}>{t('approve')}</Button>
                 </Card>
               ))}
             </div>
           )}

           {/* APPROVAL MODAL */}
           {selectedStudent && (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                 <h3 className="text-xl font-bold mb-4">{t('assignSchedule')} for {selectedStudent.name}</h3>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">{t('selectDays')}</label>
                     <div className="flex gap-2 flex-wrap">
                       {['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map(day => (
                         <button 
                           key={day}
                           onClick={() => {
                             const days = scheduleForm.days.includes(day as any) 
                               ? scheduleForm.days.filter(d => d !== day)
                               : [...scheduleForm.days, day];
                             setScheduleForm({...scheduleForm, days: days as any});
                           }}
                           className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${scheduleForm.days.includes(day as any) ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                         >
                           {day}
                         </button>
                       ))}
                     </div>
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{t('selectTime')}</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="time" 
                          value={scheduleForm.startTime}
                          onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                        />
                        <input 
                          type="time" 
                          value={scheduleForm.endTime}
                          onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                   </div>

                   <div className="flex gap-3 mt-6">
                     <Button fullWidth onClick={handleApprove}>{t('confirmApproval')}</Button>
                     <Button fullWidth variant="ghost" onClick={() => setSelectedStudent(null)}>{t('back')}</Button>
                   </div>
                 </div>
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
