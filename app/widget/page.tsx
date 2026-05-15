import { WidgetApp } from "@/components/WidgetApp";

export const dynamic = "force-dynamic";

export default function WidgetPage({
  searchParams,
}: {
  searchParams: { cta?: string; label?: string };
}) {
  const ctaUrl =
    searchParams.cta && /^https?:\/\//i.test(searchParams.cta)
      ? searchParams.cta
      : "https://myosin.xyz/hivemind#contact";
  const ctaLabel = (searchParams.label?.slice(0, 60)) || "Hire Hivemind →";
  return <WidgetApp ctaUrl={ctaUrl} ctaLabel={ctaLabel} />;
}
