import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useProposalDesign(proposalId?: string) {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [planes, setPlanes] = useState<any[]>([]);
  const [obstructions, setObstructions] = useState<any[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [panelModels, setPanelModels] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!proposalId) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: p, error: pe }, { data: pl, error: ple }, { data: ob, error: obe }, { data: pa, error: pae }, { data: pm, error: pme }] =
        await Promise.all([
          supabase.from("proposals").select("*").eq("id", proposalId).single(),
          supabase.from("proposal_roof_planes").select("*").eq("proposal_id", proposalId),
          supabase.from("proposal_obstructions").select("*").eq("proposal_id", proposalId),
          supabase.from("proposal_panels").select("*").eq("proposal_id", proposalId),
          supabase.from("panel_models").select("*").order("brand").order("watts"),
        ]);

      if (pe) throw pe;
      if (ple) throw ple;
      if (obe) throw obe;
      if (pae) throw pae;
      if (pme) throw pme;

      setProposal(p);
      setPlanes(pl ?? []);
      setObstructions(ob ?? []);
      setPanels(pa ?? []);
      setPanelModels(pm ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load proposal design");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => { refresh(); }, [refresh]);

  const systemSummary = useMemo(() => {
    const panelCount = panels.length;
    const selectedModel = panelModels.find(m => m.id === proposal?.panel_model_id) ?? null;
    const panelWatts = selectedModel?.watts ?? proposal?.panel_watts ?? 410;
    const systemKw = (panelCount * panelWatts) / 1000;

    const yieldKwhPerKw = 1550;
    const derate = 0.82;
    const annualProductionKwh = systemKw * yieldKwhPerKw * derate;

    const monthly = Array.isArray(proposal?.monthly_kwh) ? proposal.monthly_kwh : Array(12).fill(0);
    const annualUsageKwh =
      proposal?.usage_mode === "monthly"
        ? monthly.reduce((a:number,b:number)=>a+(Number(b)||0),0)
        : Number(proposal?.annual_kwh) || 0;

    const offsetPercent = annualUsageKwh > 0 ? (annualProductionKwh / annualUsageKwh) * 100 : 0;

    return { panelCount, panelWatts, systemKw, annualProductionKwh, annualUsageKwh, offsetPercent };
  }, [panels, panelModels, proposal]);

  return { loading, error, proposal, planes, obstructions, panels, panelModels, systemSummary, refresh, setProposal };
}
