'use client';

import { useEffect } from 'react';

/**
 * Locks document scroll while `locked` is true (iOS-safe via position:fixed).
 * Touchmove is only blocked outside the dialog so in-modal taps/links still work.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
    };

    const scrollbarGap = Math.max(0, window.innerWidth - html.clientWidth);

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    const preventBackgroundTouchScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      // Never block gestures inside the modal — position:fixed already holds the page.
      if (target?.closest('[role="dialog"], [data-scroll-lock-allow]')) return;
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventBackgroundTouchScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventBackgroundTouchScroll);

      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.paddingRight = prev.bodyPaddingRight;

      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
