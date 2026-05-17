"use client";

import { useState } from "react";
import type { AutopsyInput, Category } from "@/lib/types";

const CATEGORIES: Category[] = ["DeFi", "AI infra", "consumer crypto", "devtool", "agency", "other"];

const SAMPLES: Array<{ label: string; data: AutopsyInput }> = [
  {
    label: "DeFi protocol",
    data: { companyName: "Vaultline", websiteUrl: "vaultline.xyz", twitterHandle: "vaultline", category: "DeFi" },
  },
  {
    label: "AI infra startup",
    data: { companyName: "Agentframe", websiteUrl: "agentframe.ai", twitterHandle: "agentframe", category: "AI infra" },
  },
  {
    label: "Devtool",
    data: { companyName: "Mergewell", websiteUrl: "mergewell.dev", twitterHandle: "mergewell", category: "devtool" },
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
    <form onSubmit={handle} className="card p-7 md:p-10">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="label">/ Inputs</div>
        <div className="annotation">REQUIRED: COMPANY · WEBSITE · CATEGORY</div>
      </div>

      <div className="grid gap-7 md:grid-cols-2">
        <Field label="/ Company name">
          <input
            className="input"
            placeholder="Vaultline"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            maxLength={80}
            required
          />
        </Field>
        <Field label="/ Website URL">
          <input
            className="input"
            placeholder="vaultline.xyz"
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            maxLength={200}
            required
          />
        </Field>
        <Field label="/ X handle (optional)">
          <input
            className="input"
            placeholder="vaultline"
            value={twitterHandle}
            onChange={e => setTwitterHandle(e.target.value)}
            maxLength={40}
          />
        </Field>
        <Field label="/ Category">
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
        <Field label="/ Competitor URL (optional)">
          <input
            className="input"
            placeholder="optional"
            value={competitorUrl}
            onChange={e => setCompetitorUrl(e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="/ Competitor handle (optional)">
          <input
            className="input"
            placeholder="optional"
            value={competitorHandle}
            onChange={e => setCompetitorHandle(e.target.value)}
            maxLength={40}
          />
        </Field>
      </div>

      <div className="mt-9 hairline-dim" />

      <div className="mt-7 flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="annotation mr-1">SAMPLES:</span>
          {SAMPLES.map(s => (
            <button type="button" key={s.label} onClick={() => fillSample(s.data)} className="btn-ghost">
              {s.label}
            </button>
          ))}
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Running…" : "Run Autopsy →"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="label mb-3">{label}</div>
      {children}
    </label>
  );
}
