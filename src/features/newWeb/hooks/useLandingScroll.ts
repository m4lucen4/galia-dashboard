import { useEffect } from "react";

export const useLandingScroll = () => {
  useEffect(() => {
    const root = document.documentElement;
    const classes = ["motion-safe:scroll-smooth", "motion-reduce:scroll-auto"];
    const addedClasses = classes.filter((className) => !root.classList.contains(className));

    root.classList.add(...addedClasses);

    return () => {
      root.classList.remove(...addedClasses);
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);
};
