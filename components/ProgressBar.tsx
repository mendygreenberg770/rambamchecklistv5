import React from 'react';
import { StudyMode } from '../types';

interface ProgressBarProps {
  total: number;
  completed: number;
  studyMode: StudyMode;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ total, completed, studyMode }) => {
  const percentage = Math.round((completed / total) * 100) || 0;
  const cycle = studyMode === '3-chapters' ? '46' : '16';
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-600">
          התקדמות במסלול (Cycle {cycle})
        </span>
        <span className="text-sm font-bold text-indigo-600">{percentage}% ({completed}/{total})</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
        <div 
          className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;