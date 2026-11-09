import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  Layers,
  LineChart,
  Lock,
  Play,
  Server,
  Smartphone,
  Sparkles,
  Zap
} from 'lucide-react';

export const ProductCanvas: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'metrics'>('overview');
  const [activeSegment, setActiveSegment] = useState<'30d' | '7d' | '24h'>('7d');

  // Interactive subtle mouse parallax tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      className="relative w-full max-w-6xl mx-auto perspective-1000 py-6 select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background glow beneath main canvas */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[60%] bg-[#CCFF00]/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-[#101216]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden p-3 md:p-6"
      >
        {/* Top Window Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5 text-xs text-brand-muted">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-[11px] font-mono text-gray-300">
              <Lock className="w-3 h-3 text-[#CCFF00]" />
              <span>https://console.wecove.in/production</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#CCFF00]/15 text-[#CCFF00] font-mono text-[11px] font-medium border border-[#CCFF00]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
              SYSTEM HEALTHY
            </span>
            <span className="hidden md:inline text-white/40">v2.8.4</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Console Area (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Nav Tabs inside dashboard */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/5">
                {(['overview', 'api', 'metrics'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-[#181A20] text-white shadow-sm border border-white/10'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 text-xs">
                {(['24h', '7d', '30d'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setActiveSegment(period)}
                    className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                      activeSegment === period
                        ? 'bg-[#CCFF00]/20 text-[#CCFF00] font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#CCFF00]/30 transition-colors">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>API Request Rate</span>
                  <Activity className="w-3.5 h-3.5 text-[#CCFF00]" />
                </div>
                <div className="text-xl font-bold tracking-tight text-white font-mono">
                  14.8k <span className="text-xs font-normal text-emerald-400">+18%</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">99.98% successful responses</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#CCFF00]/30 transition-colors">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Response Latency</span>
                  <Zap className="w-3.5 h-3.5 text-[#CCFF00]" />
                </div>
                <div className="text-xl font-bold tracking-tight text-white font-mono">
                  38ms <span className="text-xs font-normal text-emerald-400">-4ms</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Global edge delivery</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#CCFF00]/30 transition-colors">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Active Endpoints</span>
                  <Server className="w-3.5 h-3.5 text-[#CCFF00]" />
                </div>
                <div className="text-xl font-bold tracking-tight text-white font-mono">
                  48 <span className="text-xs font-normal text-gray-400">Services</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Distributed cloud cluster</div>
              </div>
            </div>

            {/* Real Chart Visual Area */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center justify-between text-xs mb-3">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-[#CCFF00]" />
                  <span className="font-semibold text-gray-200">Throughput & Workload Telemetry</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400">Interval: 100ms sync</span>
              </div>

              <div className="h-32 w-full relative flex items-end gap-1.5 pt-4">
                {/* SVG wave area */}
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 120">
                  <defs>
                    <linearGradient id="gradient-chart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#CCFF00" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#CCFF00" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 Q50,40 100,65 T200,30 T300,50 T400,20 T500,45 L500,120 L0,120 Z"
                    fill="url(#gradient-chart)"
                  />
                  <path
                    d="M0,80 Q50,40 100,65 T200,30 T300,50 T400,20 T500,45"
                    fill="none"
                    stroke="#CCFF00"
                    strokeWidth="2.5"
                  />
                </svg>

                {/* Vertical bar grid simulation */}
                <div className="w-full flex items-end justify-between gap-1 z-10 px-2 opacity-60">
                  {[45, 60, 52, 78, 65, 90, 84, 70, 95, 88, 102, 75, 110, 92, 118, 105].map((val, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${(val / 120) * 85}%` }}
                      className="flex-1 bg-white/10 hover:bg-[#CCFF00] transition-colors rounded-t-sm"
                      title={`${val} req/s`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mt-2 pt-2 border-t border-white/5">
                <span>00:00 UTC</span>
                <span>06:00 UTC</span>
                <span>12:00 UTC</span>
                <span>18:00 UTC</span>
                <span>Live Stream</span>
              </div>
            </div>

            {/* Live event logs */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-xs space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-sans font-semibold flex items-center justify-between">
                <span>Recent Production Executions</span>
                <span className="text-[#CCFF00] font-mono lowercase">auto-refresh</span>
              </div>
              <div className="flex items-center justify-between text-gray-300 py-1 border-b border-white/5">
                <span className="text-[#CCFF00]">POST /api/v1/auth/session</span>
                <span className="text-gray-400">200 OK • 24ms</span>
                <span className="text-[11px] text-gray-500">Bangalore, IN</span>
              </div>
              <div className="flex items-center justify-between text-gray-300 py-1 border-b border-white/5">
                <span className="text-emerald-400">EVENT prisma.inquiry.created</span>
                <span className="text-gray-400">Stored PostgreSQL • 12ms</span>
                <span className="text-[11px] text-gray-500">Transaction Commit</span>
              </div>
              <div className="flex items-center justify-between text-gray-300 py-1">
                <span className="text-blue-400">JOB email.dispatch(Resend)</span>
                <span className="text-gray-400">Triggered • 202 Accepted</span>
                <span className="text-[11px] text-gray-500">SMTP Worker</span>
              </div>
            </div>
          </div>

          {/* Right Supporting Panels (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Panel 1: Interactive Mobile Experience Preview */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Smartphone className="w-4 h-4 text-[#CCFF00]" />
                  <span>Mobile Application UI</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">iOS & Android</span>
              </div>

              {/* Realistic Mini Device Frame */}
              <div className="w-full bg-[#090A0D] border border-white/10 rounded-2xl p-3 shadow-inner">
                <div className="w-16 h-1 bg-white/20 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold text-white">WeCove Mobile Hub</div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 mb-2">
                  <div className="text-[10px] text-gray-400">Task Automation Queue</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">99.4% Uptime</div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className="bg-[#CCFF00] h-full w-[84%]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="p-2 rounded bg-white/5 text-center text-gray-300 hover:bg-white/10 transition-colors">
                    Deploy
                  </div>
                  <div className="p-2 rounded bg-[#CCFF00]/15 text-[#CCFF00] font-semibold text-center hover:bg-[#CCFF00]/25 transition-colors">
                    Sync DB
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Live Code & Microservices API snippet */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px]">
              <div className="flex items-center justify-between text-gray-400 mb-2 pb-1.5 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#CCFF00]" />
                  <span className="font-sans text-xs font-semibold text-white">Full-Stack Core</span>
                </div>
                <span className="text-[10px] text-gray-500">TypeScript</span>
              </div>
              <pre className="text-gray-300 leading-relaxed overflow-x-auto">
                <span className="text-purple-400">export async function</span>{' '}
                <span className="text-blue-400">launchDigitalProduct</span>() &#123;{'\n'}
                {'  '}<span className="text-gray-500">// WeCove.in Architecture</span>{'\n'}
                {'  '}<span className="text-purple-400">const</span> stack = &#123;{'\n'}
                {'    '}frontend: <span className="text-[#CCFF00]">'React + TS'</span>,{'\n'}
                {'    '}backend: <span className="text-[#CCFF00]">'Node + Express'</span>,{'\n'}
                {'    '}database: <span className="text-[#CCFF00]">'PostgreSQL'</span>,{'\n'}
                {'    '}delivery: <span className="text-[#CCFF00]">'Production'</span>{'\n'}
                {'  '}&#125;;{'\n'}
                {'  '}<span className="text-purple-400">return await</span> deploy(stack);{'\n'}
                &#125;
              </pre>
            </div>

            {/* Panel 3: Design Tokens / Precision System */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Layers className="w-3.5 h-3.5 text-[#CCFF00]" />
                  <span>Design System Tokens</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">Pixel-Perfect</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-5 h-5 rounded bg-[#CCFF00] border border-white/20" title="Primary Accent: #CCFF00" />
                <span className="w-5 h-5 rounded bg-[#101216] border border-white/20" title="Charcoal Base: #101216" />
                <span className="w-5 h-5 rounded bg-[#F8F9FA] border border-white/20" title="Light Off-White: #F8F9FA" />
                <span className="w-5 h-5 rounded bg-emerald-500 border border-white/20" title="Success: #10B981" />
                <span className="text-[11px] text-gray-400 ml-auto font-mono">Geist Sans 16/24</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
