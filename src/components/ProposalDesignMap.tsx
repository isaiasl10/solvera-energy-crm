import React, { useEffect, useRef } from "react";

type RoofPlane = {
  id: string;
  points?: { lat: number; lng: number }[];
  path?: { lat: number; lng: number }[];
  pitch_deg?: number | null;
};

type Obstruction = {
  id: string;
  type: "rect" | "circle" | "tree";
  center_lat: number;
  center_lng: number;
  radius_ft?: number | null;
  width_ft?: number | null;
  height_ft?: number | null;
  rotation_deg?: number | null;
};

type Panel = {
  id: string;
  center_lat: number;
  center_lng: number;
  rotation_deg: number;
  is_portrait?: boolean;
  panel_model_id?: string;
};

type PanelModel = {
  id: string;
  length_mm: number;
  width_mm: number;
  watts: number;
};

type ProposalDesignMapProps = {
  center: { lat: number; lng: number };
  planes: RoofPlane[];
  obstructions: Obstruction[];
  panels: Panel[];
  panelModels?: PanelModel[];
  readOnly?: boolean;
  zoom?: number;
  onPlaneClick?: (planeId: string) => void;
  onObstructionClick?: (obstructionId: string) => void;
  onPanelClick?: (panelId: string) => void;
};

function isGoogleReady() {
  return (
    typeof (window as any).google !== "undefined" &&
    !!(window as any).google.maps &&
    !!(window as any).google.maps.geometry
  );
}

export default function ProposalDesignMap({
  center,
  planes,
  obstructions,
  panels,
  panelModels = [],
  readOnly = false,
  zoom = 19,
  onPlaneClick,
  onObstructionClick,
  onPanelClick,
}: ProposalDesignMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const roofPolysRef = useRef<Map<string, google.maps.Polygon>>(new Map());
  const obstructionShapesRef = useRef<Map<string, any>>(new Map());
  const panelRectanglesRef = useRef<Map<string, google.maps.Rectangle>>(new Map());
  const [mapsLoading, setMapsLoading] = React.useState(true);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 100;

    const checkGoogleMaps = () => {
      attempts++;

      if (isGoogleReady()) {
        setMapsLoading(false);
        return;
      }

      if (attempts >= maxAttempts) {
        setMapsLoading(false);
        return;
      }

      setTimeout(checkGoogleMaps, 100);
    };

    checkGoogleMaps();
  }, []);

  useEffect(() => {
    if (!mapDivRef.current || mapsLoading || !isGoogleReady()) return;
    if (mapRef.current) return;

    const map = new google.maps.Map(mapDivRef.current, {
      center,
      zoom,
      mapTypeId: "satellite",
      tilt: 0,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: !readOnly,
      zoomControl: !readOnly,
      draggable: !readOnly,
      scrollwheel: !readOnly,
      disableDoubleClickZoom: readOnly,
    });

    mapRef.current = map;
  }, [mapsLoading, center, zoom, readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isGoogleReady()) return;

    roofPolysRef.current.forEach((p) => p.setMap(null));
    roofPolysRef.current.clear();

    for (const plane of planes) {
      const path = plane.points ?? plane.path ?? [];
      if (path.length < 3) continue;

      const poly = new google.maps.Polygon({
        map,
        paths: path,
        clickable: !readOnly && !!onPlaneClick,
        editable: false,
        fillColor: "#10b981",
        fillOpacity: 0.18,
        strokeColor: "#059669",
        strokeWeight: 2,
      });

      roofPolysRef.current.set(plane.id, poly);

      if (!readOnly && onPlaneClick) {
        poly.addListener("click", () => onPlaneClick(plane.id));
      }
    }

    return () => {
      roofPolysRef.current.forEach((p) => p.setMap(null));
      roofPolysRef.current.clear();
    };
  }, [planes, readOnly, onPlaneClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isGoogleReady()) return;

    obstructionShapesRef.current.forEach((s) => {
      if (s?.setMap) s.setMap(null);
    });
    obstructionShapesRef.current.clear();

    for (const obs of obstructions) {
      const center = { lat: obs.center_lat, lng: obs.center_lng };

      if (obs.type === "circle") {
        const radiusM = (obs.radius_ft ?? 5) * 0.3048;
        const circle = new google.maps.Circle({
          map,
          center,
          radius: radiusM,
          clickable: !readOnly && !!onObstructionClick,
          editable: false,
          fillColor: "#f59e0b",
          fillOpacity: 0.12,
          strokeColor: "#d97706",
          strokeOpacity: 0.45,
          strokeWeight: 2,
        });
        obstructionShapesRef.current.set(obs.id, circle);

        if (!readOnly && onObstructionClick) {
          circle.addListener("click", () => onObstructionClick(obs.id));
        }
      } else if (obs.type === "rect") {
        const latLng = new google.maps.LatLng(center.lat, center.lng);
        const widthM = (obs.width_ft ?? 8) * 0.3048;
        const heightM = (obs.height_ft ?? 8) * 0.3048;

        const latDelta = heightM / 2 / 111320;
        const lngDelta = widthM / 2 / (111320 * Math.cos(center.lat * (Math.PI / 180)));

        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(center.lat - latDelta, center.lng - lngDelta),
          new google.maps.LatLng(center.lat + latDelta, center.lng + lngDelta)
        );

        const rect = new google.maps.Rectangle({
          map,
          bounds,
          clickable: !readOnly && !!onObstructionClick,
          editable: false,
          fillColor: "#f59e0b",
          fillOpacity: 0.12,
          strokeColor: "#d97706",
          strokeOpacity: 0.45,
          strokeWeight: 2,
        });
        obstructionShapesRef.current.set(obs.id, rect);

        if (!readOnly && onObstructionClick) {
          rect.addListener("click", () => onObstructionClick(obs.id));
        }
      } else if (obs.type === "tree") {
        const marker = new google.maps.Marker({
          map,
          position: center,
          title: "Tree",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#16a34a",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        const radiusM = (obs.radius_ft ?? 10) * 0.3048;
        const canopy = new google.maps.Circle({
          map,
          center,
          radius: radiusM,
          clickable: !readOnly && !!onObstructionClick,
          editable: false,
          fillColor: "#16a34a",
          fillOpacity: 0.08,
          strokeColor: "#16a34a",
          strokeOpacity: 0.35,
          strokeWeight: 2,
        });

        obstructionShapesRef.current.set(`${obs.id}:marker`, marker);
        obstructionShapesRef.current.set(`${obs.id}:canopy`, canopy);

        if (!readOnly && onObstructionClick) {
          marker.addListener("click", () => onObstructionClick(obs.id));
          canopy.addListener("click", () => onObstructionClick(obs.id));
        }
      }
    }

    return () => {
      obstructionShapesRef.current.forEach((s) => {
        if (s?.setMap) s.setMap(null);
      });
      obstructionShapesRef.current.clear();
    };
  }, [obstructions, readOnly, onObstructionClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isGoogleReady()) return;

    panelRectanglesRef.current.forEach((r) => r.setMap(null));
    panelRectanglesRef.current.clear();

    for (const panel of panels) {
      const panelModel = panelModels.find((pm) => pm.id === panel.panel_model_id);
      const lengthM = panelModel ? panelModel.length_mm / 1000 : 1.7;
      const widthM = panelModel ? panelModel.width_mm / 1000 : 1.0;

      const isPortrait = panel.is_portrait ?? true;
      const panelWidth = isPortrait ? widthM : lengthM;
      const panelHeight = isPortrait ? lengthM : widthM;

      const latDelta = (panelHeight / 2) / 111320;
      const lngDelta = (panelWidth / 2) / (111320 * Math.cos(panel.center_lat * (Math.PI / 180)));

      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(panel.center_lat - latDelta, panel.center_lng - lngDelta),
        new google.maps.LatLng(panel.center_lat + latDelta, panel.center_lng + lngDelta)
      );

      const rect = new google.maps.Rectangle({
        map,
        bounds,
        fillColor: "#3b82f6",
        fillOpacity: 0.4,
        strokeColor: "#1e40af",
        strokeWeight: 1,
        clickable: !readOnly && !!onPanelClick,
        editable: false,
      });

      panelRectanglesRef.current.set(panel.id, rect);

      if (!readOnly && onPanelClick) {
        rect.addListener("click", () => onPanelClick(panel.id));
      }
    }

    return () => {
      panelRectanglesRef.current.forEach((r) => r.setMap(null));
      panelRectanglesRef.current.clear();
    };
  }, [panels, panelModels, readOnly, onPanelClick]);

  if (mapsLoading) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
        Loading map...
      </div>
    );
  }

  return <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />;
}
