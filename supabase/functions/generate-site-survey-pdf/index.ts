import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  customer_id: string;
  ticket_id: string;
}

function generateSimplePDF(customer: any, photos: any): Uint8Array {
  const photoList: string[] = [];
  Object.entries(photos.photo_urls).forEach(([key, urls]) => {
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    (urls as string[]).forEach((url, idx) => {
      photoList.push(`${label} ${idx + 1}: ${url}`);
    });
  });

  const content = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
/F2 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${2000 + photoList.length * 100}
>>
stream
BT
/F2 18 Tf
50 750 Td
(Site Survey Photos Report) Tj
0 -30 Td
/F1 12 Tf
(Customer: ${customer.full_name.replace(/[()\\]/g, '')}) Tj
0 -20 Td
(Customer ID: ${customer.customer_id}) Tj
0 -20 Td
(Address: ${customer.installation_address.replace(/[()\\]/g, '')}) Tj
0 -30 Td
/F2 14 Tf
(Photo Locations:) Tj
0 -25 Td
/F1 10 Tf
${photoList.map((p, i) => `0 -15 Td\n(${i + 1}. ${p.substring(0, 80).replace(/[()\\]/g, '')}) Tj`).join('\n')}
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${2500 + photoList.length * 100}
%%EOF`;

  return new TextEncoder().encode(content);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { customer_id, ticket_id }: RequestBody = await req.json();

    const { data: siteSurveyPhotos, error: photosError } = await supabase
      .from("site_survey_photos")
      .select("*")
      .eq("ticket_id", ticket_id)
      .maybeSingle();

    if (photosError || !siteSurveyPhotos) {
      throw new Error("Site survey photos not found");
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("full_name, customer_id, installation_address")
      .eq("id", customer_id)
      .single();

    if (customerError) {
      throw new Error("Customer not found");
    }

    const pdfBytes = generateSimplePDF(customer, siteSurveyPhotos);
    const fileName = `site-survey-${customer.customer_id}-${Date.now()}.pdf`;
    const filePath = `${customer_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("customer-documents")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: docError } = await supabase.from("documents").insert({
      customer_id: customer_id,
      document_type: "site_survey_photos",
      file_name: fileName,
      file_path: filePath,
      file_size: pdfBytes.byteLength,
      mime_type: "application/pdf",
    });

    if (docError) {
      throw docError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Site survey PDF generated successfully",
        file_name: fileName,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Error generating site survey PDF:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
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