'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoutineItem, Exercise } from '../domain/types';
import { useAppStore } from '../domain/store';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';

interface WheelStackProps {
  items: RoutineItem[];
  exercises: Record<string, Exercise>;
  currentIndex: number;
  onReorder?: (items: RoutineItem[]) => void;
  onDelete?: (id: string) => void;
}

export const WheelStack: React.FC<WheelStackProps> = ({
  items,
  exercises,
  currentIndex,
  onReorder,
  onDelete,
}) => {
  const mode = useAppStore((state) => state.mode);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  if (mode === 'compose') {
    return (
      <div className="flex flex-col gap-4 w-full max-w-md px-4 pb-20 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item, index) => (
              <SortableItem 
                key={item.id} 
                item={item} 
                exercise={exercises[item.exerciseId]} 
                isCurrent={index === currentIndex}
                onDelete={() => onDelete?.(item.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-500 font-medium hover:border-gray-600 hover:text-gray-400 transition-colors">
          <Plus size={20} />
          Add Exercise
        </button>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const nextItem = items[currentIndex + 1];

  return (
    <div className="relative w-full h-96 flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="popLayout">
        {currentItem && (
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="absolute flex flex-col items-center text-center px-4"
          >
            <div className="flex items-center gap-2 mb-2">
               <div className={`w-2 h-2 rounded-full ${getPhaseBg(currentItem.phase)}`} />
               <span className="text-indigo-400 font-bold tracking-widest uppercase text-xs">
                 {currentItem.phase}
               </span>
            </div>
            <h2 className="text-4xl font-black text-white mb-1 uppercase tracking-tight">
              {exercises[currentItem.exerciseId]?.name}
            </h2>
            <p className="text-gray-400 font-medium mb-6">Set 2 of {currentItem.scheme.sets}</p>
            
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-6xl font-black text-white">
                {currentItem.defaultLoad?.value || '--'}
              </span>
              <span className="text-2xl font-bold text-gray-500 uppercase">
                {currentItem.defaultLoad?.unit || ''}
              </span>
              <span className="text-4xl font-light text-gray-600 mx-2">×</span>
              <span className="text-6xl font-black text-white">
                {currentItem.scheme.targetReps || currentItem.scheme.targetSeconds}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {nextItem && (
        <motion.div
          key={`next-${nextItem.id}`}
          initial={{ opacity: 0, y: 200 }}
          animate={{ opacity: 0.3, y: 180 }}
          className="absolute flex flex-col items-center text-center"
        >
          <div className="flex items-center gap-2 mb-1">
             <div className={`w-1 h-1 rounded-full ${getPhaseBg(nextItem.phase)}`} />
             <span className="text-gray-500 font-bold tracking-widest uppercase text-[10px]">
               {exercises[nextItem.exerciseId]?.name}
             </span>
          </div>
          <p className="text-lg font-bold text-gray-400">
            {nextItem.scheme.sets} × {nextItem.scheme.targetReps || nextItem.scheme.targetSeconds}
          </p>
        </motion.div>
      )}
    </div>
  );
};

interface SortableItemProps {
  item: RoutineItem;
  exercise?: Exercise;
  isCurrent: boolean;
  onDelete: () => void;
}

function SortableItem({ item, exercise, isCurrent, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-between group ${
        isCurrent ? 'ring-1 ring-indigo-500/50' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-1 h-10 rounded-full ${getPhaseBg(item.phase)}`} />
        <div>
          <h3 className="font-bold text-lg text-white">
            {exercise?.name || 'Unknown Exercise'}
          </h3>
          <p className="text-sm text-gray-400">
            {item.scheme.sets} sets • {item.scheme.targetReps || item.scheme.targetSeconds} {item.scheme.type === 'reps' ? 'reps' : 's'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onDelete}
          className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={18} />
        </button>
        <div {...attributes} {...listeners} className="p-2 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400">
          <GripVertical size={20} />
        </div>
      </div>
    </div>
  );
}

function getPhaseBg(phase: string) {
  switch (phase) {
    case 'warmup': return 'bg-amber-600';
    case 'main': return 'bg-indigo-600';
    case 'cooldown': return 'bg-green-600';
    default: return 'bg-gray-600';
  }
}
