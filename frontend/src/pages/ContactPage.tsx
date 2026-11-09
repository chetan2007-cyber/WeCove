import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { submitInquiry } from '../services/api';
import { InquiryFormData } from '../types';

const projectTypes = [
  'Website Development',
  'Web Application Development',
  'Mobile Application Development',
  'SaaS Product Development',
  'AI & Intelligent Solutions',
  'Custom Software Development',
  'UI/UX & Product Design',
  'Automation & Integrations',
  'Backend & Cloud Engineering',
  'Startup MVP Development',
  'E-commerce Solutions',
  'Maintenance, Security & Scaling',
];

const budgetRanges = [
  'Under $5,000 (₹4L)',
  '$5,000 – $15,000 (₹4L – ₹12L)',
  '$15,000 – $35,000 (₹12L – ₹30L)',
  '$35,000+ (₹30L+)',
  'Flexible / To Be Scoped',
];

export const ContactPage: React.FC = () => {
  const location = useLocation();
  const prefill = (location.state as any)?.prefilledProjectType;

  const [formData, setFormData] = useState<InquiryFormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    projectType: prefill || 'Web Application Development',
    budget: '$5,000 – $15,000 (₹4L – ₹12L)',
    message: '',
    _gotcha: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [successDetails, setSuccessDetails] = useState<{ id?: string; notice?: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (prefill) {
      setFormData((prev) => ({ ...prev, projectType: prefill }));
    }
  }, [prefill]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Please provide your full name (at least 2 characters).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (!formData.projectType) {
      newErrors.projectType = 'Please select a project capability.';
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = 'Please provide a brief description of your project (at least 10 characters).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitInquiry(formData);

      if (response.success) {
        setSubmissionSuccess(true);
        setSuccessDetails({
          id: response.data?.id,
          notice: response.data?.notice,
        });

        // Trigger celebratory confetti
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#CCFF00', '#FFFFFF', '#38BDF8'],
          });
        } catch {
          // Ignore if canvas is unsupported
        }
      } else {
        setServerError(response.message || 'Unable to submit inquiry. Please try again.');
      }
    } catch (err: any) {
      setServerError(
        err.message || 'A network error occurred while submitting. You can also email us directly at wecove.in@gmail.com'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      company: '',
      phone: '',
      projectType: 'Web Application Development',
      budget: '$5,000 – $15,000 (₹4L – ₹12L)',
      message: '',
      _gotcha: '',
    });
    setErrors({});
    setSubmissionSuccess(false);
    setSuccessDetails(null);
    setServerError(null);
  };

  return (
    <div className="py-16 md:py-24 bg-[#08090C] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#CCFF00] mb-4">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>START A PROJECT CONVERSATION</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 uppercase">
            Let's build something <br />
            <span className="text-[#CCFF00]">meaningful together.</span>
          </h1>
          <p className="text-base sm:text-xl text-brand-muted leading-relaxed font-sans">
            Tell us about your digital product requirements. Every inquiry is reviewed directly by our founding engineers.
            Inquiries are stored securely and notified immediately to <span className="text-white font-mono">wecove.in@gmail.com</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Form Area (8 cols) */}
          <div className="lg:col-span-8 bg-[#111319] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
            {submissionSuccess ? (
              <div className="text-center py-10 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-[#CCFF00]/15 border border-[#CCFF00] flex items-center justify-center text-[#CCFF00] mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-widest text-[#CCFF00]">
                    TRANSMISSION RECORDED & PERSISTED
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Thank you, {formData.name}!
                  </h2>
                  <p className="text-sm text-brand-muted max-w-lg mx-auto font-sans leading-relaxed">
                    Your inquiry has been safely saved in our database. Our founding engineers have been notified at{' '}
                    <span className="text-white font-mono">wecove.in@gmail.com</span>. We will review your project scope
                    and reply within 24 hours.
                  </p>
                </div>

                {successDetails?.id && (
                  <div className="inline-block p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-gray-400">
                    <span>Reference ID: </span>
                    <span className="text-[#CCFF00]">{successDetails.id}</span>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Honeypot field for bot suppression (hidden) */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="_gotcha">Do not fill this field</label>
                  <input
                    type="text"
                    id="_gotcha"
                    name="_gotcha"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData._gotcha}
                    onChange={(e) => setFormData({ ...formData, _gotcha: e.target.value })}
                  />
                </div>

                {/* Server Error Banner */}
                {serverError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold">Submission Notice</div>
                      <div>{serverError}</div>
                    </div>
                  </div>
                )}

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Full Name <span className="text-[#CCFF00]">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      placeholder="e.g. Chetan Sharma"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      className={`w-full bg-[#181A22] border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${
                        errors.name ? 'border-red-500' : 'border-white/10 focus:border-[#CCFF00]'
                      }`}
                    />
                    {errors.name && <p className="text-[11px] text-red-400 mt-1.5">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Email Address <span className="text-[#CCFF00]">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      className={`w-full bg-[#181A22] border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${
                        errors.email ? 'border-red-500' : 'border-white/10 focus:border-[#CCFF00]'
                      }`}
                    />
                    {errors.email && <p className="text-[11px] text-red-400 mt-1.5">{errors.email}</p>}
                  </div>
                </div>

                {/* Company & Phone Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="company" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Company / Organization <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      placeholder="e.g. Acme Innovations"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full bg-[#181A22] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#CCFF00] transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Phone Number <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      placeholder="e.g. +91 8660534989"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#181A22] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#CCFF00] transition-colors"
                    />
                  </div>
                </div>

                {/* Project Type Selector */}
                <div>
                  <label htmlFor="projectType" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Primary Capability / Project Type <span className="text-[#CCFF00]">*</span>
                  </label>
                  <select
                    id="projectType"
                    required
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full bg-[#181A22] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#CCFF00] transition-colors font-mono"
                  >
                    {projectTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget Range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Estimated Budget Range
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {budgetRanges.map((range) => {
                      const isSelected = formData.budget === range;
                      return (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setFormData({ ...formData, budget: range })}
                          className={`p-3 rounded-xl border text-left text-xs font-mono transition-all ${
                            isSelected
                              ? 'bg-[#CCFF00]/15 border-[#CCFF00] text-[#CCFF00] font-semibold'
                              : 'bg-[#181A22] border-white/5 text-gray-300 hover:border-white/20'
                          }`}
                        >
                          {range}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Project Description Message */}
                <div>
                  <label htmlFor="message" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Project Description & Requirements <span className="text-[#CCFF00]">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    placeholder="Briefly describe the product, your timeline, key features, or problems you are solving..."
                    value={formData.message}
                    onChange={(e) => {
                      setFormData({ ...formData, message: e.target.value });
                      if (errors.message) setErrors({ ...errors, message: '' });
                    }}
                    className={`w-full bg-[#181A22] border rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${
                      errors.message ? 'border-red-500' : 'border-white/10 focus:border-[#CCFF00]'
                    }`}
                  />
                  {errors.message && <p className="text-[11px] text-red-400 mt-1.5">{errors.message}</p>}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-xl bg-[#CCFF00] hover:bg-[#BCE800] text-[#08090C] font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#CCFF00]/20 disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Transmitting to Engineering Team...</span>
                      </>
                    ) : (
                      <>
                        <span>SUBMIT PROJECT INQUIRY</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <div className="text-center mt-3 text-[11px] font-mono text-gray-500">
                    Inquiries are stored directly in PostgreSQL & notified to wecove.in@gmail.com
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Right Supporting Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Direct Official Contact Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#111319] border border-white/10 space-y-5">
              <div className="text-xs font-mono uppercase tracking-wider text-[#CCFF00] font-semibold">
                Official Company Contact
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div>
                  <div className="text-gray-500 text-[10px] uppercase mb-1">Inquiry Mailbox</div>
                  <a
                    href="mailto:wecove.in@gmail.com"
                    className="flex items-center gap-2 text-white hover:text-[#CCFF00] transition-colors font-sans text-sm font-semibold"
                  >
                    <Mail className="w-4 h-4 text-[#CCFF00]" />
                    <span>wecove.in@gmail.com</span>
                  </a>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <div className="text-gray-500 text-[10px] uppercase mb-1">Company Direct Phone</div>
                  <a
                    href="tel:+918660534989"
                    className="flex items-center gap-2 text-white hover:text-[#CCFF00] transition-colors font-sans text-sm font-semibold"
                  >
                    <Phone className="w-4 h-4 text-[#CCFF00]" />
                    <span>+91 8660534989</span>
                  </a>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <div className="text-gray-500 text-[10px] uppercase mb-1">Founder Direct Line</div>
                  <div className="text-gray-300 font-sans text-xs">
                    Chetan Sharma P (Founder) & Founding Team
                  </div>
                </div>
              </div>
            </div>

            {/* Response SLA Card */}
            <div className="p-6 rounded-3xl bg-[#101217] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-white">
                <Clock className="w-4 h-4 text-[#CCFF00]" />
                <span className="font-bold">24-Hour Response SLA</span>
              </div>
              <p className="text-xs text-brand-muted leading-relaxed font-sans">
                Every inquiry is reviewed by our engineering leads. You will receive a technical assessment and schedule
                for an initial discovery call within 24 business hours.
              </p>
            </div>

            {/* Security & Confidentiality */}
            <div className="p-6 rounded-3xl bg-[#101217] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-white">
                <ShieldCheck className="w-4 h-4 text-[#CCFF00]" />
                <span className="font-bold">Strict NDA & Confidentiality</span>
              </div>
              <p className="text-xs text-brand-muted leading-relaxed font-sans">
                All ideas, project requirements, architectural specifications, and commercial details submitted to
                WeCove.in are held in strict confidence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
