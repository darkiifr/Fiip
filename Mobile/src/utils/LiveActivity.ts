import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

export const startLiveActivity = async (title: string, startTime: number): Promise<string | null> => {
  if (Platform.OS !== "ios" || !LiveActivityModule) return null;
  try {
    const activityId = await LiveActivityModule.startActivity(title, startTime);
    return activityId;
  } catch (error) {
    console.log('Failed to start Live Activity:', error);
    return null;
  }
};

export const updateLiveActivity = async (id: string, timeElapsed: number): Promise<void> => {
  if (Platform.OS !== "ios" || !LiveActivityModule || !id) return;
  try {
    await LiveActivityModule.updateActivity(id, timeElapsed);
  } catch (error) {
    console.log('Failed to update Live Activity:', error);
  }
};

export const endLiveActivity = async (id: string): Promise<void> => {
  if (Platform.OS !== "ios" || !LiveActivityModule || !id) return;
  try {
    await LiveActivityModule.endActivity(id);
  } catch (error) {
    console.log('Failed to end Live Activity:', error);
  }
};

export const updateWidgetData = async (title: string, content: string, count: number): Promise<void> => {
  if (Platform.OS !== "ios" || !LiveActivityModule) return;
  try {
    await LiveActivityModule.updateWidgetData(title, content, count);
  } catch (error) {
    console.log('Failed to update Widget Data:', error);
  }
};
