'use client';

import { useStore, Clinic, Doctor, QueueItem } from '@/lib/store';
import { useQueue } from '@/hooks/use-queue';
import { 
  ArrowRight, 
  Coffee, 
  UserPlus, 
  Users, 
  Activity, 
  Tv, 
  Monitor, 
  Building2, 
  Stethoscope, 
  LogOut, 
  Lock, 
  ChevronRight, 
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';

export default function HospitalPortal() {
  const { state, updateState } = useStore();
  const { 
    callNextPatient, 
    addWalkIn, 
    toggleDoctorBreak, 
    isSupabaseConnected 
  } = useQueue();

  // Navigation Steps: 'select_hospital' | 'login' | 'select_doctor' | 'dashboard'
  const session = state.hospitalStaffSession;
  const currentStep = useMemo<'select_hospital' | 'login' | 'select_doctor' | 'dashboard'>(() => {
    if (!session.hospitalId) return 'select_hospital';
    if (!session.isAuthenticated) return 'login';
    if (!session.doctorId && session.staffRole === 'doctor') return 'select_doctor';
    return 'dashboard';
  }, [session]);

  const [tvMode, setTvMode] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(session.hospitalId);
  const [loginRole, setLoginRole] = useState<'receptionist' | 'doctor'>('receptionist');
  const [staffNameInput, setStaffNameInput] = useState('Staff Desk');
  const [pinInput, setPinInput] = useState('1234');
  const [loginError, setLoginError] = useState('');

  // Walk-In Modal
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInDoctorId, setWalkInDoctorId] = useState<string>('');

  // Derived selections
  const currentHospital: Clinic | undefined = state.clinics.find(
    c => c.id === (session.hospitalId || selectedHospitalId)
  ) || state.clinics[0];

  const hospitalDoctors: Doctor[] = useMemo(() => {
    const hospId = session.hospitalId || selectedHospitalId;
    return state.doctors.filter(d => !hospId || d.clinic_id === hospId);
  }, [state.doctors, session.hospitalId, selectedHospitalId]);

  const currentDoctor: Doctor | undefined = state.doctors.find(
    d => d.id === session.doctorId
  );

  // Filter queue for this specific hospital & doctor
  const hospitalQueue = useMemo(() => {
    if (!currentHospital) return [];
    return state.queue.filter(q => {
      const matchHospital = !q.clinic_id || q.clinic_id === currentHospital.id;
      const matchDoctor = !session.doctorId || !q.doctor_id || q.doctor_id === session.doctorId;
      return matchHospital && matchDoctor;
    });
  }, [state.queue, currentHospital, session.doctorId]);

  const activeToken = hospitalQueue.find(q => q.status === 'in-progress');
  const waitingTokens = hospitalQueue
    .filter(q => q.status === 'waiting')
    .sort((a, b) => a.token_id - b.token_id);

  // Handlers for authentication flow
  const handleSelectHospital = (hospId: string) => {
    setSelectedHospitalId(hospId);
    updateState({
      hospitalStaffSession: {
        ...session,
        hospitalId: hospId,
        isAuthenticated: false,
        doctorId: null,
      },
      selected_clinic_id: hospId,
    });
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setLoginError('Please enter access PIN');
      return;
    }
    setLoginError('');

    updateState({
      hospitalStaffSession: {
        ...session,
        hospitalId: selectedHospitalId || currentHospital.id,
        isAuthenticated: true,
        staffRole: loginRole,
        staffName: staffNameInput || (loginRole === 'doctor' ? 'Doctor' : 'Receptionist'),
      }
    });
  };

  const handleSelectCentralDesk = () => {
    updateState({
      hospitalStaffSession: {
        ...session,
        doctorId: null,
        staffRole: 'receptionist',
        staffName: session.staffName && session.staffName !== 'Doctor' 
          ? session.staffName 
          : 'Central Reception Desk',
      }
    });
  };

  const handleSelectDoctor = (docId: string | null) => {
    if (!docId) {
      handleSelectCentralDesk();
      return;
    }
    const doc = state.doctors.find(d => d.id === docId);
    updateState({
      hospitalStaffSession: {
        ...session,
        doctorId: docId,
        staffRole: 'doctor',
        staffName: doc?.name || session.staffName || 'Doctor',
      }
    });
  };

  const handleBackToDoctorSelection = () => {
    updateState({
      hospitalStaffSession: {
        ...session,
        doctorId: null,
        staffRole: 'doctor',
      }
    });
  };

  const handleBackToLogin = () => {
    updateState({
      hospitalStaffSession: {
        ...session,
        isAuthenticated: false,
        doctorId: null,
      }
    });
  };

  const handleLogout = () => {
    updateState({
      hospitalStaffSession: {
        isAuthenticated: false,
        hospitalId: null,
        doctorId: null,
        staffRole: 'receptionist',
        staffName: '',
      }
    });
    setSelectedHospitalId(null);
  };

  // Queue Operations
  const handleNext = async (targetDoctorId?: string) => {
    const docIdToCall = targetDoctorId || session.doctorId || undefined;
    await callNextPatient(currentHospital?.id, docIdToCall);
  };

  const handleOpenWalkIn = () => {
    const nextTokenId = state.queue.length > 0 
      ? Math.max(...state.queue.map(q => q.token_id)) + 1 
      : 1;
    setWalkInName(`Walk-in #${nextTokenId}`);
    setWalkInDoctorId(session.doctorId || hospitalDoctors[0]?.id || '');
    setShowWalkInModal(true);
  };

  const handleConfirmWalkIn = async () => {
    if (!walkInName.trim() || !currentHospital) return;
    const nextTokenId = state.queue.length > 0 
      ? Math.max(...state.queue.map(q => q.token_id)) + 1 
      : 1;

    const assignedDoc = state.doctors.find(d => d.id === walkInDoctorId);

    await addWalkIn({
      token_id: nextTokenId,
      token_number: nextTokenId,
      patient_name: walkInName.trim(),
      type: 'walk-in',
      is_walk_in: true,
      status: (!activeToken && waitingTokens.length === 0) ? 'in-progress' : 'waiting',
      clinic_id: currentHospital.id,
      doctor_id: assignedDoc?.id,
      doctor_name: assignedDoc?.name,
    });

    setShowWalkInModal(false);
  };

  // ==========================================
  // VIEW 1: SELECT HOSPITAL SCREEN
  // ==========================================
  if (currentStep === 'select_hospital') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="mb-6 flex items-center justify-between">
            <Link 
              href="/"
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </Link>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isSupabaseConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isSupabaseConnected ? '● Supabase Realtime Live' : '○ Local Simulation Mode'}
            </span>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200">
            <div className="text-center max-w-md mx-auto mb-10">
              <div className="w-16 h-16 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hospital Staff Portal</h1>
              <p className="text-slate-500 mt-2 font-medium">
                Please select your hospital or clinic to sign in to the operational desk.
              </p>
            </div>

            <div className="space-y-4">
              {state.clinics.map(clinic => {
                const clinicWaiting = state.queue.filter(
                  q => (!q.clinic_id || q.clinic_id === clinic.id) && q.status === 'waiting'
                ).length;
                const docsCount = state.doctors.filter(d => d.clinic_id === clinic.id).length;

                return (
                  <button
                    key={clinic.id}
                    onClick={() => handleSelectHospital(clinic.id)}
                    className="w-full group text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-teal-500 hover:bg-teal-50/30 transition-all flex items-center justify-between shadow-sm hover:shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                          {clinic.name}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" /> {clinic.location}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-xs font-semibold">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-600">
                            {clinic.base_consult_time} mins/pt
                          </span>
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                            {docsCount || 2} Doctor Cabins
                          </span>
                          <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-md">
                            {clinicWaiting} waiting
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-teal-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: STAFF LOGIN SCREEN
  // ==========================================
  if (currentStep === 'login') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <button 
            onClick={() => setSelectedHospitalId(null)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Change Hospital
          </button>

          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 font-bold text-xs mb-3 border border-teal-100">
                <Building2 className="w-3.5 h-3.5" /> {currentHospital.name}
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Staff Authentication</h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">Enter your credentials to access the desk</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Select Role
                </label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('receptionist');
                      setStaffNameInput('Reception Desk');
                    }}
                    className={`py-2.5 rounded-xl font-bold text-sm transition ${
                      loginRole === 'receptionist'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Receptionist
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('doctor');
                      setStaffNameInput(hospitalDoctors[0]?.name || 'Doctor');
                    }}
                    className={`py-2.5 rounded-xl font-bold text-sm transition ${
                      loginRole === 'doctor'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Doctor Cabin
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Staff Name / Identifier
                </label>
                <input
                  type="text"
                  value={staffNameInput}
                  onChange={(e) => setStaffNameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Access PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Enter PIN (Demo: 1234)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 text-sm"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {loginError && <p className="text-xs text-rose-600 font-semibold mt-1">{loginError}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition shadow-sm hover:shadow"
              >
                Sign In to Desk
              </button>

              <button
                type="button"
                onClick={() => {
                  setPinInput('1234');
                  handleLogin();
                }}
                className="w-full py-2 text-xs text-slate-500 hover:text-teal-700 font-semibold transition text-center"
              >
                ⚡ Quick Demo 1-Click Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: SELECT DOCTOR CABIN
  // ==========================================
  if (currentStep === 'select_doctor') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="mb-4 flex items-center justify-between">
            <button 
              onClick={handleBackToLogin}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-xs font-bold text-slate-500">
              {currentHospital.name}
            </span>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200">
            <div className="text-center max-w-md mx-auto mb-8">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-100 shadow-sm">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select Doctor Cabin</h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">
                Choose the cabin queue you wish to manage, or access Central Reception.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {hospitalDoctors.map(doc => {
                const docWaiting = state.queue.filter(
                  q => q.doctor_id === doc.id && q.status === 'waiting'
                ).length;
                const docActive = state.queue.find(
                  q => q.doctor_id === doc.id && q.status === 'in-progress'
                );

                return (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoctor(doc.id)}
                    className="group text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex flex-col justify-between shadow-sm hover:shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                          {doc.cabin_number}
                        </span>
                        {docActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Serving #{docActive.token_id}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">Available</span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-900">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {doc.specialty}
                      </p>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>{docWaiting} in queue</span>
                      <span className="text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Open Desk <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Central Reception Desk Option */}
            <button
              onClick={handleSelectCentralDesk}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-500 text-teal-900 font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm group"
            >
              <Users className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
              <span>Manage Central Reception Desk (All Cabins)</span>
              <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full ml-1">Live Overview</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: LOBBY TV DISPLAY MODE
  // ==========================================
  if (tvMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-white p-8 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-2xl">
              Q
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">{currentHospital.name}</h1>
              <p className="text-slate-400 text-sm font-medium">
                {currentDoctor ? `${currentDoctor.name} • ${currentDoctor.cabin_number}` : 'Central Waiting Lobby'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> Live Queue System
            </div>
            <button 
              onClick={() => setTvMode(false)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 font-bold text-sm transition"
            >
              <Monitor className="w-4 h-4" /> Exit TV Mode
            </button>
          </div>
        </div>

        {/* Massive Center Display */}
        <div className="flex-1 flex flex-col items-center justify-center my-8 text-center">
          <span className="text-2xl font-bold tracking-[0.3em] uppercase text-teal-400 mb-4">
            Now Calling
          </span>

          {activeToken ? (
            <div className="animate-in zoom-in-90 duration-300">
              <div className="text-[14rem] sm:text-[18rem] font-black leading-none text-white tracking-tighter drop-shadow-[0_10px_35px_rgba(20,184,166,0.3)]">
                #{activeToken.token_id}
              </div>
              <p className="text-5xl sm:text-6xl font-bold text-slate-200 mt-2">
                {activeToken.patient_name}
              </p>
              <div className="mt-8 inline-flex items-center gap-3 px-8 py-3 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-xl">
                <Activity className="w-6 h-6 animate-spin" />
                Please Proceed to Consultation Cabin
              </div>
            </div>
          ) : (
            <div>
              <div className="text-8xl font-black text-slate-600 mb-4">--</div>
              <p className="text-4xl text-slate-400 font-semibold">Doctor preparing for next token</p>
            </div>
          )}
        </div>

        {/* Bottom Upcoming Tokens Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Up Next In Waiting Room ({waitingTokens.length} Patients)
          </p>
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {waitingTokens.length === 0 ? (
              <p className="text-slate-500 text-sm font-medium">No other patients waiting</p>
            ) : (
              waitingTokens.slice(0, 6).map((item, idx) => (
                <div 
                  key={item.token_id}
                  className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-6 py-3.5 flex items-center gap-4 shrink-0"
                >
                  <span className="w-8 h-8 rounded-full bg-slate-700 text-white font-bold text-sm flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-2xl font-black text-white">#{item.token_id}</span>
                    <p className="text-xs font-medium text-slate-300 max-w-[120px] truncate">
                      {item.patient_name}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 5: ACTIVE OPERATIONAL DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm">
              Q
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">{currentHospital.name}</h1>
                <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full border border-teal-100">
                  {currentDoctor ? `${currentDoctor.cabin_number} • ${currentDoctor.name}` : 'Central Reception Desk (All Cabins)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Logged in as <span className="font-bold text-slate-700">{session.staffName}</span> ({session.staffRole === 'receptionist' ? 'Receptionist' : 'Doctor'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isSupabaseConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isSupabaseConnected ? 'Realtime Connected' : 'Local Fallback'}
            </span>

            <button
              onClick={() => {
                if (session.doctorId) {
                  handleSelectCentralDesk();
                } else {
                  handleBackToDoctorSelection();
                }
              }}
              className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-teal-600" />
              {session.doctorId ? 'Central Desk' : 'Doctor Cabins'}
            </button>

            <button
              onClick={() => setTvMode(true)}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition border border-indigo-100"
            >
              <Tv className="w-4 h-4" /> Lobby TV
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Quick Cabin Switcher Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-xs font-bold">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-slate-400 uppercase tracking-wider text-[11px] shrink-0 mr-1">Active View:</span>
          <button
            onClick={handleSelectCentralDesk}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shrink-0 ${
              !session.doctorId
                ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Central Desk (All Cabins)
          </button>
          {hospitalDoctors.map(doc => {
            const docActive = state.queue.find(q => q.clinic_id === currentHospital.id && q.doctor_id === doc.id && q.status === 'in-progress');
            const docWaitingCount = state.queue.filter(q => q.clinic_id === currentHospital.id && q.doctor_id === doc.id && q.status === 'waiting').length;
            const isCurrent = session.doctorId === doc.id;

            return (
              <button
                key={doc.id}
                onClick={() => handleSelectDoctor(doc.id)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-2 transition shrink-0 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{doc.cabin_number} • {doc.name}</span>
                {docActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title={`Serving #${docActive.token_id}`} />
                ) : (
                  <span className="text-[10px] opacity-75 font-normal">({docWaitingCount} wait)</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleBackToDoctorSelection}
          className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5 shrink-0 text-xs py-1 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <Stethoscope className="w-3.5 h-3.5 text-indigo-600" /> Doctor Cabin Directory
        </button>
      </div>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto w-full p-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Left Side: Live Operational Console (65%) */}
        <div className="flex-1 flex flex-col space-y-6">
          {!session.doctorId ? (
            /* CENTRAL RECEPTION DESK MODE: ALL CABINS MATRIX */
            <>
              {/* Doctor Cabins Live Matrix Grid */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Live Hospital Cabins Matrix</h2>
                      <p className="text-xs text-slate-500 font-medium">Real-time status and consultation across all doctor cabins</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    {hospitalDoctors.length} Active Cabins
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hospitalDoctors.map(doc => {
                    const docActive = state.queue.find(q => q.clinic_id === currentHospital.id && q.doctor_id === doc.id && q.status === 'in-progress');
                    const docWaitingList = state.queue.filter(q => q.clinic_id === currentHospital.id && q.doctor_id === doc.id && q.status === 'waiting');

                    return (
                      <div 
                        key={doc.id}
                        className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 hover:border-teal-200 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-black px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                              {doc.cabin_number}
                            </span>
                            {docActive ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Serving #{docActive.token_id}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                                Available
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-slate-900 text-base">{doc.name}</h4>
                          <p className="text-xs text-slate-500 font-medium">{doc.specialty}</p>

                          <div className="mt-3 py-2 px-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-500">In Waiting:</span>
                            <span className="text-slate-800 font-black">{docWaitingList.length} patients</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center gap-2">
                          <button
                            onClick={() => handleNext(doc.id)}
                            disabled={docWaitingList.length === 0 && !docActive}
                            className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:cursor-not-allowed"
                          >
                            <ArrowRight className="w-3.5 h-3.5" /> Call Next
                          </button>
                          <button
                            onClick={() => handleSelectDoctor(doc.id)}
                            className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                            title="Open Cabin Console"
                          >
                            Open Cabin
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Central Dispatch & Action Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Central Queue Operations
                  </span>
                  <h3 className="text-xl font-black text-slate-900">
                    {waitingTokens.length > 0 
                      ? `Next in Line: #${waitingTokens[0].token_id} - ${waitingTokens[0].patient_name}` 
                      : 'All Waiting Patients Called'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {waitingTokens.length} total patients currently queued across all hospital cabins
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => handleNext()}
                    disabled={waitingTokens.length === 0 && !activeToken}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-sm transition shadow-sm disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-4 h-4" /> CALL NEXT IN LINE
                  </button>

                  <button
                    onClick={handleOpenWalkIn}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-2xl font-black text-sm transition shadow-sm"
                  >
                    <UserPlus className="w-4 h-4 text-teal-600" /> ISSUE WALK-IN
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* FOCUSED DOCTOR CABIN CONSULTATION CONSOLE */
            <>
              {/* Active Patient Card */}
              <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 text-center relative overflow-hidden">
                {state.appState.doctor_status === 'on-break' && (
                  <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-sm flex items-center justify-center z-10 border-4 border-amber-400 rounded-3xl">
                    <div className="bg-white px-8 py-4 rounded-full shadow-xl flex items-center gap-3 animate-in zoom-in duration-150">
                      <Coffee className="w-6 h-6 text-amber-600" />
                      <span className="text-xl font-black text-amber-800">Doctor is on Break</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {currentDoctor ? `${currentDoctor.cabin_number} • ${currentDoctor.name}` : 'Current Patient In Consultation'}
                  </span>
                  <button
                    onClick={handleSelectCentralDesk}
                    className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-0.5 ml-2"
                  >
                    ← All Cabins
                  </button>
                </div>

                {activeToken ? (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-[7rem] sm:text-[9rem] leading-none font-black text-slate-900 tracking-tighter mb-2">
                      #{activeToken.token_id}
                    </h2>
                    <p className="text-3xl sm:text-4xl font-black text-slate-700">
                      {activeToken.patient_name}
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-sm font-bold">
                      <Activity className="w-4 h-4 animate-pulse" />
                      In Cabin with Doctor
                    </div>
                  </div>
                ) : (
                  <div className="py-16">
                    <h2 className="text-5xl font-black text-slate-300">No Patient Active</h2>
                    <p className="text-slate-400 text-sm font-medium mt-2">
                      Click &quot;Next Patient&quot; to call the next token for this cabin
                    </p>
                  </div>
                )}
              </div>

              {/* Action Control Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => handleNext()}
                  disabled={waitingTokens.length === 0 && !activeToken}
                  className="flex flex-col items-center justify-center gap-2 p-6 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-lg transition shadow-sm hover:shadow active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-8 h-8" />
                  <span>NEXT PATIENT</span>
                </button>

                <button
                  onClick={toggleDoctorBreak}
                  className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl font-black text-lg transition shadow-sm hover:shadow active:scale-[0.98] ${
                    state.appState.doctor_status === 'on-break'
                      ? 'bg-amber-100 border-2 border-amber-400 text-amber-800'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  <Coffee className="w-8 h-8" />
                  <span>{state.appState.doctor_status === 'on-break' ? 'RESUME QUEUE' : 'DOC BREAK'}</span>
                </button>

                <button
                  onClick={handleOpenWalkIn}
                  className="flex flex-col items-center justify-center gap-2 p-6 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-2xl font-black text-lg transition shadow-sm hover:shadow active:scale-[0.98]"
                >
                  <UserPlus className="w-8 h-8 text-teal-600" />
                  <span>ADD WALK-IN</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Waiting Queue List (35%) */}
        <div className="w-full lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-slate-900 text-lg">Waiting Queue</h3>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {waitingTokens.length} in line
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {waitingTokens.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-slate-200 mb-2" />
                <p className="font-bold text-slate-600">All Caught Up</p>
                <p className="text-xs text-slate-400 mt-1">No patients currently waiting in line</p>
              </div>
            ) : (
              waitingTokens.map((patient, idx) => {
                const assignedDoctor = state.doctors.find(d => d.id === patient.doctor_id);
                return (
                  <div
                    key={patient.id || patient.token_id}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-lg shrink-0">
                        #{patient.token_id}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{patient.patient_name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                          <span>Pos: {idx + 1}</span>
                          <span>•</span>
                          <span className={`uppercase font-bold text-[10px] ${patient.type === 'walk-in' ? 'text-amber-600' : 'text-blue-600'}`}>
                            {patient.type}
                          </span>
                          {assignedDoctor && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {assignedDoctor.cabin_number}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg shrink-0">
                      ~{(idx + 1) * (currentHospital.base_consult_time || 10)}m
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Walk-in Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Add Walk-in Patient</h3>
              <button 
                onClick={() => setShowWalkInModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Patient Full Name
                </label>
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="e.g. Karthik Raja"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Assign to Doctor Cabin
                </label>
                <select
                  value={walkInDoctorId}
                  onChange={(e) => setWalkInDoctorId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 text-sm"
                >
                  {hospitalDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.cabin_number} - {doc.name} ({doc.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="flex-1 py-3 text-slate-600 hover:bg-slate-100 font-bold text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWalkIn}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition shadow"
                >
                  Issue Token
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
