import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'CampZen App', path: '/download/campzen' },
    { name: 'Services', path: '/services' },
    { name: 'Work', path: '/work' },
    { name: 'Process', path: '/process' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#6F4E37]/10 shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="WeCove.in Home"
          >
            <div className="w-8 h-8 rounded-lg bg-[#6F4E37] flex items-center justify-center font-bold text-[#FAF9F6] font-sans text-sm tracking-tighter group-hover:bg-[#553B2A] transition-colors shadow-sm">
              W
            </div>
            <span className="font-bold text-xl tracking-tight text-[#1F1D1B] font-sans">
              WeCove<span className="text-[#6F4E37]">.in</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#E5E4E2]/70 p-1.5 rounded-full border border-[#6F4E37]/10 backdrop-blur-md">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#6F4E37] text-[#FAF9F6] font-semibold shadow-sm'
                      : 'text-[#57524D] hover:text-[#6F4E37] hover:bg-[#E6E0F0]/50'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Primary CTA */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              to="/download/campzen"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#6F4E37]/10 hover:bg-[#6F4E37]/15 border border-[#6F4E37]/25 text-[#6F4E37] text-xs font-semibold transition-all shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#27ae60] animate-pulse" />
              <span>Download CampZen</span>
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#6F4E37] text-[#FAF9F6] text-xs font-semibold hover:bg-[#553B2A] transition-all shadow-sm hover:shadow-md shadow-[#6F4E37]/20"
            >
              <span>Start a Project</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-[#E5E4E2]/80 border border-[#6F4E37]/15 text-[#1F1D1B] hover:bg-[#E6E0F0] focus:outline-none transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF9F6] border-b border-[#6F4E37]/15 px-4 pt-3 pb-6 space-y-2 shadow-lg animate-fadeIn">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#6F4E37] text-[#FAF9F6] font-semibold'
                    : 'text-[#57524D] hover:bg-[#E6E0F0]/60 hover:text-[#6F4E37]'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
          <div className="pt-2">
            <Link
              to="/contact"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#6F4E37] text-[#FAF9F6] font-semibold text-sm shadow-sm"
            >
              <span>Start a Project</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
