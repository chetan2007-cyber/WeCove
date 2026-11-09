import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  Layers,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Zap
} from 'lucide-react';
import { teamMembers } from '../components/TeamSection';

export const AboutPage: React.FC = () => {
  return (
    <div className="py-16 md:py-24 bg-[#08090C] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-4">
            <Users className="w-3.5 h-3.5" />
            <span>ABOUT WECOVE.IN</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 uppercase">
            Built by engineers who care <br />
            <span className="text-[#CCFF00]">about the craft.</span>
          </h1>
          <p className="text-base sm:text-xl text-brand-muted leading-relaxed font-sans">
            WeCove.in is an independent software development startup and digital product studio.
            We bring thoughtful design, disciplined engineering, and product thinking together to build software that lasts.
          </p>
        </div>

        {/* Company Identity Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-7 p-8 sm:p-10 rounded-3xl bg-[#111319] border border-white/10 space-y-6">
            <div className="text-xs font-mono uppercase tracking-wider text-[#CCFF00]">
              The WeCove.in Philosophy
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
              We reject templates and superficial solutions in favor of purposeful engineering.
            </h2>
            <p className="text-sm text-brand-muted leading-relaxed font-sans">
              We started WeCove.in because we noticed a persistent divide in digital product development:
              design agencies that produce aesthetic prototypes unable to handle real database traffic, and traditional
              IT services that build functional backends wrapped in sluggish, generic user interfaces.
            </p>
            <p className="text-sm text-brand-muted leading-relaxed font-sans">
              We operate at the exact intersection of both disciplines. Every web platform, mobile application, and
              SaaS system we engineer is built with equal devotion to tactile interface fluidity and backend durability.
            </p>

            <div className="pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                <span>Strict TypeScript & Clean Code</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                <span>PostgreSQL & ACID Durability</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                <span>Component-Driven Design Systems</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                <span>Zero Fictitious Claims or Metrics</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-8 sm:p-10 rounded-3xl bg-[#101217] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-4">
                Company Facts & Official Channels
              </div>
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <div className="text-gray-500 uppercase text-[10px]">Brand Name</div>
                  <div className="text-white font-bold text-sm">WeCove.in</div>
                  <div className="text-[11px] text-[#CCFF00]">(.in is part of the official brand identity)</div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="text-gray-500 uppercase text-[10px]">Official Inquiry Email</div>
                  <a href="mailto:wecove.in@gmail.com" className="text-white hover:text-[#CCFF00] transition-colors">
                    wecove.in@gmail.com
                  </a>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="text-gray-500 uppercase text-[10px]">Official Company Phone</div>
                  <a href="tel:+918660534989" className="text-white hover:text-[#CCFF00] transition-colors">
                    +91 8660534989
                  </a>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="text-gray-500 uppercase text-[10px]">Engineering Footprint</div>
                  <div className="text-white">Karnataka, India</div>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                to="/contact"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#CCFF00] text-[#08090C] hover:bg-[#BCE800] font-bold text-xs font-sans transition-all shadow-md shadow-[#CCFF00]/15"
              >
                <span>Initiate a Project Discussion</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Core Principles */}
        <div className="mb-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono uppercase tracking-wider text-[#CCFF00] mb-2">Our Operating Tenets</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">How We Build and Partner</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#111319] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#CCFF00] font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-white">Direct Engineering Communication</h3>
              <p className="text-xs text-brand-muted leading-relaxed">
                You work directly with the founders and engineers building your system. No account managers,
                no bureaucratic telephone games, and no miscommunicated specifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111319] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#38BDF8] font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-white">Pragmatic Technical Choices</h3>
              <p className="text-xs text-brand-muted leading-relaxed">
                We select technologies based on stability, developer ergonomics, and system durability—not transient
                trends. We rely on battle-tested foundations like React, TypeScript, Express, and PostgreSQL.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111319] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#10B981] font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-white">Complete IP & Code Transparency</h3>
              <p className="text-xs text-brand-muted leading-relaxed">
                Every line of source code, commit history, database migration, and design asset belongs unconditionally
                to your company upon milestone completion.
              </p>
            </div>
          </div>
        </div>

        {/* The Leadership Team */}
        <div>
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono uppercase tracking-wider text-[#CCFF00] mb-2">Company Leadership</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">The Founders & Engineering Team</h2>
            <p className="text-sm text-brand-muted mt-2">
              Authentic leadership. In accordance with our values, we do not use artificial portraits or exaggerated biographies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="p-6 rounded-2xl bg-[#111319] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: member.accent }}
                />

                <div>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <span className="font-mono text-xl font-bold" style={{ color: member.accent }}>
                      {member.initials}
                    </span>
                  </div>

                  <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: member.accent }}>
                    {member.role}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>

                  <div className="text-xs text-gray-400 font-mono mb-4 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-gray-500" />
                    <span>{member.focus}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 text-[11px] font-mono text-gray-500 flex items-center justify-between">
                  <span>WeCove.in</span>
                  <span className="text-emerald-400">● Core Team</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
