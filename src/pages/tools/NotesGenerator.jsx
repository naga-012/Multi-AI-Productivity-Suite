import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BookOpen, Layers, Award, Clipboard, Trash2, CheckCircle2, 
  Sparkles, RefreshCw, ChevronRight, HelpCircle, ArrowRight, Play
} from 'lucide-react';

const NotesGenerator = () => {
  const { token, API_URL } = useAuth();

  // Ingestion states
  const [rawText, setRawText] = useState('');
  const [depth, setDepth] = useState('Standard Ledger');
  
  // Output data states
  const [nestedNotes, setNestedNotes] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [mindMapNodes, setMindMapNodes] = useState([]);
  
  // Interface tabs & flips
  const [activeTab, setActiveTab] = useState('bullets'); // bullets, flashcards, mindmap
  const [flippedCards, setFlippedCards] = useState([]);  // IDs of flipped cards
  
  const [processing, setProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [error, setError] = useState('');

  const depthOptions = ['Concise Brief', 'Standard Ledger', 'Exhaustive Review'];

  const handleTransform = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setError('');
    setNestedNotes([]);
    setFlashcards([]);
    setMindMapNodes([]);
    setFlippedCards([]);
    setProcessing(true);

    try {
      const res = await fetch(`${API_URL}/notes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rawText,
          depth
        })
      });

      if (!res.ok) {
        throw new Error('Notes generator compiler error.');
      }

      const data = await res.json();
      setNestedNotes(data.nestedNotes);
      setFlashcards(data.flashcards);
      setMindMapNodes(data.mindMapNodes);
      setActiveTab('bullets'); // default to bullets view
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with notes harvester.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePreloadGlaucoma = () => {
    setRawText(`Glaucoma is characterized by elevated intraocular pressure leading to optic nerve damage. Standard treatment pathways prioritize prostaglandin analogs like Latanoprost to enhance uveoscleral outflow, followed by beta-blockers like Timolol to reduce aqueous humor production. In advanced refractory cases, laser trabeculoplasty or surgical trabeculectomy may be required.`);
  };

  const handleClear = () => {
    setRawText('');
    setNestedNotes([]);
    setFlashcards([]);
    setMindMapNodes([]);
    setFlippedCards([]);
    setError('');
  };

  const handleCopyLedger = () => {
    if (nestedNotes.length === 0) return;

    let ledgerText = `=== OCUCARE CLINICAL NOTES HARVESTER ===\n\n`;
    
    ledgerText += `--- STRUCTURED BULLET POINTS ---\n`;
    nestedNotes.forEach(note => {
      ledgerText += `- ${note.replace(/\*\*/g, '')}\n`;
    });
    
    ledgerText += `\n--- FLASHCARDS ---\n`;
    flashcards.forEach(card => {
      ledgerText += `Q: ${card.front}\nA: ${card.back}\n\n`;
    });
    
    ledgerText += `--- MIND MAP RELATIONSHIPS ---\n`;
    mindMapNodes.forEach(node => {
      const parentLabel = node.parentId ? `(Parent: ${node.parentId})` : '(Root)';
      ledgerText += `${node.label} ${parentLabel}\n`;
    });

    navigator.clipboard.writeText(ledgerText);
    setSuccessToast('Entire study ledger copied to clipboard.');
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const toggleCardFlip = (id) => {
    if (flippedCards.includes(id)) {
      setFlippedCards(flippedCards.filter(cId => cId !== id));
    } else {
      setFlippedCards([...flippedCards, id]);
    }
  };

  // Helper render to print nested HTML bolds
  const renderNoteText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Recursive Mind Map visualizer outlines generator
  const renderMindMapTree = (parentId = null, depthLevel = 0) => {
    const children = mindMapNodes.filter(node => node.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className={`space-y-3.5 ${depthLevel > 0 ? 'pl-6 border-l border-slate-800 ml-3 py-1' : ''}`}>
        {children.map(node => (
          <div key={node.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
              <span className={`font-mono text-xs ${depthLevel === 0 ? 'text-white font-bold' : 'text-slate-350'}`}>
                {node.label}
              </span>
            </div>
            {renderMindMapTree(node.id, depthLevel + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast popup */}
      {successToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-500 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-emerald-400/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Notes Generator & Study Studio</h1>
        <p className="text-slate-400 text-sm">Paste lengthy medical publications, clinical diagnostic records, or transcripts to automatically distill high-value summaries.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Grid split-screen workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        
        {/* Left Column: Context ingestion window */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-5 shadow-sm">
          
          <div className="flex justify-between items-center">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Raw Input Transcript</span>
            <span className="text-[9px] font-bold text-slate-650 uppercase tracking-wider">{rawText.length} / 10000 chars</span>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste clinical paragraphs, case details, drug regimens, or transcripts to parse..."
            className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-sans text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-800 resize-none transition min-h-[220px]"
          />

          {/* Depth selection dropdown */}
          <div className="space-y-1.5 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Summary Depth</label>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              {depthOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePreloadGlaucoma}
              type="button"
              className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition uppercase tracking-wider"
            >
              Load Demo Case
            </button>
            <button
              onClick={handleTransform}
              disabled={processing || !rawText.trim()}
              className="flex-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Harvesting...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 animate-pulse" />
                  <span>Transform</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Output Studio Hub */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-850 rounded-2xl p-5 flex flex-col h-[520px] shadow-2xl relative">
          
          {/* Header tab buttons */}
          <div className="border-b border-slate-850 pb-3 mb-4 flex justify-between items-center shrink-0">
            <div className="flex bg-slate-900/65 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('bullets')}
                disabled={nestedNotes.length === 0}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeTab === 'bullets' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-355 disabled:opacity-30'
                }`}
              >
                📝 Bullet points
              </button>
              <button
                onClick={() => setActiveTab('flashcards')}
                disabled={flashcards.length === 0}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeTab === 'flashcards' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-355 disabled:opacity-30'
                }`}
              >
                🎴 Flashcards
              </button>
              <button
                onClick={() => setActiveTab('mindmap')}
                disabled={mindMapNodes.length === 0}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeTab === 'mindmap' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-355 disabled:opacity-30'
                }`}
              >
                🌿 Mind Map
              </button>
            </div>

            {/* Quick Actions */}
            {nestedNotes.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLedger}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider transition"
                >
                  <Clipboard className="w-3 h-3" /> Copy Ledger
                </button>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-850 hover:border-red-900 text-slate-450 hover:text-red-400 rounded text-[9px] font-bold uppercase tracking-wider transition"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            )}
          </div>

          {/* Tab content screens */}
          <div className="flex-1 overflow-auto min-h-0">
            {nestedNotes.length > 0 ? (
              
              // 1. Structured bullets tab
              activeTab === 'bullets' ? (
                <div className="space-y-4 p-2">
                  {nestedNotes.map((note, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl flex items-start gap-3">
                      <ChevronRight className="w-4 h-4 text-brand-450 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-300 leading-relaxed font-sans select-text">
                        {renderNoteText(note)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : 

              // 2. Interactive Flashcards Grid tab
              activeTab === 'flashcards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 select-none">
                  {flashcards.map(card => {
                    const isFlipped = flippedCards.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        onClick={() => toggleCardFlip(card.id)}
                        className={`h-36 border rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                          isFlipped 
                            ? 'bg-slate-900 border-slate-800 shadow-md' 
                            : 'bg-brand-950/15 border-brand-500/20 hover:border-brand-500/40 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            Card #{card.id}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isFlipped ? 'bg-slate-950 text-slate-400' : 'bg-brand-500/10 text-brand-400'
                          }`}>
                            {isFlipped ? 'Answer' : 'Question'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 font-semibold leading-relaxed text-center py-2">
                          {isFlipped ? card.back : card.front}
                        </p>

                        <span className="text-[8px] font-bold text-slate-600 text-center uppercase tracking-widest block">
                          Click to Flip
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : 

              // 3. Mind Map Hierarchy Outline view
              <div className="bg-slate-900/40 border border-slate-855 rounded-xl p-6 select-text overflow-x-auto min-h-[300px]">
                {renderMindMapTree(null)}
              </div>

            ) : (
              // Idle state view
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center px-6 h-full">
                <Layers className="w-12 h-12 stroke-[1] mb-2 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-400">Harvester Inactive</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                  Paste raw clinical case files on the left editor and hit Transform to render bullets, flashcards, or mind map branches.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default NotesGenerator;
