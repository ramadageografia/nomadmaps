import React, { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { getNomadAdvice } from '../services/geminiService';
import { Festival } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface OracleProps {
  festivals: Festival[];
}

export default function Oracle({ festivals }: OracleProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const aiResponse = await getNomadAdvice(userMsg, festivals);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse || "O Oráculo está em silêncio profundo..." }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="psy-card p-4 bg-gradient-to-br from-psy-purple/20 to-psy-magenta/20 border-psy-magenta/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-psy-magenta/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-psy-magenta animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Oráculo do Nomad</h3>
            <p className="text-[10px] text-gray-400">Sabedoria ancestral guiada por IA</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center py-12 space-y-4"
            >
              <p className="text-xs text-gray-500 italic">"Onde a música encontra a alma, o caminho se revela..."</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Qual festival tem a vibe mais dark?", "Sugira um festival na Europa em Julho", "Melhor festival para iniciantes?"].map(q => (
                  <button 
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-[10px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:border-psy-magenta/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-psy-magenta/20 border border-psy-magenta/30 text-white rounded-tr-none' 
                  : 'bg-white/10 border border-white/10 text-gray-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white/10 border border-white/10 p-3 rounded-2xl rounded-tl-none">
                <Loader2 className="w-4 h-4 text-psy-magenta animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleAsk} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao Oráculo..."
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none focus:border-psy-magenta/50 transition-all"
        />
        <button 
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-psy-magenta hover:scale-110 transition-transform disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
