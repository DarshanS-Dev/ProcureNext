"use client";

import React from "react";
import { AuditLogRead } from "@/lib/api/types";
import { Clock, User, FileText } from "lucide-react";

export function AuditTrailPanel({ logs }: { logs: AuditLogRead[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
        No audit log history recorded for this entity.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <Clock className="w-4 h-4 text-indigo-400" />
        Audit Log History
      </h3>
      <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto pr-1">
        {logs.map((log) => (
          <div key={log.id} className="py-3 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-indigo-300">{log.action}</span>
              <span className="text-slate-500">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                Actor: {log.actor_id ? `ID #${log.actor_id}` : "System"}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-500" />
                {log.entity_type} #{log.entity_id}
              </span>
            </div>
            {log.log_metadata && Object.keys(log.log_metadata).length > 0 && (
              <pre className="mt-1 bg-slate-950/80 p-2 rounded text-[11px] font-mono text-slate-400 overflow-x-auto">
                {JSON.stringify(log.log_metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
