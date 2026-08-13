import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Contact = () => {
  // 1. FORM STATE
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'project',
    message: ''
  });

  const [status, setStatus] = useState('Transmit Message');

  // 2. SUBMIT HANDLER
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Transmitting...');

    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setStatus('Message Transmitted.');
        // Clear form after success
        setFormData({ name: '', email: '', subject: 'project', message: '' });
      } else {
        setStatus('Transmission Failed.');
      }
    } catch (error) {
      console.error(error);
      setStatus('Server Offline.');
    }
  };

  // 3. ANIMATION VARIANTS (These were missing!)
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div style={styles.container}>
      
      {/* KINETIC HERO SECTION */}
      <section style={styles.heroSection}>
        <motion.div 
          style={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span style={styles.microTag}>COMMUNICATIONS</span>
          <h1 style={styles.massiveHeading}>
            Initiate <span style={styles.italicAccent}>Contact.</span>
          </h1>
          <p style={styles.heroSubtext}>
            Whether you are looking to architect a new platform, automate your ecosystem, or join the incubator, the conversation starts here.
          </p>
        </motion.div>
      </section>

      {/* SPLIT LAYOUT: INFO & FORM */}
      <section style={styles.contactSection}>
        <motion.div 
          style={styles.splitGrid}
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          
          {/* LEFT COLUMN: DIRECTORY & HQ */}
          <motion.div variants={itemVariants} style={styles.infoColumn}>
            <div style={styles.infoBlock}>
              <h3 style={styles.infoLabel}>General Inquiries</h3>
              <p style={styles.infoText}>hello@wecove.com</p>
            </div>
            
            <div style={styles.infoBlock}>
              <h3 style={styles.infoLabel}>Enterprise Partnerships</h3>
              <p style={styles.infoText}>partners@wecove.com</p>
            </div>

            <div style={styles.infoBlock}>
              <h3 style={styles.infoLabel}>Headquarters</h3>
              <p style={styles.infoText}>
                Mysuru, Karnataka<br/>
                India
              </p>
            </div>

            <div style={styles.infoBlock}>
              <h3 style={styles.infoLabel}>Working Hours</h3>
              <p style={styles.infoText}>Monday - Friday<br/>09:00 - 18:00 (IST)</p>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: THE WIRED FORM */}
          <motion.div variants={itemVariants} style={styles.formColumn}>
            <form style={styles.form} onSubmit={handleSubmit}>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <motion.input 
                  type="text" 
                  placeholder="John Doe" 
                  style={styles.input}
                  whileFocus={styles.inputFocus}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Work Email</label>
                <motion.input 
                  type="email" 
                  placeholder="john@company.com" 
                  style={styles.input}
                  whileFocus={styles.inputFocus}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Subject</label>
                <motion.select 
                  style={styles.input} 
                  whileFocus={styles.inputFocus}
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                >
                  <option value="project">New Project Inquiry</option>
                  <option value="internship">Incubator / Internship</option>
                  <option value="support">Technical Support</option>
                  <option value="other">Other</option>
                </motion.select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Project Details</label>
                <motion.textarea 
                  placeholder="Tell us about the architecture you need..." 
                  style={styles.textarea}
                  rows={6}
                  whileFocus={styles.inputFocus}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  required
                />
              </div>

              <motion.button 
                type="submit" 
                style={styles.submitButton}
                whileHover={{ scale: 1.02, backgroundColor: '#222' }}
                whileTap={{ scale: 0.98 }}
              >
                {status}
              </motion.button>

            </form>
          </motion.div>

        </motion.div>
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
    minHeight: '100vh',
  },
  
  heroSection: {
    padding: '12rem 2rem 4rem 2rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  heroContent: {
    maxWidth: '900px',
  },
  microTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.2em',
    color: '#888',
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
    color: '#666',
  },
  heroSubtext: {
    fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
    color: '#555',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
    fontWeight: '400',
  },

  contactSection: {
    padding: '4rem 2rem 12rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  splitGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr', 
    gap: '6rem',
  },

  infoColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3rem',
    paddingTop: '2rem',
  },
  infoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  infoLabel: {
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#888',
    fontWeight: '700',
  },
  infoText: {
    fontSize: '1.25rem',
    color: '#050505',
    lineHeight: '1.5',
    fontWeight: '500',
  },

  formColumn: {
    backgroundColor: '#ffffff',
    padding: '4rem',
    borderRadius: '24px',
    border: '1px solid #eaeaea',
    boxShadow: '0 20px 40px rgba(0,0,0,0.02)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#050505',
  },
  input: {
    width: '100%',
    padding: '1.25rem',
    backgroundColor: '#f9f9f9',
    border: '1px solid #eaeaea',
    borderRadius: '12px',
    color: '#050505',
    fontSize: '1.1rem',
    outline: 'none',
    transition: 'border-color 0.3s ease, background-color 0.3s ease',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '1.25rem',
    backgroundColor: '#f9f9f9',
    border: '1px solid #eaeaea',
    borderRadius: '12px',
    color: '#050505',
    fontSize: '1.1rem',
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.3s ease, background-color 0.3s ease',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: '#050505',
    backgroundColor: '#ffffff',
  },
  submitButton: {
    padding: '1.25rem 2rem',
    backgroundColor: '#050505',
    color: '#fcfcfc',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '1rem',
    width: '100%',
  }
};

export default Contact;