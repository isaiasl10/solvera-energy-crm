import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type RoofPlane = {
  id: string;
  proposal_id: string;
  points: { lat: number; lng: number }[];
  pitch_deg: number | null;
  azimuth_deg?: number | null;
};

export type Obstruction = {
  id: string;
  proposal_id: string;
  roof_plane_id: string | null;
  type: "rect" | "circle" | "tree";
  data: any;
};

export type Panel = {
  id: string;
  proposal_id: string;
  roof_plane_id: string;
  panel_model_id: string;
  orientation: "portrait" | "landscape";
  rotation_deg: number;
  center_lat: number;
  center_lng: number;
  corners: { lat: number; lng: number }[];
};

export function useProposalDesign(proposalId?: string) {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [planes, setPlanes] = useState<RoofPlane[]>([]);
  const [obstructions, setObstructions] = useState<Obstruction[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [panelModels, setPanelModels] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!proposalId) return;
    setLoading(true);
    setError(null);
    try {
      const [
        { data: p, error: pe },
        { data: pl, error: ple },
        { data: ob, error: obe },
        { data: pa, error: pae },
        { data: pm, error: pme },
      ] = await Promise.all([
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
      setPlanes((pl ?? []).map((x: any) => ({ ...x, points: x.points ?? x.polygon ?? [] })));
      setObstructions(ob ?? []);
      setPanels(pa ?? []);
      setPanelModels(pm ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load proposal design");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const systemSummary = useMemo(() => {
    const panelCount = panels.length;
    const selectedModel = panelModels.find((m) => m.id === proposal?.panel_model_id) ?? null;
    const panelWatts = selectedModel?.watts ?? proposal?.panel_watts ?? 410;
    const systemKw = (panelCount * panelWatts) / 1000;

    const yieldKwhPerKw = 1550;
    const derate = 0.82;
    const annualProductionKwh = systemKw * yieldKwhPerKw * derate;

    const monthly = (() => {
      const m = proposal?.monthly_kwh;
      const keys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      if (!m) return Array(12).fill(0);
      if (Array.isArray(m)) return [...m, ...Array(12)].slice(0, 12).map((x: any) => Number(x) || 0);
      if (typeof m === "object") return keys.map((k) => Number((m as any)[k]) || 0);
      return Array(12).fill(0);
    })();

    const annualUsageKwh =
      proposal?.usage_mode === "monthly"
        ? monthly.reduce((a: number, b: number) => a + (Number(b) || 0), 0)
        : Number(proposal?.annual_kwh) || 0;

    const offsetPercent = annualUsageKwh > 0 ? (annualProductionKwh / annualUsageKwh) * 100 : 0;

    return { panelCount, panelWatts, systemKw, annualProductionKwh, annualUsageKwh, offsetPercent };
  }, [panels, panelModels, proposal]);

  return {
    loading,
    error,
    proposal,
    planes,
    obstructions,
    panels,
    panelModels,
    systemSummary,
    refresh,
    setProposal,
    setPlanes,
    setObstructions,
    setPanels,
  };
}
