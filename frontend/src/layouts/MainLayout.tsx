import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ScrollToTop } from '../components/ScrollToTop';
import { useRouteMeta } from '../hooks/useRouteMeta';

export const MainLayout: React.FC = () => {
  useRouteMeta();

  return (
    <div className="min-h-screen flex flex-col bg-[#08090C] text-[#F8F9FA] selection:bg-[#CCFF00] selection:text-[#08090C]">
      <ScrollToTop />
      <Navbar />
      <main className="flex-grow pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
