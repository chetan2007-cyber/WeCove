import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const About = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Parallax for the main hero image/block
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div style={styles.container}>
      
      {/* 1. HERO SECTION */}
      <section ref={containerRef} style={styles.heroSection}>
        <motion.div style={{ ...styles.heroContent, y, opacity }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span style={styles.microTag}>THE WECOVE ORIGIN</span>
          </motion.div>
          
          <motion.h1 
            style={styles.massiveHeading}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Engineering the <br/> <span style={styles.italicAccent}>Impossible.</span>
          </motion.h1>
        </motion.div>
      </section>

      {/* 2. THE DNA / STORY SECTION */}
      <section style={styles.storySection}>
        <div style={styles.storyGrid}>
          <motion.div 
            style={styles.storyTextColumn}
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h2 style={styles.storyHeading}>Rooted in complex architecture.</h2>
            <p style={styles.storyParagraph}>
              What started as intensive research into AI agents and high-availability full-stack architectures has evolved into Wecove. We didn't build this company to push templates; we built it to solve hard engineering problems.
            </p>
            <p style={styles.storyParagraph}>
              Our DNA is built on rigorous, enterprise-grade foundations. From developing real-time automated surveillance ecosystems to architecting gamified, high-retention e-commerce platforms, we thrive where logic meets design.
            </p>
          </motion.div>

          <motion.div 
            style={styles.storyImageColumn}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            {/* Abstract representation of code/architecture */}
            <div style={styles.abstractArt}></div>
          </motion.div>
        </div>
      </section>

      {/* 3. CORE VALUES (DARK MODE) */}
      <section style={styles.valuesSection}>
        <div style={styles.valuesHeader}>
          <h2 style={styles.valuesTitle}>The Core Tenets</h2>
        </div>
        
        <div style={styles.valuesGrid}>
          <motion.div 
            style={styles.valueCard}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 style={styles.valueNumber}>01</h3>
            <h4 style={styles.valueName}>Absolute Precision</h4>
            <p style={styles.valueDesc}>Every line of our MERN stack architecture is written with intent. We prioritize zero-latency data flow and unbreakable backend security.</p>
          </motion.div>

          <motion.div 
            style={styles.valueCard}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <h3 style={styles.valueNumber}>02</h3>
            <h4 style={styles.valueName}>Automated Scale</h4>
            <p style={styles.valueDesc}>Manual bottlenecks kill startups. We build complex n8n node-based pipelines directly into our products so they run autonomously.</p>
          </motion.div>

          <motion.div 
            style={styles.valueCard}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 style={styles.valueNumber}>03</h3>
            <h4 style={styles.valueName}>Aesthetic Dominance</h4>
            <p style={styles.valueDesc}>A backend is only as good as the interface that controls it. We obsess over modern, glassmorphism-inspired UI/UX that converts.</p>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

const styles = {
  container: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    backgroundColor: '#fcfcfc',
    color: '#050505',
    width: '100%',
    overflowX: 'clip',
    WebkitFontSmoothing: 'antialiased',
  },
  
  /* HERO SECTION */
  heroSection: {
    height: '70vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#fcfcfc',
  },
  heroContent: {
    textAlign: 'center',
    zIndex: 10,
    padding: '0 2rem',
  },
  microTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.2em',
    color: '#666',
    textTransform: 'uppercase',
  },
  massiveHeading: {
    fontSize: 'clamp(4rem, 10vw, 8rem)',
    fontWeight: '800',
    lineHeight: '0.9',
    letterSpacing: '-0.04em',
    margin: '2rem 0',
    color: '#050505',
  },
  italicAccent: {
    fontStyle: 'italic',
    fontWeight: '400',
    color: '#444',
  },

  /* STORY SECTION */
  storySection: {
    padding: '8rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  storyGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6rem',
    alignItems: 'center',
  },
  storyTextColumn: {
    maxWidth: '600px',
  },
  storyHeading: {
    fontSize: 'clamp(2rem, 4vw, 3.5rem)',
    fontWeight: '700',
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
    marginBottom: '2rem',
  },
  storyParagraph: {
    fontSize: '1.25rem',
    color: '#555',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
  },
  storyImageColumn: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  abstractArt: {
    width: '100%',
    aspectRatio: '4/5',
    backgroundColor: '#eaeaea',
    borderRadius: '24px',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.08)',
  },

  /* VALUES SECTION (DARK) */
  valuesSection: {
    backgroundColor: '#050505',
    color: '#fcfcfc',
    padding: '10rem 2rem',
    borderTopLeftRadius: '48px',
    borderTopRightRadius: '48px',
  },
  valuesHeader: {
    maxWidth: '1400px',
    margin: '0 auto 5rem auto',
    padding: '0 2rem',
  },
  valuesTitle: {
    fontSize: '4rem',
    fontWeight: '700',
    letterSpacing: '-0.03em',
  },
  valuesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '3rem',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 2rem',
  },
  valueCard: {
    borderTop: '1px solid #333',
    paddingTop: '2rem',
  },
  valueNumber: {
    fontSize: '1.5rem',
    fontWeight: '400',
    color: '#555',
    marginBottom: '1rem',
  },
  valueName: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },
  valueDesc: {
    fontSize: '1.1rem',
    color: '#aaa',
    lineHeight: '1.6',
  }
};

export default About;