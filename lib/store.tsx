'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Clinic = {
  id: string;
  name: string;
  location: string;
  base_consult_time: number;
  doctor_name?: string;
};

export type Doctor = {
  id: string;
  clinic_id: string;
  name: string;
  specialty: string;
  cabin_number: string;
};

export type QueueItem = {
  id?: string | number;
  token_id: number;
  token_number?: number;
  patient_name: string;
  type: 'online' | 'walk-in';
  is_walk_in?: boolean;
  status: 'waiting' | 'in-progress' | 'completed';
  clinic_id?: string;
  doctor_id?: string;
  doctor_name?: string;
};

export type AppState = {
  current_token_in_cabin: number | null;
  total_patients_waiting: number;
  doctor_status: 'active' | 'on-break';
};

export type HospitalStaffSession = {
  isAuthenticated: boolean;
  hospitalId: string | null;
  doctorId: string | null; // null represents "All Cabins / Central Desk"
  staffRole: 'receptionist' | 'doctor' | 'admin';
  staffName: string;
};

export type GlobalState = {
  clinics: Clinic[];
  doctors: Doctor[];
  queue: QueueItem[];
  appState: AppState;
  patient_token: number | null;
  selected_clinic_id: string | null;
  hospitalStaffSession: HospitalStaffSession;
};

export const INITIAL_CLINICS: Clinic[] = [
  {
    id: '167bd249-cd63-4f32-b5bc-bd485bc96fb9',
    name: 'OMR Health Center',
    location: 'OMR Road, Chennai',
    base_consult_time: 10,
    doctor_name: 'Dr. Kavitha',
  },
  {
    id: 'ccf1cbac-d6ae-47d3-8b57-43d7335079fb',
    name: 'Kovai Care Clinic',
    location: 'Perungudi, Chennai',
    base_consult_time: 15,
    doctor_name: 'Dr. Priya Sundaram',
  },
  {
    id: '881fb2bb-6a67-475f-b511-7afb151bb4a1',
    name: 'Karapakkam Family Clinic',
    location: 'Karapakkam, Chennai',
    base_consult_time: 12,
    doctor_name: 'Dr. Rajesh V',
  },
];

export const INITIAL_DOCTORS: Doctor[] = [
  { id: 'doc-omr-1', clinic_id: '167bd249-cd63-4f32-b5bc-bd485bc96fb9', name: 'Dr. Kavitha', specialty: 'General Medicine', cabin_number: 'Cabin 1' },
  { id: 'doc-omr-2', clinic_id: '167bd249-cd63-4f32-b5bc-bd485bc96fb9', name: 'Dr. Arul Kumar', specialty: 'Cardiology', cabin_number: 'Cabin 2' },
  { id: 'doc-kovai-1', clinic_id: 'ccf1cbac-d6ae-47d3-8b57-43d7335079fb', name: 'Dr. Priya Sundaram', specialty: 'Pediatrics', cabin_number: 'Cabin 1' },
  { id: 'doc-kovai-2', clinic_id: 'ccf1cbac-d6ae-47d3-8b57-43d7335079fb', name: 'Dr. Balaji', specialty: 'Orthopedics', cabin_number: 'Cabin 2' },
  { id: 'doc-karapakkam-1', clinic_id: '881fb2bb-6a67-475f-b511-7afb151bb4a1', name: 'Dr. Rajesh V', specialty: 'Dermatology', cabin_number: 'Cabin 1' },
  { id: 'doc-karapakkam-2', clinic_id: '881fb2bb-6a67-475f-b511-7afb151bb4a1', name: 'Dr. Meenakshi S', specialty: 'General Medicine', cabin_number: 'Cabin 2' },
];

const INITIAL_STATE: GlobalState = {
  clinics: INITIAL_CLINICS,
  doctors: INITIAL_DOCTORS,
  queue: [
    { id: 'q-1', token_id: 11, token_number: 11, patient_name: 'Suresh K.', type: 'online', is_walk_in: false, status: 'in-progress', clinic_id: '167bd249-cd63-4f32-b5bc-bd485bc96fb9', doctor_id: 'doc-omr-1' },
    { id: 'q-2', token_id: 12, token_number: 12, patient_name: 'Ramesh V.', type: 'walk-in', is_walk_in: true, status: 'waiting', clinic_id: '167bd249-cd63-4f32-b5bc-bd485bc96fb9', doctor_id: 'doc-omr-1' },
    { id: 'q-3', token_id: 13, token_number: 13, patient_name: 'Anjali M.', type: 'online', is_walk_in: false, status: 'waiting', clinic_id: '167bd249-cd63-4f32-b5bc-bd485bc96fb9', doctor_id: 'doc-omr-1' },
    { id: 'q-4', token_id: 14, token_number: 14, patient_name: 'Deepa S.', type: 'walk-in', is_walk_in: true, status: 'waiting', clinic_id: '167bd249-cd63-4f32-b5bc-bd485bc96fb9', doctor_id: 'doc-omr-1' },
  ],
  appState: {
    current_token_in_cabin: 11,
    total_patients_waiting: 3,
    doctor_status: 'active',
  },
  patient_token: null,
  selected_clinic_id: '167bd249-cd63-4f32-b5bc-bd485bc96fb9',
  hospitalStaffSession: {
    isAuthenticated: false,
    hospitalId: null,
    doctorId: null,
    staffRole: 'receptionist',
    staffName: '',
  },
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
  const [state, setState] = useState<GlobalState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qhealth_state_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...INITIAL_STATE,
            ...parsed,
            clinics: parsed.clinics?.length ? parsed.clinics : INITIAL_CLINICS,
            doctors: parsed.doctors?.length ? parsed.doctors : INITIAL_DOCTORS,
          };
        } catch (e) {
          console.error('Failed to parse state from localStorage', e);
        }
      }
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    // Listen for storage events to sync across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'qhealth_state_v2' && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateState = (newState: Partial<GlobalState>) => {
    setState((prev) => {
      const next = { ...prev, ...newState };
      try {
        localStorage.setItem('qhealth_state_v2', JSON.stringify(next));
      } catch {
        // quota exceeded or private mode
      }
      return next;
    });
  };

  return (
    <StoreContext.Provider value={{ state, setState, updateState }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
