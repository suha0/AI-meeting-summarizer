import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { AudioInput } from './components/AudioInput';
import { ResultDisplay } from './components/ResultDisplay';
import { Spinner } from './components/Spinner';
import { summarizeTranscript } from './services/geminiService';
import type { SummaryResult } from './types';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { TrashIcon } from './components/icons/TrashIcon';

type InputTab = 'text' | 'audio';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState<string>('');
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [activeInputTab, setActiveInputTab] = useState<InputTab>('text');
  const [meetingTitle, setMeetingTitle] = useState<string>('');

  const handleFileUpload = (content: string, name: string) => {
    setTranscript(content);
    setFileName(name);
    setSummaryResult(null);
    setError(null);
  };

  const handleTranscriptionComplete = (transcribedText: string) => {
    setTranscript(transcribedText);
    setFileName('audio_transcription.txt');
    setActiveInputTab('text');
    setSummaryResult(null);
    setError(null);
  }

  const handleSummarize = useCallback(async () => {
    if (!transcript.trim()) {
      setError('Transcript is empty. Please upload, paste, or transcribe audio first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSummaryResult(null);

    try {
      const result = await summarizeTranscript(transcript, meetingTitle);
      setSummaryResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while summarizing.');
    } finally {
      setIsLoading(false);
    }
  }, [transcript, meetingTitle]);

  const handleClear = () => {
    setTranscript('');
    setSummaryResult(null);
    setError(null);
    setFileName('');
    setMeetingTitle('');
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Column */}
          <div className="bg-slate-800 rounded-2xl shadow-lg p-6 flex flex-col h-full">
            <div className="flex border-b border-slate-700 mb-4">
              <button
                onClick={() => setActiveInputTab('text')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${activeInputTab === 'text' ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Transcript
              </button>
              <button
                onClick={() => setActiveInputTab('audio')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${activeInputTab === 'audio' ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                From Audio
              </button>
            </div>
            
            {activeInputTab === 'audio' && (
              <AudioInput onTranscriptionComplete={handleTranscriptionComplete} />
            )}
            
            {activeInputTab === 'text' && (
              <div className="flex flex-col flex-grow animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-slate-100">Your Transcript</h2>
                  <button
                      onClick={handleClear}
                      title="Clear all inputs and results"
                      className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                      disabled={!transcript && !summaryResult && !meetingTitle && !fileName}
                  >
                      <TrashIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <div className='mb-4'>
                    <label htmlFor="meeting-title" className="block text-sm font-medium text-slate-400 mb-1">
                        Meeting Title (Optional)
                    </label>
                    <input
                        id="meeting-title"
                        type="text"
                        value={meetingTitle}
                        onChange={(e) => setMeetingTitle(e.target.value)}
                        placeholder="e.g., Q3 Project Kickoff"
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    />
                </div>
                
                <FileUpload onFileUpload={handleFileUpload} />
                {fileName && (
                  <p className="text-sm text-slate-400 mt-2 mb-4">
                    File: <span className="font-semibold">{fileName}</span>
                  </p>
                )}
                <textarea
                  className="w-full flex-grow bg-slate-950/50 border border-slate-700 rounded-lg p-4 text-slate-300 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 mt-4"
                  rows={15}
                  placeholder="Upload a .txt or .vtt file, or paste your transcript here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <button
                  onClick={handleSummarize}
                  disabled={isLoading || !transcript}
                  className="mt-6 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                >
                  {isLoading ? (
                    <Spinner />
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5 mr-2" />
                      Summarize
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Output Column */}
          <div className="bg-slate-800 rounded-2xl shadow-lg p-6 flex flex-col">
            <h2 className="text-2xl font-bold text-slate-100 mb-4">Analysis</h2>
            <div className="flex-grow w-full bg-slate-950/50 border border-slate-700 rounded-lg p-4">
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Spinner size="lg" />
                  <p className="mt-4 text-lg">AI is analyzing your meeting...</p>
                  <p className="text-sm">This may take a moment.</p>
                </div>
              )}
              {error && (
                <div className="flex items-center justify-center h-full text-red-400 text-center">
                  <p>{error}</p>
                </div>
              )}
              {!isLoading && !error && summaryResult && (
                <ResultDisplay result={summaryResult} />
              )}
              {!isLoading && !error && !summaryResult && (
                 <div className="flex items-center justify-center h-full text-slate-500">
                  <p>Your summary and action items will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;