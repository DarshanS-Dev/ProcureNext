"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export function useNotSelectedReason(applicationId: number) {
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) return;

    let isMounted = true;
    api
      .getComplianceRecords(applicationId)
      .then((records) => {
        if (!isMounted) return;
        // Search in compliance records or fallback message
        if (records && records.length > 0) {
          const latest = records[0];
          setReason(
            latest.snapshot?.not_selected_reason || "Application did not meet selection thresholds."
          );
        } else {
          setReason("Reason not explicitly recorded in audit trail.");
        }
      })
      .catch(() => {
        if (isMounted) {
          setReason("Reason not explicitly recorded in audit trail.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [applicationId]);

  return { reason, loading };
}
