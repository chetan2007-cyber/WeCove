import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instantly scrolls to the top left of the screen
    window.scrollTo(0, 0);
  }, [pathname]); // This triggers every time the URL path changes

  return null; // This component doesn't render anything visual
};

export default ScrollToTop;