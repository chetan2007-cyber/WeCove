import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, Terminal, Users } from 'lucide-react';
import { TeamMember } from '../types';

export const teamMembers: TeamMember[] = [
  {
    name: 'Chetan Sharma P',
    role: 'Founder',
    initials: 'CS',
    focus: 'Software Architecture & Strategy',
    accent: '#6F4E37',
  },
  {
    name: 'Mallikarjun N',
    role: 'Co-founder',
    initials: 'MN',
    focus: 'Engineering Systems & Development',
    accent: '#8B5E3C',
  },
  {
    name: 'Aryan Koushink',
    role: 'Co-founder',
    initials: 'AK',
    focus: 'Product Strategy & Technology',
    accent: '#553B2A',
  },
  {
    name: 'Mohith M S',
    role: 'Team Member',
    initials: 'MS',
    focus: 'Full-Stack Development',
    accent: '#6F4E37',
  },
];

export const TeamSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#F4F3F1] text-[#1F1D1B] border-t border-[#E5E4E2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-4">
              <Users className="w-3.5 h-3.5 text-[#6F4E37]" />
              <span>LEADERSHIP & ENGINEERING</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif text-[#1F1D1B] mb-4 leading-tight">
              The people behind <br />
              <span className="italic text-[#6F4E37]">WeCove.in.</span>
            </h2>
            <p className="text-[#5A5550] text-base sm:text-lg font-sans">
              We are a dedicated team of founders and engineers committed to building robust digital products,
              custom web platforms, and production-ready software solutions.
            </p>
          </div>

          <div>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#553B2A] text-[#FAF9F6] font-semibold transition-all text-xs font-sans shadow-sm"
            >
              <span>GET TO KNOW US</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="group p-6 sm:p-7 rounded-3xl bg-[#FFFFFF] border border-[#E5E4E2] hover:border-[#6F4E37]/40 transition-all hover:-translate-y-1 duration-300 relative overflow-hidden flex flex-col justify-between shadow-sm"
            >
              {/* Subtle top indicator bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 bg-[#6F4E37]"
              />

              <div>
                {/* Abstract Initials Monogram Badge */}
                <div className="w-16 h-16 rounded-2xl bg-[#E6E0F0] border border-[#D5CBE5] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                  <span className="font-serif text-2xl font-bold tracking-tight text-[#6F4E37]">
                    {member.initials}
                  </span>
                </div>

                <div className="text-xs font-mono uppercase tracking-wider mb-1 text-[#6F4E37] font-semibold">
                  {member.role}
                </div>

                <h3 className="text-xl font-serif text-[#1F1D1B] mb-2">{member.name}</h3>

                <p className="text-xs text-[#6A635E] font-sans flex items-center gap-1.5 mb-6">
                  <Terminal className="w-3.5 h-3.5 text-[#8C847E]" />
                  <span>{member.focus}</span>
                </p>
              </div>

              <div className="pt-4 border-t border-[#E5E4E2] flex items-center justify-between text-[11px] font-mono text-[#8C847E]">
                <span>WeCove.in Core</span>
                <span className="text-[#6F4E37] font-semibold">● Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
