import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AppWindow,
  ArrowUpRight,
  Bot,
  Cloud,
  Code,
  Compass,
  Cpu,
  Database,
  Globe,
  Layers,
  Palette,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Workflow,
  Wrench,
  Zap
} from 'lucide-react';
import { ServiceItem } from '../types';

export const allServices: ServiceItem[] = [
  {
    id: 'website-development',
    category: 'Web Platforms',
    title: 'Website Development',
    tagline: 'High-conversion business, corporate, and portfolio web experiences.',
    description: 'We design and construct fast, SEO-optimized, responsive websites that represent your brand with authority and convert visitors into clients.',
    capabilities: [
      'Business & Corporate Websites',
      'High-Impact Landing Pages',
      'Portfolio & Agency Websites',
      'Custom Interactive Experiences',
      'Performance & Core Web Vitals Optimization',
    ],
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
    deliverables: ['Custom Responsive Codebase', 'SEO & OpenGraph Architecture', 'CMS or Headless Backend'],
  },
  {
    id: 'web-applications',
    category: 'Web Platforms',
    title: 'Web Application Development',
    tagline: 'Robust web apps, administrative dashboards, and internal platforms.',
    description: 'Bespoke web applications built with rigorous architecture, real-time data flows, role-based access control, and enterprise stability.',
    capabilities: [
      'Custom Web Applications',
      'Business Management Systems',
      'Admin Dashboards & Portals',
      'Workflow & Operations Platforms',
      'Multi-User Collaborative Tools',
    ],
    technologies: ['React', 'Node.js', 'Express', 'PostgreSQL', 'REST / GraphQL'],
    deliverables: ['Full-Stack Source Code', 'Role-Based Authentication', 'Audit Logs & Admin Control Panel'],
  },
  {
    id: 'mobile-applications',
    category: 'Product Engineering',
    title: 'Mobile Application Development',
    tagline: 'Native iOS & Android experiences engineered with unified codebases.',
    description: 'Cross-platform mobile applications delivering 60fps performance, biometric authentication, offline synchronization, and push messaging.',
    capabilities: [
      'iOS & Android Native Delivery',
      'Cross-Platform React Native',
      'Customer-Facing Mobile Apps',
      'Internal Workforce Apps',
      'Biometric Security & Payments',
    ],
    technologies: ['React Native', 'Expo', 'TypeScript', 'Native Modules'],
    deliverables: ['App Store & Play Store Builds', 'Push Notification Service', 'Offline Cache Layer'],
  },
  {
    id: 'saas-development',
    category: 'Product Engineering',
    title: 'SaaS Product Development',
    tagline: 'Multi-tenant subscription architectures built for global scale.',
    description: 'End-to-end software-as-a-service development including organization provisioning, recurring Stripe billing, granular quotas, and metrics.',
    capabilities: [
      'Multi-Tenant Data Architecture',
      'Subscription & Billing Engine',
      'User & Workspace Management',
      'API Key Provisioning & Throttling',
      'SaaS Telemetry & Analytics',
    ],
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'Redis'],
    deliverables: ['Production SaaS Platform', 'Automated Stripe Webhooks', 'Tenant Isolation Strategy'],
  },
  {
    id: 'ai-solutions',
    category: 'AI & Automation',
    title: 'AI & Intelligent Solutions',
    tagline: 'LLM integrations, agentic workflows, and domain-specific assistants.',
    description: 'Practical generative AI applications that solve real operational bottlenecks, automate repetitive tasks, and unlock proprietary data insights.',
    capabilities: [
      'LLM Integrations (Gemini, Claude, GPT)',
      'Domain AI Assistants & Copilots',
      'Vector Search & RAG Architectures',
      'Intelligent Document Processing',
      'Data-Driven Decision Systems',
    ],
    technologies: ['Python', 'FastAPI', 'LangChain', 'pgvector', 'Gemini API'],
    deliverables: ['AI Service Endpoint', 'Vector Embeddings Pipeline', 'Prompt Defense & Guardrails'],
  },
  {
    id: 'custom-software',
    category: 'Web Platforms',
    title: 'Custom Software Development',
    tagline: 'Tailored software solutions solving unique operational challenges.',
    description: 'When off-the-shelf tools fail to meet your specific operational needs, we design custom software built around your exact business processes.',
    capabilities: [
      'Business-Specific Software',
      'Process Digitization',
      'Legacy Modernization',
      'Custom API Development',
      'System Integrations',
    ],
    technologies: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    deliverables: ['Tailored System Architecture', 'Comprehensive API Docs', 'Data Migration Scripts'],
  },
  {
    id: 'ui-ux-design',
    category: 'Product Engineering',
    title: 'UI/UX & Product Design',
    tagline: 'User research, design systems, and interactive clickable prototypes.',
    description: 'Transforming complex product workflows into clear, confident, and intuitive visual interfaces with scalable design systems.',
    capabilities: [
      'Product & User Research',
      'UI & Design System Creation',
      'Interactive Figma Prototypes',
      'Information Architecture',
      'Accessibility & Usability Audits',
    ],
    technologies: ['Figma', 'Tokens Studio', 'Design Systems', 'Micro-interactions'],
    deliverables: ['Figma Master Component Library', 'Clickable Prototype', 'Design Token Specifications'],
  },
  {
    id: 'automation-integrations',
    category: 'AI & Automation',
    title: 'Automation & Integrations',
    tagline: 'Connect disparate systems and automate complex manual workflows.',
    description: 'Eliminate human error and bottlenecks by bridging CRM, ERP, accounting, payment, and communications software through custom automation.',
    capabilities: [
      'Workflow Automation',
      'Third-Party API Integrations',
      'Webhook & Event Orchestration',
      'Custom Middleware Connectors',
      'Sync & ETL Data Pipelines',
    ],
    technologies: ['Node.js', 'Webhooks', 'REST APIs', 'Zapier / n8n', 'Serverless'],
    deliverables: ['Automated Event Pipes', 'Retry & Dead-Letter Handling', 'Monitoring Dashboard'],
  },
  {
    id: 'backend-cloud',
    category: 'Cloud & Infrastructure',
    title: 'Backend & Cloud Engineering',
    tagline: 'Resilient server architecture, secure databases, and cloud DevOps.',
    description: 'High-availability backend systems engineered for durability, zero-data-loss ACID transactions, and containerized cloud deployment.',
    capabilities: [
      'RESTful & GraphQL Architectures',
      'PostgreSQL & Database Optimization',
      'Cloud Deployment & Infrastructure',
      'Docker Containerization',
      'Rate Limiting & Security Hardening',
    ],
    technologies: ['Node.js', 'Express', 'PostgreSQL', 'Prisma', 'AWS / GCP'],
    deliverables: ['Infrastructure as Code', 'Automated Health Checks', 'Database Backup Automation'],
  },
  {
    id: 'mvp-development',
    category: 'Product Engineering',
    title: 'MVP Development for Startups',
    tagline: 'Rapid concept-to-launch engineering for ambitious founders.',
    description: 'We turn your core startup idea into a working, investor-ready or market-ready product in weeks without sacrificing code quality.',
    capabilities: [
      'Rapid Prototyping & Scoping',
      'Core Feature Prioritization',
      'Validation Architecture',
      'Launch Preparation',
      'Post-Launch Feedback Loops',
    ],
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'Tailwind'],
    deliverables: ['Working MVP in Production', 'User Analytics Integration', 'Iterative Roadmap'],
  },
  {
    id: 'ecommerce-solutions',
    category: 'Web Platforms',
    title: 'E-commerce Solutions',
    tagline: 'Custom storefronts, high-velocity cart checkout, and catalog systems.',
    description: 'Tailored e-commerce digital experiences designed to showcase products, handle high-traffic drop surges, and streamline transactions.',
    capabilities: [
      'Custom Online Storefronts',
      'Product & Inventory Management',
      'Secure Payment Gateway Integrations',
      'Cart & Checkout Optimization',
      'Order Tracking & Customer Accounts',
    ],
    technologies: ['React', 'Node.js', 'Stripe', 'Razorpay', 'Headless Commerce'],
    deliverables: ['Complete E-Commerce Store', 'Payment Gateway Certification', 'Order Admin Portal'],
  },
  {
    id: 'maintenance-scaling',
    category: 'Cloud & Infrastructure',
    title: 'Maintenance, Security & Scaling',
    tagline: 'Continuous support, bug mitigation, and performance enhancements.',
    description: 'Protect your digital investment with ongoing technical support, security patching, query tuning, and proactive infrastructure upgrades.',
    capabilities: [
      'Bug Fixes & Patch Management',
      'Performance & Speed Tuning',
      'Security Audits & Hardening',
      'Infrastructure Capacity Scaling',
      'Ongoing Technical Partnership',
    ],
    technologies: ['Monitoring Tools', 'CI/CD', 'Docker', 'PostgreSQL Tuning'],
    deliverables: ['Monthly Uptime Telemetry', 'Security Update Log', 'Dedicated Dev Support'],
  },
];

const categoryIcons: Record<string, React.ElementType> = {
  'Web Platforms': Globe,
  'Product Engineering': Rocket,
  'AI & Automation': Bot,
  'Cloud & Infrastructure': Cloud,
};

export const ServicesOverview: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Web Platforms', 'Product Engineering', 'AI & Automation', 'Cloud & Infrastructure'];

  const filteredServices =
    activeCategory === 'All'
      ? allServices
      : allServices.filter((s) => s.category === activeCategory);

  return (
    <section className="py-24 bg-[#08090C] text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-4">
              <Layers className="w-3.5 h-3.5" />
              <span>CAPABILITIES & ARCHITECTURE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
              Everything your product needs <br />
              <span className="text-[#CCFF00]">to move forward.</span>
            </h2>
            <p className="text-brand-muted text-base sm:text-lg">
              We organize our capabilities across web development, custom software, SaaS products, AI workflows,
              and cloud systems to deliver complete digital solutions.
            </p>
          </div>

          <div>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#CCFF00] text-[#08090C] hover:bg-[#BCE800] font-bold text-sm transition-all shadow-lg shadow-[#CCFF00]/15"
            >
              <span>EXPLORE ALL SERVICES</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Services Structured Directory */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const CatIcon = categoryIcons[service.category] || Code;
            return (
              <div
                key={service.id}
                className="group p-6 rounded-2xl bg-[#101217] border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-[11px] font-mono text-[#CCFF00] border border-white/5">
                      <CatIcon className="w-3.5 h-3.5" />
                      {service.category}
                    </span>
                    <Link
                      to="/contact"
                      className="text-gray-500 hover:text-[#CCFF00] transition-colors p-1"
                      title="Inquire about this capability"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#CCFF00] transition-colors">
                    {service.title}
                  </h3>

                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    {service.description}
                  </p>

                  <div className="space-y-1.5 border-t border-white/5 pt-3 mb-4">
                    {service.capabilities.slice(0, 3).map((cap, i) => (
                      <div key={i} className="text-xs text-gray-300 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#CCFF00]" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-500">
                  <div className="flex gap-1.5 flex-wrap">
                    {service.technologies.slice(0, 3).map((tech, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 text-[10px]">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/services"
                    className="text-[#CCFF00] hover:underline text-[11px] font-sans font-medium"
                  >
                    Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
