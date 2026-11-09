import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Lightbulb,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench
} from 'lucide-react';
import { HeroCanvas } from '../components/HeroCanvas';
import { ProductCanvas } from '../components/ProductCanvas';
import { ServicesOverview } from '../components/ServicesOverview';
import { ProductPlayground } from '../components/ProductPlayground';
import { TechStackFlow } from '../components/TechStackFlow';
import { ProcessTimeline } from '../components/ProcessTimeline';
import { WorkComingSoonSection } from '../components/WorkComingSoonSection';
import { TeamSection } from '../components/TeamSection';

export const HomePage: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* SECTION 2 — HERO */}
      <section className="relative min-h-[92vh] flex flex-col justify-center pt-8 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle 3D background */}
        <HeroCanvas />

        {/* Ambient Top Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#CCFF00]/10 blur-[160px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="text-center max-w-4xl mx-auto pt-6 pb-12">
            {/* Status Pill */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-6 backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
              <span>DIGITAL PRODUCT STUDIO & SOFTWARE ENGINEERING</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-[1.05] mb-6"
            >
              We turn ideas <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#CCFF00] to-white">
                into digital products.
              </span>
            </motion.h1>

            {/* Supporting Copy */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-base sm:text-xl text-brand-muted max-w-2xl mx-auto leading-relaxed mb-8 font-sans"
            >
              WeCove.in designs and builds websites, applications, SaaS platforms, and custom software for businesses
              ready to build something meaningful.
            </motion.p>

            {/* Hero CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4"
            >
              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#CCFF00] text-[#08090C] hover:bg-[#BCE800] font-bold text-sm tracking-wide transition-all shadow-xl shadow-[#CCFF00]/20"
              >
                <span>START A PROJECT</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                to="/services"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10"
              >
                <span>EXPLORE WHAT WE DO</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Hero Visual: Digital Product Canvas */}
          <ProductCanvas />

          {/* Scroll Cue */}
          <div className="flex justify-center mt-12 text-gray-500">
            <div className="flex flex-col items-center gap-2 text-[11px] font-mono tracking-widest uppercase">
              <span>Scroll to Explore</span>
              <ArrowDown className="w-3.5 h-3.5 animate-bounce text-[#CCFF00]" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — INTRODUCTION */}
      <section className="py-24 bg-[#0B0C10] text-white border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Good software starts with the right idea.{' '}
              <span className="text-[#CCFF00]">Great software takes the right execution.</span>
            </h2>
            <p className="text-base sm:text-xl text-brand-muted leading-relaxed">
              "We bring product thinking, thoughtful design, and practical engineering together to build digital
              experiences around real business needs."
            </p>
          </div>

          {/* Connected Flow: IDEA → DESIGN → ENGINEERING → PRODUCT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {[
              {
                step: '01',
                title: 'IDEA',
                desc: 'Uncovering the authentic user need, defining scope, and mapping technical feasibility.',
                icon: Lightbulb,
                accent: '#CCFF00',
              },
              {
                step: '02',
                title: 'DESIGN',
                desc: 'Refining information architecture, design systems, ergonomics, and interactive flows.',
                icon: Palette,
                accent: '#38BDF8',
              },
              {
                step: '03',
                title: 'ENGINEERING',
                desc: 'Writing clean, typed, modular code with robust APIs, test coverage, and PostgreSQL data durability.',
                icon: Wrench,
                accent: '#10B981',
              },
              {
                step: '04',
                title: 'PRODUCT',
                desc: 'Launching stable, high-throughput digital platforms that drive real customer outcomes and scale gracefully.',
                icon: Rocket,
                accent: '#F59E0B',
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-6 rounded-2xl bg-[#12141C] border border-white/10 hover:border-white/20 transition-all relative overflow-hidden group"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-all"
                    style={{ backgroundColor: item.accent }}
                  />
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold" style={{ color: item.accent }}>
                      STEP {item.step}
                    </span>
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 — SERVICES */}
      <ServicesOverview />

      {/* SECTION 5 — PRODUCT PLAYGROUND */}
      <ProductPlayground />

      {/* SECTION 6 — TECHNOLOGY AND ENGINEERING */}
      <TechStackFlow />

      {/* SECTION 7 — DEVELOPMENT PROCESS */}
      <ProcessTimeline />

      {/* SECTION 8 — WORK / PORTFOLIO (COMING SOON) */}
      <WorkComingSoonSection />

      {/* SECTION 9 — ABOUT AND TEAM PREVIEW */}
      <TeamSection />

      {/* SECTION 10 — FINAL CTA */}
      <section className="py-28 bg-gradient-to-b from-[#090A0D] to-[#050608] text-white border-t border-white/5 relative overflow-hidden">
        {/* Visual Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-[#CCFF00]/10 blur-[160px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LET'S BUILD SOMETHING EXTRAORDINARY</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mb-6 leading-tight">
            Have something <br />
            <span className="text-[#CCFF00]">worth building?</span>
          </h2>

          <p className="text-base sm:text-xl text-brand-muted max-w-xl mx-auto mb-10 leading-relaxed font-sans">
            "Tell us what you have in mind. Let's work out the right way to bring it to life."
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#CCFF00] text-[#08090C] hover:bg-[#BCE800] font-bold text-sm tracking-wide transition-all shadow-xl shadow-[#CCFF00]/25"
            >
              <span>LET'S TALK</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:wecove.in@gmail.com"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10 font-mono text-xs"
            >
              <span>wecove.in@gmail.com</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
