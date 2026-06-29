import { Task, Habit, AppPreferences } from "./types";

// Helper to get relative ISO date-times
export function getRelativeTimeISO(hoursFromNow: number): string {
  const d = new Date();
  d.setMilliseconds(0);
  d.setSeconds(0);
  d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000);
  return d.toISOString();
}

export function getCurrentDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export const INITIAL_PREFERRED_STATE: AppPreferences = {
  username: "Elite Human",
  peakFocusTime: "morning",
  dailyFocusHoursTarget: 4,
  antiProcrastinationEnabled: true
};

export const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Submit client proposal",
    priority: "critical",
    deadlineTime: getRelativeTimeISO(2), // 2 hours from now
    duration: 60,
    energy: "high",
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-2",
    title: "Prepare interview presentation",
    priority: "high",
    deadlineTime: getRelativeTimeISO(4), // 4 hours from now
    duration: 90,
    energy: "high",
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-3",
    title: "Review pull requests",
    priority: "medium",
    deadlineTime: getRelativeTimeISO(6), // 6 hours from now
    duration: 30,
    energy: "medium",
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-4",
    title: "Pay electricity bill",
    priority: "high",
    deadlineTime: getRelativeTimeISO(24), // 24 hours (tomorrow)
    duration: 10,
    energy: "low",
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-5",
    title: "Update portfolio website",
    priority: "low",
    deadlineTime: getRelativeTimeISO(72), // 3 days (72 hours)
    duration: 120,
    energy: "medium",
    completed: false,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_HABITS: Habit[] = [
  {
    id: "habit-1",
    name: "Morning review",
    streak: 6, // 7th day at risk
    completedDays: [], // not done today
    category: "routine"
  },
  {
    id: "habit-2",
    name: "Deep work block",
    streak: 3, // streak
    completedDays: [], // not done today
    category: "work"
  },
  {
    id: "habit-3",
    name: "End of day wrap-up",
    streak: 4,
    completedDays: [getCurrentDateString()], // already completed today!
    category: "routine"
  }
];

export interface UrgencyDetail {
  score: number;
  hoursRemaining: number;
  label: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  color: string;
}

export function computeUrgencyScore(task: Task, referenceTime: string = new Date().toISOString()): UrgencyDetail {
  if (task.completed) {
    return { score: 0, hoursRemaining: 0, label: 'LOW', color: 'text-zinc-400 bg-zinc-100 dark:bg-zinc-800' };
  }

  const priorityWeights = { critical: 4, high: 3, medium: 2, low: 1 };
  const pWeight = priorityWeights[task.priority] || 1;

  const diffMs = new Date(task.deadlineTime).getTime() - new Date(referenceTime).getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  // Avoid divide-by-zero or excessively large values
  const clampedHours = Math.max(0.1, hoursRemaining);
  const timePressure = 1 / clampedHours;
  
  const score = Number((pWeight * timePressure).toFixed(2));

  // Determine a text label & color scheme
  let label: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let color = 'text-green-600 bg-green-50 border-green-200';

  if (score >= 3.0 || clampedHours < 3) {
    label = 'CRITICAL';
    color = 'text-rose-600 bg-rose-50 border-rose-200 animate-pulse';
  } else if (score >= 1.5) {
    label = 'HIGH';
    color = 'text-amber-600 bg-amber-50 border-amber-200';
  } else if (score >= 0.6) {
    label = 'MEDIUM';
    color = 'text-blue-600 bg-blue-50 border-blue-200';
  }

  return { score, hoursRemaining, label, color };
}
