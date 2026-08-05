"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type LiquidNavItem<Page extends string> = {
  page: Page;
  href: string;
  label: string;
  icon: ReactNode;
};

type LiquidMobileNavProps<Page extends string> = {
  activePage: Page;
  ariaLabel: string;
  items: LiquidNavItem<Page>[];
  onNavigate: (page: Page) => void;
};

type MotionState = {
  position: number;
  velocity: number;
};

const HORIZONTAL_INSET = 8;
const SURFACE_TOP = 22;
const SURFACE_BOTTOM = 88;
const PIN_TIP_Y = 56;
const PIN_SURFACE_GAP = 5;
const CAVITY_HALF_WIDTH = 35;
const CORNER_RADIUS = 20;
const MIN_TOP_CORNER_RADIUS = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const round = (value: number) => Math.round(value * 10) / 10;

const createSurfacePath = (
  width: number,
  position: number,
) => {
  const cavityX = clamp(position, 0, width);
  const halfWidth = Math.max(
    0,
    Math.min(
      CAVITY_HALF_WIDTH,
      cavityX - MIN_TOP_CORNER_RADIUS,
      width - cavityX - MIN_TOP_CORNER_RADIUS,
    ),
  );
  const leftRoot = cavityX - halfWidth;
  const rightRoot = cavityX + halfWidth;
  const leftCorner = clamp(
    leftRoot,
    MIN_TOP_CORNER_RADIUS,
    CORNER_RADIUS,
  );
  const rightCorner = clamp(
    width - rightRoot,
    MIN_TOP_CORNER_RADIUS,
    CORNER_RADIUS,
  );
  const outerShoulder = Math.max(halfWidth - 5, 0);
  const innerShoulder = Math.min(14, halfWidth * 0.45);
  const cavityTipY = PIN_TIP_Y + PIN_SURFACE_GAP;

  return [
    `M 0 ${SURFACE_TOP + leftCorner}`,
    `Q 0 ${SURFACE_TOP} ${round(leftCorner)} ${SURFACE_TOP}`,
    `H ${round(leftRoot)}`,
    `C ${round(leftRoot + 4)} ${SURFACE_TOP} ${round(cavityX - outerShoulder)} ${SURFACE_TOP + 3} ${round(cavityX - outerShoulder)} ${SURFACE_TOP + 7}`,
    `C ${round(cavityX - outerShoulder + 1)} ${SURFACE_TOP + 20} ${round(cavityX - innerShoulder)} ${cavityTipY - 5} ${round(cavityX)} ${cavityTipY}`,
    `C ${round(cavityX + innerShoulder)} ${cavityTipY - 5} ${round(cavityX + outerShoulder - 1)} ${SURFACE_TOP + 20} ${round(cavityX + outerShoulder)} ${SURFACE_TOP + 7}`,
    `C ${round(cavityX + outerShoulder)} ${SURFACE_TOP + 3} ${round(rightRoot - 4)} ${SURFACE_TOP} ${round(rightRoot)} ${SURFACE_TOP}`,
    `H ${round(width - rightCorner)}`,
    `Q ${round(width)} ${SURFACE_TOP} ${round(width)} ${round(SURFACE_TOP + rightCorner)}`,
    `V ${SURFACE_BOTTOM - CORNER_RADIUS}`,
    `Q ${round(width)} ${SURFACE_BOTTOM} ${round(width - CORNER_RADIUS)} ${SURFACE_BOTTOM}`,
    `H ${CORNER_RADIUS}`,
    `Q 0 ${SURFACE_BOTTOM} 0 ${SURFACE_BOTTOM - CORNER_RADIUS}`,
    "Z",
  ].join(" ");
};

export default function LiquidMobileNav<Page extends string>({
  activePage,
  ariaLabel,
  items,
  onNavigate,
}: LiquidMobileNavProps<Page>) {
  const navRef = useRef<HTMLElement | null>(null);
  const beadRef = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const positionRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const initializedRef = useRef(false);
  const lastPointerRef = useRef({ position: 0, time: 0 });
  const [navWidth, setNavWidth] = useState(0);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [motion, setMotion] = useState<MotionState>({ position: 0, velocity: 0 });

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.page === activePage),
  );
  const usableWidth = Math.max(0, navWidth - HORIZONTAL_INSET * 2);
  const itemWidth = items.length ? usableWidth / items.length : 0;
  const restingPosition = HORIZONTAL_INSET + itemWidth * (activeIndex + 0.5);
  const targetPosition = dragPosition ?? restingPosition;
  const displayPosition = motion.position || targetPosition;
  const previewIndex = itemWidth
    ? clamp(
        Math.round((targetPosition - HORIZONTAL_INSET) / itemWidth - 0.5),
        0,
        items.length - 1,
      )
    : activeIndex;
  const surfacePath = createSurfacePath(
    navWidth,
    displayPosition,
  );

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateWidth = () => setNavWidth(nav.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!navWidth || !items.length) return;

    targetRef.current = targetPosition;
    draggingRef.current = dragging;

    if (!initializedRef.current || reduceMotion) {
      initializedRef.current = true;
      positionRef.current = targetPosition;
      velocityRef.current = 0;
      setMotion({ position: targetPosition, velocity: 0 });
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    if (dragging) return;

    if (frameRef.current !== null) return;

    let previousTime = performance.now();
    const animate = (time: number) => {
      const elapsed = Math.min((time - previousTime) / 1000, 0.032);
      previousTime = time;
      const stiffness = 560;
      const damping = 32;
      const distance = targetRef.current - positionRef.current;
      const acceleration = distance * stiffness;
      const nextVelocity =
        (velocityRef.current + acceleration * elapsed) *
        Math.exp(-damping * elapsed);
      const nextPosition = positionRef.current + nextVelocity * elapsed;

      velocityRef.current = nextVelocity;
      positionRef.current = nextPosition;
      setMotion({ position: nextPosition, velocity: nextVelocity });

      if (Math.abs(distance) < 0.08 && Math.abs(nextVelocity) < 0.08) {
        positionRef.current = targetRef.current;
        velocityRef.current = 0;
        setMotion({ position: targetRef.current, velocity: 0 });
        frameRef.current = null;
        return;
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
  }, [dragging, items.length, navWidth, reduceMotion, targetPosition]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const positionFromPointer = (clientX: number) => {
    const nav = navRef.current;
    if (!nav || !items.length) return 0;
    const rect = nav.getBoundingClientRect();
    const segment = (rect.width - HORIZONTAL_INSET * 2) / items.length;
    return clamp(
      clientX - rect.left,
      HORIZONTAL_INSET + segment / 2,
      rect.width - HORIZONTAL_INSET - segment / 2,
    );
  };

  const startDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!navWidth) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const position = positionFromPointer(event.clientX);
    draggingRef.current = true;
    lastPointerRef.current = { position, time: performance.now() };
    positionRef.current = position;
    velocityRef.current = 0;
    setMotion({ position, velocity: 0 });
    setDragging(true);
    setDragPosition(position);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!draggingRef.current) return;
    const position = positionFromPointer(event.clientX);
    const now = performance.now();
    const elapsed = Math.max((now - lastPointerRef.current.time) / 1000, 0.008);
    const velocity = clamp(
      (position - lastPointerRef.current.position) / elapsed,
      -1200,
      1200,
    );
    lastPointerRef.current = { position, time: now };
    positionRef.current = position;
    velocityRef.current = velocity;
    setMotion({ position, velocity });
    setDragPosition(position);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!draggingRef.current || !itemWidth) return;
    const position = positionFromPointer(event.clientX);
    const pointerIdleTime = performance.now() - lastPointerRef.current.time;
    positionRef.current = position;
    if (pointerIdleTime > 80) velocityRef.current *= 0.2;
    setMotion({ position, velocity: velocityRef.current });
    const nextIndex = clamp(
      Math.round((position - HORIZONTAL_INSET) / itemWidth - 0.5),
      0,
      items.length - 1,
    );
    if (beadRef.current?.hasPointerCapture(event.pointerId)) {
      beadRef.current.releasePointerCapture(event.pointerId);
    }
    draggingRef.current = false;
    setDragging(false);
    setDragPosition(null);
    if (items[nextIndex].page !== activePage) {
      onNavigate(items[nextIndex].page);
    }
  };

  const cancelDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (beadRef.current?.hasPointerCapture(event.pointerId)) {
      beadRef.current.releasePointerCapture(event.pointerId);
    }
    draggingRef.current = false;
    setDragging(false);
    setDragPosition(null);
  };

  const beadStyle = {
    left: displayPosition,
    "--liquid-tilt": `${clamp(motion.velocity / 220, -4.5, 4.5)}deg`,
  } as CSSProperties;

  return (
    <nav
      className={`liquid-mobile-nav${dragging ? " is-dragging" : ""}${navWidth ? " is-ready" : ""}`}
      aria-label={ariaLabel}
      ref={navRef}
    >
      <svg
        className="liquid-nav-surface"
        aria-hidden="true"
        viewBox={`0 0 ${Math.max(navWidth, 1)} 88`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="liquid-nav-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#123d35" />
            <stop offset="0.6" stopColor="#0b2e28" />
            <stop offset="1" stopColor="#082620" />
          </linearGradient>
        </defs>
        <path className="liquid-nav-body" d={surfacePath} />
        <path className="liquid-nav-edge" d={surfacePath} />
      </svg>
      <span
        className="liquid-nav-bead"
        aria-hidden="true"
        ref={beadRef}
        style={beadStyle}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
      >
        <svg className="liquid-nav-pin" viewBox="0 0 52 60" aria-hidden="true">
          <path d="M26 1.5C12.5 1.5 1.5 12.4 1.5 25.9c0 14.4 14.9 22.9 24.5 30.1 9.6-7.2 24.5-15.7 24.5-30.1C50.5 12.4 39.5 1.5 26 1.5Z" />
        </svg>
        <span className="liquid-nav-pin-icon" key={items[previewIndex]?.page}>
          {items[previewIndex]?.icon}
        </span>
      </span>
      <span className="liquid-nav-links">
        {items.map((item, index) => {
          const current = item.page === activePage;
          const visuallyActive = index === previewIndex;
          return (
            <Link
              key={item.page}
              className={visuallyActive ? "active" : ""}
              data-page={item.page}
              href={item.href}
              aria-current={current ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.page);
              }}
            >
              <span className="liquid-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="liquid-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </span>
    </nav>
  );
}
