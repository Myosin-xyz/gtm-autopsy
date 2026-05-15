import type {
  AutopsyInput,
  AutopsyReport,
  FrameworkChunk,
  HivemindTraceStep,
  Persona,
} from "./types";

const FRAMEWORK_LIBRARY: Record<string, FrameworkChunk[]> = {
  "DeFi": [
    { title: "Narrative Health Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.92 },
    { title: "Category Design Sprint", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.88 },
    { title: "Web3 Community Growth Loops", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.86 },
    { title: "Founder-Led Distribution", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.81 },
    { title: "Launch Readiness Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.78 },
  ],
  "AI infra": [
    { title: "Narrative Health Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.93 },
    { title: "Category Design Sprint", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.9 },
    { title: "Developer-Led Distribution", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.87 },
    { title: "Founder-Led Distribution", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.83 },
    { title: "Launch Readiness Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.79 },
  ],
  "consumer crypto": [
    { title: "Narrative Health Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.91 },
    { title: "Web3 Community Growth Loops", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.9 },
    { title: "Category Design Sprint", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.85 },
    { title: "Founder-Led Distribution", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.82 },
    { title: "Launch Readiness Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.77 },
  ],
  "devtool": [
    { title: "Narrative Health Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.94 },
    { title: "Developer-Led Distribution", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.89 },
    { title: "Category Design Sprint", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.84 },
    { title: "Founder-Led Distribution", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.8 },
    { title: "Launch Readiness Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.76 },
  ],
  "agency": [
    { title: "Narrative Health Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.9 },
    { title: "Founder-Led Distribution", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.88 },
    { title: "Category Design Sprint", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.83 },
    { title: "Outbound Authority Loop", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.81 },
    { title: "Launch Readiness Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.75 },
  ],
  "other": [
    { title: "Narrative Health Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.9 },
    { title: "Category Design Sprint", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.85 },
    { title: "Founder-Led Distribution", author: "Hivemind Frameworks", doc_type: "playbook", score: 0.82 },
    { title: "Launch Readiness Audit", author: "Hivemind Frameworks", doc_type: "diagnostic", score: 0.78 },
  ],
};

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function mockFrameworks(input: AutopsyInput): FrameworkChunk[] {
  return FRAMEWORK_LIBRARY[input.category] ?? FRAMEWORK_LIBRARY["other"];
}

export function buildMockReport(input: AutopsyInput): AutopsyReport {
  const seed = hashSeed(
    `${input.companyName}|${input.websiteUrl}|${input.twitterHandle ?? ""}|${input.category}`,
  );
  const r = rng(seed);

  const narrativeClarity = clamp(38 + r() * 32);
  const icpSharpness = clamp(34 + r() * 36);
  const proofCredibility = clamp(28 + r() * 38);
  const categoryDifferentiation = clamp(30 + r() * 34);
  const distributionLeverage = clamp(32 + r() * 36);

  const overallScore = Math.round(
    (narrativeClarity +
      icpSharpness +
      proofCredibility +
      categoryDifferentiation +
      distributionLeverage) /
      5,
  );

  const verdicts = [
    "Strong idea, blurry story. The market can't repeat your pitch back to you.",
    "You're shouting features into the void — there is no buyer in your copy.",
    "The product is sharper than the positioning. That's a fixable problem.",
    "Distribution is leaking through five channels at 5% intensity each.",
    "You sound like the category, not the leader of it.",
  ];
  const verdict = pick(verdicts, r);

  const brokenByCat: Record<string, string[]> = {
    "DeFi": [
      "Homepage leads with mechanism (yields, vaults) before naming who it's for.",
      "No proof beyond TVL — missing operator quotes, audits framed as trust signals.",
      "Twitter is product changelog. Founder voice is invisible.",
      "Category is undefined — you're a 'DeFi protocol' in a sea of DeFi protocols.",
      "No clear ICP — retail degens and institutional desks see the same page.",
    ],
    "AI infra": [
      "Hero copy is benchmark-led; benchmarks don't sell, outcomes do.",
      "ICP is 'developers' — too broad to write a sharp landing page against.",
      "No customer logos above the fold; trust gap on first impression.",
      "You're positioned against OpenAI, not against the actual pain you remove.",
      "Distribution is over-indexed on launch tweets; no compounding loop.",
    ],
    "consumer crypto": [
      "Onboarding promise isn't on the homepage — the wedge is buried in docs.",
      "No social proof from real users; only team announcements.",
      "The X account posts product news, not narrative — no reason to follow.",
      "Category framing is generic ('the easiest way to…'); commoditized.",
      "No referral or invite loop visible; growth is purely paid + lucky.",
    ],
    "devtool": [
      "Docs-first homepage; no narrative for non-technical buyers/champions.",
      "No 'why now' — the page reads like a feature list, not a movement.",
      "Pricing page is missing the buyer journey, hides the wedge use case.",
      "X is changelog; the founder isn't writing in public.",
      "No design partner / case-study layer; trust gap for senior engineers.",
    ],
    "agency": [
      "You sell 'services'; the market buys outcomes. Headline is upside-down.",
      "No named results above the fold; testimonials are anonymous.",
      "ICP is 'startups' — too broad to write a sharp pitch deck against.",
      "Founder isn't visibly the authority; the brand has no face.",
      "No content engine; you're chasing inbound instead of compounding it.",
    ],
    "other": [
      "Positioning is generic; can be swapped with three competitors verbatim.",
      "ICP description is multi-persona; the homepage is paralyzed.",
      "No proof layer — quotes, numbers, screenshots are all missing or weak.",
      "Distribution channels are diffuse; nothing is being doubled down on.",
      "No founder narrative; brand reads like a committee wrote it.",
    ],
  };
  const broken = (brokenByCat[input.category] ?? brokenByCat["other"]).slice(0, 5);

  const fixes = [
    {
      title: "Name the buyer in the first 6 words on your homepage.",
      detail:
        "Replace the abstract product line with a sentence that ends in a specific role + outcome. The homepage should fail a Turing test on whether the visitor sees themselves.",
      impact: "high" as const,
    },
    {
      title: "Stop competing inside the category. Rename it.",
      detail:
        "Pick one wedge phrase nobody else owns and repeat it across homepage, X bio, deck cover, and email signature for 30 days. Distribution rewards repetition, not novelty.",
      impact: "high" as const,
    },
    {
      title: "Run a proof sprint. Three artifacts in seven days.",
      detail:
        "Customer quote with full name + role, one outcome metric, one screenshot of real usage. Ship them above the fold. Trust is the conversion lever you're under-using.",
      impact: "medium" as const,
    },
  ];

  const heroAfter = `${input.companyName} is the ${
    input.category === "agency" ? "growth partner" : input.category === "devtool" ? "developer platform" : "infrastructure"
  } that turns ${
    input.category === "DeFi" ? "on-chain liquidity"
      : input.category === "AI infra" ? "model traffic"
      : input.category === "consumer crypto" ? "crypto-curious users"
      : input.category === "devtool" ? "engineering teams"
      : input.category === "agency" ? "first-time founders"
      : "ambitious teams"
  } into ${
    input.category === "DeFi" ? "compounding yield with zero ops"
      : input.category === "AI infra" ? "production-grade agents in days, not quarters"
      : input.category === "consumer crypto" ? "weekly active wallets in their first session"
      : input.category === "devtool" ? "shipping teams in a single afternoon"
      : input.category === "agency" ? "category leaders with a real story"
      : "outcomes the market can repeat"
  }.`;

  const positioningAfter = `For ${
    input.category === "DeFi" ? "operators of institutional capital"
      : input.category === "AI infra" ? "agent builders shipping to production"
      : input.category === "consumer crypto" ? "the next 100M crypto users"
      : input.category === "devtool" ? "founding engineers under deadline"
      : input.category === "agency" ? "founders raising their next round"
      : "teams that need to compound trust"
  } who are tired of ${
    input.category === "DeFi" ? "babysitting yields and chasing forks"
      : input.category === "AI infra" ? "duct-taping prompts to production"
      : input.category === "consumer crypto" ? "explaining gas to their friends"
      : input.category === "devtool" ? "stitching five tools to ship one thing"
      : input.category === "agency" ? "consultant decks that don't move pipeline"
      : "feature-led pitches that don't convert"
  }, ${input.companyName} is the only ${
    input.category === "DeFi" ? "yield system"
      : input.category === "AI infra" ? "agent runtime"
      : input.category === "consumer crypto" ? "consumer wallet"
      : input.category === "devtool" ? "developer platform"
      : input.category === "agency" ? "GTM partner"
      : "platform"
  } that makes the outcome the default — not the feature flag.`;

  const xPosts = [
    `most ${input.category === "AI infra" ? "AI infra" : input.category} startups fail not because the product is bad but because the homepage doesn't name a buyer.\n\n${input.companyName} is fixing that this week.`,
    `unpopular opinion: nobody buys "the leading platform for X".\n\nthey buy "the thing my CTO/CMO/CFO can defend in a 1:1".\n\nrewrite your hero accordingly.`,
    `we just ran the GTM Autopsy on ${input.companyName}.\n\nverdict: ${verdict.toLowerCase()}\n\nfix #1 starts on the homepage.`,
    `every ${input.category} founder I respect does one thing the same:\n\nthey pick a wedge phrase nobody owns and beat it into the ground for 30 days.\n\nnot a campaign. a posture.`,
    `the founder who explains *who it's for* in 6 words wins the demo before the demo.\n\n${input.companyName} should test this on the homepage tomorrow.`,
  ];

  const linkedinPost = `I just put ${input.companyName} through a GTM Autopsy.\n\nOverall GTM Health: ${overallScore}/100.\n\nThe product is real. The positioning isn't catching up.\n\nThree things I'd change this week:\n\n1. Name the buyer in the first 6 words of the homepage.\n2. Stop competing inside the category. Rename it.\n3. Ship three pieces of proof in seven days — one quote, one number, one screenshot.\n\nMost ${input.category} companies don't have a product problem. They have a *legibility* problem.\n\nThe market can't repeat their pitch back to them. So it doesn't.\n\nFixable in a week. Worth doing this week.`;

  const coldDm = `Hey — ran a quick GTM teardown on ${input.companyName} (${input.websiteUrl}).\n\nShort version: the product looks sharper than the homepage suggests. There's a 6-word wedge sitting in your docs that should be your H1.\n\nWant the full breakdown? It's 12 pages, takes 8 minutes to read, and we don't pitch you at the end.`;

  const experiments = [
    {
      name: "30-day wedge repetition",
      hypothesis: `If ${input.companyName} repeats one wedge phrase across homepage, X bio, and email signature for 30 days, organic search and direct DM volume will rise by 25%+ as the phrase becomes searchable.`,
      effort: "Low — copy change only",
      metric: "Branded search lift + inbound DMs",
    },
    {
      name: "Founder thread cadence",
      hypothesis: `If the founder publishes one 280-character thesis post and one 8-tweet thread per week for 4 weeks, demo requests sourced from X will 3x.`,
      effort: "Medium — recurring 2hr/week",
      metric: "Demo requests attributed to X",
    },
    {
      name: "Three-artifact proof sprint",
      hypothesis: `If ${input.companyName} ships one customer quote with full attribution, one outcome metric, and one real-usage screenshot above the fold in 7 days, homepage → CTA conversion will rise by 30%+.`,
      effort: "Medium — 1 customer call + 1 design pass",
      metric: "Hero → CTA conversion rate",
    },
  ];

  const personasUsed: Persona[] = ["gtm-architect", "genius-strategist", "ghostwriter"];
  const frameworks = mockFrameworks(input);

  const steps: HivemindTraceStep[] = [
    {
      step: "knowledge-retrieval",
      label: "Knowledge retrieval — Hivemind frameworks library",
      ms: 412,
      output: `Retrieved ${frameworks.length} relevant frameworks for category "${input.category}". Top match: ${frameworks[0].title} (score ${frameworks[0].score}).`,
      sources: frameworks.map(f => ({ title: f.title, author: f.author })),
    },
    {
      step: "gtm-architect",
      persona: "gtm-architect",
      label: "GTM Architect — structural diagnosis",
      ms: 1184,
      output: `Diagnosed 5 broken seams across narrative, ICP, proof, category, and distribution. Overall health: ${overallScore}/100.`,
    },
    {
      step: "genius-strategist",
      persona: "genius-strategist",
      label: "Genius Strategist — wedge identification",
      ms: 1421,
      output: `Identified a single wedge phrase the category does not own. Recommended 30-day repetition posture instead of campaign.`,
    },
    {
      step: "ghostwriter",
      persona: "ghostwriter",
      label: "Ghostwriter — voice-matched rewrites",
      ms: 1672,
      output: `Rewrote homepage hero, positioning paragraph, 5 X posts, 1 LinkedIn post, and 1 cold DM in ${input.companyName}'s implied founder voice.`,
    },
  ];

  return {
    input,
    overallScore,
    verdict,
    scorecard: {
      narrativeClarity: Math.round(narrativeClarity),
      icpSharpness: Math.round(icpSharpness),
      proofCredibility: Math.round(proofCredibility),
      categoryDifferentiation: Math.round(categoryDifferentiation),
      distributionLeverage: Math.round(distributionLeverage),
    },
    whatsBroken: broken,
    fixesPrioritized: fixes,
    beforeAfter: {
      homepageHeroBefore: `${input.companyName} — the leading ${input.category} platform for modern teams.`,
      homepageHeroAfter: heroAfter,
      positioningBefore: `${input.companyName} helps teams move faster with ${input.category} tools designed for scale.`,
      positioningAfter: positioningAfter,
    },
    ghostwriter: {
      xPosts,
      linkedinPost,
      coldDm,
    },
    growthExperiments: experiments,
    trace: {
      personasUsed,
      frameworks,
      steps,
      mode: "mock",
    },
    generatedAt: new Date().toISOString(),
  };
}
