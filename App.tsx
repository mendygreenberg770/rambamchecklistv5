
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SCHEDULE_3_CH, SCHEDULE_1_CH } from './constants';
import { ProgressState, DayProgress, RambamDay, StudyMode } from './types';
import ProgressBar from './components/ProgressBar';
import DayItem from './components/DayItem';

const MONTH_MAP: Record<string, string> = {
  'Shevat': 'shevat',
  'Adar': 'adar',
  'Adar I': 'adar-i', 
  'Adar II': 'adar-ii',
  'Nisan': 'nisan',
  'Iyyar': 'iyar',
  'Sivan': 'sivan',
  'Tamuz': 'tammuz',
  'Tammuz': 'tammuz',
  'Av': 'av',
  'Elul': 'elul',
  'Tishrei': 'tishrei',
  'Cheshvan': 'heshvan',
  'Heshvan': 'heshvan',
  'Kislev': 'kislev',
  'Tevet': 'tevet'
};

const DISPLAY_MONTH_MAP: Record<string, string> = {
  'Shevat': 'שבט',
  'Adar': 'אדר',
  'Adar I': 'אדר א׳',
  'Adar II': 'אדר ב׳',
  'Nisan': 'ניסן',
  'Iyyar': 'אייר',
  'Sivan': 'סיון',
  'Tamuz': 'תמוז',
  'Tammuz': 'תמוז',
  'Av': 'אב',
  'Elul': 'אלול',
  'Tishrei': 'תשרי',
  'Cheshvan': 'חשון',
  'Heshvan': 'חשון',
  'Kislev': 'כסלו',
  'Tevet': 'טבת'
};

const HEB_NUMERALS: Record<number, string> = {
  1: 'א׳', 2: 'ב׳', 3: 'ג׳', 4: 'ד׳', 5: 'ה׳', 6: 'ו׳', 7: 'ז׳', 8: 'ח׳', 9: 'ט׳', 10: 'י׳',
  11: 'י״א', 12: 'י״ב', 13: 'י״ג', 14: 'י״ד', 15: 'ט״ו', 16: 'ט״ז', 17: 'י״ז', 18: 'י״ח', 19: 'י״ט', 20: 'כ׳',
  21: 'כ״א', 22: 'כ״ב', 23: 'כ״ג', 24: 'כ״ד', 25: 'כ״ה', 26: 'כ״ו', 27: 'כ״ז', 28: 'כ״ח', 29: 'כ״ט', 30: 'ל׳'
};

const YEAR_MAP: Record<number, string> = {
  5785: "ה'תשפ\"ה",
  5786: "ה'תשפ\"ו",
  5787: "ה'תשפ\"ז",
  5788: "ה'תשפ\"ח"
};

function toHebrewDayNumeral(n: number): string {
  return HEB_NUMERALS[n] || n.toString();
}

function formatHebrewYear(hyear: number, rawYearStr: string): string {
  if (YEAR_MAP[hyear]) return YEAR_MAP[hyear];
  let clean = rawYearStr.replace(/[״""'׳]/g, '').trim();
  if (clean.length === 4 && !rawYearStr.includes("ה'")) {
    return `ה'${rawYearStr}`;
  }
  return rawYearStr;
}

function getHebrewIndex(heb: string) {
  const clean = heb.replace(/[׳״'"]/g, '').trim();
  for (const [idx, val] of Object.entries(HEB_NUMERALS)) {
    if (val.replace(/[׳״'"]/g, '').trim() === clean) return parseInt(idx);
  }
  return -1;
}

function getDayChapterCount(day: RambamDay): number {
  if (day.hideLabel) return 1;
  const segments = day.chapters.split('/').map(s => s.trim());
  let count = 0;
  segments.forEach(seg => {
    const rangeMatch = seg.match(/^([א-ת]+)-([א-ת]+)$/);
    if (rangeMatch) {
      const startIdx = getHebrewIndex(rangeMatch[1]);
      const endIdx = getHebrewIndex(rangeMatch[2]);
      if (startIdx !== -1 && endIdx !== -1) {
        count += (endIdx - startIdx + 1);
      } else {
        count += 1;
      }
    } else {
      count += 1;
    }
  });
  return count || 1;
}

interface UserAccount {
  name: string;
  syncId: string;
  lastSync: string;
}

function App() {
  const [studyMode, setStudyMode] = useState<StudyMode>(() => {
    const saved = localStorage.getItem('rambam_study_mode_v3');
    return (saved as StudyMode) || '3-chapters';
  });

  const scheduleData = studyMode === '3-chapters' ? SCHEDULE_3_CH : SCHEDULE_1_CH;

  const [progress, setProgress] = useState<ProgressState>(() => {
    const storageKey = `rambam_progress_v3_${studyMode}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch (e) {
      return {};
    }
  });
  
  const [currentHebrewDate, setCurrentHebrewDate] = useState<string | null>(null);
  const [todayId, setTodayId] = useState<string | null>(null);
  const [activeMonthId, setActiveMonthId] = useState<string>(() => scheduleData[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  // Account State
  const [account, setAccount] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('rambam_account');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  // Save study mode
  useEffect(() => {
    localStorage.setItem('rambam_study_mode_v3', studyMode);
    const storageKey = `rambam_progress_v3_${studyMode}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        setProgress({});
      }
    } else {
      setProgress({});
    }
    if (!scheduleData.some(m => m.id === activeMonthId)) {
       setActiveMonthId(scheduleData[0].id);
    }
  }, [studyMode]);
  
  useEffect(() => {
    async function getHebDate() {
      let hMonth: string | null = null;
      let hDay: number | null = null;
      let hYearNum: number | null = null;
      let hYearStr: string | null = null;

      try {
        const res = await fetch('https://www.hebcal.com/etc/hdate.json?cfg=json');
        if (res.ok) {
          const data = await res.json();
          hMonth = data.hmonth;
          hDay = data.hday;
          hYearNum = data.hyear;
          const parts = data.hebrew.split(' ');
          hYearStr = parts[parts.length - 1];
        } else {
          throw new Error('API response not OK');
        }
      } catch (err) {
        try {
          const now = new Date();
          const monthFormatter = new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long' });
          hMonth = monthFormatter.format(now);
          const dayFormatter = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric' });
          hDay = parseInt(dayFormatter.format(now), 10);
          const yearFormatter = new Intl.DateTimeFormat('he-u-ca-hebrew', { year: 'numeric' });
          hYearStr = yearFormatter.format(now);
          const hYearNumFormatter = new Intl.DateTimeFormat('en-u-ca-hebrew', { year: 'numeric' });
          hYearNum = parseInt(hYearNumFormatter.format(now).replace(/,/g, ''), 10);
        } catch (fallbackErr) {}
      }

      if (hMonth && hDay) {
        const dayHeb = toHebrewDayNumeral(hDay);
        const monthHeb = DISPLAY_MONTH_MAP[hMonth] || hMonth;
        const yearHeb = formatHebrewYear(hYearNum || 0, hYearStr || '');
        setCurrentHebrewDate(`${dayHeb} ${monthHeb} ${yearHeb}`);

        const monthKeyPart = MONTH_MAP[hMonth];
        if (monthKeyPart) {
          const dayId = `${monthKeyPart}-${hYearNum}-${hDay}`;
          const monthId = `${monthKeyPart}-${hYearNum}`;
          const monthObj = scheduleData.find(m => m.id === monthId || m.days.some(d => d.id === dayId));
          if (monthObj) {
            setTodayId(dayId);
            setActiveMonthId(monthObj.id);
          }
        }
      }
    }
    getHebDate();
  }, [studyMode, scheduleData]);

  useEffect(() => {
    const storageKey = `rambam_progress_v3_${studyMode}`;
    localStorage.setItem(storageKey, JSON.stringify(progress));
  }, [progress, studyMode]);

  useEffect(() => {
    if (account) {
      localStorage.setItem('rambam_account', JSON.stringify(account));
    }
  }, [account]);

  const toggleDay = (id: string) => {
    const day = scheduleData.flatMap(m => m.days).find(d => d.id === id);
    if (!day) return;
    const count = getDayChapterCount(day);

    setProgress(prev => {
      const current = prev[id] || { completed: false, chapterProgress: new Array(count).fill(false), notes: '' };
      const newStatus = !current.completed;
      return {
        ...prev,
        [id]: {
          ...current,
          completed: newStatus,
          chapterProgress: new Array(count).fill(newStatus)
        }
      };
    });
  };

  const updateChapter = (id: string, chapterIndex: number, val: boolean) => {
    const day = scheduleData.flatMap(m => m.days).find(d => d.id === id);
    if (!day) return;
    const count = getDayChapterCount(day);

    setProgress(prev => {
      const current = prev[id] || { completed: false, chapterProgress: new Array(count).fill(false), notes: '' };
      const newChapterProgress = [...current.chapterProgress];
      while(newChapterProgress.length < count) newChapterProgress.push(false);
      
      newChapterProgress[chapterIndex] = val;
      const allDone = newChapterProgress.slice(0, count).every(v => v);
      
      return {
        ...prev,
        [id]: {
          ...current,
          chapterProgress: newChapterProgress,
          completed: allDone
        }
      };
    });
  };

  const updateNotes = (id: string, notes: string) => {
    setProgress(prev => {
      const current = prev[id] || { completed: false, chapterProgress: [], notes: '' };
      return {
        ...prev,
        [id]: { ...current, notes }
      };
    });
  };

  const jumpToToday = () => {
    if (todayId) {
      const monthObj = scheduleData.find(m => m.days.some(d => d.id === todayId));
      if (monthObj) {
        setActiveMonthId(monthObj.id);
        setTimeout(() => {
          const el = document.getElementById(`day-${todayId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  };

  const createAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const syncId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setAccount({
      name: newUserName,
      syncId,
      lastSync: new Date().toLocaleString('he-IL')
    });
    setNewUserName('');
  };

  const syncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setAccount(prev => prev ? ({ ...prev, lastSync: new Date().toLocaleString('he-IL') }) : null);
    }, 1500);
  };

  const exportProgress = () => {
    const data = {
      account,
      progress3: localStorage.getItem('rambam_progress_v3_3-chapters'),
      progress1: localStorage.getItem('rambam_progress_v3_1-chapter')
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rambam_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.account) setAccount(data.account);
        if (data.progress3) localStorage.setItem('rambam_progress_v3_3-chapters', data.progress3);
        if (data.progress1) localStorage.setItem('rambam_progress_v3_1-chapter', data.progress1);
        window.location.reload();
      } catch (err) {
        alert('קובץ לא תקין');
      }
    };
    reader.readAsText(file);
  };

  const totalDays = useMemo(() => {
    return scheduleData.reduce((acc, month) => acc + month.days.length, 0);
  }, [scheduleData]);

  const completedCount = useMemo(() => {
    return (Object.values(progress) as DayProgress[]).filter(d => d.completed).length;
  }, [progress]);

  const activeMonth = useMemo(() => {
    return scheduleData.find(m => m.id === activeMonthId) || scheduleData[0];
  }, [activeMonthId, scheduleData]);

  const filteredDays = useMemo(() => {
    if (!activeMonth) return [];
    if (!searchQuery) return activeMonth.days;
    return activeMonth.days.filter(d => 
      d.subject.includes(searchQuery) || 
      d.chapters.includes(searchQuery) || 
      d.hebrewDay.includes(searchQuery)
    );
  }, [activeMonth, searchQuery]);

  return (
    <div className="min-h-screen pb-20 max-w-4xl mx-auto px-4 md:px-0">
      <header className="py-8 text-center bg-white shadow-sm mb-6 rounded-b-3xl relative overflow-hidden">
        <div className="absolute top-4 left-4 z-20">
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all shadow-sm group"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
              {account ? account.name.charAt(0) : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            </div>
            <span className="text-sm font-bold hidden sm:inline">{account ? account.name : 'חשבון'}</span>
          </button>
        </div>

        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-50 rounded-full -ml-12 -mb-12 opacity-50"></div>
        
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 mb-2 relative z-10">מורה שיעור</h1>
        <p className="text-lg text-slate-500 font-medium relative z-10">לוח לימוד ספר משנה תורה להרמב"ם - {studyMode === '3-chapters' ? 'מחזור מ"ו' : 'מחזור ט"ז'}</p>
        
        <div className="mt-6 flex justify-center relative z-10">
          <div className="bg-slate-100 p-1 rounded-xl inline-flex shadow-inner border border-slate-200">
            <button
              onClick={() => setStudyMode('3-chapters')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                studyMode === '3-chapters'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              שלשה פרקים ליום
            </button>
            <button
              onClick={() => setStudyMode('1-chapter')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                studyMode === '1-chapter'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              פרק אחד ליום
            </button>
          </div>
        </div>

        {currentHebrewDate && (
          <div className="mt-6 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border border-indigo-100">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            היום: {currentHebrewDate}
          </div>
        )}
      </header>

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">חשבון וסנכרון</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6">
              {!account ? (
                <form onSubmit={createAccount} className="space-y-4">
                  <p className="text-slate-500 text-sm">הגדר שם משתמש כדי להתחיל לשמור את ההתקדמות שלך בענן.</p>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">שם משתמש</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="הכנס שם..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                    צור פרופיל
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-inner">
                      {account.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{account.name}</h4>
                      <p className="text-xs text-indigo-500 font-mono">מזהה סנכרון: {account.syncId}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={syncNow}
                      disabled={isSyncing}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:bg-indigo-300 transition-all"
                    >
                      {isSyncing ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      )}
                      {isSyncing ? 'מסנכרן...' : 'סנכרן כעת'}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-medium">סנכרון אחרון: {account.lastSync}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <button onClick={exportProgress} className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all group">
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="text-xs font-bold text-slate-600">ייצא קובץ</span>
                    </button>
                    <label className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all group cursor-pointer">
                      <input type="file" className="hidden" accept=".json" onChange={importProgress} />
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      <span className="text-xs font-bold text-slate-600">ייבא קובץ</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-md p-6 mb-8 border border-slate-100">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <ProgressBar total={totalDays} completed={completedCount} studyMode={studyMode} />
          <div className="flex justify-around text-center border-t md:border-t-0 md:border-r border-slate-100 pt-6 md:pt-0">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">סה"כ ימים</p>
              <p className="text-2xl font-bold text-slate-800">{totalDays}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">הושלמו</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">נותרו</p>
              <p className="text-2xl font-bold text-indigo-600">{totalDays - completedCount}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-4">
        <div className="flex flex-col gap-4">
          <nav className="flex overflow-x-auto gap-2 no-scrollbar px-1">
            {todayId && (
              <button
                onClick={jumpToToday}
                className="flex-shrink-0 px-6 py-1.5 rounded-full font-bold transition-all bg-amber-100 text-amber-900 border-2 border-amber-200 hover:bg-amber-200 ml-2 shadow-sm"
              >
                היום
              </button>
            )}
            {scheduleData.map(month => (
              <button
                key={month.id}
                onClick={() => setActiveMonthId(month.id)}
                className={`flex-shrink-0 px-5 py-2 rounded-full font-bold transition-all shadow-sm border ${
                  activeMonthId === month.id 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {month.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800">{activeMonth ? activeMonth.name : ''} {activeMonth ? activeMonth.year : ''}</h2>
            <span className="text-slate-400 bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
              {activeMonth ? activeMonth.days.length : 0} ימי לימוד
            </span>
          </div>
          
          <div className="relative w-full md:w-64">
            <input 
              type="text"
              placeholder="חפש נושא..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredDays.length > 0 ? (
            filteredDays.map(day => (
              <div 
                key={day.id} 
                id={`day-${day.id}`} 
                className={day.id === todayId ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/10' : ''}
              >
                <DayItem 
                  day={day} 
                  dayProgress={progress[day.id] || { completed: false, chapterProgress: [], notes: '' }} 
                  onToggleDay={toggleDay}
                  onUpdateChapter={updateChapter}
                  onUpdateNotes={updateNotes}
                  isToday={day.id === todayId}
                  isPerekEchad={studyMode === '1-chapter'}
                />
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-400 font-medium">
              לא נמצאו ימי לימוד
            </div>
          )}
        </div>
      </main>

      <footer className="mt-8 text-center text-slate-400 text-xs px-4">
        <p>מבוסס על "מורה שיעור" • הוצאת ספרים קה"ת • לימוד יומי</p>
      </footer>
    </div>
  );
}

export default App;
