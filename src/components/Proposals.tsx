import { useEffect, useMemo, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

type SelectedAddress = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

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
  const autocompleteHostRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [selected, setSelected] = useState<SelectedAddress | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const loader = useMemo(
    () =>
      new Loader({
        apiKey,
        version: "weekly",
        libraries: ["places"],
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loader.load();
        if (cancelled) return;

        mapRef.current = new google.maps.Map(mapDivRef.current as HTMLDivElement, {
          center: { lat: 39.7392, lng: -104.9903 },
          zoom: 19,
          mapTypeId: "satellite",
          tilt: 0,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
        });

        const pac = new google.maps.places.PlaceAutocompleteElement({
          types: ["address"],
        });

        if (!autocompleteHostRef.current) return;
        autocompleteHostRef.current.innerHTML = "";
        autocompleteHostRef.current.appendChild(pac);

        pac.addEventListener("gmp-select", async (evt: any) => {
          const place = evt.place;
          if (!place) return;

          await place.fetchFields({
            fields: ["id", "formattedAddress", "location"],
          });

          const loc = place.location;
          if (!loc) return;

          const lat = loc.lat();
          const lng = loc.lng();

          const payload: SelectedAddress = {
            placeId: place.id,
            formattedAddress: place.formattedAddress ?? "",
            lat,
            lng,
          };

          setSelected(payload);

          const center = { lat, lng };
          mapRef.current?.setCenter(center);
          mapRef.current?.setZoom(20);

          if (!markerRef.current) {
            markerRef.current = new google.maps.Marker({
              map: mapRef.current!,
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
  }, [loader]);

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

          <div
            ref={autocompleteHostRef}
            style={{
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 10,
              padding: 8,
              background: "white",
              minHeight: 52,
              display: "flex",
              alignItems: "center",
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
