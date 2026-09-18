"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { capabilityProfileSchema, CapabilityProfileFormValues } from "@/lib/forms/capabilityProfile.schema";
import { ArchitectureTag } from "@/lib/api/enums";
import { Info } from "lucide-react";

interface CapabilityProfileFormProps {
  initialValues?: Partial<CapabilityProfileFormValues>;
  onSubmit: (data: CapabilityProfileFormValues) => Promise<void>;
}

export function CapabilityProfileForm({ initialValues, onSubmit }: CapabilityProfileFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CapabilityProfileFormValues>({
    resolver: zodResolver(capabilityProfileSchema),
    defaultValues: initialValues || {
      trl_stage: 5,
      architecture: ["cloud"],
      funding_band: "seed",
    },
  });

  const selectedArchitecture = watch("architecture") || [];
  const currentTrl = watch("trl_stage") || 5;

  const toggleArchitecture = (tag: ArchitectureTag) => {
    if (selectedArchitecture.includes(tag)) {
      setValue(
        "architecture",
        selectedArchitecture.filter((t) => t !== tag)
      );
    } else {
      setValue("architecture", [...selectedArchitecture, tag]);
    }
  };

  const handleFormSubmit = async (data: CapabilityProfileFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 text-xs text-slate-200">
      {/* TRL Stage Slider */}
      <div className="space-y-2 bg-slate-950 p-4 border border-slate-800 rounded-xl">
        <div className="flex justify-between items-center">
          <label className="font-semibold text-slate-200">TRL Stage (1 – 9)</label>
          <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 rounded">
            Stage {currentTrl}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="9"
          value={currentTrl}
          onChange={(e) => setValue("trl_stage", parseInt(e.target.value, 10))}
          className="w-full accent-indigo-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>TRL 1: Basic Principles</span>
          <span>TRL 5: Technology Validated</span>
          <span>TRL 9: Proven System</span>
        </div>
      </div>

      {/* Architecture Fixed Checkboxes */}
      <div className="space-y-2 bg-slate-950 p-4 border border-slate-800 rounded-xl">
        <label className="font-semibold text-slate-200">Architecture Tags</label>
        <p className="text-[11px] text-slate-400">Select all architectural patterns that apply to your system:</p>
        <div className="flex flex-wrap gap-2 pt-2">
          {(["cloud", "microservices", "on_premise", "monolith", "api_first"] as ArchitectureTag[]).map((tag) => {
            const active = selectedArchitecture.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleArchitecture(tag)}
                className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                {tag.replace("_", " ").toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Funding Band Dropdown */}
      <div className="space-y-2 bg-slate-950 p-4 border border-slate-800 rounded-xl">
        <label className="font-semibold text-slate-200">Funding Band</label>
        <select
          {...register("funding_band")}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="bootstrapped">Bootstrapped</option>
          <option value="pre_seed">Pre-Seed</option>
          <option value="seed">Seed</option>
          <option value="series_a">Series A</option>
          <option value="series_b_plus">Series B+</option>
        </select>
        <div className="flex items-start gap-1.5 text-[11px] text-amber-400/90 pt-1">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Note: Funding Band feeds into Financial Risk profile calculations ONLY. It has zero impact on eligibility or evaluation scoring.
          </span>
        </div>
      </div>

      {/* Team Headcount & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Team Headcount</label>
          <input
            type="number"
            {...register("team_headcount", { valueAsNumber: true })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-300">Solution Description (Feeds Semantic Match)</label>
          <input
            {...register("description")}
            placeholder="Key capabilities and technology focus..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
      >
        {loading ? "Updating Profile..." : "Save Capability Profile"}
      </button>
    </form>
  );
}
