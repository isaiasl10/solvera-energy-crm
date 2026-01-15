import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useProposalDesign } from "../hooks/useProposalDesign";
import { useFinancingOptions } from "../hooks/useFinancingOptions";
import ProposalDesignMap from "./ProposalDesignMap";
import { User, DollarSign, MapPin, FileText, ArrowLeft } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"form" | "map">("form");

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
    <div style={{ padding: 16, height: "calc(100vh - 64px)", overflow: "auto", background: "#f8f9fa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
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
              padding: "6px 12px",
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
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Customer & Pricing</div>
          <div style={{ opacity: 0.6, fontSize: 12, color: "#6b7280" }}>
            Confirm customer, financing, and payments
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <button
          onClick={() => setActiveTab("form")}
          style={{
            padding: "10px 20px",
            background: activeTab === "form" ? "#fff" : "transparent",
            border: "none",
            borderBottom:
              activeTab === "form" ? "2px solid #f97316" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: activeTab === "form" ? 600 : 500,
            fontSize: 13,
            color: activeTab === "form" ? "#111827" : "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <FileText size={15} />
          Customer Details
        </button>
        <button
          onClick={() => setActiveTab("map")}
          style={{
            padding: "10px 20px",
            background: activeTab === "map" ? "#fff" : "transparent",
            border: "none",
            borderBottom:
              activeTab === "map" ? "2px solid #f97316" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: activeTab === "map" ? 600 : 500,
            fontSize: 13,
            color: activeTab === "map" ? "#111827" : "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MapPin size={15} />
          Solar Design Preview
        </button>
      </div>

      {activeTab === "form" && (
        <div
          style={{
            maxWidth: 1400,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: 16,
          }}
        >
          <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e5e7eb" }}>
              <User size={16} style={{ color: "#6b7280" }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>Customer Information</span>
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Name
            </label>
            <input
              value={customer?.name ?? ""}
              onChange={(e) =>
                setCustomer((c: any) => ({ ...c, name: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 13,
                color: "#111827",
                marginBottom: 12,
              }}
            />

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={customer?.email ?? ""}
              onChange={(e) =>
                setCustomer((c: any) => ({ ...c, email: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 13,
                color: "#111827",
                marginBottom: 12,
              }}
            />

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Phone
            </label>
            <input
              type="tel"
              value={customer?.phone ?? ""}
              onChange={(e) =>
                setCustomer((c: any) => ({ ...c, phone: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 13,
                color: "#111827",
                marginBottom: 12,
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
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Save Customer
            </button>
          </div>

          <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e5e7eb" }}>
              <DollarSign size={16} style={{ color: "#6b7280" }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>Financing</span>
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Financing Option
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
                padding: "8px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 13,
                color: "#111827",
                marginBottom: 12,
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
                    finance_option_id:
                      proposalDraft.finance_option_id ?? null,
                  })
                  .eq("id", proposalId);
                await refresh();
              }}
              style={{
                width: "100%",
                background: "#f97316",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Save Financing
            </button>
          </div>

          {(proposalDraft.finance_type ?? "cash") === "cash" && (
            <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e5e7eb" }}>
                Cash Payment Schedule
              </div>

              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Deposit
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
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#111827",
                  marginBottom: 12,
                }}
              />

              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                2nd Payment
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
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#111827",
                  marginBottom: 12,
                }}
              />

              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Final Payment
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
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#111827",
                  marginBottom: 12,
                }}
              />

              <button
                onClick={async () => {
                  await supabase
                    .from("proposals")
                    .update({
                      cash_deposit: proposalDraft.cash_deposit ?? null,
                      cash_second_payment:
                        proposalDraft.cash_second_payment ?? null,
                      cash_final_payment:
                        proposalDraft.cash_final_payment ?? null,
                    })
                    .eq("id", proposalId);
                  await refresh();
                }}
                style={{
                  width: "100%",
                  background: "#f97316",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Save Cash Schedule
              </button>
            </div>
          )}

          <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e5e7eb" }}>
              System Summary
            </div>
            <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: 500, color: "#6b7280" }}>Module:</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>
                  {selectedModel?.brand && selectedModel?.model
                    ? `${selectedModel.brand} ${selectedModel.model}`
                    : selectedModel?.model || "—"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: 500, color: "#6b7280" }}>Panels:</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>{systemSummary.panelCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: 500, color: "#6b7280" }}>System Size:</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>
                  {fmt(systemSummary.systemKw, 2)} kW
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: 500, color: "#6b7280" }}>Annual Production:</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>
                  {fmt(systemSummary.annualProductionKwh)} kWh
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontWeight: 500, color: "#6b7280" }}>Offset:</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>
                  {fmt(systemSummary.offsetPercent, 1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "map" && (
        <div
          style={{
            width: "100%",
            height: "calc(100vh - 200px)",
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <ProposalDesignMap
            readOnly
            center={{ lat: proposal.lat, lng: proposal.lng }}
            planes={planes}
            obstructions={obstructions}
            panels={panels}
            panelModels={panelModels}
          />
        </div>
      )}
    </div>
  );
}
