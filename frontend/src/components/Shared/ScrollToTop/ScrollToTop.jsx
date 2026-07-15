import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    if (navigationType === 'POP') return;

    window.scrollTo(0, 0);

    const dashContainer = document.querySelector('.dashboard-content-wrapper');
    if (dashContainer) {
      dashContainer.scrollTop = 0;
    }
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
