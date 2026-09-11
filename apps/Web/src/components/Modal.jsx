import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { overlayEnter, panelEnter } from './motion/tokens';

let bodyLockCount = 0;

const lockBody = () => {
  bodyLockCount += 1;
  document.body.style.overflow = 'hidden';
};

const unlockBody = () => {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    document.body.style.overflow = '';
  }
};

/**
 * Viewport overlay that always portals to document.body so it is not
 * trapped inside page-transition transforms or overflow clipping.
 */
export const Modal = ({
  isOpen = true,
  onClose,
  children,
  zIndex = 10000,
  closeOnBackdrop = true,
  labelledBy,
  role = 'dialog',
  overlayClassName,
  panelClassName,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    lockBody();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      unlockBody();
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          role="presentation"
          className={`fixed inset-0 flex items-center justify-center ${overlayClassName || 'bg-black/50 p-4'}`}
          style={{ zIndex, isolation: 'isolate' }}
          onClick={(event) => {
            if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
          }}
          {...overlayEnter}
        >
          <motion.div
            role={role}
            aria-modal="true"
            aria-labelledby={labelledBy}
            className={panelClassName || 'bg-white'}
            onClick={(event) => event.stopPropagation()}
            {...panelEnter}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};
