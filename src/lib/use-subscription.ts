"use client";

import { useEffect, useState } from "react";

type SubscriptionState = {
  active: boolean;
  status: string | null;
  plan: string | null;
  current_period_end: string | null;
};

export function useSubscription(options?: { demo?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionState>({
    active: false,
    status: null,
    plan: null,
    current_period_end: null,
  });

  useEffect(() => {
    let active = true;

    const url = options?.demo ? "/api/subscription/me?demo=1" : "/api/subscription/me";

    fetch(url, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        setData({
          active: Boolean(payload.active),
          status: payload.status || null,
          plan: payload.plan || null,
          current_period_end: payload.current_period_end || null,
        });
      })
      .catch(() => {
        if (!active) return;
        setData({ active: false, status: null, plan: null, current_period_end: null });
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [options?.demo]);

  return {
    ...data,
    loading,
  };
}
