import React, { useState, useCallback } from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface NotificationModalProps {
  text: string;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ text, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <div 
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg border border-slate-700 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-100 mb-4">Notification Preview</h2>
        <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-600 mb-4">
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">{text}</pre>
        </div>
        <div className="flex justify-end gap-3">
            <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors"
            >
                Close
            </button>
            <button
                onClick={handleCopy}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors flex items-center ${
                    copied ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
                {copied ? <CheckIcon className="w-5 h-5 mr-2" /> : <ClipboardIcon className="w-5 h-5 mr-2" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
        </div>
      </div>
    </div>
  );
};
