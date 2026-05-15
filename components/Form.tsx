"use client";

import { useState } from "react";
import type { AutopsyInput, Category } from "@/lib/types";

const CATEGORIES: Category[] = ["DeFi", "AI infra", "consumer crypto", "devtool", "agency", "other"];

const SAMPLES: Array<{ label: string; data: AutopsyInput }> = [
  {
    label: "Try: a DeFi protocol",
    data: {
      companyName: "Vaultline",
      websiteUrl: "vaultline.xyz",
      twitterHandle: "vaultline",
      category: "DeFi",
    },
  },
  {
    label: "Try: an AI infra startup",
    data: {
      companyName: "Agentframe",
      websiteUrl: "agentframe.ai",
      twitterHandle: "agentframe",
      category: "AI infra",
    },
  },
  {
    label: "Try: a devtool",
    data: {
      companyName: "Mergewell",
      websiteUrl: "mergewell.dev",
      twitterHandle: "mergewell",
      category: "devtool",
    },
  },
];

export function Form({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: AutopsyInput) => void;
  submitting: boolean;
}) {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [category, setCategory] = useState<Category>("AI infra");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorHandle, setCompetitorHandle] = useState("");

  function fillSample(s: AutopsyInput) {
    setCompanyName(s.companyName);
    setWebsiteUrl(s.websiteUrl);
    setTwitterHandle(s.twitterHandle ?? "");
    setCategory(s.category);
  }

  function handle(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!companyName || !websiteUrl) return;
    onSubmit({
      companyName: companyName.trim(),
      websiteUrl: websiteUrl.trim(),
      twitterHandle: twitterHandle.trim().replace(/^@/, "") || undefined,
      category,
      competitorUrl: competitorUrl.trim() || undefined,
      competitorHandle: competitorHandle.trim().replace(/^@/, "") || undefined,
    });
  }

  return (
    <form onSubmit={handle} className="card p-6 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Company name" hint="The brand name on the homepage">
          <input
            className="input"
            placeholder="Vaultline"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            maxLength={80}
            required
          />
        </Field>
        <Field label="Website URL" hint="We'll diagnose what the homepage says">
          <input
            className="input"
            placeholder="vaultline.xyz"
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            maxLength={200}
            required
          />
        </Field>
        <Field label="X / Twitter handle" hint="Optional — without the @">
          <input
            className="input"
            placeholder="vaultline (optional)"
            value={twitterHandle}
            onChange={e => setTwitterHandle(e.target.value)}
            maxLength={40}
          />
        </Field>
        <Field label="Category" hint="Picks the right Hivemind frameworks">
          <select
            className="select"
            value={category}
            onChange={e => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Competitor URL" hint="Optional — sharpens differentiation">
          <input
            className="input"
            placeholder="optional"
            value={competitorUrl}
            onChange={e => setCompetitorUrl(e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Competitor handle" hint="Optional">
          <input
            className="input"
            placeholder="optional"
            value={competitorHandle}
            onChange={e => setCompetitorHandle(e.target.value)}
            maxLength={40}
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map(s => (
            <button
              type="button"
              key={s.label}
              onClick={() => fillSample(s.data)}
              className="btn-ghost text-xs"
            >
              {s.label}
            </button>
          ))}
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Running…" : "Run GTM Autopsy →"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="label">{label}</span>
        {hint ? <span className="text-[11px] text-white/35">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}
