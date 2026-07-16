import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Upload, FileText, CheckCircle2, ChevronRight, Clipboard, Download, Save,
  ArrowLeft, RefreshCw, Sparkles, AlertCircle, FileCheck, CheckSquare, Square
} from 'lucide-react';

const Summarizer = () => {
  const { token, API_URL } = useAuth();

  // File drag state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Simulation states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [summarizing, setSummarizing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  // Tab states
  const [activeTab, setActiveTab] = useState('summary'); // summary, points, actions
  const [checkedActions, setCheckedActions] = useState({});
  const [successToast, setSuccessToast] = useState('');

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setError('');
    // File validation limits
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'txt' && ext !== 'pdf' && ext !== 'docx') {
      setError('Invalid file format. Only .pdf, .docx, and .txt files are permitted.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('File is too large. OcuCare HIPAA uploads are restricted to less than 10MB.');
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const handleUploadAndProcess = async (fileToProcess) => {
    const file = fileToProcess || selectedFile;
    if (!file) return;

    setError('');
    setUploading(true);
    setUploadProgress(10);

    // Simulate upload progress bar tick
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 90) return prev + 15;
        clearInterval(progressInterval);
        return prev;
      });
    }, 150);

    try {
      let uploadData;

      if (file === 'sample_patient_history.txt') {
        // Special bypass for local seeded trial sandbox file
        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploading(false);
        setSummarizing(true);

        const res = await fetch(`${API_URL}/documents/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileId: 'sample_patient_history.txt',
            originalName: 'sample_patient_history.txt'
          })
        });

        if (!res.ok) throw new Error('AI extraction failed on local trial record.');
        const data = await res.json();
        setResult(data);
        return;
      }

      // Normal upload flow
      const formData = new FormData();
      formData.append('document', file);

      const resUpload = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      clearInterval(progressInterval);

      if (!resUpload.ok) {
        const errData = await resUpload.json();
        throw new Error(errData.error || 'Document upload failed.');
      }

      const uploadInfo = await resUpload.json();
      setUploadProgress(100);
      setUploading(false);
      setSummarizing(true);

      // Summarize phase
      const resSum = await fetch(`${API_URL}/documents/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileId: uploadInfo.fileId,
          originalName: uploadInfo.originalName
        })
      });

      if (!resSum.ok) {
        throw new Error('AI analysis computation failed.');
      }

      const summaryData = await resSum.json();
      setResult(summaryData);
      
      // Initialize checklist state
      const initialChecked = {};
      summaryData.summary.actionItems.forEach((_, idx) => {
        initialChecked[idx] = false;
      });
      setCheckedActions(initialChecked);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Hipaa secure gateway processing failure.');
      setUploading(false);
    } finally {
      setSummarizing(false);
    }
  };

  const handleActionToggle = (idx) => {
    setCheckedActions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Client-side Blob download builder
  const handleDownloadReport = () => {
    if (!result) return;
    const { summary, fileName } = result;

    const reportContent = `OCUCARE AI DOCUMENT SUMMARY REPORT
Source Document: ${fileName}
Generated: ${new Date().toLocaleString()}

=========================================
EXECUTIVE SUMMARY:
=========================================
${summary.executiveSummary}

=========================================
HIGHLIGHTED KEY POINTS:
=========================================
${summary.keyPoints.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}

=========================================
ACTION ITEMS CHECKLIST:
=========================================
${summary.actionItems.map((a, idx) => `[${checkedActions[idx] ? 'X' : ' '}] ${a}`).join('\n')}

-----------------------------------------
HIPAA COMPLIANT DIGITAL MEDICAL LOG
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OcuCare_AI_Summary_${fileName.split('.')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Document summary downloaded successfully.');
  };

  // Copy to clipboard with visual toast alerts
  const handleCopyToClipboard = () => {
    if (!result) return;
    const { summary } = result;
    const bulletPoints = summary.keyPoints.map((p, idx) => `• ${p}`).join('\n');
    const tasks = summary.actionItems.map((a, idx) => `- [ ] ${a}`).join('\n');

    const clipText = `Executive Summary:\n${summary.executiveSummary}\n\nKey Points:\n${bulletPoints}\n\nClinical Actions:\n${tasks}`;
    
    navigator.clipboard.writeText(clipText);
    showToast('AI summary copied to clipboard.');
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleSaveToDashboard = async () => {
    if (!result) return;
    const { summary } = result;
    const bulletPoints = summary.keyPoints.map((p, idx) => `• ${p}`).join('\n');
    const tasks = summary.actionItems.map((a, idx) => `- [ ] ${a}`).join('\n');
    const content = `Executive Summary:\n${summary.executiveSummary}\n\nKey Points:\n${bulletPoints}\n\nClinical Actions:\n${tasks}`;

    try {
      const res = await fetch(`${API_URL}/dashboard/save-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetTitle: `${result.fileName} Summary`,
          toolSource: 'summarizer',
          contentPayload: content
        })
      });
      if (res.ok) {
        showToast('Summary successfully saved to administrative dashboard.');
      } else {
        throw new Error('Failed to save document asset.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save document asset to database.');
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-500 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-emerald-400/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Document Summarizer</h1>
        <p className="text-slate-400 text-sm">Extract structured parameters, clinical guidelines, and visual field notes from patients records.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Extraction Error</p>
            <p className="text-red-300 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* State A: Upload & Drag zone */}
      {!result && !uploading && !summarizing && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
            <label
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition select-none ${
                dragActive 
                  ? 'border-brand-500 bg-brand-500/5' 
                  : 'border-slate-800 bg-slate-950 hover:border-slate-750'
              }`}
            >
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              
              <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 mb-4">
                <Upload className="w-6 h-6 animate-pulse" />
              </div>
              
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-200">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-1 text-slate-400">
                  <p className="text-sm font-bold text-slate-200">Drag & drop patient chart report</p>
                  <p className="text-xs text-slate-500">Supports text documents, Word files, or PDFs (.txt, .pdf, .docx)</p>
                </div>
              )}
            </label>

            <button
              onClick={() => handleUploadAndProcess()}
              disabled={!selectedFile}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" /> Analyze and Extract Data
            </button>
          </div>

          {/* Sandbox seed testing quick trigger */}
          <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-450">
              <FileCheck className="w-4 h-4 text-brand-400" />
              <span>Sandbox Testing: Use pre-seeded clinical trial patient log.</span>
            </div>
            <button
              onClick={() => handleUploadAndProcess('sample_patient_history.txt')}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-brand-400 hover:text-brand-300 font-semibold rounded-lg transition"
            >
              Run Seed Test
            </button>
          </div>
        </div>
      )}

      {/* Loading states */}
      {(uploading || summarizing) && (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-md">
          <div className="relative w-12 h-12 mx-auto">
            <RefreshCw className="w-12 h-12 text-brand-500 animate-spin stroke-[1.5]" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {uploading ? 'Uploading Secure Dossier...' : 'AI Processing Content Extract...'}
            </h3>
            <p className="text-xs text-slate-500">
              {uploading ? `Transferring secure blocks: ${uploadProgress}%` : 'Segmenting text patterns & mapping differential diagnoses...'}
            </p>
          </div>

          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-850">
            <div 
              className="bg-brand-500 h-full transition-all duration-300"
              style={{ width: `${uploading ? uploadProgress : 80}%` }}
            />
          </div>
        </div>
      )}

      {/* State B: Split screen workspace */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px] items-stretch">
          
          {/* Left panel: Parsed text viewer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{result.fileName}</h3>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">HIPAA SECURE SOURCE</span>
                </div>
              </div>
              
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Clear file
              </button>
            </div>

            {/* Plain-text scrollable reader block */}
            <div className="flex-1 bg-slate-950 border border-slate-850 rounded-xl p-4 overflow-y-auto font-mono text-[11px] text-slate-350 leading-relaxed whitespace-pre-wrap">
              {result.fileText}
            </div>
          </div>

          {/* Right panel: AI Summaries panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 mb-4 gap-3 shrink-0">
              {/* Tab Selector Buttons */}
              <div className="flex gap-1.5 select-none bg-slate-950 p-1 rounded-xl border border-slate-855">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                    activeTab === 'summary' 
                      ? 'bg-slate-900 border border-slate-800 text-white' 
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('points')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                    activeTab === 'points' 
                      ? 'bg-slate-900 border border-slate-800 text-white' 
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Key Points
                </button>
                <button
                  onClick={() => setActiveTab('actions')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                    activeTab === 'actions' 
                      ? 'bg-slate-900 border border-slate-800 text-white' 
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Actions
                </button>
              </div>

              {/* Toolbar Buttons */}
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition"
                  title="Copy Summary details to Clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" /> Copy
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold shadow-md transition"
                  title="Download clinical summary file"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={handleSaveToDashboard}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-md transition"
                  title="Save summary to dashboard"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>

            {/* Tab content viewer */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-brand-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Executive Summary Overview</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/45 p-4 rounded-xl border border-slate-850/50">
                    {result.summary.executiveSummary}
                  </p>
                </div>
              )}

              {activeTab === 'points' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ocular & Systemic Key Points</span>
                  </div>
                  {result.summary.keyPoints.map((point, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl flex items-start gap-3 transition"
                    >
                      <ChevronRight className="w-4 h-4 text-brand-450 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-300 leading-normal">{point}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Required Medical Actions</span>
                  </div>
                  {result.summary.actionItems.map((action, idx) => {
                    const isChecked = checkedActions[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => handleActionToggle(idx)}
                        className={`p-3.5 border rounded-xl flex items-start gap-3 transition cursor-pointer select-none ${
                          isChecked 
                            ? 'bg-slate-950/40 border-slate-850 opacity-60' 
                            : 'bg-slate-950 border-slate-800 hover:border-slate-750'
                        }`}
                      >
                        <button className="mt-0.5 text-slate-400 hover:text-white transition">
                          {isChecked ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <div className="w-4 h-4 rounded-md border border-slate-600 bg-slate-950" />}
                        </button>
                        <p className={`text-xs text-slate-300 leading-normal ${isChecked ? 'line-through text-slate-500' : ''}`}>
                          {action}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Summarizer;
