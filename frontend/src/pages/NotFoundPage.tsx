import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Terminal } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-20 px-4 bg-[#FAF9F6] text-[#1F1D1B]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold">
          <Terminal className="w-3.5 h-3.5 text-[#6F4E37]" />
          <span>HTTP ERROR 404</span>
        </div>

        <h1 className="text-6xl sm:text-8xl font-serif text-[#6F4E37] tracking-tight">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-serif text-[#1F1D1B]">Route Not Found</h2>
          <p className="text-sm text-[#5A5550] leading-relaxed font-sans">
            The endpoint or resource you requested could not be located in the WeCove.in platform index.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#6F4E37] hover:bg-[#553B2A] text-[#FAF9F6] font-semibold text-xs font-sans transition-all shadow-sm tracking-wider uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO WECOVE.IN HOME</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
