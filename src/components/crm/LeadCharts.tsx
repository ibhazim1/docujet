"use client";

import ActiveLostDonut from "./charts/ActiveLostDonut";
import FunnelChart from "./charts/FunnelChart";
import MonthlyChart from "./charts/MonthlyChart";
import SocialSplitMeter from "./charts/SocialSplitMeter";
import SourceQualityChart from "./charts/SourceQualityChart";
import SourceShareDonut from "./charts/SourceShareDonut";
import SourceStageMatrix from "./charts/SourceStageMatrix";
import SourceVolumeChart from "./charts/SourceVolumeChart";
import StageShareDonut from "./charts/StageShareDonut";
import { funnelStats, monthlyStats } from "@/lib/crm/analytics";
import type { SourceStat } from "@/lib/crm/analytics";
import type { Lead, SourceKey } from "@/lib/crm/types";

type LeadChartsProps = {
  leads: Lead[];
  sources: SourceStat[];
  activeSource: SourceKey | "";
  params: URLSearchParams;
};

/** Source and lifecycle analysis, computed over the filtered set. */
export default function LeadCharts({
  leads,
  sources,
  activeSource,
  params,
}: LeadChartsProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SourceVolumeChart rows={sources} activeSource={activeSource} params={params} />
      <SourceQualityChart rows={sources} />
      <FunnelChart rows={funnelStats(leads)} />
      <MonthlyChart rows={monthlyStats(leads)} />
      <SourceStageMatrix rows={sources} />
      <SocialSplitMeter rows={sources} total={leads.length} />
      <SourceShareDonut rows={sources} />
      <ActiveLostDonut leads={leads} />
      <StageShareDonut leads={leads} />
    </div>
  );
}
