import React, { useEffect, useState, useRef } from "react";
import { FileText, Plus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import ProposalWorkspace from "./ProposalWorkspace";
import { loadGoogleMaps } from "../lib/loadGoogleMaps";

type SelectedPlace = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

export default function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  useEffect(() => {
    if (showNewProposalModal && addressInputRef.current) {
      initializeAutocomplete();
    }
  }, [showNewProposalModal]);

  const initializeAutocomplete = async () => {
    try {
      await loadGoogleMaps();

      if (!addressInputRef.current || autocompleteRef.current) return;

      const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        fields: ['place_id', 'formatted_address', 'geometry'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('Place changed:', place);

        if (place.geometry && place.geometry.location) {
          const placeData = {
            placeId: place.place_id || '',
            formattedAddress: place.formatted_address || '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          console.log('Setting selected place:', placeData);
          setSelectedPlace(placeData);
          setNewAddress(place.formatted_address || '');
          setError(null);
        } else {
          console.warn('Place selected but no geometry:', place);
          setError('Please select a valid address from the dropdown');
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Failed to initialize Google Maps autocomplete:', error);
    }
  };

  const loadProposals = async () => {
    const { data } = await supabase
      .from("proposals")
      .select("*, customers(full_name, email)")
      .order("created_at", { ascending: false });

    if (data) {
      setProposals(data);
      if (data.length > 0 && !selectedProposalId) {
        setSelectedProposalId(data[0].id);
      }
    }
  };

  const createNewProposal = async () => {
    console.log('Create proposal clicked', { newAddress, selectedPlace });

    if (!newAddress.trim() || !selectedPlace) {
      console.log('Validation failed', { hasAddress: !!newAddress.trim(), hasPlace: !!selectedPlace });
      setError('Please select an address from the dropdown');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        throw new Error("Not authenticated");
      }

      console.log('Creating customer...');
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .insert({
          full_name: "New Customer",
          email: "",
          phone: "",
          address: selectedPlace.formattedAddress,
        })
        .select()
        .single();

      if (customerError) {
        console.error('Customer creation error:', customerError);
        throw customerError;
      }

      console.log('Customer created:', customerData);

      if (customerData) {
        console.log('Creating proposal...');
        const { data: proposalData, error: proposalError } = await supabase
          .from("proposals")
          .insert({
            owner_id: user.id,
            customer_id: customerData.id,
            place_id: selectedPlace.placeId,
            formatted_address: selectedPlace.formattedAddress,
            lat: selectedPlace.lat,
            lng: selectedPlace.lng,
            status: "draft",
          })
          .select()
          .single();

        if (proposalError) {
          console.error('Proposal creation error:', proposalError);
          throw proposalError;
        }

        console.log('Proposal created:', proposalData);

        if (proposalData) {
          await loadProposals();
          setSelectedProposalId(proposalData.id);
          setShowNewProposalModal(false);
          setNewAddress("");
          setSelectedPlace(null);
          setError(null);
          autocompleteRef.current = null;
        }
      }
    } catch (err: any) {
      console.error('Error creating proposal:', err);
      setError(err.message || 'Failed to create proposal. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleModalClose = () => {
    setShowNewProposalModal(false);
    setNewAddress("");
    setSelectedPlace(null);
    setError(null);
    setIsCreating(false);
    autocompleteRef.current = null;
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
                  {proposal.customers?.full_name || "Unnamed Customer"}
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
          onClick={handleModalClose}
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
                ref={addressInputRef}
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Start typing address..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
              {newAddress && !selectedPlace && (
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                  Please select an address from the dropdown suggestions
                </div>
              )}
              {error && (
                <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6, padding: 8, background: "#fee", borderRadius: 4 }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={handleModalClose}
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
                disabled={!selectedPlace || isCreating}
                style={{
                  padding: "10px 20px",
                  background: selectedPlace && !isCreating ? "#f97316" : "#e5e7eb",
                  color: selectedPlace && !isCreating ? "#fff" : "#9ca3af",
                  border: "none",
                  borderRadius: 6,
                  cursor: selectedPlace && !isCreating ? "pointer" : "not-allowed",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {isCreating ? "Creating..." : "Create Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
