// VERCEL WAKE UP
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import Interns from './pages/interns';
import About from './pages/about';
import Contact from './pages/contact';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop'; // <--- IMPORT IT HERE

const App = () => {
  return (
    <Router>
      <ScrollToTop /> {/* <--- ADD IT RIGHT HERE */}
      <div style={styles.appContainer}>
        <Navbar />
        
        <main style={styles.mainContent}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/interns" element={<Interns />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const styles = {
  appContainer: {
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    backgroundColor: '#fcfcfc',
    color: '#050505',
    minHeight: '100vh',
  },
  mainContent: {
    paddingTop: '80px', 
  }
};

export default App;