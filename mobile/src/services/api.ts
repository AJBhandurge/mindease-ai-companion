import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 60000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  selectCompanion: (user_id: number, companion_id: string) =>
    api.post('/auth/companion/select', null, { params: { user_id, companion_id } }),
  listCompanions: () =>
    api.get('/auth/companions'),
};

export const chatAPI = {
  startSession: (user_id: number) =>
    api.post('/session/start', null, { params: { user_id } }),
  sendMessage: (message: string, session_id: number, user_id: number, voice_output = false) =>
    api.post('/chat', { message, session_id, user_id, voice_output }),
  sendVoice: (audioUri: string) => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      return fetch(audioUri)
        .then((response) => {
          if (!response.ok) throw new Error('Could not read the recorded audio.');
          return response.blob();
        })
        .then((audioBlob) => {
          const extension = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
          form.append('audio', audioBlob, `voice.${extension}`);
          return api.post('/voice', form);
        });
    }

    form.append('audio', { uri: audioUri, type: 'audio/wav', name: 'voice.wav' } as any);
    return api.post('/voice', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const analyticsAPI = {
  getDashboard: (user_id: number) =>
    api.get('/analytics/dashboard', { params: { user_id } }),
  getMoodHistory: (user_id: number, days = 7) =>
    api.get('/analytics/mood', { params: { user_id, days } }),
};

export const wellnessAPI = {
  createJournal: (user_id: number, content: string, emotion?: string) =>
    api.post('/wellness/journal', { user_id, content, emotion }),
  getJournals: (user_id: number) =>
    api.get(`/wellness/journal/${user_id}`),
  getHabits: (user_id: number) =>
    api.get(`/wellness/habits/${user_id}`),
  createHabit: (user_id: number, name: string) =>
    api.post('/wellness/habits', { user_id, name }),
  logHabit: (user_id: number, habit_id: number, completed: boolean) =>
    api.post('/wellness/habits/log', { user_id, habit_id, completed }),
  getGoals: (user_id: number) =>
    api.get(`/wellness/goals/${user_id}`),
  createGoal: (user_id: number, title: string, description?: string) =>
    api.post('/wellness/goals', { user_id, title, description }),
};

export default api;
