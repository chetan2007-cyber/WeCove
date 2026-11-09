import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppWindow,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Cloud,
  Code2,
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
  Sparkles,
  Terminal,
  Workflow,
  Wrench,
  Zap
} from 'lucide-react';
import { allServices } from '../components/ServicesOverview';

export const ServicesPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const navigate = useNavigate();

  const categories = ['All', 'Web Platforms', 'Product Engineering', 'AI & Automation', 'Cloud & Infrastructure'];

  const filtered =
    selectedFilter === 'All'
      ? allServices
      : allServices.filter((s) => s.category === selectedFilter);

  const handleInquire = (serviceTitle: string) => {
    navigate('/contact', { state: { prefilledProjectType: serviceTitle } });
  };

  return (
    <div className="py-16 md:py-24 bg-[#08090C] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>FULL-SPECTRUM SOFTWARE CAPABILITIES</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 uppercase">
            Everything your product <br />
            <span className="text-[#CCFF00]">needs to thrive.</span>
          </h1>
          <p className="text-base sm:text-xl text-brand-muted leading-relaxed font-sans">
            We build complete digital solutions for startups, entrepreneurs, and established organizations.
            From initial prototype to enterprise cloud scaling, our engineering practice is designed for durability and performance.
          </p>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-14 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                type="button"
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#CCFF00] text-[#08090C] shadow-lg shadow-[#CCFF00]/15'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Services In-Depth Grid */}
        <div className="space-y-8">
          {filtered.map((service, index) => (
            <div
              key={service.id}
              className="p-6 sm:p-10 rounded-3xl bg-[#111319] border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Overview (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-white/5 border border-white/5 text-[11px] font-mono text-[#CCFF00]">
                      {service.category}
                    </span>
                    <span className="text-xs font-mono text-gray-500">CAPABILITY #{index + 1}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{service.title}</h2>

                  <p className="text-sm sm:text-base text-gray-300 font-medium">{service.tagline}</p>

                  <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-sans">
                    {service.description}
                  </p>

                  {/* Core Features */}
                  <div className="pt-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                      Key Competencies:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                      {service.capabilities.map((cap, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#CCFF00] flex-shrink-0" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Deliverables & Tech (5 cols) */}
                <div className="lg:col-span-5 bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-[#CCFF00] mb-2">
                        Deliverables & Outputs
                      </div>
                      <ul className="space-y-2 text-xs text-gray-300">
                        {service.deliverables.map((deliv, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                            <span>{deliv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      <div className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                        Primary Technologies
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {service.technologies.map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded bg-white/5 text-[11px] font-mono text-gray-300 border border-white/5"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleInquire(service.title)}
                      className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-[#CCFF00] hover:text-[#08090C] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all font-sans"
                    >
                      <span>Inquire About {service.title}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-20 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#141620] via-[#101217] to-[#141620] border border-white/10 text-center">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Need a tailored full-stack solution?
          </h3>
          <p className="text-sm text-brand-muted max-w-xl mx-auto mb-6">
            We collaborate with technical founders and modern business leaders to engineer custom digital architectures.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#CCFF00] text-[#08090C] hover:bg-[#BCE800] font-bold text-xs transition-all shadow-lg shadow-[#CCFF00]/15"
          >
            <span>START A PROJECT CONVERSATION</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
