import React, { useEffect, useState, useRef } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import ProposalWorkspace from "./ProposalWorkspace";
import { loadGoogleMaps } from "../lib/loadGoogleMaps";

type SelectedPlace = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

type ProposalsProps = {
  initialProposalId?: string | null;
  onProposalChange?: (proposalId: string | null) => void;
};

export default function Proposals({ initialProposalId, onProposalChange }: ProposalsProps = {}) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(initialProposalId || null);
  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (onProposalChange) {
      onProposalChange(selectedProposalId);
    }
  }, [selectedProposalId, onProposalChange]);
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

      console.log('Authenticated user:', user.id);
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
        setError(`Customer error: ${customerError.message}`);
        throw customerError;
      }

      console.log('Customer created:', customerData);

      if (customerData) {
        console.log('Creating proposal with user:', user.id);
        const proposalPayload = {
          created_by: user.id,
          owner_id: user.id,
          customer_id: customerData.id,
          place_id: selectedPlace.placeId,
          formatted_address: selectedPlace.formattedAddress,
          lat: selectedPlace.lat,
          lng: selectedPlace.lng,
          status: "draft",
          usage_mode: "annual",
        };
        console.log('Proposal payload:', proposalPayload);

        const { data: proposalData, error: proposalError } = await supabase
          .from("proposals")
          .insert(proposalPayload)
          .select()
          .single();

        if (proposalError) {
          console.error('Proposal creation error:', proposalError);
          console.error('Error details:', JSON.stringify(proposalError, null, 2));
          setError(`Proposal error: ${proposalError.message}`);
          throw proposalError;
        }

        console.log('Proposal created successfully:', proposalData);

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

  const deleteProposal = async () => {
    if (!proposalToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("proposals")
        .delete()
        .eq("id", proposalToDelete);

      if (error) throw error;

      if (selectedProposalId === proposalToDelete) {
        setSelectedProposalId(null);
      }

      await loadProposals();
      setProposalToDelete(null);
    } catch (err: any) {
      console.error("Error deleting proposal:", err);
      alert("Failed to delete proposal. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gray-50">
      <div className="w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 sm:p-5 border-b border-gray-200">
          <div className="flex justify-between items-center gap-3">
            <div className="text-lg font-bold text-gray-900">Proposals</div>
            <button
              onClick={() => setShowNewProposalModal(true)}
              className="px-3 py-2 bg-orange-600 text-white rounded-lg cursor-pointer flex items-center gap-2 text-sm font-semibold hover:bg-orange-700 transition-colors min-h-[44px]"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className={`p-3 sm:p-4 rounded-lg mb-2 relative cursor-pointer transition-all ${
                selectedProposalId === proposal.id
                  ? 'bg-amber-50 border-2 border-orange-600'
                  : 'bg-white border border-gray-200 hover:border-orange-300'
              }`}
            >
              <div onClick={() => setSelectedProposalId(proposal.id)}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-orange-600 flex-shrink-0" />
                  <div className="text-sm font-semibold text-gray-900 flex-1 truncate">
                    {proposal.customers?.full_name || "Unnamed Customer"}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProposalToDelete(proposal.id);
                    }}
                    className="p-1 bg-transparent border-none cursor-pointer flex items-center text-red-600 opacity-60 hover:opacity-100 transition-opacity"
                    title="Delete proposal"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-xs text-gray-600 mb-1 truncate">
                  {proposal.formatted_address?.substring(0, 50) || "No address"}
                </div>
                <div className="text-xs text-gray-400">
                  Status: <span className="font-medium">{proposal.status || "draft"}</span>
                </div>
              </div>
            </div>
          ))}

          {proposals.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">
              No proposals yet. Click "New" to create one.
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedProposalId ? (
          <ProposalWorkspace
            proposalId={selectedProposalId}
            onBack={() => setSelectedProposalId(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 p-8">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <div className="text-base sm:text-lg font-semibold mb-2">No Proposal Selected</div>
              <div className="text-sm">Select a proposal from the list or create a new one</div>
            </div>
          </div>
        )}
      </div>

      {showNewProposalModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleModalClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-lg w-full"
          >
            <div className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Create New Proposal
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Property Address
              </label>
              <input
                ref={addressInputRef}
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Start typing address..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {newAddress && !selectedPlace && (
                <div className="text-xs text-gray-400 mt-2">
                  Please select an address from the dropdown suggestions
                </div>
              )}
              {error && (
                <div className="text-sm text-red-600 mt-2 p-2 bg-red-50 rounded">
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={handleModalClose}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={createNewProposal}
                disabled={!selectedPlace || isCreating}
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm min-h-[44px] transition-colors ${
                  selectedPlace && !isCreating
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isCreating ? "Creating..." : "Create Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {proposalToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !isDeleting && setProposalToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 mb-1">
                  Delete Proposal?
                </div>
                <div className="text-sm text-gray-600">
                  This action cannot be undone
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-700 mb-6 pl-0 sm:pl-15">
              This will permanently delete the proposal and all associated data including roof planes, panels, and design information.
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={() => setProposalToDelete(null)}
                disabled={isDeleting}
                className={`px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold text-sm min-h-[44px] transition-colors ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={deleteProposal}
                disabled={isDeleting}
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm text-white min-h-[44px] transition-colors ${
                  isDeleting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isDeleting ? "Deleting..." : "Delete Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
