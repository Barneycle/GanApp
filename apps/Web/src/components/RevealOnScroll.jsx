import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { EASE } from "./motion/tokens";

export const RevealOnScroll = ({ children, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -48px 0px", amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};
