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
    <div className="py-16 md:py-24 bg-[#FAF9F6] text-[#1F1D1B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-4">
            <Layers className="w-3.5 h-3.5 text-[#6F4E37]" />
            <span>FULL-SPECTRUM SOFTWARE CAPABILITIES</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif tracking-tight text-[#1F1D1B] mb-6 leading-tight">
            Everything your product <br />
            <span className="italic text-[#6F4E37]">needs to thrive.</span>
          </h1>
          <p className="text-base sm:text-xl text-[#5A5550] leading-relaxed font-sans">
            We build complete digital solutions for startups, entrepreneurs, and established organizations.
            From initial prototype to enterprise cloud scaling, our engineering practice is designed for durability and performance.
          </p>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-14 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                type="button"
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all font-sans ${
                  isSelected
                    ? 'bg-[#6F4E37] text-white shadow-sm'
                    : 'bg-[#E5E4E2] text-[#1F1D1B] hover:bg-[#E6E0F0] border border-[#D5D3CF]'
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
              className="p-6 sm:p-10 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] hover:border-[#6F4E37]/30 transition-all shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Overview (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#E6E0F0] text-[11px] font-mono text-[#6F4E37] font-semibold">
                      {service.category}
                    </span>
                    <span className="text-xs font-mono text-[#8C847E]">CAPABILITY #{index + 1}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-serif text-[#1F1D1B]">{service.title}</h2>

                  <p className="text-sm sm:text-base text-[#3A3530] font-medium font-sans">{service.tagline}</p>

                  <p className="text-xs sm:text-sm text-[#5A5550] leading-relaxed font-sans">
                    {service.description}
                  </p>

                  {/* Core Features */}
                  <div className="pt-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-[#7D7671] mb-2 font-semibold">
                      Key Competencies:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4A4540]">
                      {service.capabilities.map((cap, idx) => (
                        <div key={idx} className="flex items-center gap-2 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#6F4E37] flex-shrink-0" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Deliverables & Tech (5 cols) */}
                <div className="lg:col-span-5 bg-[#FAF9F6] border border-[#E5E4E2] rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-[#6F4E37] mb-2 font-bold">
                        Deliverables & Outputs
                      </div>
                      <ul className="space-y-2 text-xs text-[#5A5550]">
                        {service.deliverables.map((deliv, idx) => (
                          <li key={idx} className="flex items-center gap-2 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6F4E37]" />
                            <span>{deliv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      <div className="text-xs font-mono uppercase tracking-wider text-[#7D7671] mb-2 font-semibold">
                        Primary Technologies
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {service.technologies.map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] text-[11px] font-mono text-[#4A4540] border border-[#E5E4E2]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#E5E4E2]">
                    <button
                      type="button"
                      onClick={() => handleInquire(service.title)}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#6F4E37] hover:bg-[#553B2A] text-[#FAF9F6] font-semibold text-xs flex items-center justify-center gap-2 transition-all font-sans shadow-sm"
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
        <div className="mt-20 p-8 sm:p-12 rounded-3xl bg-[#1F1D1B] text-white border border-[#3A3530] text-center shadow-lg">
          <h3 className="text-2xl sm:text-3xl font-serif text-white mb-3">
            Need a tailored full-stack solution?
          </h3>
          <p className="text-sm text-[#D1CFCC] max-w-xl mx-auto mb-6 font-sans">
            We collaborate with technical founders and modern business leaders to engineer custom digital architectures.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#6F4E37] text-[#FAF9F6] hover:bg-[#8B5E3C] font-semibold text-xs tracking-wider uppercase transition-all shadow-md font-sans"
          >
            <span>START A PROJECT CONVERSATION</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
