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
  const lastLoadedProposalId = React.useRef<string | null>(null);

  const [draft, setDraft] = useState({
    customerFullName: "",
    customerEmail: "",
    customerPhone: "",
    annualConsumption: 0,
    utilityCompany: "",
    electricityRate: 0,
    pricePerWatt: 0,
    systemPrice: 0,
    cashDownPayment: 0,
    cashSecondPayment: 0,
    cashFinalPayment: 0,
    financeType: "cash" as string,
    financeOptionId: null as string | null,
  });

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
    if (!proposal?.id) return;
    if (lastLoadedProposalId.current === proposal.id) return;

    lastLoadedProposalId.current = proposal.id;

    (async () => {
      if (proposal.customer_id) {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("id", proposal.customer_id)
          .maybeSingle();

        if (data) {
          setCustomer(data);
          setDraft((d) => ({
            ...d,
            customerFullName: data.full_name || "",
            customerEmail: data.email || "",
            customerPhone: data.phone || "",
          }));
        }
      }

      setDraft((d) => ({
        ...d,
        annualConsumption: Number(proposal.annual_consumption ?? 0),
        utilityCompany: proposal.utility_company ?? "",
        electricityRate: Number(proposal.electricity_rate ?? 0),
        pricePerWatt: Number(proposal.price_per_watt ?? 0),
        systemPrice: Number(proposal.system_price ?? 0),
        cashDownPayment: Number(proposal.cash_down_payment ?? 0),
        cashSecondPayment: Number(proposal.cash_second_payment ?? 0),
        cashFinalPayment: Number(proposal.cash_final_payment ?? 0),
        financeType: proposal.finance_type ?? "cash",
        financeOptionId: proposal.finance_option_id ?? null,
      }));
    })();
  }, [proposal?.id]);

  const onText = (field: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDraft((d) => ({ ...d, [field]: v }));
  };

  const onNumber = (field: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = raw === "" ? 0 : Number(raw);
    setDraft((d) => ({ ...d, [field]: Number.isFinite(num) ? num : 0 }));
  };

  const selectedFinanceValue = useMemo(() => {
    if (draft.financeType === "cash") return "cash";
    return draft.financeOptionId ?? "cash";
  }, [draft.financeType, draft.financeOptionId]);

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
                value={draft.customerFullName}
                onChange={onText("customerFullName")}
                placeholder="Customer full name"
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
                Email
              </label>
              <input
                type="email"
                value={draft.customerEmail}
                onChange={onText("customerEmail")}
                placeholder="customer@email.com"
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
                Phone
              </label>
              <input
                type="tel"
                value={draft.customerPhone}
                onChange={onText("customerPhone")}
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
              const { error } = await supabase
                .from("customers")
                .update({
                  full_name: draft.customerFullName,
                  email: draft.customerEmail,
                  phone: draft.customerPhone,
                })
                .eq("id", customer.id);

              if (error) {
                alert("Failed to save: " + error.message);
              } else {
                alert("Customer information saved successfully!");
              }
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
                value={draft.annualConsumption}
                onChange={onNumber("annualConsumption")}
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
              const { error } = await supabase
                .from("proposals")
                .update({
                  annual_consumption: draft.annualConsumption,
                })
                .eq("id", proposalId);

              if (error) {
                alert("Failed to save: " + error.message);
              } else {
                alert("Electricity usage saved successfully!");
                await refresh();
              }
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
                value={draft.utilityCompany}
                onChange={onText("utilityCompany")}
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
                value={draft.electricityRate}
                onChange={onNumber("electricityRate")}
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
              const { error } = await supabase
                .from("proposals")
                .update({
                  utility_company: draft.utilityCompany,
                  electricity_rate: draft.electricityRate,
                })
                .eq("id", proposalId);

              if (error) {
                alert("Failed to save: " + error.message);
              } else {
                alert("Electricity rate saved successfully!");
                await refresh();
              }
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
                value={draft.systemPrice}
                onChange={onNumber("systemPrice")}
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
                value={draft.pricePerWatt}
                onChange={onNumber("pricePerWatt")}
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

          {draft.systemPrice && systemSummary.systemKw > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Calculated Price Per Watt</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                ${(draft.systemPrice / (systemSummary.systemKw * 1000)).toFixed(2)}/W
              </div>
            </div>
          )}

          <button
            onClick={async () => {
              await supabase
                .from("proposals")
                .update({
                  price_per_watt: draft.pricePerWatt,
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
                    setDraft((d) => ({
                      ...d,
                      financeType: "cash",
                      financeOptionId: null,
                    }));
                  } else {
                    setDraft((d) => ({
                      ...d,
                      financeType: "finance",
                      financeOptionId: v,
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
                  finance_type: draft.financeType,
                  finance_option_id: draft.financeOptionId,
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

        {draft.financeType === "cash" && (
          <CollapsibleSection id="payment" icon={DollarSign} title="Cash Payment Schedule">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Deposit Amount ($)
                </label>
                <input
                  type="number"
                  value={draft.cashDownPayment}
                  onChange={onNumber("cashDownPayment")}
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
                  value={draft.cashSecondPayment}
                  onChange={onNumber("cashSecondPayment")}
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
                  value={draft.cashFinalPayment}
                  onChange={onNumber("cashFinalPayment")}
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
                    cash_down_payment: draft.cashDownPayment,
                    cash_second_payment: draft.cashSecondPayment,
                    cash_final_payment: draft.cashFinalPayment,
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
