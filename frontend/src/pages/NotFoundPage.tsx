import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Terminal } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-20 px-4 bg-[#08090C] text-white">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00]">
          <Terminal className="w-3.5 h-3.5" />
          <span>HTTP ERROR 404</span>
        </div>

        <h1 className="text-6xl sm:text-8xl font-black font-mono text-white tracking-tight">
          4<span className="text-[#CCFF00]">0</span>4
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Route Not Found</h2>
          <p className="text-sm text-brand-muted leading-relaxed font-sans">
            The endpoint or resource you requested could not be located in the WeCove.in platform index.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#CCFF00] text-[#08090C] hover:bg-[#BCE800] font-bold text-xs font-sans transition-all shadow-lg shadow-[#CCFF00]/15"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO WECOVE.IN HOME</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
