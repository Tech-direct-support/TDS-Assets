"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanSearch } from "lucide-react";
import { runAlertScan } from "@/lib/actions/alerts";
import { Button } from "@/components/ui/Button";

export function RunScanButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-[12px] text-ink-soft">{message}</span>}
      <Button
        variant="outline"
        disabled={running}
        onClick={async () => {
          setRunning(true);
          setMessage(null);
          const res = await runAlertScan();
          setRunning(false);
          if (res.error) {
            setMessage(res.error);
            return;
          }
          setMessage(`${res.data?.created ?? 0} new alert(s) raised.`);
          router.refresh();
        }}
      >
        <ScanSearch size={14} /> {running ? "Scanning..." : "Run Alert Scan"}
      </Button>
    </div>
  );
}
