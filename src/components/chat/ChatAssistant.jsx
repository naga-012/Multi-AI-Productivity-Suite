import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  X, MessageSquare, Send, Sparkles, AlertCircle, Copy, Check, Trash2, 
  User, Bot, HelpCircle, Activity, HeartHandshake, Code, FileText 
} from 'lucide-react';

const ChatAssistant = ({ isOpen, onClose, activePatientContext }) => {
  const { token, API_URL, user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [persona, setPersona] = useState('General Clinical'); // General Clinical, Medical Writer, Code & Tech Support, Brainstorming Partner
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);

  const personas = [
    { name: 'General Clinical', label: 'Clinical Chat', icon: HeartHandshake, color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
    { name: 'Medical Writer', label: 'Medical Writer', icon: FileText, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
    { name: 'Code & Tech Support', label: 'Technical Code', icon: Code, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { name: 'Brainstorming Partner', label: 'Brainstorming', icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
  ];

  // Define macro buttons based on active persona
  const macros = {
    'General Clinical': [
      { label: 'Diabetic Retinopathy specs', text: 'What are the main clinical markers and screening intervals for Diabetic Retinopathy?' },
      { label: 'Glaucoma IOP levels', text: 'Explain the relationship between intraocular pressure (IOP) and progressive open-angle glaucoma.' }
    ],
    'Medical Writer': [
      { label: 'Draft John Doe Referral', text: 'Draft a vitreoretinal specialist referral letter for patient John Doe.' },
      { label: 'Patient Chart Summary', text: 'Draft a structured clinical patient summary for my records.' }
    ],
    'Code & Tech Support': [
      { label: 'Get High-Risk SQL', text: 'Generate an SQLite database query to retrieve all high-risk patients with glaucoma.' },
      { label: 'Task API Endpoint', text: 'Write a Node.js endpoint code template to query high priority tasks.' }
    ],
    'Brainstorming Partner': [
      { label: 'Explore Photopsia pain', text: 'Brainstorm differential diagnoses for a 70-year-old presenting with sudden photopsias and floaters.' }
    ]
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch session history
  const fetchHistory = async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/ai/chat/history?session_id=ocucare_main_thread`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setMessages(data);
        } else {
          // Add default welcome message
          setMessages([
            {
              role: 'assistant',
              content: `Hello ${user?.full_name || 'Doctor'}. I am your OcuCare Assistant. Open standard medical guidelines or ask me to draft clinical notes. Selecting a persona below will adjust my analytical response styles.`,
              timestamp: new Date().toISOString()
            }
          ]);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Could not load chat session logs.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim()) return;

    setError('');
    if (!textToSend) setInput('');

    // Prepend active patient context if present
    let finalPrompt = prompt;
    if (activePatientContext) {
      finalPrompt = `[Patient Context: Name=${activePatientContext.name}, Age=${activePatientContext.age}, Vision=${activePatientContext.visual_acuity_od} OD / ${activePatientContext.visual_acuity_os} OS, Risk=${activePatientContext.risk_tier}, History=${JSON.stringify(activePatientContext.medical_history)}] ${prompt}`;
    }

    // Optimistic local state update
    const userMsg = { role: 'user', content: prompt, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: finalPrompt,
          persona: persona,
          session_id: 'ocucare_main_thread'
        })
      });

      if (!res.ok) {
        throw new Error('AI Assistant connection timeout');
      }

      const reply = await res.json();
      
      // Update with exact response returned from server
      setMessages(prev => [...prev, { role: 'assistant', content: reply.content, timestamp: reply.timestamp }]);
    } catch (err) {
      setError(err.message || 'Connection lost to OcuCare assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearThread = async () => {
    if (!window.confirm('Delete all messages in this clinical chat thread?')) return;
    
    try {
      const res = await fetch(`${API_URL}/ai/chat/history?session_id=ocucare_main_thread`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages([
          {
            role: 'assistant',
            content: `Thread deleted. OcuCare Assistant is re-initialized in '${persona}' mode.`,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setError('Could not purge session history.');
    }
  };

  // Clipboard copy callback
  const handleCopyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- ZERO DEPENDENCY INLINE MARKDOWN PARSER ---
  const formatInline = (text) => {
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bp, bpIdx) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={bpIdx} className="font-extrabold text-white">{bp.slice(2, -2)}</strong>;
      }
      
      // Code blocks inside sentences
      const codeParts = bp.split(/(`.*?`)/g);
      return codeParts.map((cp, cpIdx) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return <code key={cpIdx} className="bg-slate-950 text-brand-400 font-mono px-1 py-0.5 rounded text-[11px] font-semibold">{cp.slice(1, -1)}</code>;
        }
        return cp;
      });
    });
  };

  const formatMessageContent = (text, msgIdx) => {
    if (!text) return null;
    
    // Check if message has context prefix and strip it visually for the user bubble
    let display = text;
    if (display.startsWith('[Patient Context:')) {
      const closingBracketIdx = display.indexOf(']');
      display = display.substring(closingBracketIdx + 1).trim();
    }

    const parts = display.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, pIdx) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const lang = match ? match[1] : '';
        const code = match ? match[2] : part.slice(3, -3);
        
        return (
          <div key={pIdx} className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
            <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">
              <span>{lang || 'Text'}</span>
              <button 
                onClick={() => handleCopyText(code, `${msgIdx}_${pIdx}`)}
                className="hover:text-white transition flex items-center gap-1 active:scale-95"
              >
                {copiedIndex === `${msgIdx}_${pIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedIndex === `${msgIdx}_${pIdx}` ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-slate-300 leading-relaxed whitespace-pre-wrap">{code.trim()}</pre>
          </div>
        );
      }
      
      const lines = part.split('\n');
      return (
        <div key={pIdx} className="space-y-2">
          {lines.map((line, lIdx) => {
            if (line.startsWith('### ')) {
              return <h3 key={lIdx} className="text-xs font-bold text-white mt-3 mb-1 uppercase tracking-wider">{line.slice(4)}</h3>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={lIdx} className="text-sm font-bold text-white mt-4 mb-2">{line.slice(3)}</h2>;
            }
            
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <ul key={lIdx} className="list-disc pl-5 text-xs text-slate-350 space-y-1">
                  <li>{formatInline(line.slice(2))}</li>
                </ul>
              );
            }
            
            const numMatch = line.match(/^(\d+)\.\s(.*)/);
            if (numMatch) {
              return (
                <ol key={lIdx} className="list-decimal pl-5 text-xs text-slate-350 space-y-1">
                  <li value={numMatch[1]}>{formatInline(numMatch[2])}</li>
                </ol>
              );
            }
            
            if (!line.trim()) return <div key={lIdx} className="h-1" />;
            
            return <p key={lIdx} className="text-xs text-slate-350 leading-relaxed">{formatInline(line)}</p>;
          })}
        </div>
      );
    });
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col transition-transform duration-300 transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-955 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center border border-brand-500/20">
            <Bot className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide uppercase">OcuCare Assistant</h2>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Workspace AI Copilot</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearThread}
            className="p-2 text-slate-500 hover:text-red-400 transition hover:bg-slate-800 rounded-xl"
            title="Clear Chat Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition hover:bg-slate-800 rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Banner */}
      {activePatientContext && (
        <div className="px-4 py-2 bg-brand-950/40 border-b border-brand-900/30 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 text-brand-400 font-semibold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Context: {activePatientContext.name}</span>
          </div>
          <span className="text-slate-500">Auto-injecting record metrics</span>
        </div>
      )}

      {/* Persona Selection */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/40 flex overflow-x-auto gap-1.5 scrollbar-thin select-none">
        {personas.map(p => {
          const Icon = p.icon;
          const isActive = persona === p.name;
          return (
            <button
              key={p.name}
              onClick={() => {
                setPersona(p.name);
                // Clear state helper errors
                setError('');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider shrink-0 transition ${
                isActive 
                  ? 'bg-slate-800 border-slate-700 text-white' 
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${p.color.split(' ')[0]}`} />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-slate-950/20">
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-900/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-normal">{error}</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isAI = msg.role === 'assistant';
          return (
            <div 
              key={idx} 
              className={`flex gap-3 max-w-[85%] ${
                isAI ? 'self-start mr-auto' : 'self-end ml-auto flex-row-reverse'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border text-slate-350 shadow-inner ${
                isAI 
                  ? 'bg-brand-500/10 border-brand-500/20 text-brand-400' 
                  : 'bg-slate-850 border-slate-750 text-slate-400'
              }`}>
                {isAI ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
              </div>
              <div className={`p-3.5 rounded-2xl text-xs space-y-1.5 shadow-sm leading-normal border ${
                isAI 
                  ? 'bg-slate-900 border-slate-800 text-slate-250 rounded-tl-none' 
                  : 'bg-brand-500 border-brand-600 text-white rounded-tr-none'
              }`}>
                {formatMessageContent(msg.content, idx)}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-[80%] self-start mr-auto">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 animate-bounce" />
            </div>
            <div className="p-3.5 bg-slate-900 border border-slate-800 text-slate-450 rounded-2xl rounded-tl-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce delay-150"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce delay-300"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Inputs and Macros Panel */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3">
        {/* Floating Quick Action Prompts */}
        {macros[persona] && (
          <div className="flex flex-wrap gap-1.5 pb-1 select-none">
            {macros[persona].map((macro, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(macro.text)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-semibold transition truncate max-w-xs"
              >
                {macro.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={loading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
            placeholder={`Query assistant in '${persona}' mode...`}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
