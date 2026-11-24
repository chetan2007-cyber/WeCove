import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Printer,
  Sliders,
  Clock,
  BookOpen,
  Copy,
  Check,
  Layers,
  Cpu,
  HardDrive,
  AlertCircle,
  QrCode,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CampZenDownloadPage: React.FC = () => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCert, setCopiedCert] = useState(false);

  const appVersion = '1.0.0';
  const releaseDate = 'November 2026';
  const downloadUrl = '/downloads/campzen-v1.0.0.apk';
  const minAndroid = 'Android 7.0+ (Nougat, API 24)';
  const targetAndroid = 'Android 16 (API 36)';
  const certFingerprint =
    '47:2E:F1:CB:B3:09:D8:E0:E8:03:1E:F0:C7:E1:0C:84:31:59:FA:DD:75:4F:2B:BB:F0:9B:22:52:82:6F:9D:7C';
  const apkSha256 =
    '6835F80E66A41706C90D62C5646EE72DB57A0C108734B617FDD34B9A35925DE8';

  const handleCopySha = () => {
    navigator.clipboard.writeText(apkSha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleCopyCert = () => {
    navigator.clipboard.writeText(certFingerprint);
    setCopiedCert(true);
    setTimeout(() => setCopiedCert(false), 2000);
  };

  const features = [
    {
      icon: Printer,
      title: 'Queue-Free Print Ordering',
      description:
        'Upload lecture slides, notes, assignments, or resumes from your phone. Configure duplex, color, and paper type without standing in line.',
    },
    {
      icon: Clock,
      title: 'Real-Time Order Tracking',
      description:
        'Watch your document move live through New, Accepted, Printing, and Ready phases. Arrive at the counter only when your papers are ready.',
    },
    {
      icon: Sliders,
      title: 'Smart N-Up & Finishing Layouts',
      description:
        'Flexible 1-Up, 2-Up, and 4-Up layouts with horizontal side-by-side or vertical orientation options. Save money and paper instantly.',
    },
    {
      icon: BookOpen,
      title: 'Campus Notes & Marketplace',
      description:
        'Discover peer-verified study guides, lab records, previous year papers, and sell your used textbooks to students on your campus.',
    },
    {
      icon: QrCode,
      title: 'Secure Counter Pickup Codes',
      description:
        'Every order generates an encrypted 4-digit counter pickup code and digital production ticket ensuring strictly zero mix-ups at pickup.',
    },
    {
      icon: ShieldCheck,
      title: 'Bank-Grade UPI & Privacy',
      description:
        'Pay securely via UPI (Google Pay, PhonePe, Paytm). Your academic documents are strictly encrypted and permanently deleted post-fulfillment.',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-[#FAF9F6] pt-28 pb-24 px-4 sm:px-6 lg:px-8">
      {/* Ambient Top Glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[#E6E0F0]/60 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E6E0F0] border border-[#D5CBE5] text-xs font-mono text-[#6F4E37] font-semibold mb-6 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#27ae60] animate-pulse" />
            <span>OFFICIAL PRODUCT RELEASE / WECOVE.IN</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-serif tracking-tight text-[#1F1D1B] leading-[1.1] mb-6"
          >
            Your campus.{' '}
            <span className="text-[#6F4E37] italic block sm:inline">In your pocket.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg text-[#57524D] leading-relaxed mb-10"
          >
            Skip the print shop queue, customize print layouts in seconds, track orders in real-time,
            and access campus study resources — anywhere, anytime.
          </motion.p>

          {/* In-App Browser & Sideloading Notice */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mb-8 p-4 rounded-2xl bg-[#fff8f0] border border-[#f39c12]/30 text-xs sm:text-sm text-[#8a4b08] text-left flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-[#d35400] mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-semibold text-[#1F1D1B]">
                Opening via WhatsApp, Instagram, or Telegram?
              </strong>
              <span>
                In-app browsers block downloading files. Tap the <strong>three dots (⋮)</strong> in the top-right corner and choose <strong>"Open in Chrome / Browser"</strong> to download. If you already have an older test version of Kami or CampZen on your phone, <strong>uninstall it first</strong>.
              </span>
            </div>
          </motion.div>

          {/* MAIN DOWNLOAD CARD */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="bg-white rounded-3xl p-8 sm:p-10 border border-[#6F4E37]/15 shadow-xl shadow-[#6F4E37]/5 text-left"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-[#1F1D1B]/10">
              <img
                src="/assets/campzen-icon.png"
                alt="CampZen App Icon"
                className="w-24 h-24 rounded-3xl shadow-lg shadow-[#6F4E37]/20 border border-[#6F4E37]/15 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#1F1D1B] tracking-tight">
                    CampZen for Android
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#eafaf1] text-[#27ae60] border border-[#27ae60]/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> Production Signed APK
                  </span>
                </div>
                <p className="text-sm text-[#57524D] mb-4">
                  Official release by <strong>WeCove.in</strong>. Verified universal APK supporting all Android smartphones (Android 7.0 through Android 16).
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#8B8580] font-mono">
                  <span>Version {appVersion} (Build 1)</span>
                  <span>•</span>
                  <span>81.2 MB</span>
                  <span>•</span>
                  <span>Released {releaseDate}</span>
                </div>
              </div>
            </div>

            {/* DOWNLOAD ACTION BUTTONS */}
            <div className="pt-8 flex flex-col sm:flex-row items-center gap-4">
              <a
                href="https://wecove.in/downloads/campzen-v1.0.0.apk"
                download="campzen-v1.0.0.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#6F4E37] hover:bg-[#553B2A] text-white text-base font-semibold shadow-lg shadow-[#6F4E37]/25 hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Download className="w-5 h-5" />
                <span>Download CampZen APK (v1.0.0)</span>
              </a>

              <a
                href="#installation-guide"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#E5E4E2]/70 hover:bg-[#E5E4E2] text-[#1F1D1B] text-sm font-semibold transition-colors"
              >
                <span>How to Install</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* QUICK METADATA GRID */}
            <div className="mt-8 pt-8 border-t border-[#1F1D1B]/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#6F4E37]/10">
                <span className="text-[#8B8580] flex items-center gap-1.5 mb-1 font-sans">
                  <Smartphone className="w-3.5 h-3.5" /> Minimum OS
                </span>
                <strong className="text-[#1F1D1B] font-mono">{minAndroid}</strong>
              </div>
              <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#6F4E37]/10">
                <span className="text-[#8B8580] flex items-center gap-1.5 mb-1 font-sans">
                  <HardDrive className="w-3.5 h-3.5" /> File Size
                </span>
                <strong className="text-[#1F1D1B] font-mono">80.2 MB (84,153,572 bytes)</strong>
              </div>
              <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#6F4E37]/10">
                <span className="text-[#8B8580] flex items-center gap-1.5 mb-1 font-sans">
                  <Cpu className="w-3.5 h-3.5" /> Architecture
                </span>
                <strong className="text-[#1F1D1B] font-mono">arm64-v8a, armeabi-v7a, x86</strong>
              </div>
              <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#6F4E37]/10">
                <span className="text-[#8B8580] flex items-center gap-1.5 mb-1 font-sans">
                  <Layers className="w-3.5 h-3.5" /> Package ID
                </span>
                <strong className="text-[#1F1D1B] font-mono">in.wecove.campzen</strong>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CRYPTOGRAPHIC VERIFICATION CARD */}
        <section className="mb-20">
          <div className="bg-[#1F1D1B] text-[#FAF9F6] rounded-3xl p-8 sm:p-10 border border-[#3E3A36] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-6 h-6 text-[#27ae60]" />
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                Cryptographic Integrity & Authenticity
              </h3>
            </div>
            <p className="text-sm text-[#A8A29E] leading-relaxed mb-8 max-w-3xl">
              CampZen APK is cryptographically signed using WeCove.in's official production release keystore.
              Verify these hashes on your device to guarantee the file was not tampered with.
            </p>

            <div className="space-y-4">
              {/* SHA-256 Checksum */}
              <div className="bg-[#2B2724] p-4 sm:p-5 rounded-2xl border border-[#3E3A36]">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#A8A29E]">
                    APK SHA-256 Checksum
                  </span>
                  <button
                    onClick={handleCopySha}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-[#3E3A36] hover:bg-[#4E4A45] text-white transition-colors"
                  >
                    {copiedSha ? (
                      <>
                        <Check className="w-3 h-3 text-[#27ae60]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy SHA-256
                      </>
                    )}
                  </button>
                </div>
                <code className="text-xs sm:text-sm font-mono text-[#D5CBE5] break-all block">
                  {apkSha256}
                </code>
              </div>

              {/* Signing Certificate Fingerprint */}
              <div className="bg-[#2B2724] p-4 sm:p-5 rounded-2xl border border-[#3E3A36]">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#A8A29E]">
                    Signing Certificate SHA-256 (WeCove.in)
                  </span>
                  <button
                    onClick={handleCopyCert}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-[#3E3A36] hover:bg-[#4E4A45] text-white transition-colors"
                  >
                    {copiedCert ? (
                      <>
                        <Check className="w-3 h-3 text-[#27ae60]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Certificate
                      </>
                    )}
                  </button>
                </div>
                <code className="text-xs sm:text-sm font-mono text-[#D5CBE5] break-all block">
                  {certFingerprint}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* 4-STEP INSTALLATION GUIDE */}
        <section id="installation-guide" className="mb-20 scroll-mt-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-serif text-[#1F1D1B] tracking-tight mb-4">
              How to Install the APK on Your Android Device
            </h2>
            <p className="text-sm text-[#57524D]">
              Installing an APK directly takes less than 60 seconds. Follow these simple steps:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Uninstall Old Builds',
                desc: 'If you have an earlier testing version of Kami or CampZen on your phone, uninstall it first to prevent Android signature conflicts ("App not installed").',
              },
              {
                step: '02',
                title: 'Download & Allow',
                desc: 'Tap "Download CampZen APK". If Chrome asks "File might be harmful", tap "Download anyway".',
              },
              {
                step: '03',
                title: 'Enable Unknown Apps',
                desc: 'Open the downloaded file. If prompted, toggle ON "Allow from this source" in your phone\'s Security settings.',
              },
              {
                step: '04',
                title: 'Tap Install & Sign In',
                desc: 'Tap "Install". Launch CampZen from your home screen, sign in with your college account, and print queue-free.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="bg-white p-6 rounded-2xl border border-[#6F4E37]/15 shadow-sm relative overflow-hidden"
              >
                <div className="text-3xl font-serif font-bold text-[#6F4E37]/20 mb-3">{s.step}</div>
                <h4 className="text-base font-bold text-[#1F1D1B] mb-2">{s.title}</h4>
                <p className="text-xs text-[#57524D] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* PLAY PROTECT NOTICE */}
          <div className="mt-8 bg-[#fff8f0] border border-[#f39c12]/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4">
            <div className="p-3 bg-[#f39c12]/15 text-[#d35400] rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#1F1D1B] mb-2">
                Why does Google Play Protect show "Unrecognized app"?
              </h4>
              <p className="text-xs sm:text-sm text-[#57524D] leading-relaxed">
                Because CampZen is distributed directly through our official website prior to its Google Play Store rollout,
                Google Play Protect has not yet indexed this specific build hash. Simply tap{' '}
                <strong className="text-[#1F1D1B]">"More details"</strong> and then{' '}
                <strong className="text-[#1F1D1B]">"Install anyway"</strong>. Our application is 100% free of ads, tracking, or malware.
              </p>
            </div>
          </div>
        </section>

        {/* CORE FEATURES SHOWCASE */}
        <section className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-serif text-[#1F1D1B] tracking-tight mb-4">
              Everything You Need for Campus Productivity
            </h2>
            <p className="text-sm text-[#57524D]">
              Designed specifically for engineering, medical, law, and college campus students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white p-8 rounded-2xl border border-[#6F4E37]/15 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#6F4E37]/10 flex items-center justify-center text-[#6F4E37] mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-[#1F1D1B] mb-2">{f.title}</h4>
                  <p className="text-xs sm:text-sm text-[#57524D] leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM DOWNLOAD CTA BANNER */}
        <div className="bg-[#6F4E37] text-white rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-xl shadow-[#6F4E37]/20">
          <div className="max-w-2xl mx-auto relative z-10">
            <h3 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight mb-4">
              Ready to Upgrade Your Campus Experience?
            </h3>
            <p className="text-sm sm:text-base text-white/80 mb-8 leading-relaxed">
              Download CampZen for Android today. Free to download, zero subscription fees.
            </p>
            <a
              href={downloadUrl}
              download="campzen-v1.0.0.apk"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-[#6F4E37] text-base font-semibold shadow-lg hover:bg-[#FAF9F6] transition-all hover:scale-105 active:scale-100"
            >
              <Download className="w-5 h-5 text-[#6F4E37]" />
              <span>Download CampZen APK v1.0.0</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CampZenDownloadPage;
