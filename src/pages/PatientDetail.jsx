import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, Calendar, FileText, ChevronLeft, Plus, MessageSquare, 
  Activity, ShieldAlert, BadgeInfo, CheckCircle, Sparkles, Globe
} from 'lucide-react';

const PatientDetail = () => {
  const { id } = useParams();
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [noteLoading, setNoteLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranslateNote = (noteText) => {
    sessionStorage.setItem('ocucare_translate_buffer', noteText);
    navigate('/tools/translator');
  };

  const fetchPatientDetails = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [resPatient, resNotes] = await Promise.all([
        fetch(`${API_URL}/patients/${id}`, { headers }),
        fetch(`${API_URL}/patients/${id}/notes`, { headers })
      ]);

      if (!resPatient.ok) throw new Error('Patient record not found');
      if (!resNotes.ok) throw new Error('Notes failed to load');

      const patientData = await resPatient.json();
      const notesData = await resNotes.json();

      setPatient(patientData);
      setNotes(notesData);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve detailed patient files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [id, token]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setNoteLoading(true);
    try {
      const res = await fetch(`${API_URL}/patients/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newNote })
      });

      if (res.ok) {
        const addedNote = await res.json();
        setNotes(prev => [addedNote, ...prev]);
        setNewNote('');
      } else {
        throw new Error('Failed to save clinical note');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving clinical note.');
    } finally {
      setNoteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Record Error</h2>
        <p className="text-slate-400">{error || 'Requested patient profile could not be loaded.'}</p>
        <Link to="/patients" className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold">
          Return to Patients Explorer
        </Link>
      </div>
    );
  }

  // Acuity trend helper for visually graphing progress
  const visionValue = (acuity) => {
    // Mock values to draw visual acuity bars
    if (acuity.includes('20/200')) return 10;
    if (acuity.includes('20/120')) return 20;
    if (acuity.includes('20/100')) return 30;
    if (acuity.includes('20/80')) return 40;
    if (acuity.includes('20/70')) return 50;
    if (acuity.includes('20/60')) return 60;
    if (acuity.includes('20/50')) return 70;
    if (acuity.includes('20/40')) return 80;
    if (acuity.includes('20/30')) return 90;
    if (acuity.includes('20/25')) return 95;
    if (acuity.includes('20/20')) return 100;
    return 50;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Back link */}
      <div>
        <Link 
          to="/patients" 
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Patient Directory
        </Link>
      </div>

      {/* Header Profile summary */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 bg-slate-950 border border-slate-800 text-slate-400 rounded-2xl flex items-center justify-center shadow-inner">
            <User className="w-8 h-8 stroke-[1.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{patient.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                patient.risk_tier === 'High' 
                  ? 'bg-rose-500/10 text-rose-450 border-rose-500/20' 
                  : (patient.risk_tier === 'Medium' ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20')
              }`}>
                {patient.risk_tier} Risk
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              File #{patient.id} • {patient.gender} • {patient.age} years old • {patient.phone || 'No phone'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            to="/diagnose"
            state={{ selectedPatientId: patient.id }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-lg transition"
          >
            <Activity className="w-4 h-4" /> Trigger Diagnostic Scan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core metrics and history */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Ophthalmology Health Vitals */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" /> Ophthalmology Metrics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Visual Acuity Card */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visual Acuity Progression</p>
                <div className="flex items-baseline justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Right Eye (OD)</span>
                    <span className="text-2xl font-black text-white">{patient.visual_acuity_od}</span>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Left Eye (OS)</span>
                    <span className="text-2xl font-black text-white">{patient.visual_acuity_os}</span>
                  </div>
                </div>

                {/* Simulated Visual Acuity Graph Indicator */}
                <div className="space-y-2 pt-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>OD Visual acuity efficiency</span>
                      <span className="font-semibold">{visionValue(patient.visual_acuity_od)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-brand-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${visionValue(patient.visual_acuity_od)}%` }} 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>OS Visual acuity efficiency</span>
                      <span className="font-semibold">{visionValue(patient.visual_acuity_os)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-brand-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${visionValue(patient.visual_acuity_os)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Intraocular Pressures (IOP) Card */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Intraocular Pressures</p>
                <div className="flex items-baseline justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Right Eye (OD)</span>
                    <span className={`text-2xl font-black ${patient.iop_od > 21 ? 'text-rose-500' : 'text-emerald-400'}`}>
                      {patient.iop_od ? `${patient.iop_od} mmHg` : '--'}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Left Eye (OS)</span>
                    <span className={`text-2xl font-black ${patient.iop_os > 21 ? 'text-rose-500' : 'text-emerald-400'}`}>
                      {patient.iop_os ? `${patient.iop_os} mmHg` : '--'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-400 flex items-start gap-1.5 leading-normal">
                  <BadgeInfo className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Normal physiological range: 10-21 mmHg. Pressures exceeding 21 mmHg increase optic neuropathic risk (glaucoma markers).</span>
                </div>
              </div>
            </div>

            {/* Retinal Scan Link Display */}
            {patient.retinal_scan_path ? (
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-200">AI Retinal Scan Diagnostic Saved</p>
                    <p className="text-slate-500 mt-0.5">Mock Path: {patient.retinal_scan_path}</p>
                  </div>
                </div>
                <Link
                  to="/diagnose"
                  state={{ selectedPatientId: patient.id }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition"
                >
                  View Scan Analysis
                </Link>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between text-xs text-slate-400">
                <span>No retinal scans currently uploaded for this patient.</span>
                <Link
                  to="/diagnose"
                  state={{ selectedPatientId: patient.id }}
                  className="text-brand-400 hover:text-brand-350 font-semibold hover:underline"
                >
                  Upload Scan Now
                </Link>
              </div>
            )}
          </div>

          {/* Clinical visit/timeline notes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" /> Consultations & AI History Logs
            </h3>

            {/* Add Clinical Note Form */}
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Document a clinical finding, treatment recommendation, or patient compliance note..."
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={noteLoading || !newNote.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> {noteLoading ? 'Saving...' : 'Add Note to Timeline'}
                </button>
              </div>
            </form>

            {/* Notes List */}
            <div className="space-y-4 pt-2">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No historical notes registered.</p>
              ) : (
                <div className="relative border-l-2 border-slate-800 ml-3.5 pl-5 space-y-5">
                  {notes.map(note => (
                    <div key={note.id} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27.5px] top-1.5 w-3 h-3 rounded-full bg-slate-800 border-2 border-slate-950"></span>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-350">{note.clinician_name}</span>
                        <div className="flex items-center gap-3">
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                          <button
                            onClick={() => handleTranslateNote(note.text)}
                            className="flex items-center gap-1 text-brand-400 hover:text-brand-350 transition font-bold"
                          >
                            <Globe className="w-3 h-3" /> Translate Note
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-300 bg-slate-950/65 border border-slate-850 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Patient Profile Metadata sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-wider border-b border-slate-850 pb-2.5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" /> Patient Dossier
            </h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Medical History Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.medical_history.map((tag, idx) => (
                    <span key={idx} className="bg-slate-950 text-slate-300 border border-slate-850 px-2 py-0.5 rounded font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Clinical Notes Summary</span>
                <p className="text-slate-300 leading-normal bg-slate-950 border border-slate-850 p-3.5 rounded-xl">
                  {patient.notes || 'No notes summary documented.'}
                </p>
              </div>

              <div className="border-t border-slate-850 pt-4 space-y-3 text-slate-400">
                <div className="flex justify-between">
                  <span>Contact Email:</span>
                  <span className="font-medium text-slate-200">{patient.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone Number:</span>
                  <span className="font-medium text-slate-200">{patient.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Consultation:</span>
                  <span className="font-medium text-slate-200">{patient.last_visit || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
