import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Sparkles, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchApplied: (query: string) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onSearchApplied,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiIntentResult, setAiIntentResult] = useState<{
    query: string;
    category?: string;
    intent?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setTranscript('');
      setAiIntentResult(null);
      setIsProcessing(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = isBn ? 'bn-BD' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = final || interim;
        setTranscript(text);
        if (final) {
          processVoiceTranscript(final);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setIsListening(false);
      }
    } else {
      setTranscript(isBn ? 'আপনার ব্রাউজারে ভয়েস রিকগনিশন সমর্থিত নয়।' : 'Speech recognition is not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen, isBn]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      setTranscript('');
      setAiIntentResult(null);
      try {
        recognitionRef.current.start();
      } catch {}
    }
  };

  const processVoiceTranscript = async (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    setIsProcessing(true);

    try {
      const { API_BASE, getAuthHeaders } = await import('@/shared/services/apiClient');
      const headers = await getAuthHeaders({ json: true });
      if (headers.Authorization) {
        const res = await fetch(`${API_BASE}/api/ai/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            role: 'voice_search_parser',
            message: `Extract the core search keyword, shopping intent, and category from this user voice query: "${clean}". Respond in valid JSON format: {"query": "extracted keyword", "category": "wholesale/retail/food/service", "intent": "search"}`
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.reply || '{}';
          const jsonMatch = reply.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setAiIntentResult({
              query: parsed.query || clean,
              category: parsed.category,
              intent: parsed.intent || 'search',
            });
            setIsProcessing(false);
            return;
          }
        }
      }
    } catch {
      // Fallback safely to raw speech transcript
    }

    // Fallback if AI parser fails or user is guest
    setAiIntentResult({
      query: clean,
      intent: 'search',
    });
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--pm-text)]">
                {isBn ? 'এআই ভয়েস সার্চ ও অ্যাসিস্ট্যান্ট' : 'AI Voice Search & Assistant'}
              </h3>
              <p className="text-[11px] text-[var(--pm-muted)]">
                {isBn ? 'আপনার পছন্দের পণ্য বা সেবা মুখে বলুন' : 'Speak naturally to search wholesale & retail'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice search"
            className="w-8 h-8 rounded-full bg-[var(--pm-surface)] text-[var(--pm-muted)] hover:text-[var(--pm-text)] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Microphone Waveform / Animation Indicator */}
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
              isListening
                ? 'bg-[var(--pm-danger)] text-white animate-pulse ring-8 ring-[var(--pm-danger)]/25'
                : 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] hover:scale-105'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>
          <p className="text-xs font-bold text-[var(--pm-muted)]">
            {isListening
              ? isBn ? 'শুনছি... বলুন' : 'Listening... Speak now'
              : isBn ? 'শুরু করতে মাইক্রোফোনে ট্যাপ করুন' : 'Tap microphone to speak'}
          </p>
        </div>

        {/* Transcript Box */}
        <div className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] min-h-[5rem] flex flex-col justify-center space-y-2">
          <span className="text-[10px] font-bold uppercase text-[var(--pm-muted)]">
            {isBn ? 'শনাক্তকৃত ভয়েস টেক্সট' : 'Recognized Transcript'}
          </span>
          <p className="text-sm font-semibold text-[var(--pm-text)] italic">
            {transcript || (isBn ? '...কথা বলা শুরু করুন...' : '...listening for voice input...')}
          </p>
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-[var(--pm-accent)] font-bold pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isBn ? 'এআই দিয়ে বিশ্লেষণ করা হচ্ছে...' : 'AI analyzing intent...'}</span>
            </div>
          )}
        </div>

        {aiIntentResult && (
          <div className="p-3.5 rounded-2xl bg-[var(--pm-success-soft)] border border-[var(--pm-success)]/30 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-[var(--pm-success)] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-[var(--pm-success)]">AI Search Target</p>
                <p className="text-xs font-black text-[var(--pm-text)] truncate">{aiIntentResult.query}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onSearchApplied(aiIntentResult.query);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[var(--pm-success)] text-white text-xs font-bold shrink-0 shadow-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isBn ? 'সার্চ করুন' : 'Apply Search'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
