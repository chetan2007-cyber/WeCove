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
    <div className="py-20 md:py-28 bg-[#08090C] text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#CCFF00]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-xs font-mono text-[#CCFF00] font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
            <span>COMING SOON</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-7xl font-black tracking-tight text-white mb-6 uppercase leading-tight">
            Good things are <br />
            <span className="text-[#CCFF00]">in the works.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-base sm:text-2xl text-brand-muted max-w-2xl mx-auto mb-12 leading-relaxed font-sans">
            We're building our portfolio. Exciting work is on its way. Check back soon to see what we're creating.
          </p>

          {/* Artistic Engineering Construct */}
          <div className="p-8 sm:p-14 rounded-3xl bg-[#111319] border border-white/10 relative overflow-hidden mb-12 shadow-2xl">
            {/* Architectural Grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Rotating Concentric Kinetic Geometry */}
              <div className="relative w-44 h-44 mb-8 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-[#CCFF00]/40"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-4 rounded-3xl border border-white/20"
                />
                <motion.div
                  animate={{ scale: [0.92, 1.05, 0.92] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-2xl bg-[#CCFF00]/15 border border-[#CCFF00] flex items-center justify-center text-[#CCFF00] shadow-xl"
                >
                  <Cpu className="w-10 h-10" />
                </motion.div>
              </div>

              <div className="text-xs font-mono uppercase tracking-widest text-[#CCFF00] mb-3">
                WECOVE PRODUCT REPOSITORIES // IN FLIGHT
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white max-w-lg mb-4">
                Authenticity First: Zero Fictitious Case Studies
              </h2>

              <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto leading-relaxed mb-8">
                Unlike agencies that publish invented client logos and placeholder screenshots, WeCove.in only features
                verified production systems. Our current software builds will be documented in detail upon client deployment.
              </p>

              {/* Active Pipeline Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
                    <span>SPRINT #1</span>
                    <span className="text-[#CCFF00]">Active</span>
                  </div>
                  <div className="font-bold text-white text-sm">Enterprise Multi-Tenant SaaS Engine</div>
                  <p className="text-[11px] text-gray-400">
                    Distributed architecture with role permissions, automated billing webhooks, and sub-50ms query caching.
                  </p>
                  <div className="text-[10px] font-mono text-emerald-400 pt-1">Status: Final QA & Testing</div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
                    <span>SPRINT #2</span>
                    <span className="text-[#CCFF00]">Active</span>
                  </div>
                  <div className="font-bold text-white text-sm">Cross-Platform Mobile Suite</div>
                  <p className="text-[11px] text-gray-400">
                    React Native mobile hub with biometric credentials, offline-first sync, and push notifications.
                  </p>
                  <div className="text-[10px] font-mono text-[#CCFF00] pt-1">Status: Native Bridge Optimization</div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
                    <span>SPRINT #3</span>
                    <span className="text-[#CCFF00]">Active</span>
                  </div>
                  <div className="font-bold text-white text-sm">Intelligent AI Workflow Gateway</div>
                  <p className="text-[11px] text-gray-400">
                    Vector-backed retrieval engine with automated document classification and real-time inference streaming.
                  </p>
                  <div className="text-[10px] font-mono text-blue-400 pt-1">Status: Schema & Model Tuning</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#CCFF00] text-[#08090C] hover:bg-[#BCE800] font-bold text-sm tracking-wide transition-all shadow-xl shadow-[#CCFF00]/20"
            >
              <span>COMMISSION A NEW BUILD</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/services"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10"
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
