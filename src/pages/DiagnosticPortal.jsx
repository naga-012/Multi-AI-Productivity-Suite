import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Upload, Activity, AlertTriangle, FileText, CheckCircle2, 
  HelpCircle, Eye, ArrowRight, ClipboardList, ShieldAlert
} from 'lucide-react';

const DiagnosticPortal = () => {
  const { token, API_URL } = useAuth();
  const location = useLocation();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  
  // File drag & drop states
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Simulation states
  const [diagnosing, setDiagnosing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const progressMessages = [
    "Preprocessing scan matrix & calibrating brightness...",
    "Segmenting retinal vasculature & capillary mapping...",
    "Tracing optic disc cup-to-disc margins...",
    "Analyzing macula pigment densities & drusen count...",
    "Registering pathology predictions into clinical database..."
  ];

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`${API_URL}/patients`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPatients(data);
          
          // Pre-select patient if passed in routing state
          if (location.state?.selectedPatientId) {
            setSelectedPatientId(location.state.selectedPatientId.toString());
          } else if (data.length > 0) {
            setSelectedPatientId(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to load patient records", err);
      }
    };

    fetchPatients();
  }, [token, location.state]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDiagnose = async () => {
    if (!selectedPatientId) {
      setError('Please select a patient before triggering analysis.');
      return;
    }
    if (!selectedFile) {
      setError('Please upload a valid fundus photograph or OCT scan.');
      return;
    }

    setError('');
    setResult(null);
    setDiagnosing(true);
    setProgressStep(0);

    // Simulate progress increments for the 3-second delay
    const interval = setInterval(() => {
      setProgressStep(prev => {
        if (prev < progressMessages.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 550);

    try {
      // Build form-data
      const formData = new FormData();
      formData.append('scan', selectedFile);

      const res = await fetch(`${API_URL}/patients/${selectedPatientId}/diagnose`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      clearInterval(interval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'AI Diagnosis calculation failed');
      }

      const report = await res.json();
      setResult(report);
    } catch (err) {
      setError(err.message || 'Connection lost to OcuCare Diagnostic Engine.');
    } finally {
      setDiagnosing(false);
      setProgressStep(0);
    }
  };

  const selectedPatient = patients.find(p => p.id.toString() === selectedPatientId);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">Ocular Diagnostic Portal</h1>
        <p className="text-slate-400 text-sm">Upload fundus photos or OCT scans to run AI-assisted predictive diagnostics.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 h-fit shadow-sm">
          <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-wider border-b border-slate-800 pb-2.5">
            Diagnostic Configuration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-450 uppercase tracking-wider mb-2">
                Patient Medical File
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => {
                  setSelectedPatientId(e.target.value);
                  setResult(null);
                }}
                disabled={diagnosing}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition disabled:opacity-50"
              >
                <option value="">Select a patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Age {p.age})</option>
                ))}
              </select>
            </div>

            {selectedPatient && (
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2 text-xs">
                <p className="font-semibold text-slate-300">Baseline Statistics</p>
                <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                  <span>Visual Acuity OD:</span>
                  <span className="font-semibold text-white text-right">{selectedPatient.visual_acuity_od}</span>
                  <span>Visual Acuity OS:</span>
                  <span className="font-semibold text-white text-right">{selectedPatient.visual_acuity_os}</span>
                  <span>Risk Status:</span>
                  <span className={`font-bold text-right ${
                    selectedPatient.risk_tier === 'High' ? 'text-rose-450' : (selectedPatient.risk_tier === 'Medium' ? 'text-amber-450' : 'text-emerald-450')
                  }`}>{selectedPatient.risk_tier}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Zone & Interactive Engine */}
        <div className="md:col-span-2 space-y-6">
          {/* Scan Uploader Block */}
          {!result && !diagnosing && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <label 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                  dragActive 
                    ? 'border-brand-500 bg-brand-500/5' 
                    : 'border-slate-800 bg-slate-950 hover:border-slate-750'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 mb-4 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">Drag and drop ocular image file here</p>
                    <p className="text-xs text-slate-500">Supports fundus cameras or optical coherence tomography (.png, .jpg)</p>
                  </div>
                )}
              </label>

              <button
                onClick={handleDiagnose}
                disabled={!selectedFile || !selectedPatientId}
                className="w-full mt-5 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg disabled:opacity-50 disabled:pointer-events-none transition flex items-center justify-center gap-2 text-sm"
              >
                <Activity className="w-4 h-4" /> Run Fast AI Diagnosis
              </button>
            </div>
          )}

          {/* Running Diagnostic Computation Screen */}
          {diagnosing && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-6 shadow-sm">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-slate-850"></div>
                <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
              </div>
              
              <div className="space-y-2">
                <p className="text-base font-bold text-white tracking-wide">Analyzing Eye Scan Matrix...</p>
                <p className="text-xs font-semibold text-brand-400 animate-pulse">{progressMessages[progressStep]}</p>
              </div>

              <div className="w-full max-w-sm mx-auto bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                <div 
                  className="bg-brand-500 h-full transition-all duration-300"
                  style={{ width: `${((progressStep + 1) / progressMessages.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Diagnosis Results Card */}
          {result && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">Diagnostic AI Clinical Report</h2>
                </div>
                <button 
                  onClick={() => {
                    setResult(null);
                    setSelectedFile(null);
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold hover:underline"
                >
                  Analyze New Scan
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Risk Gauge */}
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">AI Pathology Score</span>
                  <div className="relative flex items-center justify-center w-24 h-24">
                    <span className="text-2xl font-black text-rose-500">{result.risk_score}%</span>
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="40" 
                        stroke="#f43f5e" 
                        strokeWidth="6" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - result.risk_score / 100)}
                      />
                    </svg>
                  </div>
                  <span className={`inline-block mt-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                    result.new_risk_tier === 'High' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {result.new_risk_tier} Risk
                  </span>
                </div>

                {/* Pathology Details */}
                <div className="sm:col-span-2 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Identified Abnormalities</span>
                    <h4 className="text-sm font-bold text-white">{result.pathology}</h4>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Immediate Care Actions</span>
                    <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 text-xs text-slate-350 leading-relaxed whitespace-pre-line">
                      {result.action_items}
                    </div>
                  </div>
                </div>
              </div>

              {/* Automated productivity queue follow up alert */}
              <div className="p-4 bg-brand-950/40 border border-brand-800/30 rounded-xl flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-brand-300">Automated Follow-up Tasks Registered</p>
                  <p className="text-slate-400 leading-normal">
                    This medical report was written to the patient history timeline and a priority follow-up item was enqueued to the clinic task list.
                  </p>
                  <div className="pt-2 flex gap-3 font-semibold">
                    <Link to="/" className="text-brand-400 hover:text-brand-300 flex items-center gap-1">
                      Check Task Queue <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link to={`/patients/${selectedPatientId}`} className="text-brand-400 hover:text-brand-300 flex items-center gap-1">
                      View Patient Timeline <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPortal;
