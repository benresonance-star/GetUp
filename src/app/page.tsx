'use client';

import React from 'react';
import { TimerRing } from '@/ui/TimerRing';
import { WheelStack } from '@/ui/WheelStack';
import { useSession } from '@/features/run/useSession';
import { useAppStore } from '@/domain/store';
import { Play, Pause, Square, Check, ArrowRight } from 'lucide-react';

export default function Home() {
  const {
    template,
    exercises,
    elapsedSeconds,
    currentIndex,
    startSession,
    pauseSession,
    completeSet,
    updateTemplateItems,
    deleteItem,
    isRunning,
  } = useSession();

  const { mode, setMode } = useAppStore();

  if (!template) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-between p-6 overflow-hidden">
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight uppercase">{template.name}</h1>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-widest">
            {template.totalMinutes} MIN • {template.items.length} EXERCISES
          </span>
        </div>
        <button 
          onClick={() => setMode(mode === 'flow' ? 'compose' : 'flow')}
          className="px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
        >
          {mode === 'flow' ? 'Edit' : 'Done'}
        </button>
      </header>

      {/* Timer Ring Section */}
      <section className="flex-shrink-0 my-4">
        <TimerRing
          totalMinutes={template.totalMinutes}
          elapsedSeconds={elapsedSeconds}
          phases={template.phases}
          size={280}
        />
      </section>

      {/* Wheel Stack Section */}
      <section className="flex-grow w-full flex items-center justify-center overflow-hidden">
        <WheelStack
          items={template.items}
          exercises={exercises}
          currentIndex={currentIndex}
          onReorder={updateTemplateItems}
          onDelete={deleteItem}
        />
      </section>

      {/* Controls Section */}
      <footer className="w-full max-w-md flex flex-col gap-4 mt-4">
        {mode === 'flow' ? (
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={isRunning ? pauseSession : startSession}
              className={`flex items-center justify-center h-16 rounded-2xl ${
                isRunning ? 'bg-gray-800 text-amber-500' : 'bg-indigo-600 text-white'
              } transition-colors`}
            >
              {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </button>
            <button
              onClick={completeSet}
              className="col-span-2 flex items-center justify-center h-16 rounded-2xl bg-white text-black font-black text-xl uppercase tracking-tight active:scale-95 transition-transform"
            >
              Complete
              <Check size={24} className="ml-2" strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setMode('flow')}
            className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black text-xl uppercase tracking-tight active:scale-95 transition-transform"
          >
            Save Routine
          </button>
        )}
      </footer>
    </main>
  );
}
