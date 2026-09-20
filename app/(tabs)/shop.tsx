import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScreenState } from "@/components/ScreenState";
import { ShopShelves, type Spend } from "@/components/ShopShelves";
import { explain } from '@/lib/dbError';
import { notify } from "@/lib/confirm";
import { getLedger, type Ledger } from "@/lib/db";
import { thanksFor } from "@/lib/economy";
import { courseTrip } from "@/lib/lessons";
import { scheduleLessonTrip } from "@/lib/notify";
import { useGirl } from '@/lib/girl';

/**
 * The shop screen: reads the ledger and carries out purchases. What it looks
 * like lives in ShopShelves, so the drawing can be checked on the development
 * bench without an account.
 */
export default function ShopScreen() {
  const girl = useGirl();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getLedger()
      .then(setLedger)
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  /** One path for every kind of purchase, so the busy state cannot be forgotten. */
  const spend: Spend = async (id, label, price, kind, run) => {
    if (busy) return;
    setBusy(id);
    try {
      const next = await run();
      setLedger(next);
      notify(
        price ? `${label} · −${price.toLocaleString()} G` : label,
        thanksFor(kind, id),
      );
      // A course is days of going every morning: she says goodbye on the first
      // and tells you how it went on the last. Booking that must not look like
      // a failed purchase, so it is deliberately kept out of the catch above.
      if (kind === "lesson" && next.lesson) {
        void scheduleLessonTrip(
          girl.name,
          label,
          courseTrip(next.lesson),
        ).catch(() => {});
      }
    } catch (e: any) {
      notify("사지 못했어요", explain(e));
    } finally {
      setBusy(null);
    }
  };

  if (!ledger) return <ScreenState error={error} onRetry={load} />;

  return <ShopShelves ledger={ledger} busy={busy} onSpend={spend} />;
}
