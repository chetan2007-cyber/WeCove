import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ScrollToTop } from '../components/ScrollToTop';
import { useRouteMeta } from '../hooks/useRouteMeta';

export const MainLayout: React.FC = () => {
  useRouteMeta();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1F1D1B] selection:bg-[#E6E0F0] selection:text-[#6F4E37] font-sans">
      <ScrollToTop />
      <Navbar />
      <main className="flex-grow pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
