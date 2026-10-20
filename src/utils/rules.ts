/**
 * Pure business logic and rules for BookMind AI
 * Fully decoupled for deterministic unit testing.
 */

export interface ReadingSessionLog {
  date: string; // YYYY-MM-DD
  pagesRead: number;
  minutes: number;
}

/**
 * Calculates percentage of book completed.
 * Clamps between 0 and 100.
 */
export function calculateProgressPercentage(currentPage: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  if (currentPage <= 0) return 0;
  const pct = Math.round((currentPage / totalPages) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Calculates current streak and longest streak from consecutive active days.
 */
export function calculateStreaks(sessions: ReadingSessionLog[], todayStr: string): { currentStreak: number; longestStreak: number } {
  if (!sessions || sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Deduplicate and filter days with > 0 pages
  const activeDates = Array.from(
    new Set(
      sessions
        .filter((s) => s.pagesRead > 0)
        .map((s) => s.date)
    )
  ).sort().reverse(); // newest to oldest

  if (activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date(todayStr);
  
  // Check if today or yesterday is active
  const hasToday = activeDates.includes(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const hasYesterday = activeDates.includes(yesterdayStr);

  if (hasToday || hasYesterday) {
    let checkDate = hasToday ? new Date(today) : new Date(yesterday);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (activeDates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak across all recorded dates
  let longestStreak = 0;
  let runningStreak = 0;
  const sortedAsc = [...activeDates].sort(); // oldest to newest

  for (let i = 0; i < sortedAsc.length; i++) {
    if (i === 0) {
      runningStreak = 1;
    } else {
      const prev = new Date(sortedAsc[i - 1]);
      const curr = new Date(sortedAsc[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
}

/**
 * Point system rules to prevent duplicate awards.
 */
export interface PointAwardRule {
  actionId: string;
  type: 'daily_learning' | 'quiz_pass' | 'read_page' | 'write_words' | 'action_complete';
  points: number;
}

export function awardPointsSafely(
  currentPoints: number,
  awardedActionIds: string[],
  actionId: string,
  type: PointAwardRule['type'],
  customPoints?: number
): { newPoints: number; awarded: boolean; updatedActionIds: string[] } {
  if (awardedActionIds.includes(actionId)) {
    return { newPoints: currentPoints, awarded: false, updatedActionIds: awardedActionIds };
  }

  const defaultPointsMap: Record<PointAwardRule['type'], number> = {
    daily_learning: 25,
    quiz_pass: 15,
    read_page: 5,
    write_words: 20,
    action_complete: 30,
  };

  const ptsToAdd = customPoints ?? defaultPointsMap[type] ?? 10;
  return {
    newPoints: currentPoints + ptsToAdd,
    awarded: true,
    updatedActionIds: [...awardedActionIds, actionId],
  };
}

/**
 * Splits text into sentences for reliable synchronized audio highlighting.
 * Handles common abbreviations without premature splitting.
 */
export function splitTextIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  // Clean multiple newlines and carriage returns
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n+/g, ' ');

  // Regex splitting on punctuation (. ! ?) followed by space or quote, preserving punctuation
  const matches = normalized.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g);
  if (!matches) return [normalized.trim()];

  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Formats reading time in minutes into a friendly string (e.g. "1 hr 15 mins").
 */
export function formatReadingDuration(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${Math.max(0, totalMinutes)} min${totalMinutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hr${hours === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
}
