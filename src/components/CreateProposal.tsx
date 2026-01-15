import React, { useMemo, useRef, useEffect, useState } from "react";
import { useProposalDesign } from "../hooks/useProposalDesign";
import { useFinancingOptions } from "../hooks/useFinancingOptions";
import { supabase } from "../lib/supabaseClient";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ProposalDesignMap from "./ProposalDesignMap";
import { ChevronDown, ChevronUp } from "lucide-react";

const fmt = (n?: number | null, digits = 0) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";

type CreateProposalProps = {
  proposalId: string;
  onBack?: () => void;
};

export default function CreateProposal({ proposalId, onBack }: CreateProposalProps) {
  const { proposal, planes, obstructions, panels, panelModels, systemSummary, loading, refresh } =
    useProposalDesign(proposalId);
  const { options: financingOptions } = useFinancingOptions();
  const printRef = useRef<HTMLDivElement>(null);

  const [customer, setCustomer] = useState<any>(null);
  const [rep, setRep] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [proposalDraft, setProposalDraft] = useState<any>({});
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!proposal) return;

      const queries = [];

      if (proposal.customer_id) {
        queries.push(
          supabase.from("customers").select("*").eq("id", proposal.customer_id).maybeSingle()
        );
      } else {
        queries.push(Promise.resolve({ data: null, error: null }));
      }

      if (proposal.created_by) {
        queries.push(
          supabase.from("app_users").select("*").eq("id", proposal.created_by).maybeSingle()
        );
      } else {
        queries.push(Promise.resolve({ data: null, error: null }));
      }

      const [{ data: c }, { data: r }] = await Promise.all(queries);
      setCustomer(c);
      setRep(r);
      setProposalDraft(proposal);
    })();
  }, [proposal]);

  const selectedFinanceValue = useMemo(() => {
    if (!proposalDraft) return "cash";
    if ((proposalDraft.finance_type ?? "cash") === "cash") return "cash";
    return proposalDraft.finance_option_id ?? "cash";
  }, [proposalDraft]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const selectedModel = useMemo(
    () => panelModels.find((m) => m.id === proposal?.panel_model_id) ?? null,
    [panelModels, proposal]
  );

  const downloadPdf = async () => {
    if (!printRef.current) return;

    try {
      setGenerating(true);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 0;
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        let remaining = imgHeight;
        while (remaining > 0) {
          pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
          remaining -= pageHeight;
          y -= pageHeight;
          if (remaining > 0) pdf.addPage();
        }
      }

      pdf.save(`Proposal-${customer?.name ?? "Customer"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`Solar Proposal - ${customer?.name ?? ""}`);
    const body = encodeURIComponent(
      `Hi ${customer?.name ?? ""},\n\nAttached is your solar proposal for ${proposal?.formatted_address ?? "your property"}.\n\nSystem Details:\n- ${systemSummary.panelCount} solar panels\n- ${fmt(systemSummary.systemKw, 2)} kW system\n- ${fmt(systemSummary.annualProductionKwh, 0)} kWh estimated annual production\n- ${fmt(systemSummary.offsetPercent, 1)}% energy offset\n\nPlease review and let me know if you have any questions.\n\nBest regards,\n${rep?.full_name ?? "Your Solar Team"}`
    );
    window.location.href = `mailto:${customer?.email ?? ""}?subject=${subject}&body=${body}`;
  };

  if (!proposalId) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>No Proposal Selected</div>
          <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>
            Please select a proposal from the Proposals view to generate a PDF.
          </div>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ← Back to Proposals
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading || !proposal) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Loading proposal...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)" }}>
      <div style={{ width: 420, padding: 16, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Create Proposal</div>
        <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 16 }}>
          Preview → Download PDF → Send
        </div>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 12,
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Back to Design
          </button>
        )}

        <button
          onClick={downloadPdf}
          disabled={generating}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 12,
            background: generating ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "Generating PDF..." : "Download PDF"}
        </button>

        <button
          onClick={sendEmail}
          style={{
            width: "100%",
            padding: 12,
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Send to Customer (Email Draft)
        </button>

        <div style={{ marginTop: 24, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>System Summary</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Panels:</span>
              <span style={{ fontWeight: 600 }}>{systemSummary.panelCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Module:</span>
              <span style={{ fontWeight: 600, fontSize: 11, textAlign: "right" }}>
                {selectedModel
                  ? `${selectedModel.brand} ${selectedModel.model} (${selectedModel.watts}W)`
                  : "—"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>System Size:</span>
              <span style={{ fontWeight: 600 }}>{fmt(systemSummary.systemKw, 2)} kW</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Est Annual Production:</span>
              <span style={{ fontWeight: 600 }}>{fmt(systemSummary.annualProductionKwh, 0)} kWh</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Annual Usage:</span>
              <span style={{ fontWeight: 600 }}>{fmt(systemSummary.annualUsageKwh, 0)} kWh</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Offset:</span>
              <span style={{ fontWeight: 600 }}>{fmt(systemSummary.offsetPercent, 1)}%</span>
            </div>
          </div>
        </div>

        {customer && (
          <div style={{ marginTop: 16, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Customer</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600 }}>{customer.name}</div>
              <div style={{ opacity: 0.7 }}>{customer.email}</div>
              <div style={{ opacity: 0.7 }}>{customer.phone}</div>
            </div>
          </div>
        )}

        {rep && (
          <div style={{ marginTop: 16, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Sales Rep</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600 }}>{rep.full_name}</div>
              <div style={{ opacity: 0.7 }}>{rep.email}</div>
              <div style={{ opacity: 0.7 }}>{rep.phone}</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, borderTop: "2px solid #e5e7eb", paddingTop: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Customer & Pricing</div>

          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('customer')}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                background: expandedSection === 'customer' ? "#f9fafb" : "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <span>Customer Information</span>
              {expandedSection === 'customer' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === 'customer' && customer && (
              <div style={{ padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Name</label>
                <input
                  value={customer.name ?? ""}
                  onChange={(e) => setCustomer((c: any) => ({ ...c, name: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                />
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Email</label>
                <input
                  type="email"
                  value={customer.email ?? ""}
                  onChange={(e) => setCustomer((c: any) => ({ ...c, email: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                />
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Phone</label>
                <input
                  type="tel"
                  value={customer.phone ?? ""}
                  onChange={(e) => setCustomer((c: any) => ({ ...c, phone: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                />
                <button
                  onClick={async () => {
                    if (!customer?.id) return;
                    await supabase
                      .from("customers")
                      .update({
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone,
                      })
                      .eq("id", customer.id);
                  }}
                  style={{
                    width: "100%",
                    background: "#f97316",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Save Customer
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('financing')}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                background: expandedSection === 'financing' ? "#f9fafb" : "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <span>Financing Options</span>
              {expandedSection === 'financing' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === 'financing' && (
              <div style={{ padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Financing Option</label>
                <select
                  value={selectedFinanceValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "cash") {
                      setProposalDraft((p: any) => ({
                        ...p,
                        finance_type: "cash",
                        finance_option_id: null,
                      }));
                    } else {
                      setProposalDraft((p: any) => ({
                        ...p,
                        finance_type: "finance",
                        finance_option_id: v,
                      }));
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  {financingOptions.map((opt: any) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    await supabase
                      .from("proposals")
                      .update({
                        finance_type: proposalDraft.finance_type ?? "cash",
                        finance_option_id: proposalDraft.finance_option_id ?? null,
                      })
                      .eq("id", proposalId);
                    await refresh();
                  }}
                  style={{
                    width: "100%",
                    background: "#f97316",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Save Financing
                </button>
              </div>
            )}
          </div>

          {(proposalDraft.finance_type ?? "cash") === "cash" && (
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={() => toggleSection('payments')}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  background: expandedSection === 'payments' ? "#f9fafb" : "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <span>Payment Schedule</span>
                {expandedSection === 'payments' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSection === 'payments' && (
                <div style={{ padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Deposit</label>
                  <input
                    type="number"
                    value={proposalDraft.cash_deposit ?? ""}
                    onChange={(e) =>
                      setProposalDraft((p: any) => ({
                        ...p,
                        cash_deposit: Number(e.target.value),
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  />
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>2nd Payment</label>
                  <input
                    type="number"
                    value={proposalDraft.cash_second_payment ?? ""}
                    onChange={(e) =>
                      setProposalDraft((p: any) => ({
                        ...p,
                        cash_second_payment: Number(e.target.value),
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  />
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Final Payment</label>
                  <input
                    type="number"
                    value={proposalDraft.cash_final_payment ?? ""}
                    onChange={(e) =>
                      setProposalDraft((p: any) => ({
                        ...p,
                        cash_final_payment: Number(e.target.value),
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  />
                  <button
                    onClick={async () => {
                      await supabase
                        .from("proposals")
                        .update({
                          cash_deposit: proposalDraft.cash_deposit ?? null,
                          cash_second_payment: proposalDraft.cash_second_payment ?? null,
                          cash_final_payment: proposalDraft.cash_final_payment ?? null,
                        })
                        .eq("id", proposalId);
                      await refresh();
                    }}
                    style={{
                      width: "100%",
                      background: "#f97316",
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    Save Payment Schedule
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 24, background: "#f7f7f7" }}>
        <div
          ref={printRef}
          style={{
            background: "white",
            padding: 32,
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Solar Proposal</div>
              <div style={{ fontSize: 14, opacity: 0.7 }}>{proposal.formatted_address}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Solvera Energy</div>
              {rep && (
                <>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>{rep.full_name}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>{rep.email}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>{rep.phone}</div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Customer</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600 }}>{customer?.name ?? "—"}</div>
                <div style={{ opacity: 0.7 }}>{customer?.email ?? ""}</div>
                <div style={{ opacity: 0.7 }}>{customer?.phone ?? ""}</div>
              </div>
            </div>

            <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>System Summary</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>Panels: <b>{systemSummary.panelCount}</b></div>
                <div>System Size: <b>{fmt(systemSummary.systemKw, 2)} kW</b></div>
                <div>Est Annual Production: <b>{fmt(systemSummary.annualProductionKwh, 0)} kWh</b></div>
                <div>Estimated Offset: <b>{fmt(systemSummary.offsetPercent, 1)}%</b></div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>System Design</div>
            <div
              style={{
                height: 480,
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
              }}
            >
              <ProposalDesignMap
                readOnly
                center={{ lat: proposal.lat, lng: proposal.lng }}
                planes={planes.map((p) => ({
                  id: p.id,
                  points: p.points,
                  pitch_deg: p.pitch_deg,
                }))}
                obstructions={obstructions.map((o: any) => ({
                  id: o.id,
                  type: o.type,
                  center_lat: o.center_lat ?? o.data?.center_lat ?? 0,
                  center_lng: o.center_lng ?? o.data?.center_lng ?? 0,
                  radius_ft: o.radius_ft ?? o.data?.radius_ft,
                  width_ft: o.width_ft ?? o.data?.width_ft,
                  height_ft: o.height_ft ?? o.data?.height_ft,
                  rotation_deg: o.rotation_deg ?? o.data?.rotation_deg,
                }))}
                panels={panels.map((p: any) => ({
                  id: p.id,
                  center_lat: p.center_lat,
                  center_lng: p.center_lng,
                  rotation_deg: p.rotation_deg ?? 0,
                  is_portrait: p.is_portrait ?? p.orientation === "portrait" ?? true,
                  panel_model_id: p.panel_model_id,
                }))}
                panelModels={panelModels}
              />
            </div>
          </div>

          {selectedModel && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>Equipment</div>
              <div style={{ padding: 16, background: "#f9fafb", borderRadius: 10 }}>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                  <div>
                    <b>Solar Panels:</b> {selectedModel.brand} {selectedModel.model} ({selectedModel.watts}W)
                  </div>
                  <div>
                    <b>Quantity:</b> {systemSummary.panelCount} panels
                  </div>
                  <div>
                    <b>Total System Size:</b> {fmt(systemSummary.systemKw, 2)} kW
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>Production Estimate</div>
            <div style={{ padding: 16, background: "#f9fafb", borderRadius: 10 }}>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div>
                  <b>Estimated Annual Production:</b> {fmt(systemSummary.annualProductionKwh, 0)} kWh
                </div>
                <div>
                  <b>Your Annual Usage:</b> {fmt(systemSummary.annualUsageKwh, 0)} kWh
                </div>
                <div>
                  <b>Estimated Offset:</b> {fmt(systemSummary.offsetPercent, 1)}%
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, fontSize: 11, opacity: 0.6, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
            <div>
              This proposal is an estimate based on the information provided. Actual system performance may
              vary based on weather conditions, shading, and other factors. Production estimates are
              calculated using industry-standard methods and assumptions.
            </div>
            <div style={{ marginTop: 8 }}>
              Valid for 30 days from {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
