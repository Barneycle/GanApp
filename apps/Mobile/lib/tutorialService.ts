import AsyncStorage from '@react-native-async-storage/async-storage';

const getTutorialStorageKey = (userId?: string) => {
  if (userId) {
    return `tutorial_completed_screens_${userId}`;
  }
  return 'tutorial_completed_screens';
};

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // Optional: element to highlight
}

export interface ScreenTutorial {
  screenId: string;
  steps: TutorialStep[];
}

/**
 * Check if tutorial has been completed for a screen
 */
export const isTutorialCompleted = async (screenId: string, userId?: string): Promise<boolean> => {
  try {
    const storageKey = getTutorialStorageKey(userId);
    const stored = await AsyncStorage.getItem(storageKey);
    if (!stored) return false;
    
    const completedScreens = JSON.parse(stored) as string[];
    return completedScreens.includes(screenId);
  } catch (error) {
    console.error('Error checking tutorial status:', error);
    return false;
  }
};

/**
 * Mark tutorial as completed for a screen
 */
export const markTutorialCompleted = async (screenId: string, userId?: string): Promise<void> => {
  try {
    const storageKey = getTutorialStorageKey(userId);
    const stored = await AsyncStorage.getItem(storageKey);
    const completedScreens = stored ? JSON.parse(stored) as string[] : [];
    
    if (!completedScreens.includes(screenId)) {
      completedScreens.push(screenId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(completedScreens));
    }
  } catch (error) {
    console.error('Error marking tutorial as completed:', error);
  }
};

/**
 * Reset all tutorials (for testing/debugging)
 */
export const resetAllTutorials = async (userId?: string): Promise<void> => {
  try {
    const storageKey = getTutorialStorageKey(userId);
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error resetting tutorials:', error);
  }
};

