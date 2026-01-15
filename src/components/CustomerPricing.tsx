import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useProposalDesign } from "../hooks/useProposalDesign";
import { useFinancingOptions } from "../hooks/useFinancingOptions";
import ProposalDesignMap from "./ProposalDesignMap";
import { User, DollarSign, MapPin } from "lucide-react";

const fmt = (n?: number | null, digits = 0) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";

export default function CustomerPricing({
  proposalId,
}: {
  proposalId: string | null;
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
        .single();

      setCustomer(data);
      setProposalDraft(proposal);
    })();
  }, [proposal?.customer_id]);

  const selectedFinanceValue = useMemo(() => {
    if (!proposalDraft) return "cash";
    if ((proposalDraft.finance_type ?? "cash") === "cash") return "cash";
    return proposalDraft.finance_option_id ?? "cash";
  }, [proposalDraft]);

  if (!proposalId)
    return <div style={{ padding: 24 }}>Select a proposal first.</div>;

  if (loading || !proposal)
    return <div style={{ padding: 24 }}>Loading customer & pricing…</div>;

  const selectedModel = panelModels.find(
    (m) => m.id === proposal.panel_model_id
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: 16,
        height: "calc(100vh - 64px)",
      }}
    >
      <div style={{ width: 420, overflow: "auto" }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>
          Customer & Pricing
        </div>
        <div style={{ opacity: 0.7, marginBottom: 16 }}>
          Confirm customer, financing, and payments
        </div>

        <div className="card">
          <div className="card-title">
            <User size={18} /> Customer
          </div>

          <label>Name</label>
          <input
            value={customer?.name ?? ""}
            onChange={(e) =>
              setCustomer((c: any) => ({ ...c, name: e.target.value }))
            }
          />

          <label>Email</label>
          <input
            value={customer?.email ?? ""}
            onChange={(e) =>
              setCustomer((c: any) => ({ ...c, email: e.target.value }))
            }
          />

          <label>Phone</label>
          <input
            value={customer?.phone ?? ""}
            onChange={(e) =>
              setCustomer((c: any) => ({ ...c, phone: e.target.value }))
            }
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
          >
            Save Customer
          </button>
        </div>

        <div className="card">
          <div className="card-title">
            <DollarSign size={18} /> Financing
          </div>

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
          >
            Save Financing
          </button>
        </div>

        {(proposalDraft.finance_type ?? "cash") === "cash" && (
          <div className="card">
            <div className="card-title">Cash Payment Schedule</div>

            <label>Deposit</label>
            <input
              type="number"
              value={proposalDraft.cash_deposit ?? ""}
              onChange={(e) =>
                setProposalDraft((p: any) => ({
                  ...p,
                  cash_deposit: Number(e.target.value),
                }))
              }
            />

            <label>2nd Payment</label>
            <input
              type="number"
              value={proposalDraft.cash_second_payment ?? ""}
              onChange={(e) =>
                setProposalDraft((p: any) => ({
                  ...p,
                  cash_second_payment: Number(e.target.value),
                }))
              }
            />

            <label>Final Payment</label>
            <input
              type="number"
              value={proposalDraft.cash_final_payment ?? ""}
              onChange={(e) =>
                setProposalDraft((p: any) => ({
                  ...p,
                  cash_final_payment: Number(e.target.value),
                }))
              }
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
            >
              Save Cash Schedule
            </button>
          </div>
        )}

        <div className="card">
          <div className="card-title">System Summary</div>
          <div>Module: {selectedModel?.model ?? "—"}</div>
          <div>Panels: {systemSummary.panelCount}</div>
          <div>System Size: {fmt(systemSummary.systemKw, 2)} kW</div>
          <div>
            Annual Production:{" "}
            {fmt(systemSummary.annualProductionKwh)} kWh
          </div>
          <div>Offset: {fmt(systemSummary.offsetPercent, 1)}%</div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #eee",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #eee",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <MapPin size={16} />
          Solar Design Preview
        </div>

        <div style={{ height: "calc(100% - 48px)" }}>
          <ProposalDesignMap
            readOnly
            center={{ lat: proposal.lat, lng: proposal.lng }}
            planes={planes}
            obstructions={obstructions}
            panels={panels}
            panelModels={panelModels}
          />
        </div>
      </div>
    </div>
  );
}
