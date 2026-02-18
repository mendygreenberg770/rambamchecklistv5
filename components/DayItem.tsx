
import React, { useState, useMemo } from 'react';
import { RambamDay, DayProgress } from '../types';

interface DayItemProps {
  day: RambamDay;
  dayProgress: DayProgress;
  onToggleDay: (id: string) => void;
  onUpdateChapter: (id: string, index: number, val: boolean) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  isToday?: boolean;
  isPerekEchad?: boolean;
}

const HEB_NUMERALS: Record<number, string> = {
  1: 'א׳', 2: 'ב׳', 3: 'ג׳', 4: 'ד׳', 5: 'ה׳', 6: 'ו׳', 7: 'ז׳', 8: 'ח׳', 9: 'ט׳', 10: 'י׳',
  11: 'י״א', 12: 'י״ב', 13: 'י״ג', 14: 'י״ד', 15: 'ט״ו', 16: 'ט״ז', 17: 'י״ז', 18: 'י״ח', 19: 'י״ט', 20: 'כ׳',
  21: 'כ״א', 22: 'כ״ב', 23: 'כ״ג', 24: 'כ״ד', 25: 'כ״ה', 26: 'כ״ו', 27: 'כ״ז', 28: 'כ״ח', 29: 'כ״ט', 30: 'ל׳'
};

const DayItem: React.FC<DayItemProps> = ({ 
  day, 
  dayProgress, 
  onToggleDay, 
  onUpdateChapter, 
  onUpdateNotes,
  isToday,
  isPerekEchad
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isChecked = dayProgress.completed;

  const chapterLabels = useMemo(() => {
    if (day.hideLabel) {
      return [day.chapters.length > 25 ? day.chapters.substring(0, 22) + '...' : day.chapters];
    }

    const segments = day.chapters.split('/').map(s => s.trim());
    const labels: string[] = [];

    const getHebrewIndex = (heb: string) => {
      const clean = heb.replace(/[^א-ת]/g, '').trim();
      for (const [idx, val] of Object.entries(HEB_NUMERALS)) {
        if (val.replace(/[^א-ת]/g, '').trim() === clean) return parseInt(idx);
      }
      return -1;
    };

    segments.forEach(seg => {
      const rangeMatch = seg.match(/^([א-ת]+)-([א-ת]+)$/);
      if (rangeMatch) {
        const start = rangeMatch[1];
        const end = rangeMatch[2];
        const startIndex = getHebrewIndex(start);
        const endIndex = getHebrewIndex(end);
        
        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            labels.push(`פרק ${HEB_NUMERALS[i]}`);
          }
        } else {
          labels.push(seg);
        }
      } else {
         // Single chapter or specific text part
         labels.push(seg.length > 30 ? seg.substring(0, 27) + '...' : seg);
      }
    });

    return labels.length > 0 ? labels : ['שיעור א'];
  }, [day.chapters, day.hideLabel]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNotes(day.id, e.target.value);
  };

  return (
    <div className={`transition-all ${isChecked ? 'bg-indigo-50/30' : 'bg-white'}`}>
      {/* Main Row */}
      <div 
        className="flex items-center p-4 cursor-pointer hover:bg-slate-50 transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div 
          onClick={(e) => { e.stopPropagation(); onToggleDay(day.id); }}
          className="ml-4 flex-shrink-0"
        >
          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isChecked 
              ? 'bg-indigo-600 border-indigo-600 shadow-sm' 
              : 'border-slate-300 group-hover:border-indigo-400'
          }`}>
            {isChecked && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        
        <div className="flex-grow flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <span className="font-bold text-lg text-slate-700 min-w-[2.5rem]">{day.hebrewDay}</span>
            <span className={`text-slate-900 font-medium ${isChecked ? 'line-through text-slate-400' : ''}`}>
              {day.subject}
            </span>
          </div>
          
          <div className="flex items-center gap-3 self-end md:self-auto">
            <span className={`px-2 py-1 rounded text-[10px] font-bold shadow-sm transition-colors text-right max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap ${
              isChecked ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-700'
            }`}>
              {day.hideLabel ? '' : (isPerekEchad ? 'פרק ' : 'פרקים: ')}{day.chapters}
            </span>
            
            <button 
              className={`p-1 rounded-full transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'text-slate-300 hover:text-indigo-400'}`}
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Per-Chapter Progress */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">התקדמות בלימוד</p>
              <div className="flex flex-col gap-2">
                {chapterLabels.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => onUpdateChapter(day.id, idx, !dayProgress.chapterProgress[idx])}
                    className={`flex items-center justify-start gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all text-right ${
                      dayProgress.chapterProgress[idx]
                        ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${dayProgress.chapterProgress[idx] ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                      {dayProgress.chapterProgress[idx] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הערות ותובנות</p>
                {dayProgress.notes && <span className="text-[10px] text-green-500 font-bold">✓ נשמר</span>}
              </div>
              <textarea
                value={dayProgress.notes}
                onChange={handleNotesChange}
                placeholder="הוסף הערה על הלימוד היום..."
                className="w-full h-24 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none bg-white shadow-inner placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>
      )}
      
      {isToday && (
        <div className="bg-amber-100/50 px-4 py-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider text-center">
          שיעור היום
        </div>
      )}
    </div>
  );
};

export default DayItem;
