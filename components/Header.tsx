
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
      <div className="container mx-auto px-4 md:px-8 py-4">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
          AI Meeting Summarizer
        </h1>
        <p className="text-slate-400 mt-1">
          Turn long transcripts into clear summaries and actionable tasks.
        </p>
      </div>
    </header>
  );
};
