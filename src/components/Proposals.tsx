import { useEffect, useRef, useState } from "react";

type SelectedAddress = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

async function loadGoogleMaps(apiKey: string) {
  if ((window as any).google?.maps) return;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
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

  const [selected, setSelected] = useState<SelectedAddress | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

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

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", gap: 16, padding: 16 }}>
      <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Proposals</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Search an address, pick the correct one, then we'll design the rooftop system.
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

        {selected && (
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>
            <div style={{ marginTop: 8 }}>
              <strong>Selected:</strong>
            </div>
            <div>{selected.formattedAddress}</div>
            <div style={{ opacity: 0.75 }}>
              Place ID: {selected.placeId}
              <br />
              Lat/Lng: {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
            </div>
          </div>
        )}

        <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.65 }}>
          Next step: roof planes + setbacks + panel layout + production estimate.
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
