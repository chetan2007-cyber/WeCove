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
    <section className="py-24 bg-[#FAF9F6] text-[#1F1D1B] border-t border-[#E5E4E2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-4">
            <Cpu className="w-3.5 h-3.5 text-[#6F4E37]" />
            <span>FULL-STACK ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#1F1D1B] mb-4 leading-tight">
            Thoughtful design.{' '}
            <span className="italic text-[#6F4E37]">Solid engineering.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#5A5550] leading-relaxed font-sans">
            From the initial component render to the cloud database write, we engineer every layer of the stack with
            precision, resilience, and strict type safety.
          </p>
        </div>

        {/* Architecture Pipeline Flow Diagram */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-mono text-[#7D7671] uppercase tracking-wider mb-4">
            <span>Engineering Pipeline:</span>
            <span className="text-[#6F4E37] font-bold">INTERFACE → APPLICATION → API → DATABASE → DEPLOYMENT</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {techTiers.map((tier) => {
              const isSelected = selectedTier === tier.id;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  type="button"
                  className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#6F4E37] text-white border-[#6F4E37] shadow-md'
                      : 'bg-[#FFFFFF] border-[#E5E4E2] text-[#1F1D1B] hover:border-[#6F4E37]/40 hover:bg-[#FAF9F6]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#E6E0F0]" />
                  )}
                  <div className={`text-[11px] font-mono mb-1 ${isSelected ? 'text-[#E6E0F0]' : 'text-[#8C847E]'}`}>
                    {tier.step}
                  </div>
                  <div className={`text-sm font-bold mb-2 font-sans ${isSelected ? 'text-white' : 'text-[#1F1D1B]'}`}>
                    {tier.name}
                  </div>
                  <div className={`text-[11px] line-clamp-2 ${isSelected ? 'text-[#FAF9F6]/80' : 'text-[#6A635E]'}`}>
                    {tier.highlight}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Tier Deep-Dive Panel */}
        <div className="bg-[#FFFFFF] border border-[#E5E4E2] rounded-3xl p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#E6E0F0] text-[#6F4E37] font-mono text-xs font-semibold">
                  TIER {activeData.step}
                </span>
                <span className="text-2xl font-serif text-[#1F1D1B]">{activeData.name}</span>
              </div>

              <p className="text-[#5A5550] text-sm leading-relaxed font-sans">
                {activeData.description}
              </p>

              <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E4E2] text-xs text-[#5A5550]">
                <span className="text-[#6F4E37] font-mono font-semibold">Engineering Philosophy: </span>
                {activeData.highlight}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="text-xs font-mono uppercase tracking-wider text-[#7D7671] mb-3">
                Core Technologies & Tools:
              </div>
              <div className="grid grid-cols-2 gap-3">
                {activeData.technologies.map((tech, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E4E2] hover:border-[#6F4E37]/30 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-[#1F1D1B] font-sans">{tech.name}</div>
                      <div className="text-[10px] text-[#7D7671] font-mono">{tech.tag}</div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
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
