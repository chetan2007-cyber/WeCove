import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Activity,
  Code2,
  Layers,
  LineChart,
  Lock,
  Server,
  Smartphone,
  Zap
} from 'lucide-react';

export const ProductCanvas: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'metrics'>('overview');
  const [activeSegment, setActiveSegment] = useState<'30d' | '7d' | '24h'>('7d');

  // Interactive subtle mouse parallax tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 150, damping: 20 });

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
      className="relative w-full max-w-6xl mx-auto perspective-1000 py-6 select-none font-sans"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background glow in pale lavender and warm mocha */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[60%] bg-[#E6E0F0]/30 blur-[130px] rounded-full pointer-events-none" />

      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-[#1F1D1B] border border-[#6F4E37]/30 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden p-3 md:p-6 text-[#E5E4E2]"
      >
        {/* Top Window Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 text-xs text-[#E5E4E2]/70">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#E5E4E2]/40 inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#E6E0F0]/50 inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#6F4E37] inline-block" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-[11px] font-mono text-[#E5E4E2]/90">
              <Lock className="w-3 h-3 text-[#E6E0F0]" />
              <span>https://console.wecove.in/production</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6E0F0]/15 text-[#E6E0F0] font-mono text-[11px] font-medium border border-[#E6E0F0]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E6E0F0] animate-pulse" />
              SYSTEM HEALTHY
            </span>
            <span className="hidden md:inline text-[#E5E4E2]/40 font-mono">v2.8.4</span>
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
                        ? 'bg-[#6F4E37] text-[#FAF9F6] shadow-sm'
                        : 'text-[#E5E4E2]/70 hover:text-white'
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
                        ? 'bg-[#E6E0F0] text-[#1F1D1B] font-semibold'
                        : 'text-[#E5E4E2]/70 hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#6F4E37]/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-[#E5E4E2]/70 mb-1">
                  <span>API Request Rate</span>
                  <Activity className="w-3.5 h-3.5 text-[#E6E0F0]" />
                </div>
                <div className="text-xl font-bold tracking-tight text-[#FAF9F6] font-mono">
                  14.8k <span className="text-xs font-normal text-[#E6E0F0]">+18%</span>
                </div>
                <div className="text-[11px] text-[#E5E4E2]/60 mt-1">99.98% successful responses</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#6F4E37]/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-[#E5E4E2]/70 mb-1">
                  <span>Response Latency</span>
                  <Zap className="w-3.5 h-3.5 text-[#E6E0F0]" />
                </div>
                <div className="text-xl font-bold tracking-tight text-[#FAF9F6] font-mono">
                  38ms <span className="text-xs font-normal text-[#E6E0F0]">-4ms</span>
                </div>
                <div className="text-[11px] text-[#E5E4E2]/60 mt-1">Global edge delivery</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#6F4E37]/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-[#E5E4E2]/70 mb-1">
                  <span>Active Endpoints</span>
                  <Server className="w-3.5 h-3.5 text-[#E6E0F0]" />
                </div>
                <div className="text-xl font-bold tracking-tight text-[#FAF9F6] font-mono">
                  48 <span className="text-xs font-normal text-[#E5E4E2]/60">Services</span>
                </div>
                <div className="text-[11px] text-[#E5E4E2]/60 mt-1">Distributed cloud cluster</div>
              </div>
            </div>

            {/* Real Chart Visual Area */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
              <div className="flex items-center justify-between text-xs mb-3">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-[#E6E0F0]" />
                  <span className="font-semibold text-[#FAF9F6]">Throughput & Workload Telemetry</span>
                </div>
                <span className="text-[11px] font-mono text-[#E5E4E2]/60">Interval: 100ms sync</span>
              </div>

              <div className="h-32 w-full relative flex items-end gap-1.5 pt-4">
                {/* SVG wave area */}
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 120">
                  <defs>
                    <linearGradient id="gradient-chart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E6E0F0" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6F4E37" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 Q50,40 100,65 T200,30 T300,50 T400,20 T500,45 L500,120 L0,120 Z"
                    fill="url(#gradient-chart)"
                  />
                  <path
                    d="M0,80 Q50,40 100,65 T200,30 T300,50 T400,20 T500,45"
                    fill="none"
                    stroke="#E6E0F0"
                    strokeWidth="2.5"
                  />
                </svg>

                {/* Vertical bar grid simulation */}
                <div className="w-full flex items-end justify-between gap-1 z-10 px-2 opacity-60">
                  {[45, 60, 52, 78, 65, 90, 84, 70, 95, 88, 102, 75, 110, 92, 118, 105].map((val, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${(val / 120) * 85}%` }}
                      className="flex-1 bg-white/10 hover:bg-[#E6E0F0] transition-colors rounded-t-sm"
                      title={`${val} req/s`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-[#E5E4E2]/50 font-mono mt-2 pt-2 border-t border-white/5">
                <span>00:00 UTC</span>
                <span>06:00 UTC</span>
                <span>12:00 UTC</span>
                <span>18:00 UTC</span>
                <span>Live Stream</span>
              </div>
            </div>

            {/* Live event logs */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-xs space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-[#E5E4E2]/70 font-sans font-semibold flex items-center justify-between">
                <span>Recent Production Executions</span>
                <span className="text-[#E6E0F0] font-mono lowercase">auto-refresh</span>
              </div>
              <div className="flex items-center justify-between text-[#E5E4E2]/90 py-1 border-b border-white/5">
                <span className="text-[#E6E0F0]">POST /api/v1/auth/session</span>
                <span className="text-[#E5E4E2]/70">200 OK • 24ms</span>
                <span className="text-[11px] text-[#E5E4E2]/50">Bangalore, IN</span>
              </div>
              <div className="flex items-center justify-between text-[#E5E4E2]/90 py-1 border-b border-white/5">
                <span className="text-[#FAF9F6]">EVENT prisma.inquiry.created</span>
                <span className="text-[#E5E4E2]/70">Stored PostgreSQL • 12ms</span>
                <span className="text-[11px] text-[#E5E4E2]/50">Transaction Commit</span>
              </div>
              <div className="flex items-center justify-between text-[#E5E4E2]/90 py-1">
                <span className="text-[#E5E4E2]">JOB email.dispatch(Resend)</span>
                <span className="text-[#E5E4E2]/70">Triggered • 202 Accepted</span>
                <span className="text-[11px] text-[#E5E4E2]/50">SMTP Worker</span>
              </div>
            </div>
          </div>

          {/* Right Supporting Panels (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Panel 1: Interactive Mobile Experience Preview */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#FAF9F6]">
                  <Smartphone className="w-4 h-4 text-[#E6E0F0]" />
                  <span>Mobile Application UI</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-[#E5E4E2]">iOS & Android</span>
              </div>

              {/* Realistic Mini Device Frame */}
              <div className="w-full bg-[#171514] border border-white/10 rounded-2xl p-3 shadow-inner">
                <div className="w-16 h-1 bg-white/20 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold text-[#FAF9F6]">WeCove Mobile Hub</div>
                  <span className="w-2 h-2 rounded-full bg-[#E6E0F0]" />
                </div>

                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 mb-2">
                  <div className="text-[10px] text-[#E5E4E2]/70">Task Automation Queue</div>
                  <div className="text-sm font-bold text-[#FAF9F6] font-mono mt-0.5">99.4% Uptime</div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className="bg-[#6F4E37] h-full w-[84%]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="p-2 rounded bg-white/5 text-center text-[#E5E4E2] hover:bg-white/10 transition-colors">
                    Deploy
                  </div>
                  <div className="p-2 rounded bg-[#6F4E37] text-[#FAF9F6] font-semibold text-center hover:bg-[#553B2A] transition-colors">
                    Sync DB
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Live Code & Microservices API snippet */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#E5E4E2]/70 mb-2 pb-1.5 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#E6E0F0]" />
                  <span className="font-sans text-xs font-semibold text-[#FAF9F6]">Full-Stack Core</span>
                </div>
                <span className="text-[10px] text-[#E5E4E2]/50">TypeScript</span>
              </div>
              <pre className="text-[#E5E4E2]/90 leading-relaxed overflow-x-auto">
                <span className="text-[#E6E0F0]">export async function</span>{' '}
                <span className="text-[#FAF9F6]">launchDigitalProduct</span>() &#123;{'\n'}
                {'  '}<span className="text-[#E5E4E2]/50">// WeCove.in Architecture</span>{'\n'}
                {'  '}<span className="text-[#E6E0F0]">const</span> stack = &#123;{'\n'}
                {'    '}frontend: <span className="text-[#E6E0F0]">'React + TS'</span>,{'\n'}
                {'    '}backend: <span className="text-[#E6E0F0]">'Node + Express'</span>,{'\n'}
                {'    '}database: <span className="text-[#E6E0F0]">'PostgreSQL'</span>,{'\n'}
                {'    '}delivery: <span className="text-[#FAF9F6]">'Production'</span>{'\n'}
                {'  '}&#125;;{'\n'}
                {'  '}<span className="text-[#E6E0F0]">return await</span> deploy(stack);{'\n'}
                &#125;
              </pre>
            </div>

            {/* Panel 3: Design Tokens / Precision System */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FAF9F6]">
                  <Layers className="w-3.5 h-3.5 text-[#E6E0F0]" />
                  <span>Design System Tokens</span>
                </div>
                <span className="text-[10px] text-[#E6E0F0] font-mono">Pixel-Perfect</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-5 h-5 rounded bg-[#6F4E37] border border-white/20" title="Mocha Brown: #6F4E37" />
                <span className="w-5 h-5 rounded bg-[#E5E4E2] border border-white/20" title="Platinum Silver: #E5E4E2" />
                <span className="w-5 h-5 rounded bg-[#E6E0F0] border border-white/20" title="Pale Lavender: #E6E0F0" />
                <span className="w-5 h-5 rounded bg-[#FAF9F6] border border-white/20" title="Warm White: #FAF9F6" />
                <span className="text-[11px] text-[#E5E4E2]/70 ml-auto font-mono">DM Serif + Manrope</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
