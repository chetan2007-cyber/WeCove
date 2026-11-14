import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Work', path: '/work' },
    { name: 'Process', path: '/process' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <footer className="bg-[#1F1D1B] text-[#E5E4E2] border-t border-[#6F4E37]/20 pt-16 pb-12 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Company Identity (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#6F4E37] flex items-center justify-center font-bold text-[#FAF9F6] text-sm tracking-tighter">
                W
              </div>
              <span className="font-bold text-xl tracking-tight text-[#FAF9F6] font-sans">
                WeCove<span className="text-[#E6E0F0]">.in</span>
              </span>
            </Link>

            <p className="text-sm text-[#E5E4E2]/80 max-w-sm leading-relaxed">
              WeCove.in is a professional software development startup and digital product studio.
              We design, build, launch, and scale modern web applications, SaaS platforms, and custom software.
            </p>

            <div className="pt-2 text-xs font-mono text-[#E5E4E2]/60">
              Bangalore & Hubli, Karnataka, India
            </div>
          </div>

          {/* Quick Links (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#E6E0F0] font-semibold">
              Navigation
            </div>
            <ul className="space-y-2 text-sm">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-[#E5E4E2]/75 hover:text-[#FAF9F6] hover:translate-x-1 transition-all inline-flex items-center gap-1"
                  >
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Direct Contact (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#E6E0F0] font-semibold">
              Direct Contact
            </div>
            <p className="text-xs text-[#E5E4E2]/80 leading-relaxed">
              Have a project or partnership inquiry? Connect directly with our founding team.
            </p>

            <div className="space-y-2 pt-1 font-mono text-xs">
              <div>
                <a
                  href="mailto:wecove.in@gmail.com"
                  className="flex items-center gap-2.5 text-[#E5E4E2]/90 hover:text-[#E6E0F0] transition-colors py-1"
                >
                  <Mail className="w-4 h-4 text-[#E6E0F0]" />
                  <span>wecove.in@gmail.com</span>
                </a>
              </div>
              <div>
                <a
                  href="tel:+918660534989"
                  className="flex items-center gap-2.5 text-[#E5E4E2]/90 hover:text-[#E6E0F0] transition-colors py-1"
                >
                  <Phone className="w-4 h-4 text-[#E6E0F0]" />
                  <span>+91 8660534989</span>
                </a>
              </div>
            </div>

            <div className="pt-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 text-xs text-[#E6E0F0] hover:text-[#FAF9F6] underline decoration-[#6F4E37] underline-offset-4 font-semibold"
              >
                <span>Submit a detailed project brief</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#E5E4E2]/60 font-mono gap-4">
          <div>
            © {currentYear} WeCove.in. All rights reserved. Crafted with precision engineering.
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[#E6E0F0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E6E0F0] animate-pulse" />
              Systems Operational
            </span>
            <span>v2.0 Production</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
