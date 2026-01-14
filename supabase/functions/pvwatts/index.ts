import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PVWattsRequest {
  lat: number;
  lon: number;
  system_capacity: number;
  azimuth?: number;
  tilt?: number;
  array_type?: number;
  module_type?: number;
  losses?: number;
}

interface PVWattsResponse {
  annual_kwh: number;
  monthly_kwh: number[];
  solrad_annual: number;
  capacity_factor: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: PVWattsRequest = await req.json();

    const { lat, lon, system_capacity, azimuth = 180, tilt = 20, array_type = 1, module_type = 0, losses = 14 } = body;

    if (!lat || !lon || !system_capacity) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: lat, lon, system_capacity" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const nrelApiKey = Deno.env.get("NREL_API_KEY") || "DEMO_KEY";

    const pvwattsUrl = new URL("https://developer.nrel.gov/api/pvwatts/v8.json");
    pvwattsUrl.searchParams.append("api_key", nrelApiKey);
    pvwattsUrl.searchParams.append("lat", lat.toString());
    pvwattsUrl.searchParams.append("lon", lon.toString());
    pvwattsUrl.searchParams.append("system_capacity", system_capacity.toString());
    pvwattsUrl.searchParams.append("azimuth", azimuth.toString());
    pvwattsUrl.searchParams.append("tilt", tilt.toString());
    pvwattsUrl.searchParams.append("array_type", array_type.toString());
    pvwattsUrl.searchParams.append("module_type", module_type.toString());
    pvwattsUrl.searchParams.append("losses", losses.toString());

    const response = await fetch(pvwattsUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error("PVWatts API error:", errorText);
      return new Response(
        JSON.stringify({ error: "PVWatts API request failed", details: errorText }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();

    if (!data.outputs) {
      return new Response(
        JSON.stringify({ error: "Invalid response from PVWatts API" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const result: PVWattsResponse = {
      annual_kwh: data.outputs.ac_annual,
      monthly_kwh: data.outputs.ac_monthly,
      solrad_annual: data.outputs.solrad_annual,
      capacity_factor: data.outputs.capacity_factor,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
