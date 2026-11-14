import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  CheckCircle2,
  Compass,
  FileCheck2,
  Flame,
  Layout,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Wrench
} from 'lucide-react';

interface Stage {
  number: string;
  name: string;
  tagline: string;
  description: string;
  deliverables: string[];
  icon: React.ElementType;
}

const stages: Stage[] = [
  {
    number: '01',
    name: 'Discover',
    tagline: 'Understand the problem, goals, users, and requirements.',
    description:
      'We dive deep into your market opportunity, technical prerequisites, user personas, and commercial objectives. We challenge assumptions before writing a single line of code.',
    deliverables: ['Discovery Brief', 'Technical Feasibility Audit', 'User Flow Matrix', 'Milestone Schedule'],
    icon: Compass,
  },
  {
    number: '02',
    name: 'Define',
    tagline: 'Establish scope, functionality, technical direction, and project priorities.',
    description:
      'We define the exact data models, architecture decisions, API boundaries, and sprint roadmaps so there are zero surprises during development.',
    deliverables: ['Product Spec Document', 'Database Schema Blueprint', 'API Contract', 'Risk Mitigation Strategy'],
    icon: FileCheck2,
  },
  {
    number: '03',
    name: 'Design',
    tagline: 'Develop the user experience, interface, and product structure.',
    description:
      'We craft high-fidelity, interactive prototypes with intentional typography, deliberate spacing, responsive layouts, and motion guidelines.',
    deliverables: ['Figma Design System', 'Component Inventory', 'High-Fidelity Wireframes', 'Interactive Micro-prototypes'],
    icon: Layout,
  },
  {
    number: '04',
    name: 'Build',
    tagline: 'Implement the frontend, backend, database, and integrations.',
    description:
      'Our engineers construct the full-stack architecture using clean React, TypeScript, Express, and PostgreSQL, adhering to strict coding standards and automated tests.',
    deliverables: ['Production Codebase', 'Prisma Schema & Migrations', 'REST / GraphQL Services', 'Unit & Integration Tests'],
    icon: Wrench,
  },
  {
    number: '05',
    name: 'Launch',
    tagline: 'Test, optimize, deploy, and prepare the product for release.',
    description:
      'Rigorous cross-browser QA, Core Web Vitals performance tuning, penetration testing, and zero-downtime deployment to production infrastructure.',
    deliverables: ['Performance Audit Score (90+)', 'SSL & CDN Configuration', 'Telemetry Monitoring', 'Production Release Notes'],
    icon: Rocket,
  },
  {
    number: '06',
    name: 'Scale',
    tagline: 'Maintain, improve, and extend the product as requirements evolve.',
    description:
      'Continuous feature delivery, database optimization, infrastructure scaling, security patch management, and dedicated engineering support.',
    deliverables: ['Database Query Optimization', 'Feature Sprints', 'Security Patches', '24/7 SLA Telemetry'],
    icon: TrendingUp,
  },
];

export const ProcessTimeline: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(0);

  return (
    <section className="py-24 bg-[#F4F3F1] text-[#1F1D1B] border-t border-[#E5E4E2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-4">
              <Flame className="w-3.5 h-3.5 text-[#6F4E37]" />
              <span>THE WECOVE METHOD</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif text-[#1F1D1B] mb-4 leading-tight">
              From the first conversation <br />
              <span className="italic text-[#6F4E37]">to the final release.</span>
            </h2>
            <p className="text-[#5A5550] text-base sm:text-lg font-sans">
              A structured, transparent engineering lifecycle designed to eliminate ambiguity, ship on time, and
              build digital products built to scale.
            </p>
          </div>

          <div>
            <Link
              to="/process"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#553B2A] text-[#FAF9F6] font-semibold transition-all text-xs font-sans shadow-sm"
            >
              <span>EXPLORE FULL PROCESS</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Process Stage Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {stages.map((st, index) => {
            const Icon = st.icon;
            const isActive = activeStage === index;
            return (
              <button
                key={st.number}
                type="button"
                onClick={() => setActiveStage(index)}
                className={`p-4 rounded-2xl border text-left transition-all relative ${
                  isActive
                    ? 'bg-[#6F4E37] text-white border-[#6F4E37] shadow-md'
                    : 'bg-[#FFFFFF] border-[#E5E4E2] text-[#1F1D1B] hover:border-[#6F4E37]/30 hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-mono text-xs font-bold ${isActive ? 'text-[#E6E0F0]' : 'text-[#8C847E]'}`}>
                    {st.number}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#E6E0F0]' : 'text-[#8C847E]'}`} />
                </div>
                <div className={`text-sm font-bold font-sans ${isActive ? 'text-white' : 'text-[#1F1D1B]'}`}>
                  {st.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detailed Card */}
        <div className="p-6 sm:p-10 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono font-bold text-[#6F4E37]">
                  {stages[activeStage].number}
                </span>
                <span className="text-2xl sm:text-3xl font-serif text-[#1F1D1B]">
                  Stage {stages[activeStage].name}
                </span>
              </div>

              <div className="text-base text-[#3A3530] font-medium font-sans">
                {stages[activeStage].tagline}
              </div>

              <p className="text-[#5A5550] text-sm leading-relaxed font-sans">
                {stages[activeStage].description}
              </p>
            </div>

            <div className="lg:col-span-5 bg-[#FAF9F6] border border-[#E5E4E2] rounded-2xl p-6">
              <div className="text-xs font-mono uppercase tracking-wider text-[#6F4E37] mb-3 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#6F4E37]" />
                <span>Standard Deliverables</span>
              </div>
              <ul className="space-y-2.5">
                {stages[activeStage].deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-[#4A4540] font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6F4E37] mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
