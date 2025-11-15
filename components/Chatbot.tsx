import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, LiveSession, Modality, LiveServerMessage } from '@google/genai';
import { Icon } from './Icon';
import { createPcmBlob, decode, decodeAudioData } from '../utils/audioUtils';

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  text: string;
  isUser: boolean;
  timestamp: string;
}

const DPWorldLogo: React.FC<{ className?: string }> = ({ className }) => (
    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQtgmeAwMM5bX1h37Kffmuo69wSF9HK0_PAB-svHVcrg&s=10" alt="DP World Logo" className={className} />
);

const UserAvatar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`rounded-full bg-gray-600 flex items-center justify-center ${className}`}>
      <Icon type="user" className="w-5 h-5 text-gray-300" />
    </div>
);

const CHAT_HISTORY_KEY = 'dpw-chat-history';

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // Voice Input (ASR)
  const voiceSessionRef = useRef<Promise<LiveSession> | null>(null);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const voiceMediaStreamRef = useRef<MediaStream | null>(null);
  const voiceScriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Voice Output (TTS)
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const hasSpokenGreeting = useRef(false);

  // --- Voice Output (TTS) Functions ---
  const playAudio = useCallback(async (base64Audio: string) => {
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioContext = outputAudioContextRef.current;
    
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
    const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.addEventListener('ended', () => {
        audioSourcesRef.current.delete(source);
    });
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    audioSourcesRef.current.add(source);
  }, []);

  const stopPlayback = useCallback(() => {
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const speakText = useCallback(async (text: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            await playAudio(base64Audio);
        }
    } catch (e) {
        console.error("Failed to generate speech:", e);
    }
  }, [playAudio]);
  
  // --- Voice Input (ASR) Functions ---
  const cleanupVoice = useCallback(() => {
    voiceScriptProcessorRef.current?.disconnect();
    voiceScriptProcessorRef.current = null;
    voiceAudioContextRef.current?.close();
    voiceAudioContextRef.current = null;
    voiceMediaStreamRef.current?.getTracks().forEach(track => track.stop());
    voiceMediaStreamRef.current = null;
    voiceSessionRef.current?.then(session => session.close()).catch(e => console.error("Error closing voice session:", e));
    voiceSessionRef.current = null;
    setIsRecording(false);
    setIsConnectingVoice(false);
  }, []);


  // --- Component Lifecycle & Chat Logic ---
  useEffect(() => {
    if (isOpen) {
      if (!hasSpokenGreeting.current) {
        // Use a slight delay to allow the opening animation to start smoothly
        setTimeout(() => speakText("Hello! How can I assist you with DP World services today?"), 300);
        hasSpokenGreeting.current = true;
      }
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const savedMessagesJSON = localStorage.getItem(CHAT_HISTORY_KEY);
        let restoredMessages: Message[] = [];
        
        if (savedMessagesJSON) {
            restoredMessages = JSON.parse(savedMessagesJSON);
        }

        if (restoredMessages.length === 0) {
            restoredMessages.push({ text: "Hello! How can I assist you with DP World services today?", isUser: false, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        }
        
        setMessages(restoredMessages);

        const chatHistory = restoredMessages.map(msg => ({
            role: msg.isUser ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          systemInstruction: `You are a friendly and helpful support assistant for DP World. Your primary role is to answer questions about container booking and related services. Be knowledgeable about the following key terms:

*   **DPW Reference Number:** This is a unique 7-digit number provided by DP World to identify a specific booking or container. Users need this number to start the booking process.
*   **Token Number:** This is a 6-digit security number used to authorize the container pickup. It's the second piece of information required after the DPW Reference Number.

Answer questions concisely about terminal operations, required documentation, and other related services. Keep your answers short and to the point.`,
          history: chatHistory,
        });

      } catch (e) {
        console.error("Failed to initialize or load chat:", e);
        setMessages([{ text: "Sorry, the chat service is currently unavailable.", isUser: false, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      }
    } else {
      // Cleanup audio resources when the chatbot is closed
      cleanupVoice();
      stopPlayback();
      if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
      }
      hasSpokenGreeting.current = false;
    }
  }, [isOpen, speakText, cleanupVoice, stopPlayback]);
  
  const handleToggleRecording = async () => {
    if (isRecording) {
      cleanupVoice();
      return;
    }

    setIsConnectingVoice(true);
    setInput('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceMediaStreamRef.current = stream;
      voiceAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      voiceSessionRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnectingVoice(false);
            setIsRecording(true);
            const source = voiceAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = voiceAudioContextRef.current!.createScriptProcessor(2048, 1, 1);
            voiceScriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              voiceSessionRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(voiceAudioContextRef.current!.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            const transcription = message.serverContent?.inputTranscription?.text;
            if (transcription) {
              setInput(transcription);
            }
          },
          onerror: (e) => {
            console.error('Voice input error:', e);
            cleanupVoice();
          },
          onclose: () => {
            cleanupVoice();
          },
        },
      });
    } catch (err) {
      console.error('Failed to start voice input:', err);
      setIsConnectingVoice(false);
    }
  };


  useEffect(() => {
    if (isOpen && messages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatRef.current) return;
    
    stopPlayback(); // Stop any greeting audio if user sends a message
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = { text: input, isUser: true, timestamp };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: input });
      const botMessage: Message = { text: response.text, isUser: false, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = { text: "I'm sorry, I encountered an error. Please try again.", isUser: false, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-scale-in-fast">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col relative overflow-hidden">
        <header className="flex items-center p-4 bg-gray-900 border-b border-gray-700">
          <DPWorldLogo className="w-8 h-8 mr-3" />
          <h2 className="text-xl font-bold text-white flex-1">Support Assistant</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2.5 ${msg.isUser ? 'justify-end' : 'justify-start'} ${!msg.isUser ? 'animate-slide-fade-in' : ''}`}>
              {!msg.isUser && <DPWorldLogo className="w-8 h-8 self-start flex-shrink-0" />}
              <div className={`flex flex-col max-w-[85%] ${msg.isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-white shadow-md ${msg.isUser ? 'bg-blue-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
                      <p className={`whitespace-pre-wrap ${!msg.isUser ? 'opacity-0 animate-text-fade-in' : ''}`}>{msg.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1.5 px-1">{msg.timestamp}</span>
              </div>
              {msg.isUser && <UserAvatar className="w-8 h-8 self-start flex-shrink-0" />}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start animate-slide-fade-in">
               <DPWorldLogo className="w-8 self-start" />
               <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-slate-700 rounded-bl-none flex items-center space-x-1.5 shadow-md">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-dot-pulse" style={{animationDelay: '0s'}}></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-dot-pulse" style={{animationDelay: '0.2s'}}></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-dot-pulse" style={{animationDelay: '0.4s'}}></span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-gray-900 border-t border-gray-700 flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Listening..." : "Type your message..."}
            className="flex-1 bg-gray-700 border-none rounded-full px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={isLoading || isRecording || isConnectingVoice}
          />
          <button 
            type="button" 
            onClick={handleToggleRecording}
            disabled={isLoading}
            className="p-3 rounded-full text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors flex-shrink-0"
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isConnectingVoice ? (
                <Icon type="loading" className="w-5 h-5 animate-spin" />
            ) : (
                <Icon type="microphone" className={`w-5 h-5 ${isRecording ? 'text-red-500' : 'text-gray-300'}`} />
            )}
          </button>
          <button type="submit" disabled={isLoading || isRecording || isConnectingVoice || !input.trim()} className="p-3 rounded-full bg-blue-600 text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex-shrink-0">
            <Icon type="send" className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
