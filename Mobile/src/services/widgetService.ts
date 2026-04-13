import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { Platform } from 'react-native';

const APP_GROUP_ID_IOS = 'group.com.fiip.widget'; // Use your actual App Group ID matching Xcode
const WIDGET_DATA_KEY = 'widgetData';

export interface UserStats {
  totalNotes: number;
  totalFavorites: number;
  streakDays: number;
  lastActive: string;
}

/**
 * Updates the shared preferences so that iOS WidgetKit or Android AppWidget
 * can read the latest user stats (notes count, streaks, etc.) without waking up the main app.
 */
export const updateWidgetStats = async (stats: UserStats) => {
  try {
    if (Platform.OS === 'ios') {
      await SharedGroupPreferences.setItem(WIDGET_DATA_KEY, stats, APP_GROUP_ID_IOS);
    } else {
      // Android: Save to a shared preference file that your AppWidgetProvider reads
      await SharedGroupPreferences.setItem(WIDGET_DATA_KEY, stats, 'fiipWidgetPrefs');
    }
    console.log('Successfully updated widget stats:', stats);
  } catch (error) {
    console.error('Widget Update Error:', error);
  }
};

/**
 * Example of fetching data from Supabase/Local to refresh the widget.
 * Call this during App initialization or after significant data changes.
 */
export const syncStatsToWidget = async (notes: any[]) => {
  const favoritesCount = notes.filter((n) => n.is_favorite).length;
  
  const stats: UserStats = {
    totalNotes: notes.length,
    totalFavorites: favoritesCount,
    streakDays: 3, // Mock logic - this would come from the database logic
    lastActive: new Date().toISOString(),
  };

  await updateWidgetStats(stats);
};
