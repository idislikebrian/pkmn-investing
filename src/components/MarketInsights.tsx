"use client";

import { useEffect, useState } from "react";
import styles from "./MarketInsights.module.css";
import type {
  MarketTrend,
  PriceAlert,
  WishlistItem,
} from "@/lib/market-insights";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* -----------------------------
   Local primitives (remaining)
-------------------------------- */

function Badge({
  variant = "default",
  children,
}: {
  variant?: "default" | "secondary" | "outline";
  children: React.ReactNode;
}) {
  const cls =
    variant === "secondary"
      ? styles.badgeSecondary
      : variant === "outline"
      ? styles.badgeOutline
      : styles.badgeDefault;

  return <span className={`${styles.badge} ${cls}`}>{children}</span>;
}

/* -----------------------------
   Component
-------------------------------- */

export function MarketInsights() {
  const [tab, setTab] = useState<"trends" | "alerts" | "wishlist">("trends");
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [t, a, w] = await Promise.all([
        fetch("/api/market/trends").then((r) => r.json()),
        fetch("/api/alerts").then((r) => r.json()),
        fetch("/api/wishlist").then((r) => r.json()),
      ]);

      setTrends(t.trends || []);
      setAlerts(a.alerts || []);
      setWishlist(w.wishlist || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.dashboard} ${styles.spaceY6}`}>
      {/* Tabs */}

      <div className={styles.tabs}>
        {(["trends", "alerts", "wishlist"] as const).map((t) => {
          const active = tab === t;

          return (
            <Button
              key={t}
              variant={active ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab(t)}
              className={styles.tabButton}
            >
              {t === "trends"
                ? "Market Trends"
                : t === "alerts"
                ? "Price Alerts"
                : "Wishlist"}
            </Button>
          );
        })}
      </div>

      {tab === "trends" && (
        <Card>
          <CardHeader>
            <CardTitle>Current Market Trends</CardTitle>
            <CardDescription>Live Pokémon card market signals</CardDescription>
          </CardHeader>
          <CardContent>{/* unchanged */} Testing</CardContent>
        </Card>
      )}

      {tab === "alerts" && (
        <div className={styles.spaceY4}>{/* unchanged */}</div>
      )}

      {tab === "wishlist" && (
        <div className={styles.spaceY4}>{/* unchanged */}</div>
      )}
    </div>
  );
}
