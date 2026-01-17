import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type JobType = "new_install" | "detach_reset" | "service";

type PaymentType = "CHECK" | "ACH" | "WIRE";

type SubcontractJob = {
  id: string;
  contractor_id: string;
  job_type: JobType;

  customer_name: string;
  address: string;

  // new install fields
  system_size_kw?: number | null;

  // detach/reset fields
  panel_qty?: number | null;
  price_per_panel?: number | null;

  // service fields (optional)
  labor_cost?: number | null;
  material_cost?: number | null;

  // calculated by DB triggers (or can be null on insert)
  gross_amount?: number | null;
  net_revenue?: number | null;

  workflow_status: string;

  scheduled_date?: string | null;
  detach_date?: string | null;
  reset_date?: string | null;

  invoice_number?: string | null;
  invoice_sent_date?: string | null;
  invoice_paid_date?: string | null;
  payment_type?: PaymentType | null;
  check_number?: string | null;

  notes?: string | null;
  contractor_job_ref?: string | null;

  created_at: string;
  updated_at: string;

  contractor?: {
    name: string;
    company_name?: string | null;
    default_new_install_ppw?: number | null;
    default_detach_reset_price_per_panel?: number | null;
    default_service_rate?: number | null;
  } | null;
};

type Contractor = {
  id: string;
  name: string;
  company_name?: string | null;
  default_new_install_ppw?: number | null;
  default_detach_reset_price_per_panel?: number | null;
  default_service_rate?: number | null;
};

export default function SubcontractingIntake() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- FORM STATE (simple + safe) ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractorId, setContractorId] = useState<string>("");
  const [jobType, setJobType] = useState<JobType>("new_install");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");

  const [systemSizeKw, setSystemSizeKw] = useState<string>("");

  const [panelQty, setPanelQty] = useState<string>("");
  const [pricePerPanel, setPricePerPanel] = useState<string>("");

  const selectedContractor = useMemo(
    () => contractors.find((c) => c.id === contractorId) || null,
    [contractorId, contractors]
  );

  // ---- LOAD DATA ----
  const fetchContractors = async () => {
    const { data, error } = await supabase
      .from("contractors")
      .select("id, name, company_name, default_new_install_ppw, default_detach_reset_price_per_panel, default_service_rate")
      .order("name", { ascending: true });

    if (error) throw error;
    setContractors((data || []) as Contractor[]);
  };

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("subcontract_jobs")
      .select(
        `
        *,
        contractor:contractors(
          name,
          company_name,
          default_new_install_ppw,
          default_detach_reset_price_per_panel,
          default_service_rate
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    setJobs((data || []) as SubcontractJob[]);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([fetchContractors(), fetchJobs()]);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load subcontracting data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- CRUD ----
  const resetForm = () => {
    setContractorId("");
    setJobType("new_install");
    setCustomerName("");
    setAddress("");
    setSystemSizeKw("");
    setPanelQty("");
    setPricePerPanel("");
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const createJob = async () => {
    if (!contractorId) return setError("Please select a contractor.");
    if (!customerName.trim()) return setError("Customer name is required.");
    if (!address.trim()) return setError("Address is required.");

    setSaving(true);
    setError(null);

    try {
      // defaults by contractor (if user didn't enter price)
      const defaultPPW = selectedContractor?.default_new_install_ppw ?? null;
      const defaultPricePerPanel = selectedContractor?.default_detach_reset_price_per_panel ?? null;

      const payload: Partial<SubcontractJob> = {
        contractor_id: contractorId,
        job_type: jobType,
        customer_name: customerName.trim(),
        address: address.trim(),

        // IMPORTANT: status belongs on subcontract_jobs
        workflow_status:
          jobType === "new_install"
            ? "install_scheduled"
            : jobType === "detach_reset"
            ? "detach_scheduled"
            : "service_scheduled",
      };

      if (jobType === "new_install") {
        payload.system_size_kw = systemSizeKw ? Number(systemSizeKw) : null;

        // OPTIONAL: if you want to store PPW later, add a column in DB.
        // For now we keep it out, because your subcontract_jobs schema does not include ppw.
        // You can store it in notes if needed:
        if (defaultPPW && !payload.notes) payload.notes = `Default PPW: ${defaultPPW}`;
      }

      if (jobType === "detach_reset") {
        payload.panel_qty = panelQty ? Number(panelQty) : null;
        payload.price_per_panel = pricePerPanel ? Number(pricePerPanel) : defaultPricePerPanel;
      }

      if (jobType === "service") {
        // you can set defaults for service rate later if you add a column for it
      }

      const { error: insertError } = await supabase.from("subcontract_jobs").insert(payload);

      if (insertError) throw insertError;

      await fetchJobs();
      closeModal();
    } catch (e: any) {
      console.error("Error creating subcontract job:", e);
      setError(e?.message || "Failed to create subcontract job");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!jobId) return;

    try {
      const { error } = await supabase
        .from("subcontract_jobs")
        .delete()
        .eq("id", jobId);

      if (error) throw error;

      await fetchJobs();
    } catch (e: any) {
      console.error("Error deleting subcontract job:", e);
      setError(e?.message || "Failed to delete subcontract job");
    }
  };

  // ---- UI ----
  if (loading) return <div style={{ padding: 16 }}>Loading subcontracting…</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Subcontracting</h2>
        <button onClick={openModal} style={{ padding: "8px 12px" }}>
          + Add Subcontract Job
        </button>
      </div>

      {error && (
        <div style={{ background: "#fee", color: "#900", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* LIST */}
      <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "180px 140px 1fr 140px 120px", gap: 8, padding: 10, background: "#f7f7f7", fontWeight: 600 }}>
          <div>Contractor</div>
          <div>Job Type</div>
          <div>Customer / Address</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {jobs.map((j) => (
          <div key={j.id} style={{ display: "grid", gridTemplateColumns: "180px 140px 1fr 140px 120px", gap: 8, padding: 10, borderTop: "1px solid #eee" }}>
            <div>{j.contractor?.name || j.contractor_id}</div>
            <div>{j.job_type}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{j.customer_name}</div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>{j.address}</div>
            </div>
            <div>{j.workflow_status}</div>
            <div>
              <button onClick={() => deleteJob(j.id)} style={{ padding: "6px 10px" }}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {jobs.length === 0 && <div style={{ padding: 12, opacity: 0.8 }}>No subcontract jobs yet.</div>}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div style={{ width: 520, background: "#fff", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Add Subcontract Job</h3>
              <button onClick={closeModal}>✕</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Select Contractor *</label>
              <select value={contractorId} onChange={(e) => setContractorId(e.target.value)} style={{ width: "100%", padding: 8 }}>
                <option value="">Select…</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Job Type *</label>
              <select value={jobType} onChange={(e) => setJobType(e.target.value as JobType)} style={{ width: "100%", padding: 8 }}>
                <option value="new_install">New Install</option>
                <option value="detach_reset">Detach & Reset</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Customer Name *</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Address *</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </div>

            {jobType === "new_install" && (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>System Size (kW)</label>
                <input value={systemSizeKw} onChange={(e) => setSystemSizeKw(e.target.value)} style={{ width: "100%", padding: 8 }} />
              </div>
            )}

            {jobType === "detach_reset" && (
              <>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Panel Qty</label>
                  <input value={panelQty} onChange={(e) => setPanelQty(e.target.value)} style={{ width: "100%", padding: 8 }} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Price per Panel (defaults to contractor if blank)
                  </label>
                  <input value={pricePerPanel} onChange={(e) => setPricePerPanel(e.target.value)} style={{ width: "100%", padding: 8 }} />
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button onClick={closeModal} disabled={saving} style={{ padding: "8px 12px" }}>
                Cancel
              </button>
              <button onClick={createJob} disabled={saving} style={{ padding: "8px 12px" }}>
                {saving ? "Creating…" : "Create Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
