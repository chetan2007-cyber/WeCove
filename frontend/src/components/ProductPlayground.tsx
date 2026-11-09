import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Bot,
  Brain,
  Check,
  ChevronRight,
  Cpu,
  Database,
  Filter,
  Layers,
  LineChart,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sliders,
  Smartphone,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

type ProductTab = 'saas' | 'mobile' | 'erp' | 'ai';

export const ProductPlayground: React.FC = () => {
  const [activeProduct, setActiveProduct] = useState<ProductTab>('saas');

  // SaaS Tab State
  const [selectedPlanPeriod, setSelectedPlanPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Mobile Tab State
  const [activeScreen, setActiveScreen] = useState<'wallet' | 'analytics' | 'settings'>('wallet');

  // AI Tab State
  const [temperature, setTemperature] = useState<number>(0.7);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-pro');
  const [aiPrompt, setAiPrompt] = useState<string>('Summarize the latest Q3 pipeline metrics and forecast compute requirements.');
  const [aiResponse, setAiResponse] = useState<string>(
    'Summary: Q3 throughput accelerated +24% YoY. Database I/O peaked at 4,200 IOPS during surge hours. Recommended action: Provision read-replicas in ap-south-1 region.'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleSimulateAi = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setAiResponse(
        `[Analysis Complete for ${selectedModel} (Temp: ${temperature})] Compute utilization is steady at 64%. All microservice endpoints responding within 34ms SLA. No anomalies detected in transactional logs.`
      );
      setIsGenerating(false);
    }, 700);
  };

  return (
    <section className="py-24 bg-[#090A0D] text-white relative overflow-hidden border-t border-white/5">
      {/* Background ambient gradient */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#CCFF00]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>INTERACTIVE PRODUCT PLAYGROUND</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5">
            We don't just write code.{' '}
            <span className="text-[#CCFF00]">We build products people can use.</span>
          </h2>
          <p className="text-base sm:text-lg text-brand-muted leading-relaxed">
            Explore functional demonstration architectures crafted by WeCove.in. Each product prototype demonstrates our
            depth in frontend state design, micro-interactions, responsive data flow, and reliable system interfaces.
          </p>
          <div className="mt-3 text-xs text-gray-500 font-mono">
            *Demonstration concepts designed by WeCove.in to showcase engineering capabilities.
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-10 overflow-x-auto pb-2 scrollbar-none">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#14161F] border border-white/10 gap-1 sm:gap-2">
            {[
              { id: 'saas' as ProductTab, label: 'SaaS Platform', icon: Activity },
              { id: 'mobile' as ProductTab, label: 'Mobile Application', icon: Smartphone },
              { id: 'erp' as ProductTab, label: 'Business Management', icon: Package },
              { id: 'ai' as ProductTab, label: 'AI-Enabled Product', icon: Brain },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeProduct === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveProduct(tab.id)}
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#CCFF00] text-[#08090C] font-semibold shadow-lg shadow-[#CCFF00]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Product Playground Container */}
        <div className="relative min-h-[520px] rounded-3xl bg-[#111319] border border-white/10 p-4 sm:p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* 1. SAAS PLATFORM DEMO */}
            {activeProduct === 'saas' && (
              <motion.div
                key="saas"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                {/* SaaS Top Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <span className="text-[11px] font-mono text-[#CCFF00] uppercase tracking-wider">
                      Prototype Mode: Enterprise Multi-Tenant
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">Nexus Analytics & Billing Engine</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white/5 rounded-lg p-1 text-xs">
                      <button
                        onClick={() => setSelectedPlanPeriod('monthly')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          selectedPlanPeriod === 'monthly' ? 'bg-[#1D202A] text-white font-medium' : 'text-gray-400'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setSelectedPlanPeriod('annual')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          selectedPlanPeriod === 'annual' ? 'bg-[#1D202A] text-[#CCFF00] font-medium' : 'text-gray-400'
                        }`}
                      >
                        Annual (-20%)
                      </button>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Feed
                    </span>
                  </div>
                </div>

                {/* SaaS Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-xs text-gray-400 mb-1">Monthly Recurring Revenue</div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {selectedPlanPeriod === 'monthly' ? '$68,400' : '$820,800'}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-1">+22.4% vs last cycle</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-xs text-gray-400 mb-1">Active Subscribed Seats</div>
                    <div className="text-2xl font-bold font-mono text-white">3,490</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-1">98.2% retention rate</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-xs text-gray-400 mb-1">API Quota Utilization</div>
                    <div className="text-2xl font-bold font-mono text-white">74.2%</div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-[#CCFF00] h-full w-[74%]" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-xs text-gray-400 mb-1">Server Cluster Response</div>
                    <div className="text-2xl font-bold font-mono text-white">28ms</div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-1">Global Anycast Routing</div>
                  </div>
                </div>

                {/* Simulated Data Table */}
                <div className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between text-xs font-semibold text-gray-300">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#CCFF00]" />
                      <span>Enterprise Tenant Organizations</span>
                    </div>
                    <span className="font-mono text-gray-500">Showing 4 of 124 organizations</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                      <thead className="bg-white/[0.02] text-gray-400 uppercase font-mono text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Organization</th>
                          <th className="py-3 px-4">Current Plan</th>
                          <th className="py-3 px-4">Monthly Ingestion</th>
                          <th className="py-3 px-4">Health Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        <tr>
                          <td className="py-3 px-4 font-sans font-medium text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
                              V
                            </span>
                            Vanguard Logistics Ltd
                          </td>
                          <td className="py-3 px-4">Scale Tier</td>
                          <td className="py-3 px-4">2.4 TB / mo</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                              Operational
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="text-[#CCFF00] hover:underline font-sans text-xs">Manage</button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-sans font-medium text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold font-mono">
                              A
                            </span>
                            Apex Health Systems
                          </td>
                          <td className="py-3 px-4">Enterprise Dedicated</td>
                          <td className="py-3 px-4">8.1 TB / mo</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                              Operational
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="text-[#CCFF00] hover:underline font-sans text-xs">Manage</button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-sans font-medium text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold font-mono">
                              O
                            </span>
                            OmniPay Gateway
                          </td>
                          <td className="py-3 px-4">Growth Tier</td>
                          <td className="py-3 px-4">1.2 TB / mo</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                              Operational
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="text-[#CCFF00] hover:underline font-sans text-xs">Manage</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. MOBILE APPLICATION DEMO */}
            {activeProduct === 'mobile' && (
              <motion.div
                key="mobile"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-xs font-mono text-[#CCFF00]">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>CROSS-PLATFORM REACT NATIVE ENGINE</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">
                    Native Performance. Unified Codebase.
                  </h3>
                  <p className="text-brand-muted text-sm leading-relaxed">
                    We develop high-frame-rate mobile applications for iOS and Android. With offline-first synchronization,
                    biometric auth, push telemetry, and instantaneous responsiveness, your users experience fluid luxury on any handheld device.
                  </p>

                  <div className="space-y-2 pt-2 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#CCFF00]" />
                      <span>60fps fluid gesture navigation and native bridge optimizations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#CCFF00]" />
                      <span>End-to-end encrypted local persistence & biometric validation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#CCFF00]" />
                      <span>App Store & Google Play automated CI/CD deployment pipelines</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() => setActiveScreen('wallet')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                        activeScreen === 'wallet' ? 'bg-[#CCFF00] text-black font-bold' : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      Screen: Asset Portfolio
                    </button>
                    <button
                      onClick={() => setActiveScreen('analytics')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                        activeScreen === 'analytics' ? 'bg-[#CCFF00] text-black font-bold' : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      Screen: Realtime Trends
                    </button>
                  </div>
                </div>

                {/* High Fidelity Mobile Shell */}
                <div className="lg:col-span-6 flex justify-center">
                  <div className="w-full max-w-[310px] bg-[#0A0B0E] border-4 border-[#222634] rounded-[38px] p-4 shadow-2xl relative overflow-hidden">
                    {/* Notch / Dynamic Island */}
                    <div className="w-24 h-4 bg-[#222634] rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-black/60 inline-block mr-2" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    </div>

                    {/* Mobile Screen Content */}
                    {activeScreen === 'wallet' ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Total Portfolio</span>
                          <span className="text-[#CCFF00] font-mono">Live Sync</span>
                        </div>
                        <div className="text-2xl font-bold font-mono text-white">$42,918.50</div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <button className="py-2 rounded-xl bg-[#CCFF00] text-[#08090C] font-bold text-center">
                            Transfer
                          </button>
                          <button className="py-2 rounded-xl bg-white/10 text-white font-medium text-center hover:bg-white/15">
                            Deposit
                          </button>
                        </div>

                        <div className="pt-2">
                          <div className="text-[11px] font-semibold text-gray-400 uppercase mb-2">Recent Transactions</div>
                          <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                              <div>
                                <div className="text-white font-sans text-xs">Stripe Payout</div>
                                <div className="text-gray-500 text-[10px]">Today, 14:20</div>
                              </div>
                              <span className="text-emerald-400 font-bold">+$3,450.00</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                              <div>
                                <div className="text-white font-sans text-xs">AWS Infrastructure</div>
                                <div className="text-gray-500 text-[10px]">Yesterday</div>
                              </div>
                              <span className="text-gray-300">-$240.80</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-xs text-gray-400">Yield & Velocity Tracking</div>
                        <div className="text-xl font-bold font-mono text-emerald-400">+34.8% Gain</div>
                        <div className="h-24 bg-white/5 rounded-xl flex items-end p-2 gap-1.5">
                          {[30, 45, 60, 50, 75, 90, 85, 100].map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${h}%` }}
                              className="flex-1 bg-[#CCFF00] rounded-t-sm opacity-80"
                            />
                          ))}
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl text-xs space-y-1">
                          <div className="text-gray-400 text-[10px]">Risk Mitigation Score</div>
                          <div className="text-white font-mono font-bold">99.8 / 100 (Optimal)</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. BUSINESS MANAGEMENT PLATFORM (ERP) */}
            {activeProduct === 'erp' && (
              <motion.div
                key="erp"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <span className="text-[11px] font-mono text-[#CCFF00] uppercase tracking-wider">
                      Internal Operations & Workflow Automation
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">Enterprise Resource & Operations Hub</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">Workflow Engine: ACTIVE</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Supply Pipeline</span>
                      <Package className="w-4 h-4 text-[#CCFF00]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">1,840 Units</div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-1">99.4% Fulfillment rate</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>SLA Compliance</span>
                      <ShieldCheck className="w-4 h-4 text-[#CCFF00]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">99.9%</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-1">Zero critical breaches</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Automated Dispatches</span>
                      <Zap className="w-4 h-4 text-[#CCFF00]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">412 Today</div>
                    <div className="text-[11px] text-[#CCFF00] font-mono mt-1">Processed without manual intervention</div>
                  </div>
                </div>

                {/* Workflow Pipeline Visual */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div className="text-xs font-semibold text-gray-300 mb-3 flex items-center justify-between">
                    <span>Active Workflow Orchestration</span>
                    <span className="text-[10px] font-mono text-[#CCFF00]">Continuous Sync</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] font-mono text-gray-400 mb-1">STAGE 01</div>
                      <div className="font-semibold text-white">Inbound Order Webhook</div>
                      <div className="text-[11px] text-emerald-400 mt-2 font-mono">✓ 2ms latency</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] font-mono text-gray-400 mb-1">STAGE 02</div>
                      <div className="font-semibold text-white">Inventory Allocation</div>
                      <div className="text-[11px] text-emerald-400 mt-2 font-mono">✓ Postgres Lock Cleared</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] font-mono text-gray-400 mb-1">STAGE 03</div>
                      <div className="font-semibold text-white">ERP Invoice Synthesis</div>
                      <div className="text-[11px] text-emerald-400 mt-2 font-mono">✓ PDF Signed & Queued</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] font-mono text-gray-400 mb-1">STAGE 04</div>
                      <div className="font-semibold text-white">Fulfillment Dispatch</div>
                      <div className="text-[11px] text-[#CCFF00] mt-2 font-mono">● Realtime Transit</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. AI-ENABLED PRODUCT DEMO */}
            {activeProduct === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <span className="text-[11px] font-mono text-[#CCFF00] uppercase tracking-wider">
                      Generative Intelligence & Vector Retrieval
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">Autonomous Enterprise AI Copilot</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-mono">Inference Engine: 142 tokens/sec</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Controls */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Model Architecture</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-[#181A22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#CCFF00] focus:outline-none font-mono"
                      >
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Context / Multimodal)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra-Low Latency)</option>
                        <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                        <option value="gpt-4o">OpenAI GPT-4o Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span>Sampling Temperature</span>
                        <span className="font-mono text-[#CCFF00]">{temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full accent-[#CCFF00] bg-white/10"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                        <span>Deterministic (0.1)</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Prompt Simulation</label>
                      <textarea
                        rows={3}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="w-full bg-[#181A22] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateAi}
                      disabled={isGenerating}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#CCFF00] text-[#08090C] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#BCE800] transition-colors shadow-lg disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating LLM Inference...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Execute AI Inference</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Response Terminal */}
                  <div className="lg:col-span-7 bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-gray-400 pb-2 border-b border-white/5 mb-3 text-[11px]">
                        <span className="flex items-center gap-1.5 text-white">
                          <Bot className="w-4 h-4 text-[#CCFF00]" />
                          Model Inference Stream
                        </span>
                        <span className="text-emerald-400">Status 200 OK</span>
                      </div>

                      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap min-h-[140px]">
                        {isGenerating ? (
                          <div className="flex items-center gap-2 text-[#CCFF00]">
                            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
                            Streaming tokens from inference endpoint...
                          </div>
                        ) : (
                          aiResponse
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                      <span>Token Usage: 320 in / 148 out</span>
                      <span>Latency: 420ms</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
