import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useFinancingOptions } from "../hooks/useFinancingOptions";
import { User, DollarSign, ArrowLeft, Zap, Package, ChevronDown, ChevronUp, FileText, CreditCard, File, Pencil, Trash2, Square, Circle, TreeDeciduous, Grid, RotateCw } from "lucide-react";

const fmt = (n?: number | null, digits = 0) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";

type ToolMode = "none" | "roof" | "circle" | "rect" | "tree" | "add-panel" | "delete-panel";

type RoofPlaneRow = {
  id: string;
  proposal_id: string;
  name: string;
  pitch_deg: number;
  path: Array<{ lat: number; lng: number }>;
  area_sqft: number | null;
};

type ObstructionRow = {
  id: string;
  proposal_id: string;
  type: "rect" | "circle" | "tree";
  roof_plane_id: string | null;
  center_lat: number;
  center_lng: number;
  radius_ft: number | null;
  width_ft: number | null;
  height_ft: number | null;
  rotation_deg: number | null;
};

type PanelModel = {
  id: string;
  brand: string;
  model: string;
  watts: number;
  length_mm: number;
  width_mm: number;
};

type ProposalPanel = {
  id: string;
  proposal_id: string;
  roof_plane_id: string | null;
  panel_model_id: string;
  center_lat: number;
  center_lng: number;
  rotation_deg: number;
  is_portrait: boolean;
};

const mToFt = (m: number) => m * 3.28084;
const m2ToFt2 = (m2: number) => m2 * 10.7639104167097;

function isGoogleReady() {
  return (
    typeof (window as any).google !== "undefined" &&
    !!(window as any).google.maps &&
    !!(window as any).google.maps.places &&
    !!(window as any).google.maps.drawing &&
    !!(window as any).google.maps.geometry
  );
}

export default function ProposalWorkspace({
  proposalId,
  onBack,
}: {
  proposalId: string | null;
  onBack?: () => void;
}) {
  const { options: financingOptions } = useFinancingOptions();

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  const [customer, setCustomer] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [proposalDraft, setProposalDraft] = useState<any>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    customer: true,
    electricity: true,
    rate: false,
    system: true,
    pricing: true,
    financing: true,
    payment: true,
  });
  const [activeTab, setActiveTab] = useState<string>("manage");

  const [roofPlanes, setRoofPlanes] = useState<RoofPlaneRow[]>([]);
  const [obstructions, setObstructions] = useState<ObstructionRow[]>([]);
  const [panelModels, setPanelModels] = useState<PanelModel[]>([]);
  const [panels, setPanels] = useState<ProposalPanel[]>([]);

  const roofPolysRef = useRef<Map<string, google.maps.Polygon>>(new Map());
  const obstructionShapesRef = useRef<Map<string, any>>(new Map());
  const panelRectanglesRef = useRef<Map<string, google.maps.Rectangle>>(new Map());

  const [toolMode, setToolMode] = useState<ToolMode>("none");
  const [selectedRoofId, setSelectedRoofId] = useState<string | null>(null);

  const [selectedPanelModelId, setSelectedPanelModelId] = useState<string | null>(null);
  const [panelOrientation, setPanelOrientation] = useState<"portrait" | "landscape">("portrait");
  const [panelRotation, setPanelRotation] = useState<number>(0);
  const [rowSpacing, setRowSpacing] = useState<number>(0.5);
  const [colSpacing, setColSpacing] = useState<number>(0.5);

  const [mapsError, setMapsError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mapsLoading, setMapsLoading] = useState(true);

  const selectedRoof = useMemo(
    () => roofPlanes.find((r) => r.id === selectedRoofId) ?? null,
    [roofPlanes, selectedRoofId]
  );

  const selectedModel = useMemo(
    () => panelModels.find((m) => m.id === selectedPanelModelId) ?? null,
    [panelModels, selectedPanelModelId]
  );

  const systemSummary = useMemo(() => {
    const panelCount = panels.length;
    let systemKw = 0;
    let annualProductionKwh = 0;

    panels.forEach((panel) => {
      const model = panelModels.find((m) => m.id === panel.panel_model_id);
      if (model) {
        systemKw += model.watts / 1000;
      }
    });

    if (proposal?.annual_production_estimate) {
      annualProductionKwh = proposal.annual_production_estimate;
    }

    const annualConsumption = proposal?.annual_consumption || 0;
    const offsetPercent = annualConsumption > 0 ? (annualProductionKwh / annualConsumption) * 100 : 0;

    return {
      panelCount,
      systemKw,
      annualProductionKwh,
      offsetPercent,
    };
  }, [panels, panelModels, proposal]);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 100;

    const checkGoogleMaps = () => {
      attempts++;

      if (isGoogleReady()) {
        setMapsLoading(false);
        setMapsError(null);
        return;
      }

      if (attempts >= maxAttempts) {
        setMapsLoading(false);
        setMapsError("Google Maps failed to load. Please refresh the page.");
        return;
      }

      setTimeout(checkGoogleMaps, 100);
    };

    checkGoogleMaps();
  }, []);

  useEffect(() => {
    async function loadPanelModels() {
      const { data, error } = await supabase
        .from("panel_models")
        .select("*")
        .order("brand", { ascending: true })
        .order("watts", { ascending: true });

      if (!error && data) {
        setPanelModels(data);
        if (data.length > 0 && !selectedPanelModelId) {
          setSelectedPanelModelId(data[0].id);
        }
      }
    }

    loadPanelModels();
  }, []);

  useEffect(() => {
    if (!proposalId) return;

    async function loadProposal() {
      const { data: proposalData } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .maybeSingle();

      if (proposalData) {
        setProposal(proposalData);
        setProposalDraft(proposalData);

        if (proposalData.customer_id) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("*")
            .eq("id", proposalData.customer_id)
            .maybeSingle();

          if (customerData) {
            setCustomer(customerData);
          }
        }

        if (proposalData.panel_model_id) {
          setSelectedPanelModelId(proposalData.panel_model_id);
        }
      }

      const { data: planesData } = await supabase
        .from("proposal_roof_planes")
        .select("*")
        .eq("proposal_id", proposalId);

      if (planesData) {
        setRoofPlanes(planesData);
      }

      const { data: obstructionsData } = await supabase
        .from("proposal_obstructions")
        .select("*")
        .eq("proposal_id", proposalId);

      if (obstructionsData) {
        setObstructions(obstructionsData);
      }

      const { data: panelsData } = await supabase
        .from("proposal_panels")
        .select("*")
        .eq("proposal_id", proposalId);

      if (panelsData) {
        setPanels(panelsData);
      }
    }

    loadProposal();
  }, [proposalId]);

  useEffect(() => {
    if (!isGoogleReady() || !mapDivRef.current || !proposal) return;

    const google = (window as any).google;

    if (!mapRef.current) {
      const map = new google.maps.Map(mapDivRef.current, {
        center: { lat: proposal.lat, lng: proposal.lng },
        zoom: 21,
        mapTypeId: "satellite",
        tilt: 0,
        disableDefaultUI: true,
        zoomControl: true,
      });

      mapRef.current = map;

      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
      });
      drawingManager.setMap(map);
      drawingRef.current = drawingManager;

      google.maps.event.addListener(drawingManager, "polygoncomplete", async (polygon: any) => {
        const path = polygon.getPath().getArray().map((p: any) => ({
          lat: p.lat(),
          lng: p.lng(),
        }));

        polygon.setMap(null);

        const { data, error } = await supabase
          .from("proposal_roof_planes")
          .insert({
            proposal_id: proposalId,
            name: `Roof Plane ${roofPlanes.length + 1}`,
            pitch_deg: 20,
            path,
          })
          .select()
          .single();

        if (!error && data) {
          setRoofPlanes((prev) => [...prev, data]);
        }

        drawingManager.setDrawingMode(null);
        setToolMode("none");
      });

      google.maps.event.addListener(map, "click", (e: any) => {
        if (toolMode === "add-panel" && selectedRoofId && selectedPanelModelId) {
          addPanelAt(e.latLng.lat(), e.latLng.lng());
        }
      });
    }
  }, [mapsLoading, proposal, toolMode, selectedRoofId, selectedPanelModelId]);

  useEffect(() => {
    if (!mapRef.current || !isGoogleReady()) return;

    roofPolysRef.current.forEach((poly) => poly.setMap(null));
    roofPolysRef.current.clear();

    const google = (window as any).google;

    roofPlanes.forEach((plane) => {
      const poly = new google.maps.Polygon({
        paths: plane.path,
        strokeColor: selectedRoofId === plane.id ? "#FFA500" : "#00FF00",
        strokeOpacity: 0.8,
        strokeWeight: selectedRoofId === plane.id ? 3 : 2,
        fillColor: selectedRoofId === plane.id ? "#FFA500" : "#00FF00",
        fillOpacity: 0.2,
        clickable: true,
      });

      poly.setMap(mapRef.current);
      roofPolysRef.current.set(plane.id, poly);

      google.maps.event.addListener(poly, "click", () => {
        setSelectedRoofId(plane.id);
      });
    });
  }, [roofPlanes, selectedRoofId]);

  useEffect(() => {
    if (!mapRef.current || !isGoogleReady()) return;

    obstructionShapesRef.current.forEach((shape) => shape.setMap(null));
    obstructionShapesRef.current.clear();

    const google = (window as any).google;

    obstructions.forEach((obs) => {
      let shape: any = null;

      if (obs.type === "circle" && obs.radius_ft) {
        const radiusMeters = obs.radius_ft * 0.3048;
        shape = new google.maps.Circle({
          center: { lat: obs.center_lat, lng: obs.center_lng },
          radius: radiusMeters,
          strokeColor: "#FF0000",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#FF0000",
          fillOpacity: 0.35,
        });
      } else if ((obs.type === "rect" || obs.type === "tree") && obs.width_ft && obs.height_ft) {
        const widthMeters = obs.width_ft * 0.3048;
        const heightMeters = obs.height_ft * 0.3048;

        const latOffset = heightMeters / 111320;
        const lngOffset = widthMeters / (111320 * Math.cos((obs.center_lat * Math.PI) / 180));

        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(obs.center_lat - latOffset / 2, obs.center_lng - lngOffset / 2),
          new google.maps.LatLng(obs.center_lat + latOffset / 2, obs.center_lng + lngOffset / 2)
        );

        shape = new google.maps.Rectangle({
          bounds,
          strokeColor: obs.type === "tree" ? "#228B22" : "#FF0000",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: obs.type === "tree" ? "#228B22" : "#FF0000",
          fillOpacity: 0.35,
        });
      }

      if (shape) {
        shape.setMap(mapRef.current);
        obstructionShapesRef.current.set(obs.id, shape);
      }
    });
  }, [obstructions]);

  useEffect(() => {
    if (!mapRef.current || !isGoogleReady()) return;

    panelRectanglesRef.current.forEach((rect) => rect.setMap(null));
    panelRectanglesRef.current.clear();

    const google = (window as any).google;

    panels.forEach((panel) => {
      const model = panelModels.find((m) => m.id === panel.panel_model_id);
      if (!model) return;

      const lengthMeters = (panel.is_portrait ? model.length_mm : model.width_mm) / 1000;
      const widthMeters = (panel.is_portrait ? model.width_mm : model.length_mm) / 1000;

      const latOffset = lengthMeters / 111320;
      const lngOffset = widthMeters / (111320 * Math.cos((panel.center_lat * Math.PI) / 180));

      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(panel.center_lat - latOffset / 2, panel.center_lng - lngOffset / 2),
        new google.maps.LatLng(panel.center_lat + latOffset / 2, panel.center_lng + lngOffset / 2)
      );

      const rect = new google.maps.Rectangle({
        bounds,
        strokeColor: "#0000FF",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#0000FF",
        fillOpacity: 0.3,
      });

      rect.setMap(mapRef.current);
      panelRectanglesRef.current.set(panel.id, rect);
    });
  }, [panels, panelModels]);

  useEffect(() => {
    if (!drawingRef.current) return;

    const google = (window as any).google;

    if (toolMode === "roof") {
      drawingRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    } else {
      drawingRef.current.setDrawingMode(null);
    }
  }, [toolMode]);

  const addPanelAt = async (lat: number, lng: number) => {
    if (!selectedRoofId || !selectedPanelModelId) return;

    const { data, error } = await supabase
      .from("proposal_panels")
      .insert({
        proposal_id: proposalId,
        roof_plane_id: selectedRoofId,
        panel_model_id: selectedPanelModelId,
        center_lat: lat,
        center_lng: lng,
        rotation_deg: panelRotation,
        is_portrait: panelOrientation === "portrait",
      })
      .select()
      .single();

    if (!error && data) {
      setPanels((prev) => [...prev, data]);
    }
  };

  const autoFillPanels = async () => {
    if (!selectedRoof || !selectedPanelModelId) return;

    setBusy("Auto-filling panels...");

    const model = panelModels.find((m) => m.id === selectedPanelModelId);
    if (!model) return;

    const lengthMeters = (panelOrientation === "portrait" ? model.length_mm : model.width_mm) / 1000;
    const widthMeters = (panelOrientation === "portrait" ? model.width_mm : model.length_mm) / 1000;

    const roofPath = selectedRoof.path;
    if (roofPath.length < 3) {
      setBusy(null);
      return;
    }

    let minLat = roofPath[0].lat;
    let maxLat = roofPath[0].lat;
    let minLng = roofPath[0].lng;
    let maxLng = roofPath[0].lng;

    roofPath.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    const latStepMeters = lengthMeters + rowSpacing;
    const lngStepMeters = widthMeters + colSpacing;

    const latStep = latStepMeters / 111320;
    const lngStep = lngStepMeters / (111320 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));

    const newPanels: any[] = [];

    for (let lat = minLat + latStep / 2; lat < maxLat; lat += latStep) {
      for (let lng = minLng + lngStep / 2; lng < maxLng; lng += lngStep) {
        const point = { lat, lng };
        const isInside = isPointInPolygon(point, roofPath);

        if (isInside) {
          newPanels.push({
            proposal_id: proposalId,
            roof_plane_id: selectedRoofId,
            panel_model_id: selectedPanelModelId,
            center_lat: lat,
            center_lng: lng,
            rotation_deg: panelRotation,
            is_portrait: panelOrientation === "portrait",
          });
        }
      }
    }

    if (newPanels.length > 0) {
      const { data, error } = await supabase
        .from("proposal_panels")
        .insert(newPanels)
        .select();

      if (!error && data) {
        setPanels((prev) => [...prev, ...data]);
      }
    }

    setBusy(null);
  };

  const clearAllPanels = async () => {
    if (!selectedRoofId) return;

    const panelsToClear = panels.filter((p) => p.roof_plane_id === selectedRoofId);
    const panelIds = panelsToClear.map((p) => p.id);

    if (panelIds.length === 0) return;

    await supabase.from("proposal_panels").delete().in("id", panelIds);

    setPanels((prev) => prev.filter((p) => p.roof_plane_id !== selectedRoofId));
  };

  const deleteRoof = async (roofId: string) => {
    await supabase.from("proposal_roof_planes").delete().eq("id", roofId);
    await supabase.from("proposal_panels").delete().eq("roof_plane_id", roofId);

    setRoofPlanes((prev) => prev.filter((r) => r.id !== roofId));
    setPanels((prev) => prev.filter((p) => p.roof_plane_id !== roofId));

    if (selectedRoofId === roofId) {
      setSelectedRoofId(null);
    }
  };

  function isPointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const selectedFinanceValue = useMemo(() => {
    if (!proposalDraft) return "cash";
    if ((proposalDraft.finance_type ?? "cash") === "cash") return "cash";
    return proposalDraft.finance_option_id ?? "cash";
  }, [proposalDraft]);

  if (!proposalId)
    return <div style={{ padding: 16 }}>Select a proposal first.</div>;

  if (!proposal)
    return <div style={{ padding: 16 }}>Loading proposal workspace…</div>;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const CollapsibleSection = ({
    id,
    icon: Icon,
    title,
    children,
  }: {
    id: string;
    icon: any;
    title: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections[id];
    return (
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 12, overflow: "hidden" }}>
        <button
          onClick={() => toggleSection(id)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon size={18} style={{ color: "#111827" }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{title}</span>
          </div>
          {isExpanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
        </button>
        {isExpanded && <div style={{ padding: "16px 20px" }}>{children}</div>}
      </div>
    );
  };

  const renderManageTab = () => (
    <div style={{ padding: 20 }}>
      <CollapsibleSection id="customer" icon={User} title="Customer Information">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Full Name
            </label>
            <input
              value={customer?.name ?? ""}
              onChange={(e) => setCustomer((c: any) => ({ ...c, name: e.target.value }))}
              placeholder="Enter customer name"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Email Address
            </label>
            <input
              type="email"
              value={customer?.email ?? ""}
              onChange={(e) => setCustomer((c: any) => ({ ...c, email: e.target.value }))}
              placeholder="customer@example.com"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={customer?.phone ?? ""}
              onChange={(e) => setCustomer((c: any) => ({ ...c, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>
        </div>

        <button
          onClick={async () => {
            if (!customer?.id) return;
            await supabase
              .from("customers")
              .update({
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
              })
              .eq("id", customer.id);
          }}
          style={{
            marginTop: 16,
            background: "#f97316",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Save Customer Information
        </button>
      </CollapsibleSection>

      <CollapsibleSection id="electricity" icon={Zap} title="Electricity Usage">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Data source
            </label>
            <select
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            >
              <option>Annual Consumption (kWh)</option>
              <option>Monthly Usage</option>
              <option>Utility Bill</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Annual kWh
            </label>
            <input
              type="number"
              value={proposalDraft.annual_consumption ?? ""}
              onChange={(e) =>
                setProposalDraft((p: any) => ({
                  ...p,
                  annual_consumption: Number(e.target.value),
                }))
              }
              placeholder="23000"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase
              .from("proposals")
              .update({
                annual_consumption: proposalDraft.annual_consumption ?? null,
              })
              .eq("id", proposalId);
          }}
          style={{
            marginTop: 16,
            background: "#f97316",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Save Electricity Usage
        </button>
      </CollapsibleSection>

      <CollapsibleSection id="rate" icon={DollarSign} title="Electricity Rate">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Utility Company
            </label>
            <input
              type="text"
              value={proposalDraft.utility_company ?? ""}
              onChange={(e) =>
                setProposalDraft((p: any) => ({
                  ...p,
                  utility_company: e.target.value,
                }))
              }
              placeholder="Enter utility company"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Current Rate ($/kWh)
            </label>
            <input
              type="number"
              step="0.01"
              value={proposalDraft.electricity_rate ?? ""}
              onChange={(e) =>
                setProposalDraft((p: any) => ({
                  ...p,
                  electricity_rate: Number(e.target.value),
                }))
              }
              placeholder="0.12"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase
              .from("proposals")
              .update({
                utility_company: proposalDraft.utility_company ?? null,
                electricity_rate: proposalDraft.electricity_rate ?? null,
              })
              .eq("id", proposalId);
          }}
          style={{
            marginTop: 16,
            background: "#f97316",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Save Electricity Rate
        </button>
      </CollapsibleSection>

      <CollapsibleSection id="system" icon={Package} title="System Specifications">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>Module Type</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: "#111827", textAlign: "right" }}>
              {selectedModel?.brand && selectedModel?.model
                ? `${selectedModel.brand} ${selectedModel.model} (${selectedModel.watts}W)`
                : "—"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>Panel Quantity</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{systemSummary.panelCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>System Size</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
              {fmt(systemSummary.systemKw, 2)} kW
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>Annual Production</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
              {fmt(systemSummary.annualProductionKwh, 0)} kWh
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
            <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>Offset</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#10b981" }}>
              {fmt(systemSummary.offsetPercent, 1)}%
            </span>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="pricing" icon={DollarSign} title="Pricing Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Total System Price ($)
            </label>
            <input
              type="number"
              value={proposalDraft.total_price ?? ""}
              onChange={(e) =>
                setProposalDraft((p: any) => ({
                  ...p,
                  total_price: Number(e.target.value),
                }))
              }
              placeholder="Enter total price"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Price Per Watt ($/W)
            </label>
            <input
              type="number"
              step="0.01"
              value={proposalDraft.price_per_watt ?? ""}
              onChange={(e) =>
                setProposalDraft((p: any) => ({
                  ...p,
                  price_per_watt: Number(e.target.value),
                }))
              }
              placeholder="Enter price per watt"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>
        </div>

        {proposalDraft.total_price && systemSummary.systemKw > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Calculated Price Per Watt</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              ${(proposalDraft.total_price / (systemSummary.systemKw * 1000)).toFixed(2)}/W
            </div>
          </div>
        )}

        <button
          onClick={async () => {
            await supabase
              .from("proposals")
              .update({
                total_price: proposalDraft.total_price ?? null,
                price_per_watt: proposalDraft.price_per_watt ?? null,
              })
              .eq("id", proposalId);
          }}
          style={{
            marginTop: 16,
            background: "#f97316",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Save Pricing
        </button>
      </CollapsibleSection>

      <CollapsibleSection id="financing" icon={CreditCard} title="Financing Options">
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Select Financing Plan
            </label>
            <select
              value={selectedFinanceValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "cash") {
                  setProposalDraft((p: any) => ({
                    ...p,
                    finance_type: "cash",
                    finance_option_id: null,
                  }));
                } else {
                  setProposalDraft((p: any) => ({
                    ...p,
                    finance_type: "finance",
                    finance_option_id: v,
                  }));
                }
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
              }}
            >
              {financingOptions.map((opt: any) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase
              .from("proposals")
              .update({
                finance_type: proposalDraft.finance_type ?? "cash",
                finance_option_id: proposalDraft.finance_option_id ?? null,
              })
              .eq("id", proposalId);
          }}
          style={{
            marginTop: 16,
            background: "#f97316",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Save Financing Option
        </button>
      </CollapsibleSection>

      {(proposalDraft.finance_type ?? "cash") === "cash" && (
        <CollapsibleSection id="payment" icon={DollarSign} title="Cash Payment Schedule">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Deposit Amount ($)
              </label>
              <input
                type="number"
                value={proposalDraft.cash_deposit ?? ""}
                onChange={(e) =>
                  setProposalDraft((p: any) => ({
                    ...p,
                    cash_deposit: Number(e.target.value),
                  }))
                }
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                2nd Payment ($)
              </label>
              <input
                type="number"
                value={proposalDraft.cash_second_payment ?? ""}
                onChange={(e) =>
                  setProposalDraft((p: any) => ({
                    ...p,
                    cash_second_payment: Number(e.target.value),
                  }))
                }
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Final Payment ($)
              </label>
              <input
                type="number"
                value={proposalDraft.cash_final_payment ?? ""}
                onChange={(e) =>
                  setProposalDraft((p: any) => ({
                    ...p,
                    cash_final_payment: Number(e.target.value),
                  }))
                }
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#111827",
                }}
              />
            </div>
          </div>

          <button
            onClick={async () => {
              await supabase
                .from("proposals")
                .update({
                  cash_deposit: proposalDraft.cash_deposit ?? null,
                  cash_second_payment: proposalDraft.cash_second_payment ?? null,
                  cash_final_payment: proposalDraft.cash_final_payment ?? null,
                })
                .eq("id", proposalId);
            }}
            style={{
              marginTop: 16,
              background: "#f97316",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Save Payment Schedule
          </button>
        </CollapsibleSection>
      )}
    </div>
  );

  const renderSolarDesignTab = () => (
    <div style={{ display: "flex", height: "calc(100vh - 180px)", gap: 16 }}>
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", paddingRight: 8, background: "#fff", borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Design Tools</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Panel Model</div>
          <select
            value={selectedPanelModelId ?? ""}
            onChange={(e) => setSelectedPanelModelId(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
              color: "#111827",
            }}
          >
            {panelModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.brand} {model.model} ({model.watts}W)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setToolMode(toolMode === "roof" ? "none" : "roof")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: toolMode === "roof" ? "#f97316" : "#fff",
              color: toolMode === "roof" ? "#fff" : "#111827",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Square size={16} />
            Draw Roof Plane
          </button>

          <button
            onClick={() => setToolMode(toolMode === "circle" ? "none" : "circle")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: toolMode === "circle" ? "#f97316" : "#fff",
              color: toolMode === "circle" ? "#fff" : "#111827",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Circle size={16} />
            Add Circle Obstruction
          </button>

          <button
            onClick={() => setToolMode(toolMode === "rect" ? "none" : "rect")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: toolMode === "rect" ? "#f97316" : "#fff",
              color: toolMode === "rect" ? "#fff" : "#111827",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Square size={16} />
            Add Rectangle Obstruction
          </button>

          <button
            onClick={() => setToolMode(toolMode === "tree" ? "none" : "tree")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: toolMode === "tree" ? "#f97316" : "#fff",
              color: toolMode === "tree" ? "#fff" : "#111827",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <TreeDeciduous size={16} />
            Add Tree
          </button>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Panel Placement</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Orientation</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPanelOrientation("portrait")}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: panelOrientation === "portrait" ? "#f97316" : "#fff",
                  color: panelOrientation === "portrait" ? "#fff" : "#111827",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Portrait
              </button>
              <button
                onClick={() => setPanelOrientation("landscape")}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: panelOrientation === "landscape" ? "#f97316" : "#fff",
                  color: panelOrientation === "landscape" ? "#fff" : "#111827",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Landscape
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              Rotation (degrees): {panelRotation}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={panelRotation}
              onChange={(e) => setPanelRotation(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Row Spacing (ft)
              </label>
              <input
                type="number"
                step="0.1"
                value={rowSpacing}
                onChange={(e) => setRowSpacing(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Col Spacing (ft)
              </label>
              <input
                type="number"
                step="0.1"
                value={colSpacing}
                onChange={(e) => setColSpacing(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <button
            onClick={autoFillPanels}
            disabled={!selectedRoofId}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: "10px 14px",
              background: selectedRoofId ? "#10b981" : "#e5e7eb",
              color: selectedRoofId ? "#fff" : "#9ca3af",
              border: "none",
              borderRadius: 6,
              cursor: selectedRoofId ? "pointer" : "not-allowed",
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            <Grid size={16} />
            Auto-Fill Panels
          </button>

          <button
            onClick={clearAllPanels}
            disabled={!selectedRoofId}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: "10px 14px",
              background: selectedRoofId ? "#ef4444" : "#e5e7eb",
              color: selectedRoofId ? "#fff" : "#9ca3af",
              border: "none",
              borderRadius: 6,
              cursor: selectedRoofId ? "pointer" : "not-allowed",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Trash2 size={16} />
            Clear Panels
          </button>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Roof Planes</div>
          {roofPlanes.map((roof) => (
            <div
              key={roof.id}
              onClick={() => setSelectedRoofId(roof.id)}
              style={{
                padding: "10px 12px",
                background: selectedRoofId === roof.id ? "#fef3c7" : "#f9fafb",
                border: selectedRoofId === roof.id ? "2px solid #f97316" : "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{roof.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {panels.filter((p) => p.roof_plane_id === roof.id).length} panels
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRoof(roof.id);
                }}
                style={{
                  padding: "4px 8px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {busy && (
          <div style={{ fontSize: 12, color: "#f97316", fontWeight: 600, marginTop: 8 }}>
            {busy}
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        {mapsError ? (
          <div style={{ padding: 20, color: "#ef4444" }}>{mapsError}</div>
        ) : mapsLoading ? (
          <div style={{ padding: 20 }}>Loading map...</div>
        ) : (
          <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
        )}

        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "12px 24px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>System Summary</div>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Panels</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{systemSummary.panelCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>System Size</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{fmt(systemSummary.systemKw, 2)} kW</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Production</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{fmt(systemSummary.annualProductionKwh, 0)} kWh</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Offset</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>{fmt(systemSummary.offsetPercent, 1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEnergyTab = () => (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Energy Usage Analysis</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Energy usage details and charts will be displayed here.</div>
      </div>
    </div>
  );

  const renderPaymentsTab = () => (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Payment Details</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Payment information and history will be displayed here.</div>
      </div>
    </div>
  );

  const renderOnlineProposalTab = () => (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Online Proposal</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Online proposal preview will be displayed here.</div>
      </div>
    </div>
  );

  const renderPDFProposalTab = () => (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>PDF Proposal</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>PDF proposal generation options will be displayed here.</div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "calc(100vh - 64px)", overflow: "auto", background: "#f5f5f7" }}>
      <div style={{ maxWidth: "100%", margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          {onBack && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onBack();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 13,
                color: "#374151",
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              Proposal Configuration
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {proposal?.formatted_address ?? "Configure customer details and pricing"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid #e5e7eb", background: "#fff", borderRadius: "8px 8px 0 0", padding: "0 12px" }}>
          {[
            { id: "manage", label: "Manage", icon: User },
            { id: "energy", label: "Energy", icon: Zap },
            { id: "solar-design", label: "Solar Design", icon: Pencil },
            { id: "payments", label: "Payments", icon: CreditCard },
            { id: "online", label: "Online Proposal", icon: FileText },
            { id: "pdf", label: "PDF Proposal", icon: File },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #f97316" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: 13,
                color: activeTab === tab.id ? "#111827" : "#6b7280",
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ background: "#f5f5f7", minHeight: "400px" }}>
          {activeTab === "manage" && renderManageTab()}
          {activeTab === "energy" && renderEnergyTab()}
          {activeTab === "solar-design" && renderSolarDesignTab()}
          {activeTab === "payments" && renderPaymentsTab()}
          {activeTab === "online" && renderOnlineProposalTab()}
          {activeTab === "pdf" && renderPDFProposalTab()}
        </div>
      </div>
    </div>
  );
}
