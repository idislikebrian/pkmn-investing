"use client";

import { useEffect, useState } from "react";
import styles from "./GradingDashboard.module.css";
import type { GradingRecommendation } from "@/lib/grading-ai";

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
  className = "",
  children,
}: {
  variant?: "default" | "secondary" | "outline";
  className?: string;
  children: React.ReactNode;
}) {
  const variantClass =
    variant === "secondary"
      ? styles.badgeSecondary
      : variant === "outline"
      ? styles.badgeOutline
      : styles.badgeDefault;

  return (
    <span className={`${styles.badge} ${variantClass} ${className}`}>
      {children}
    </span>
  );
}

/* -----------------------------
   Dashboard
-------------------------------- */

export function GradingDashboard() {
  const [recommendations, setRecommendations] = useState<
    GradingRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [minRoi, setMinRoi] = useState(20);

  useEffect(() => {
    fetchRecommendations();
  }, [minRoi]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/grading/recommendations?minRoi=${minRoi}`);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } finally {
      setLoading(false);
    }
  };

  const totalPotentialValue = recommendations.reduce(
    (sum, r) => sum + (r.potentialValue - r.currentValue),
    0
  );

  const avgRoi =
    recommendations.length === 0
      ? 0
      : recommendations.reduce((sum, r) => sum + r.roi, 0) /
        recommendations.length;

  return (
    <div className={`${styles.dashboard} ${styles.spaceY6}`}>
      {/* Stats */}
      <div className={`${styles.grid} ${styles.gap4} ${styles.mdGridCols3}`}>
        <Card>
          <CardHeader className={styles.rowBetween}>
            <CardTitle className={styles.textSm}>Top Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.statValue}>{recommendations.length}</div>
            <p className={styles.muted}>Cards worth grading</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={styles.rowBetween}>
            <CardTitle className={styles.textSm}>Potential Gain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.statValue}>
              ${totalPotentialValue.toFixed(2)}
            </div>
            <p className={styles.muted}>Estimated value increase</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={styles.rowBetween}>
            <CardTitle className={styles.textSm}>Average ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.statValue}>{avgRoi.toFixed(1)}%</div>
            <p className={styles.muted}>Return on investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Recommendations</CardTitle>
          <CardDescription>Adjust minimum ROI threshold</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`${styles.row} ${styles.gap4}`}>
            {[10, 20, 30, 50].map((value) => {
              const active = minRoi === value;
              return (
                <Button
                  size="sm"
                  variant={active ? "primary" : "outline"}
                  onClick={() => setMinRoi(value)}
                >
                  {value}%
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className={styles.spaceY4}>
        {loading ? (
          <Card>
            <CardContent className={`${styles.centered} ${styles.p8}`}>
              <p className={styles.muted}>Loading recommendations…</p>
            </CardContent>
          </Card>
        ) : (
          recommendations.map((rec) => (
            <Card key={rec.cardId} className={styles.hoverCard}>
              <CardHeader>
                <div className={styles.rowBetween}>
                  <div>
                    <CardTitle className={styles.textXl}>
                      {rec.cardName}
                    </CardTitle>
                    <CardDescription>
                      Current condition: {rec.currentCondition}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      rec.roi > 50
                        ? "default"
                        : rec.roi > 30
                        ? "secondary"
                        : "outline"
                    }
                    className={styles.badgeLg}
                  >
                    {rec.roi.toFixed(0)}% ROI
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>{/* unchanged content */} testing </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
