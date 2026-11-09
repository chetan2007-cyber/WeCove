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
    accent: '#CCFF00',
  },
  {
    name: 'Mallikarjun N',
    role: 'Co-founder',
    initials: 'MN',
    focus: 'Engineering Systems & Development',
    accent: '#10B981',
  },
  {
    name: 'Aryan Koushink',
    role: 'Co-founder',
    initials: 'AK',
    focus: 'Product Strategy & Technology',
    accent: '#38BDF8',
  },
  {
    name: 'Mohith M S',
    role: 'Team Member',
    initials: 'MS',
    focus: 'Full-Stack Development',
    accent: '#F59E0B',
  },
];

export const TeamSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#08090C] text-white border-t border-white/5 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-4">
              <Users className="w-3.5 h-3.5" />
              <span>LEADERSHIP & ENGINEERING</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
              The people behind <br />
              <span className="text-[#CCFF00]">WeCove.in.</span>
            </h2>
            <p className="text-brand-muted text-base sm:text-lg">
              We are a dedicated team of founders and engineers committed to building robust digital products,
              custom web platforms, and production-ready software solutions.
            </p>
          </div>

          <div>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-[#CCFF00] hover:text-[#08090C] hover:border-[#CCFF00] transition-all text-sm"
            >
              <span>GET TO KNOW US</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, index) => (
            <div
              key={member.name}
              className="group p-6 rounded-2xl bg-[#111319] border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Subtle top indicator bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
                style={{ backgroundColor: member.accent }}
              />

              <div>
                {/* Abstract Initials Monogram Badge */}
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                  <span
                    className="font-mono text-xl font-bold tracking-tight"
                    style={{ color: member.accent }}
                  >
                    {member.initials}
                  </span>
                </div>

                <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: member.accent }}>
                  {member.role}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>

                <p className="text-xs text-gray-400 font-mono flex items-center gap-1.5 mb-6">
                  <Terminal className="w-3.5 h-3.5 text-gray-500" />
                  <span>{member.focus}</span>
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-500">
                <span>WeCove.in Core</span>
                <span className="text-emerald-400">● Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
