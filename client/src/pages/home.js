import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';

const Home = () => {
  // Hero Parallax
  const { scrollYProgress: heroProgress } = useScroll();
  const heroY = useTransform(heroProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(heroProgress, [0, 0.5], [1, 0]);

  // Sticky Manifesto
  const manifestoRef = useRef(null);
  const { scrollYProgress: stickyScroll } = useScroll({
    target: manifestoRef,
    offset: ["start start", "end end"]
  });
  const textScale = useTransform(stickyScroll, [0, 0.5], [1, 1.2]);
  const textBlur = useTransform(stickyScroll, [0, 0.5], ["blur(0px)", "blur(10px)"]);

  // Horizontal Scroll for Products
  const targetRef = useRef(null);
  const { scrollYProgress: horizontalScroll } = useScroll({
    target: targetRef,
  });
  const x = useTransform(horizontalScroll, [0, 1], ["1%", "-65%"]);

  return (
    <div style={styles.container}>
      
      {/* 1. KINETIC HERO SECTION */}
      <section style={{...styles.heroSection, zIndex: 1}}>
        <motion.div style={{ ...styles.heroContent, y: heroY, opacity: heroOpacity }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <span style={styles.microTag}>WECOVE ENGINEERING</span>
          </motion.div>
          
          <motion.h1 
            style={styles.massiveHeading}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Defy the <br/> <span style={styles.italicAccent}>Standard.</span>
          </motion.h1>
          
          <motion.p 
            style={styles.heroSubtext}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            We architect responsive marketplace architectures and high-performance digital ecosystems. Precision-crafted for the open market.
          </motion.p>
        </motion.div>
      </section>

      {/* 2. TECH STACK MARQUEE */}
      <div style={{...styles.marqueeContainer, position: 'relative', zIndex: 5}}>
        <motion.div 
          style={styles.marqueeTrack}
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
        >
          <h3 style={styles.marqueeText}>
            REACT ✦ NODE.JS ✦ MONGODB ✦ EXPRESS ✦ FIGMA ✦ N8N AUTOMATION ✦ REACT ✦ NODE.JS ✦ MONGODB ✦ EXPRESS ✦ FIGMA ✦ N8N AUTOMATION ✦
          </h3>
        </motion.div>
      </div>

      {/* 3. THE STICKY MANIFESTO */}
      {/* Set to zIndex 10. The next section will slide OVER it. */}
      <section ref={manifestoRef} style={{...styles.stickyContainer, zIndex: 10 }}>
        <div style={styles.stickyContent}>
          <motion.h2 
            style={{ ...styles.manifestoText, scale: textScale, filter: textBlur }}
          >
            Software is abundant. <br/> <span style={styles.boldAccent}>Excellence is rare.</span>
          </motion.h2>
        </div>
        <div style={styles.scrollingContent}>
          <div style={styles.manifestoBlock}>
            <h3 style={styles.blockTitle}>The Philosophy</h3>
            <p style={styles.blockText}>
              We strip away the bloat. Every product deployed under the Wecove banner is an exercise in minimalist power. We combine breathtaking UI/UX design with unshakeable backend infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* Z-INDEX BUFFER (zIndex 20) TO WIPE OVER THE STICKY SECTION CLEANLY */}
      <div style={{ height: '15vh', width: '100%', backgroundColor: '#0a0a0a', position: 'relative', zIndex: 20 }}></div>

      {/* 4. HORIZONTAL PRODUCT SHOWCASE */}
      {/* Set to zIndex 20 so it sits above the manifesto */}
      <section ref={targetRef} style={{...styles.horizontalScrollContainer, zIndex: 20 }}>
        <div style={styles.horizontalSticky}>
          <div style={styles.horizontalHeader}>
            <h2 style={styles.sectionTitleDark}>Flagship Deployments</h2>
            <p style={styles.sectionSubDark}>Products engineered for scale and market dominance.</p>
          </div>
          
          <motion.div style={{ ...styles.horizontalTrack, x }}>
            
            {/* Product 1: Seeni-Tattooz */}
            <a href="https://seenitattooz.in" target="_blank" rel="noreferrer" style={styles.productLink}>
              <div style={styles.productCard}>
                <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80" alt="Seeni-Tattooz App" style={styles.productImage} />
                <h3 style={styles.productTitle}>Seeni-Tattooz</h3>
                <p style={styles.productDesc}>Seeni Tattooz is a premier professional tattoo and body piercing studio located in Kuvempu Nagara, Mysuru (Mysore), Karnataka, founded and led by master artist Srinivas. Established in 2011, the studio brings over a decade of experience with a strong reputation for custom tattoo designs, realism shading, fine line art, traditional styles, and hygienic body piercings.</p>
              </div>
            </a>
            
            {/* Product 2: Bhagavathi Jwels */}
            <a href="https://bhagavathi.vercel.com" target="_blank" rel="noreferrer" style={styles.productLink}>
              <div style={styles.productCard}>
                <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80" alt="V-STARS Dashboard" style={styles.productImage} />
                <h3 style={styles.productTitle}>Bhagavathi Jwels</h3>
                <p style={styles.productDesc}>Bhagavathi Jewellers is a premier fine jewelry brand renowned for its masterful craftsmanship and enduring legacy of trust. The flagship showroom offers an exquisite portfolio of 100% BIS-hallmarked 22K and 24K gold, certified natural diamonds, and elegant silverware, with collections ranging from contemporary everyday wear to authentic antique temple jewelry and the exclusive bridal line, The Muhurtham Edit.</p>
              </div>
            </a>

            {/* Product 3: Smile Arc Dental Clinic */}
            <a href="https://smilearcdentistry.co.in" target="_blank" rel="noreferrer" style={styles.productLink}>
              <div style={styles.productCard}>
                <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80" alt="Tattoopetals Web" style={styles.productImage} />
                <h3 style={styles.productTitle}>Smile Arc Dental Clinic</h3>
                <p style={styles.productDesc}>Smile Arc Dental Clinic is a premier dental care facility located in Vijayanagar, Mysore, led by chief orthodontist Dr. Chetan G. B. The clinic provides comprehensive oral healthcare services, ranging from routine dental checkups and advanced root canal therapies to specialized orthodontic treatments and periodontal care.</p>
              </div>
            </a>

             {/* Product 4: Againzt */}
             <a href="https://againzt.com" target="_blank" rel="noreferrer" style={styles.productLink}>
              <div style={styles.productCard}>
                <img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80" alt="Againzt Platform" style={styles.productImage} />
                <h3 style={styles.productTitle}>Againzt</h3>
                <p style={styles.productDesc}>A modern digital retail platform engineered from the ground up for frictionless user experiences and rapid scaling.</p>
              </div>
            </a>

          </motion.div>
        </div>
      </section>

      {/* EXTENDS THE BLACK BACKGROUND DOWN FOR BREATHING ROOM (zIndex 20) */}
      <div style={{ height: '250px', width: '100%', backgroundColor: '#0a0a0a', position: 'relative', zIndex: 20 }}></div>

      {/* 5. ASYMMETRIC CAPABILITIES GRID */}
      {/* Set to zIndex 30 so it smoothly slides over the end of the Flagships section */}
      <section style={{...styles.capabilitiesSection, position: 'relative', zIndex: 30, backgroundColor: '#fcfcfc'}}>
        <div style={styles.capabilitiesHeader}>
          <h2 style={styles.sectionTitle}>The Arsenal</h2>
        </div>

        <div style={styles.bentoGrid}>
          <motion.div 
            style={{ ...styles.bentoBox, ...styles.bentoLarge }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div style={styles.bentoContent}>
              <h4 style={styles.bentoTitle}>Full-Stack Dominance</h4>
              <p style={styles.bentoDesc}>
                Engineered on a pure MERN stack foundation. We bypass conventional limits to deliver zero-latency experiences and secure, highly scalable databases.
              </p>
            </div>
          </motion.div>

          <motion.div 
            style={{ ...styles.bentoBox, ...styles.bentoDark }}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <div style={styles.bentoContent}>
              <h4 style={styles.bentoTitleDark}>Workflow Automation</h4>
              <p style={styles.bentoDescDark}>
                Deploying complex, node-based n8n pipelines that aggregate data flawlessly and automate operations at scale.
              </p>
            </div>
          </motion.div>

          <motion.div 
            style={styles.bentoBox}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <div style={styles.bentoContent}>
              <h4 style={styles.bentoTitle}>Pixel-Perfect UI/UX</h4>
              <p style={styles.bentoDesc}>
                Interfaces that breathe. We implement modern, high-conversion visual languages tailored for flawless user retention.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5.5 MINI TEAM SECTION */}
      <section style={{...styles.miniTeamSection, position: 'relative', zIndex: 30, backgroundColor: '#fcfcfc'}}>
        <div style={styles.teamHeader}>
          <h2 style={styles.sectionTitle}>The Mind Trust</h2>
          <p style={styles.teamSubtext}>Engineered by experts. Executed with precision.</p>
        </div>
        <div style={styles.teamGrid}>
          {/* Quick highlight of the founders/leads */}
          <div style={styles.miniTeamCard}>
            <div style={styles.miniAvatar}>P</div>
            <h4>Prajwal K R</h4>
            <p>?</p>
          </div>
          <div style={styles.miniTeamCard}>
            <div style={styles.miniAvatar}>C</div>
            <h4>Chetan Sharma P</h4>
            <p>?</p>
          </div>
          <div style={styles.miniTeamCard}>
            <div style={styles.miniAvatar}>H</div>
            <h4>Harshit S</h4>
            <p>?</p>
          </div>
        </div>
      </section>

      {/* 6. MASSIVE CLOSING CTA */}
      <section style={{...styles.finalSection, position: 'relative', zIndex: 30, backgroundColor: '#fcfcfc'}}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={styles.ctaWrapper}
        >
          <h2 style={styles.hugeCtaText}>Initiate.</h2>
          <button style={styles.executiveButton}>
            Engage Wecove
          </button>
        </motion.div>
      </section>

      {/* 7. RE-ENGINEERED FOOTER */}
      <footer style={{...styles.footer, position: 'relative', zIndex: 40}}>
        
        {/* TOP HALF: THE CALLOUT */}
        <div style={styles.footerTopSection}>
          <h2 style={styles.footerCallout}>Ready to defy <br/> the standard?</h2>
          <a href="mailto:sharmachetan7816@gmail.com" style={styles.emailPill}>
            sharmachetan7816@gmail.com ✦
          </a>
        </div>

        {/* BOTTOM HALF: THE DIRECTORY */}
        <div style={styles.footerGrid}>
          <div style={styles.brandCol}>
            <h2 style={styles.footerLogo}>WECOVE</h2>
            <p style={styles.footerTagline}>Engineered in Mysuru. Deployed globally.</p>
          </div>
          
          <div style={styles.linkCol}>
            <h4 style={styles.colTitle}>Platform</h4>
            <Link to="/" style={styles.footerLink}>Home</Link>
            <Link to="/about" style={styles.footerLink}>Origin</Link>
            <Link to="/team" style={styles.footerLink}>Mind Trust</Link>
          </div>

          <div style={styles.linkCol}>
            <h4 style={styles.colTitle}>Engage</h4>
            <Link to="/contact" style={styles.footerLink}>Inquiries</Link>
            <Link to="/interns" style={styles.footerLink}>Incubator</Link>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={styles.footerLink}>LinkedIn</a>
          </div>
        </div>

        <div style={styles.bottomBar}>
          <p>© {new Date().getFullYear()} Wecove Engineering. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

const styles = {
  container: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    backgroundColor: '#fcfcfc',
    color: '#050505',
    width: '100%',
    overflowX: 'clip', // Prevents horizontal scroll while allowing sticky to work
    WebkitFontSmoothing: 'antialiased',
  },
  /* 1. HERO */
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
    maxWidth: '1200px',
    padding: '0 2rem',
    zIndex: 10,
  },
  microTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.2em',
    color: '#666',
    textTransform: 'uppercase',
  },
  massiveHeading: {
    fontSize: 'clamp(4rem, 12vw, 10rem)',
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
  heroSubtext: {
    fontSize: 'clamp(1rem, 2vw, 1.5rem)',
    color: '#555',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.5',
    fontWeight: '400',
  },

  /* 2. MARQUEE */
  marqueeContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#050505',
    padding: '2rem 0',
    borderBottom: '1px solid #222',
  },
  marqueeTrack: {
    display: 'flex',
    whiteSpace: 'nowrap',
    width: 'fit-content',
  },
  marqueeText: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#fcfcfc',
    letterSpacing: '0.1em',
    margin: 0,
    paddingRight: '2rem',
  },

  /* 3. STICKY MANIFESTO */
  stickyContainer: {
    position: 'relative',
    height: '200vh',
    backgroundColor: '#050505',
    color: '#fcfcfc',
  },
  stickyContent: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  manifestoText: {
    fontSize: 'clamp(2rem, 5vw, 5rem)',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: '-0.02em',
    lineHeight: '1.1',
    color: '#888',
  },
  boldAccent: {
    color: '#fcfcfc',
    fontWeight: '700',
  },
  scrollingContent: {
    position: 'absolute',
    bottom: '10vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 20,
  },
  manifestoBlock: {
    backgroundColor: 'rgba(252, 252, 252, 0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding: '3rem',
    borderRadius: '24px',
    maxWidth: '600px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  blockTitle: {
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '1rem',
    color: '#aaa',
  },
  blockText: {
    fontSize: '1.25rem',
    lineHeight: '1.6',
    color: '#eee',
  },

  /* 4. HORIZONTAL SCROLL SECTION */
  horizontalScrollContainer: {
    position: 'relative',
    height: '300vh', 
    backgroundColor: '#0a0a0a',
  },
  horizontalSticky: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingTop: '6rem',           // <--- Reduced to safely clear the navbar without pushing too far
    paddingLeft: '4rem',
    paddingRight: '4rem',
    overflow: 'hidden',
  },
  horizontalHeader: {
    marginBottom: '2rem',         // <--- Reduced from 4rem to save vertical space
  },
  sectionTitleDark: {
    fontSize: '3.5rem',
    fontWeight: '700',
    color: '#fcfcfc',
    letterSpacing: '-0.03em',
    marginBottom: '0.5rem',
  },
  sectionSubDark: {
    fontSize: '1.25rem',
    color: '#888',
  },
  horizontalTrack: {
    display: 'flex',
    gap: '3rem',
    width: 'max-content',
  },
  productLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'transform 0.3s ease',
  },
  productCard: {
    width: '400px',               // <--- Slightly narrower
    backgroundColor: '#111',
    borderRadius: '24px',
    padding: '1.5rem',            // <--- Reduced padding inside the card
    border: '1px solid #222',
    transition: 'border-color 0.3s ease, transform 0.3s ease',
    cursor: 'pointer',
  },
  productImage: {
    width: '100%',
    height: '160px',              // <--- Shrunk the image height so the text fits on laptop screens
    objectFit: 'cover', 
    borderRadius: '16px',
    marginBottom: '1rem',         // <--- Reduced margin
    border: '1px solid #222',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '250px',
    backgroundColor: '#222',
    borderRadius: '16px',
    marginBottom: '2rem',
  },
  productTitle: {
    fontSize: '1.5rem',           // <--- Slightly scaled down
    color: '#fcfcfc',
    marginBottom: '0.5rem',
    fontWeight: '700',
  },
  productDesc: {
    fontSize: '0.95rem',          // <--- Slightly scaled down text
    color: '#aaa',
    lineHeight: '1.4',
  },

  /* 5. BENTO GRID CAPABILITIES */
  capabilitiesSection: {
    padding: '10rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  capabilitiesHeader: {
    marginBottom: '4rem',
  },
  sectionTitle: {
    fontSize: '3rem',
    fontWeight: '700',
    letterSpacing: '-0.03em',
  },
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gridAutoRows: '400px',
    gap: '2rem',
  },
  bentoBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: '32px',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    transition: 'transform 0.4s ease',
  },
  bentoLarge: {
    gridColumn: 'span 2 / auto',
    backgroundColor: '#ececec',
  },
  bentoDark: {
    backgroundColor: '#050505',
    color: '#fcfcfc',
  },
  bentoContent: {
    maxWidth: '400px',
  },
  bentoTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
    color: '#050505',
  },
  bentoDesc: {
    fontSize: '1.1rem',
    color: '#555',
    lineHeight: '1.5',
  },
  bentoTitleDark: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
    color: '#fcfcfc',
  },
  bentoDescDark: {
    fontSize: '1.1rem',
    color: '#aaa',
    lineHeight: '1.5',
  },

  /* 6. FINAL CTA */
  finalSection: {
    padding: '1rem 2rem 5rem 2rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaWrapper: {
    textAlign: 'center',
  },
  hugeCtaText: {
    fontSize: 'clamp(5rem, 15vw, 12rem)',
    fontWeight: '800',
    letterSpacing: '-0.05em',
    color: '#050505',
    marginBottom: '2rem',
  },
  executiveButton: {
    padding: '1.5rem 4rem',
    fontSize: '1.25rem',
    fontWeight: '600',
    backgroundColor: '#050505',
    color: '#fcfcfc',
    border: 'none',
    borderRadius: '100px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
  },
  miniTeamSection: {
    padding: '1rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center',
  },
  teamHeader: { marginBottom: '2rem' },
  teamSubtext: { color: '#666', fontSize: '1.2rem', marginTop: '1rem' },
  teamGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '3rem',
  },
  miniTeamCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  miniAvatar: {
    width: '120px',
    height: '120px',
    backgroundColor: '#050505',
    color: '#fcfcfc',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '3rem',
    fontWeight: '800',
  },
  /* 7. RE-ENGINEERED FOOTER STYLES */
  footer: {
    backgroundColor: '#050505',
    color: '#fcfcfc',
    padding: '8rem 2rem 2rem 2rem',
    borderTopLeftRadius: '48px',
    borderTopRightRadius: '48px',
  },
  footerTopSection: {
    maxWidth: '1200px',
    margin: '0 auto 6rem auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '3rem',
    borderBottom: '1px solid #222',
    paddingBottom: '6rem',
  },
  footerCallout: {
    fontSize: 'clamp(3rem, 6vw, 5.5rem)',
    fontWeight: '800',
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
    margin: 0,
    color: '#fcfcfc',
  },
  emailPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem 2.5rem',
    backgroundColor: '#fcfcfc',
    color: '#050505',
    borderRadius: '100px',
    textDecoration: 'none', // Kills the default blue underline
    fontSize: '1.25rem',
    fontWeight: '700',
    transition: 'transform 0.3s ease',
  },
  footerGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4rem',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '4rem',
  },
  brandCol: {
    flex: '2 1 300px',
  },
  footerLogo: {
    fontSize: '2rem',
    fontWeight: '800',
    letterSpacing: '2px',
    marginBottom: '1rem',
    color: '#fcfcfc',
  },
  footerTagline: {
    color: '#888',
    fontSize: '1.1rem',
    maxWidth: '300px',
    lineHeight: '1.5',
  },
  linkCol: {
    flex: '1 1 150px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  colTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    color: '#fcfcfc',
  },
  footerLink: {
    color: '#aaa',
    textDecoration: 'none',
    transition: 'color 0.2s',
    fontSize: '0.95rem',
  },
  bottomBar: {
    textAlign: 'center',
    paddingTop: '2rem',
    color: '#555',
    fontSize: '0.9rem',
    borderTop: '1px solid #111',
  }
};

export default Home;