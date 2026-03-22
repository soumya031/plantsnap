import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface CareChatProps {
  plant: any;
  onClose: () => void;
}

const CareChat: React.FC<CareChatProps> = ({ plant, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: `Hi! I'm your AI Care Assistant. I'm here to help you with your **${plant.nickname}**. What would you like to know?` 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: `You are a helpful botanist and plant care assistant. 
          The user is asking about their plant: ${plant.commonName} (${plant.scientificName}).
          Context about the plant:
          - Family: ${plant.family}
          - Sunlight: ${plant.sunlight}
          - Watering: ${plant.wateringFrequency}
          - Difficulty: ${plant.difficulty}
          - Care Instructions: ${plant.careInstructions.join(', ')}
          
          Provide helpful, encouraging, and accurate advice. If the user asks something unrelated to plants, politely redirect them to plant care.`,
        },
      });

      // Send history
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chat.sendMessage({
        message: userMessage,
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting to my botanical database. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
        {/* Header */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold leading-none">Care Assistant</h3>
              <p className="text-xs opacity-80 mt-1">Chatting about {plant.nickname}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-emerald-50/30"
        >
          {messages.map((msg, i) => (
            <div 
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-emerald-600' : 'bg-white border border-emerald-100'}`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-emerald-600" />}
                </div>
                <div className={`p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-emerald-900 border border-emerald-100 rounded-tl-none'}`}>
                  <div className="prose prose-sm prose-emerald max-w-none">
                    <ReactMarkdown>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-2 items-center text-emerald-600 text-xs font-bold bg-white px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-emerald-100">
          <div className="flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about watering, soil, or leaves..."
              className="flex-1 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareChat;
