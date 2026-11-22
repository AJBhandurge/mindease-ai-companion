import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  userId: number | null;
  username: string | null;
  sessionId: number | null;
  token: string | null;
  companionId: string;
  voiceEnabled: boolean;
  currentEmotion: string;

  setAuth: (userId: number, username: string, token: string, companionId?: string) => void;
  setSession: (sessionId: number) => void;
  setCompanion: (companionId: string) => void;
  setEmotion: (emotion: string) => void;
  toggleVoice: () => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  userId: null,
  username: null,
  sessionId: null,
  token: null,
  companionId: 'maya',
  voiceEnabled: true,
  currentEmotion: 'neutral',

  setAuth: async (userId, username, token, companionId = 'maya') => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('userId', String(userId));
    await AsyncStorage.setItem('username', username);
    await AsyncStorage.setItem('companionId', companionId);
    set({ userId, username, token, companionId });
  },
  setSession: (sessionId) => set({ sessionId }),
  setCompanion: async (companionId) => {
    await AsyncStorage.setItem('companionId', companionId);
    set({ companionId });
  },
  setEmotion: (emotion) => set({ currentEmotion: emotion }),
  toggleVoice: () => set((s) => ({ voiceEnabled: !s.voiceEnabled })),
  logout: async () => {
    await AsyncStorage.clear();
    set({ userId: null, username: null, token: null, sessionId: null });
  },
}));
