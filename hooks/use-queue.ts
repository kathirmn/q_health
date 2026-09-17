'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore, QueueItem } from '@/lib/store';

// Module-level schema capability cache
let cachedSupportedColumns: Set<string> | null = null;
// Initially avoid columns that may not exist in user's base schema
const permanentlyUnsupported = new Set<string>(['doctor_id', 'doctor_name']);

// Helper to normalize Supabase row to QueueItem
export function normalizeAppointment(raw: any): QueueItem {
  const tokenId = Number(raw.token_number ?? raw.token_id ?? 0);
  const isWalkIn = raw.is_walk_in !== undefined ? Boolean(raw.is_walk_in) : (raw.type === 'walk-in');
  return {
    id: raw.id,
    token_id: tokenId,
    token_number: tokenId,
    patient_name: raw.patient_name || 'Patient',
    type: isWalkIn ? 'walk-in' : 'online',
    is_walk_in: isWalkIn,
    status: (raw.status as 'waiting' | 'in-progress' | 'completed') || 'waiting',
    clinic_id: raw.clinic_id || undefined,
    doctor_id: raw.doctor_id || undefined,
    doctor_name: raw.doctor_name || undefined,
  };
}

// Resilient insertion helper that gracefully avoids and handles missing columns
async function insertAppointmentWithFallback(client: any, item: QueueItem): Promise<{ data: any[] | null; error: any }> {
  // Determine token column name
  const tokenCol = (cachedSupportedColumns?.has('token_number') && !cachedSupportedColumns?.has('token_id'))
    ? 'token_number'
    : 'token_id';

  // Determine type column name
  const useIsWalkIn = Boolean(cachedSupportedColumns?.has('is_walk_in') && !cachedSupportedColumns?.has('type'));

  const payload: Record<string, any> = {
    patient_name: item.patient_name,
    status: item.status || 'waiting',
  };

  payload[tokenCol] = item.token_id;

  if (useIsWalkIn) {
    payload['is_walk_in'] = Boolean(item.type === 'walk-in' || item.is_walk_in);
  } else {
    payload['type'] = (item.type === 'walk-in' || item.is_walk_in) ? 'walk-in' : 'online';
  }

  if (item.clinic_id && !permanentlyUnsupported.has('clinic_id')) {
    payload['clinic_id'] = item.clinic_id;
  }

  // Only pass doctor_id / doctor_name if explicitly detected in the remote schema cache
  if (cachedSupportedColumns?.has('doctor_id') && item.doctor_id && !permanentlyUnsupported.has('doctor_id')) {
    payload['doctor_id'] = item.doctor_id;
  }
  if (cachedSupportedColumns?.has('doctor_name') && item.doctor_name && !permanentlyUnsupported.has('doctor_name')) {
    payload['doctor_name'] = item.doctor_name;
  }

  let attemptPayload = { ...payload };

  // Attempt insert with up to 3 automatic schema-fallback retries
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await client.from('appointments').insert([attemptPayload]).select();
    if (!error) {
      return { data, error: null };
    }

    // Check for PGRST204 missing column error
    if (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('Could not find')) {
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      const missingCol = match ? match[1] : null;

      if (missingCol) {
        console.warn(`[Supabase sync] Column '${missingCol}' not found in database. Adapting schema and retrying...`);
        permanentlyUnsupported.add(missingCol);
        if (cachedSupportedColumns) {
          cachedSupportedColumns.delete(missingCol);
        }

        delete attemptPayload[missingCol];

        if (missingCol === 'token_id') {
          attemptPayload['token_number'] = item.token_id;
        } else if (missingCol === 'token_number') {
          attemptPayload['token_id'] = item.token_id;
        } else if (missingCol === 'type') {
          attemptPayload['is_walk_in'] = Boolean(item.type === 'walk-in' || item.is_walk_in);
        } else if (missingCol === 'is_walk_in') {
          attemptPayload['type'] = (item.type === 'walk-in' || item.is_walk_in) ? 'walk-in' : 'online';
        }
        continue;
      }
    }

    console.error('Error inserting appointment into Supabase:', error);
    return { data: null, error };
  }

  return { data: null, error: new Error('Insert failed after schema retries') };
}

// Resilient status update helper
async function updateAppointmentStatus(client: any, item: QueueItem, newStatus: 'waiting' | 'in-progress' | 'completed') {
  try {
    if (item.id) {
      await client.from('appointments').update({ status: newStatus }).eq('id', String(item.id));
    } else {
      const tokenCol = (cachedSupportedColumns?.has('token_number') && !cachedSupportedColumns?.has('token_id'))
        ? 'token_number'
        : 'token_id';
      const { error } = await client.from('appointments').update({ status: newStatus }).eq(tokenCol, item.token_id);
      if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
        const altCol = tokenCol === 'token_id' ? 'token_number' : 'token_id';
        await client.from('appointments').update({ status: newStatus }).eq(altCol, item.token_id);
      }
    }
  } catch (err) {
    console.error('Failed to update appointment status in Supabase:', err);
  }
}

// Resilient token update helper for queue push-back swapping
async function updateAppointmentToken(client: any, appointmentId: string | number | undefined, oldToken: number, newToken: number) {
  const tokenCol = (cachedSupportedColumns?.has('token_number') && !cachedSupportedColumns?.has('token_id'))
    ? 'token_number'
    : 'token_id';

  try {
    if (appointmentId) {
      const { error } = await client.from('appointments').update({ [tokenCol]: newToken }).eq('id', String(appointmentId));
      if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
        const altCol = tokenCol === 'token_id' ? 'token_number' : 'token_id';
        await client.from('appointments').update({ [altCol]: newToken }).eq('id', String(appointmentId));
      }
    } else {
      const { error } = await client.from('appointments').update({ [tokenCol]: newToken }).eq(tokenCol, oldToken);
      if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
        const altCol = tokenCol === 'token_id' ? 'token_number' : 'token_id';
        await client.from('appointments').update({ [altCol]: newToken }).eq(altCol, oldToken);
      }
    }
  } catch (err) {
    console.error('Failed updating appointment token in Supabase:', err);
  }
}

export function useQueue() {
  const { state, setState, updateState } = useStore();
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(!!supabase);

  // 1. Fetch initial appointments from Supabase once on mount
  useEffect(() => {
    const client = supabase;
    if (!client) {
      console.warn('Supabase not configured. Using local state simulation.');
      return;
    }

    let isMounted = true;

    const fetchAppointments = async () => {
      try {
        const { data, error } = await client
          .from('appointments')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading appointments from Supabase:', error);
          return;
        }

        if (data && isMounted) {
          if (data.length > 0) {
            const cols = new Set<string>(Object.keys(data[0]));
            cachedSupportedColumns = cols;
            // If the database actually has doctor_id, we can safely allow it
            if (cols.has('doctor_id')) {
              permanentlyUnsupported.delete('doctor_id');
            }
            if (cols.has('doctor_name')) {
              permanentlyUnsupported.delete('doctor_name');
            }

            const normalized = data.map(normalizeAppointment);
            setState(prev => ({
              ...prev,
              queue: normalized,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch initial appointments:', err);
      }
    };

    fetchAppointments();

    // 2. Realtime Subscription to appointments table
    const channel = client
      .channel('realtime-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('⚡ Supabase Realtime Event:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            const newItem = normalizeAppointment(payload.new);
            setState(prev => {
              const alreadyExists = prev.queue.some(
                item => (newItem.id && item.id === newItem.id) || 
                        (item.token_id === newItem.token_id && item.clinic_id === newItem.clinic_id)
              );
              if (alreadyExists) return prev;
              const nextQueue = [...prev.queue, newItem].sort((a, b) => a.token_id - b.token_id);
              return { ...prev, queue: nextQueue };
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = normalizeAppointment(payload.new);
            setState(prev => {
              const nextQueue = prev.queue.map(item => {
                const isMatch = (updatedItem.id && item.id === updatedItem.id) ||
                                (item.token_id === updatedItem.token_id && item.clinic_id === updatedItem.clinic_id);
                return isMatch ? { ...item, ...updatedItem } : item;
              });

              // Also check if current active token changed
              const active = nextQueue.find(q => q.status === 'in-progress');
              return {
                ...prev,
                queue: nextQueue,
                appState: {
                  ...prev.appState,
                  current_token_in_cabin: active ? active.token_id : null,
                }
              };
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            const deletedToken = (payload.old as any)?.token_number ?? (payload.old as any)?.token_id;
            setState(prev => ({
              ...prev,
              queue: prev.queue.filter(item => {
                if (deletedId) return item.id !== deletedId;
                return item.token_id !== deletedToken;
              })
            }));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSupabaseConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsSupabaseConnected(false);
        }
      });

    return () => {
      isMounted = false;
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [setState]);

  // Atomic Call Next Patient
  const callNextPatient = useCallback(async (clinicId?: string, doctorId?: string) => {
    let currentActive: QueueItem | undefined;
    let nextPatient: QueueItem | undefined;

    // 1. Optimistic Local State Transition
    setState(prev => {
      // Find current in-progress for this clinic (and doctor if selected)
      currentActive = prev.queue.find(q => 
        q.status === 'in-progress' && 
        (!clinicId || q.clinic_id === clinicId) &&
        (!doctorId || q.doctor_id === doctorId)
      );

      // Find next waiting in line (lowest token_id first)
      const waitingList = prev.queue
        .filter(q => 
          q.status === 'waiting' && 
          (!clinicId || q.clinic_id === clinicId) &&
          (!doctorId || q.doctor_id === doctorId)
        )
        .sort((a, b) => a.token_id - b.token_id);

      nextPatient = waitingList[0];

      if (!currentActive && !nextPatient) {
        return prev;
      }

      const updatedQueue = prev.queue.map(item => {
        // Mark previous active as completed
        if (currentActive && ((item.id && item.id === currentActive.id) || item.token_id === currentActive.token_id)) {
          return { ...item, status: 'completed' as const };
        }
        // Mark next waiting as in-progress
        if (nextPatient && ((item.id && item.id === nextPatient.id) || item.token_id === nextPatient.token_id)) {
          return { ...item, status: 'in-progress' as const };
        }
        return item;
      });

      const nextTokenNum = nextPatient ? nextPatient.token_id : null;
      const remainingWaiting = waitingList.length - (nextPatient ? 1 : 0);

      return {
        ...prev,
        queue: updatedQueue,
        appState: {
          ...prev.appState,
          current_token_in_cabin: nextTokenNum,
          total_patients_waiting: Math.max(0, remainingWaiting),
          doctor_status: 'active',
        }
      };
    });

    // 2. Persist to Supabase in Background
    const client = supabase;
    if (client) {
      try {
        if (currentActive) {
          await updateAppointmentStatus(client, currentActive, 'completed');
        }
        if (nextPatient) {
          await updateAppointmentStatus(client, nextPatient, 'in-progress');
        }
      } catch (err) {
        console.error('Error updating next patient in Supabase:', err);
      }
    }
  }, [setState]);

  // Mark as Completed directly
  const markAsCompleted = useCallback(async (tokenId: number) => {
    let targetItem: QueueItem | undefined;

    setState(prev => {
      targetItem = prev.queue.find(q => q.token_id === tokenId);
      return {
        ...prev,
        queue: prev.queue.map(q => q.token_id === tokenId ? { ...q, status: 'completed' } : q),
        appState: {
          ...prev.appState,
          current_token_in_cabin: prev.appState.current_token_in_cabin === tokenId ? null : prev.appState.current_token_in_cabin,
        }
      };
    });

    const client = supabase;
    if (client && targetItem) {
      await updateAppointmentStatus(client, targetItem, 'completed');
    }
  }, [setState]);

  // Mark as In-Progress directly
  const markAsInProgress = useCallback(async (tokenId: number) => {
    let targetItem: QueueItem | undefined;

    setState(prev => {
      targetItem = prev.queue.find(q => q.token_id === tokenId);
      return {
        ...prev,
        queue: prev.queue.map(q => q.token_id === tokenId ? { ...q, status: 'in-progress' } : q),
        appState: {
          ...prev.appState,
          current_token_in_cabin: tokenId,
          doctor_status: 'active',
        }
      };
    });

    const client = supabase;
    if (client && targetItem) {
      await updateAppointmentStatus(client, targetItem, 'in-progress');
    }
  }, [setState]);

  // Add Walk-In Patient
  const addWalkIn = useCallback(async (item: Partial<QueueItem>) => {
    const tokenId = item.token_number ?? item.token_id ?? 1;
    const newItem: QueueItem = {
      id: item.id || `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      token_id: tokenId,
      token_number: tokenId,
      patient_name: item.patient_name || `Walk-in #${tokenId}`,
      type: 'walk-in',
      is_walk_in: true,
      status: item.status || 'waiting',
      clinic_id: item.clinic_id,
      doctor_id: item.doctor_id,
      doctor_name: item.doctor_name,
    };

    // Optimistic Update
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, newItem].sort((a, b) => a.token_id - b.token_id),
      appState: {
        ...prev.appState,
        total_patients_waiting: prev.appState.total_patients_waiting + (newItem.status === 'waiting' ? 1 : 0),
        current_token_in_cabin: newItem.status === 'in-progress' ? tokenId : prev.appState.current_token_in_cabin,
      }
    }));

    // Persist to Supabase
    const client = supabase;
    if (client) {
      try {
        const { data } = await insertAppointmentWithFallback(client, newItem);
        if (data && data[0]) {
          const inserted = normalizeAppointment(data[0]);
          setState(prev => ({
            ...prev,
            queue: prev.queue.map(q => (q.id === newItem.id ? inserted : q))
          }));
        }
      } catch (err) {
        console.error('Failed to insert walk-in:', err);
      }
    }
  }, [setState]);

  // Add Online Booking
  const addOnlineBooking = useCallback(async (item: Partial<QueueItem>) => {
    const tokenId = item.token_number ?? item.token_id ?? 1;
    const newItem: QueueItem = {
      id: item.id || `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      token_id: tokenId,
      token_number: tokenId,
      patient_name: item.patient_name || `Patient #${tokenId}`,
      type: 'online',
      is_walk_in: false,
      status: item.status || 'waiting',
      clinic_id: item.clinic_id,
      doctor_id: item.doctor_id,
      doctor_name: item.doctor_name,
    };

    // Optimistic Update
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, newItem].sort((a, b) => a.token_id - b.token_id),
      patient_token: tokenId,
      selected_clinic_id: newItem.clinic_id || prev.selected_clinic_id,
      appState: {
        ...prev.appState,
        total_patients_waiting: prev.appState.total_patients_waiting + (newItem.status === 'waiting' ? 1 : 0),
      }
    }));

    // Persist to Supabase
    const client = supabase;
    if (client) {
      try {
        const { data } = await insertAppointmentWithFallback(client, newItem);
        if (data && data[0]) {
          const inserted = normalizeAppointment(data[0]);
          setState(prev => ({
            ...prev,
            queue: prev.queue.map(q => (q.id === newItem.id ? inserted : q))
          }));
        }
      } catch (err) {
        console.error('Failed to insert online booking:', err);
      }
    }
  }, [setState]);

  // Running Late: Push back 1 slot
  const pushBackOneSlot = useCallback(async (tokenId: number, clinicId?: string) => {
    let currentItem: QueueItem | null = null;
    let nextItem: QueueItem | null = null;
    let newTokenNumber: number | null = null;

    setState(prev => {
      // Find waiting queue in order
      const waitingList = prev.queue
        .filter(q => q.status === 'waiting' && (!clinicId || q.clinic_id === clinicId))
        .sort((a, b) => a.token_id - b.token_id);

      const myIndex = waitingList.findIndex(q => q.token_id === tokenId);
      if (myIndex === -1 || myIndex >= waitingList.length - 1) {
        // Already at the end of the queue or not found
        return prev;
      }

      currentItem = waitingList[myIndex];
      nextItem = waitingList[myIndex + 1];
      newTokenNumber = nextItem.token_id;

      const tokenA = currentItem.token_id;
      const tokenB = nextItem.token_id;

      // Swap token numbers
      const updatedQueue = prev.queue.map(item => {
        if ((item.id && item.id === currentItem!.id) || item.token_id === tokenA) {
          return { ...item, token_id: tokenB, token_number: tokenB };
        }
        if ((item.id && item.id === nextItem!.id) || item.token_id === tokenB) {
          return { ...item, token_id: tokenA, token_number: tokenA };
        }
        return item;
      }).sort((a, b) => a.token_id - b.token_id);

      return {
        ...prev,
        queue: updatedQueue,
        // Crucial: Update the patient's own token number to the newly assigned token!
        patient_token: prev.patient_token === tokenA ? tokenB : prev.patient_token,
      };
    });

    // Persist swap to Supabase
    const client = supabase;
    if (client && currentItem && nextItem) {
      const c = currentItem as QueueItem;
      const n = nextItem as QueueItem;
      const tokenA = c.token_id;
      const tokenB = n.token_id;

      try {
        // Temporary placeholder to avoid any potential duplicate token conflicts
        await updateAppointmentToken(client, c.id, tokenA, -99999);
        await updateAppointmentToken(client, n.id, tokenB, tokenA);
        await updateAppointmentToken(client, c.id, -99999, tokenB);
      } catch (err) {
        console.error('Failed to swap tokens in Supabase:', err);
      }
    }

    return newTokenNumber;
  }, [setState]);

  // Toggle Doctor Break
  const toggleDoctorBreak = useCallback(() => {
    setState(prev => ({
      ...prev,
      appState: {
        ...prev.appState,
        doctor_status: prev.appState.doctor_status === 'active' ? 'on-break' : 'active',
      }
    }));
  }, [setState]);

  return {
    queue: state.queue,
    clinics: state.clinics,
    doctors: state.doctors,
    isSupabaseConnected,
    callNextPatient,
    markAsCompleted,
    markAsInProgress,
    addWalkIn,
    addOnlineBooking,
    pushBackOneSlot,
    toggleDoctorBreak,
  };
}

