import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useProposalDesign } from "../hooks/useProposalDesign";
import { useFinancingOptions } from "../hooks/useFinancingOptions";
import { User, DollarSign, ArrowLeft, Zap, Package } from "lucide-react";

const fmt = (n?: number | null, digits = 0) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";

export default function CustomerPricing({
  proposalId,
  onBack,
}: {
  proposalId: string | null;
  onBack?: () => void;
}) {
  const {
    proposal,
    planes,
    obstructions,
    panels,
    panelModels,
    systemSummary,
    loading,
    refresh,
  } = useProposalDesign(proposalId ?? undefined);

  const { options: financingOptions } = useFinancingOptions();

  const [customer, setCustomer] = useState<any>(null);
  const [proposalDraft, setProposalDraft] = useState<any>({});

  useEffect(() => {
    if (!proposal?.customer_id) return;

    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", proposal.customer_id)
        .maybeSingle();

      setCustomer(data);
      setProposalDraft(proposal);
    })();
  }, [proposal]);

  const selectedFinanceValue = useMemo(() => {
    if (!proposalDraft) return "cash";
    if ((proposalDraft.finance_type ?? "cash") === "cash") return "cash";
    return proposalDraft.finance_option_id ?? "cash";
  }, [proposalDraft]);

  if (!proposalId)
    return <div style={{ padding: 16 }}>Select a proposal first.</div>;

  if (loading || !proposal)
    return <div style={{ padding: 16 }}>Loading customer & pricing…</div>;

  const selectedModel = panelModels.find(
    (m) => m.id === proposal.panel_model_id
  );

  return (
    <div style={{ padding: 20, height: "calc(100vh - 64px)", overflow: "auto", background: "#f5f5f7" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {onBack && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onBack();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 13,
                color: "#374151",
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              Customer & Pricing Configuration
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              Complete customer details, system specifications, and financing
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f3f4f6" }}>
              <Zap size={18} style={{ color: "#f97316" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111827", letterSpacing: "-0.01em" }}>System Specifications</span>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>Module Type</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#111827", textAlign: "right" }}>
                  {selectedModel?.brand && selectedModel?.model
                    ? `${selectedModel.brand} ${selectedModel.model} (${selectedModel.watts}W)`
                    : "—"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>Panel Quantity</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{systemSummary.panelCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>System Size</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                  {fmt(systemSummary.systemKw, 2)} kW
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>Annual Production</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                  {fmt(systemSummary.annualProductionKwh, 0)} kWh
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                <span style={{ fontWeight: 500, fontSize: 13, color: "#6b7280" }}>Offset</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#10b981" }}>
                  {fmt(systemSummary.offsetPercent, 1)}%
                </span>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f3f4f6" }}>
              <DollarSign size={18} style={{ color: "#f97316" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111827", letterSpacing: "-0.01em" }}>Pricing Details</span>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  Total System Price ($)
                </label>
                <input
                  type="number"
                  value={proposalDraft.total_price ?? ""}
                  onChange={(e) =>
                    setProposalDraft((p: any) => ({
                      ...p,
                      total_price: Number(e.target.value),
                    }))
                  }
                  placeholder="Enter total price"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  Price Per Watt ($/W)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={proposalDraft.price_per_watt ?? ""}
                  onChange={(e) =>
                    setProposalDraft((p: any) => ({
                      ...p,
                      price_per_watt: Number(e.target.value),
                    }))
                  }
                  placeholder="Enter price per watt"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                />
              </div>

              {proposalDraft.total_price && systemSummary.systemKw > 0 && (
                <div style={{ padding: 12, background: "#f9fafb", borderRadius: 6, marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Calculated Price Per Watt</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                    ${(proposalDraft.total_price / (systemSummary.systemKw * 1000)).toFixed(2)}/W
                  </div>
                </div>
              )}

              <button
                onClick={async () => {
                  await supabase
                    .from("proposals")
                    .update({
                      total_price: proposalDraft.total_price ?? null,
                      price_per_watt: proposalDraft.price_per_watt ?? null,
                    })
                    .eq("id", proposalId);
                  await refresh();
                }}
                style={{
                  width: "100%",
                  background: "#f97316",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                Save Pricing
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f3f4f6" }}>
              <User size={18} style={{ color: "#f97316" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111827", letterSpacing: "-0.01em" }}>Customer Information</span>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  Full Name
                </label>
                <input
                  value={customer?.name ?? ""}
                  onChange={(e) =>
                    setCustomer((c: any) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="Enter customer name"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={customer?.email ?? ""}
                  onChange={(e) =>
                    setCustomer((c: any) => ({ ...c, email: e.target.value }))
                  }
                  placeholder="customer@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customer?.phone ?? ""}
                  onChange={(e) =>
                    setCustomer((c: any) => ({ ...c, phone: e.target.value }))
                  }
                  placeholder="(555) 123-4567"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                />
              </div>

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
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                Save Customer Information
              </button>
            </div>
          </div>

          <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f3f4f6" }}>
              <Package size={18} style={{ color: "#f97316" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111827", letterSpacing: "-0.01em" }}>Financing Options</span>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  Select Financing Plan
                </label>
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
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                >
                  {financingOptions.map((opt: any) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                Save Financing Option
              </button>
            </div>
          </div>
        </div>

        {(proposalDraft.finance_type ?? "cash") === "cash" && (
          <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f3f4f6" }}>
              <DollarSign size={18} style={{ color: "#f97316" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111827", letterSpacing: "-0.01em" }}>Cash Payment Schedule</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  Deposit Amount ($)
                </label>
                <input
                  type="number"
                  value={proposalDraft.cash_deposit ?? ""}
                  onChange={(e) =>
                    setProposalDraft((p: any) => ({
                      ...p,
                      cash_deposit: Number(e.target.value),
                    }))
                  }
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  2nd Payment ($)
                </label>
                <input
                  type="number"
                  value={proposalDraft.cash_second_payment ?? ""}
                  onChange={(e) =>
                    setProposalDraft((p: any) => ({
                      ...p,
                      cash_second_payment: Number(e.target.value),
                    }))
                  }
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, letterSpacing: "0.01em" }}>
                  Final Payment ($)
                </label>
                <input
                  type="number"
                  value={proposalDraft.cash_final_payment ?? ""}
                  onChange={(e) =>
                    setProposalDraft((p: any) => ({
                      ...p,
                      cash_final_payment: Number(e.target.value),
                    }))
                  }
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                  }}
                />
              </div>
            </div>

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
                width: "fit-content",
                background: "#f97316",
                color: "#fff",
                padding: "10px 24px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                marginTop: 16,
              }}
            >
              Save Payment Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
