import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Clock, Code, Compass, Sparkles } from 'lucide-react';

export const WorkComingSoonSection: React.FC = () => {
  return (
    <section className="py-28 bg-[#FAF9F6] text-[#1F1D1B] border-t border-[#E5E4E2] relative overflow-hidden">
      {/* Subtle radial aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#E6E0F0]/60 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-[#6F4E37] animate-ping inline-block" />
            <span>PORTFOLIO IN PROGRESS</span>
          </div>

          <h2 className="text-3xl sm:text-6xl font-serif text-[#1F1D1B] mb-6 leading-tight">
            Good things are <br />
            <span className="italic text-[#6F4E37]">in the works.</span>
          </h2>

          <p className="text-base sm:text-xl text-[#5A5550] max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
            We're building our portfolio. Exciting work is on its way. Check back soon to see what we're creating.
          </p>

          {/* Artistic Geometric Abstract Construct */}
          <div className="p-8 sm:p-12 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] relative overflow-hidden mb-10 shadow-sm">
            {/* Ambient subtle matrix grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center justify-center">
              {/* Spinning geometric nested frames */}
              <div className="relative w-36 h-36 mb-6 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-3xl border-2 border-[#6F4E37]/30"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-3 rounded-2xl border border-[#E6E0F0]"
                />
                <motion.div
                  animate={{ scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-2xl bg-[#E6E0F0] border border-[#D5CBE5] flex items-center justify-center text-[#6F4E37] shadow-sm"
                >
                  <Code className="w-7 h-7" />
                </motion.div>
              </div>

              <div className="text-xs font-mono text-[#6F4E37] mb-2 tracking-wider font-semibold uppercase">
                WECOVE STUDIO PIPELINE // ACTIVE REPOSITORIES
              </div>
              <p className="text-xs text-[#6A635E] max-w-md mx-auto font-sans">
                Real software builds undergo rigorous internal code reviews and security testing before being published.
              </p>

              {/* Development Status Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 w-full max-w-xl text-left">
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E4E2] font-mono text-xs">
                  <div className="text-[#8C847E] text-[10px]">CURRENT SPRINT</div>
                  <div className="text-[#1F1D1B] font-bold mt-0.5 font-sans">Custom SaaS Architecture</div>
                  <div className="text-[#6F4E37] text-[10px] mt-1 font-semibold">● QA Phase</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E4E2] font-mono text-xs">
                  <div className="text-[#8C847E] text-[10px]">CURRENT SPRINT</div>
                  <div className="text-[#1F1D1B] font-bold mt-0.5 font-sans">React Native Mobile Suite</div>
                  <div className="text-[#6F4E37] text-[10px] mt-1 font-semibold">● Integration Phase</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E4E2] font-mono text-xs">
                  <div className="text-[#8C847E] text-[10px]">CURRENT SPRINT</div>
                  <div className="text-[#1F1D1B] font-bold mt-0.5 font-sans">Enterprise ERP System</div>
                  <div className="text-[#6F4E37] text-[10px] mt-1 font-semibold">● Deployment Testing</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/work"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#E5E4E2] hover:bg-[#E6E0F0] text-[#1F1D1B] font-semibold text-xs transition-colors border border-[#D5D3CF] font-sans"
            >
              <span>EXPLORE WORK PAGE</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#6F4E37] hover:bg-[#553B2A] text-[#FAF9F6] font-semibold text-xs transition-all shadow-md font-sans"
            >
              <span>COMMISSION A NEW BUILD</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
