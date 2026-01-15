import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useProposalDesign } from "../hooks/useProposalDesign";
import { useFinancingOptions } from "../hooks/useFinancingOptions";
import { User, DollarSign, ArrowLeft, Zap, Package, ChevronDown, ChevronUp, FileText, CreditCard, File } from "lucide-react";

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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    customer: true,
    electricity: true,
    rate: false,
    system: true,
    pricing: true,
    financing: true,
    payment: true,
  });
  const [activeTab, setActiveTab] = useState<string>("manage");

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

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const CollapsibleSection = ({
    id,
    icon: Icon,
    title,
    children,
  }: {
    id: string;
    icon: any;
    title: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections[id];
    return (
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 12, overflow: "hidden" }}>
        <button
          onClick={() => toggleSection(id)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon size={18} style={{ color: "#111827" }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{title}</span>
          </div>
          {isExpanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
        </button>
        {isExpanded && <div style={{ padding: "16px 20px" }}>{children}</div>}
      </div>
    );
  };

  return (
    <div style={{ height: "calc(100vh - 64px)", overflow: "auto", background: "#f5f5f7" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 20 }}>
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
              Proposal Configuration
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {proposal?.formatted_address ?? "Configure customer details and pricing"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid #e5e7eb", background: "#fff", borderRadius: "8px 8px 0 0", padding: "0 12px" }}>
          {[
            { id: "manage", label: "Manage", icon: User },
            { id: "energy", label: "Energy", icon: Zap },
            { id: "design", label: "Design", icon: Package },
            { id: "payments", label: "Payments", icon: CreditCard },
            { id: "online", label: "Online Proposal", icon: FileText },
            { id: "pdf", label: "PDF Proposal", icon: File },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #f97316" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: 13,
                color: activeTab === tab.id ? "#111827" : "#6b7280",
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <CollapsibleSection id="customer" icon={User} title="Customer Information">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Full Name
              </label>
              <input
                value={customer?.full_name ?? ""}
                onChange={(e) => setCustomer((c: any) => ({ ...c, full_name: e.target.value }))}
                placeholder="Enter customer name"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Email Address
              </label>
              <input
                type="email"
                value={customer?.email ?? ""}
                onChange={(e) => setCustomer((c: any) => ({ ...c, email: e.target.value }))}
                placeholder="customer@example.com"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={customer?.phone ?? ""}
                onChange={(e) => setCustomer((c: any) => ({ ...c, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#111827",
                }}
              />
            </div>
          </div>

          <button
            onClick={async () => {
              if (!customer?.id) return;
              await supabase
                .from("customers")
                .update({
                  full_name: customer.full_name,
                  email: customer.email,
                  phone: customer.phone,
                })
                .eq("id", customer.id);
            }}
            style={{
              marginTop: 16,
              background: "#f97316",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Save Customer Information
          </button>
        </CollapsibleSection>

        <CollapsibleSection id="electricity" icon={Zap} title="Electricity Usage">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Data source
              </label>
              <select
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#111827",
                }}
              >
                <option>Annual Consumption (kWh)</option>
                <option>Monthly Usage</option>
                <option>Utility Bill</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Annual kWh
              </label>
              <input
                type="number"
                value={proposalDraft.annual_consumption ?? ""}
                onChange={(e) =>
                  setProposalDraft((p: any) => ({
                    ...p,
                    annual_consumption: Number(e.target.value),
                  }))
                }
                placeholder="23000"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
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
                  annual_consumption: proposalDraft.annual_consumption ?? null,
                })
                .eq("id", proposalId);
              await refresh();
            }}
            style={{
              marginTop: 16,
              background: "#f97316",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Save Electricity Usage
          </button>
        </CollapsibleSection>

        <CollapsibleSection id="rate" icon={DollarSign} title="Electricity Rate">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Utility Company
              </label>
              <input
                type="text"
                value={proposalDraft.utility_company ?? ""}
                onChange={(e) =>
                  setProposalDraft((p: any) => ({
                    ...p,
                    utility_company: e.target.value,
                  }))
                }
                placeholder="Enter utility company"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Current Rate ($/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                value={proposalDraft.electricity_rate ?? ""}
                onChange={(e) =>
                  setProposalDraft((p: any) => ({
                    ...p,
                    electricity_rate: Number(e.target.value),
                  }))
                }
                placeholder="0.12"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
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
                  utility_company: proposalDraft.utility_company ?? null,
                  electricity_rate: proposalDraft.electricity_rate ?? null,
                })
                .eq("id", proposalId);
              await refresh();
            }}
            style={{
              marginTop: 16,
              background: "#f97316",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Save Electricity Rate
          </button>
        </CollapsibleSection>

        <CollapsibleSection id="system" icon={Package} title="System Specifications">
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
        </CollapsibleSection>

        <CollapsibleSection id="pricing" icon={DollarSign} title="Pricing Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
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
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
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
                  color: "#111827",
                }}
              />
            </div>
          </div>

          {proposalDraft.total_price && systemSummary.systemKw > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
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
              marginTop: 16,
              background: "#f97316",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Save Pricing
          </button>
        </CollapsibleSection>

        <CollapsibleSection id="financing" icon={CreditCard} title="Financing Options">
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
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
              marginTop: 16,
              background: "#f97316",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Save Financing Option
          </button>
        </CollapsibleSection>

        {(proposalDraft.finance_type ?? "cash") === "cash" && (
          <CollapsibleSection id="payment" icon={DollarSign} title="Cash Payment Schedule">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
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
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
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
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
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
                marginTop: 16,
                background: "#f97316",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Save Payment Schedule
            </button>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
