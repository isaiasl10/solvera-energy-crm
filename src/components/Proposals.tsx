import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type SelectedAddress = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

type Proposal = {
  id: string;
  place_id: string;
  formatted_address: string;
  lat: number;
  lng: number;
  status: string;
  created_at: string;
};

type RoofPlane = {
  id: string;
  proposal_id: string;
  path: Array<{ lat: number; lng: number }>;
  area_sqft: number;
  tilt: number | null;
  azimuth: number | null;
};

async function loadGoogleMaps(apiKey: string) {
  if ((window as any).google?.maps) return;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&v=weekly`;
  script.async = true;
  script.defer = true;

  document.head.appendChild(script);

  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
  });
}

export default function Proposals() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { user } = useAuth();

  if (!apiKey) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ margin: 0 }}>Proposals</h2>
        <p style={{ color: "crimson", marginTop: 12 }}>
          Missing Google Maps API key. Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to the environment variables
          and redeploy.
        </p>
        <ol style={{ marginTop: 12 }}>
          <li>Google Cloud → enable <b>Maps JavaScript API</b> and <b>Places API</b></li>
          <li>Add referrers: <code>https://auric-core.io/*</code> and preview domains</li>
          <li>Redeploy site so Vite can bake the env var into the build</li>
        </ol>
      </div>
    );
  }

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const autocompleteInputRef = useRef<HTMLInputElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const drawingPolygonRef = useRef<google.maps.Polygon | null>(null);
  const roofPlanesRef = useRef<google.maps.Polygon[]>([]);

  const [selected, setSelected] = useState<SelectedAddress | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);
  const [roofPlanes, setRoofPlanes] = useState<RoofPlane[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<google.maps.LatLng[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadGoogleMaps(apiKey!);
        if (cancelled) return;

        const map = new google.maps.Map(mapDivRef.current!, {
          center: { lat: 39.7392, lng: -104.9903 },
          zoom: 19,
          mapTypeId: "satellite",
          tilt: 0,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
        });

        mapRef.current = map;

        const autocomplete = new google.maps.places.Autocomplete(
          autocompleteInputRef.current!,
          { types: ["address"] }
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry?.location) return;

          const loc = place.geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          const center = { lat, lng };

          const payload: SelectedAddress = {
            placeId: place.place_id ?? "",
            formattedAddress: place.formatted_address ?? "",
            lat,
            lng,
          };

          setSelected(payload);
          setCurrentProposal(null);
          setRoofPlanes([]);

          map.setCenter(center);
          map.setZoom(20);

          if (!markerRef.current) {
            markerRef.current = new google.maps.Marker({
              map,
              position: center,
              draggable: false,
            });
          } else {
            markerRef.current.setPosition(center);
          }
        });

        setMapsReady(true);
      } catch (e: any) {
        setMapsError(e?.message ?? "Failed to load Google Maps.");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const createProposal = async () => {
    if (!selected || !user) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          place_id: selected.placeId,
          formatted_address: selected.formattedAddress,
          lat: selected.lat,
          lng: selected.lng,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentProposal(data);
    } catch (error: any) {
      alert(`Error creating proposal: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const startDrawing = () => {
    if (!mapRef.current) return;

    setIsDrawing(true);
    setDrawingPoints([]);

    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null);
    }

    const clickListener = mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const newPoints = [...drawingPoints, e.latLng];
      setDrawingPoints(newPoints);

      if (drawingPolygonRef.current) {
        drawingPolygonRef.current.setMap(null);
      }

      drawingPolygonRef.current = new google.maps.Polygon({
        map: mapRef.current!,
        paths: newPoints,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        editable: false,
      });
    });

    (mapRef.current as any)._drawingListener = clickListener;
  };

  const finishPlane = async () => {
    if (!currentProposal || drawingPoints.length < 3) {
      alert("You need at least 3 points to create a roof plane");
      return;
    }

    setIsSaving(true);
    try {
      const path = drawingPoints.map((p) => ({ lat: p.lat(), lng: p.lng() }));

      const area = google.maps.geometry.spherical.computeArea(drawingPoints);
      const areaSqFt = area * 10.7639;

      const { data, error } = await supabase
        .from("proposal_roof_planes")
        .insert({
          proposal_id: currentProposal.id,
          path: path,
          area_sqft: areaSqFt,
        })
        .select()
        .single();

      if (error) throw error;

      setRoofPlanes([...roofPlanes, data]);
      cancelDrawing();
      loadRoofPlanes(currentProposal.id);
    } catch (error: any) {
      alert(`Error saving roof plane: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);

    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null);
      drawingPolygonRef.current = null;
    }

    if (mapRef.current && (mapRef.current as any)._drawingListener) {
      google.maps.event.removeListener((mapRef.current as any)._drawingListener);
      (mapRef.current as any)._drawingListener = null;
    }
  };

  const loadRoofPlanes = async (proposalId: string) => {
    try {
      const { data, error } = await supabase
        .from("proposal_roof_planes")
        .select("*")
        .eq("proposal_id", proposalId);

      if (error) throw error;

      setRoofPlanes(data || []);

      roofPlanesRef.current.forEach((p) => p.setMap(null));
      roofPlanesRef.current = [];

      (data || []).forEach((plane: RoofPlane) => {
        const polygon = new google.maps.Polygon({
          map: mapRef.current!,
          paths: plane.path,
          strokeColor: "#00FF00",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#00FF00",
          fillOpacity: 0.35,
          editable: false,
        });
        roofPlanesRef.current.push(polygon);
      });
    } catch (error: any) {
      console.error("Error loading roof planes:", error);
    }
  };

  useEffect(() => {
    if (currentProposal) {
      loadRoofPlanes(currentProposal.id);
    }
  }, [currentProposal]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", gap: 16, padding: 16 }}>
      <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Proposals</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Search an address, create a proposal, then draw roof planes.
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.7 }}>
            Address search (select from dropdown)
          </div>

          <input
            ref={autocompleteInputRef}
            type="text"
            placeholder="Enter an address..."
            style={{
              width: "100%",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 10,
              padding: "12px 16px",
              background: "white",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        {!mapsReady && !mapsError && (
          <div style={{ fontSize: 13, opacity: 0.75 }}>Loading Google Maps…</div>
        )}

        {mapsError && (
          <div style={{ fontSize: 13, color: "crimson" }}>
            <strong>Maps error:</strong> {mapsError}
            <div style={{ marginTop: 6, opacity: 0.75 }}>
              Check your API key, enabled APIs (Maps JavaScript + Places), and HTTP referrer restrictions.
            </div>
          </div>
        )}

        {selected && !currentProposal && (
          <div>
            <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 12 }}>
              <div style={{ marginTop: 8 }}>
                <strong>Selected:</strong>
              </div>
              <div>{selected.formattedAddress}</div>
            </div>
            <button
              onClick={createProposal}
              disabled={isSaving}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#10B981",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? "Creating..." : "Create Proposal"}
            </button>
          </div>
        )}

        {currentProposal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              <div style={{ marginTop: 8 }}>
                <strong>Active Proposal:</strong>
              </div>
              <div>{currentProposal.formatted_address}</div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                Status: {currentProposal.status}
              </div>
            </div>

            {!isDrawing ? (
              <button
                onClick={startDrawing}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#3B82F6",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Draw Roof Plane
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={finishPlane}
                  disabled={drawingPoints.length < 3 || isSaving}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: drawingPoints.length < 3 ? "#9CA3AF" : "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: drawingPoints.length < 3 || isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {isSaving ? "Saving..." : `Finish (${drawingPoints.length} pts)`}
                </button>
                <button
                  onClick={cancelDrawing}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "#EF4444",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {isDrawing && (
              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                Click on the map to add points for the roof plane. Need at least 3 points to finish.
              </div>
            )}

            {roofPlanes.length > 0 && (
              <div style={{ fontSize: 13, marginTop: 8 }}>
                <strong>Roof Planes ({roofPlanes.length}):</strong>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {roofPlanes.map((plane, idx) => (
                    <div
                      key={plane.id}
                      style={{
                        padding: 8,
                        background: "#F3F4F6",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>Plane {idx + 1}</div>
                      <div style={{ opacity: 0.75 }}>
                        Area: {plane.area_sqft.toFixed(2)} sqft
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.65 }}>
          Next step: setbacks + panel layout + production estimate.
        </div>
      </div>

      <div
        style={{
          flex: 1,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.12)",
          background: "#f5f5f5",
        }}
      >
        <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
