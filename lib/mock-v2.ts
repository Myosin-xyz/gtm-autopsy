import { companyNameFromDomain, normalizeDomain } from "./domain";
import { buildMockReport } from "./mocks";
import type { AutopsyInput, ReportV2, TeaserV2 } from "./types";

// Deterministic mock v2 shapes for local dev (no HIVEMIND_API_KEY). Reuses the
// existing mock report generator and projects it onto the grounded v2 shapes so
// the widget renders identically in mock and live mode.

function inputFor(url: string): AutopsyInput {
  const domain = normalizeDomain(url) ?? "example.com";
  return {
    companyName: companyNameFromDomain(domain),
    websiteUrl: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    category: "other",
  };
}

export function mockTeaserV2(url: string): TeaserV2 {
  const input = inputFor(url);
  const m = buildMockReport(input);
  return {
    overallScore: m.overallScore,
    verdict: m.verdict,
    scorecard: m.scorecard,
    whatsBroken: m.whatsBroken,
    scan: {
      projectName: input.companyName,
      description: "",
      category: [input.category],
      socialHandles: {},
      audiences: [],
      channels: [],
      rawText: "",
    },
  };
}

export function mockReportV2(url: string): ReportV2 {
  const input = inputFor(url);
  const m = buildMockReport(input);
  return {
    positioningBefore: m.beforeAfter.positioningBefore,
    positioningAfter: m.beforeAfter.positioningAfter,
    homepageHeroBefore: m.beforeAfter.homepageHeroBefore,
    homepageHeroAfter: m.beforeAfter.homepageHeroAfter,
    xPosts: m.ghostwriter.xPosts,
    linkedinPost: m.ghostwriter.linkedinPost,
    coldDm: m.ghostwriter.coldDm,
    growthExperiments: m.growthExperiments.map((g) => `${g.name} — ${g.hypothesis}`),
  };
}
