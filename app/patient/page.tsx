'use client';

import { useStore, Clinic } from '@/lib/store';
import { useQueue } from '@/hooks/use-queue';
import { calculateWaitTime } from '@/lib/eta';
import { 
  Search, 
  MapPin, 
  Ambulance, 
  Bot, 
  ChevronRight, 
  ArrowLeft,
  Users,
  FileText,
  Home as HomeIcon,
  PhoneCall,
  Clock,
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';

// Bottom Navigation Component
const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => (
  <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around p-3 z-50 md:hidden">
    <button 
      onClick={() => setActiveTab('home')}
      className={`flex flex-col items-center gap-1 font-semibold text-xs ${activeTab === 'home' ? 'text-teal-600' : 'text-slate-400'}`}
    >
      <HomeIcon className="w-5 h-5" />
      <span>Tokens</span>
    </button>
    <button 
      onClick={() => setActiveTab('family')}
      className={`flex flex-col items-center gap-1 font-semibold text-xs ${activeTab === 'family' ? 'text-teal-600' : 'text-slate-400'}`}
    >
      <Users className="w-5 h-5" />
      <span>Family</span>
    </button>
    <button 
      onClick={() => setActiveTab('locker')}
      className={`flex flex-col items-center gap-1 font-semibold text-xs ${activeTab === 'locker' ? 'text-teal-600' : 'text-slate-400'}`}
    >
      <FileText className="w-5 h-5" />
      <span>Locker</span>
    </button>
  </div>
);

// Desktop Sidebar Navigation Component
const SidebarNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => (
  <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-6 min-h-screen">
    <div className="flex items-center gap-3 mb-10">
      <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-black text-xl">
        Q
      </div>
      <div>
        <span className="text-xl font-black text-slate-900 tracking-tight">Q-Health</span>
        <span className="block text-[10px] uppercase tracking-wider font-bold text-teal-600">Patient Portal</span>
      </div>
    </div>
    
    <div className="space-y-2 flex-1">
      <button 
        onClick={() => setActiveTab('home')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'home' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        <HomeIcon className="w-5 h-5" />
        <span>Queue & Booking</span>
      </button>
      <button 
        onClick={() => setActiveTab('family')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'family' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        <Users className="w-5 h-5" />
        <span>Family Circles</span>
      </button>
      <button 
        onClick={() => setActiveTab('locker')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'locker' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        <FileText className="w-5 h-5" />
        <span>Health Locker</span>
      </button>
    </div>

    <div className="pt-6 border-t border-slate-100">
      <Link 
        href="/hospital" 
        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-xl text-xs font-bold transition"
      >
        <span>Hospital Staff Portal</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

type FamilyMember = {
  id: string;
  name: string;
  relation: string;
  age: number;
};

type HealthRecord = {
  id: string;
  title: string;
  doctor: string;
  date: string;
  category: 'Prescription' | 'Lab Report' | 'Discharge';
  fileSize: string;
};

export default function PatientPortal() {
  const { state, updateState } = useStore();
  const { addOnlineBooking, pushBackOneSlot, isSupabaseConnected } = useQueue();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [pushBackNotice, setPushBackNotice] = useState<string | null>(null);
  
  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedClinicIdForBooking, setSelectedClinicIdForBooking] = useState<string | null>(null);
  const [customPatientName, setCustomPatientName] = useState('');
  
  // Modals for SOS and AI Triage
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [triageSymptom, setTriageSymptom] = useState('');
  const [triageResult, setTriageResult] = useState<{ advice: string; clinicRecommendation: string } | null>(null);

  // Family Members State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Arun Kumar', relation: 'Self (Primary)', age: 34 },
    { id: '2', name: 'Meera Arun', relation: 'Spouse', age: 31 },
    { id: '3', name: 'Aarav Kumar', relation: 'Son', age: 5 },
  ]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('Parent');
  const [newMemberAge, setNewMemberAge] = useState('30');

  // Health Locker State
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([
    { id: '1', title: 'Consultation Prescription', doctor: 'Dr. Kavitha (OMR Health)', date: '14 Sep 2026', category: 'Prescription', fileSize: '1.2 MB PDF' },
    { id: '2', title: 'Complete Blood Count (CBC)', doctor: 'Apollo Diagnostics', date: '02 Sep 2026', category: 'Lab Report', fileSize: '2.4 MB PDF' },
  ]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newRecordTitle, setNewRecordTitle] = useState('');
  const [newRecordDoctor, setNewRecordDoctor] = useState('OMR Health Center');
  const [newRecordCategory, setNewRecordCategory] = useState<'Prescription' | 'Lab Report' | 'Discharge'>('Prescription');

  const handleOpenBookingModal = (clinicId: string) => {
    setSelectedClinicIdForBooking(clinicId);
    setCustomPatientName(familyMembers[0]?.name || 'Self');
    setShowBookingModal(true);
  };

  const confirmBooking = async (patientName: string) => {
    if (!selectedClinicIdForBooking) return;
    
    // Find next available token ID
    const nextTokenId = state.queue.length > 0 
      ? Math.max(...state.queue.map(q => q.token_id)) + 1 
      : 1;
    
    const assignedClinic = state.clinics.find(c => c.id === selectedClinicIdForBooking);
    const assignedDoc = state.doctors.find(d => d.clinic_id === selectedClinicIdForBooking);

    await addOnlineBooking({
      token_id: nextTokenId,
      token_number: nextTokenId,
      patient_name: patientName.trim(),
      type: 'online',
      is_walk_in: false,
      status: 'waiting',
      clinic_id: selectedClinicIdForBooking,
      doctor_id: assignedDoc?.id,
      doctor_name: assignedDoc?.name,
    });

    updateState({
      patient_token: nextTokenId,
      selected_clinic_id: selectedClinicIdForBooking,
    });
    
    setShowBookingModal(false);
  };

  const handlePushBack = async () => {
    if (!state.patient_token) return;
    const newToken = await pushBackOneSlot(state.patient_token, state.selected_clinic_id || undefined);
    if (newToken && newToken !== state.patient_token) {
      setPushBackNotice(`Pushed back 1 slot! Your new token is #${newToken}`);
      setTimeout(() => setPushBackNotice(null), 4000);
    } else {
      setPushBackNotice("You are already the last waiting patient in line!");
      setTimeout(() => setPushBackNotice(null), 4000);
    }
  };

  const handleAddFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const newMem: FamilyMember = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      relation: newMemberRelation,
      age: parseInt(newMemberAge) || 25,
    };
    setFamilyMembers(prev => [...prev, newMem]);
    setNewMemberName('');
    setShowAddMemberModal(false);
  };

  const handleAddHealthRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecordTitle.trim()) return;
    const newRec: HealthRecord = {
      id: Date.now().toString(),
      title: newRecordTitle.trim(),
      doctor: newRecordDoctor,
      date: 'Today',
      category: newRecordCategory,
      fileSize: '1.4 MB PDF',
    };
    setHealthRecords(prev => [newRec, ...prev]);
    setNewRecordTitle('');
    setShowUploadModal(false);
  };

  const handleRunTriage = (e: React.FormEvent) => {
    e.preventDefault();
    const query = (triageSymptom || searchQuery).toLowerCase();
    if (query.includes('heart') || query.includes('chest') || query.includes('pressure')) {
      setTriageResult({
        advice: 'Possible cardiovascular discomfort. Recommended immediate doctor assessment.',
        clinicRecommendation: 'OMR Health Center - Dr. Arul Kumar (Cardiology)',
      });
    } else if (query.includes('child') || query.includes('baby') || query.includes('infant') || query.includes('pediatric')) {
      setTriageResult({
        advice: 'Pediatric care recommended. Ensure hydration and temperature monitoring.',
        clinicRecommendation: 'Kovai Care Clinic - Dr. Priya Sundaram (Pediatrics)',
      });
    } else if (query.includes('skin') || query.includes('rash') || query.includes('itching')) {
      setTriageResult({
        advice: 'Dermatological symptoms detected. Avoid scratching or unverified topicals.',
        clinicRecommendation: 'Karapakkam Family Clinic - Dr. Rajesh V (Dermatology)',
      });
    } else {
      setTriageResult({
        advice: 'General clinical consultation advised for routine checkup and symptom assessment.',
        clinicRecommendation: 'OMR Health Center - Dr. Kavitha (General Medicine)',
      });
    }
  };

  // Filtered Clinics
  const filteredClinics = useMemo(() => {
    if (!searchQuery.trim()) return state.clinics;
    return state.clinics.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.doctor_name && c.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [state.clinics, searchQuery]);

  // ==========================================
  // TAB 2: FAMILY CIRCLES
  // ==========================================
  if (activeTab === 'family') {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center">
        <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col max-w-md w-full bg-slate-50 relative shadow-2xl overflow-hidden pb-20 md:pb-0">
          <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Family Circles</h1>
              <p className="text-xs text-slate-500 font-medium">Manage family profiles for fast token booking</p>
            </div>
            <button 
              onClick={() => setShowAddMemberModal(true)}
              className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl hover:bg-teal-100 transition flex items-center gap-1 font-bold text-xs"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            {familyMembers.map((member) => (
              <div 
                key={member.id} 
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-black text-lg flex items-center justify-center shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{member.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {member.relation} • {member.age} yrs
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedClinicIdForBooking(state.clinics[0]?.id || null);
                    confirmBooking(member.name);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Book Token
                </button>
              </div>
            ))}

            <div className="bg-teal-50/60 rounded-3xl p-6 border border-teal-100/80 text-center">
              <Users className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <h4 className="font-bold text-teal-900 text-sm">One Account, Whole Family</h4>
              <p className="text-xs text-teal-700 mt-1">
                You can book digital queue tokens for elders and kids without separate phone numbers.
              </p>
            </div>
          </div>

          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Add Member Modal */}
          {showAddMemberModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-lg">Add Family Member</h3>
                  <button onClick={() => setShowAddMemberModal(false)} className="p-1 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddFamilyMember} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={newMemberName} 
                      onChange={e => setNewMemberName(e.target.value)} 
                      placeholder="e.g. Ramesh Kumar" 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Relationship</label>
                    <select 
                      value={newMemberRelation} 
                      onChange={e => setNewMemberRelation(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Child">Child</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Age</label>
                    <input 
                      type="number" 
                      value={newMemberAge} 
                      onChange={e => setNewMemberAge(e.target.value)} 
                      required 
                      min="1" 
                      max="120"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500" 
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowAddMemberModal(false)}
                      className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // TAB 3: HEALTH LOCKER
  // ==========================================
  if (activeTab === 'locker') {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center">
        <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col max-w-md w-full bg-slate-50 relative shadow-2xl overflow-hidden pb-20 md:pb-0">
          <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Health Locker</h1>
              <p className="text-xs text-slate-500 font-medium">Digital records &amp; prescriptions</p>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl hover:bg-indigo-100 transition flex items-center gap-1 font-bold text-xs"
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            {healthRecords.map((record) => (
              <div 
                key={record.id} 
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {record.category}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{record.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {record.doctor} • {record.date}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                    {record.fileSize}
                  </span>
                </div>
              </div>
            ))}

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <h4 className="font-bold text-indigo-900 text-sm">Doctor Prescription Sync</h4>
              <p className="text-xs text-indigo-700 mt-1">
                Prescriptions issued by your doctor during your consultation are automatically saved here.
              </p>
            </div>
          </div>

          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-lg">Upload Medical Record</h3>
                  <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddHealthRecord} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Document Title</label>
                    <input 
                      type="text" 
                      value={newRecordTitle} 
                      onChange={e => setNewRecordTitle(e.target.value)} 
                      placeholder="e.g. Thyroid Profile Report" 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hospital / Lab</label>
                    <input 
                      type="text" 
                      value={newRecordDoctor} 
                      onChange={e => setNewRecordDoctor(e.target.value)} 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category</label>
                    <select 
                      value={newRecordCategory} 
                      onChange={e => setNewRecordCategory(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Prescription">Prescription</option>
                      <option value="Lab Report">Lab Report</option>
                      <option value="Discharge">Discharge Summary</option>
                    </select>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <span>Click or drag report PDF / image here</span>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowUploadModal(false)}
                      className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow"
                    >
                      Save Document
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW B: ACTIVE TOKEN TRACKER
  // ==========================================
  if (state.patient_token) {
    const clinic = state.clinics.find(c => c.id === state.selected_clinic_id) || state.clinics[0];
    const waitTime = calculateWaitTime(state.queue, clinic, state.patient_token);
    const myTokenDetails = state.queue.find(q => q.token_id === state.patient_token);
    
    // Find active token in this clinic
    const activeToken = state.queue.find(
      q => q.status === 'in-progress' && (!state.selected_clinic_id || q.clinic_id === state.selected_clinic_id)
    );

    // Patients ahead in queue
    const waitingAheadCount = state.queue.filter(
      q => (q.status === 'waiting' || q.status === 'in-progress') &&
           (!state.selected_clinic_id || q.clinic_id === state.selected_clinic_id) &&
           q.token_id < state.patient_token!
    ).length;

    const isMyTurnNow = activeToken?.token_id === state.patient_token;
    
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center">
        <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col max-w-md w-full bg-slate-50 relative shadow-2xl overflow-hidden pb-20 md:pb-0">
          {/* Header */}
          <div className="bg-white p-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => updateState({ patient_token: null })} 
                className="p-2 hover:bg-slate-100 rounded-2xl transition"
                title="Back to Booking"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="font-bold text-slate-900 text-sm leading-tight">{clinic.name}</h1>
                <p className="text-xs text-slate-500">{clinic.doctor_name || 'General OPD'}</p>
              </div>
            </div>

            <button 
              onClick={() => setShowSOSModal(true)}
              className="p-2.5 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition"
              title="Emergency SOS"
            >
              <Ambulance className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Notification */}
          {pushBackNotice && (
            <div className="mx-4 mt-4 p-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold text-center shadow-lg animate-in slide-in-from-top duration-200">
              {pushBackNotice}
            </div>
          )}

          {/* Status Card */}
          <div className="p-6 pb-2">
            <div className={`text-white rounded-3xl p-8 text-center shadow-xl relative overflow-hidden transition-colors ${
              isMyTurnNow ? 'bg-emerald-600 ring-4 ring-emerald-300' : 'bg-teal-600'
            }`}>
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <span className="text-teal-100 font-bold text-xs uppercase tracking-widest block mb-1">
                  Your Live Token
                </span>
                <h2 className="text-7xl font-black tracking-tighter mb-1">
                  #{state.patient_token}
                </h2>
                <p className="text-teal-100 font-medium text-sm mb-6">
                  Patient: <span className="font-bold text-white">{myTokenDetails?.patient_name || 'You'}</span>
                </p>

                <div className="pt-4 border-t border-teal-500/40">
                  <p className="text-teal-100 text-xs font-medium uppercase tracking-wider mb-1">
                    Dynamic Estimated Wait
                  </p>
                  {isMyTurnNow ? (
                    <div className="text-3xl font-black text-amber-200 animate-pulse">
                      IT&apos;S YOUR TURN NOW!
                    </div>
                  ) : state.appState.doctor_status === 'on-break' ? (
                    <div className="text-2xl font-bold text-amber-300">
                      Doctor on Break (~{waitTime}m)
                    </div>
                  ) : (
                    <div className="text-5xl font-black">
                      ~{waitTime} <span className="text-lg font-medium opacity-80">mins</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Tracker */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-900 text-base">Live Queue Tracker</h3>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                {waitingAheadCount} patients ahead
              </span>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
              {/* Active Node */}
              <div className="relative flex items-center gap-5">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 shadow-sm shrink-0 z-10 ${
                  activeToken ? 'bg-teal-500' : 'bg-slate-300'
                }`}>
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                </div>
                <div className="flex-1 bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
                  <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider mb-0.5">Now Serving</p>
                  <p className="font-black text-slate-900 text-lg">
                    {activeToken ? `Token #${activeToken.token_id}` : 'Preparing next token...'}
                  </p>
                  {activeToken && (
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{activeToken.patient_name}</p>
                  )}
                </div>
              </div>

              {/* In-Queue Count Node */}
              <div className="relative flex items-center gap-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-slate-200 shrink-0 z-10">
                  <div className="w-2 h-2 bg-slate-500 rounded-full" />
                </div>
                <div className="flex-1 px-3 py-2 bg-white/60 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">
                    Queue Position: <strong className="text-slate-800 font-bold">{waitingAheadCount + 1}</strong>
                  </p>
                </div>
              </div>

              {/* Patient's Node */}
              <div className="relative flex items-center gap-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-indigo-500 shadow-sm shrink-0 z-10">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <div className="flex-1 bg-indigo-50/80 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-0.5">Your Position</p>
                  <p className="font-black text-indigo-950 text-lg">Token #{state.patient_token}</p>
                  <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                    {myTokenDetails?.patient_name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-6 pt-0 space-y-3">
            <button 
              onClick={handlePushBack}
              className="w-full py-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition shadow-sm flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              Running Late? (Push back 1 slot)
            </button>

            <button 
              onClick={() => updateState({ patient_token: null })}
              className="w-full py-3 text-slate-400 hover:text-slate-600 text-xs font-semibold transition text-center"
            >
              Book Another Token or Change Clinic
            </button>
          </div>

          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW A: CLINIC SEARCH & BOOKING SCREEN
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col max-w-md w-full bg-slate-50 relative shadow-2xl overflow-hidden pb-20 md:pb-0">
        
        {/* Header & Triage */}
        <div className="bg-white px-6 pt-8 pb-6 rounded-b-[2.5rem] shadow-sm relative z-10 border-b border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-full cursor-pointer transition">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
              <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">OMR Road, Chennai</p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/hospital"
                className="hidden sm:inline-flex text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition"
              >
                Hospital Portal →
              </Link>
              <button 
                onClick={() => setShowSOSModal(true)}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3.5 py-2 rounded-full font-black text-xs transition"
              >
                <Ambulance className="w-4 h-4" />
                <span>SOS</span>
              </button>
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Find Care</h1>
          <p className="text-slate-500 text-xs mt-1 mb-5 font-medium">
            Book live digital tokens and track your exact queue position.
          </p>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search clinic, doctor or symptom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium text-slate-800 text-xs"
              />
            </div>
            <button 
              onClick={() => setShowTriageModal(true)}
              className="flex items-center justify-center px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl transition shrink-0 border border-indigo-100 text-xs font-bold gap-1.5"
              title="Seva AI Triage"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Triage</span>
            </button>
          </div>
        </div>

        {/* Clinic List */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {filteredClinics.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-100">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No matching clinics found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query</p>
            </div>
          ) : (
            filteredClinics.map(clinic => {
              // Calculate waiting patients for this clinic
              const waitingCount = state.queue.filter(
                q => (q.status === 'waiting' || q.status === 'in-progress') &&
                     (!q.clinic_id || q.clinic_id === clinic.id)
              ).length;
              const estWaitTime = waitingCount * (clinic.base_consult_time || 10);

              return (
                <div key={clinic.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{clinic.name}</h3>
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {clinic.location}
                      </p>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-600">{clinic.base_consult_time}m/pt</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4 bg-teal-50/60 p-3 rounded-2xl border border-teal-100/50">
                    <div className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
                    </div>
                    <p className="text-xs font-bold text-teal-800">
                      Estimated Wait: ~{estWaitTime} mins 
                      <span className="text-teal-600 font-medium ml-1">({waitingCount} in line)</span>
                    </p>
                  </div>

                  <button 
                    onClick={() => handleOpenBookingModal(clinic.id)}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow"
                  >
                    Book Digital Token <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Booking Modal Overlay */}
        {showBookingModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-900">Book Token Spot</h3>
                <button onClick={() => setShowBookingModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Select Patient Profile
                  </label>
                  <div className="space-y-2 mb-3">
                    {familyMembers.map(mem => (
                      <button
                        key={mem.id}
                        type="button"
                        onClick={() => setCustomPatientName(mem.name)}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                          customPatientName === mem.name 
                            ? 'bg-teal-50 border-teal-500 text-teal-800' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{mem.name} ({mem.relation})</span>
                        {customPatientName === mem.name && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                      </button>
                    ))}
                  </div>

                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Or Enter Custom Name
                  </label>
                  <input
                    type="text"
                    value={customPatientName}
                    onChange={e => setCustomPatientName(e.target.value)}
                    placeholder="e.g. Arun Kumar"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 py-3 text-slate-500 hover:text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={() => confirmBooking(customPatientName || 'Patient')}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow"
                  >
                    Confirm &amp; Join Queue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOS Emergency Modal */}
        {showSOSModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border-2 border-rose-200 text-center animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <Ambulance className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-rose-600">Emergency Medical SOS</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6 font-medium">
                For life-threatening emergencies, dial emergency services immediately.
              </p>

              <div className="space-y-3 mb-6">
                <a 
                  href="tel:108"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-lg shadow-lg transition"
                >
                  <PhoneCall className="w-6 h-6" /> Call 108 Ambulance
                </a>
                <a 
                  href="tel:112"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-sm transition"
                >
                  National Emergency (112)
                </a>
              </div>

              <button 
                onClick={() => setShowSOSModal(false)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Close Emergency Screen
              </button>
            </div>
          </div>
        )}

        {/* AI Triage Modal */}
        {showTriageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-indigo-100 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Seva AI Medical Triage</h3>
                    <p className="text-[10px] text-slate-400">Instant symptom routing assistant</p>
                  </div>
                </div>
                <button onClick={() => setShowTriageModal(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRunTriage} className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Describe Symptoms
                  </label>
                  <textarea 
                    value={triageSymptom} 
                    onChange={e => setTriageSymptom(e.target.value)}
                    placeholder="e.g. Mild chest pressure and shortness of breath for 1 hour..."
                    rows={3}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Analyze &amp; Suggest Clinic
                </button>
              </form>

              {triageResult && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl mb-4 space-y-2">
                  <p className="text-xs text-indigo-950 font-medium">{triageResult.advice}</p>
                  <div className="pt-2 border-t border-indigo-100/80">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      Recommended Specialist
                    </span>
                    <p className="text-xs font-bold text-indigo-900 mt-0.5">{triageResult.clinicRecommendation}</p>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowTriageModal(false)}
                className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Close Triage
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
