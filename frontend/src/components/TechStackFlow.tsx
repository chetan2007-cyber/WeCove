import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Cloud,
  Code2,
  Cpu,
  Database,
  Layers,
  Network,
  Server,
  Smartphone,
  Terminal
} from 'lucide-react';

interface TechTier {
  id: string;
  step: string;
  name: string;
  description: string;
  technologies: { name: string; tag: string }[];
  highlight: string;
}

const techTiers: TechTier[] = [
  {
    id: 'interface',
    step: '01',
    name: 'Interface Layer',
    description: 'Pixel-perfect, accessible, and high-framerate client applications engineered for seamless UX.',
    technologies: [
      { name: 'React', tag: 'Core UI' },
      { name: 'TypeScript', tag: 'Type Safety' },
      { name: 'Tailwind CSS', tag: 'Design Tokens' },
      { name: 'Framer Motion', tag: 'Micro-interactions' },
    ],
    highlight: 'Accessible, responsive UI with zero unnecessary bloat',
  },
  {
    id: 'application',
    step: '02',
    name: 'Application Core',
    description: 'Cross-platform logic, client-side routing, optimistic UI updates, and offline state handling.',
    technologies: [
      { name: 'React Native', tag: 'iOS & Android' },
      { name: 'State Machines', tag: 'Predictable UX' },
      { name: 'WebSockets', tag: 'Live Sync' },
      { name: 'PWA / Edge Cache', tag: 'Offline Support' },
    ],
    highlight: 'Native handheld performance with shared business logic',
  },
  {
    id: 'api',
    step: '03',
    name: 'API & Microservices',
    description: 'RESTful architectures, resilient middleware, rate limiting, and intelligent AI model gateways.',
    technologies: [
      { name: 'Node.js / Express', tag: 'High Concurrency' },
      { name: 'Python / FastAPI', tag: 'AI & Data Compute' },
      { name: 'Zod Validation', tag: 'Strict Schemas' },
      { name: 'AI LLM APIs', tag: 'Gemini & Claude' },
    ],
    highlight: 'Strictly validated, secure endpoints with rate limiting & audit logs',
  },
  {
    id: 'database',
    step: '04',
    name: 'Database & Persistence',
    description: 'Relational data models, ACID compliance, document stores, and ultra-fast in-memory caching.',
    technologies: [
      { name: 'PostgreSQL', tag: 'Relational & ACID' },
      { name: 'Prisma ORM', tag: 'Type-Safe Queries' },
      { name: 'MongoDB', tag: 'Flexible Documents' },
      { name: 'Redis Cache', tag: 'Sub-millisecond' },
    ],
    highlight: 'Zero data loss with strict migrations and connection pooling',
  },
  {
    id: 'deployment',
    step: '05',
    name: 'Cloud & Infrastructure',
    description: 'Containerized deployment pipelines, global edge routing, SSL automation, and uptime monitoring.',
    technologies: [
      { name: 'Docker', tag: 'Containerization' },
      { name: 'Cloud Clusters', tag: 'AWS & GCP' },
      { name: 'Automated CI/CD', tag: 'Zero Downtime' },
      { name: 'Telemetry & Logs', tag: 'Observability' },
    ],
    highlight: 'Continuous delivery with automated rollbacks and SSL encryption',
  },
];

export const TechStackFlow: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<string>('interface');

  const activeData = techTiers.find((t) => t.id === selectedTier) || techTiers[0];

  return (
    <section className="py-24 bg-[#08090C] text-white border-t border-white/5 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-4">
            <Cpu className="w-3.5 h-3.5" />
            <span>FULL-STACK ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Thoughtful design.{' '}
            <span className="text-[#CCFF00]">Solid engineering.</span>
          </h2>
          <p className="text-base sm:text-lg text-brand-muted leading-relaxed">
            From the initial component render to the cloud database write, we engineer every layer of the stack with
            precision, resilience, and strict type safety.
          </p>
        </div>

        {/* Architecture Pipeline Flow Diagram */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">
            <span>Engineering Pipeline:</span>
            <span className="text-white font-bold">INTERFACE → APPLICATION → API → DATABASE → DEPLOYMENT</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {techTiers.map((tier) => {
              const isSelected = selectedTier === tier.id;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  type="button"
                  className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#14161F] border-[#CCFF00] shadow-lg shadow-[#CCFF00]/10'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#CCFF00]" />
                  )}
                  <div className="text-[11px] font-mono text-gray-500 mb-1">{tier.step}</div>
                  <div className="text-sm font-bold text-white mb-2">{tier.name}</div>
                  <div className="text-[11px] text-gray-400 line-clamp-2">{tier.highlight}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Tier Deep-Dive Panel */}
        <div className="bg-[#101217] border border-white/10 rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#CCFF00]/15 text-[#CCFF00] font-mono text-xs font-semibold">
                  TIER {activeData.step}
                </span>
                <span className="text-xl font-bold text-white">{activeData.name}</span>
              </div>

              <p className="text-brand-muted text-sm leading-relaxed">
                {activeData.description}
              </p>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-gray-300">
                <span className="text-[#CCFF00] font-mono font-semibold">Engineering Philosophy: </span>
                {activeData.highlight}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-3">
                Core Technologies & Tools:
              </div>
              <div className="grid grid-cols-2 gap-3">
                {activeData.technologies.map((tech, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-white font-sans">{tech.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{tech.tag}</div>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
