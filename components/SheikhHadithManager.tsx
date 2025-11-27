import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SheikhHadithSettings, DayOfWeek, Hadith } from '../types';
import { Settings, BarChart2, Save, RefreshCw, Users } from 'lucide-react';

export const SheikhHadithManager: React.FC = () => {
    const [settings, setSettings] = useState<SheikhHadithSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const s = await api.hadith.getSettings();
            setSettings(s);

            // Load today's stats
            const today = new Date().toISOString().split('T')[0];
            const st = await api.hadith.getHadithStats(today);
            setStats(st);
        } catch (error) {
            console.error("Error loading hadith data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await api.hadith.updateSettings(settings);
            // Trigger assignment manually if enabled and today is active
            if (settings.isEnabled) {
                await api.hadith.assignDailyHadithForAllStudents();
            }
            alert('تم حفظ الإعدادات بنجاح');
        } catch (error) {
            console.error("Error saving settings:", error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const toggleDay = (day: DayOfWeek) => {
        if (!settings) return;
        const newDays = settings.activeDays.includes(day)
            ? settings.activeDays.filter(d => d !== day)
            : [...settings.activeDays, day];
        setSettings({ ...settings, activeDays: newDays });
    };

    if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
    if (!settings) return <div className="p-8 text-center text-red-500">فشل تحميل الإعدادات</div>;

    const days: { key: DayOfWeek; label: string }[] = [
        { key: 'SAT', label: 'السبت' },
        { key: 'SUN', label: 'الأحد' },
        { key: 'MON', label: 'الإثنين' },
        { key: 'TUE', label: 'الثلاثاء' },
        { key: 'WED', label: 'الأربعاء' },
        { key: 'THU', label: 'الخميس' },
        { key: 'FRI', label: 'الجمعة' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 flex">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'settings' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Settings size={18} />
                    الإعدادات
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'stats' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <BarChart2 size={18} />
                    الإحصائيات والمتابعة
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'settings' ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <h3 className="font-bold text-gray-800">تفعيل ورد الأحاديث</h3>
                                <p className="text-sm text-gray-500">إرسال أحاديث يومية للطلاب تلقائياً</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.isEnabled}
                                    onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">أيام الإرسال</label>
                            <div className="flex flex-wrap gap-2">
                                {days.map((day) => (
                                    <button
                                        key={day.key}
                                        onClick={() => toggleDay(day.key)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${settings.activeDays.includes(day.key)
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">البدء من الحديث رقم</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="42"
                                    value={settings.startFromHadithId}
                                    onChange={(e) => setSettings({ ...settings, startFromHadithId: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">نظام التوزيع</label>
                                <select
                                    value={settings.distributionMode}
                                    onChange={(e) => setSettings({ ...settings, distributionMode: e.target.value as 'sequential' | 'loop' })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                >
                                    <option value="sequential">تسلسلي (يتوقف عند النهاية)</option>
                                    <option value="loop">دائري (يعيد من الأول)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving}
                                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                حفظ الإعدادات
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {stats && stats.hadith ? (
                            <>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <h4 className="font-bold text-emerald-800 mb-1">حديث اليوم: {stats.hadith.title}</h4>
                                    <p className="text-sm text-emerald-600 line-clamp-1">{stats.hadith.text}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-bold text-blue-700">{stats.totalAssigned}</div>
                                        <div className="text-xs text-blue-600 font-medium">تم التعيين</div>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-bold text-orange-700">{stats.seenCount}</div>
                                        <div className="text-xs text-orange-600 font-medium">تمت المشاهدة</div>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-bold text-green-700">{stats.doneCount}</div>
                                        <div className="text-xs text-green-600 font-medium">تم الحفظ</div>
                                    </div>
                                </div>

                                <div className="border rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-right">
                                        <thead className="bg-gray-50 text-gray-500 font-medium">
                                            <tr>
                                                <th className="p-3">الطالب</th>
                                                <th className="p-3">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {stats.students.map((s: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="p-3 font-medium text-gray-800">{s.name}</td>
                                                    <td className="p-3">
                                                        {s.status === 'MARKED_DONE' && <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs">تم الحفظ</span>}
                                                        {s.status === 'SEEN' && <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs">شاهد الحديث</span>}
                                                        {s.status === 'ASSIGNED' && <span className="text-gray-500 bg-gray-50 px-2 py-1 rounded text-xs">لم يشاهد</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <Users size={48} className="mx-auto mb-3 opacity-20" />
                                <p>لا يوجد حديث معين لهذا اليوم</p>
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        await api.hadith.assignDailyHadithForAllStudents();
                                        loadData();
                                    }}
                                    className="mt-4 text-emerald-600 text-sm hover:underline"
                                >
                                    تعيين حديث الآن (يدوي)
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
