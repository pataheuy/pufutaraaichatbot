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
  Copy,
  Check,
  Moon,
  Sun,
  Trash2,
  X,
  Volume2,
  VolumeX,
  Globe,
  Shield,
  Info,
  LogOut,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { geminiService, Message } from './services/geminiService';

// Speech Recognition Type Declaration
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('pufuatara_chats');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('pufuatara_theme') === 'dark';
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ mimeType: string; data: string; url: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('pufuatara_model') || 'gemini-3.1-flash-lite-preview';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('pufuatara_chats', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pufuatara_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pufuatara_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('pufuatara_model', selectedModel);
  }, [selectedModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setSelectedImage({
        mimeType: file.type,
        data: base64Data,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSpeech = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda tidak mendukung pengenalan suara.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = input.trim();
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const newMessages: Message[] = [...messages, { 
      role: 'user', 
      content: userMessage || (currentImage ? "[Gambar]" : ""),
      image: currentImage ? { mimeType: currentImage.mimeType, data: currentImage.data } : undefined
    }];
    
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const stream = await geminiService.sendMessage(
        messages, 
        userMessage || "Apa yang ada di gambar ini?", 
        currentImage ? { mimeType: currentImage.mimeType, data: currentImage.data } : undefined,
        selectedModel
      );
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of stream) {
        const text = chunk.text || '';
        fullResponse += text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', content: fullResponse };
          return updated;
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
    if (confirm('Mulai chat baru? Riwayat saat ini akan dihapus.')) {
      setMessages([]);
      localStorage.removeItem('pufuatara_chats');
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300 bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3]">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 68 }}
        className="bg-[#f0f4f9] dark:bg-[#1e1f20] flex flex-col h-full transition-all duration-300 ease-in-out relative border-r border-transparent dark:border-zinc-800"
      >
        <div className="p-4 flex flex-col h-full">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-[#282a2c] rounded-full w-fit mb-8 transition-colors text-zinc-600 dark:text-zinc-300"
          >
            <Menu size={24} />
          </button>

          <button 
            onClick={startNewChat}
            className={`flex items-center gap-3 bg-[#dde3ea] dark:bg-[#37393b] hover:bg-[#d3d9e0] dark:hover:bg-[#4a4c4e] transition-colors rounded-full p-3 mb-8 ${isSidebarOpen ? 'pr-6' : 'w-10 h-10 p-2'}`}
          >
            <Plus size={20} className="text-zinc-600 dark:text-zinc-300" />
            {isSidebarOpen && <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Chat Baru</span>}
          </button>

          {isSidebarOpen && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <p className="px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">Terbaru</p>
              <div className="space-y-1">
                {messages.length > 0 ? (
                  <div className="sidebar-item active">
                    <MessageSquare size={18} />
                    <span className="truncate">Percakapan Saat Ini</span>
                  </div>
                ) : (
                  <p className="px-4 text-sm text-zinc-400 dark:text-zinc-500 italic">Belum ada chat</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-auto space-y-1">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="sidebar-item w-full"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {isSidebarOpen && <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>}
            </button>
            <button onClick={() => setShowHelp(true)} className="sidebar-item w-full">
              <HelpCircle size={18} />
              {isSidebarOpen && <span>Bantuan</span>}
            </button>
            <button onClick={() => setShowSettings(true)} className="sidebar-item w-full">
              <Settings size={18} />
              {isSidebarOpen && <span>Setelan</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-white dark:bg-[#131314]">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-medium text-zinc-700 dark:text-zinc-300">Pufuatara AI</span>
            <div className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-500 uppercase">Pro</div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
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
                <span className="text-zinc-300 dark:text-zinc-600">Ada yang bisa saya bantu?</span>
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
                    className="p-4 bg-[#f0f4f9] dark:bg-[#1e1f20] hover:bg-[#e1e6ed] dark:hover:bg-[#282a2c] rounded-xl text-left text-sm text-zinc-700 dark:text-zinc-300 transition-colors h-24 flex flex-col justify-between"
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
                    <div className={`${msg.role === 'user' ? 'user-message-content' : 'ai-message-content'} prose dark:prose-invert max-w-none group`}>
                      {msg.image && (
                        <img 
                          src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                          alt="Uploaded" 
                          className="max-w-xs rounded-lg mb-4 border border-zinc-200 dark:border-zinc-700"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      
                      {msg.role === 'model' && msg.content && (
                        <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => copyToClipboard(msg.content, idx)}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 transition-colors"
                            title="Salin jawaban"
                          >
                            {copiedId === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 ml-4 flex-shrink-0">
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
                      <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
          {selectedImage && (
            <div className="mb-4 relative w-fit">
              <img 
                src={selectedImage.url} 
                alt="Preview" 
                className="h-20 w-20 object-cover rounded-lg border-2 border-gemini-blue"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          <form onSubmit={handleSend} className="gemini-input-container">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Masukkan perintah di sini"
              className="flex-1 bg-transparent border-none focus:ring-0 text-base py-1 text-zinc-800 dark:text-zinc-200"
              disabled={isLoading}
            />
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <ImageIcon size={20} />
              </button>
              <button 
                type="button" 
                onClick={toggleSpeech}
                className={`p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse bg-red-50 dark:bg-red-900/20' : ''}`}
              >
                <Mic size={20} />
              </button>
              {(input.trim() || selectedImage || isLoading) && (
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="p-2 text-gemini-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
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

      {/* Modals */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#1e1f20] rounded-2xl max-w-lg w-full p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Info className="text-gemini-blue" /> Bantuan
                </h3>
                <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 text-zinc-600 dark:text-zinc-300">
                <p>Selamat datang di <strong>Pufuatara AI</strong>! Berikut cara menggunakannya:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Chat:</strong> Ketik pesan Anda di kotak input bawah.</li>
                  <li><strong>Gambar:</strong> Klik ikon gambar untuk mengunggah foto dan bertanya tentangnya.</li>
                  <li><strong>Suara:</strong> Klik ikon mikrofon untuk berbicara (hanya di browser yang mendukung).</li>
                  <li><strong>Mode Gelap:</strong> Gunakan tombol di sidebar untuk mengganti tema.</li>
                  <li><strong>Setelan:</strong> Ganti model AI atau hapus riwayat di menu Setelan.</li>
                </ul>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="mt-8 w-full bg-gemini-blue text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Mengerti
              </button>
            </motion.div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#1e1f20] rounded-2xl max-w-lg w-full p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Settings className="text-zinc-500" /> Setelan
                </h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Cpu size={16} /> Model AI
                  </label>
                  <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-[#f0f4f9] dark:bg-[#37393b] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-gemini-blue"
                  >
                    <option value="gemini-3.1-flash-lite-preview">Gemini Flash Lite (Cepat & Ringan)</option>
                    <option value="gemini-3.1-pro-preview">Gemini Pro (Cerdas & Kompleks)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Shield size={16} /> Keamanan & Data
                  </label>
                  <button 
                    onClick={() => {
                      if(confirm('Hapus semua riwayat chat?')) {
                        setMessages([]);
                        localStorage.removeItem('pufuatara_chats');
                        setShowSettings(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 size={16} /> Hapus Semua Riwayat
                  </button>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400 text-center">Pufuatara AI v1.2.0 • Powered by Google Gemini</p>
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="mt-8 w-full bg-zinc-800 dark:bg-zinc-700 text-white py-3 rounded-xl font-medium hover:bg-zinc-900 dark:hover:bg-zinc-600 transition-colors"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
