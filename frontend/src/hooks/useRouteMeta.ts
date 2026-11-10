import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteMeta {
  title: string;
  description: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'WeCove.in — Digital Product Studio & Software Development',
    description:
      'WeCove.in designs and builds websites, applications, SaaS platforms, and custom software for businesses ready to build something meaningful.',
  },
  '/services': {
    title: 'Services — WeCove.in | Web, SaaS, Mobile, AI & Cloud Engineering',
    description:
      'Explore WeCove.in capabilities across website development, custom web apps, mobile apps, SaaS platforms, AI solutions, and cloud engineering.',
  },
  '/work': {
    title: 'Work — WeCove.in | Portfolio Coming Soon',
    description:
      "Good things are in the works. We're building our portfolio at WeCove.in — check back soon to see what we're creating.",
  },
  '/process': {
    title: 'Process — WeCove.in | From First Conversation to Final Release',
    description:
      'Learn how WeCove.in designs, architects, builds, launches, and scales digital products across our six-stage development process.',
  },
  '/about': {
    title: 'About — WeCove.in | Founders & Engineering Team',
    description:
      'Meet the founders and engineering team behind WeCove.in and discover our software craft philosophy.',
  },
  '/contact': {
    title: 'Contact — WeCove.in | Start a Project',
    description:
      'Tell WeCove.in what you have in mind. Submit a project inquiry or connect directly via wecove.in@gmail.com and +91 8660534989.',
  },
};

const DEFAULT_META: RouteMeta = {
  title: 'Page Not Found — WeCove.in',
  description: 'The requested page could not be found on WeCove.in.',
};

export function useRouteMeta(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = ROUTE_META[pathname] || DEFAULT_META;
    document.title = meta.title;

    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) {
      descriptionTag.setAttribute('content', meta.description);
    }

    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (ogTitleTag) {
      ogTitleTag.setAttribute('content', meta.title);
    }
  }, [pathname]);
}
