import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADVISORS, DEFAULT_ADVISOR_ID, type Advisor } from './advisors';
import { baseArt } from './outfitArt';
import { recordPick } from './db';

/**
 * Who you are raising, and how the rest of the app asks.
 *
 * She used to be one constant and one image, because there was one of her: the
 * paper doll is a body, and a girl without a gym-clothes base could be shown in
 * a portrait but never dressed. As those bases get drawn the roster opens, and
 * every screen that says her name or draws her has to agree on which one — a
 * room with one girl standing in it and another speaking beside it is the bug
 * this exists to prevent.
 *
 * The choice is kept on the device rather than the account. Nothing she owns
 * depends on it — the gold, the wardrobe and the furniture belong to the
 * household, not to her — so picking a different girl changes who wears the
 * dresses, never whether they were bought.
 */

const KEY = 'refit.girl';

export type Girl = Advisor & {
  /** Her gym-clothes base, which every garment layers over. */
  base: number;
  aspect: number;
};

/** The girl by id, falling back to the first playable one for an unknown id. */
export function girlOf(id: string): Girl {
  const advisor = ADVISORS.find((a) => a.id === id && a.playable) ?? ADVISORS[0];
  const art = baseArt(advisor.id);
  return { ...advisor, base: art.source, aspect: art.aspect };
}

/** Everyone whose base has been drawn, and who can therefore be dressed. */
export function playableGirls(): Girl[] {
  return ADVISORS.filter((a) => a.playable).map((a) => girlOf(a.id));
}

type Value = { girl: Girl; choose: (id: string) => Promise<void> };

const GirlContext = createContext<Value>({
  girl: girlOf(DEFAULT_ADVISOR_ID),
  choose: async () => {},
});

export function GirlProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState(DEFAULT_ADVISOR_ID);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((stored) => {
        // A girl whose art was removed, or who was never playable, falls back
        // rather than leaving the room empty.
        if (alive && stored && ADVISORS.some((a) => a.id === stored && a.playable)) {
          setId(stored);
        }
      })
      .catch(() => {
        // The default is a real girl, so failing to read is not a failure.
      });
    return () => {
      alive = false;
    };
  }, []);

  const choose = useCallback(async (next: string) => {
    if (next === id) return;
    const previous = id;
    setId(next);
    // Kept on the account too: who was here, and from when, is what counts
    // each girl's closeness and puts each diary entry in the right hand.
    void recordPick(next, previous);
    try {
      await AsyncStorage.setItem(KEY, next);
    } catch {
      // She stays chosen for this run either way.
    }
  }, [id]);

  const value = useMemo(() => ({ girl: girlOf(id), choose }), [id, choose]);
  return <GirlContext.Provider value={value}>{children}</GirlContext.Provider>;
}

/** The girl this screen should name and draw. */
export function useGirl() {
  return useContext(GirlContext).girl;
}

/** The girl, plus the way to change her. */
export function useGirlChoice() {
  return useContext(GirlContext);
}
