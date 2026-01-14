import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type SelectedAddress = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

type Proposal = {
  id: string;
  status: string;
  place_id: string;
  formatted_address: string;
  lat: number;
  lng: number;
  panel_make: string;
  panel_model: string;
  panel_watts: number;
  panel_orientation: "portrait" | "landscape";
};

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

type ToolMode = "none" | "roof" | "circle" | "rect" | "tree" | "add-panel" | "delete-panel";

export default function Proposals() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const autocompleteHostRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const locationMarkerRef = useRef<google.maps.Marker | null>(null);

  const [selected, setSelected] = useState<SelectedAddress | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);

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

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 100;

    const checkGoogleMaps = () => {
      attempts++;

      if (isGoogleReady()) {
        console.log('Google Maps loaded successfully');
        setMapsLoading(false);
        setMapsError(null);
        return;
      }

      if (attempts >= maxAttempts) {
        console.error('Google Maps failed to load after', attempts, 'attempts');
        console.log('Google object:', (window as any).google);
        setMapsLoading(false);
        setMapsError(
          "Google Maps failed to load. Please refresh the page or check your internet connection."
        );
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

      if (error) {
        console.error("Failed to load panel models:", error);
        return;
      }

      setPanelModels(data || []);
      if (data && data.length > 0 && !selectedPanelModelId) {
        setSelectedPanelModelId(data[0].id);
      }
    }

    loadPanelModels();
  }, []);

  useEffect(() => {
    if (!mapDivRef.current) return;
    if (mapsLoading || !isGoogleReady()) return;
    if (mapRef.current) return;

    try {
      const map = new google.maps.Map(mapDivRef.current, {
        center: { lat: 39.7392, lng: -104.9903 },
        zoom: 19,
        mapTypeId: "satellite",
        tilt: 0,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: true,
      });
      mapRef.current = map;

      const input = document.createElement("input");
      input.placeholder = "Type address and select...";
      input.style.width = "100%";
      input.style.height = "42px";
      input.style.borderRadius = "10px";
      input.style.border = "1px solid rgba(0,0,0,0.2)";
      input.style.padding = "0 12px";
      input.style.fontSize = "14px";

      if (autocompleteHostRef.current) {
        autocompleteHostRef.current.innerHTML = "";
        autocompleteHostRef.current.appendChild(input);
      }

      const ac = new google.maps.places.Autocomplete(input, { types: ["address"] });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;

      const payload: SelectedAddress = {
        placeId: place.place_id || "",
        formattedAddress: place.formatted_address || place.name || "",
        lat: loc.lat(),
        lng: loc.lng(),
      };
      setSelected(payload);

      map.setCenter({ lat: payload.lat, lng: payload.lng });
      map.setZoom(20);

      if (locationMarkerRef.current) {
        locationMarkerRef.current.setMap(null);
      }

      locationMarkerRef.current = new google.maps.Marker({
        map,
        position: { lat: payload.lat, lng: payload.lng },
        title: payload.formattedAddress,
        animation: google.maps.Animation.DROP,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillOpacity: 1,
          fillColor: "#ef4444",
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });

      setProposal(null);
      setRoofPlanes([]);
      setObstructions([]);
      setSelectedRoofId(null);
      setToolMode("none");

      roofPolysRef.current.forEach((p) => p.setMap(null));
      roofPolysRef.current.clear();
      obstructionShapesRef.current.forEach((s) => {
        if (s?.setMap) s.setMap(null);
      });
      obstructionShapesRef.current.clear();
    });

    const drawing = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        clickable: true,
        editable: false,
        fillOpacity: 0.18,
        strokeWeight: 2,
      },
      rectangleOptions: {
        clickable: true,
        editable: true,
        fillOpacity: 0.18,
        strokeWeight: 2,
      },
      circleOptions: {
        clickable: true,
        editable: true,
        fillOpacity: 0.18,
        strokeWeight: 2,
      },
    });
    drawing.setMap(map);
    drawingRef.current = drawing;

    } catch (error: any) {
      console.error('Error initializing map:', error);
      setMapsError(`Failed to initialize map: ${error.message || 'Unknown error'}`);
    }
  }, [mapsLoading]);

  useEffect(() => {
    const drawing = drawingRef.current;
    const map = mapRef.current;
    if (!drawing || !map) return;

    const polygonListener = google.maps.event.addListener(drawing, "polygoncomplete", async (poly: google.maps.Polygon) => {
      if (!proposal) {
        poly.setMap(null);
        return;
      }
      try {
        setBusy("Saving roof plane...");

        const path = poly
          .getPath()
          .getArray()
          .map((p) => ({ lat: p.lat(), lng: p.lng() }));

        const m2 = (google.maps as any).geometry?.spherical?.computeArea(poly.getPath());
        const areaSqft = typeof m2 === "number" ? m2ToFt2(m2) : null;

        const name = `Roof Plane ${roofPlanes.length + 1}`;

        const { data, error } = await supabase
          .from("proposal_roof_planes")
          .insert({
            proposal_id: proposal.id,
            name,
            pitch_deg: 0,
            path,
            area_sqft: areaSqft,
          })
          .select()
          .single();

        if (error) throw error;

        poly.setEditable(false);

        const row: RoofPlaneRow = {
          id: data.id,
          proposal_id: data.proposal_id,
          name: data.name,
          pitch_deg: data.pitch_deg,
          path: data.path,
          area_sqft: data.area_sqft,
        };

        roofPolysRef.current.set(row.id, poly);
        bindRoofPolyEvents(row.id, poly);

        setRoofPlanes((prev) => [...prev, row]);
        setSelectedRoofId(row.id);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "Failed to save roof plane.");
        poly.setMap(null);
      } finally {
        setBusy(null);
      }
    });

    const rectangleListener = google.maps.event.addListener(
      drawing,
      "rectanglecomplete",
      async (rect: google.maps.Rectangle) => {
        if (!proposal) {
          rect.setMap(null);
          return;
        }
        try {
          setBusy("Saving rectangle obstruction...");

          const bounds = rect.getBounds();
          if (!bounds) throw new Error("Missing bounds");

          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          const center = bounds.getCenter();

          const north = new google.maps.LatLng(ne.lat(), center.lng());
          const south = new google.maps.LatLng(sw.lat(), center.lng());
          const east = new google.maps.LatLng(center.lat(), ne.lng());
          const west = new google.maps.LatLng(center.lat(), sw.lng());

          const mNS = (google.maps as any).geometry?.spherical?.computeDistanceBetween(north, south);
          const mEW = (google.maps as any).geometry?.spherical?.computeDistanceBetween(east, west);

          const widthFt = typeof mEW === "number" ? mToFt(mEW) : null;
          const heightFt = typeof mNS === "number" ? mToFt(mNS) : null;

          const { data, error } = await supabase
            .from("proposal_obstructions")
            .insert({
              proposal_id: proposal.id,
              type: "rect",
              roof_plane_id: selectedRoofId,
              center_lat: center.lat(),
              center_lng: center.lng(),
              width_ft: widthFt,
              height_ft: heightFt,
              rotation_deg: 0,
            })
            .select()
            .single();

          if (error) throw error;

          obstructionShapesRef.current.set(data.id, rect);
          bindObstructionEvents(data.id, rect);

          setObstructions((prev) => [
            ...prev,
            {
              id: data.id,
              proposal_id: data.proposal_id,
              type: data.type,
              roof_plane_id: data.roof_plane_id,
              center_lat: data.center_lat,
              center_lng: data.center_lng,
              radius_ft: data.radius_ft,
              width_ft: data.width_ft,
              height_ft: data.height_ft,
              rotation_deg: data.rotation_deg,
            },
          ]);
        } catch (e: any) {
          console.error(e);
          alert(e?.message ?? "Failed to save rectangle obstruction.");
          rect.setMap(null);
        } finally {
          setBusy(null);
        }
      }
    );

    const circleListener = google.maps.event.addListener(drawing, "circlecomplete", async (circle: google.maps.Circle) => {
      if (!proposal) {
        circle.setMap(null);
        return;
      }
      try {
        setBusy("Saving circle obstruction...");

        const center = circle.getCenter();
        if (!center) throw new Error("Missing center");

        const radiusM = circle.getRadius();
        const radiusFt = mToFt(radiusM);

        const { data, error } = await supabase
          .from("proposal_obstructions")
          .insert({
            proposal_id: proposal.id,
            type: toolMode === "tree" ? "tree" : "circle",
            roof_plane_id: selectedRoofId,
            center_lat: center.lat(),
            center_lng: center.lng(),
            radius_ft: radiusFt,
          })
          .select()
          .single();

        if (error) throw error;

        obstructionShapesRef.current.set(data.id, circle);
        bindObstructionEvents(data.id, circle);

        setObstructions((prev) => [
          ...prev,
          {
            id: data.id,
            proposal_id: data.proposal_id,
            type: data.type,
            roof_plane_id: data.roof_plane_id,
            center_lat: data.center_lat,
            center_lng: data.center_lng,
            radius_ft: data.radius_ft,
            width_ft: data.width_ft,
            height_ft: data.height_ft,
            rotation_deg: data.rotation_deg,
          },
        ]);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "Failed to save circle obstruction.");
        circle.setMap(null);
      } finally {
        setBusy(null);
      }
    });

    const mapClickListener = map.addListener("click", async (e: google.maps.MapMouseEvent) => {
      if (!proposal) return;
      if (toolMode !== "tree") return;
      if (!e.latLng) return;

      try {
        setBusy("Saving tree...");

        const center = e.latLng;

        const { data, error } = await supabase
          .from("proposal_obstructions")
          .insert({
            proposal_id: proposal.id,
            type: "tree",
            roof_plane_id: selectedRoofId,
            center_lat: center.lat(),
            center_lng: center.lng(),
            radius_ft: 12,
          })
          .select()
          .single();

        if (error) throw error;

        const marker = new google.maps.Marker({
          map,
          position: center,
          title: "Tree",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillOpacity: 1,
            fillColor: "#16a34a",
            strokeColor: "#065f46",
            strokeWeight: 2,
          },
        });

        const canopy = new google.maps.Circle({
          map,
          center,
          radius: (data.radius_ft ?? 12) / 3.28084,
          fillOpacity: 0.08,
          strokeOpacity: 0.35,
          strokeWeight: 2,
        });

        obstructionShapesRef.current.set(`${data.id}:marker`, marker);
        obstructionShapesRef.current.set(`${data.id}:canopy`, canopy);

        bindObstructionEvents(data.id, marker);
        bindObstructionEvents(data.id, canopy);

        setObstructions((prev) => [
          ...prev,
          {
            id: data.id,
            proposal_id: data.proposal_id,
            type: data.type,
            roof_plane_id: data.roof_plane_id,
            center_lat: data.center_lat,
            center_lng: data.center_lng,
            radius_ft: data.radius_ft,
            width_ft: data.width_ft,
            height_ft: data.height_ft,
            rotation_deg: data.rotation_deg,
          },
        ]);
      } catch (err: any) {
        console.error(err);
        alert(err?.message ?? "Failed to save tree.");
      } finally {
        setBusy(null);
      }
    });

    function bindRoofPolyEvents(id: string, poly: google.maps.Polygon) {
      poly.addListener("click", () => {
        setSelectedRoofId(id);
      });
    }

    function bindObstructionEvents(id: string, shape: any) {
      if (shape?.addListener) {
        shape.addListener("click", () => {
        });
      }
    }

    return () => {
      google.maps.event.removeListener(polygonListener);
      google.maps.event.removeListener(rectangleListener);
      google.maps.event.removeListener(circleListener);
      google.maps.event.removeListener(mapClickListener);
    };
  }, [proposal, toolMode, roofPlanes.length, selectedRoofId]);

  useEffect(() => {
    const drawing = drawingRef.current;
    if (!drawing) return;

    if (!proposal) {
      drawing.setDrawingMode(null);
      return;
    }

    if (toolMode === "roof") drawing.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    else if (toolMode === "rect") drawing.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
    else if (toolMode === "circle") drawing.setDrawingMode(google.maps.drawing.OverlayType.CIRCLE);
    else if (toolMode === "tree") drawing.setDrawingMode(null);
    else drawing.setDrawingMode(null);
  }, [toolMode, proposal]);

  async function createProposal() {
    if (!selected) return;

    try {
      setBusy("Creating proposal...");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("proposals")
        .insert({
          created_by: user.id,
          status: "draft",
          place_id: selected.placeId,
          formatted_address: selected.formattedAddress,
          lat: selected.lat,
          lng: selected.lng,
          panel_make: "Aptos",
          panel_model: "410W",
          panel_watts: 410,
          panel_orientation: "portrait",
        })
        .select()
        .single();

      if (error) throw error;

      setProposal({
        id: data.id,
        status: data.status,
        place_id: data.place_id,
        formatted_address: data.formatted_address,
        lat: data.lat,
        lng: data.lng,
        panel_make: data.panel_make,
        panel_model: data.panel_model,
        panel_watts: data.panel_watts,
        panel_orientation: data.panel_orientation,
      });

      if (mapRef.current) {
        mapRef.current.setCenter({ lat: data.lat, lng: data.lng });
        mapRef.current.setZoom(20);
      }

      await reloadProposalData(data.id);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to create proposal.");
    } finally {
      setBusy(null);
    }
  }

  async function reloadProposalData(proposalId: string) {
    const { data: roofs, error: roofErr } = await supabase
      .from("proposal_roof_planes")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    if (roofErr) throw roofErr;

    const { data: obs, error: obsErr } = await supabase
      .from("proposal_obstructions")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    if (obsErr) throw obsErr;

    const { data: panelsData, error: panelsErr } = await supabase
      .from("proposal_panels")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    if (panelsErr) throw panelsErr;

    setRoofPlanes(
      (roofs ?? []).map((r: any) => ({
        id: r.id,
        proposal_id: r.proposal_id,
        name: r.name,
        pitch_deg: r.pitch_deg,
        path: r.path,
        area_sqft: r.area_sqft,
      }))
    );

    setObstructions(
      (obs ?? []).map((o: any) => ({
        id: o.id,
        proposal_id: o.proposal_id,
        type: o.type,
        roof_plane_id: o.roof_plane_id,
        center_lat: o.center_lat,
        center_lng: o.center_lng,
        radius_ft: o.radius_ft,
        width_ft: o.width_ft,
        height_ft: o.height_ft,
        rotation_deg: o.rotation_deg,
      }))
    );

    setPanels(
      (panelsData ?? []).map((p: any) => ({
        id: p.id,
        proposal_id: p.proposal_id,
        roof_plane_id: p.roof_plane_id,
        panel_model_id: p.panel_model_id,
        center_lat: p.center_lat,
        center_lng: p.center_lng,
        rotation_deg: p.rotation_deg,
        is_portrait: p.is_portrait,
      }))
    );

    renderAllShapes(roofs ?? [], obs ?? [], panelsData ?? []);
  }

  function renderAllShapes(roofs: any[], obs: any[], panelsData: any[]) {
    const map = mapRef.current;
    if (!map) return;

    roofPolysRef.current.forEach((p) => p.setMap(null));
    roofPolysRef.current.clear();
    obstructionShapesRef.current.forEach((s) => {
      if (s?.setMap) s.setMap(null);
    });
    obstructionShapesRef.current.clear();
    panelRectanglesRef.current.forEach((r) => r.setMap(null));
    panelRectanglesRef.current.clear();

    for (const r of roofs) {
      const poly = new google.maps.Polygon({
        map,
        paths: r.path,
        clickable: true,
        editable: false,
        fillOpacity: 0.18,
        strokeWeight: 2,
      });
      roofPolysRef.current.set(r.id, poly);
      poly.addListener("click", () => setSelectedRoofId(r.id));
    }

    for (const o of obs) {
      const center = { lat: o.center_lat, lng: o.center_lng };

      if (o.type === "circle") {
        const circle = new google.maps.Circle({
          map,
          center,
          radius: ((o.radius_ft ?? 6) / 3.28084),
          editable: true,
          fillOpacity: 0.12,
          strokeOpacity: 0.45,
          strokeWeight: 2,
        });
        obstructionShapesRef.current.set(o.id, circle);
      } else if (o.type === "rect") {
        const latLng = new google.maps.LatLng(center.lat, center.lng);
        const d = (o.width_ft ?? 8) / 3.28084;
        const e = (o.height_ft ?? 8) / 3.28084;

        const north = (google.maps as any).geometry?.spherical?.computeOffset(latLng, e / 2, 0);
        const south = (google.maps as any).geometry?.spherical?.computeOffset(latLng, e / 2, 180);
        const east = (google.maps as any).geometry?.spherical?.computeOffset(latLng, d / 2, 90);
        const west = (google.maps as any).geometry?.spherical?.computeOffset(latLng, d / 2, 270);

        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(south.lat(), west.lng()),
          new google.maps.LatLng(north.lat(), east.lng())
        );

        const rect = new google.maps.Rectangle({
          map,
          bounds,
          editable: true,
          fillOpacity: 0.12,
          strokeOpacity: 0.45,
          strokeWeight: 2,
        });
        obstructionShapesRef.current.set(o.id, rect);
      } else if (o.type === "tree") {
        const marker = new google.maps.Marker({
          map,
          position: center,
          title: "Tree",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillOpacity: 1,
            fillColor: "#16a34a",
            strokeColor: "#065f46",
            strokeWeight: 2,
          },
        });

        const canopy = new google.maps.Circle({
          map,
          center,
          radius: ((o.radius_ft ?? 12) / 3.28084),
          fillOpacity: 0.08,
          strokeOpacity: 0.35,
          strokeWeight: 2,
        });

        obstructionShapesRef.current.set(`${o.id}:marker`, marker);
        obstructionShapesRef.current.set(`${o.id}:canopy`, canopy);
      }
    }

    for (const p of panelsData) {
      const panelModel = panelModels.find((pm) => pm.id === p.panel_model_id);
      if (!panelModel) continue;

      const lengthM = panelModel.length_mm / 1000;
      const widthM = panelModel.width_mm / 1000;

      const panelWidth = p.is_portrait ? widthM : lengthM;
      const panelHeight = p.is_portrait ? lengthM : widthM;

      const rect = createPanelRectangle(map, p.center_lat, p.center_lng, panelWidth, panelHeight, p.rotation_deg);
      panelRectanglesRef.current.set(p.id, rect);
    }
  }

  function createPanelRectangle(
    map: google.maps.Map,
    centerLat: number,
    centerLng: number,
    widthM: number,
    heightM: number,
    rotationDeg: number
  ): google.maps.Rectangle {
    const center = new google.maps.LatLng(centerLat, centerLng);

    const latOffsetM = heightM / 2;
    const lngOffsetM = widthM / 2;

    const latDelta = latOffsetM / 111320;
    const lngDelta = lngOffsetM / (111320 * Math.cos(centerLat * Math.PI / 180));

    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(centerLat - latDelta, centerLng - lngDelta),
      new google.maps.LatLng(centerLat + latDelta, centerLng + lngDelta)
    );

    const rect = new google.maps.Rectangle({
      map,
      bounds,
      fillColor: "#3b82f6",
      fillOpacity: 0.4,
      strokeColor: "#1e40af",
      strokeWeight: 1,
      clickable: false,
      editable: false,
    });

    return rect;
  }

  async function updatePitchDegrees(newDeg: number) {
    if (!selectedRoof) return;

    setRoofPlanes((prev) =>
      prev.map((r) => (r.id === selectedRoof.id ? { ...r, pitch_deg: newDeg } : r))
    );

    const { error } = await supabase
      .from("proposal_roof_planes")
      .update({ pitch_deg: newDeg })
      .eq("id", selectedRoof.id);

    if (error) {
      alert(error.message);
    }
  }

  async function autoFillPanels() {
    if (!selectedRoof || !proposal || !selectedPanelModelId) {
      alert("Please select a roof plane and panel model first.");
      return;
    }

    const panelModel = panelModels.find((pm) => pm.id === selectedPanelModelId);
    if (!panelModel) return;

    try {
      setBusy("Auto-filling panels...");

      const lengthM = panelModel.length_mm / 1000;
      const widthM = panelModel.width_mm / 1000;

      const panelWidth = panelOrientation === "portrait" ? widthM : lengthM;
      const panelHeight = panelOrientation === "portrait" ? lengthM : widthM;

      const rowSpacingM = rowSpacing * 0.3048;
      const colSpacingM = colSpacing * 0.3048;

      const roofPoly = roofPolysRef.current.get(selectedRoof.id);
      if (!roofPoly) return;

      const bounds = new google.maps.LatLngBounds();
      roofPoly.getPath().forEach((latLng) => bounds.extend(latLng));

      const center = bounds.getCenter();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const latSpan = ne.lat() - sw.lat();
      const lngSpan = ne.lng() - sw.lng();

      const rowStep = (panelHeight + rowSpacingM) / 111320;
      const colStep = (panelWidth + colSpacingM) / (111320 * Math.cos(center.lat() * Math.PI / 180));

      const rows = Math.ceil(latSpan / rowStep) + 2;
      const cols = Math.ceil(lngSpan / colStep) + 2;

      const startLat = sw.lat() - rowStep;
      const startLng = sw.lng() - colStep;

      const newPanels: any[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const lat = startLat + row * rowStep;
          const lng = startLng + col * colStep;

          if (!isPointInPolygon({ lat, lng }, roofPoly)) continue;

          const panelCorners = getPanelCorners(lat, lng, panelWidth, panelHeight, panelRotation);
          const allCornersInside = panelCorners.every((corner) =>
            isPointInPolygon(corner, roofPoly)
          );

          if (!allCornersInside) continue;

          const obstructionsList = obstructions.filter(
            (o) => !o.roof_plane_id || o.roof_plane_id === selectedRoof.id
          );
          const overlapsObstruction = obstructionsList.some((obs) =>
            panelOverlapsObstruction(lat, lng, panelWidth, panelHeight, obs)
          );

          if (overlapsObstruction) continue;

          newPanels.push({
            proposal_id: proposal.id,
            roof_plane_id: selectedRoof.id,
            panel_model_id: selectedPanelModelId,
            center_lat: lat,
            center_lng: lng,
            rotation_deg: panelRotation,
            is_portrait: panelOrientation === "portrait",
          });
        }
      }

      if (newPanels.length === 0) {
        alert("No valid panel positions found. Try adjusting spacing or roof plane.");
        setBusy(null);
        return;
      }

      const { error } = await supabase.from("proposal_panels").insert(newPanels);

      if (error) throw error;

      await reloadProposalData(proposal.id);
      alert(`Successfully placed ${newPanels.length} panels!`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to auto-fill panels.");
    } finally {
      setBusy(null);
    }
  }

  function getPanelCorners(
    centerLat: number,
    centerLng: number,
    widthM: number,
    heightM: number,
    rotationDeg: number
  ): Array<{ lat: number; lng: number }> {
    const latDelta = heightM / 2 / 111320;
    const lngDelta = widthM / 2 / (111320 * Math.cos(centerLat * Math.PI / 180));

    return [
      { lat: centerLat - latDelta, lng: centerLng - lngDelta },
      { lat: centerLat - latDelta, lng: centerLng + lngDelta },
      { lat: centerLat + latDelta, lng: centerLng + lngDelta },
      { lat: centerLat + latDelta, lng: centerLng - lngDelta },
    ];
  }

  function isPointInPolygon(point: { lat: number; lng: number }, poly: google.maps.Polygon): boolean {
    return google.maps.geometry.poly.containsLocation(
      new google.maps.LatLng(point.lat, point.lng),
      poly
    );
  }

  function panelOverlapsObstruction(
    panelLat: number,
    panelLng: number,
    panelWidthM: number,
    panelHeightM: number,
    obs: ObstructionRow
  ): boolean {
    const panelLatDelta = panelHeightM / 2 / 111320;
    const panelLngDelta = panelWidthM / 2 / (111320 * Math.cos(panelLat * Math.PI / 180));

    if (obs.type === "circle" || obs.type === "tree") {
      const radiusM = (obs.radius_ft ?? 12) / 3.28084;
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(panelLat, panelLng),
        new google.maps.LatLng(obs.center_lat, obs.center_lng)
      );
      return distance < radiusM + Math.max(panelWidthM, panelHeightM) / 2;
    } else if (obs.type === "rect") {
      const obsWidthM = (obs.width_ft ?? 4) / 3.28084;
      const obsHeightM = (obs.height_ft ?? 4) / 3.28084;
      const obsLatDelta = obsHeightM / 2 / 111320;
      const obsLngDelta = obsWidthM / 2 / (111320 * Math.cos(obs.center_lat * Math.PI / 180));

      const panelLeft = panelLng - panelLngDelta;
      const panelRight = panelLng + panelLngDelta;
      const panelTop = panelLat + panelLatDelta;
      const panelBottom = panelLat - panelLatDelta;

      const obsLeft = obs.center_lng - obsLngDelta;
      const obsRight = obs.center_lng + obsLngDelta;
      const obsTop = obs.center_lat + obsLatDelta;
      const obsBottom = obs.center_lat - obsLatDelta;

      return !(panelRight < obsLeft || panelLeft > obsRight || panelTop < obsBottom || panelBottom > obsTop);
    }

    return false;
  }

  async function clearPanels() {
    if (!proposal) return;
    if (!confirm("Clear all panels from this proposal?")) return;

    try {
      setBusy("Clearing panels...");

      const { error } = await supabase
        .from("proposal_panels")
        .delete()
        .eq("proposal_id", proposal.id);

      if (error) throw error;

      await reloadProposalData(proposal.id);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to clear panels.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteRoofPlane(roofId: string) {
    if (!confirm("Delete this roof plane and all its panels?")) return;

    try {
      setBusy("Deleting roof plane...");

      const { error } = await supabase
        .from("proposal_roof_planes")
        .delete()
        .eq("id", roofId);

      if (error) throw error;

      if (proposal) {
        await reloadProposalData(proposal.id);
      }

      if (selectedRoofId === roofId) {
        setSelectedRoofId(null);
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to delete roof plane.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteObstruction(obsId: string) {
    if (!confirm("Delete this obstruction?")) return;

    try {
      setBusy("Deleting obstruction...");

      const { error } = await supabase
        .from("proposal_obstructions")
        .delete()
        .eq("id", obsId);

      if (error) throw error;

      if (proposal) {
        await reloadProposalData(proposal.id);
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to delete obstruction.");
    } finally {
      setBusy(null);
    }
  }

  const selectedPanelModel = useMemo(
    () => panelModels.find((pm) => pm.id === selectedPanelModelId) ?? null,
    [panelModels, selectedPanelModelId]
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", gap: 16, padding: 16 }}>
      <div style={{ width: 440, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Proposals</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Aptos 410W • Portrait (default). Draw roof planes + add obstructions.
          </div>
        </div>

        {mapsLoading && (
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Loading Google Maps...
          </div>
        )}

        {mapsError && (
          <div style={{ color: "crimson", fontSize: 13 }}>
            <strong>Maps error:</strong> {mapsError}
          </div>
        )}

        <div>
          <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.7 }}>
            Address search (select from dropdown)
          </div>
          <div ref={autocompleteHostRef} />
        </div>

        {selected && (
          <div style={{ fontSize: 13, lineHeight: 1.35 }}>
            <div><strong>Selected:</strong></div>
            <div>{selected.formattedAddress}</div>
            <div style={{ opacity: 0.75 }}>
              {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
            </div>
          </div>
        )}

        {!proposal && selected && (
          <button
            onClick={createProposal}
            disabled={!!busy}
            style={{
              height: 44,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#111827",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {busy ? busy : "Create Proposal"}
          </button>
        )}

        {proposal && (
          <>
            <div style={{ fontSize: 13 }}>
              <strong>Proposal:</strong> {proposal.id.slice(0, 8)}… • <span style={{ opacity: 0.75 }}>{proposal.status}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => setToolMode(toolMode === "roof" ? "none" : "roof")}
                style={toolButtonStyle(toolMode === "roof")}
              >
                Draw Roof Plane
              </button>
              <button
                onClick={() => setToolMode("none")}
                style={toolButtonStyle(toolMode === "none")}
              >
                Stop Tool
              </button>

              <button
                onClick={() => setToolMode(toolMode === "rect" ? "none" : "rect")}
                style={toolButtonStyle(toolMode === "rect")}
                disabled={!proposal}
              >
                Square/Rect Obstruction
              </button>

              <button
                onClick={() => setToolMode(toolMode === "circle" ? "none" : "circle")}
                style={toolButtonStyle(toolMode === "circle")}
                disabled={!proposal}
              >
                Circle Obstruction
              </button>

              <button
                onClick={() => setToolMode(toolMode === "tree" ? "none" : "tree")}
                style={toolButtonStyle(toolMode === "tree")}
                disabled={!proposal}
              >
                Tree (click to place)
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Active:</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{toolMode}</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Roof Planes</div>

              {roofPlanes.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  Click <strong>Draw Roof Plane</strong> then draw on the roof. Double-click to finish.
                </div>
              )}

              {roofPlanes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoofId(r.id)}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: r.id === selectedRoofId ? "2px solid #111827" : "1px solid rgba(0,0,0,0.12)",
                    marginTop: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {r.area_sqft ? `${Math.round(r.area_sqft)} sqft` : "—"}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Pitch (deg):</div>
                    <input
                      type="number"
                      min={0}
                      max={89}
                      step={0.1}
                      value={r.pitch_deg}
                      onChange={(e) => updatePitchDegrees(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: 90,
                        height: 34,
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,0.2)",
                        padding: "0 8px",
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRoofPlane(r.id);
                      }}
                      style={{
                        marginLeft: "auto",
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(220, 38, 38, 0.3)",
                        background: "white",
                        color: "#dc2626",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Obstructions</div>
              {obstructions.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  Use the obstruction tools to add vents, skylights, chimneys, trees, etc.
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>
                    {obstructions.length} obstruction(s) placed
                  </div>
                  {obstructions.map((o) => (
                    <div
                      key={o.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,0.1)",
                        marginBottom: 6,
                        fontSize: 12,
                      }}
                    >
                      <span>{o.type}</span>
                      <button
                        onClick={() => deleteObstruction(o.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(220, 38, 38, 0.3)",
                          background: "white",
                          color: "#dc2626",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Panel Design</div>

              <div style={{ fontSize: 12, marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4, opacity: 0.7 }}>Panel Model</label>
                <select
                  value={selectedPanelModelId || ""}
                  onChange={(e) => setSelectedPanelModelId(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.2)",
                    padding: "0 8px",
                    fontSize: 13,
                  }}
                >
                  {panelModels.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.brand} {pm.model} - {pm.watts}W
                    </option>
                  ))}
                </select>
              </div>

              {selectedPanelModel && (
                <div style={{ fontSize: 12, marginBottom: 12, opacity: 0.75 }}>
                  Dimensions: {selectedPanelModel.length_mm}mm x {selectedPanelModel.width_mm}mm
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, opacity: 0.7 }}>Orientation</label>
                  <select
                    value={panelOrientation}
                    onChange={(e) => setPanelOrientation(e.target.value as "portrait" | "landscape")}
                    style={{
                      width: "100%",
                      height: 38,
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.2)",
                      padding: "0 8px",
                      fontSize: 13,
                    }}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, opacity: 0.7 }}>Rotation (deg)</label>
                  <input
                    type="number"
                    min={0}
                    max={359}
                    value={panelRotation}
                    onChange={(e) => setPanelRotation(Number(e.target.value))}
                    style={{
                      width: "100%",
                      height: 38,
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.2)",
                      padding: "0 8px",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, opacity: 0.7 }}>Row Spacing (ft)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={rowSpacing}
                    onChange={(e) => setRowSpacing(Number(e.target.value))}
                    style={{
                      width: "100%",
                      height: 38,
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.2)",
                      padding: "0 8px",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, opacity: 0.7 }}>Col Spacing (ft)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={colSpacing}
                    onChange={(e) => setColSpacing(Number(e.target.value))}
                    style={{
                      width: "100%",
                      height: 38,
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.2)",
                      padding: "0 8px",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <button
                onClick={autoFillPanels}
                disabled={!selectedRoofId || !selectedPanelModelId || !!busy}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: selectedRoofId && selectedPanelModelId ? "#111827" : "#e5e7eb",
                  color: selectedRoofId && selectedPanelModelId ? "white" : "#9ca3af",
                  fontWeight: 700,
                  cursor: selectedRoofId && selectedPanelModelId ? "pointer" : "not-allowed",
                  marginBottom: 8,
                }}
              >
                Auto-Fill Selected Roof
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <button
                  onClick={clearPanels}
                  disabled={panels.length === 0 || !!busy}
                  style={{
                    height: 38,
                    borderRadius: 8,
                    border: "1px solid rgba(220, 38, 38, 0.3)",
                    background: "white",
                    color: panels.length > 0 ? "#dc2626" : "#9ca3af",
                    fontWeight: 600,
                    cursor: panels.length > 0 ? "pointer" : "not-allowed",
                    fontSize: 13,
                  }}
                >
                  Clear Panels
                </button>
              </div>

              <div style={{ fontSize: 13, opacity: 0.75 }}>
                {panels.length} panel(s) placed
              </div>
            </div>

            {busy && (
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
                {busy}
              </div>
            )}
          </>
        )}

        {!selected && (
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Start by typing an address above.
          </div>
        )}
      </div>

      <div style={{ flex: 1, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)", position: "relative" }}>
        {mapsLoading && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.9)",
            zIndex: 1000,
            fontSize: 14,
            fontWeight: 600
          }}>
            Loading Google Maps...
          </div>
        )}
        <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

function toolButtonStyle(active: boolean): React.CSSProperties {
  return {
    height: 42,
    borderRadius: 10,
    border: active ? "2px solid #111827" : "1px solid rgba(0,0,0,0.15)",
    background: active ? "#111827" : "white",
    color: active ? "white" : "#111827",
    fontWeight: 800,
    cursor: "pointer",
  };
}
