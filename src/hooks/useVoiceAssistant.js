import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const useVoiceAssistant = () => {
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Check speech recognition browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setError('');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          setError('Microphone access denied. Please verify browser permissions settings.');
        } else {
          setError(`Speech hardware error: ${e.error}`);
        }
        setIsListening(false);
      };

      rec.onresult = async (event) => {
        const textResult = event.results[0][0].transcript;
        setTranscript(textResult);
        await processVoiceCommand(textResult);
      };

      recognitionRef.current = rec;
    }

    // Cleanup on unmount (Lifecycle sanitization)
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const startListening = () => {
    if (!supported || !recognitionRef.current) {
      setError('Web Speech Recognition API is not supported in this browser.');
      return;
    }
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Browser Text-To-Speech Synthesis speak launcher
  const speak = (text, rate = 1.0) => {
    if (!synthRef.current) return;
    
    // Cancel any active speak queues
    synthRef.current.cancel();

    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeaking(false);
    }
  };

  // Route vocal strings to dashboard actions
  const processVoiceCommand = async (rawText) => {
    if (!rawText) return;

    try {
      // Connect to OcuCare voice parsing api
      const res = await fetch(`${API_URL}/voice/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rawText })
      });

      if (!res.ok) throw new Error('Parser api failed.');
      const data = await res.json();

      const { command, patientName } = data;

      if (command === 'navigate_dashboard') {
        speak('Opening operations dashboard.');
        navigate('/');
      } 
      else if (command === 'search_patient') {
        speak(`Searching patient directory for ${patientName || 'profile'}.`);
        navigate(`/patients?search=${encodeURIComponent(patientName || '')}`);
      } 
      else if (command === 'read_summary') {
        // Read out summaries visible on the timeline notes page
        const notesElements = document.querySelectorAll('.timeline-note-text');
        if (notesElements.length > 0) {
          const notesText = Array.from(notesElements).map(el => el.innerText).join('. ');
          speak(`Reading visible consult notes: ${notesText}`);
        } else {
          speak("No patient timeline consult notes found on the screen to read.");
        }
      } 
      else if (command === 'run_scan_diagnosis') {
        // Trigger diagnose button if visible on scan page
        const diagnoseBtn = document.getElementById('run-scan-btn');
        if (diagnoseBtn) {
          speak('Initiating diagnostic AI scan compilation.');
          diagnoseBtn.click();
        } else {
          speak("AI Scan Portal buttons are not active on the current screen.");
        }
      } 
      else if (command === 'clear_filters') {
        // Trigger clear buttons or search inputs
        const clearBtn = document.getElementById('clear-filter-btn') || document.getElementById('reset-btn');
        if (clearBtn) {
          speak('Clearing workspace filters.');
          clearBtn.click();
        } else {
          speak("Filters reset controls are not active on the current screen.");
        }
      } 
      else {
        speak(`Recognized input: ${rawText}. Please speak a valid clinical macro command.`);
      }
    } catch (err) {
      console.error('Error processing command:', err);
      // Local fallback parsing in case of network issue
      const query = rawText.toLowerCase();
      if (query.includes('dashboard') || query.includes('home')) {
        navigate('/');
      } else if (query.includes('patient')) {
        navigate('/patients');
      }
    }
  };

  return {
    isListening,
    transcript,
    error,
    supported,
    speaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
};
