import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Mail, Calendar, FileText, TrendingUp, Sparkles, Clipboard, Check, Save,
  ExternalLink, PenTool, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';

const EmailWriter = () => {
  const { token, API_URL } = useAuth();

  // Configuration State
  const [archetype, setArchetype] = useState('Professional Email');
  const [keyInputs, setKeyInputs] = useState('');
  const [tone, setTone] = useState('Formal');
  const [length, setLength] = useState('Standard');
  
  // Simulation State
  const [generating, setGenerating] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const archetypesList = [
    { name: 'Professional Email', label: 'Professional Email', desc: 'Alerts, lab referrals, communications.', icon: Mail },
    { name: 'Leave Application', label: 'Leave Request', desc: 'Absences, clinical rotation time-off.', icon: Calendar },
    { name: 'Cover Letter', label: 'Cover Letter', desc: 'Residency apps, fellowship queries.', icon: FileText },
    { name: 'Business Proposal', label: 'Business Proposal', desc: 'Equipment bids, clinic financing proposals.', icon: TrendingUp }
  ];

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!keyInputs.trim()) return;

    setError('');
    setResultText('');
    setGenerating(true);

    try {
      const res = await fetch(`${API_URL}/documents/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          archetype,
          keyInputs,
          tone,
          length
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate document');
      }

      const data = await res.json();
      setResultText(data.document);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with OcuCare writer engine.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setSuccessToast('Draft copied to clipboard.');
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // MailTo link builder
  const getMailToLink = () => {
    if (!resultText) return '#';
    let subject = 'Clinical Update';
    let body = resultText;
    
    // Parse out subject if generated in the draft
    const subjectMatch = resultText.match(/^Subject:\s*(.*)/i);
    if (subjectMatch) {
      subject = subjectMatch[1];
      body = resultText.replace(/^Subject:\s*(.*)/i, '').trim();
    }
    
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSaveToDashboard = async () => {
    if (!resultText) return;
    try {
      const res = await fetch(`${API_URL}/dashboard/save-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetTitle: `${archetype} Draft`,
          toolSource: 'writer',
          contentPayload: resultText
        })
      });
      if (res.ok) {
        setSuccessToast('Document draft saved to administrative dashboard.');
        setTimeout(() => setSuccessToast(''), 3000);
      } else {
        throw new Error('Failed to save document asset.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save document asset to database.');
    }
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
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Email & Document Writer</h1>
        <p className="text-slate-400 text-sm">Create clinical referral emails, leave requests, cover letters, and equipment proposals.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        
        {/* Left Column: Configuration Sidebar */}
        <form onSubmit={handleGenerate} className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-5 shadow-sm h-fit">
          <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
            <PenTool className="w-4 h-4 text-brand-400" /> Document Configuration
          </h3>

          {/* Archetype Selector cards */}
          <div className="space-y-2.5">
            <span className="block text-[11px] font-semibold text-slate-450 uppercase tracking-wider">Document Archetype</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 select-none">
              {archetypesList.map(arch => {
                const Icon = arch.icon;
                const isSelected = archetype === arch.name;
                return (
                  <button
                    key={arch.name}
                    type="button"
                    onClick={() => {
                      setArchetype(arch.name);
                      setResultText('');
                    }}
                    className={`p-3 text-left border rounded-xl flex flex-col gap-1.5 transition ${
                      isSelected 
                        ? 'bg-brand-500/10 border-brand-500/30 text-white' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{arch.label}</p>
                      <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{arch.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context Details Textarea */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-450 uppercase tracking-wider">Core Prompt Details</label>
            <textarea
              value={keyInputs}
              onChange={(e) => setKeyInputs(e.target.value)}
              placeholder={
                archetype === 'Professional Email' ? 'Patient is a 65yo male, John Doe. Diagnose NPDR. Referring to Vitreoretinal Dr. Vance...' :
                archetype === 'Leave Application' ? 'Need to attend ocular surgical residency lectures from July 20 to July 24...' :
                archetype === 'Cover Letter' ? 'Applying to Chief Glaucoma Fellowship. 3 years research experience in RNFL thinning...' :
                'Need to upgrade clinical cameras to newer visual coherence OCT tools. Projected ROI 30% time saved...'
              }
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition"
              required
            />
          </div>

          {/* Tone & Length sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-450 uppercase tracking-wider">Stylistic Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="Formal">Formal</option>
                <option value="Empathetic">Empathetic</option>
                <option value="Direct">Direct</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-450 uppercase tracking-wider">Draft Length</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="Concise">Concise</option>
                <option value="Standard">Standard</option>
                <option value="Detailed">Detailed</option>
              </select>
            </div>
          </div>

          {/* Action Trigger button */}
          <button
            type="submit"
            disabled={generating || !keyInputs.trim()}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Assembling Document...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Generate Document Draft</span>
              </>
            )}
          </button>
        </form>

        {/* Right Column: Editor Workspace Panel */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col h-[580px] shadow-sm">
          <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Generated Draft Editor</h3>
            {resultText && (
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Formatted Document</span>
            )}
          </div>

          {/* Content state switch */}
          {resultText ? (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-850 rounded-xl p-4 overflow-y-auto font-serif text-xs text-slate-350 leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
              
              {/* Floating Action toolbar */}
              <div className="flex gap-2 shrink-0 select-none">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  <Clipboard className="w-4 h-4" /> Copy Draft
                </button>
                <button
                  onClick={handleSaveToDashboard}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
                {archetype === 'Professional Email' && (
                  <a
                    href={getMailToLink()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in Mail App
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center px-6">
              <HelpCircle className="w-12 h-12 stroke-[1] mb-2 text-slate-650" />
              <h4 className="text-sm font-bold text-slate-400">Workspace Empty</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                Choose a document archetype on the left, describe your core medical details, and run generation to begin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailWriter;
