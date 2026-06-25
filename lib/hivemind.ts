import type {
  AutopsyInput,
  AutopsyReport,
  FrameworkChunk,
  HivemindTraceStep,
  Persona,
  ScoreCard,
  TeaserResult,
} from "./types";
import { buildMockReport, mockFrameworks } from "./mocks";
import { normalizeDomain, companyNameFromDomain } from "./domain";

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, "") ||
  "https://hivemind.myosin.xyz";

export function hasHivemindCredentials(): boolean {
  return Boolean(process.env.HIVEMIND_API_KEY);
}

async function hivemindFetch<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const apiKey = process.env.HIVEMIND_API_KEY;
  if (!apiKey) throw new Error("HIVEMIND_API_KEY missing");
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hivemind ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface KnowledgeSearchResult {
  chunks: {
    title: string;
    author?: string;
    content?: string;
    doc_type?: string;
    score: number;
  }[];
  total_results: number;
}

export async function knowledgeSearch(
  query: string,
  opts: { personaId?: Persona; maxResults?: number; relevanceThreshold?: number } = {},
): Promise<KnowledgeSearchResult> {
  if (!hasHivemindCredentials()) {
    return { chunks: [], total_results: 0 };
  }
  try {
    const res = await hivemindFetch<{ success: boolean; data: KnowledgeSearchResult }>(
      "/api/knowledge/search",
      {
        query,
        personaId: opts.personaId,
        relevanceThreshold: opts.relevanceThreshold ?? 0.5,
        maxResults: opts.maxResults ?? 8,
        metadataBoosting: true,
        reRanking: true,
      },
    );
    return res.data;
  } catch {
    return { chunks: [], total_results: 0 };
  }
}

export async function chat(
  text: string,
  persona: Persona,
): Promise<{ response: string; sources?: { title: string; author?: string }[] }> {
  const res = await hivemindFetch<{
    status: string;
    data: { response: string; sources?: { title: string; author?: string }[] };
  }>("/api/v1/chat", { text, persona, stream: false });
  return { response: res.data.response, sources: res.data.sources };
}

function safeJsonParse<T>(text: string): T | null {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
    const candidate = match ? match[1] : text;
    return JSON.parse(candidate) as T;
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function gtmArchitectPrompt(input: AutopsyInput, frameworks: FrameworkChunk[]) {
  return [
    `You are the GTM Architect. Diagnose ${input.companyName} (${input.websiteUrl}${input.twitterHandle ? `, @${input.twitterHandle.replace(/^@/, "")}` : ""}, category: ${input.category}).`,
    `Reference frameworks: ${frameworks.map(f => f.title).join(", ")}.`,
    `Return STRICT JSON with shape:`,
    `{`,
    `  "verdict": "one sentence brutal verdict",`,
    `  "scorecard": { "narrativeClarity": 0-100, "icpSharpness": 0-100, "proofCredibility": 0-100, "categoryDifferentiation": 0-100, "distributionLeverage": 0-100 },`,
    `  "whatsBroken": ["bullet", "bullet", "bullet", "bullet", "bullet"],`,
    `  "fixesPrioritized": [{"title": "...", "detail": "...", "impact": "high|medium|low"}, ...3 items]`,
    `}`,
    `Be specific, not generic. No throat-clearing.`,
  ].join("\n");
}

function geniusStrategistPrompt(input: AutopsyInput, architectDiagnosis: string) {
  return [
    `You are the Genius Strategist. Given this GTM diagnosis for ${input.companyName}:`,
    architectDiagnosis,
    ``,
    `Find the strategic wedge. Return STRICT JSON:`,
    `{`,
    `  "positioningBefore": "what their homepage likely says today (1 line)",`,
    `  "positioningAfter": "the rewritten positioning (1-2 lines, ends with the wedge)",`,
    `  "growthExperiments": [{"name":"...","hypothesis":"If/then sentence","effort":"Low|Medium|High + note","metric":"primary metric"}, ...3 items]`,
    `}`,
  ].join("\n");
}

function ghostwriterPrompt(input: AutopsyInput, positioning: string) {
  return [
    `You are the Ghostwriter. Write in the implied founder voice of ${input.companyName} (category: ${input.category}).`,
    `Anchor positioning: ${positioning}`,
    `Return STRICT JSON:`,
    `{`,
    `  "homepageHeroBefore": "weak generic version (1 line)",`,
    `  "homepageHeroAfter": "sharp rewritten H1 (1-2 lines)",`,
    `  "xPosts": ["post 1 (max ~260 chars)", ...5 items],`,
    `  "linkedinPost": "100-180 word LinkedIn post in founder voice",`,
    `  "coldDm": "3-5 sentence cold DM, no fluff, no pitch at the end"`,
    `}`,
    `Voice: clipped, lowercase-ok for X, no hashtags, no emojis. Strong opinions.`,
  ].join("\n");
}

export async function runAutopsy(input: AutopsyInput): Promise<AutopsyReport> {
  if (!hasHivemindCredentials()) {
    return buildMockReport(input);
  }

  const mock = buildMockReport(input);
  const steps: HivemindTraceStep[] = [];
  const personasUsed = new Set<Persona>();

  let frameworks: FrameworkChunk[] = mockFrameworks(input);
  try {
    const t0 = Date.now();
    const search = await knowledgeSearch(
      `${input.category} go-to-market diagnosis positioning narrative ICP distribution`,
      { personaId: "gtm-architect", maxResults: 6, relevanceThreshold: 0.4 },
    );
    if (search.chunks.length) {
      frameworks = search.chunks.map(c => ({
        title: c.title,
        author: c.author,
        doc_type: c.doc_type,
        score: c.score,
      }));
    }
    steps.push({
      step: "knowledge-retrieval",
      label: "Knowledge retrieval — Hivemind frameworks library",
      ms: Date.now() - t0,
      output: `Retrieved ${frameworks.length} frameworks for category "${input.category}".`,
      sources: frameworks.map(f => ({ title: f.title, author: f.author })),
    });
  } catch {
    steps.push({
      step: "knowledge-retrieval",
      label: "Knowledge retrieval — fallback to library",
      ms: 0,
      output: `Knowledge search unavailable; using library defaults.`,
      sources: frameworks.map(f => ({ title: f.title, author: f.author })),
    });
  }

  type ArchOut = Pick<AutopsyReport, "verdict" | "scorecard" | "whatsBroken" | "fixesPrioritized">;
  let arch: ArchOut | null = null;
  try {
    const t1 = Date.now();
    const out = await chat(gtmArchitectPrompt(input, frameworks), "gtm-architect");
    personasUsed.add("gtm-architect");
    arch = safeJsonParse<ArchOut>(out.response);
    steps.push({
      step: "gtm-architect",
      persona: "gtm-architect",
      label: "GTM Architect — structural diagnosis",
      ms: Date.now() - t1,
      output: arch ? `Diagnosed ${arch.whatsBroken?.length ?? 0} issues. ${arch.verdict ?? ""}` : "Architect returned non-JSON; fallback applied.",
      sources: out.sources,
    });
  } catch (e) {
    steps.push({
      step: "gtm-architect",
      persona: "gtm-architect",
      label: "GTM Architect — diagnosis failed, using fallback",
      ms: 0,
      output: String(e).slice(0, 160),
    });
  }

  type StratOut = Pick<AutopsyReport["beforeAfter"], "positioningBefore" | "positioningAfter"> & {
    growthExperiments: AutopsyReport["growthExperiments"];
  };
  let strat: StratOut | null = null;
  try {
    const t2 = Date.now();
    const archSummary = arch ? JSON.stringify(arch) : JSON.stringify({ scorecard: mock.scorecard, verdict: mock.verdict });
    const out = await chat(geniusStrategistPrompt(input, archSummary), "genius-strategist");
    personasUsed.add("genius-strategist");
    strat = safeJsonParse<StratOut>(out.response);
    steps.push({
      step: "genius-strategist",
      persona: "genius-strategist",
      label: "Genius Strategist — wedge identification",
      ms: Date.now() - t2,
      output: strat?.positioningAfter ? `Wedge: ${strat.positioningAfter.slice(0, 120)}…` : "Strategist returned non-JSON; fallback applied.",
      sources: out.sources,
    });
  } catch (e) {
    steps.push({
      step: "genius-strategist",
      persona: "genius-strategist",
      label: "Genius Strategist — failed, using fallback",
      ms: 0,
      output: String(e).slice(0, 160),
    });
  }

  type GhostOut = {
    homepageHeroBefore: string;
    homepageHeroAfter: string;
    xPosts: string[];
    linkedinPost: string;
    coldDm: string;
  };
  let ghost: GhostOut | null = null;
  try {
    const t3 = Date.now();
    const anchor = strat?.positioningAfter || mock.beforeAfter.positioningAfter;
    const out = await chat(ghostwriterPrompt(input, anchor), "ghostwriter");
    personasUsed.add("ghostwriter");
    ghost = safeJsonParse<GhostOut>(out.response);
    steps.push({
      step: "ghostwriter",
      persona: "ghostwriter",
      label: "Ghostwriter — voice-matched rewrites",
      ms: Date.now() - t3,
      output: ghost ? `Rewrote hero + ${ghost.xPosts?.length ?? 0} X posts + LinkedIn + DM.` : "Ghostwriter returned non-JSON; fallback applied.",
      sources: out.sources,
    });
  } catch (e) {
    steps.push({
      step: "ghostwriter",
      persona: "ghostwriter",
      label: "Ghostwriter — failed, using fallback",
      ms: 0,
      output: String(e).slice(0, 160),
    });
  }

  const scorecard = arch?.scorecard ?? mock.scorecard;
  const overallScore = Math.round(
    (scorecard.narrativeClarity +
      scorecard.icpSharpness +
      scorecard.proofCredibility +
      scorecard.categoryDifferentiation +
      scorecard.distributionLeverage) /
      5,
  );

  return {
    input,
    overallScore,
    verdict: arch?.verdict ?? mock.verdict,
    scorecard,
    whatsBroken: arch?.whatsBroken?.length ? arch.whatsBroken : mock.whatsBroken,
    fixesPrioritized: arch?.fixesPrioritized?.length ? arch.fixesPrioritized : mock.fixesPrioritized,
    beforeAfter: {
      homepageHeroBefore: ghost?.homepageHeroBefore ?? mock.beforeAfter.homepageHeroBefore,
      homepageHeroAfter: ghost?.homepageHeroAfter ?? mock.beforeAfter.homepageHeroAfter,
      positioningBefore: strat?.positioningBefore ?? mock.beforeAfter.positioningBefore,
      positioningAfter: strat?.positioningAfter ?? mock.beforeAfter.positioningAfter,
    },
    ghostwriter: {
      xPosts: ghost?.xPosts?.length ? ghost.xPosts : mock.ghostwriter.xPosts,
      linkedinPost: ghost?.linkedinPost ?? mock.ghostwriter.linkedinPost,
      coldDm: ghost?.coldDm ?? mock.ghostwriter.coldDm,
    },
    growthExperiments: strat?.growthExperiments?.length
      ? strat.growthExperiments
      : mock.growthExperiments,
    trace: {
      personasUsed: Array.from(personasUsed.size ? personasUsed : new Set<Persona>(["gtm-architect", "genius-strategist", "ghostwriter"])),
      frameworks,
      steps,
      mode: "live",
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runGTMArchitect(input: AutopsyInput) {
  return runAutopsy(input);
}

// ── Lead-hook orchestrator: 2 calls (teaser + gated full) ──────────────────

export function inputFromUrl(url: string, xHandle?: string): AutopsyInput | null {
  const domain = normalizeDomain(url);
  if (!domain) return null;
  return {
    companyName: companyNameFromDomain(domain),
    websiteUrl: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    twitterHandle: xHandle?.replace(/^@/, "") || undefined,
    // server-side default; the architect prompt infers the real category.
    category: "other",
  };
}

function teaserFromMock(input: AutopsyInput, mode: "mock" | "live"): TeaserResult {
  const mock = buildMockReport(input);
  return {
    input,
    overallScore: mock.overallScore,
    verdict: mock.verdict,
    scorecard: mock.scorecard,
    whatsBroken: mock.whatsBroken,
    trace: {
      personasUsed: ["gtm-architect"],
      frameworks: mockFrameworks(input),
      steps: [],
      mode,
    },
    generatedAt: new Date().toISOString(),
  };
}

// Teaser: single gtm-architect call. Mock fallback on any failure / no creds.
export async function runTeaser(input: AutopsyInput): Promise<TeaserResult> {
  if (!hasHivemindCredentials()) return teaserFromMock(input, "mock");

  const frameworks = mockFrameworks(input);
  try {
    const out = await chat(gtmArchitectPrompt(input, frameworks), "gtm-architect");
    const arch = safeJsonParse<{
      verdict: string;
      scorecard: ScoreCard;
      whatsBroken: string[];
    }>(out.response);
    if (!arch?.scorecard) throw new Error("non-json");
    const s = arch.scorecard;
    const overallScore = Math.round(
      (s.narrativeClarity +
        s.icpSharpness +
        s.proofCredibility +
        s.categoryDifferentiation +
        s.distributionLeverage) /
        5,
    );
    const mock = buildMockReport(input);
    return {
      input,
      overallScore,
      verdict: arch.verdict ?? mock.verdict,
      scorecard: s,
      whatsBroken: arch.whatsBroken?.length ? arch.whatsBroken : mock.whatsBroken,
      trace: { personasUsed: ["gtm-architect"], frameworks, steps: [], mode: "live" },
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return teaserFromMock(input, "mock");
  }
}

type FullOut = {
  positioningBefore: string;
  positioningAfter: string;
  homepageHeroBefore: string;
  homepageHeroAfter: string;
  xPosts: string[];
  linkedinPost: string;
  coldDm: string;
  growthExperiments: AutopsyReport["growthExperiments"];
};

function fullReportPrompt(input: AutopsyInput, teaser: TeaserResult): string {
  return [
    `You are the Genius Strategist AND the Ghostwriter for ${input.companyName} (${input.websiteUrl}).`,
    `Teaser diagnosis: verdict="${teaser.verdict}"; whatsBroken=${JSON.stringify(teaser.whatsBroken)}.`,
    `Return STRICT JSON:`,
    `{`,
    `  "positioningBefore": "1 line", "positioningAfter": "1-2 lines ending with the wedge",`,
    `  "homepageHeroBefore": "weak generic (1 line)", "homepageHeroAfter": "sharp H1 (1-2 lines)",`,
    `  "xPosts": ["...", ...5], "linkedinPost": "100-180 words", "coldDm": "3-5 sentences",`,
    `  "growthExperiments": [{"name":"...","hypothesis":"if/then","effort":"Low|Medium|High + note","metric":"..."}, ...3]`,
    `}`,
    `Voice: clipped, no hashtags, no emojis. Strong opinions.`,
  ].join("\n");
}

// Full report: ONE combined strategist+ghostwriter call, merged onto the teaser.
export async function runFullReport(
  input: AutopsyInput,
  teaser: TeaserResult,
): Promise<AutopsyReport> {
  const mock = buildMockReport(input);
  let out: FullOut | null = null;
  if (hasHivemindCredentials()) {
    try {
      const res = await chat(fullReportPrompt(input, teaser), "genius-strategist");
      out = safeJsonParse<FullOut>(res.response);
    } catch {
      out = null;
    }
  }
  return {
    input,
    overallScore: teaser.overallScore,
    verdict: teaser.verdict,
    scorecard: teaser.scorecard,
    whatsBroken: teaser.whatsBroken,
    fixesPrioritized: mock.fixesPrioritized,
    beforeAfter: {
      homepageHeroBefore: out?.homepageHeroBefore ?? mock.beforeAfter.homepageHeroBefore,
      homepageHeroAfter: out?.homepageHeroAfter ?? mock.beforeAfter.homepageHeroAfter,
      positioningBefore: out?.positioningBefore ?? mock.beforeAfter.positioningBefore,
      positioningAfter: out?.positioningAfter ?? mock.beforeAfter.positioningAfter,
    },
    ghostwriter: {
      xPosts: out?.xPosts?.length ? out.xPosts : mock.ghostwriter.xPosts,
      linkedinPost: out?.linkedinPost ?? mock.ghostwriter.linkedinPost,
      coldDm: out?.coldDm ?? mock.ghostwriter.coldDm,
    },
    growthExperiments: out?.growthExperiments?.length
      ? out.growthExperiments
      : mock.growthExperiments,
    trace: {
      personasUsed: ["gtm-architect", "genius-strategist", "ghostwriter"],
      frameworks: teaser.trace.frameworks,
      steps: teaser.trace.steps,
      mode: hasHivemindCredentials() && out ? "live" : "mock",
    },
    generatedAt: new Date().toISOString(),
  };
}
