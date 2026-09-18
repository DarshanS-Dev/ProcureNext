"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { problemStatementSchema, ProblemStatementFormValues } from "@/lib/forms/problemStatement.schema";
import { ProblemStatementCreate } from "@/lib/api/types";
import { Sparkles } from "lucide-react";

interface ProblemStatementFormProps {
  initialValues?: Partial<ProblemStatementFormValues>;
  onSubmit: (data: ProblemStatementFormValues) => Promise<void>;
  onAiAssist?: (roughText: string) => Promise<{
    suggested_baseline_question?: string;
    suggested_measurement_method?: string;
    is_outcome_based: boolean;
    rewrite_suggestion?: string;
  }>;
  isLockedEditable?: boolean;
}

export function ProblemStatementForm({
  initialValues,
  onSubmit,
  onAiAssist,
  isLockedEditable = true,
}: ProblemStatementFormProps) {
  const [loading, setLoading] = useState(false);
  const [roughText, setRoughText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProblemStatementFormValues>({
    resolver: zodResolver(problemStatementSchema),
    defaultValues: initialValues || {
      category: "healthcare",
      budget_range: "5L_to_25L",
    },
  });

  const handleFormSubmit = async (data: ProblemStatementFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAiAssist = async () => {
    if (!roughText.trim() || !onAiAssist) return;
    setAiLoading(true);
    try {
      const res = await onAiAssist(roughText);
      if (res.rewrite_suggestion) {
        setAiSuggestion(res.rewrite_suggestion);
        setValue("description", res.rewrite_suggestion);
      }
      if (res.suggested_measurement_method) {
        setValue("measurement_method", res.suggested_measurement_method);
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 text-xs text-slate-200">
      {/* AI Assist advisory section */}
      {onAiAssist && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI Assist Drafting (Advisory Only)
          </div>
          <textarea
            value={roughText}
            onChange={(e) => setRoughText(e.target.value)}
            placeholder="Type rough notes or requirements here to generate structured baseline and measurement suggestions..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 h-20"
          />
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={aiLoading || !roughText.trim()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-xs font-medium transition"
          >
            {aiLoading ? "Generating advisory suggestions..." : "Generate AI Suggestions"}
          </button>
          {aiSuggestion && (
            <p className="text-[11px] text-indigo-300 italic bg-indigo-900/20 p-2 rounded">
              Suggested draft applied to Description and Measurement Method fields.
            </p>
          )}
        </div>
      )}

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Title *</label>
          <input
            {...register("title")}
            disabled={!isLockedEditable}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          {errors.title && <p className="text-rose-400 text-[11px]">{errors.title.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Category *</label>
          <select
            {...register("category")}
            disabled={!isLockedEditable}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="healthcare">Healthcare</option>
            <option value="sanitation">Sanitation</option>
            <option value="transport">Transport</option>
            <option value="education">Education</option>
            <option value="agriculture">Agriculture</option>
            <option value="governance">Governance</option>
            <option value="iot_hardware">IoT Hardware</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-slate-300">Description</label>
        <textarea
          {...register("description")}
          disabled={!isLockedEditable}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 h-24"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Budget Range (Fixed Dropdown)</label>
          <select
            {...register("budget_range")}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="under_5L">Under ₹5 Lakhs</option>
            <option value="5L_to_25L">₹5 Lakhs – ₹25 Lakhs</option>
            <option value="25L_to_1Cr">₹25 Lakhs – ₹1 Crore</option>
            <option value="over_1Cr">Over ₹1 Crore</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Budget Description (Free-text Narrative)</label>
          <input
            {...register("budget_description")}
            placeholder="Detailed narrative budget breakdown..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Baseline (Hard Gate for Publish)</label>
          <input
            {...register("baseline")}
            placeholder="Current status or benchmark..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Measurement Method (Hard Gate for Publish)</label>
          <input
            {...register("measurement_method")}
            placeholder="How metric will be verified..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
      >
        {loading ? "Saving Problem Statement..." : "Save Problem Statement"}
      </button>
    </form>
  );
}
