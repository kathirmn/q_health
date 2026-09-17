'use client';

import { useStore } from '@/lib/store';
import { useQueue } from '@/hooks/use-queue';
import { ArrowRight, Coffee, UserPlus, Users, Activity, Tv, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function HospitalPortal() {
  const { state, updateState } = useStore();
  const { markAsCompleted, markAsInProgress, addWalkIn, isSupabaseConnected } = useQueue();
  const [tvMode, setTvMode] = useState(false);

  const activeToken = state.queue.find(q => q.status === 'in-progress');
  const waitingTokens = state.queue.filter(q => q.status === 'waiting').sort((a, b) => a.token_id - b.token_id);

  const handleNextPatient = async () => {
    // 1. Mark current as completed
    if (activeToken) {
      await markAsCompleted(activeToken.token_id);
    }

    // 2. Find next waiting and mark as in-progress
    const nextWaiting = state.queue.find(q => q.status === 'waiting');
    let nextTokenId = null;

    if (nextWaiting) {
      await markAsInProgress(nextWaiting.token_id);
      nextTokenId = nextWaiting.token_id;
    }

    updateState({
      appState: {
        ...state.appState,
        current_token_in_cabin: nextTokenId,
        total_patients_waiting: Math.max(0, state.appState.total_patients_waiting - 1),
        doctor_status: 'active', // Ensure active if they click next
      }
    });
  };

  const handleToggleBreak = () => {
    updateState({
      appState: {
        ...state.appState,
        doctor_status: state.appState.doctor_status === 'active' ? 'on-break' : 'active',
      }
    });
  };

  const handleAddWalkIn = async () => {
    const nextTokenId = state.queue.length > 0 ? Math.max(...state.queue.map(q => q.token_id)) + 1 : 1;
    
    await addWalkIn({
      token_id: nextTokenId,
      patient_name: `Walk-in #${nextTokenId}`,
      type: 'walk-in',
      status: (!activeToken && waitingTokens.length === 0) ? 'in-progress' : 'waiting',
    });

    updateState({
      appState: {
        ...state.appState,
        current_token_in_cabin: (!activeToken && waitingTokens.length === 0) ? nextTokenId : state.appState.current_token_in_cabin,
        total_patients_waiting: (!activeToken && waitingTokens.length === 0) ? state.appState.total_patients_waiting : state.appState.total_patients_waiting + 1,
      }
    });
  };

  // 📺 LOBBY TV MODE VIEW
  if (tvMode) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white relative">
        <button 
          onClick={() => setTvMode(false)}
          className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors"
        >
          <Monitor className="w-5 h-5" /> Exit TV Mode
        </button>
        
        <div className="text-center">
          <p className="text-4xl text-teal-400 font-bold tracking-widest uppercase mb-8">Now Serving</p>
          {activeToken ? (
            <>
              <h1 className="text-[15rem] font-black leading-none text-white tracking-tighter mb-8 drop-shadow-2xl">
                #{activeToken.token_id}
              </h1>
              <p className="text-6xl text-slate-300 font-medium">{activeToken.patient_name}</p>
            </>
          ) : (
            <h1 className="text-8xl font-black text-slate-600">Please Wait...</h1>
          )}
        </div>
      </div>
    );
  }

  // DESKTOP OPERATIONAL DASHBOARD
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Top Mobile Bar */}
      <div className="md:hidden bg-white p-4 flex items-center justify-between border-b border-slate-200">
        <h1 className="font-bold text-slate-900 text-lg">Hospital Desk</h1>
        <button onClick={() => setTvMode(true)} className="text-teal-600">
          <Tv className="w-5 h-5" />
        </button>
      </div>

      {/* LEFT SIDE (70%) - Active Status */}
      <div className="flex-[7] p-6 lg:p-12 flex flex-col h-screen overflow-y-auto">
        <div className="hidden md:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Q-Health Desk</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 font-medium">Kovai Care Clinic</p>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${isSupabaseConnected ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {isSupabaseConnected ? 'Supabase Realtime Live' : 'Local Fallback Mode'}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setTvMode(true)}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-colors"
            >
              <Tv className="w-5 h-5" /> Lobby TV Mode
            </button>
            <Link href="/" className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors">
              Exit
            </Link>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
          {/* Main Status Display */}
          <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-200 text-center relative overflow-hidden mb-8">
            {state.appState.doctor_status === 'on-break' && (
              <div className="absolute inset-0 bg-yellow-500/10 backdrop-blur-[4px] flex items-center justify-center z-10 border-8 border-yellow-400 rounded-[2.5rem]">
                <div className="bg-white px-10 py-6 rounded-full shadow-2xl flex items-center gap-4 animate-in zoom-in duration-200">
                  <Coffee className="w-8 h-8 text-yellow-600" />
                  <span className="text-3xl font-black text-yellow-700">Doctor is on Break</span>
                </div>
              </div>
            )}
            
            <p className="text-slate-500 font-bold tracking-[0.2em] uppercase mb-6">Current Token</p>
            {activeToken ? (
              <>
                <h2 className="text-[8rem] leading-none font-black text-slate-900 tracking-tighter mb-4">
                  #{activeToken.token_id}
                </h2>
                <p className="text-4xl font-semibold text-slate-600">{activeToken.patient_name}</p>
                <div className="mt-8 inline-flex items-center px-6 py-2.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 font-bold text-lg">
                  <Activity className="w-5 h-5 mr-3 animate-pulse" />
                  In Consultation
                </div>
              </>
            ) : (
              <div className="py-24">
                <h2 className="text-5xl text-slate-300 font-black">No Active Patient</h2>
                <p className="text-xl text-slate-400 mt-4 font-medium">Call next patient or add a walk-in to start</p>
              </div>
            )}
          </div>

          {/* Massive Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={handleNextPatient}
              disabled={waitingTokens.length === 0 && !activeToken}
              className="group flex flex-col items-center justify-center gap-3 p-8 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-[2rem] transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-10 h-10 group-hover:translate-x-2 transition-transform" />
              <span className="font-black text-2xl uppercase tracking-wide">Next Patient</span>
            </button>
            
            <button 
              onClick={handleToggleBreak}
              className={`flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] transition-all shadow-sm hover:shadow-md ${
                state.appState.doctor_status === 'on-break' 
                  ? 'bg-yellow-100 border-4 border-yellow-400 text-yellow-800' 
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
            >
              <Coffee className="w-10 h-10" />
              <span className="font-black text-2xl uppercase tracking-wide">
                {state.appState.doctor_status === 'on-break' ? 'Resume' : 'Doc Break'}
              </span>
            </button>

            <button 
              onClick={handleAddWalkIn}
              className="flex flex-col items-center justify-center gap-3 p-8 bg-white hover:bg-slate-50 text-slate-700 border-4 border-slate-200 rounded-[2rem] transition-all shadow-sm hover:shadow-md"
            >
              <UserPlus className="w-10 h-10 text-slate-400" />
              <span className="font-black text-2xl uppercase tracking-wide">Add Walk-In</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE (30%) - Queue List */}
      <div className="flex-[3] bg-white border-l border-slate-200 flex flex-col h-screen sticky top-0 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-10">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3 text-slate-900">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-black tracking-tight">Queue List</h2>
          </div>
          <span className="bg-indigo-100 text-indigo-800 font-black px-4 py-1.5 rounded-full">
            {waitingTokens.length} Left
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {waitingTokens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-lg font-medium">No patients waiting in the queue.</p>
            </div>
          ) : (
            waitingTokens.map((token, idx) => (
              <div 
                key={token.token_id} 
                className="flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-100 text-slate-700 font-black text-2xl rounded-full flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors shrink-0">
                    #{token.token_id}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg line-clamp-1">{token.patient_name}</p>
                    <p className="text-sm font-medium text-slate-500">Queue Position: {idx + 1}</p>
                  </div>
                </div>
                
                <span className={`text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider shrink-0 ${
                  token.type === 'online' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}>
                  {token.type}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

