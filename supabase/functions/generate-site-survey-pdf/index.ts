import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { jsPDF } from "npm:jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  customer_id: string;
  ticket_id: string;
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

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const logoUrl = `${supabaseUrl}/storage/v1/object/public/customer-documents/solvera_energy_logo_redesign.png`;

    let logoData: ArrayBuffer;
    try {
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        logoData = await logoResponse.arrayBuffer();
      }
    } catch (err) {
      console.log("Logo not found, continuing without it");
    }

    const addHeaderFooter = (pageNum: number, totalPages: number) => {
      if (logoData) {
        try {
          const logoBase64 = btoa(
            new Uint8Array(logoData).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          doc.addImage(
            `data:image/png;base64,${logoBase64}`,
            "PNG",
            margin,
            margin - 5,
            40,
            15
          );
        } catch (err) {
          console.log("Error adding logo:", err);
        }
      }

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("Site Survey Photos", pageWidth / 2, margin + 5, {
        align: "center",
      });

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(
        `Customer: ${customer.full_name} (#${customer.customer_id})`,
        pageWidth / 2,
        margin + 12,
        { align: "center" }
      );
      doc.text(
        `Address: ${customer.installation_address}`,
        pageWidth / 2,
        margin + 18,
        { align: "center" }
      );

      doc.setFontSize(8);
      doc.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(
        `© ${new Date().getFullYear()} Solvera Energy`,
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    };

    const allPhotos: Array<{ url: string; label: string }> = [];
    Object.entries(siteSurveyPhotos.photo_urls).forEach(([key, urls]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      (urls as string[]).forEach((url) => {
        allPhotos.push({ url, label });
      });
    });

    const photosPerPage = 4;
    const totalPages = Math.ceil(allPhotos.length / photosPerPage);
    let currentY = margin + 25;

    for (let i = 0; i < allPhotos.length; i++) {
      if (i % photosPerPage === 0 && i > 0) {
        doc.addPage();
        currentY = margin + 25;
      }

      if (i % photosPerPage === 0) {
        addHeaderFooter(Math.floor(i / photosPerPage) + 1, totalPages);
      }

      const photo = allPhotos[i];

      try {
        const imageResponse = await fetch(photo.url);
        if (imageResponse.ok) {
          const imageData = await imageResponse.arrayBuffer();
          const imageBase64 = btoa(
            new Uint8Array(imageData).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );

          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = 50;

          doc.setFontSize(10);
          doc.setFont(undefined, "bold");
          doc.text(photo.label, margin, currentY);
          currentY += 5;

          doc.addImage(
            `data:image/jpeg;base64,${imageBase64}`,
            "JPEG",
            margin,
            currentY,
            imgWidth,
            imgHeight
          );

          currentY += imgHeight + 5;
        }
      } catch (err) {
        console.error(`Error adding image ${photo.label}:`, err);
        doc.setFontSize(10);
        doc.text(`[Image: ${photo.label} - Failed to load]`, margin, currentY);
        currentY += 10;
      }
    }

    const pdfBytes = doc.output("arraybuffer");
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
