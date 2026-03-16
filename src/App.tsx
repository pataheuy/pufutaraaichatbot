import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  History, 
  Menu, 
  MoreVertical, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  Sparkles,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { geminiService, Message } from './services/geminiService';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const stream = await geminiService.sendMessage(messages, userMessage);
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of stream) {
        const text = chunk.text || '';
        fullResponse += text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', content: fullResponse };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-white text-[#1f1f1f] overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 68 }}
        className="bg-[#f0f4f9] flex flex-col h-full transition-all duration-300 ease-in-out relative"
      >
        <div className="p-4 flex flex-col h-full">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-zinc-200 rounded-full w-fit mb-8 transition-colors"
          >
            <Menu size={24} />
          </button>

          <button 
            onClick={startNewChat}
            className={`flex items-center gap-3 bg-[#dde3ea] hover:bg-[#d3d9e0] transition-colors rounded-full p-3 mb-8 ${isSidebarOpen ? 'pr-6' : 'w-10 h-10 p-2'}`}
          >
            <Plus size={20} className="text-zinc-600" />
            {isSidebarOpen && <span className="text-sm font-medium text-zinc-600">Chat Baru</span>}
          </button>

          {isSidebarOpen && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <p className="px-4 text-xs font-semibold text-zinc-500 mb-4 uppercase tracking-wider">Terbaru</p>
              <div className="space-y-1">
                <div className="sidebar-item active">
                  <MessageSquare size={18} />
                  <span className="truncate">Percakapan Pufuatara</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto space-y-1">
            <div className="sidebar-item">
              <HelpCircle size={18} />
              {isSidebarOpen && <span>Bantuan</span>}
            </div>
            <div className="sidebar-item">
              <History size={18} />
              {isSidebarOpen && <span>Aktivitas</span>}
            </div>
            <div className="sidebar-item">
              <Settings size={18} />
              {isSidebarOpen && <span>Setelan</span>}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-white">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-medium text-zinc-700">Pufuatara AI</span>
            <div className="bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-500 uppercase">Pro</div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <Sparkles size={20} className="text-gemini-blue" />
            </button>
            <div className="w-8 h-8 bg-gemini-blue rounded-full flex items-center justify-center text-white text-sm font-medium">
              P
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <h2 className="text-5xl font-medium mb-12 text-center leading-tight">
                <span className="gemini-gradient-text">Halo, Pufuatara.</span>
                <br />
                <span className="text-zinc-300">Ada yang bisa saya bantu?</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full">
                {[
                  "Bantu saya menulis email profesional",
                  "Jelaskan konsep kuantum fisika",
                  "Ide hadiah untuk ulang tahun teman",
                  "Buat rencana perjalanan ke Bali"
                ].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-4 bg-[#f0f4f9] hover:bg-[#e1e6ed] rounded-xl text-left text-sm text-zinc-700 transition-colors h-24 flex flex-col justify-between"
                  >
                    <span>{suggestion}</span>
                    <Plus size={16} className="ml-auto text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-container">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <div key={idx} className={msg.role === 'user' ? 'user-message' : 'ai-message'}>
                    {msg.role === 'model' && (
                      <div className="sparkle-icon">
                        <Sparkles size={16} className="text-white" />
                      </div>
                    )}
                    <div className={msg.role === 'user' ? 'user-message-content' : 'ai-message-content'}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-600 ml-4 flex-shrink-0">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </AnimatePresence>
              {isLoading && messages[messages.length - 1].role === 'user' && (
                <div className="ai-message">
                  <div className="sparkle-icon animate-pulse">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div className="ai-message-content">
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
          <form onSubmit={handleSend} className="gemini-input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Masukkan perintah di sini"
              className="flex-1 bg-transparent border-none focus:ring-0 text-base py-1"
              disabled={isLoading}
            />
            <div className="flex items-center gap-2 text-zinc-600">
              <button type="button" className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <ImageIcon size={20} />
              </button>
              <button type="button" className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <Mic size={20} />
              </button>
              {input.trim() && (
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="p-2 text-gemini-blue hover:bg-blue-50 rounded-full transition-colors"
                >
                  <Send size={20} />
                </button>
              )}
            </div>
          </form>
          <p className="text-[11px] text-center text-zinc-500 mt-3">
            Pufuatara dapat menampilkan info yang tidak akurat, termasuk tentang orang, jadi periksa kembali responsnya. 
            <a href="#" className="underline ml-1">Privasi Anda dan Aplikasi Gemini</a>
          </p>
        </div>
      </main>
    </div>
  );
}
