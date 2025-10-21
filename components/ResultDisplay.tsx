import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { SummaryResult, ActionItem, Priority } from '../types';
import { generateSpeech } from '../services/geminiService';
import { DownloadIcon } from './icons/DownloadIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { StopIcon } from './icons/StopIcon';
import { BellIcon } from './icons/BellIcon';
import { FilterIcon } from './icons/FilterIcon';
import { NotificationModal } from './NotificationModal';
import { Spinner } from './Spinner';

// Helper to get priority color
const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case 'High':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'Medium':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'Low':
      return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
    default:
      return 'bg-slate-600/50 text-slate-400 border border-slate-600/50';
  }
};

// Helper to format date
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // Add a day to correct for potential timezone issues where it might show the previous day
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
};

// Decode audio helper functions
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const ResultDisplay: React.FC<{ result: SummaryResult }> = ({ result }) => {
  const [activeFilter, setActiveFilter] = useState<Priority | 'All'>('All');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationText, setNotificationText] = useState('');
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [ttsError, setTtsError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const filteredActionItems = useMemo(() => {
    if (activeFilter === 'All') {
      return result.actionItems;
    }
    return result.actionItems.filter(item => item.priority === activeFilter);
  }, [result.actionItems, activeFilter]);

  const handleDownload = () => {
    const content = `
# Meeting Summary: ${result.title}

## Short Summary
${result.shortSummary}

## Detailed Summary
${result.detailedSummary.map(point => `- ${point}`).join('\n')}

## Discussion Breakdown
${result.discussionBreakdown.map(discussion => 
`### ${discussion.speaker}\n${discussion.points.map(point => `- ${point}`).join('\n')}`
).join('\n\n')}

## Action Items
${result.actionItems.map(item =>
  `- [ ] ${item.task} (Assignee: ${item.assignee}, Priority: ${item.priority}, Due: ${formatDate(item.dueDate)})`
).join('\n')}
    `;
    const blob = new Blob([content.trim()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title.replace(/\s/g, '_')}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleToggleAudio = useCallback(async (text: string) => {
    // Case 1: Audio is playing, so stop it.
    if (audioState === 'playing' && audioSourceRef.current) {
      audioSourceRef.current.onended = null; // Prevent onended from firing
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
      setAudioState('idle');
      return;
    }

    // Case 2: Already loading, do nothing.
    if (audioState === 'loading') {
      return;
    }

    // Case 3: Idle, so start loading and playing.
    setAudioState('loading');
    setTtsError(null);

    try {
      const base64Audio = await generateSpeech(text);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const outputNode = audioContext.createGain();
      outputNode.connect(audioContext.destination);

      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContext,
        24000,
        1,
      );
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNode);

      source.onended = () => {
        setAudioState('idle');
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      source.start();
      setAudioState('playing');

    } catch (error) {
      setTtsError(error instanceof Error ? error.message : 'Failed to generate audio.');
      setAudioState('idle');
    }
  }, [audioState]);
  
  // Effect for component unmount cleanup
  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.onended = null;
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const createNotificationText = (item: ActionItem) => {
    const text = `Reminder: The task "${item.task}" is assigned to ${item.assignee}. Priority: ${item.priority}. Due date: ${formatDate(item.dueDate)}.`;
    setNotificationText(text);
    setShowNotificationModal(true);
  };

  return (
    <div className="animate-fade-in space-y-6 text-slate-300">
      {showNotificationModal && (
        <NotificationModal text={notificationText} onClose={() => setShowNotificationModal(false)} />
      )}
      {/* Header */}
      <div className="flex justify-between items-start">
        <h3 className="text-3xl font-bold text-slate-100">{result.title}</h3>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors"
        >
          <DownloadIcon className="w-4 h-4" />
          Download
        </button>
      </div>

      {/* Short Summary */}
      <div className='space-y-2'>
        <div className="flex items-center gap-3">
          <h4 className="text-xl font-semibold text-slate-100">Summary</h4>
          <button
            onClick={() => handleToggleAudio(`Summary: ${result.shortSummary}`)}
            disabled={audioState === 'loading'}
            className="text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={audioState === 'playing' ? "Stop audio" : "Read summary aloud"}
          >
            {audioState === 'loading' && <Spinner size="sm" />}
            {audioState === 'playing' && <StopIcon className="w-5 h-5" />}
            {audioState === 'idle' && <SpeakerIcon className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-base text-slate-400 leading-relaxed">{result.shortSummary}</p>
        {ttsError && <p className="text-sm text-red-400 mt-1">{ttsError}</p>}
      </div>
      
      {/* Detailed Summary */}
      {result.detailedSummary && result.detailedSummary.length > 0 && (
          <div className='space-y-2'>
              <h4 className="text-xl font-semibold text-slate-100">Key Points</h4>
              <ul className="list-disc list-inside space-y-2 text-slate-400">
                  {result.detailedSummary.map((point, index) => (
                      <li key={index}>{point}</li>
                  ))}
              </ul>
          </div>
      )}

      {/* Discussion Breakdown */}
      {result.discussionBreakdown && result.discussionBreakdown.length > 0 && (
        <div className='space-y-4'>
          <h4 className="text-xl font-semibold text-slate-100">Discussion Breakdown</h4>
          <div className="space-y-4">
            {result.discussionBreakdown.map((discussion, index) => (
              <div key={index} className="bg-slate-900 rounded-lg p-4 border border-slate-700/80">
                <p className="font-semibold text-indigo-400 mb-2">{discussion.speaker}</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  {discussion.points.map((point, pIndex) => (
                    <li key={pIndex}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {result.actionItems && result.actionItems.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xl font-semibold text-slate-100">Action Items ({result.actionItems.length})</h4>
          
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterIcon className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-400 mr-2">Filter by priority:</span>
            {(['All', 'High', 'Medium', 'Low'] as const).map(priority => (
              <button
                key={priority}
                onClick={() => setActiveFilter(priority)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  activeFilter === priority 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-700/70 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>

          {/* Action Items List */}
          <div className="space-y-3">
            {filteredActionItems.length > 0 ? (
                filteredActionItems.map((item, index) => (
                    <div key={index} className="bg-slate-900 rounded-lg p-4 border border-slate-700/80 flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                            <p className="font-semibold text-slate-200">{item.task}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                                <span>Assigned to: <span className="font-medium text-slate-300">{item.assignee}</span></span>
                                <span>Due: <span className="font-medium text-slate-300">{formatDate(item.dueDate)}</span></span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                           <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                               {item.priority}
                           </span>
                           <button 
                             onClick={() => createNotificationText(item)}
                             className="text-slate-500 hover:text-indigo-400 transition-colors"
                             title="Create notification"
                           >
                              <BellIcon className="w-5 h-5" />
                           </button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-900 rounded-lg border border-slate-700/80">
                    <p>No action items match the filter "{activeFilter}".</p>
                    <button onClick={() => setActiveFilter('All')} className="mt-2 text-indigo-400 hover:underline text-sm font-semibold">
                      Clear filter
                    </button>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};