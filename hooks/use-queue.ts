'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore, QueueItem } from '@/lib/store';

export function useQueue() {
  const { state, updateState } = useStore();
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase not configured. Falling back to local state simulation.');
      return;
    }

    // 1. Initial Fetch (Optional in a pure realtime setup, but good for hydration)
    const fetchInitialData = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('token_id', { ascending: true });
      
      if (data && !error) {
        updateState({ queue: data as QueueItem[] });
      }
    };
    fetchInitialData();

    // 2. Realtime Subscription
    if (!supabase) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('Realtime Update Received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            updateState({
              queue: state.queue.map((item) => {
                if (item.token_id === (payload.new as QueueItem).token_id) {
                  return payload.new as QueueItem;
                }
                return item;
              })
            });
          } else if (payload.eventType === 'INSERT') {
            const newItem = payload.new as QueueItem;
            const exists = state.queue.some((item) => item.token_id === newItem.token_id);
            if (!exists) {
              updateState({
                queue: [...state.queue, newItem]
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldTokenId = (payload.old as { token_id?: number })?.token_id;
            if (oldTokenId !== undefined) {
              updateState({
                queue: state.queue.filter((item) => item.token_id !== oldTokenId)
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [state.queue, updateState]);

  // Expose methods that abstract whether we are using Supabase or Local Fallback
  const markAsCompleted = async (tokenId: number) => {
    if (supabase) {
      await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('token_id', tokenId);
    } else {
      // Local Fallback Logic
      const queue = [...state.queue];
      const index = queue.findIndex(q => q.token_id === tokenId);
      if (index !== -1) {
        queue[index] = { ...queue[index], status: 'completed' };
        updateState({ queue });
      }
    }
  };

  const markAsInProgress = async (tokenId: number) => {
    if (supabase) {
      await supabase
        .from('appointments')
        .update({ status: 'in-progress' })
        .eq('token_id', tokenId);
    } else {
      // Local Fallback Logic
      const queue = [...state.queue];
      const index = queue.findIndex(q => q.token_id === tokenId);
      if (index !== -1) {
        queue[index] = { ...queue[index], status: 'in-progress' };
        updateState({ queue });
      }
    }
  };

  const addWalkIn = async (newQueueItem: QueueItem) => {
    if (supabase) {
      await supabase
        .from('appointments')
        .insert([newQueueItem]);
    } else {
      updateState({ queue: [...state.queue, newQueueItem] });
    }
  };

  const addOnlineBooking = async (newQueueItem: QueueItem) => {
    if (supabase) {
      await supabase
        .from('appointments')
        .insert([newQueueItem]);
    } else {
      updateState({ queue: [...state.queue, newQueueItem] });
    }
  };

  return {
    queue: state.queue,
    isSupabaseConnected,
    markAsCompleted,
    markAsInProgress,
    addWalkIn,
    addOnlineBooking,
  };
}
