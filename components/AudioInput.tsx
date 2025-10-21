import React, { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { Spinner } from './Spinner';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import { AudioWaveIcon } from './icons/AudioWaveIcon';

interface AudioInputProps {
  onTranscriptionComplete: (text: string) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // remove the mime type prefix from the base64 string
            resolve(base64data.substr(base64data.indexOf(',') + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const AudioInput: React.FC<AudioInputProps> = ({ onTranscriptionComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startTimer = () => {
        const startTime = Date.now();
        timerIntervalRef.current = window.setInterval(() => {
            setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
    };

    const stopTimer = () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        setRecordingTime(0);
    };

    const cleanup = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        stopTimer();
    }
    
    useEffect(() => {
        return () => {
            cleanup();
        }
    }, []);

    const processAudio = useCallback(async (blob: Blob, mimeType: string) => {
        setIsTranscribing(true);
        setError(null);
        try {
            const base64 = await blobToBase64(blob);
            const transcript = await transcribeAudio(base64, mimeType);
            onTranscriptionComplete(transcript);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsTranscribing(false);
        }
    }, [onTranscriptionComplete]);

    const handleStartRecording = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                processAudio(audioBlob, mimeType);
                audioChunksRef.current = [];
                cleanup();
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            startTimer();

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please ensure permission is granted.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        stopTimer();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const handleAudioFile = useCallback((file: File) => {
        if (file && file.type.startsWith('audio/')) {
            processAudio(file, file.type);
        } else {
            setError('Please upload a valid audio file.');
        }
    }, [processAudio]);

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            handleAudioFile(event.dataTransfer.files[0]);
        }
    }, [handleAudioFile]);

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();
    const handleDragEnter = () => setIsDragging(true);
    const handleDragLeave = () => setIsDragging(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            handleAudioFile(event.target.files[0]);
        }
    };

    if (isTranscribing) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                <Spinner size="lg" />
                <p className="mt-4 text-lg">AI is transcribing your audio...</p>
                <p className="text-sm">This might take a moment for longer files.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
             <h2 className="text-2xl font-bold text-slate-100 mb-4">Record or Upload Audio</h2>
            <div className="text-center">
                <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`p-5 rounded-full transition-all duration-200 transform hover:scale-110 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white shadow-lg`}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    {isRecording ? <StopIcon className="w-8 h-8"/> : <MicrophoneIcon className="w-8 h-8" />}
                </button>
                <p className="mt-4 text-lg font-semibold text-slate-300">
                    {isRecording ? formatTime(recordingTime) : 'Click to Record'}
                </p>
                {isRecording && <p className="text-sm text-slate-400 animate-pulse">Recording in progress...</p>}
            </div>

            <div className="flex items-center text-slate-500">
                <hr className="flex-grow border-slate-700"/>
                <span className="px-4 text-sm font-semibold">OR</span>
                <hr className="flex-grow border-slate-700"/>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('audio-file-input')?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
                isDragging ? 'border-indigo-500 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <input
                id="audio-file-input"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center text-slate-400">
                <AudioWaveIcon className="w-12 h-12 mb-3" />
                <p className="font-semibold">Drag & drop an audio file here</p>
                <p className="text-sm">or click to select a file</p>
                <p className="text-xs mt-1 text-slate-500">Supports MP3, WAV, M4A, etc.</p>
              </div>
            </div>

            {error && <p className="text-red-400 text-center mt-4">{error}</p>}
        </div>
    );
};
