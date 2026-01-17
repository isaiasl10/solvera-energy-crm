import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { loadGoogleMaps } from "../lib/loadGoogleMaps";
import { Plus, Search, X } from "lucide-react";
import SubcontractJobDetail from "./SubcontractJobDetail";

type JobType = "new_install" | "detach_reset" | "service";

interface Contractor {
  id: string;
  company_name: string;
  ppw: number | string | null;
  adders: any[];
  address: string | null;
  phone_number: string | null;
  email: string | null;
  default_detach_reset_price_per_panel: number | string | null;
}

interface SubcontractJob {
  id: string;
  contractor_id: string;
  job_type: JobType;

  contractor_name: string;
  subcontract_customer_name: string;
  installation_address: string;

  system_size_kw: number | string | null;
  ppw: number | null;

  gross_revenue: number | string | null;
  net_revenue: number | string | null;

  subcontract_status: string | null;
  detach_reset_status: string | null;

  invoice_number: string | null;

  panel_qty: number | string | null;
  gross_amount: number | string | null;

  created_at: string;
}

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function SubcontractingIntake() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contractor_id: "",
    customer_name: "",
    address: "",
    job_type: "new_install" as JobType,
  });
  const [selectedAdders, setSelectedAdders] = useState<{ name: string; amount: number; type?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    loadSubcontractJobs();
    loadContractors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channelName = `subcontract_jobs_${Date.now()}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subcontract_jobs" },
        () => loadSubcontractJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadContractors = async () => {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .select("id, company_name, ppw, adders, address, phone_number, email, default_detach_reset_price_per_panel")
        .order("company_name", { ascending: true });

      if (error) throw error;

      // ✅ prevent .toFixed crash later: keep ppw as-is but we will format safely in UI
      setContractors((data || []) as Contractor[]);
    } catch (error) {
      console.error("Error loading contractors:", error);
    }
  };

  useEffect(() => {
    if (showAddModal && addressInputRef.current) initializeAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddModal]);

  const initializeAutocomplete = async () => {
    try {
      const google = await loadGoogleMaps();

      if (addressInputRef.current) {
        if (autocompleteRef.current) google.maps.event.clearInstanceListeners(autocompleteRef.current);

        autocompleteRef.current = new google.maps.places.Autocomplete(addressInputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && place.formatted_address) {
            setFormData((prev) => ({ ...prev, address: place.formatted_address || "" }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error initializing Google Maps autocomplete:", error);
    }
  };

  const loadSubcontractJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subcontract_jobs")
        .select(
          `
          id,
          contractor_id,
          job_type,
          customer_name,
          address,
          system_size_kw,
          panel_qty,
          price_per_panel,
          gross_amount,
          net_revenue,
          workflow_status,
          invoice_number,
          created_at,
          contractor:contractors(company_name, ppw, default_detach_reset_price_per_panel)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: SubcontractJob[] = (data || []).map((row: any) => {
        const contractorName = row?.contractor?.company_name || "";
        const contractorPpw = toNum(row?.contractor?.ppw);

        const status = row?.workflow_status ?? null;

        return {
          id: row.id,
          contractor_id: row.contractor_id,
          job_type: row.job_type,

          contractor_name: contractorName,
          subcontract_customer_name: row.customer_name ?? "",
          installation_address: row.address ?? "",

          system_size_kw: row.system_size_kw ?? null,
          ppw: contractorPpw,

          gross_amount: row.gross_amount ?? null,
          gross_revenue: row.gross_amount ?? null,
          net_revenue: row.net_revenue ?? null,

          subcontract_status: status,
          detach_reset_status: status,

          invoice_number: row.invoice_number ?? null,

          panel_qty: row.panel_qty ?? null,
          created_at: row.created_at,
        };
      });

      setJobs(mapped);
    } catch (error) {
      console.error("Error loading subcontract jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contractor_id) {
      alert("Please select a contractor");
      return;
    }

    setSubmitting(true);

    try {
      const selectedContractor = contractors.find((c) => c.id === formData.contractor_id);
      if (!selectedContractor) throw new Error("Selected contractor not found");

      const payload: any = {
        contractor_id: formData.contractor_id,
        job_type: formData.job_type,
        customer_name: formData.customer_name,
        address: formData.address,
        workflow_status:
          formData.job_type === "new_install"
            ? "install_scheduled"
            : formData.job_type === "detach_reset"
            ? "detach_scheduled"
            : "pending",
      };

      if (formData.job_type === "new_install") {
        if (selectedAdders?.length) payload.notes = JSON.stringify({ subcontract_adders: selectedAdders });
      }

      if (formData.job_type === "detach_reset") {
        payload.price_per_panel = toNum(selectedContractor.default_detach_reset_price_per_panel);
      }

      const { data, error } = await supabase.from("subcontract_jobs").insert([payload]).select("id").single();
      if (error) throw error;

      setShowAddModal(false);
      setFormData({ contractor_id: "", customer_name: "", address: "", job_type: "new_install" });
      setSelectedAdders([]);

      await loadSubcontractJobs();

      if (data?.id) setSelectedJobId(data.id);
    } catch (error: any) {
      console.error("Error creating subcontract job:", error);
      alert(`Error creating subcontract job: ${error?.message || "Unknown error"}\n\nCheck console for details.`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      job.installation_address?.toLowerCase().includes(searchLower) ||
      job.contractor_name?.toLowerCase().includes(searchLower) ||
      job.subcontract_customer_name?.toLowerCase().includes(searchLower) ||
      (job.invoice_number || "")?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "install_complete":
        return { bg: "#d1fae5", color: "#065f46" };
      case "install_complete_pending_payment":
        return { bg: "#fef3c7", color: "#92400e" };
      case "pending_completion":
        return { bg: "#fde68a", color: "#78350f" };
      default:
        return { bg: "#dbeafe", color: "#1e40af" };
    }
  };

  const formatStatus = (status: string) =>
    status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const getJobTypeBadge = (jobType: string) => {
    switch (jobType) {
      case "new_install":
        return { label: "NEW INSTALL", bg: "#dbeafe", color: "#1e40af" };
      case "detach_reset":
        return { label: "DETACH & RESET", bg: "#fef3c7", color: "#92400e" };
      case "service":
        return { label: "SERVICE", bg: "#e0e7ff", color: "#3730a3" };
      default:
        return { label: "NEW INSTALL", bg: "#dbeafe", color: "#1e40af" };
    }
  };

  const money = (v: any) => {
    const n = toNum(v);
    return n == null ? "-" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  return (
    // ✅ Scroll-safe wrapper (does not change your layout)
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Subcontracting Jobs Intake</h1>
          <p className="text-sm text-gray-600">Manage jobs from external contractors - isolated from internal pipeline</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="min-h-[44px] flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <Plus size={20} />
          <span className="whitespace-nowrap">Add Subcontract Job</span>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg">
        <Search size={20} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by contractor, customer, address, or invoice number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border-none outline-none text-sm text-gray-900 placeholder-gray-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading subcontract jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            {searchTerm ? "No jobs match your search." : 'No subcontract jobs yet. Click "Add Subcontract Job" to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Invoice #</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Job Type</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Contractor</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Customer</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Address</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">System Size</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Gross Revenue</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Net Revenue</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const statusStyle = getStatusColor(job.subcontract_status || "install_scheduled");

                  return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className="border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-900 font-semibold">{job.invoice_number || "-"}</td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                        <span
                          className="inline-block px-2 py-1 text-xs font-bold rounded"
                          style={{
                            backgroundColor: getJobTypeBadge(job.job_type || "new_install").bg,
                            color: getJobTypeBadge(job.job_type || "new_install").color,
                          }}
                        >
                          {getJobTypeBadge(job.job_type || "new_install").label}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-900 font-medium">{job.contractor_name}</td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-900">{job.subcontract_customer_name || "-"}</td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-600">{job.installation_address}</td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-900">
                        {job.job_type === "detach_reset"
                          ? job.panel_qty
                            ? `${job.panel_qty} panels`
                            : "-"
                          : job.system_size_kw
                          ? `${job.system_size_kw} kW`
                          : "-"}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-emerald-600 font-semibold">
                        {job.job_type === "detach_reset" ? money(job.gross_amount) : money(job.gross_revenue)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-green-600 font-bold">{money(job.net_revenue)}</td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                          {formatStatus(job.subcontract_status || "install_scheduled")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a" }}>Add Subcontract Job</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedAdders([]);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#6b7280" }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  marginBottom: "20px",
                  padding: "12px",
                  background: "#f0f9ff",
                  borderRadius: "6px",
                  border: "1px solid #bae6fd",
                }}
              >
                Enter the basic information to create the job. You'll be able to add financial details, system specifications, and generate invoices in the next step.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Select Contractor *</label>
                  {contractors.length === 0 ? (
                    <div style={{ padding: "10px 12px", backgroundColor: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "6px", fontSize: "14px", color: "#92400e" }}>
                      No contractors available. Please add a contractor first.
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.contractor_id}
                      onChange={(e) => {
                        setFormData({ ...formData, contractor_id: e.target.value });
                        setSelectedAdders([]);
                      }}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none", backgroundColor: "white" }}
                    >
                      <option value="">Select a contractor...</option>
                      {contractors.map((contractor) => {
                        const ppwNum = toNum(contractor.ppw);
                        return (
                          <option key={contractor.id} value={contractor.id}>
                            {contractor.company_name} {ppwNum != null ? `($${ppwNum.toFixed(2)}/kW)` : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Job Type *</label>
                  <select
                    required
                    value={formData.job_type}
                    onChange={(e) => setFormData({ ...formData, job_type: e.target.value as JobType })}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none", backgroundColor: "white" }}
                  >
                    <option value="new_install">New Install</option>
                    <option value="detach_reset">Detach & Reset</option>
                    <option value="service">Service</option>
                  </select>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px", fontStyle: "italic" }}>
                    {formData.job_type === "new_install" && "Standard installation job with system size and PPW pricing"}
                    {formData.job_type === "detach_reset" && "Panel detach and reset job with per-panel pricing"}
                    {formData.job_type === "service" && "Service job for maintenance or repairs"}
                  </p>
                </div>

                {formData.contractor_id &&
                  formData.job_type === "new_install" &&
                  (contractors.find((c) => c.id === formData.contractor_id)?.adders as any[])?.length > 0 && (
                    <div>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Select Adders (Optional)</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {(contractors.find((c) => c.id === formData.contractor_id)?.adders as any[]).map((adder: any, index: number) => (
                          <label
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 12px",
                              backgroundColor: selectedAdders.find((a) => a.name === adder.name) ? "#dbeafe" : "#f3f4f6",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAdders.some((a) => a.name === adder.name)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedAdders([...selectedAdders, adder]);
                                else setSelectedAdders(selectedAdders.filter((a) => a.name !== adder.name));
                              }}
                              style={{ cursor: "pointer" }}
                            />
                            <span style={{ fontSize: "14px", color: "#1a1a1a" }}>
                              {adder.name}: ${Number(adder.amount || 0).toFixed(2)}
                              {adder.type === "per_watt" ? "/kW" : adder.type === "per_panel" ? "/panel" : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="John Smith"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Address *</label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Start typing address..."
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none" }}
                  />
                  <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px", fontStyle: "italic" }}>Start typing to see address suggestions</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedAdders([]);
                  }}
                  disabled={submitting}
                  style={{ padding: "10px 20px", border: "1px solid #d1d5db", background: "white", color: "#374151", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    background: submitting ? "#9ca3af" : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    color: "white",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Creating..." : "Create Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedJobId && <SubcontractJobDetail jobId={selectedJobId} onClose={() => setSelectedJobId(null)} onUpdate={loadSubcontractJobs} />}
    </div>
  );
}
