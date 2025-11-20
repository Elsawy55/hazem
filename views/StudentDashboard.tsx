
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, MapPin, BookOpen, Award, ChevronRight, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SessionStatus } from '../types';
import { PROGRESS_DATA } from '../constants';

export const StudentDashboard: React.FC = () => {
  const { auth, queue, checkIn, getCurrentStudent, t, language } = useApp();
  const student = getCurrentStudent();
  
  if (!student) return null;

  const mySession = queue.sessions.find(s => s.studentId === student.id);
  const currentActive = queue.sessions.find(s => s.status === SessionStatus.IN_PROGRESS);
  
  // Calculate queue position
  const waitingBeforeMe = queue.sessions.filter(s => 
    (s.status === SessionStatus.WAITING || s.status === SessionStatus.READY) && 
    s.scheduledTime < (mySession?.scheduledTime || '') && 
    s.id !== mySession?.id
  ).length;

  const isCheckedIn = mySession?.status === SessionStatus.READY || mySession?.status === SessionStatus.IN_PROGRESS || mySession?.status === SessionStatus.COMPLETED;
  const chevronStyle = language === 'ar' ? "rotate-180" : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">{t('greeting')}, {student.name.split(' ')[0]}</h2>
           <p className="text-slate-500">{t('readyForSession')}</p>
        </div>
      </div>

      {/* Main Status Card */}
      {mySession?.status === SessionStatus.COMPLETED ? (
         <Card className="bg-green-50 border-green-100">
           <div className="text-center py-6">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Award size={32} />
             </div>
             <h3 className="text-xl font-bold text-green-800">{t('mashaAllah')}</h3>
             <p className="text-green-700">{t('completedMsg')}</p>
             <div className="mt-6 p-4 bg-white rounded-xl border border-green-100 max-w-sm mx-auto">
               <p className="text-sm text-slate-500">{t('sheikhNote')}:</p>
               <p className="text-slate-800 italic">"{mySession.notes || t('defaultNote')}"</p>
             </div>
           </div>
         </Card>
      ) : (
        <Card className="overflow-visible">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
          
          <div className="flex flex-col md:flex-row gap-6 pt-2">
            {/* Status Section */}
            <div className="flex-1 space-y-4">
               <div className="flex items-center gap-2 text-primary-700 font-medium bg-primary-50 w-fit px-3 py-1 rounded-full text-sm mb-2">
                  <Clock size={16} />
                  <span>{t('startedAt')}: {mySession?.scheduledTime}</span>
               </div>
               
               <h3 className="text-3xl font-bold text-slate-800">
                 {isCheckedIn ? (mySession?.status === SessionStatus.IN_PROGRESS ? t('youAreLive') : t('youAreNext', { pos: waitingBeforeMe + 1 })) : t('checkInToJoin')}
               </h3>
               
               <p className="text-slate-500">
                 {t('currentSurah')}: <span className="font-semibold text-slate-800">{student.currentSurah}</span>
               </p>

               {!isCheckedIn ? (
                 <Button size="lg" fullWidth onClick={() => mySession && checkIn(student.id)}>
                    <MapPin className="me-2" /> {t('checkIn')}
                 </Button>
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

      {/* Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title={t('weeklyProgress')}>
          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PROGRESS_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="pages" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={t('memorizationDetails')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shadow-sm text-primary-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t('currentJuz')}</p>
                  <p className="font-bold text-slate-800">{student.currentJuz}</p>
                </div>
              </div>
              <ChevronRight size={20} className={`text-slate-400 ${chevronStyle}`} />
            </div>
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shadow-sm text-amber-500">
                  <Award size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t('totalProgress')}</p>
                  <p className="font-bold text-slate-800">{student.progress}%</p>
                </div>
              </div>
              <div className="w-16 bg-slate-200 rounded-full h-1.5">
                 <div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${student.progress}%`}}></div>
              </div>
            </div>

            {/* FINES DISPLAY */}
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shadow-sm text-red-500">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-sm text-red-500">{t('totalFines')}</p>
                  <p className="font-bold text-red-800">{student.totalFines} {t('egp')}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};