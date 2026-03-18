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
  Square,
  Volume2,
  VolumeX,
  Globe,
  Shield,
  Info,
  LogOut,
  Cpu,
  Play,
  Eye,
  EyeOff,
  Code as CodeIcon,
  Maximize2,
  Minimize2
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ mimeType: string; data: string; url: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite-preview');
  const [randomSuggestions, setRandomSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const suggestionsPool = [
    "Apa saja yang bisa kamu lakukan sebagai AI?",
    "Rekomendasi AI untuk mengedit video",
    "Bagaimana cara kerja model bahasa besar?",
    "Rekomendasi AI untuk membantu coding",
    "Apa perbedaan antara Gemini dan GPT?",
    "Bantu saya membuat prompt AI yang efektif",
    "Rekomendasi AI untuk desain grafis",
    "Bagaimana AI bisa membantu produktivitas?",
    "Jelaskan tentang etika dalam pengembangan AI",
    "Rekomendasi AI untuk riset akademik",
    "Cara menggunakan AI untuk belajar bahasa",
    "Apa itu Generative AI dan contohnya?",
    "Rekomendasi AI untuk menulis artikel",
    "Bagaimana masa depan AI menurutmu?",
    "Tips menggunakan AI untuk analisis data"
  ];

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length > 1 && e.key !== 'Backspace') return;
      
      inputRef.current?.focus();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const shuffled = [...suggestionsPool].sort(() => 0.5 - Math.random());
    setRandomSuggestions(shuffled.slice(0, 4));
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isStoppingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Auto-scroll disabled per user request to let user scroll manually
    // scrollToBottom();
  }, [messages]);

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
    setIsGenerating(true);
    isStoppingRef.current = false;

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
        if (isStoppingRef.current) break;
        const text = chunk.text || '';
        fullResponse += text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', content: fullResponse };
          return updated;
        });
        // Subtle scroll during generation
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    } catch (error) {
      if (!isStoppingRef.current) {
        console.error('Error sending message:', error);
        setMessages(prev => [...prev, { role: 'model', content: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }]);
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const stopGeneration = () => {
    isStoppingRef.current = true;
    setIsGenerating(false);
    setIsLoading(false);
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="flex h-screen overflow-hidden transition-colors duration-300 bg-white text-black"
    >
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 65 }}
        className="bg-zinc-50 flex flex-col h-full transition-all duration-300 ease-in-out relative border-r border-zinc-200"
      >
        <div className="p-4 flex flex-col h-full items-center">
          <div 
            className="p-2 rounded-none w-fit mb-4 text-zinc-600"
          >
            <Menu size={20} />
          </div>

          <button 
            onClick={() => setShowNewChatConfirm(true)}
            className="p-2 hover:bg-zinc-200 rounded-none transition-colors text-black mb-8"
            title="Chat Baru"
          >
            <Plus size={20} />
          </button>

          <div className="mt-auto space-y-4 w-full flex flex-col items-center pb-4">
            <button 
              onClick={() => setShowHelp(true)} 
              className={`flex items-center gap-3 w-full hover:bg-zinc-200 rounded-none transition-colors text-sm font-medium ${isSidebarOpen ? 'px-4 py-3' : 'p-1 justify-center'}`}
            >
              <HelpCircle size={34} />
              {isSidebarOpen && <span>Bantuan</span>}
            </button>
            <button 
              onClick={() => setShowSettings(true)} 
              className={`flex items-center gap-3 w-full hover:bg-zinc-200 rounded-none transition-colors text-sm font-medium ${isSidebarOpen ? 'px-4 py-3' : 'p-1 justify-center'}`}
            >
              <Settings size={34} />
              {isSidebarOpen && <span>Setelan</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex relative bg-white">
        <div className="flex-1 flex flex-col transition-all duration-500">
          {/* Top Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tighter text-black uppercase">Pufutara AI</span>
              <div className="bg-black px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-tighter">Pro</div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <Sparkles size={20} className="text-black" />
              </button>
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-sm font-black">
                P
              </div>
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center px-4">
                <motion.h2 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-3xl sm:text-5xl font-black mb-8 sm:mb-12 text-center leading-tight tracking-tighter uppercase"
                >
                  <span className="text-black">HALO, SAYA PUFUTARA AI.</span>
                  <br />
                  <span className="text-zinc-300">ADA YANG BISA DIBANTU?</span>
                </motion.h2>
                
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl w-full"
                >
                  {randomSuggestions.map((suggestion, i) => (
                    <button 
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="p-3 sm:p-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-2xl text-left text-zinc-800 transition-all h-[4.5rem] sm:h-[5.5rem] flex flex-col justify-between group"
                    >
                      <span className="font-medium line-clamp-2 text-[10px] sm:text-xs">{suggestion}</span>
                      <Plus size={14} className="ml-auto text-zinc-400 group-hover:text-black transition-colors" />
                    </button>
                  ))}
                </motion.div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full px-4 py-8">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 mb-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-black text-white' : 'bg-zinc-100 text-black'}`}>
                        {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                      </div>
                      <div className={`flex-1 max-w-[85%] sm:max-w-[60%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`group relative inline-block text-left p-3 sm:p-4 rounded-2xl transition-all duration-200 ${
                          msg.role === 'user' 
                            ? 'bg-white dark:bg-zinc-800 text-black dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600' 
                            : 'bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700'
                        } prose dark:prose-invert prose-p:last:mb-0 max-w-none text-sm sm:text-base`}>
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
                                const lang = match ? match[1] : '';
                                const codeContent = String(children).replace(/\n$/, '');

                                return !inline && match ? (
                                  <div className="relative group/code my-4">
                                    <div className="absolute right-2 top-2 flex gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                                      <button 
                                        type="button"
                                        onClick={() => copyToClipboard(codeContent, idx)}
                                        className="p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg transition-colors"
                                        title="Salin Kode"
                                      >
                                        {copiedId === idx ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                      </button>
                                    </div>
                                    <div className="rounded-xl overflow-hidden border border-zinc-200 bg-black">
                                      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-b bg-zinc-900 text-zinc-400 border-zinc-800">
                                        <span>{lang}</span>
                                      </div>
                                      <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={lang}
                                        PreTag="div"
                                        customStyle={{ 
                                          margin: 0, 
                                          borderRadius: 0, 
                                          padding: '1.5rem',
                                          background: 'transparent'
                                        }}
                                        {...props}
                                      >
                                        {codeContent}
                                      </SyntaxHighlighter>
                                    </div>
                                  </div>
                                ) : (
                                  <code className={`${className} bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-sm`} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        
                        {msg.role === 'model' && msg.content && (
                          <div className="mt-1 flex items-center gap-2 ml-1">
                            <button 
                              onClick={() => copyToClipboard(msg.content, idx)}
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider"
                              title="Salin jawaban"
                            >
                              {copiedId === idx ? (
                                <>
                                  <Check size={12} className="text-emerald-500" />
                                  <span className="text-emerald-500">Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </AnimatePresence>
                {isLoading && messages[messages.length - 1].role === 'user' && (
                  <div className="flex gap-4 mb-8">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex gap-1 mt-3">
                      <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                  className="h-20 w-20 object-cover rounded-lg border-2 border-black dark:border-white"
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
            
            <form onSubmit={handleSend} className="relative flex items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-4 py-2 focus-within:border-black dark:focus-within:border-white transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
              >
                <ImageIcon size={20} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya Pufutara..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm sm:text-base py-2 px-3 text-black dark:text-white placeholder-zinc-400"
                disabled={isLoading}
              />
              <div className="flex items-center gap-1">
                <button 
                  type="button" 
                  onClick={toggleSpeech}
                  className={`p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}
                >
                  <Mic size={20} />
                </button>
                {isGenerating ? (
                  <button 
                    type="button" 
                    onClick={stopGeneration}
                    className="p-2 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all"
                    title="Hentikan Generasi"
                  >
                    <Square size={20} fill="currentColor" />
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={(!input.trim() && !selectedImage) || isLoading}
                    className={`p-2 rounded-full transition-all ${(!input.trim() && !selectedImage) || isLoading ? 'text-zinc-300 dark:text-zinc-700' : 'text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
                  >
                    <Send size={20} />
                  </button>
                )}
              </div>
            </form>
            <p className="text-[10px] text-center text-zinc-400 mt-4 font-medium uppercase tracking-tighter">
              Pufutara AI • Modern Black & White Edition
            </p>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showNewChatConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-zinc-200"
            >
              <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Plus size={32} className="text-black" />
              </div>
              <h3 className="text-xl font-black text-center uppercase tracking-tighter mb-4">Mulai Chat Baru?</h3>
              <p className="text-zinc-500 text-center text-sm font-medium mb-8 leading-relaxed">
                Apakah anda yakin untuk membuat chat baru dan menghapus chat sekarang?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowNewChatConfirm(false)}
                  className="flex-1 px-4 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border border-zinc-200 hover:bg-zinc-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setMessages([]);
                    setShowNewChatConfirm(false);
                  }}
                  className="flex-1 px-4 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-black text-white hover:bg-zinc-800 transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-zinc-200 dark:border-zinc-900"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black tracking-tighter uppercase">Bantuan</h3>
                <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6 text-zinc-600 text-sm font-medium">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <p className="font-bold text-black mb-2 uppercase tracking-tight">Cara Penggunaan</p>
                  <p>Ketik pertanyaan Anda di kolom input di bawah. Anda juga bisa mengunggah gambar untuk dianalisis atau menggunakan suara.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-black uppercase text-xs tracking-widest">Analisis Gambar</p>
                      <p className="text-xs">Klik ikon gambar untuk mengunggah foto. Pufutara akan menjelaskan apa yang ada di dalamnya.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mic size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-black uppercase text-xs tracking-widest">Input Suara</p>
                      <p className="text-xs">Klik ikon mikrofon untuk berbicara. Pufutara akan mendengarkan dan mengetik untuk Anda.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center flex-shrink-0">
                      <CodeIcon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-black uppercase text-xs tracking-widest">Bantuan Kode</p>
                      <p className="text-xs">Pufutara sangat ahli dalam pemrograman. Minta bantuan untuk membuat website atau aplikasi.</p>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="mt-8 w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-zinc-200"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Setelan</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Konfigurasi Sistem</p>
                  </div>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-8">
                <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Pilih Mesin Kecerdasan</label>
                  <div className="space-y-3">
                    <div className="p-4 bg-white border-2 border-black rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Cpu size={20} className="text-black" />
                        <div>
                          <p className="font-black text-xs uppercase tracking-tight">Pufutara AI 1.0</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase">Aktif & Optimal</p>
                        </div>
                      </div>
                      <div className="w-4 h-4 rounded-full border-4 border-black"></div>
                    </div>
                    
                    <div className="p-4 bg-zinc-100/50 border border-zinc-200 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <Sparkles size={20} className="text-zinc-400" />
                        <div>
                          <p className="font-bold text-xs uppercase tracking-tight text-zinc-400">Pufutara AI 2.0</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase">Segera Hadir</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-[9px] text-zinc-400 font-bold uppercase tracking-widest text-center">Versi lain belum tersedia saat ini</p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Manajemen Data</p>
                  <button 
                    onClick={() => {
                      setMessages([]);
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 text-red-500 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-[0.98]"
                  >
                    <Trash2 size={18} /> Hapus Percakapan
                  </button>
                </div>
              </div>

              <div className="mt-10 flex gap-3">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-lg shadow-black/10"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
