import { Duration } from "effect";
import { DurationInput } from "effect/Duration";
import { useEffect, useState } from "react";

export const useCountdown = (
  forDuration: DurationInput,
  updateFrequency: DurationInput = "250 millis",
) => {
  const timeMillis = Duration.toMillis(forDuration);
  const freqMillis = Duration.toMillis(updateFrequency);

  const [completed, setCompleted] = useState(false);
  const [remainingTime, setRemainingTime] = useState(forDuration);

  useEffect(() => {
    const endTime = Date.now() + timeMillis;

    const updateRepeat = setInterval(() => {
      const now = Date.now();
      setCompleted(now >= endTime);
      setRemainingTime(Math.max(0, endTime - now));
    }, freqMillis);

    const totalTimer = setTimeout(() => {
      setCompleted(true);
      setRemainingTime(0);
      clearInterval(updateRepeat);
    }, timeMillis);

    return () => {
      clearTimeout(totalTimer);
      clearInterval(updateRepeat);
    };
  }, [freqMillis, timeMillis]);

  return { completed, remainingTime };
};
