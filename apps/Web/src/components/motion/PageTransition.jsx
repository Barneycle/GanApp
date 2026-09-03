import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { fadeEnter, pageEnter } from './tokens';

const AUTH = new Set(['/login', '/registration', '/reset-password']);

export const PageTransition = ({ children }) => {
  const location = useLocation();
  const skip = location.pathname.startsWith('/admin');
  const fadeOnly = AUTH.has(location.pathname);
  const motionProps = skip ? { initial: false, animate: { opacity: 1 } } : fadeOnly ? fadeEnter : pageEnter;

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div key={location.pathname} {...motionProps}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
