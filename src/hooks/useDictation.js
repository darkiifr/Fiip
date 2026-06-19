import { useState, useEffect, useRef, useCallback } from 'react';

export function useDictation(detectedLanguage, onResult, onStart, onEnd, onError) {
    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState('');
    const recognitionRef = useRef(null);
    
    // Use refs for callbacks to keep the main useEffect stable
    const callbacksRef = useRef({ onResult, onStart, onEnd, onError, isListening });
    useEffect(() => {
        callbacksRef.current = { onResult, onStart, onEnd, onError, isListening };
    }, [onResult, onStart, onEnd, onError, isListening]);

    const stopDictation = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimText('');
            if (onEnd) {onEnd();}
        }
    }, [isListening, onEnd]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (callbacksRef.current.onError) {callbacksRef.current.onError('SpeechRecognition not supported in this browser');}
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            if (callbacksRef.current.onStart) {callbacksRef.current.onStart();}
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            setInterimText(interimTranscript);
            if (finalTranscript && callbacksRef.current.onResult) {
                callbacksRef.current.onResult(finalTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Dictation error:', event.error);
            if (callbacksRef.current.onError) {callbacksRef.current.onError(event.error);}
            // We can't call stopDictation easily here if we want zero-dep, 
            // but we can just use recognition.stop() directly
            recognition.stop();
            setIsListening(false);
            setInterimText('');
        };

        recognition.onend = () => {
            setIsListening(prev => {
                if (prev) {
                    if (callbacksRef.current.onEnd) {callbacksRef.current.onEnd();}
                }
                return false;
            });
            setInterimText('');
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []); // Empty since we use refs for dependencies

    useEffect(() => {
        if (recognitionRef.current && detectedLanguage) {
            // Update lang when it changes, but only if not listening
            if (!isListening) {
                recognitionRef.current.lang = detectedLanguage.code || 'fr-FR';
            }
        }
    }, [detectedLanguage, isListening]);

    const startDictation = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error('Failed to start dictation:', err);
                if (onError) {onError(err.message);}
            }
        }
    }, [isListening, onError]);

    const toggleDictation = useCallback(() => {
        if (isListening) {
            stopDictation();
        } else {
            startDictation();
        }
    }, [isListening, startDictation, stopDictation]);

    return {
        isListening,
        interimText,
        startDictation,
        stopDictation,
        toggleDictation
    };
}