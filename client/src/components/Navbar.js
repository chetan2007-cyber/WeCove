import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        <Link to="/" style={styles.logoLink}>WECOVE</Link>
      </div>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Home</Link>
        <Link to="/about" style={styles.link}>About Us</Link>
        <Link to="/interns" style={styles.link}>Interns</Link>
        <Link to="/contact" style={styles.button}>Contact Us</Link>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 3rem',
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    position: 'fixed',
    top: 0,
    width: '100%',
    zIndex: 1000,
    boxSizing: 'border-box',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: '800',
    letterSpacing: '2px',
  },
  logoLink: {
    color: '#ffffff',
    textDecoration: 'none',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  link: {
    color: '#d4d4d8',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'color 0.2s ease',
  },
  button: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#ffffff',
    color: '#0a0a0a',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'transform 0.2s ease',
  }
};

export default Navbar;