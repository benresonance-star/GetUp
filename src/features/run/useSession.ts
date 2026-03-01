'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../domain/store';
import { db, seedDatabase } from '../storage/db';
import { SessionTemplate, Exercise, RoutineItem } from '../domain/types';
import { useLiveQuery } from 'dexie-react-hooks';

export function useSession() {
  const {
    isRunning,
    setIsRunning,
    startTime,
    setStartTime,
    pausedDuration,
    setPausedDuration,
    lastPauseTime,
    setLastPauseTime,
    currentTemplateId,
    setCurrentTemplateId,
  } = useAppStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const template = useLiveQuery(
    () => (currentTemplateId ? db.templates.get(currentTemplateId) : undefined),
    [currentTemplateId]
  );

  const exercises = useLiveQuery(async () => {
    const all = await db.exercises.toArray();
    return all.reduce((acc, ex) => ({ ...acc, [ex.id]: ex }), {} as Record<string, Exercise>);
  }, []);

  useEffect(() => {
    seedDatabase();
    // Default to first template if none selected
    if (!currentTemplateId) {
      db.templates.limit(1).toArray().then(templates => {
        if (templates.length > 0) setCurrentTemplateId(templates[0].id);
      });
    }
  }, [currentTemplateId, setCurrentTemplateId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime - pausedDuration) / 1000);
        setElapsedSeconds(Math.max(0, elapsed));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime, pausedDuration]);

  const startSession = useCallback(() => {
    if (!startTime) {
      setStartTime(Date.now());
    } else if (lastPauseTime) {
      const pauseDuration = Date.now() - lastPauseTime;
      setPausedDuration(pausedDuration + pauseDuration);
      setLastPauseTime(null);
    }
    setIsRunning(true);
  }, [startTime, lastPauseTime, pausedDuration, setStartTime, setPausedDuration, setLastPauseTime, setIsRunning]);

  const pauseSession = useCallback(() => {
    setLastPauseTime(Date.now());
    setIsRunning(false);
  }, [setLastPauseTime, setIsRunning]);

  const completeSet = useCallback(() => {
    if (template && currentIndex < template.items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsRunning(false);
      // Logic for finishing session
    }
  }, [template, currentIndex, setIsRunning]);

  const updateTemplateItems = useCallback(async (newItems: RoutineItem[]) => {
    if (currentTemplateId) {
      await db.templates.update(currentTemplateId, { items: newItems, updatedAt: Date.now() });
    }
  }, [currentTemplateId]);

  const deleteItem = useCallback(async (itemId: string) => {
    if (template && currentTemplateId) {
      const newItems = template.items.filter(i => i.id !== itemId);
      await db.templates.update(currentTemplateId, { items: newItems, updatedAt: Date.now() });
    }
  }, [template, currentTemplateId]);

  return {
    template,
    exercises: exercises || {},
    elapsedSeconds,
    currentIndex,
    startSession,
    pauseSession,
    completeSet,
    updateTemplateItems,
    deleteItem,
    isRunning,
  };
}
