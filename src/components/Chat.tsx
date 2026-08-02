import React, { useState, useEffect, useRef } from 'react';
import { db, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, FirebaseUser } from '../firebase';
import { Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  user: FirebaseUser | null;
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'global_chat'), orderBy('createdAt', 'asc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'global_chat'), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.userId === user?.uid ? 'flex-row-reverse' : ''}`}
          >
            <img 
              src={msg.userPhoto || 'https://picsum.photos/seed/user/40/40'} 
              alt="" 
              className="w-8 h-8 rounded-full border border-psy-cyan/30" 
              referrerPolicy="no-referrer"
            />
            <div className={`max-w-[70%] ${msg.userId === user?.uid ? 'items-end' : 'items-start'} flex flex-col`}>
              <span className="text-[9px] text-gray-500 mb-1">{msg.userName}</span>
              <div className={`p-3 rounded-2xl text-xs ${
                msg.userId === user?.uid 
                  ? 'bg-psy-purple/20 border border-psy-purple/30 text-white rounded-tr-none' 
                  : 'bg-white/10 border border-white/10 text-gray-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={user ? "Diga algo para a tribo..." : "Faça login para conversar"}
          disabled={!user}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-xs focus:outline-none focus:border-psy-cyan/50 disabled:opacity-50"
        />
        <button 
          type="submit"
          disabled={!user || !newMessage.trim()}
          className="p-2 bg-psy-cyan/20 border border-psy-cyan/50 rounded-xl text-psy-cyan hover:bg-psy-cyan/40 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
