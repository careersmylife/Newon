


import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, Modality, FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';
import { BookingStep } from '../types';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

const DPW_REF_LENGTH = 7;
const TOKEN_LENGTH = 6;

const submitDpwReferenceNumber: FunctionDeclaration = {
  name: 'submitDpwReferenceNumber',
  parameters: {
    type: Type.OBJECT,
    description: 'Submits the 7-digit DPW reference number provided by the user.',
    properties: {
      number: {
        type: Type.STRING,
        description: `A string of ${DPW_REF_LENGTH} digits representing the DPW reference number.`,
      },
    },
    required: ['number'],
  },
};

const confirmDpwReference: FunctionDeclaration = {
  name: 'confirmDpwReference',
  parameters: {
    type: Type.OBJECT,
    description: "Confirms whether the previously stated 7-digit DPW reference number was correct.",
    properties: {
      isCorrect: {
        type: Type.BOOLEAN,
        description: "True if the user confirms the number is correct, false otherwise.",
      },
    },
    required: ['isCorrect'],
  },
};

const submitTokenNumber: FunctionDeclaration = {
  name: 'submitTokenNumber',
  parameters: {
    type: Type.OBJECT,
    description: 'Submits the 6-digit token number provided by the user.',
    properties: {
      number: {
        type: Type.STRING,
        description: `A string of ${TOKEN_LENGTH} digits representing the token number.`,
      },
    },
    required: ['number'],
  },
};

const confirmToken: FunctionDeclaration = {
  name: 'confirmToken',
  parameters: {
    type: Type.OBJECT,
    description: "Confirms whether the previously stated 6-digit token number was correct.",
    properties: {
      isCorrect: {
        type: Type.BOOLEAN,
        description: "True if the user confirms the number is correct, false otherwise.",
      },
    },
    required: ['isCorrect'],
  },
};

const confirmBooking: FunctionDeclaration = {
    name: 'confirmBooking',
    parameters: {
        type: Type.OBJECT,
        description: "Confirms whether to proceed with the booking after the user has confirmed both DPW Reference and Token numbers.",
        properties: {
            proceed: {
                type: Type.BOOLEAN,
                description: "True if the user confirms to proceed with the booking, false otherwise.",
            },
        },
        required: ['proceed'],
    },
};

export const useVoiceBooking = () => {
  const [bookingStep, setBookingStep] = useState<BookingStep>(BookingStep.IDLE);
  const [dpwRef, setDpwRef] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [containerNumber, setContainerNumber] = useState<string>('');
  const [containerLocation, setContainerLocation] = useState<string>('');
  const [gateInTime, setGateInTime] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const playAudio = useCallback(async (base64Audio: string) => {
    if (!outputAudioContextRef.current) {
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
    
    audioSourcesRef.current.add(source);
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
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


  const startBooking = useCallback(async () => {
    if (sessionPromiseRef.current) return;
    setBookingStep(BookingStep.CONNECTING);
    setError(null);
    setDpwRef('');
    setToken('');
    setContainerNumber('');
    setContainerLocation('');
    setGateInTime('');
    setVolume(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          tools: [{ functionDeclarations: [submitDpwReferenceNumber, confirmDpwReference, submitTokenNumber, confirmToken, confirmBooking] }],
          systemInstruction: `You are a helpful and efficient voice assistant for the DP World Container Booking System. Your role is to guide the user through a strict, multi-step booking process with confirmations.

          Follow this sequence precisely:
          1.  Welcome the user and ask for the 7-digit DPW Reference Number.
          2.  When the user provides the number, use the 'submitDpwReferenceNumber' function.
          3.  After the function is called, your next audio response MUST be to repeat the number back to the user, spelling out each digit, and then ask "Is that correct?". For example: "I have your DPW number as 1 2 3 4 5 6 7. Is that correct?".
          4.  Listen for the user's confirmation ("yes", "correct") or denial ("no", "wrong"). Call the 'confirmDpwReference' function with the result.
          5.  If the user confirms, your next audio response MUST be to ask for the 6-digit Token Number.
          6.  When the user provides the token, use the 'submitTokenNumber' function.
          7.  After the function is called, your next audio response MUST be to repeat the token back, spelling out each digit, and ask "Is that correct?".
          8.  Listen for the user's confirmation or denial. Call the 'confirmToken' function with the result.
          9.  If the user confirms the token, your next audio response MUST read back both numbers for a final confirmation. For example: "Okay, I have the DPW Reference as 1 2 3 4 5 6 7 and the Token as 9 8 7 6 5 4. Is that correct, and shall I proceed with the booking?".
          10. Listen for the user's final confirmation or denial. Call the 'confirmBooking' function with the result.
          11. If the user gives final confirmation, STOP. Do not generate any more audio. The system will take over.
          12. If the user denies a number at any point (including the final confirmation), your next audio response should be to apologize and ask them to restart by repeating the DPW number clearly.`,
        },
        callbacks: {
          onopen: () => {
            setBookingStep(BookingStep.LISTENING_DPW);
            const audioContext = audioContextRef.current!;
            const source = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            analyserNodeRef.current = analyser;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVolume = () => {
                if (!analyserNodeRef.current) return;
                analyserNodeRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
                setVolume(average / 128.0); // Normalize to 0-2 range
                animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            animationFrameRef.current = requestAnimationFrame(updateVolume);

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              await playAudio(base64Audio);
            }

            if (message.toolCall?.functionCalls) {
              for (const fc of message.toolCall.functionCalls) {
                 sessionPromiseRef.current?.then((session) => session.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: "OK" } }
                  }));

                if (fc.name === 'submitDpwReferenceNumber') {
                  const number = (fc.args.number || '').replace(/\s/g, '');
                  if (number && /^\d{7}$/.test(number)) {
                    setDpwRef(number);
                    setBookingStep(BookingStep.CONFIRMING_DPW);
                  }
                } else if (fc.name === 'confirmDpwReference') {
                  if (fc.args.isCorrect) {
                    setBookingStep(BookingStep.LISTENING_TOKEN);
                  } else {
                    setDpwRef('');
                    setBookingStep(BookingStep.LISTENING_DPW);
                  }
                } else if (fc.name === 'submitTokenNumber') {
                  const number = (fc.args.number || '').replace(/\s/g, '');
                  if (number && /^\d{6}$/.test(number)) {
                    setToken(number);
                    setBookingStep(BookingStep.CONFIRMING_TOKEN);
                  }
                } else if (fc.name === 'confirmToken') {
                    if (fc.args.isCorrect) {
                        setBookingStep(BookingStep.CONFIRMING_BOOKING);
                    } else {
                        setToken('');
                        setBookingStep(BookingStep.LISTENING_TOKEN);
                    }
                } else if (fc.name === 'confirmBooking') {
                    if (fc.args.proceed) {
                        setBookingStep(BookingStep.PROCESSING);
                        const processBooking = async () => {
                            const mockContainerNumber = `DPWU${Math.floor(1000000 + Math.random() * 9000000)}`;
                            
                            const generateMockLocation = (): string => {
                                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                                const randomChar = () => letters.charAt(Math.floor(Math.random() * letters.length));
                                
                                const part1 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
                                const part2 = randomChar();
                                const part3 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
                                const part4 = randomChar();
                                const part5 = String(Math.floor(Math.random() * 10));
                                
                                return `${part1}${part2}${part3}${part4}${part5}`;
                            };

                            const mockLocation = generateMockLocation();
                            const mockGateInTime = `${Math.floor(1 + Math.random() * 12)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} PM`;
                            setContainerNumber(mockContainerNumber);
                            setContainerLocation(mockLocation);
                            setGateInTime(mockGateInTime);
                            setBookingStep(BookingStep.SUCCESS);
                            
                            const confirmationMessage = `Your container has been successfully booked. The container number is ${mockContainerNumber.split('').join(' ')}. It is located at ${mockLocation.split('').join(' ')}. Please proceed to the gate today at ${mockGateInTime}.`;
                            await speakText(confirmationMessage);
                        };
                        processBooking();
                    } else {
                        setDpwRef('');
                        setToken('');
                        setBookingStep(BookingStep.LISTENING_DPW);
                    }
                }
              }
            }
            if (message.serverContent?.interrupted) {
                stopPlayback();
            }
          },
          onerror: (e) => {
            console.error('Gemini session error:', e);
            setError('A connection error occurred. Please try again.');
            setBookingStep(BookingStep.ERROR);
            cleanup();
          },
          onclose: () => {
             cleanup();
          },
        },
      });
    } catch (err) {
      console.error('Failed to start booking session:', err);
      setError('Could not access the microphone. Please grant permission and try again.');
      setBookingStep(BookingStep.ERROR);
      cleanup();
    }
  }, [playAudio, stopPlayback, speakText]);

  const submitManualInput = useCallback(async (number: string) => {
    stopPlayback();

    if (bookingStep === BookingStep.LISTENING_DPW) {
        setDpwRef(number);
        setBookingStep(BookingStep.CONFIRMING_DPW);
        await speakText(`I have the DPW Reference as ${number.split('').join(' ')}. Is that correct?`);
    } else if (bookingStep === BookingStep.LISTENING_TOKEN) {
        setToken(number);
        setBookingStep(BookingStep.CONFIRMING_TOKEN);
        await speakText(`I have the Token as ${number.split('').join(' ')}. Is that correct?`);
    }
  }, [bookingStep, stopPlayback, speakText]);


  const cleanup = useCallback(() => {
    stopPlayback();
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    analyserNodeRef.current?.disconnect();
    analyserNodeRef.current = null;
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    sessionPromiseRef.current?.then(session => session.close()).catch(e => console.error("Error closing session:", e));
    sessionPromiseRef.current = null;
  }, [stopPlayback]);

  const reset = useCallback(() => {
    cleanup();
    setBookingStep(BookingStep.IDLE);
    setDpwRef('');
    setToken('');
    setContainerNumber('');
    setContainerLocation('');
    setGateInTime('');
    setError(null);
    setVolume(0);
  }, [cleanup]);

  useEffect(() => {
    return () => {
        cleanup();
    }
  }, [cleanup]);

  return { bookingStep, dpwRef, token, error, startBooking, reset, containerNumber, containerLocation, gateInTime, volume, submitManualInput };
};