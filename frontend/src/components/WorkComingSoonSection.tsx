import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Clock, Code, Compass, Sparkles } from 'lucide-react';

export const WorkComingSoonSection: React.FC = () => {
  return (
    <section className="py-28 bg-[#0B0D13] text-white border-t border-white/5 relative overflow-hidden">
      {/* Subtle radial aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#CCFF00]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-xs font-mono text-[#CCFF00] font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping inline-block" />
            <span>COMING SOON</span>
          </div>

          <h2 className="text-3xl sm:text-6xl font-black tracking-tight text-white mb-6 uppercase">
            Good things are <br />
            <span className="text-[#CCFF00]">in the works.</span>
          </h2>

          <p className="text-base sm:text-xl text-brand-muted max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
            We're building our portfolio. Exciting work is on its way. Check back soon to see what we're creating.
          </p>

          {/* Artistic Geometric Abstract Construct */}
          <div className="p-8 sm:p-12 rounded-3xl bg-[#12151E] border border-white/10 relative overflow-hidden mb-10">
            {/* Ambient matrix grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center justify-center">
              {/* Spinning geometric nested frames */}
              <div className="relative w-36 h-36 mb-6 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-3xl border border-[#CCFF00]/40"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-3 rounded-2xl border border-white/20"
                />
                <motion.div
                  animate={{ scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00] flex items-center justify-center text-[#CCFF00]"
                >
                  <Code className="w-7 h-7" />
                </motion.div>
              </div>

              <div className="text-sm font-mono text-[#CCFF00] mb-2 tracking-wider">
                WECOVE STUDIO PIPELINE // ACTIVE REPOSITORIES
              </div>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Real software builds undergo rigorous internal code reviews and security testing before being published.
              </p>

              {/* Development Status Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 w-full max-w-xl text-left">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 font-mono text-xs">
                  <div className="text-gray-500 text-[10px]">CURRENT SPRINT</div>
                  <div className="text-white font-medium mt-0.5">Custom SaaS Architecture</div>
                  <div className="text-emerald-400 text-[10px] mt-1">● QA Phase</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 font-mono text-xs">
                  <div className="text-gray-500 text-[10px]">CURRENT SPRINT</div>
                  <div className="text-white font-medium mt-0.5">React Native Mobile Suite</div>
                  <div className="text-[#CCFF00] text-[10px] mt-1">● Integration Phase</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 font-mono text-xs">
                  <div className="text-gray-500 text-[10px]">CURRENT SPRINT</div>
                  <div className="text-white font-medium mt-0.5">Enterprise ERP System</div>
                  <div className="text-blue-400 text-[10px] mt-1">● Deployment Testing</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/work"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/10"
            >
              <span>EXPLORE WORK PAGE</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#CCFF00] text-[#08090C] hover:bg-[#BCE800] font-bold text-sm transition-all shadow-lg shadow-[#CCFF00]/15"
            >
              <span>START A NEW PROJECT WITH US</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
