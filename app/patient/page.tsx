'use client';

import { useStore } from '@/lib/store';
import { calculateWaitTime } from '@/lib/eta';
import { useQueue } from '@/hooks/use-queue';
import { Search, MapPin, Clock, ArrowLeft, Bot, Ambulance, Home, Users, FileText, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const SidebarNav = () => (
  <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-6 space-y-2">
    <div className="mb-8 px-4">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Q-Health</h2>
      <p className="text-sm text-slate-500">Patient Portal</p>
    </div>
    <button className="flex items-center gap-3 w-full p-4 rounded-2xl bg-teal-50 text-teal-700 font-semibold transition-colors">
      <Home className="w-5 h-5" />
      Home
    </button>
    <button className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-slate-50 text-slate-600 font-medium transition-colors">
      <Users className="w-5 h-5" />
      Family Circles
    </button>
    <button className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-slate-50 text-slate-600 font-medium transition-colors">
      <FileText className="w-5 h-5" />
      Health Locker
    </button>
  </div>
);

const BottomNav = () => (
  <div className="md:hidden fixed bottom-0 w-full max-w-md mx-auto bg-white border-t border-slate-100 pb-safe z-50">
    <div className="flex justify-around p-3">
      <button className="flex flex-col items-center gap-1 p-2 text-teal-600">
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-semibold">Home</span>
      </button>
      <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600">
        <Users className="w-6 h-6" />
        <span className="text-[10px] font-medium">Family</span>
      </button>
      <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600">
        <FileText className="w-6 h-6" />
        <span className="text-[10px] font-medium">Locker</span>
      </button>
    </div>
  </div>
);

export default function PatientPortal() {
  const { state, updateState } = useStore();
  const { addOnlineBooking } = useQueue();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedClinicIdForBooking, setSelectedClinicIdForBooking] = useState<string | null>(null);

  const handleOpenBookingModal = (clinicId: string) => {
    setSelectedClinicIdForBooking(clinicId);
    setShowBookingModal(true);
  };

  const confirmBooking = (patientName: string) => {
    if (!selectedClinicIdForBooking) return;
    
    const nextTokenId = state.queue.length > 0 ? Math.max(...state.queue.map(q => q.token_id)) + 1 : 1;
    
    addOnlineBooking({
      token_id: nextTokenId,
      patient_name: patientName,
      type: 'online',
      status: 'waiting',
    });

    updateState({
      patient_token: nextTokenId,
      selected_clinic_id: selectedClinicIdForBooking,
    });
    
    setShowBookingModal(false);
  };

  const handlePushBack = () => {
    if (!state.patient_token) return;
    const queue = [...state.queue];
    const myIndex = queue.findIndex(q => q.token_id === state.patient_token);
    
    if (myIndex !== -1 && myIndex < queue.length - 1) {
      const temp = queue[myIndex];
      queue[myIndex] = queue[myIndex + 1];
      queue[myIndex + 1] = temp;
      updateState({ queue });
    }
  };

  // If patient has booked a token, show View B (Tracker)
  if (state.patient_token) {
    const clinic = state.clinics.find(c => c.id === state.selected_clinic_id) || state.clinics[0];
    const waitTime = calculateWaitTime(state.queue, clinic, state.patient_token);
    const myTokenDetails = state.queue.find(q => q.token_id === state.patient_token);
    const activeToken = state.queue.find(q => q.status === 'in-progress');
    
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center">
        <SidebarNav />
        <div className="flex-1 flex flex-col max-w-md w-full bg-slate-50 relative shadow-2xl overflow-hidden pb-20 md:pb-0">
          {/* Header */}
          <div className="bg-white p-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button onClick={() => updateState({ patient_token: null })} className="p-2 hover:bg-slate-100 rounded-full">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="font-semibold text-slate-900">{clinic.name}</h1>
                <p className="text-xs text-slate-500">{clinic.doctor_name}</p>
              </div>
            </div>
            <button className="p-2.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors">
              <Ambulance className="w-5 h-5" />
            </button>
          </div>

          {/* Status Card */}
          <div className="p-6 pb-2">
            <div className="bg-teal-600 text-white rounded-[2rem] p-8 text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
              <p className="text-teal-100 font-medium text-sm mb-1 relative z-10">Your Token Number</p>
              <h2 className="text-6xl font-bold tracking-tighter relative z-10 mb-8">#{state.patient_token}</h2>
              
              <div className="relative z-10">
                <p className="text-teal-100 text-sm mb-1">Estimated Wait Time</p>
                {state.appState.doctor_status === 'on-break' ? (
                  <div className="text-2xl font-semibold text-yellow-300">Doctor on Break</div>
                ) : (
                  <div className="text-5xl font-bold">~{waitTime} <span className="text-xl font-normal opacity-80">mins</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Tracker */}
          <div className="flex-1 p-6">
            <h3 className="font-semibold text-slate-900 mb-8">Live Queue Tracker</h3>
            
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
              {/* Active Node */}
              <div className="relative flex items-center gap-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-teal-500 shadow-sm shrink-0 z-10">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                </div>
                <div className="flex-1 bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
                  <p className="text-xs text-teal-600 font-bold uppercase tracking-wider mb-1">Now Serving</p>
                  <p className="font-bold text-slate-900 text-lg">Token #{activeToken?.token_id || '--'}</p>
                </div>
              </div>

              {/* Intermediate Queue */}
              <div className="relative flex items-center gap-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-slate-200 shrink-0 z-10">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                </div>
                <div className="flex-1 px-2 py-4">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">In Queue</p>
                  <p className="font-semibold text-slate-700">
                    {state.queue.filter(q => q.status === 'waiting' && q.token_id < state.patient_token!).length} Patients Ahead
                  </p>
                </div>
              </div>

              {/* My Node */}
              <div className="relative flex items-center gap-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-indigo-100 shrink-0 z-10">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                </div>
                <div className="flex-1 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Your Turn</p>
                  <p className="font-bold text-indigo-900 text-lg">Token #{state.patient_token}</p>
                  <p className="text-sm text-indigo-700 mt-1">{myTokenDetails?.patient_name}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <button onClick={handlePushBack} className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl transition-colors shadow-sm">
              Running Late? (Push back 1 slot)
            </button>
          </div>
          <BottomNav />
        </div>
      </div>
    );
  }

  // View A: Search & Booking Screen
  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <SidebarNav />
      <div className="flex-1 flex flex-col max-w-md w-full bg-slate-50 relative shadow-2xl overflow-hidden pb-20 md:pb-0">
        
        {/* Header & Triage */}
        <div className="bg-white px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-sm relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 px-4 py-2.5 rounded-full cursor-pointer transition-colors">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
              <p className="text-sm font-semibold text-slate-700 truncate max-w-[150px]">OMR Road, Chennai</p>
            </div>
            <button className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-full font-bold transition-colors">
              <Ambulance className="w-4 h-4" />
              <span className="text-sm">SOS</span>
            </button>
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Find Care</h1>
          <p className="text-slate-500 text-sm mb-6 font-medium">Book a live token and skip the waiting room.</p>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search symptoms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
              />
            </div>
            <button className="flex flex-col items-center justify-center w-14 h-[58px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl transition-colors shrink-0 border border-indigo-100">
              <Bot className="w-6 h-6" />
            </button>
          </div>
          <div className="mt-2 text-right">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mr-2">Seva AI Triage</span>
          </div>
        </div>

        {/* Clinic List */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {state.clinics.map(clinic => {
            const waitingCount = state.queue.filter(q => q.status === 'waiting' || q.status === 'in-progress').length;
            const estWaitTime = waitingCount * clinic.base_consult_time;

            return (
              <div key={clinic.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{clinic.name}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">{clinic.doctor_name}</p>
                  </div>
                  <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold text-slate-600">{clinic.base_consult_time}m/pt</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-6 bg-teal-50/50 p-3 rounded-2xl">
                  <div className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                  </div>
                  <p className="text-sm font-bold text-teal-800">
                    Wait: {estWaitTime} mins 
                    <span className="text-teal-600/70 font-medium ml-1">({waitingCount} ahead)</span>
                  </p>
                </div>

                <button 
                  onClick={() => handleOpenBookingModal(clinic.id)}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Book Token <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        <BottomNav />

        {/* Booking Modal Overlay */}
        {showBookingModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">Who is this for?</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => confirmBooking('You (Self)')}
                  className="w-full p-4 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-2xl transition-colors border border-teal-100"
                >
                  Myself
                </button>
                <button 
                  onClick={() => confirmBooking('Family Member')}
                  className="w-full p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl transition-colors border border-slate-200 flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" /> Add Family Member
                </button>
                <button 
                  onClick={() => setShowBookingModal(false)}
                  className="w-full p-4 mt-2 text-slate-500 hover:text-slate-700 font-medium rounded-2xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

