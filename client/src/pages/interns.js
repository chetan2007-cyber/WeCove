import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const Interns = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const tracks = [
    {
      id: '01',
      title: 'Full-Stack Architecture',
      tech: 'MERN Stack • Microservices • Database Design',
      desc: 'Bypass the sandbox. You will be writing production-level code for open-market applications. Learn to architect zero-latency environments and scale databases securely.',
    },
    {
      id: '02',
      title: 'AI & Automation Engineering',
      tech: 'n8n • AI Agents • Workflow Pipelines',
      desc: 'Build the brains behind the operation. You will deploy complex, node-based automation pipelines and integrate AI agents directly into our flagship product ecosystems.',
    },
    {
      id: '03',
      title: 'UI/UX & Product Engineering',
      tech: 'Figma • React • Gamified UX',
      desc: 'Design interfaces that breathe. Work on modern, conversion-optimized visual languages, gamified checkout experiences, and glassmorphism architectures.',
    }
  ];

  return (
    <div style={styles.container}>
      
      {/* 1. DARK KINETIC HERO */}
      <section ref={containerRef} style={styles.heroSection}>
        <motion.div style={{ ...styles.heroContent, y: heroY, opacity: heroOpacity }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <span style={styles.microTag}>WECOVE INCUBATOR</span>
          </motion.div>
          
          <motion.h1 
            style={styles.massiveHeading}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Cultivating the <br/> <span style={styles.italicAccent}>One Percent.</span>
          </motion.h1>
          
          <motion.p 
            style={styles.heroSubtext}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            No mock projects. No busywork. Build, deploy, and scale real products for the open market alongside elite engineers.
          </motion.p>
        </motion.div>
      </section>

      {/* 2. THE TRACKS (LIGHT MODE SEAMLESS TRANSITION) */}
      <section style={styles.tracksSection}>
        <div style={styles.tracksHeader}>
          <h2 style={styles.sectionTitle}>Engineering Tracks</h2>
          <p style={styles.sectionSubtext}>Select your discipline. Master your craft.</p>
        </div>

        <div style={styles.tracksList}>
          {tracks.map((track, index) => (
            <motion.div 
              key={track.id}
              style={styles.trackCard}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              whileHover={{ x: 10, backgroundColor: '#f0f0f0' }}
            >
              <div style={styles.trackId}>{track.id}</div>
              <div style={styles.trackContent}>
                <h3 style={styles.trackTitle}>{track.title}</h3>
                <p style={styles.trackTech}>{track.tech}</p>
                <p style={styles.trackDesc}>{track.desc}</p>
              </div>
              <div style={styles.trackArrow}>→</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. THE EXPECTATION SECTION */}
      <section style={styles.expectationSection}>
        <div style={styles.expectationGrid}>
          <motion.div 
            style={styles.expectationBox}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h3 style={styles.expectationTitle}>The Wecove Standard</h3>
            <p style={styles.expectationText}>
              We treat our interns exactly like our full-time engineers. You will be expected to push code to production, participate in rigorous architectural reviews, and defend your design decisions. In return, you will gain an unparalleled understanding of what it takes to build a startup from the ground up.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 4. CTA */}
      <section style={styles.ctaSection}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 style={styles.ctaHeading}>Prove your worth.</h2>
          <button style={styles.applyButton}>
            Apply for the Incubator
          </button>
        </motion.div>
      </section>

    </div>
  );
};

const styles = {
  container: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    backgroundColor: '#050505', // Starts dark
    color: '#fcfcfc',
    width: '100%',
    overflowX: 'clip',
    WebkitFontSmoothing: 'antialiased',
  },
  
  /* 1. HERO SECTION (DARK) */
  heroSection: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    textAlign: 'center',
    maxWidth: '1000px',
    padding: '0 2rem',
    zIndex: 10,
  },
  microTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.2em',
    color: '#888',
    textTransform: 'uppercase',
  },
  massiveHeading: {
    fontSize: 'clamp(3.5rem, 10vw, 8rem)',
    fontWeight: '800',
    lineHeight: '0.9',
    letterSpacing: '-0.04em',
    margin: '2rem 0',
    color: '#fcfcfc',
  },
  italicAccent: {
    fontStyle: 'italic',
    fontWeight: '400',
    color: '#666',
  },
  heroSubtext: {
    fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
    color: '#aaa',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
    fontWeight: '400',
  },

  /* 2. TRACKS SECTION (LIGHT) */
  tracksSection: {
    backgroundColor: '#fcfcfc',
    color: '#050505',
    padding: '10rem 2rem',
    borderTopLeftRadius: '48px', // Creates a beautiful curved transition from dark to light
    borderTopRightRadius: '48px',
  },
  tracksHeader: {
    maxWidth: '1200px',
    margin: '0 auto 5rem auto',
  },
  sectionTitle: {
    fontSize: '3rem',
    fontWeight: '700',
    letterSpacing: '-0.03em',
    marginBottom: '1rem',
  },
  sectionSubtext: {
    fontSize: '1.25rem',
    color: '#666',
  },
  tracksList: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
  },
  trackCard: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gap: '3rem',
    alignItems: 'center',
    padding: '3rem 2rem',
    borderBottom: '1px solid #eaeaea',
    cursor: 'pointer',
    borderRadius: '16px',
    transition: 'background-color 0.4s ease',
  },
  trackId: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ccc',
  },
  trackContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  trackTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    color: '#050505',
  },
  trackTech: {
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#888',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  trackDesc: {
    fontSize: '1.1rem',
    color: '#555',
    lineHeight: '1.6',
    maxWidth: '700px',
  },
  trackArrow: {
    fontSize: '2rem',
    color: '#ccc',
    fontWeight: '300',
  },

  /* 3. EXPECTATION SECTION */
  expectationSection: {
    backgroundColor: '#fcfcfc',
    padding: '5rem 2rem 10rem 2rem',
  },
  expectationGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  expectationBox: {
    backgroundColor: '#050505',
    color: '#fcfcfc',
    padding: '4rem',
    borderRadius: '24px',
    textAlign: 'center',
  },
  expectationTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
  },
  expectationText: {
    fontSize: '1.25rem',
    lineHeight: '1.7',
    color: '#bbb',
    maxWidth: '800px',
    margin: '0 auto',
  },

  /* 4. CTA SECTION */
  ctaSection: {
    backgroundColor: '#fcfcfc',
    padding: '5rem 2rem 12rem 2rem',
    display: 'flex',
    justifyContent: 'center',
    textAlign: 'center',
  },
  ctaHeading: {
    fontSize: 'clamp(3rem, 6vw, 5rem)',
    fontWeight: '800',
    letterSpacing: '-0.04em',
    color: '#050505',
    marginBottom: '3rem',
  },
  applyButton: {
    padding: '1.5rem 4rem',
    fontSize: '1.25rem',
    fontWeight: '600',
    backgroundColor: '#050505',
    color: '#fcfcfc',
    border: 'none',
    borderRadius: '100px',
    cursor: 'pointer',
    transition: 'transform 0.3s ease',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  }
};

export default Interns;