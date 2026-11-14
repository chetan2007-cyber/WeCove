import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  FileCode,
  Flame,
  Layout,
  MessageSquare,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Wrench,
  Zap
} from 'lucide-react';

const processPhases = [
  {
    step: '01',
    name: 'Discovery & Feasibility Audit',
    duration: 'Week 1',
    summary: 'We unpack the core commercial hypothesis, identify user pain points, and assess technical dependencies.',
    details: [
      'Deep stakeholder interview to extract product priorities and business constraints.',
      'Technical feasibility audit: evaluating third-party APIs, legacy integrations, and data sources.',
      'User journey mapping to prioritize high-value core flows over unnecessary distractions.',
      'Definition of non-negotiable success metrics (latency, concurrent load, conversion).',
    ],
    deliverables: ['Product Discovery Brief', 'Feasibility Assessment', 'Milestone Schedule'],
    icon: Compass,
    accent: '#6F4E37',
  },
  {
    step: '02',
    name: 'Specification & Architectural Definition',
    duration: 'Week 1 — 2',
    summary: 'We lock down the system architecture, database models, and API boundaries before writing code.',
    details: [
      'Comprehensive schema design: PostgreSQL relational tables, foreign key constraints, and indexing strategy.',
      'API contract specification: RESTful endpoints, request/response payloads, and Zod validation rules.',
      'Technology stack selection tailored specifically to your latency and scalability requirements.',
      'Sprint roadmap breakdown with clear deliverables and acceptance criteria.',
    ],
    deliverables: ['Architecture RFC', 'Prisma Schema Blueprint', 'API Endpoint Contract'],
    icon: FileCode,
    accent: '#8B5E3C',
  },
  {
    step: '03',
    name: 'UI/UX & Design System Prototyping',
    duration: 'Weeks 2 — 3',
    summary: 'We engineer intuitive, high-converting digital interfaces that balance aesthetic polish with usability.',
    details: [
      'Design tokens creation: color hierarchy, typographic scales, spacing rhythm, and responsive grids.',
      'High-fidelity interactive prototype in Figma demonstrating realistic user state transitions.',
      'Micro-interactions and motion design definitions (Framer Motion transitions, hover states).',
      'Accessibility review ensuring high contrast ratios, touch-friendly hit areas, and keyboard navigation.',
    ],
    deliverables: ['Figma Master Component Library', 'Interactive Clickable Prototype', 'Design Token Spec'],
    icon: Layout,
    accent: '#553B2A',
  },
  {
    step: '04',
    name: 'Full-Stack Engineering & Integration',
    duration: 'Weeks 3 — 6',
    summary: 'Clean, type-safe development across the client, backend services, and database layers.',
    details: [
      'Frontend implementation using React, TypeScript, and Tailwind CSS with zero bloat.',
      'Express.js backend development with rate-limiting, Helmet security headers, and structured logging.',
      'PostgreSQL data layer managed with Prisma ORM migrations and automated rollback capability.',
      'Third-party service integrations: payment gateways (Stripe), transactional email (Resend), and AI model APIs.',
    ],
    deliverables: ['Full-Stack TypeScript Repository', 'Automated Test Suites', 'Staging Environment Build'],
    icon: Wrench,
    accent: '#6F4E37',
  },
  {
    step: '05',
    name: 'Quality Assurance & Production Release',
    duration: 'Week 7',
    summary: 'Rigorous cross-platform validation, performance tuning, and zero-downtime deployment.',
    details: [
      'Cross-browser and multi-device responsive audit (iOS Safari, Android Chrome, desktop viewports).',
      'Performance optimization: Lighthouse 90+ Core Web Vitals, code splitting, asset compression.',
      'Security review: SQL injection prevention, input sanitization, CORS boundaries, and SSL configuration.',
      'Production deployment on cloud infrastructure with automated DNS routing and health checks.',
    ],
    deliverables: ['Production Release Build', 'Lighthouse Audit Report', 'SSL Certificate & Edge Routing'],
    icon: Rocket,
    accent: '#8B5E3C',
  },
  {
    step: '06',
    name: 'Continuous Optimization & Scaling',
    duration: 'Ongoing',
    summary: 'Long-term engineering stewardship, proactive telemetry, and feature evolution.',
    details: [
      '24/7 server health telemetry, uptime logging, and latency monitoring.',
      'Database query optimization, index tuning, and read-replica scaling as traffic grows.',
      'Iterative feature releases based on real user metrics and analytics feedback.',
      'Routine security patches, package upgrades, and infrastructure maintenance.',
    ],
    deliverables: ['Monthly Telemetry Reports', 'Iterative Feature Sprints', 'Dedicated Dev Support SLA'],
    icon: TrendingUp,
    accent: '#553B2A',
  },
];

export const ProcessPage: React.FC = () => {
  return (
    <div className="py-16 md:py-24 bg-[#FAF9F6] text-[#1F1D1B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-4">
            <Flame className="w-3.5 h-3.5 text-[#6F4E37]" />
            <span>ENGINEERING METHODOLOGY</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif tracking-tight text-[#1F1D1B] mb-6 leading-tight">
            From the first conversation <br />
            <span className="italic text-[#6F4E37]">to the final release.</span>
          </h1>
          <p className="text-base sm:text-xl text-[#5A5550] leading-relaxed font-sans">
            We don't believe in chaotic development cycles or vague promises. Our engineering methodology is a
            disciplined, milestone-driven process engineered to deliver high-performance software on schedule.
          </p>
        </div>

        {/* Communication Cadence Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#F4F3F1] border border-[#E5E4E2] mb-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#6F4E37] flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#1F1D1B] text-sm mb-1 font-sans">Weekly Sprint Demos</div>
              <p className="text-[#5A5550] font-sans">Regular async video walkthroughs and live staging previews at every milestone.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-[#6F4E37] flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#1F1D1B] text-sm mb-1 font-sans">Direct Founder Communication</div>
              <p className="text-[#5A5550] font-sans">Collaborate directly with our engineering founders without bureaucratic account managers.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#6F4E37] flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#1F1D1B] text-sm mb-1 font-sans">Complete IP & Code Ownership</div>
              <p className="text-[#5A5550] font-sans">You retain 100% intellectual property ownership of your source code and database assets.</p>
            </div>
          </div>
        </div>

        {/* Editorial Timeline */}
        <div className="space-y-8">
          {processPhases.map((phase) => {
            const Icon = phase.icon;
            return (
              <div
                key={phase.step}
                className="p-6 sm:p-10 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] hover:border-[#6F4E37]/30 transition-all relative overflow-hidden shadow-sm"
              >
                <div
                  className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#6F4E37]"
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pl-2 sm:pl-4">
                  {/* Left Column (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-[#E6E0F0] font-mono text-xs font-bold text-[#6F4E37]">
                        STAGE {phase.step}
                      </span>
                      <span className="text-xs font-mono text-[#8C847E]">{phase.duration}</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-serif text-[#1F1D1B] flex items-center gap-2">
                      <span>{phase.name}</span>
                    </h2>

                    <p className="text-sm sm:text-base text-[#3A3530] font-medium font-sans">{phase.summary}</p>

                    <div className="space-y-2 pt-2">
                      {phase.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-[#5A5550] font-sans">
                          <CheckCircle2
                            className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#6F4E37]"
                          />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Deliverables Column (5 cols) */}
                  <div className="lg:col-span-5 bg-[#FAF9F6] border border-[#E5E4E2] rounded-2xl p-6">
                    <div className="text-xs font-mono uppercase tracking-wider text-[#6F4E37] mb-3 flex items-center gap-1.5 font-bold">
                      <Icon className="w-4 h-4 text-[#6F4E37]" />
                      <span>Stage Deliverables</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-[#5A5550]">
                      {phase.deliverables.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6F4E37]" />
                          <span className="font-mono text-[#3A3530]">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-4 mt-6 border-t border-[#E5E4E2] flex items-center justify-between text-[11px] font-mono text-[#8C847E]">
                      <span>Milestone Sign-off</span>
                      <span className="text-[#6F4E37] font-semibold">Strict Quality Gate</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 p-8 sm:p-12 rounded-3xl bg-[#1F1D1B] text-white border border-[#3A3530] text-center shadow-lg">
          <h3 className="text-2xl sm:text-4xl font-serif text-white mb-4">
            Ready to initiate Stage 01?
          </h3>
          <p className="text-sm sm:text-base text-[#D1CFCC] max-w-xl mx-auto mb-8 font-sans">
            Schedule an initial discovery conversation with our engineering founders to review your project scope.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#6F4E37] text-[#FAF9F6] hover:bg-[#8B5E3C] font-semibold text-xs tracking-wider uppercase transition-all shadow-md font-sans"
          >
            <span>START DISCOVERY CONVERSATION</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
