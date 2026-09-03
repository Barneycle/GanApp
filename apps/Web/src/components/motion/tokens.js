export const EASE = [0.16, 1, 0.3, 1];

export const pageEnter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: EASE },
};

export const fadeEnter = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.22, ease: EASE },
};

export const overlayEnter = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: EASE },
};

export const panelEnter = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.98 },
  transition: { duration: 0.22, ease: EASE },
};

export const toastEnter = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
  transition: { duration: 0.22, ease: EASE },
};

export const cardEnter = (index = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: EASE, delay: Math.min(index, 8) * 0.04 },
});
