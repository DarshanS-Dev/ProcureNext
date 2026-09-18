"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { containmentPlanSchema, ContainmentPlanFormValues } from "@/lib/forms/containmentPlan.schema";
import { ContainmentPlanAiAssistResponse } from "@/lib/api/types";
import { Sparkles } from "lucide-react";

interface ContainmentPlanFormProps {
  initialValues?: Partial<ContainmentPlanFormValues>;
  onSubmit: (data: ContainmentPlanFormValues) => Promise<void>;
  onAiAssist?: () => Promise<ContainmentPlanAiAssistResponse>;
}

export function ContainmentPlanForm({
  initialValues,
  onSubmit,
  onAiAssist,
}: ContainmentPlanFormProps) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContainmentPlanFormValues>({
    resolver: zodResolver(containmentPlanSchema),
    defaultValues: initialValues || {},
  });

  const handleAiAssist = async () => {
    if (!onAiAssist) return;
    setAiLoading(true);
    try {
      const res = await onAiAssist();
      if (res.max_scope) setValue("max_scope", res.max_scope);
      if (res.fallback_process) setValue("fallback_process", res.fallback_process);
      if (res.data_terms) setValue("data_terms", res.data_terms);
      if (res.exit_conditions) setValue("exit_conditions", res.exit_conditions);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = async (data: ContainmentPlanFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 text-xs text-slate-200">
      {onAiAssist && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>AI Draft Generation (Prefills Form State)</span>
          </div>
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={aiLoading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition"
          >
            {aiLoading ? "Generating..." : "Generate AI Draft"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Max Scope</label>
          <input
            {...register("max_scope")}
            placeholder="e.g. 5 pilot centers max"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Max Financial Exposure</label>
          <input
            {...register("max_financial_exposure")}
            placeholder="e.g. ₹10 Lakhs capped"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Fallback Process</label>
          <textarea
            {...register("fallback_process")}
            placeholder="Standard operating procedure if system fails..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 h-20"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Data Terms</label>
          <textarea
            {...register("data_terms")}
            placeholder="Data retention and security requirements..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 h-20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Exit Conditions</label>
          <input
            {...register("exit_conditions")}
            placeholder="Triggers for early pilot termination..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Support Obligations</label>
          <input
            {...register("support_obligations")}
            placeholder="Maintenance and SLA terms..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
      >
        {loading ? "Submitting Plan..." : "Submit Containment Plan"}
      </button>
    </form>
  );
}
