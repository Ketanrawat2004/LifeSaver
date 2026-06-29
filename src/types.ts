export interface Task {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadlineTime: string; // ISO date string or date part
  duration: number; // in minutes
  energy: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  completedDays: string[]; // List of YYYY-MM-DD strings
  category: 'work' | 'health' | 'mind' | 'routine';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ScheduleSlot {
  startTime: string;
  endTime: string;
  taskId: string | null;
  taskTitle: string;
  type: 'task' | 'break' | 'buffer';
  energyRequired: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}

export interface AutoScheduleResponse {
  slots: ScheduleSlot[];
  warnings: string[];
  coachingInsights: string;
}

export interface AppPreferences {
  username: string;
  peakFocusTime: 'morning' | 'afternoon' | 'evening';
  dailyFocusHoursTarget: number;
  antiProcrastinationEnabled: boolean;
}
