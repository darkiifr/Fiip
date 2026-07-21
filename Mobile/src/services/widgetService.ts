import { NativeModules, Platform } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

const APP_GROUP_ID_IOS = 'group.com.fiip.widget';
const ANDROID_WIDGET_PREFS = 'fiipWidgetPrefs';
const WIDGET_DATA_KEY = 'widgetData';

type WidgetNote = {
  title?: string;
  content?: string;
  is_favorite?: boolean;
  is_locked?: boolean;
  updated_at?: string;
  deleted_at?: string | null;
  attachments?: unknown[];
};

export interface UserStats {
  totalNotes: number;
  totalFavorites: number;
  lockedNotes: number;
  attachmentNotes: number;
  streakDays: number;
  lastActive: string;
  recentNoteTitle: string;
  recentNoteContent: string;
  recentNoteUpdatedAt: string;
}

const { FiipWidgetModule, LiveActivityModule } = NativeModules;

function sanitizeText(value: unknown, fallback: string, maxLength: number) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function computeStreakDays(notes: WidgetNote[]) {
  const days = new Set(
    notes
      .map((note) => note.updated_at)
      .filter(Boolean)
      .map((value) => new Date(String(value)))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.toISOString().slice(0, 10)),
  );

  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function buildWidgetStats(notes: WidgetNote[]): UserStats {
  const activeNotes = notes
    .filter((note) => !note.deleted_at)
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
  const recentNote = activeNotes[0];

  return {
    totalNotes: activeNotes.length,
    totalFavorites: activeNotes.filter((note) => note.is_favorite).length,
    lockedNotes: activeNotes.filter((note) => note.is_locked).length,
    attachmentNotes: activeNotes.filter((note) => Array.isArray(note.attachments) && note.attachments.length > 0).length,
    streakDays: computeStreakDays(activeNotes),
    lastActive: new Date().toISOString(),
    recentNoteTitle: sanitizeText(recentNote?.title, 'Aucune note recente', 80),
    recentNoteContent: sanitizeText(recentNote?.content, 'Creez une note dans Fiip pour remplir ce widget.', 180),
    recentNoteUpdatedAt: recentNote?.updated_at || '',
  };
}

export const updateWidgetStats = async (stats: UserStats) => {
  try {
    if (Platform.OS === 'ios') {
      await SharedGroupPreferences.setItem(WIDGET_DATA_KEY, stats, APP_GROUP_ID_IOS);
      await LiveActivityModule?.updateWidgetData?.(
        stats.recentNoteTitle,
        stats.recentNoteContent,
        stats.totalNotes,
      );
      return;
    }

    if (Platform.OS === 'android') {
      await SharedGroupPreferences.setItem(WIDGET_DATA_KEY, stats, ANDROID_WIDGET_PREFS, {
        useAndroidSharedPreferences: true,
      });
      await FiipWidgetModule?.refresh?.();
    }
  } catch (error) {
    console.error('Widget Update Error:', error);
  }
};

export const syncStatsToWidget = async (notes: WidgetNote[]) => {
  await updateWidgetStats(buildWidgetStats(notes));
};

export const __private__ = {
  buildWidgetStats,
  computeStreakDays,
};
