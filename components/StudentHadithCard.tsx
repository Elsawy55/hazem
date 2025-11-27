import React, { useState } from 'react';
import { Hadith, StudentDailyHadith } from '../types';
import { BookOpen, CheckCircle, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { api } from '../services/api';

interface StudentHadithCardProps {
    hadith: Hadith;
    assignment: StudentDailyHadith;
    onUpdate: () => void;
}

export const StudentHadithCard: React.FC<StudentHadithCardProps> = ({ hadith, assignment, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleMarkDone = async () => {
        setLoading(true);
        try {
            await api.hadith.markHadithAsDone(assignment.id);
            onUpdate();
        } catch (error) {
            console.error("Error marking hadith as done:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExpand = async () => {
        setExpanded(!expanded);
        if (!expanded && assignment.status === 'ASSIGNED') {
            try {
                await api.hadith.markHadithAsSeen(assignment.id);
                onUpdate(); // Update status to SEEN
            } catch (error) {
                console.error("Error marking hadith as seen:", error);
            }
        }
    };

    const isDone = assignment.status === 'MARKED_DONE';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-6">
            <div
                className="p-4 flex items-center justify-between cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                onClick={handleExpand}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">حديث اليوم</h3>
                        <p className="text-sm text-gray-500">من الأربعين النووية</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isDone && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <CheckCircle size={12} />
                            تم الحفظ
                        </span>
                    )}
                    {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="p-4 border-t border-emerald-100">
                    <div className="mb-4">
                        <h4 className="font-bold text-lg text-emerald-800 mb-2">{hadith.title}</h4>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 leading-loose text-gray-700 text-right font-serif text-lg">
                            {hadith.text}
                        </div>
                        <p className="mt-2 text-sm text-gray-500 font-medium">{hadith.reference}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <button className="text-gray-400 hover:text-emerald-600 transition-colors p-2 rounded-full hover:bg-emerald-50">
                            <Share2 size={20} />
                        </button>

                        {!isDone ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkDone();
                                }}
                                disabled={loading}
                                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? 'جاري الحفظ...' : 'أتممت الحفظ'}
                                <CheckCircle size={18} />
                            </button>
                        ) : (
                            <div className="text-green-600 font-medium flex items-center gap-2">
                                <CheckCircle size={20} />
                                تم حفظ الحديث
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
