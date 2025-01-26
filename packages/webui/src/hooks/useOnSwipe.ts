import { Struct } from "effect";
import { LazyArg } from "effect/Function";
import { useCallback, useRef, useState } from "react";

export type SwipeCallback = (direction: Direction) => unknown;

type Handle = Readonly<{
  e: HTMLElement;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: LazyArg<void>;
}>;

type Direction = "up" | "down" | "left" | "right";
export const useOnSwipe = (cb: SwipeCallback, minSwipeDistance = 50) => {
  const [touchStart, setTouchStart] =
    useState<Pick<Touch, "clientX" | "clientY">>();
  const [touchEnd, setTouchEnd] =
    useState<Pick<Touch, "clientX" | "clientY">>();

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(undefined); // otherwise the swipe is fired even with usual touch events
    setTouchStart(Struct.pick(e.targetTouches[0], "clientX", "clientY"));
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) =>
      setTouchEnd(Struct.pick(e.targetTouches[0], "clientX", "clientY")),
    [],
  );

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const hDistance = touchStart.clientX - touchEnd.clientX;
    const isLeftSwipe = hDistance > minSwipeDistance;
    const isRightSwipe = hDistance < -minSwipeDistance;
    const vDistance = touchStart.clientY - touchEnd.clientY;
    const isUpSwipe = vDistance > minSwipeDistance;
    const isDownSwipe = vDistance < -minSwipeDistance;

    if ((isLeftSwipe || isRightSwipe) && (isUpSwipe || isDownSwipe)) {
      // we got both so just ignore
    } else if (isLeftSwipe) cb("left");
    else if (isRightSwipe) cb("right");
    else if (isUpSwipe) cb("up");
    else if (isDownSwipe) cb("down");
  }, [cb, minSwipeDistance, touchEnd, touchStart]);

  const prevNode = useRef<Handle>(undefined);
  return useCallback(
    (node: HTMLElement | null) => {
      if (node) {
        if (prevNode.current) {
          const { e, onTouchMove, onTouchEnd, onTouchStart } = prevNode.current;
          e.removeEventListener("touchstart", onTouchStart);
          e.removeEventListener("touchmove", onTouchMove);
          e.removeEventListener("touchend", onTouchEnd);
        }
        node.addEventListener("touchstart", onTouchStart);
        node.addEventListener("touchmove", onTouchMove);
        node.addEventListener("touchend", onTouchEnd);
        prevNode.current = { e: node, onTouchEnd, onTouchStart, onTouchMove };
      }
    },
    [onTouchEnd, onTouchMove, onTouchStart],
  );
};
