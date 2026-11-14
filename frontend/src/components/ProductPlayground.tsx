import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Bot,
  Brain,
  Check,
  Package,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
  Zap,
  Layers,
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
    <section className="py-24 bg-[#E6E0F0]/25 text-[#1F1D1B] relative overflow-hidden border-t border-[#6F4E37]/15 font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#E6E0F0]/60 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#E5E4E2]/70 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#6F4E37]/15 text-xs font-semibold text-[#6F4E37] mb-4 shadow-sm">
            <Layers className="w-3.5 h-3.5" />
            <span>INTERACTIVE PRODUCT PLAYGROUND</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#1F1D1B] mb-5">
            We don't just write code.{' '}
            <span className="text-[#6F4E37] italic">We build products people can use.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#57524D] leading-relaxed">
            Explore functional demonstration architectures crafted by WeCove.in. Each product prototype demonstrates our
            depth in frontend state design, micro-interactions, responsive data flow, and reliable system interfaces.
          </p>
          <div className="mt-3 text-xs text-[#78716C] font-mono">
            *Demonstration concepts designed by WeCove.in to showcase engineering capabilities.
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-10 overflow-x-auto pb-2 scrollbar-none">
          <div className="inline-flex p-1.5 rounded-full bg-[#E5E4E2] border border-[#6F4E37]/15 gap-1 sm:gap-2 shadow-inner">
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
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#6F4E37] text-[#FAF9F6] shadow-sm'
                      : 'text-[#57524D] hover:text-[#6F4E37] hover:bg-white/60'
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
        <div className="relative min-h-[520px] rounded-3xl bg-[#FFFFFF] border border-[#6F4E37]/15 p-4 sm:p-8 shadow-card">
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
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#6F4E37]/10">
                  <div>
                    <span className="text-[11px] font-mono text-[#6F4E37] uppercase tracking-wider font-semibold">
                      Prototype Mode: Enterprise Multi-Tenant
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif text-[#1F1D1B] mt-0.5">Nexus Analytics & Billing Engine</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#E5E4E2] rounded-full p-1 text-xs">
                      <button
                        onClick={() => setSelectedPlanPeriod('monthly')}
                        className={`px-3.5 py-1 rounded-full transition-colors ${
                          selectedPlanPeriod === 'monthly' ? 'bg-[#6F4E37] text-[#FAF9F6] font-semibold shadow-sm' : 'text-[#57524D]'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setSelectedPlanPeriod('annual')}
                        className={`px-3.5 py-1 rounded-full transition-colors ${
                          selectedPlanPeriod === 'annual' ? 'bg-[#6F4E37] text-[#FAF9F6] font-semibold shadow-sm' : 'text-[#57524D]'
                        }`}
                      >
                        Annual (-20%)
                      </button>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6E0F0] text-[#6F4E37] text-xs font-mono font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6F4E37] animate-pulse" />
                      Live Feed
                    </span>
                  </div>
                </div>

                {/* SaaS Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#6F4E37]/15">
                    <div className="text-xs text-[#57524D] mb-1 font-medium">Monthly Recurring Revenue</div>
                    <div className="text-2xl font-bold font-mono text-[#1F1D1B]">
                      {selectedPlanPeriod === 'monthly' ? '$68,400' : '$820,800'}
                    </div>
                    <div className="text-[11px] text-[#6F4E37] font-mono font-semibold mt-1">+22.4% vs last cycle</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#6F4E37]/15">
                    <div className="text-xs text-[#57524D] mb-1 font-medium">Active Subscribed Seats</div>
                    <div className="text-2xl font-bold font-mono text-[#1F1D1B]">3,490</div>
                    <div className="text-[11px] text-[#78716C] font-mono mt-1">98.2% retention rate</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#6F4E37]/15">
                    <div className="text-xs text-[#57524D] mb-1 font-medium">API Quota Utilization</div>
                    <div className="text-2xl font-bold font-mono text-[#1F1D1B]">74.2%</div>
                    <div className="w-full bg-[#E5E4E2] rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-[#6F4E37] h-full w-[74%]" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#6F4E37]/15">
                    <div className="text-xs text-[#57524D] mb-1 font-medium">Server Cluster Response</div>
                    <div className="text-2xl font-bold font-mono text-[#1F1D1B]">28ms</div>
                    <div className="text-[11px] text-[#6F4E37] font-mono font-semibold mt-1">Global Anycast Routing</div>
                  </div>
                </div>

                {/* Simulated Data Table */}
                <div className="bg-[#FAF9F6] border border-[#6F4E37]/15 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-[#6F4E37]/10 flex items-center justify-between text-xs font-semibold text-[#1F1D1B]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#6F4E37]" />
                      <span>Enterprise Tenant Organizations</span>
                    </div>
                    <span className="font-mono text-[#78716C]">Showing 4 of 124 organizations</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#1F1D1B]">
                      <thead className="bg-[#E5E4E2]/50 text-[#57524D] uppercase font-mono text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Organization</th>
                          <th className="py-3 px-4">Current Plan</th>
                          <th className="py-3 px-4">Monthly Ingestion</th>
                          <th className="py-3 px-4">Health Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#6F4E37]/10 font-mono">
                        <tr>
                          <td className="py-3.5 px-4 font-sans font-medium text-[#1F1D1B] flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-[#E6E0F0] text-[#6F4E37] flex items-center justify-center text-xs font-bold font-mono">
                              V
                            </span>
                            Vanguard Logistics Ltd
                          </td>
                          <td className="py-3.5 px-4">Scale Tier</td>
                          <td className="py-3.5 px-4">2.4 TB / mo</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6E0F0] text-[#6F4E37] text-[10px] font-semibold">
                              Operational
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button className="text-[#6F4E37] hover:underline font-sans text-xs font-semibold">Manage</button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3.5 px-4 font-sans font-medium text-[#1F1D1B] flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-[#E6E0F0] text-[#6F4E37] flex items-center justify-center text-xs font-bold font-mono">
                              A
                            </span>
                            Apex Health Systems
                          </td>
                          <td className="py-3.5 px-4">Enterprise Dedicated</td>
                          <td className="py-3.5 px-4">8.1 TB / mo</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6E0F0] text-[#6F4E37] text-[10px] font-semibold">
                              Operational
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button className="text-[#6F4E37] hover:underline font-sans text-xs font-semibold">Manage</button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3.5 px-4 font-sans font-medium text-[#1F1D1B] flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-[#E6E0F0] text-[#6F4E37] flex items-center justify-center text-xs font-bold font-mono">
                              O
                            </span>
                            OmniPay Gateway
                          </td>
                          <td className="py-3.5 px-4">Growth Tier</td>
                          <td className="py-3.5 px-4">1.2 TB / mo</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6E0F0] text-[#6F4E37] text-[10px] font-semibold">
                              Operational
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button className="text-[#6F4E37] hover:underline font-sans text-xs font-semibold">Manage</button>
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
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E6E0F0] text-xs font-mono text-[#6F4E37] font-semibold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>CROSS-PLATFORM REACT NATIVE ENGINE</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-serif text-[#1F1D1B]">
                    Native Performance. Unified Codebase.
                  </h3>
                  <p className="text-[#57524D] text-sm leading-relaxed">
                    We develop high-frame-rate mobile applications for iOS and Android. With offline-first synchronization,
                    biometric auth, push telemetry, and instantaneous responsiveness, your users experience fluid luxury on any handheld device.
                  </p>

                  <div className="space-y-2.5 pt-2 text-xs text-[#1F1D1B]">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#6F4E37]" />
                      <span>60fps fluid gesture navigation and native bridge optimizations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#6F4E37]" />
                      <span>End-to-end encrypted local persistence & biometric validation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#6F4E37]" />
                      <span>App Store & Google Play automated CI/CD deployment pipelines</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() => setActiveScreen('wallet')}
                      className={`px-4 py-2 rounded-full text-xs font-mono transition-colors ${
                        activeScreen === 'wallet' ? 'bg-[#6F4E37] text-[#FAF9F6] font-semibold shadow-sm' : 'bg-[#E5E4E2] text-[#57524D]'
                      }`}
                    >
                      Screen: Asset Portfolio
                    </button>
                    <button
                      onClick={() => setActiveScreen('analytics')}
                      className={`px-4 py-2 rounded-full text-xs font-mono transition-colors ${
                        activeScreen === 'analytics' ? 'bg-[#6F4E37] text-[#FAF9F6] font-semibold shadow-sm' : 'bg-[#E5E4E2] text-[#57524D]'
                      }`}
                    >
                      Screen: Realtime Trends
                    </button>
                  </div>
                </div>

                {/* High Fidelity Mobile Shell */}
                <div className="lg:col-span-6 flex justify-center">
                  <div className="w-full max-w-[310px] bg-[#FAF9F6] border-4 border-[#E5E4E2] rounded-[38px] p-4 shadow-xl relative overflow-hidden">
                    {/* Notch / Dynamic Island */}
                    <div className="w-24 h-4 bg-[#E5E4E2] rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D1CFCC] inline-block mr-2" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6F4E37] inline-block" />
                    </div>

                    {/* Mobile Screen Content */}
                    {activeScreen === 'wallet' ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#57524D]">Total Portfolio</span>
                          <span className="text-[#6F4E37] font-mono font-semibold">Live Sync</span>
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#1F1D1B]">$42,918.50</div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <button className="py-2.5 rounded-xl bg-[#6F4E37] text-[#FAF9F6] font-semibold text-center hover:bg-[#553B2A] transition-colors">
                            Transfer
                          </button>
                          <button className="py-2.5 rounded-xl bg-[#E6E0F0] text-[#6F4E37] font-semibold text-center hover:bg-[#D0C4E4] transition-colors">
                            Deposit
                          </button>
                        </div>

                        <div className="pt-2">
                          <div className="text-[11px] font-semibold text-[#57524D] uppercase mb-2">Recent Transactions</div>
                          <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#FFFFFF] border border-[#6F4E37]/10">
                              <div>
                                <div className="text-[#1F1D1B] font-sans text-xs font-semibold">Stripe Payout</div>
                                <div className="text-[#78716C] text-[10px]">Today, 14:20</div>
                              </div>
                              <span className="text-[#6F4E37] font-bold">+$3,450.00</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#FFFFFF] border border-[#6F4E37]/10">
                              <div>
                                <div className="text-[#1F1D1B] font-sans text-xs font-semibold">AWS Infrastructure</div>
                                <div className="text-[#78716C] text-[10px]">Yesterday</div>
                              </div>
                              <span className="text-[#57524D]">-$240.80</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-xs text-[#57524D]">Yield & Velocity Tracking</div>
                        <div className="text-xl font-bold font-mono text-[#6F4E37]">+34.8% Gain</div>
                        <div className="h-24 bg-[#FAF9F6] border border-[#6F4E37]/10 rounded-xl flex items-end p-2 gap-1.5">
                          {[30, 45, 60, 50, 75, 90, 85, 100].map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${h}%` }}
                              className="flex-1 bg-[#6F4E37] rounded-t-sm"
                            />
                          ))}
                        </div>
                        <div className="p-3 bg-[#E6E0F0]/50 rounded-xl text-xs space-y-1">
                          <div className="text-[#57524D] text-[10px]">Risk Mitigation Score</div>
                          <div className="text-[#1F1D1B] font-mono font-bold">99.8 / 100 (Optimal)</div>
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
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#6F4E37]/10">
                  <div>
                    <span className="text-[11px] font-mono text-[#6F4E37] uppercase tracking-wider font-semibold">
                      Internal Operations & Workflow Automation
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif text-[#1F1D1B] mt-0.5">Enterprise Resource & Operations Hub</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#57524D] font-mono">Workflow Engine: ACTIVE</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#6F4E37]/15">
                    <div className="flex items-center justify-between text-xs text-[#57524D] mb-2">
                      <span>Supply Pipeline</span>
                      <Package className="w-4 h-4 text-[#6F4E37]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#1F1D1B]">1,840 Units</div>
                    <div className="text-[11px] text-[#6F4E37] font-mono font-semibold mt-1">99.4% Fulfillment rate</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#6F4E37]/15">
                    <div className="flex items-center justify-between text-xs text-[#57524D] mb-2">
                      <span>SLA Compliance</span>
                      <ShieldCheck className="w-4 h-4 text-[#6F4E37]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#1F1D1B]">99.9%</div>
                    <div className="text-[11px] text-[#78716C] font-mono mt-1">Zero critical breaches</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#6F4E37]/15">
                    <div className="flex items-center justify-between text-xs text-[#57524D] mb-2">
                      <span>Automated Dispatches</span>
                      <Zap className="w-4 h-4 text-[#6F4E37]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#1F1D1B]">412 Today</div>
                    <div className="text-[11px] text-[#6F4E37] font-mono font-semibold mt-1">Processed without manual intervention</div>
                  </div>
                </div>

                {/* Workflow Pipeline Visual */}
                <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#6F4E37]/15">
                  <div className="text-xs font-semibold text-[#1F1D1B] mb-3 flex items-center justify-between">
                    <span>Active Workflow Orchestration</span>
                    <span className="text-[10px] font-mono text-[#6F4E37] font-bold">Continuous Sync</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#6F4E37]/12 shadow-sm">
                      <div className="text-[10px] font-mono text-[#78716C] mb-1">STAGE 01</div>
                      <div className="font-semibold text-[#1F1D1B]">Inbound Order Webhook</div>
                      <div className="text-[11px] text-[#6F4E37] mt-2 font-mono font-semibold">✓ 2ms latency</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#6F4E37]/12 shadow-sm">
                      <div className="text-[10px] font-mono text-[#78716C] mb-1">STAGE 02</div>
                      <div className="font-semibold text-[#1F1D1B]">Inventory Allocation</div>
                      <div className="text-[11px] text-[#6F4E37] mt-2 font-mono font-semibold">✓ Postgres Lock Cleared</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#6F4E37]/12 shadow-sm">
                      <div className="text-[10px] font-mono text-[#78716C] mb-1">STAGE 03</div>
                      <div className="font-semibold text-[#1F1D1B]">ERP Invoice Synthesis</div>
                      <div className="text-[11px] text-[#6F4E37] mt-2 font-mono font-semibold">✓ PDF Signed & Queued</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#6F4E37]/12 shadow-sm">
                      <div className="text-[10px] font-mono text-[#78716C] mb-1">STAGE 04</div>
                      <div className="font-semibold text-[#1F1D1B]">Fulfillment Dispatch</div>
                      <div className="text-[11px] text-[#6F4E37] mt-2 font-mono font-bold">● Realtime Transit</div>
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
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#6F4E37]/10">
                  <div>
                    <span className="text-[11px] font-mono text-[#6F4E37] uppercase tracking-wider font-semibold">
                      Generative Intelligence & Vector Retrieval
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif text-[#1F1D1B] mt-0.5">Autonomous Enterprise AI Copilot</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#57524D] font-mono">Inference Engine: 142 tokens/sec</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Controls */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F1D1B] mb-1.5">Model Architecture</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#6F4E37]/20 rounded-xl px-3 py-2.5 text-xs text-[#1F1D1B] focus:border-[#6F4E37] focus:outline-none font-mono"
                      >
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Context / Multimodal)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra-Low Latency)</option>
                        <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                        <option value="gpt-4o">OpenAI GPT-4o Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#1F1D1B] mb-1">
                        <span className="font-medium">Sampling Temperature</span>
                        <span className="font-mono text-[#6F4E37] font-bold">{temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full accent-[#6F4E37] bg-[#E5E4E2]"
                      />
                      <div className="flex justify-between text-[10px] text-[#78716C] font-mono mt-1">
                        <span>Deterministic (0.1)</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1F1D1B] mb-1.5">Prompt Simulation</label>
                      <textarea
                        rows={3}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#6F4E37]/20 rounded-xl p-3 text-xs text-[#1F1D1B] focus:border-[#6F4E37] focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateAi}
                      disabled={isGenerating}
                      className="w-full py-3 px-4 rounded-xl bg-[#6F4E37] text-[#FAF9F6] font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#553B2A] transition-colors shadow-sm disabled:opacity-50"
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

                  {/* Right Response Terminal in Deep Charcoal with Lavender text */}
                  <div className="lg:col-span-7 bg-[#1F1D1B] border border-[#6F4E37]/20 rounded-2xl p-4 font-mono text-xs flex flex-col justify-between text-[#E5E4E2]">
                    <div>
                      <div className="flex items-center justify-between text-[#E5E4E2]/70 pb-2 border-b border-white/10 mb-3 text-[11px]">
                        <span className="flex items-center gap-1.5 text-[#FAF9F6]">
                          <Bot className="w-4 h-4 text-[#E6E0F0]" />
                          Model Inference Stream
                        </span>
                        <span className="text-[#E6E0F0]">Status 200 OK</span>
                      </div>

                      <div className="text-[#E5E4E2]/90 leading-relaxed whitespace-pre-wrap min-h-[140px]">
                        {isGenerating ? (
                          <div className="flex items-center gap-2 text-[#E6E0F0]">
                            <span className="w-2 h-2 rounded-full bg-[#E6E0F0] animate-ping" />
                            Streaming tokens from inference endpoint...
                          </div>
                        ) : (
                          aiResponse
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#E5E4E2]/60">
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
