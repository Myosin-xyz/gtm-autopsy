export type Category =
  | "DeFi"
  | "AI infra"
  | "consumer crypto"
  | "devtool"
  | "agency"
  | "other";

export type Persona =
  | "genius-strategist"
  | "gtm-architect"
  | "ghostwriter"
  | "general-assistant";

export interface AutopsyInput {
  companyName: string;
  websiteUrl: string;
  twitterHandle?: string;
  category: Category;
  competitorUrl?: string;
  competitorHandle?: string;
}

export interface ScoreCard {
  narrativeClarity: number;
  icpSharpness: number;
  proofCredibility: number;
  categoryDifferentiation: number;
  distributionLeverage: number;
}

export interface FrameworkChunk {
  title: string;
  author?: string;
  doc_type?: string;
  score: number;
}

export interface HivemindTraceStep {
  step:
    | "knowledge-retrieval"
    | "gtm-architect"
    | "genius-strategist"
    | "ghostwriter";
  persona?: Persona;
  label: string;
  ms: number;
  output: string;
  sources?: { title: string; author?: string }[];
}

export interface TeaserResult {
  input: AutopsyInput;
  overallScore: number;
  verdict: string;
  scorecard: ScoreCard;
  whatsBroken: string[];
  trace: AutopsyReport["trace"];
  generatedAt: string;
}

// ── v2 shapes (grounded; produced by the hive-mind autopsy endpoints) ──────

export interface AutopsyScanV2 {
  projectName: string;
  description: string;
  category: string[];
  socialHandles: Record<string, string>;
  audiences: string[];
  channels: string[];
  rawText?: string;
}

export interface TeaserV2 {
  overallScore: number;
  verdict: string;
  scorecard: ScoreCard;
  whatsBroken: string[];
  scan: AutopsyScanV2;
}

export interface ReportV2 {
  positioningBefore: string;
  positioningAfter: string;
  homepageHeroBefore: string;
  homepageHeroAfter: string;
  xPosts: string[];
  linkedinPost: string;
  coldDm: string;
  growthExperiments: string[];
}

export interface GateMeta {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

export interface AutopsyReport {
  input: AutopsyInput;
  overallScore: number;
  verdict: string;
  scorecard: ScoreCard;
  whatsBroken: string[];
  fixesPrioritized: { title: string; detail: string; impact: "high" | "medium" | "low" }[];
  beforeAfter: {
    homepageHeroBefore: string;
    homepageHeroAfter: string;
    positioningBefore: string;
    positioningAfter: string;
  };
  ghostwriter: {
    xPosts: string[];
    linkedinPost: string;
    coldDm: string;
  };
  growthExperiments: { name: string; hypothesis: string; effort: string; metric: string }[];
  trace: {
    personasUsed: Persona[];
    frameworks: FrameworkChunk[];
    steps: HivemindTraceStep[];
    mode: "live" | "mock";
  };
  generatedAt: string;
}
