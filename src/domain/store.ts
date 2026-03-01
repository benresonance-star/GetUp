import { create } from 'zustand';

interface AppState {
  mode: 'flow' | 'compose';
  setMode: (mode: 'flow' | 'compose') => void;
  currentTemplateId: string | null;
  setCurrentTemplateId: (id: string | null) => void;
  isRunning: boolean;
  setIsRunning: (isRunning: boolean) => void;
  startTime: number | null;
  setStartTime: (time: number | null) => void;
  pausedDuration: number;
  setPausedDuration: (duration: number) => void;
  lastPauseTime: number | null;
  setLastPauseTime: (time: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'flow',
  setMode: (mode) => set({ mode }),
  currentTemplateId: null,
  setCurrentTemplateId: (id) => set({ currentTemplateId: id }),
  isRunning: false,
  setIsRunning: (isRunning) => set({ isRunning }),
  startTime: null,
  setStartTime: (startTime) => set({ startTime }),
  pausedDuration: 0,
  setPausedDuration: (pausedDuration) => set({ pausedDuration }),
  lastPauseTime: null,
  setLastPauseTime: (lastPauseTime) => set({ lastPauseTime }),
}));
