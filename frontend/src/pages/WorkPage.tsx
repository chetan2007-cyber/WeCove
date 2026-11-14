import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Code2,
  Cpu,
  Flame,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal
} from 'lucide-react';

export const WorkPage: React.FC = () => {
  return (
    <div className="py-20 md:py-28 bg-[#FAF9F6] text-[#1F1D1B] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#E6E0F0]/60 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-[#6F4E37] animate-ping" />
            <span>PORTFOLIO IN PROGRESS</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-7xl font-serif tracking-tight text-[#1F1D1B] mb-6 leading-tight">
            Good things are <br />
            <span className="italic text-[#6F4E37]">in the works.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-base sm:text-2xl text-[#5A5550] max-w-2xl mx-auto mb-12 leading-relaxed font-sans">
            We're building our portfolio. Exciting work is on its way. Check back soon to see what we're creating.
          </p>

          {/* Artistic Engineering Construct */}
          <div className="p-8 sm:p-14 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] relative overflow-hidden mb-12 shadow-sm">
            {/* Architectural Grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Rotating Concentric Kinetic Geometry */}
              <div className="relative w-44 h-44 mb-8 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-[#6F4E37]/30"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-4 rounded-3xl border border-[#E6E0F0]"
                />
                <motion.div
                  animate={{ scale: [0.92, 1.05, 0.92] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-2xl bg-[#E6E0F0] border border-[#D5CBE5] flex items-center justify-center text-[#6F4E37] shadow-sm"
                >
                  <Cpu className="w-10 h-10" />
                </motion.div>
              </div>

              <div className="text-xs font-mono uppercase tracking-widest text-[#6F4E37] mb-3 font-semibold">
                WECOVE PRODUCT REPOSITORIES // IN FLIGHT
              </div>

              <h2 className="text-xl sm:text-2xl font-serif text-[#1F1D1B] max-w-lg mb-4">
                Authenticity First: Zero Fictitious Case Studies
              </h2>

              <p className="text-xs sm:text-sm text-[#5A5550] max-w-xl mx-auto leading-relaxed mb-8 font-sans">
                Unlike agencies that publish invented client logos and placeholder screenshots, WeCove.in only features
                verified production systems. Our current software builds will be documented in detail upon client deployment.
              </p>

              {/* Active Pipeline Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E4E2] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8C847E]">
                    <span>SPRINT #1</span>
                    <span className="text-[#6F4E37] font-semibold">Active</span>
                  </div>
                  <div className="font-bold text-[#1F1D1B] text-sm font-sans">Enterprise Multi-Tenant SaaS Engine</div>
                  <p className="text-[11px] text-[#5A5550] font-sans">
                    Distributed architecture with role permissions, automated billing webhooks, and sub-50ms query caching.
                  </p>
                  <div className="text-[10px] font-mono text-[#6F4E37] pt-1 font-semibold">Status: Final QA & Testing</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E4E2] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8C847E]">
                    <span>SPRINT #2</span>
                    <span className="text-[#6F4E37] font-semibold">Active</span>
                  </div>
                  <div className="font-bold text-[#1F1D1B] text-sm font-sans">Cross-Platform Mobile Suite</div>
                  <p className="text-[11px] text-[#5A5550] font-sans">
                    React Native mobile hub with biometric credentials, offline-first sync, and push notifications.
                  </p>
                  <div className="text-[10px] font-mono text-[#6F4E37] pt-1 font-semibold">Status: Native Bridge Optimization</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E4E2] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8C847E]">
                    <span>SPRINT #3</span>
                    <span className="text-[#6F4E37] font-semibold">Active</span>
                  </div>
                  <div className="font-bold text-[#1F1D1B] text-sm font-sans">Intelligent AI Workflow Gateway</div>
                  <p className="text-[11px] text-[#5A5550] font-sans">
                    Vector-backed retrieval engine with automated document classification and real-time inference streaming.
                  </p>
                  <div className="text-[10px] font-mono text-[#6F4E37] pt-1 font-semibold">Status: Schema & Model Tuning</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#6F4E37] text-[#FAF9F6] hover:bg-[#553B2A] font-semibold text-xs tracking-wider uppercase transition-all shadow-md font-sans"
            >
              <span>COMMISSION A NEW BUILD</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/services"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#E5E4E2] hover:bg-[#E6E0F0] text-[#1F1D1B] font-semibold text-xs tracking-wider uppercase transition-all border border-[#D5D3CF] font-sans"
            >
              <span>EXPLORE CAPABILITIES</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
