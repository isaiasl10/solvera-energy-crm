import React, { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import ProposalWorkspace from "./ProposalWorkspace";

export default function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const [newAddress, setNewAddress] = useState("");

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    const { data } = await supabase
      .from("proposals")
      .select("*, customers(name, email)")
      .order("created_at", { ascending: false });

    if (data) {
      setProposals(data);
      if (data.length > 0 && !selectedProposalId) {
        setSelectedProposalId(data[0].id);
      }
    }
  };

  const createNewProposal = async () => {
    if (!newAddress.trim()) return;

    const { data: customerData } = await supabase
      .from("customers")
      .insert({
        name: "New Customer",
        email: "",
        phone: "",
        address: newAddress,
      })
      .select()
      .single();

    if (customerData) {
      const { data: proposalData } = await supabase
        .from("proposals")
        .insert({
          customer_id: customerData.id,
          formatted_address: newAddress,
          lat: 0,
          lng: 0,
          status: "draft",
        })
        .select()
        .single();

      if (proposalData) {
        await loadProposals();
        setSelectedProposalId(proposalData.id);
        setShowNewProposalModal(false);
        setNewAddress("");
      }
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", background: "#f5f5f7" }}>
      <div style={{ width: 280, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Proposals</div>
            <button
              onClick={() => setShowNewProposalModal(true)}
              style={{
                padding: "6px 10px",
                background: "#f97316",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Plus size={14} />
              New
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              onClick={() => setSelectedProposalId(proposal.id)}
              style={{
                padding: "12px 14px",
                background: selectedProposalId === proposal.id ? "#fef3c7" : "#fff",
                border: selectedProposalId === proposal.id ? "2px solid #f97316" : "1px solid #e5e7eb",
                borderRadius: 8,
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <FileText size={14} color="#f97316" />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                  {proposal.customers?.name || "Unnamed Customer"}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                {proposal.formatted_address?.substring(0, 40) || "No address"}
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>
                Status: {proposal.status || "draft"}
              </div>
            </div>
          ))}

          {proposals.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              No proposals yet. Click "New" to create one.
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {selectedProposalId ? (
          <ProposalWorkspace
            proposalId={selectedProposalId}
            onBack={() => setSelectedProposalId(null)}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af" }}>
            <div style={{ textAlign: "center" }}>
              <FileText size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No Proposal Selected</div>
              <div style={{ fontSize: 13 }}>Select a proposal from the list or create a new one</div>
            </div>
          </div>
        )}
      </div>

      {showNewProposalModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowNewProposalModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: "90%",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
              Create New Proposal
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Property Address
              </label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Enter property address"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowNewProposalModal(false);
                  setNewAddress("");
                }}
                style={{
                  padding: "10px 20px",
                  background: "#fff",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={createNewProposal}
                disabled={!newAddress.trim()}
                style={{
                  padding: "10px 20px",
                  background: newAddress.trim() ? "#f97316" : "#e5e7eb",
                  color: newAddress.trim() ? "#fff" : "#9ca3af",
                  border: "none",
                  borderRadius: 6,
                  cursor: newAddress.trim() ? "pointer" : "not-allowed",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Create Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
