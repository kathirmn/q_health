'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Clinic = {
  id: string;
  name: string;
  location: string;
  base_consult_time: number;
  doctor_name: string;
};

export type QueueItem = {
  token_id: number;
  patient_name: string;
  type: 'online' | 'walk-in';
  status: 'waiting' | 'in-progress' | 'completed';
};

export type AppState = {
  current_token_in_cabin: number | null;
  total_patients_waiting: number;
  doctor_status: 'active' | 'on-break';
};

export type GlobalState = {
  clinics: Clinic[];
  queue: QueueItem[];
  appState: AppState;
  patient_token: number | null;
  selected_clinic_id: string | null;
};

const INITIAL_STATE: GlobalState = {
  clinics: [
    {
      id: 'c1',
      name: 'Kovai Care Clinic',
      location: 'Peelamedu, Coimbatore',
      base_consult_time: 10,
      doctor_name: 'Dr. Karthik',
    },
    {
      id: 'c2',
      name: 'OMR Health Center',
      location: 'Perungudi, OMR, Chennai',
      base_consult_time: 12,
      doctor_name: 'Dr. Kavitha',
    },
    {
      id: 'c3',
      name: 'Anna Nagar Family Care',
      location: 'Anna Nagar, Chennai',
      base_consult_time: 15,
      doctor_name: 'Dr. Balaji',
    }
  ],
  queue: [
    { token_id: 11, patient_name: 'Suresh K.', type: 'online', status: 'in-progress' },
    { token_id: 12, patient_name: 'Ramesh V.', type: 'walk-in', status: 'waiting' },
    { token_id: 13, patient_name: 'Anjali M.', type: 'online', status: 'waiting' },
  ],
  appState: {
    current_token_in_cabin: 11,
    total_patients_waiting: 2,
    doctor_status: 'active',
  },
  patient_token: null,
  selected_clinic_id: 'c2',
};

const StoreContext = createContext<{
  state: GlobalState;
  setState: React.Dispatch<React.SetStateAction<GlobalState>>;
  updateState: (newState: Partial<GlobalState>) => void;
}>({
  state: INITIAL_STATE,
  setState: () => {},
  updateState: () => {},
});

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<GlobalState>(INITIAL_STATE);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load from local storage on mount
    const saved = localStorage.getItem('qhealth_state');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse state from localStorage', e);
      }
    } else {
      localStorage.setItem('qhealth_state', JSON.stringify(INITIAL_STATE));
    }
    setIsInitialized(true);

    // Listen for storage events to sync across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'qhealth_state' && e.newValue) {
        setState(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateState = (newState: Partial<GlobalState>) => {
    setState((prev) => {
      const next = { ...prev, ...newState };
      localStorage.setItem('qhealth_state', JSON.stringify(next));
      return next;
    });
  };

  // We wrap the children in a check for isInitialized so we don't get hydration mismatches
  // However, returning null briefly is better than hydration mismatch for this prototype.
  if (!isInitialized) {
    return null; 
  }

  return (
    <StoreContext.Provider value={{ state, setState, updateState }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
