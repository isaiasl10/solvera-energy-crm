import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { X } from "lucide-react";

type JobType = "new_install" | "detach_reset" | "service";

type Contractor = {
  id: string;
  company_name: string | null;
  address: string | null;
  phone_number: string | null;
  email: string | null;
  ppw: number | string | null;
  adders: any[] | null;
  default_detach_reset_price_per_panel: number | string | null;
};

type SubcontractJob = {
  id: string;
  contractor_id: string | null;
  job_type: JobType | null;

  customer_name: string | null;
  address: string | null;

  // new install
  system_size_kw: number | string | null;

  // detach/reset
  panel_qty: number | string | null;
  price_per_panel: number | string | null;

  // shared costs + totals
  labor_cost: number | string | null;
  material_cost: number | string | null;
  gross_amount: number | string | null; // you use this as gross revenue
  net_revenue: number | string | null;

  workflow_status: string | null;

  scheduled_date: string | null;
  detach_date: string | null;
  reset_date: string | null;

  invoice_number: string | null;

  notes: string | null;

  created_at: string | null;
};

function toNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type Adder = { name: string; amount: number; type?: "flat" | "per_watt" | "per_panel" | "per_kw" };

function calcAddersTotal(adders: Adder[], ctx: { system_size_kw: number; panel_qty: number }): number {
  return (adders || []).reduce((sum, a) => {
    const amt = toNum(a.amount);
    const t = a.type || "flat";
    if (t === "per_panel") return sum + amt * ctx.panel_qty;
    if (t === "per_watt") return sum + amt * (ctx.system_size_kw * 1000);
    if (t === "per_kw") return sum + amt * ctx.system_size_kw;
    return sum + amt; // flat
  }, 0);
}

export default function SubcontractJobDetail({
  jobId,
  onClose,
  onUpdate,
}: {
  jobId: string;
  onClose: () => void;
  onUpdate?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<SubcontractJob | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);

  const [activeTab, setActiveTab] = useState<"details" | "invoice" | "scheduling">("details");
  const [editMode, setEditMode] = useState(false);

  // editable fields
  const [systemSizeKw, setSystemSizeKw] = useState<string>("");
  const [ppw, setPpw] = useState<string>("");
  const [panelQty, setPanelQty] = useState<string>("");
  const [pricePerPanel, setPricePerPanel] = useState<string>("");
  const [laborCost, setLaborCost] = useState<string>("0");
  const [materialCost, setMaterialCost] = useState<string>("0");
  const [status, setStatus] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [detachDate, setDetachDate] = useState<string>("");
  const [resetDate, setResetDate] = useState<string>("");

  const [selectedAdders, setSelectedAdders] = useState<Adder[]>([]);

  // ---- status options per job type (exactly as you described) ----
  const statusOptions = useMemo(() => {
    const jt = job?.job_type || "new_install";
    if (jt === "detach_reset") {
      return ["detach_scheduled", "detach_complete", "reset_complete", "pending_invoice", "dr_complete_paid"];
    }
    // new_install + service use install pipeline
    return [
      "install_scheduled",
      "pending_install_date",
      "install_rescheduled",
      "install_complete",
      "pending_payment",
      "install_complete_paid",
    ];
  }, [job?.job_type]);

  // ---- fetch job + contractor ----
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("subcontract_jobs")
        .select(
          `
          *,
          contractor:contractors(
            id,
            company_name,
            address,
            phone_number,
            email,
            ppw,
            adders,
            default_detach_reset_price_per_panel
          )
        `
        )
        .eq("id", jobId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subcontract job:", error);
        setJob(null);
        setContractor(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setJob(null);
        setContractor(null);
        setLoading(false);
        return;
      }

      const row = data as any;
      setJob(row as SubcontractJob);
      setContractor((row.contractor || null) as Contractor);

      // hydrate edit fields from DB
      const jt: JobType = (row.job_type || "new_install") as JobType;

      setSystemSizeKw(row.system_size_kw ? String(row.system_size_kw) : "");
      setPanelQty(row.panel_qty ? String(row.panel_qty) : "");
      setPricePerPanel(row.price_per_panel ? String(row.price_per_panel) : "");
      setLaborCost(String(toNum(row.labor_cost)));
      setMaterialCost(String(toNum(row.material_cost)));

      const baseStatus =
        row.workflow_status ||
        (jt === "detach_reset" ? "detach_scheduled" : "install_scheduled");
      setStatus(baseStatus);

      setScheduledDate(row.scheduled_date ? String(row.scheduled_date).slice(0, 10) : "");
      setDetachDate(row.detach_date ? String(row.detach_date).slice(0, 10) : "");
      setResetDate(row.reset_date ? String(row.reset_date).slice(0, 10) : "");

      // PPW: from contractor profile unless saved in notes override
      const notesObj = safeJsonParse<{ selected_adders?: Adder[]; ppw_override?: number }>(row.notes, {});
      const contractorPpw = toNum(row?.contractor?.ppw);
      const initialPpw = notesObj.ppw_override ?? contractorPpw;
      setPpw(initialPpw ? String(initialPpw) : "");

      // selected adders: from notes.selected_adders, else empty
      setSelectedAdders(Array.isArray(notesObj.selected_adders) ? notesObj.selected_adders : []);

      setLoading(false);
    })();
  }, [jobId]);

  // ---- calculations ----
  const computed = useMemo(() => {
    const jt: JobType = (job?.job_type || "new_install") as JobType;

    const sysKw = toNum(systemSizeKw);
    const ppwNum = toNum(ppw);
    const qty = toNum(panelQty);
    const ppp = toNum(pricePerPanel);

    const addersTotal = calcAddersTotal(selectedAdders, { system_size_kw: sysKw, panel_qty: qty });

    const base =
      jt === "detach_reset"
        ? qty * ppp
        : ppwNum * sysKw; // NEW INSTALL: PPW * system_size_kw (as you asked)

    const gross = base + addersTotal;
    const labor = toNum(laborCost);
    const material = toNum(materialCost);
    const net = gross - labor - material;

    return { sysKw, ppwNum, qty, ppp, addersTotal, base, gross, labor, material, net };
  }, [job?.job_type, systemSizeKw, ppw, panelQty, pricePerPanel, selectedAdders, laborCost, materialCost]);

  const contractorAdders: Adder[] = useMemo(() => {
    const raw = contractor?.adders || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((a: any) => ({
      name: String(a?.name || ""),
      amount: toNum(a?.amount),
      type: a?.type || "flat",
    })).filter(a => a.name);
  }, [contractor?.adders]);

  const toggleAdder = (adder: Adder, checked: boolean) => {
    setSelectedAdders((prev) => {
      if (checked) {
        if (prev.some((p) => p.name === adder.name)) return prev;
        return [...prev, adder];
      }
      return prev.filter((p) => p.name !== adder.name);
    });
  };

  const saveJob = async () => {
    if (!job) return;

    const jt: JobType = (job.job_type || "new_install") as JobType;

    // If detach_reset and contractor has default price per panel and user left it blank, keep default
    const defaultPPP = toNum(contractor?.default_detach_reset_price_per_panel);
    const pppFinal =
      jt === "detach_reset" ? (toNum(pricePerPanel) || defaultPPP) : toNum(pricePerPanel);

    const payload: any = {
      workflow_status: status,

      labor_cost: toNum(laborCost),
      material_cost: toNum(materialCost),

      gross_amount: computed.gross,
      net_revenue: computed.net,

      scheduled_date: scheduledDate || null,
      detach_date: detachDate || null,
      reset_date: resetDate || null,

      // these fields depend on job type
      system_size_kw: jt === "detach_reset" ? null : (systemSizeKw ? toNum(systemSizeKw) : null),
      panel_qty: jt === "detach_reset" ? (panelQty ? toNum(panelQty) : null) : (panelQty ? toNum(panelQty) : null), // you said you still want panel qty on new install too
      price_per_panel: jt === "detach_reset" ? pppFinal : null,
    };

    // store per-job selected adders + optional ppw override in notes (no schema change)
    const existingNotesObj = safeJsonParse<any>(job.notes, {});
    const nextNotesObj = {
      ...existingNotesObj,
      selected_adders: selectedAdders,
      ppw_override: toNum(ppw),
    };

    payload.notes = JSON.stringify(nextNotesObj);

    const { error } = await supabase.from("subcontract_jobs").update(payload).eq("id", job.id);
    if (error) {
      console.error("Error saving subcontract job:", error);
      alert(error.message || "Failed to save");
      return;
    }

    setEditMode(false);

    // refetch quickly
    const { data } = await supabase
      .from("subcontract_jobs")
      .select(
        `
        *,
        contractor:contractors(
          id,
          company_name,
          address,
          phone_number,
          email,
          ppw,
          adders,
          default_detach_reset_price_per_panel
        )
      `
      )
      .eq("id", job.id)
      .maybeSingle();

    if (data) {
      const row = data as any;
      setJob(row as SubcontractJob);
      setContractor((row.contractor || null) as Contractor);
    }

    onUpdate?.();
  };

  // ---- invoice download (browser PDF via print) ----
  const downloadInvoicePdf = () => {
    if (!job) return;

    const contractorName = contractor?.company_name || "Contractor";
    const billToLines = [
      contractorName,
      contractor?.address || "",
      contractor?.phone_number || "",
      contractor?.email || "",
    ].filter(Boolean);

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${job.invoice_number || ""}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111827; }
    .header { background: #f97316; color: white; padding: 18px 22px; display:flex; gap:16px; align-items:center; }
    .logo { width: 44px; height: 44px; border-radius: 8px; background: rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; font-weight:700; }
    .content { padding: 22px; }
    .row { display:flex; justify-content:space-between; gap:16px; }
    .card { border:1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; margin-top: 14px; }
    .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; }
    .value { margin-top: 6px; font-size: 14px; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    th, td { border-bottom:1px solid #e5e7eb; padding:10px 8px; text-align:left; font-size: 14px; }
    th { font-size: 12px; color:#6b7280; text-transform: uppercase; letter-spacing:.06em; }
    .total { font-size: 18px; font-weight: 800; }
    @media print { .no-print { display:none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">S</div>
    <div style="flex:1">
      <div style="font-size:18px; font-weight:800;">Solvera Energy</div>
      <div style="font-size:12px; opacity:.9;">Subcontractor Invoice</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px; opacity:.9;">Invoice</div>
      <div style="font-size:16px; font-weight:800;">${job.invoice_number || "-"}</div>
    </div>
  </div>

  <div class="content">
    <div class="row">
      <div class="card" style="flex:1">
        <div class="label">Bill To</div>
        <div class="value">${billToLines.map(l => `<div>${String(l).replace(/</g,"&lt;")}</div>`).join("")}</div>
      </div>
      <div class="card" style="flex:1">
        <div class="label">Project</div>
        <div class="value">
          <div><b>Customer:</b> ${job.customer_name || "-"}</div>
          <div><b>Address:</b> ${job.address || "-"}</div>
          <div><b>Job Type:</b> ${job.job_type || "-"}</div>
          <div><b>Status:</b> ${job.workflow_status || "-"}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="label">Details</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Subcontract Work - ${job.job_type || ""}</td>
            <td style="text-align:right">${money(computed.gross)}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex; justify-content:flex-end; margin-top:12px;">
        <div class="total">Total: ${money(computed.gross)}</div>
      </div>
      <div style="margin-top:10px; font-size:12px; color:#6b7280;">
        * Total reflects job pricing + selected adders. (Internal costs not shown on invoice.)
      </div>
    </div>

    <div class="no-print" style="margin-top:14px;">
      <button onclick="window.print()" style="padding:10px 14px; border-radius:10px; border:none; background:#111827; color:white; font-weight:700; cursor:pointer;">
        Print / Save as PDF
      </button>
    </div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // ---- Scheduling integration ----
  // This DOES NOT create a new scheduler UI; it opens your existing scheduler screen with job info.
  const openScheduler = () => {
    if (!job) return;
    // Update this route to whatever your existing scheduler route is:
    // examples: "/calendar" or "/schedule" or "/tickets"
    const base = "/calendar";
    const url = `${base}?source=subcontract&jobId=${encodeURIComponent(job.id)}&jobType=${encodeURIComponent(
      job.job_type || "new_install"
    )}`;
    window.location.assign(url);
  };

  if (loading) {
    return null;
  }

  if (!job) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: 24,
        }}
      >
        <div style={{ background: "white", width: "100%", maxWidth: 920, borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Job not found</div>
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
              <X />
            </button>
          </div>
          <div style={{ marginTop: 10, color: "#b91c1c" }}>
            Job not found (0 rows). This is usually RLS blocking access to that record.
          </div>
        </div>
      </div>
    );
  }

  const jt: JobType = (job.job_type || "new_install") as JobType;

  // auto-populate price per panel when D&R and contractor has default
  const defaultPPP = toNum(contractor?.default_detach_reset_price_per_panel);
  const effectivePPP = jt === "detach_reset" ? (toNum(pricePerPanel) || defaultPPP) : toNum(pricePerPanel);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 24,
      }}
    >
      <div
        style={{
          background: "white",
          width: "100%",
          maxWidth: 980,
          borderRadius: 14,
          boxShadow: "0 20px 40px rgba(0,0,0,0.20)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: 18, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {jt === "detach_reset" ? "Detach & Reset Job" : jt === "service" ? "Service Job" : "New Install Job"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {job.customer_name || "-"} • {job.address || "-"} • {contractor?.company_name || "Contractor"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#6b7280", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 999 }}>
              {status || "pending"}
            </div>
            <button
              onClick={() => setEditMode((v) => !v)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 6 }}>
              <X />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: "10px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 16 }}>
          {[
            { key: "details", label: "Details" },
            { key: "invoice", label: "Invoice" },
            { key: "scheduling", label: "Scheduling" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 900,
                color: activeTab === t.key ? "#2563eb" : "#374151",
                padding: "10px 8px",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body (scrollable inside modal) */}
        <div style={{ maxHeight: "78vh", overflow: "auto", padding: 18 }}>
          {/* DETAILS TAB */}
          {activeTab === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Key Fields */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 240 }}>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Workflow Status</div>
                    {editMode ? (
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ marginTop: 6, fontWeight: 900 }}>{status || "-"}</div>
                    )}
                  </div>

                  <div style={{ minWidth: 240 }}>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      {jt === "detach_reset" ? "Detach Date" : "Scheduled Date"}
                    </div>
                    {editMode ? (
                      <input
                        type="date"
                        value={jt === "detach_reset" ? detachDate : scheduledDate}
                        onChange={(e) => (jt === "detach_reset" ? setDetachDate(e.target.value) : setScheduledDate(e.target.value))}
                        style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                      />
                    ) : (
                      <div style={{ marginTop: 6, fontWeight: 900 }}>
                        {(jt === "detach_reset" ? detachDate : scheduledDate) || "Not scheduled"}
                      </div>
                    )}
                  </div>

                  {jt === "detach_reset" && (
                    <div style={{ minWidth: 240 }}>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Reset Date</div>
                      {editMode ? (
                        <input
                          type="date"
                          value={resetDate}
                          onChange={(e) => setResetDate(e.target.value)}
                          style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                        />
                      ) : (
                        <div style={{ marginTop: 6, fontWeight: 900 }}>{resetDate || "Not scheduled"}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Fields */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Pricing</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {/* NEW INSTALL fields */}
                  {jt !== "detach_reset" && (
                    <>
                      <div>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>PPW</div>
                        {editMode ? (
                          <input
                            value={ppw}
                            onChange={(e) => setPpw(e.target.value)}
                            placeholder="0.00"
                            style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                          />
                        ) : (
                          <div style={{ marginTop: 6, fontWeight: 900 }}>{money(toNum(ppw))}</div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>System Size (kW)</div>
                        {editMode ? (
                          <input
                            value={systemSizeKw}
                            onChange={(e) => setSystemSizeKw(e.target.value)}
                            placeholder="0"
                            style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                          />
                        ) : (
                          <div style={{ marginTop: 6, fontWeight: 900 }}>{systemSizeKw ? `${systemSizeKw} kW` : "-"}</div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Panel Quantity</div>
                        {editMode ? (
                          <input
                            value={panelQty}
                            onChange={(e) => setPanelQty(e.target.value)}
                            placeholder="0"
                            style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                          />
                        ) : (
                          <div style={{ marginTop: 6, fontWeight: 900 }}>{panelQty || "-"}</div>
                        )}
                      </div>
                    </>
                  )}

                  {/* DETACH & RESET fields */}
                  {jt === "detach_reset" && (
                    <>
                      <div>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Panel Quantity</div>
                        {editMode ? (
                          <input
                            value={panelQty}
                            onChange={(e) => setPanelQty(e.target.value)}
                            placeholder="0"
                            style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                          />
                        ) : (
                          <div style={{ marginTop: 6, fontWeight: 900 }}>{panelQty || "-"}</div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Price / Panel</div>
                        {editMode ? (
                          <input
                            value={pricePerPanel || (defaultPPP ? String(defaultPPP) : "")}
                            onChange={(e) => setPricePerPanel(e.target.value)}
                            placeholder={defaultPPP ? String(defaultPPP) : "0.00"}
                            style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                          />
                        ) : (
                          <div style={{ marginTop: 6, fontWeight: 900 }}>{money(effectivePPP)}</div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Costs */}
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Labor Cost</div>
                    {editMode ? (
                      <input
                        value={laborCost}
                        onChange={(e) => setLaborCost(e.target.value)}
                        placeholder="0"
                        style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                      />
                    ) : (
                      <div style={{ marginTop: 6, fontWeight: 900 }}>{money(toNum(laborCost))}</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Material Cost</div>
                    {editMode ? (
                      <input
                        value={materialCost}
                        onChange={(e) => setMaterialCost(e.target.value)}
                        placeholder="0"
                        style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                      />
                    ) : (
                      <div style={{ marginTop: 6, fontWeight: 900 }}>{money(toNum(materialCost))}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Adders */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Adders (from contractor profile)</div>

                {contractorAdders.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No adders available for this contractor.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                    {contractorAdders.map((a) => {
                      const checked = selectedAdders.some((s) => s.name === a.name);
                      return (
                        <label
                          key={a.name}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            background: checked ? "#eff6ff" : "white",
                            cursor: editMode ? "pointer" : "default",
                            opacity: editMode ? 1 : 0.9,
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!editMode}
                            checked={checked}
                            onChange={(e) => toggleAdder(a, e.target.checked)}
                          />
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontWeight: 900 }}>{a.name}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              {money(toNum(a.amount))}{" "}
                              {a.type === "per_panel" ? "/panel" : a.type === "per_kw" ? "/kW" : a.type === "per_watt" ? "/W" : ""}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Gross Revenue</div>
                    <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>{money(computed.gross)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Net Revenue</div>
                    <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>{money(computed.net)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Adders Total</div>
                    <div style={{ marginTop: 6, fontWeight: 900 }}>{money(computed.addersTotal)}</div>
                  </div>
                </div>

                {editMode && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                    <button
                      onClick={saveJob}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "none",
                        background: "linear-gradient(135deg,#2563eb 0%, #1d4ed8 100%)",
                        color: "white",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INVOICE TAB */}
          {activeTab === "invoice" && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Invoice</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Shows total price only (no internal costs).
                  </div>
                </div>
                <button
                  onClick={downloadInvoicePdf}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "none",
                    background: "#111827",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Download (Print to PDF)
                </button>
              </div>

              <div style={{ marginTop: 14, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div style={{ background: "#f97316", color: "white", padding: 14, display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900 }}>Solvera Energy</div>
                  <div style={{ fontWeight: 900 }}>{job.invoice_number || "-"}</div>
                </div>

                <div style={{ padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Bill To</div>
                      <div style={{ marginTop: 6, fontWeight: 900 }}>{contractor?.company_name || "-"}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                        {contractor?.address || ""}
                        <br />
                        {contractor?.phone_number || ""}
                        <br />
                        {contractor?.email || ""}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Project</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>
                        <b>Customer:</b> {job.customer_name || "-"}
                        <br />
                        <b>Address:</b> {job.address || "-"}
                        <br />
                        <b>Job Type:</b> {job.job_type || "-"}
                        <br />
                        <b>Status:</b> {status || "-"}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 900 }}>Total</div>
                      <div style={{ fontWeight: 900 }}>{money(computed.gross)}</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                      * Total reflects job pricing + selected adders. Internal costs not shown.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCHEDULING TAB */}
          {activeTab === "scheduling" && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Scheduling</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                This uses your existing CRM scheduler/calendar (no new scheduler UI).
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={openScheduler}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg,#2563eb 0%, #1d4ed8 100%)",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Open Scheduler
                </button>

                <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", color: "#374151", fontWeight: 700 }}>
                  Job ID: {job.id}
                </div>
              </div>

              <div style={{ marginTop: 14, fontSize: 13, color: "#374151" }}>
                When you open the scheduler, it will receive:
                <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                  source=subcontract<br />
                  jobId={job.id}<br />
                  jobType={job.job_type || "new_install"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e5e7eb", padding: 14, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
