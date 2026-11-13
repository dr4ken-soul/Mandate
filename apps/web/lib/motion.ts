import type { Variants } from "motion/react";

/**
 * The one motion contract for the build.
 *
 * Every duration, easing curve and delay in the interface comes from this
 * file. FRONTEND_SPEC.md section 12 is the source of these values and the
 * implementation copies them rather than inventing new ones.
 */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** The hero entrance. */
export const blurRise: Variants = {
  initial: { opacity: 0, y: 16, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: EASE },
  },
};

/** The standard section reveal. */
export const revealChild: Variants = {
  initial: { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: EASE },
  },
};

/** A staggered container. */
export const container: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};

/** The verdict stamp. It never overshoots and it never rotates more than 0.8 degrees. */
export const stamp: Variants = {
  initial: { opacity: 0, scale: 1.06, rotate: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.18, ease: EASE },
  },
};

/**
 * Reduced motion variants. Every reveal collapses to a plain fade.
 */
export const fadeOnly: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.01, ease: "linear" } },
};
