import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { advisorById, DEFAULT_ADVISOR_ID, type Advisor } from './advisors';
import { getAdvisorId } from './prefs';

/** The advisor the user picked in 설정, re-read whenever a screen comes back. */
export function useAdvisor(): Advisor {
  const [id, setId] = useState(DEFAULT_ADVISOR_ID);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getAdvisorId().then((saved) => {
        if (alive) setId(saved);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  return advisorById(id);
}
