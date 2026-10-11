'use client';

import { motion } from 'motion/react';
import { useEffect, useRef, useState, useMemo } from 'react';

const buildKeyframes = (from, steps) => {
  const keys = new Set([...Object.keys(from), ...steps.flatMap(s => Object.keys(s))]);

  const keyframes = {};
  keys.forEach(k => {
    keyframes[k] = [from[k], ...steps.map(s => s[k])];
  });
  return keyframes;
};

const BlurText = ({
  text = '',
  delay = 200,
  className = '',
  id = undefined,
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom = undefined,
  animationTo = undefined,
  easing = t => t,
  onAnimationComplete = undefined,
  stepDuration = 0.5,
  as: Element = 'span'
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const target = ref.current;
    if (!target || target.nodeType !== 1) return;
    let disposed = false;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => { setReducedMotion(media.matches); if (media.matches) setInView(true); };
    updateMotion();
    media.addEventListener('change', updateMotion);
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return () => media.removeEventListener('change', updateMotion);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!disposed && entry.isIntersecting && entry.target === target) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(target);
    return () => { disposed = true; observer.disconnect(); media.removeEventListener('change', updateMotion); };
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === 'top' ? { filter: 'blur(10px)', opacity: 0, y: -50 } : { filter: 'blur(10px)', opacity: 0, y: 50 },
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: 'blur(5px)',
        opacity: 0.5,
        y: direction === 'top' ? 5 : -5
      },
      { filter: 'blur(0px)', opacity: 1, y: 0 }
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1)));

  return (
    <Element ref={ref} id={id} aria-label={text} className={className} style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

        const spanTransition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000
        };
        spanTransition.ease = easing;

        return (
          <motion.span
            aria-hidden="true"
            className="inline-block will-change-[transform,filter,opacity]"
            key={`${text}-${index}`}
            initial={reducedMotion ? false : fromSnapshot}
            animate={reducedMotion ? { filter: 'blur(0px)', opacity: 1, y: 0 } : inView ? animateKeyframes : undefined}
            transition={spanTransition}
            onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
          >
            {segment === ' ' ? '\u00A0' : segment}
            {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
          </motion.span>
        );
      })}
    </Element>
  );
};

export default BlurText;
