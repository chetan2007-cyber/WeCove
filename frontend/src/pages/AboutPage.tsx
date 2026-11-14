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
    <div className="py-16 md:py-24 bg-[#FAF9F6] text-[#1F1D1B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-4">
            <Users className="w-3.5 h-3.5 text-[#6F4E37]" />
            <span>ABOUT WECOVE.IN</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif tracking-tight text-[#1F1D1B] mb-6 leading-tight">
            Built by engineers who care <br />
            <span className="italic text-[#6F4E37]">about the craft.</span>
          </h1>
          <p className="text-base sm:text-xl text-[#5A5550] leading-relaxed font-sans">
            WeCove.in is an independent software development startup and digital product studio.
            We bring thoughtful design, disciplined engineering, and product thinking together to build software that lasts.
          </p>
        </div>

        {/* Company Identity Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-7 p-8 sm:p-10 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] space-y-6 shadow-sm">
            <div className="text-xs font-mono uppercase tracking-wider text-[#6F4E37] font-semibold">
              The WeCove.in Philosophy
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#1F1D1B] leading-snug">
              We reject templates and superficial solutions in favor of purposeful engineering.
            </h2>
            <p className="text-sm text-[#5A5550] leading-relaxed font-sans">
              We started WeCove.in because we noticed a persistent divide in digital product development:
              design agencies that produce aesthetic prototypes unable to handle real database traffic, and traditional
              IT services that build functional backends wrapped in sluggish, generic user interfaces.
            </p>
            <p className="text-sm text-[#5A5550] leading-relaxed font-sans">
              We operate at the exact intersection of both disciplines. Every web platform, mobile application, and
              SaaS system we engineer is built with equal devotion to tactile interface fluidity and backend durability.
            </p>

            <div className="pt-4 border-t border-[#E5E4E2] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 text-[#4A4540]">
                <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                <span>Strict TypeScript & Clean Code</span>
              </div>
              <div className="flex items-center gap-2 text-[#4A4540]">
                <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                <span>PostgreSQL & ACID Durability</span>
              </div>
              <div className="flex items-center gap-2 text-[#4A4540]">
                <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                <span>Component-Driven Design Systems</span>
              </div>
              <div className="flex items-center gap-2 text-[#4A4540]">
                <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                <span>Zero Fictitious Claims or Metrics</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-8 sm:p-10 rounded-3xl bg-[#F4F3F1] border border-[#E5E4E2] flex flex-col justify-between shadow-sm">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#7D7671] mb-4 font-semibold">
                Company Facts & Official Channels
              </div>
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <div className="text-[#8C847E] uppercase text-[10px]">Brand Name</div>
                  <div className="text-[#1F1D1B] font-bold text-sm font-sans">WeCove.in</div>
                  <div className="text-[11px] text-[#6F4E37] font-semibold">(.in is part of the official brand identity)</div>
                </div>

                <div className="pt-2 border-t border-[#E5E4E2]">
                  <div className="text-[#8C847E] uppercase text-[10px]">Official Inquiry Email</div>
                  <a href="mailto:wecove.in@gmail.com" className="text-[#1F1D1B] hover:text-[#6F4E37] transition-colors font-medium">
                    wecove.in@gmail.com
                  </a>
                </div>

                <div className="pt-2 border-t border-[#E5E4E2]">
                  <div className="text-[#8C847E] uppercase text-[10px]">Official Company Phone</div>
                  <a href="tel:+918660534989" className="text-[#1F1D1B] hover:text-[#6F4E37] transition-colors font-medium">
                    +91 8660534989
                  </a>
                </div>

                <div className="pt-2 border-t border-[#E5E4E2]">
                  <div className="text-[#8C847E] uppercase text-[10px]">Engineering Footprint</div>
                  <div className="text-[#1F1D1B] font-medium">Karnataka, India</div>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                to="/contact"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#6F4E37] hover:bg-[#553B2A] text-[#FAF9F6] font-semibold text-xs font-sans transition-all shadow-sm"
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
            <div className="text-xs font-mono uppercase tracking-wider text-[#6F4E37] mb-2 font-semibold">Our Operating Tenets</div>
            <h2 className="text-2xl sm:text-4xl font-serif text-[#1F1D1B]">How We Build and Partner</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#E6E0F0] flex items-center justify-center text-[#6F4E37] font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-serif text-[#1F1D1B]">Direct Engineering Communication</h3>
              <p className="text-xs text-[#5A5550] leading-relaxed font-sans">
                You work directly with the founders and engineers building your system. No account managers,
                no bureaucratic telephone games, and no miscommunicated specifications.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#E6E0F0] flex items-center justify-center text-[#6F4E37] font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-serif text-[#1F1D1B]">Pragmatic Technical Choices</h3>
              <p className="text-xs text-[#5A5550] leading-relaxed font-sans">
                We select technologies based on stability, developer ergonomics, and system durability—not transient
                trends. We rely on battle-tested foundations like React, TypeScript, Express, and PostgreSQL.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#E6E0F0] flex items-center justify-center text-[#6F4E37] font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-serif text-[#1F1D1B]">Complete IP & Code Transparency</h3>
              <p className="text-xs text-[#5A5550] leading-relaxed font-sans">
                Every line of source code, commit history, database migration, and design asset belongs unconditionally
                to your company upon milestone completion.
              </p>
            </div>
          </div>
        </div>

        {/* The Leadership Team */}
        <div>
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono uppercase tracking-wider text-[#6F4E37] mb-2 font-semibold">Company Leadership</div>
            <h2 className="text-2xl sm:text-4xl font-serif text-[#1F1D1B]">The Founders & Engineering Team</h2>
            <p className="text-sm text-[#5A5550] mt-2 font-sans">
              Authentic leadership. In accordance with our values, we do not use artificial portraits or exaggerated biographies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="p-6 sm:p-7 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] hover:border-[#6F4E37]/30 transition-all flex flex-col justify-between relative overflow-hidden shadow-sm"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1 bg-[#6F4E37]"
                />

                <div>
                  <div className="w-16 h-16 rounded-2xl bg-[#E6E0F0] border border-[#D5CBE5] flex items-center justify-center mb-6">
                    <span className="font-serif text-2xl font-bold text-[#6F4E37]">
                      {member.initials}
                    </span>
                  </div>

                  <div className="text-xs font-mono uppercase tracking-wider mb-1 text-[#6F4E37] font-semibold">
                    {member.role}
                  </div>

                  <h3 className="text-xl font-serif text-[#1F1D1B] mb-2">{member.name}</h3>

                  <div className="text-xs text-[#6A635E] font-sans mb-4 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#8C847E]" />
                    <span>{member.focus}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E4E2] text-[11px] font-mono text-[#8C847E] flex items-center justify-between">
                  <span>WeCove.in</span>
                  <span className="text-[#6F4E37] font-semibold">● Core Team</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
