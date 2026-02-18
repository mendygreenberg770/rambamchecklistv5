
export interface RambamDay {
  id: string; // Format: MonthID-DayNumber
  hebrewDay: string;
  subject: string;
  chapters: string;
  isSpecial?: boolean;
  hideLabel?: boolean;
}

export interface RambamMonth {
  id: string;
  name: string;
  year: string;
  days: RambamDay[];
}

export interface DayProgress {
  completed: boolean;
  chapterProgress: boolean[]; // Array of booleans for sub-tasks
  notes: string;
}

export type ProgressState = Record<string, DayProgress>;

export type StudyMode = '3-chapters' | '1-chapter';
