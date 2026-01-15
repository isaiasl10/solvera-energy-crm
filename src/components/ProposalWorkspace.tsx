import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { sanitizePatch } from "../lib/supabasePatch";
import { useFinancingOptions } from "../hooks/useFinancingOptions";
import { User, DollarSign, ArrowLeft, Zap, Package, ChevronDown, ChevronUp, FileText, CreditCard, File, Pencil, Trash2, Square, Circle, TreeDeciduous, Grid, RotateCw } from "lucide-react";

const fmt = (n?: number | null, digits = 0) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";

const CustomerFormInputs = React.memo(({
  initialData,
  onChange,
}: {
  initialData: any;
  onChange: (data: any) => void;
}) => {
  const renderCount = useRef(0);
  renderCount.current++;

  const [localData, setLocalData] = useState(initialData);
  const dataRef = useRef(localData);

  useEffect(() => {
    setLocalData(initialData);
    dataRef.current = initialData;
  }, [initialData]);

  const handleChange = useCallback((field: string, value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, [field]: value };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handleBlur = useCallback(() => {
    onChange(dataRef.current);
  }, [onChange]);

  console.log("CustomerFormInputs render", renderCount.current);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Full Name
        </label>
        <input
          type="text"
          value={localData.full_name || ''}
          onChange={(e) => {
            console.log("CHANGE full_name", e.target.value, "| form renders:", renderCount.current);
            handleChange('full_name', e.target.value);
          }}
          onBlur={handleBlur}
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
          value={localData.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={handleBlur}
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
          value={localData.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={handleBlur}
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
  );
});

CustomerFormInputs.displayName = 'CustomerFormInputs';

const ElectricityUsageInputs = React.memo(({
  initialData,
  onChange,
}: {
  initialData: { annual_consumption: number | null };
  onChange: (data: { annual_consumption: number | null }) => void;
}) => {
  const renderCount = useRef(0);
  renderCount.current++;

  const [localData, setLocalData] = useState(initialData);
  const dataRef = useRef(localData);

  useEffect(() => {
    setLocalData(initialData);
    dataRef.current = initialData;
  }, [initialData]);

  const handleChange = useCallback((value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, annual_consumption: value === "" ? null : Number(value) };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handleBlur = useCallback(() => {
    onChange(dataRef.current);
  }, [onChange]);

  console.log("ElectricityUsageInputs render", renderCount.current);

  return (
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
          value={localData.annual_consumption ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
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
  );
});

ElectricityUsageInputs.displayName = 'ElectricityUsageInputs';

const ElectricityRateInputs = React.memo(({
  initialData,
  onChange,
}: {
  initialData: { utility_company: string | null; electricity_rate: number | null };
  onChange: (data: { utility_company: string | null; electricity_rate: number | null }) => void;
}) => {
  const renderCount = useRef(0);
  renderCount.current++;

  const [localData, setLocalData] = useState(initialData);
  const dataRef = useRef(localData);

  useEffect(() => {
    setLocalData(initialData);
    dataRef.current = initialData;
  }, [initialData]);

  const handleUtilityChange = useCallback((value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, utility_company: value };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handleRateChange = useCallback((value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, electricity_rate: value === "" ? null : Number(value) };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handleBlur = useCallback(() => {
    onChange(dataRef.current);
  }, [onChange]);

  console.log("ElectricityRateInputs render", renderCount.current);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Utility Company
        </label>
        <input
          type="text"
          value={localData.utility_company ?? ""}
          onChange={(e) => handleUtilityChange(e.target.value)}
          onBlur={handleBlur}
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
          value={localData.electricity_rate ?? ""}
          onChange={(e) => handleRateChange(e.target.value)}
          onBlur={handleBlur}
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
  );
});

ElectricityRateInputs.displayName = 'ElectricityRateInputs';

const PricingDetailsInputs = React.memo(({
  initialData,
  onChange,
  systemSummary,
  salesRepRedline,
}: {
  initialData: { total_price: number | null; price_per_watt: number | null };
  onChange: (data: { total_price: number | null; price_per_watt: number | null }) => void;
  systemSummary: any;
  salesRepRedline?: number;
}) => {
  const renderCount = useRef(0);
  renderCount.current++;

  const [localData, setLocalData] = useState(initialData);
  const dataRef = useRef(localData);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setLocalData(initialData);
    dataRef.current = initialData;
  }, [initialData]);

  const handlePricePerWattChange = useCallback((value: string) => {
    const numValue = value === "" ? null : Number(value);

    if (numValue !== null && salesRepRedline && numValue < salesRepRedline) {
      setValidationError(`Cannot go below redline: $${salesRepRedline.toFixed(2)}/W`);
      return;
    }

    setValidationError(null);
    setLocalData((prev: any) => {
      const updated = { ...prev, price_per_watt: numValue };
      dataRef.current = updated;
      return updated;
    });
  }, [salesRepRedline]);

  const handleBlur = useCallback(() => {
    if (!validationError) {
      onChange(dataRef.current);
    }
  }, [onChange, validationError]);

  console.log("PricingDetailsInputs render", renderCount.current);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Base Price Per Watt ($/W)
        </label>
        <input
          type="number"
          step="0.01"
          min={salesRepRedline || undefined}
          value={localData.price_per_watt ?? ""}
          onChange={(e) => handlePricePerWattChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Enter base price per watt"
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#fff",
            border: validationError ? "2px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            color: "#111827",
          }}
        />
        {validationError ? (
          <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>
            {validationError}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            {salesRepRedline
              ? `Your redline: $${salesRepRedline.toFixed(2)}/W. You can increase above this.`
              : "This is your base price per watt."}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, padding: 16, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Pricing Summary</div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Total Contract Price</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                {systemSummary.systemWatts > 0 ? `Base system + adders` : `No panels placed yet`}
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>${fmt(systemSummary.totalContractPrice, 2)}</div>
          </div>

          <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 8 }}>
              <span style={{ color: "#6b7280" }}>Base System Price</span>
              <span style={{ fontWeight: 600, color: systemSummary.systemWatts > 0 ? "#111827" : "#9ca3af" }}>
                ${fmt(systemSummary.baseSystemPrice, 2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 8 }}>
              <span style={{ color: "#6b7280" }}>Total Adders</span>
              <span style={{ fontWeight: 600, color: systemSummary.totalAdderCost > 0 ? "#111827" : "#9ca3af" }}>
                {systemSummary.totalAdderCost > 0 ? `+$${fmt(systemSummary.totalAdderCost, 2)}` : "$0.00"}
              </span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #d1d5db", paddingTop: 12, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Price Per Watt Breakdown</div>
            <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 8 }}>
                <span style={{ color: "#6b7280" }}>Base Price Per Watt</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>${systemSummary.basePPW.toFixed(3)}/W</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 8 }}>
                <span style={{ color: "#6b7280" }}>PPW w/ Adders</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>${systemSummary.effectivePPW.toFixed(3)}/W</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 8 }}>
                <span style={{ color: "#9ca3af" }}>PPW w/ Financing</span>
                <span style={{ fontWeight: 600, color: "#9ca3af" }}>TBD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 8, paddingTop: 6, borderTop: "1px solid #e5e7eb", marginTop: 4 }}>
                <span style={{ color: "#111827", fontWeight: 600 }}>Total PPW</span>
                <span style={{ fontWeight: 700, color: "#059669" }}>${systemSummary.effectivePPW.toFixed(3)}/W</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

PricingDetailsInputs.displayName = 'PricingDetailsInputs';

const OldPricingDetailsInputs = React.memo(({
  initialData,
  onChange,
  systemSummary,
}: {
  initialData: { total_price: number | null; price_per_watt: number | null };
  onChange: (data: { total_price: number | null; price_per_watt: number | null }) => void;
  systemSummary: { systemKw: number };
}) => {
  const renderCount = useRef(0);
  renderCount.current++;

  const [localData, setLocalData] = useState(initialData);
  const dataRef = useRef(localData);

  useEffect(() => {
    setLocalData(initialData);
    dataRef.current = initialData;
  }, [initialData]);

  const handleTotalPriceChange = useCallback((value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, total_price: value === "" ? null : Number(value) };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handlePricePerWattChange = useCallback((value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, price_per_watt: value === "" ? null : Number(value) };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handleBlur = useCallback(() => {
    onChange(dataRef.current);
  }, [onChange]);

  console.log("PricingDetailsInputs render", renderCount.current);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
            Total System Price ($)
          </label>
          <input
            type="number"
            value={localData.total_price ?? ""}
            onChange={(e) => handleTotalPriceChange(e.target.value)}
            onBlur={handleBlur}
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
            value={localData.price_per_watt ?? ""}
            onChange={(e) => handlePricePerWattChange(e.target.value)}
            onBlur={handleBlur}
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

      {localData.total_price && systemSummary.systemKw > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Calculated Price Per Watt</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            ${(localData.total_price / (systemSummary.systemKw * 1000)).toFixed(2)}/W
          </div>
        </div>
      )}
    </>
  );
});

PricingDetailsInputs.displayName = 'PricingDetailsInputs';

const CashPaymentInputs = React.memo(({
  initialData,
  onChange,
}: {
  initialData: { cash_deposit: number | null; cash_second_payment: number | null; cash_final_payment: number | null };
  onChange: (data: { cash_deposit: number | null; cash_second_payment: number | null; cash_final_payment: number | null }) => void;
}) => {
  const renderCount = useRef(0);
  renderCount.current++;

  const [localData, setLocalData] = useState(initialData);
  const dataRef = useRef(localData);

  useEffect(() => {
    setLocalData(initialData);
    dataRef.current = initialData;
  }, [initialData]);

  const handleDepositChange = useCallback((value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, cash_deposit: value === "" ? null : Number(value) };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handleSecondPaymentChange = useCallback((value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, cash_second_payment: value === "" ? null : Number(value) };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handleFinalPaymentChange = useCallback((value: string) => {
    setLocalData((prev: any) => {
      const updated = { ...prev, cash_final_payment: value === "" ? null : Number(value) };
      dataRef.current = updated;
      return updated;
    });
  }, []);

  const handleBlur = useCallback(() => {
    onChange(dataRef.current);
  }, [onChange]);

  console.log("CashPaymentInputs render", renderCount.current);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Deposit Amount ($)
        </label>
        <input
          type="number"
          value={localData.cash_deposit ?? ""}
          onChange={(e) => handleDepositChange(e.target.value)}
          onBlur={handleBlur}
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
          value={localData.cash_second_payment ?? ""}
          onChange={(e) => handleSecondPaymentChange(e.target.value)}
          onBlur={handleBlur}
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
          value={localData.cash_final_payment ?? ""}
          onChange={(e) => handleFinalPaymentChange(e.target.value)}
          onBlur={handleBlur}
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
  );
});

CashPaymentInputs.displayName = 'CashPaymentInputs';

type ToolMode = "none" | "roof" | "circle" | "rect" | "tree" | "add-panel" | "delete-panel";

type RoofPlaneRow = {
  id: string;
  proposal_id: string;
  name: string;
  pitch_deg: number;
  path: Array<{ lat: number; lng: number }>;
  area_sqft: number | null;
};

type ObstructionRow = {
  id: string;
  proposal_id: string;
  type: "rect" | "circle" | "tree";
  roof_plane_id: string | null;
  center_lat: number;
  center_lng: number;
  radius_ft: number | null;
  width_ft: number | null;
  height_ft: number | null;
  rotation_deg: number | null;
};

type PanelModel = {
  id: string;
  brand: string;
  model: string;
  watts: number;
  length_mm: number;
  width_mm: number;
};

type ProposalPanel = {
  id: string;
  proposal_id: string;
  roof_plane_id: string | null;
  panel_model_id: string;
  center_lat: number;
  center_lng: number;
  rotation_deg: number;
  is_portrait: boolean;
};

const mToFt = (m: number) => m * 3.28084;
const m2ToFt2 = (m2: number) => m2 * 10.7639104167097;

function isGoogleReady() {
  return (
    typeof (window as any).google !== "undefined" &&
    !!(window as any).google.maps &&
    !!(window as any).google.maps.places &&
    !!(window as any).google.maps.drawing &&
    !!(window as any).google.maps.geometry
  );
}

export default function ProposalWorkspace({
  proposalId,
  onBack,
}: {
  proposalId: string | null;
  onBack?: () => void;
}) {
  const renders = useRef(0);
  renders.current++;
  console.log("ProposalConfig render", Date.now(), "| Render count:", renders.current);

  const { options: financingOptions } = useFinancingOptions();

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const homeMarkerRef = useRef<google.maps.Marker | null>(null);

  const [customer, setCustomer] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [proposalDraft, setProposalDraft] = useState<any>({});
  const [salesRep, setSalesRep] = useState<any>(null);

  const [draftCustomer, setDraftCustomer] = useState<any>({ full_name: "", email: "", phone: "" });
  const didInitDraftRef = useRef(false);
  const isDirtyRef = useRef(false);
  const lastInitCustomerIdRef = useRef<string | null>(null);

  const handleCustomerChange = useCallback((data: any) => {
    isDirtyRef.current = true;
    setDraftCustomer(data);
  }, []);

  const handleElectricityChange = useCallback((data: { annual_consumption: number | null }) => {
    isDirtyRef.current = true;
    setProposalDraft((prev: any) => ({
      ...prev,
      annual_consumption: data.annual_consumption,
    }));
  }, []);

  const handleElectricityRateChange = useCallback((data: { utility_company: string | null; electricity_rate: number | null }) => {
    setProposalDraft((prev: any) => ({
      ...prev,
      utility_company: data.utility_company,
      electricity_rate: data.electricity_rate,
    }));
  }, []);

  const handlePricingChange = useCallback((data: { total_price: number | null; price_per_watt: number | null }) => {
    isDirtyRef.current = true;
    setProposalDraft((prev: any) => ({
      ...prev,
      total_price: data.total_price,
      price_per_watt: data.price_per_watt,
    }));
  }, []);

  const handleCashPaymentChange = useCallback((data: { cash_deposit: number | null; cash_second_payment: number | null; cash_final_payment: number | null }) => {
    setProposalDraft((prev: any) => ({
      ...prev,
      cash_deposit: data.cash_deposit,
      cash_second_payment: data.cash_second_payment,
      cash_final_payment: data.cash_final_payment,
    }));
  }, []);

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
  const lastLoadedProposalId = useRef<string | null>(null);

  const [roofPlanes, setRoofPlanes] = useState<RoofPlaneRow[]>([]);
  const [obstructions, setObstructions] = useState<ObstructionRow[]>([]);
  const [panelModels, setPanelModels] = useState<PanelModel[]>([]);
  const [panels, setPanels] = useState<ProposalPanel[]>([]);
  const [deletedPanelIds, setDeletedPanelIds] = useState<string[]>([]);
  const [deletedObstructionIds, setDeletedObstructionIds] = useState<string[]>([]);
  const [customAdders, setCustomAdders] = useState<any[]>([]);
  const [proposalAdders, setProposalAdders] = useState<any[]>([]);
  const [inverters, setInverters] = useState<any[]>([]);
  const [racking, setRacking] = useState<any[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);

  const roofPolysRef = useRef<Map<string, google.maps.Polygon>>(new Map());
  const obstructionShapesRef = useRef<Map<string, any>>(new Map());
  const panelRectanglesRef = useRef<Map<string, google.maps.Rectangle>>(new Map());

  const [toolMode, setToolMode] = useState<ToolMode>("none");
  const [selectedRoofId, setSelectedRoofId] = useState<string | null>(null);
  const [selectedObstruction, setSelectedObstruction] = useState<ObstructionRow | null>(null);

  const [selectedPanelModelId, setSelectedPanelModelId] = useState<string | null>(null);
  const [panelOrientation, setPanelOrientation] = useState<"portrait" | "landscape">("portrait");
  const [panelRotation, setPanelRotation] = useState<number>(0);
  const [obstructionWidth, setObstructionWidth] = useState<number>(5);
  const [obstructionHeight, setObstructionHeight] = useState<number>(5);
  const [rowSpacing, setRowSpacing] = useState<number>(0.01);
  const [colSpacing, setColSpacing] = useState<number>(0.01);

  const toolModeRef = useRef<ToolMode>("none");
  const selectedRoofIdRef = useRef<string | null>(null);
  const selectedPanelModelIdRef = useRef<string | null>(null);

  useEffect(() => {
    toolModeRef.current = toolMode;
  }, [toolMode]);

  useEffect(() => {
    selectedRoofIdRef.current = selectedRoofId;
  }, [selectedRoofId]);

  useEffect(() => {
    selectedPanelModelIdRef.current = selectedPanelModelId;
  }, [selectedPanelModelId]);

  const [mapsError, setMapsError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mapsLoading, setMapsLoading] = useState(true);

  const selectedRoof = useMemo(
    () => roofPlanes.find((r) => r.id === selectedRoofId) ?? null,
    [roofPlanes, selectedRoofId]
  );

  const selectedModel = useMemo(
    () => panelModels.find((m) => m.id === selectedPanelModelId) ?? null,
    [panelModels, selectedPanelModelId]
  );

  const [calculatingProduction, setCalculatingProduction] = useState(false);

  const adderCalculations = useMemo(() => {
    let totalAdderCost = 0;

    proposalAdders.forEach((pa) => {
      const adder = pa.custom_adders;
      if (adder) {
        const quantity = pa.quantity || 1;
        if (adder.calculation_type === "flat_rate") {
          totalAdderCost += Number(adder.rate) * quantity;
        } else if (adder.calculation_type === "per_kw") {
          const systemKw = panels.reduce((sum, panel) => {
            const model = panelModels.find((m) => m.id === panel.panel_model_id);
            return sum + (model ? model.watts / 1000 : 0);
          }, 0);
          totalAdderCost += Number(adder.rate) * systemKw * quantity;
        }
      }
    });

    return { totalAdderCost };
  }, [proposalAdders, panels, panelModels]);

  const systemSummary = useMemo(() => {
    const panelCount = panels.length;
    let systemKw = 0;
    let annualProductionKwh = 0;

    panels.forEach((panel) => {
      const model = panelModels.find((m) => m.id === panel.panel_model_id);
      if (model) {
        systemKw += model.watts / 1000;
      }
    });

    if (proposal?.annual_production_estimate) {
      annualProductionKwh = proposal.annual_production_estimate;
    }

    const annualConsumption = proposalDraft?.annual_consumption || proposal?.annual_consumption || 0;
    const offsetPercent = annualConsumption > 0 ? (annualProductionKwh / annualConsumption) * 100 : 0;

    const basePPW = proposalDraft?.price_per_watt || 0;
    const systemWatts = systemKw * 1000;
    const baseSystemPrice = basePPW * systemWatts;

    let batteryCost = 0;
    const batteryQty = proposalDraft.battery_quantity || proposal?.battery_quantity || 0;
    const batteryBrand = proposalDraft.battery_brand || proposal?.battery_brand || "";
    if (batteryQty > 0 && batteryBrand) {
      const selectedBattery = batteries.find(b => `${b.brand} ${b.model}` === batteryBrand);
      if (selectedBattery) {
        batteryCost = batteryQty * Number(selectedBattery.cost);
      }
    }

    const totalContractPrice = baseSystemPrice + adderCalculations.totalAdderCost + batteryCost;
    const effectivePPW = systemWatts > 0 ? totalContractPrice / systemWatts : 0;

    const cashDeposit = 2000;
    const cashFinal = 1000;
    const cashProgress = totalContractPrice > 3000 ? totalContractPrice - cashDeposit - cashFinal : 0;

    return {
      panelCount,
      systemKw,
      systemWatts,
      annualProductionKwh,
      offsetPercent,
      basePPW,
      baseSystemPrice,
      totalAdderCost: adderCalculations.totalAdderCost,
      totalContractPrice,
      effectivePPW,
      cashDeposit,
      cashProgress,
      cashFinal,
      batteryCost,
    };
  }, [panels, panelModels, proposal, proposalDraft, adderCalculations, batteries]);

  useEffect(() => {
    const isCash = (proposalDraft.finance_type ?? proposal?.finance_type ?? "cash") === "cash";
    if (isCash && systemSummary.totalContractPrice > 0) {
      const currentDeposit = proposalDraft.cash_deposit ?? proposal?.cash_deposit ?? 0;
      const currentSecond = proposalDraft.cash_second_payment ?? proposal?.cash_second_payment ?? 0;
      const currentFinal = proposalDraft.cash_final_payment ?? proposal?.cash_final_payment ?? 0;

      const expectedDeposit = 2000;
      const expectedSecond = Math.max(0, systemSummary.totalContractPrice - 3000);
      const expectedFinal = 1000;

      if (currentDeposit !== expectedDeposit || currentSecond !== expectedSecond || currentFinal !== expectedFinal) {
        setProposalDraft((p: any) => ({
          ...p,
          cash_deposit: expectedDeposit,
          cash_second_payment: expectedSecond,
          cash_final_payment: expectedFinal,
        }));
      }
    }
  }, [systemSummary.totalContractPrice, proposalDraft.finance_type, proposal?.finance_type]);

  useEffect(() => {
    if (!proposal || panels.length === 0 || calculatingProduction) return;

    const calculateProduction = async () => {
      setCalculatingProduction(true);

      try {
        const systemKw = panels.reduce((sum, panel) => {
          const model = panelModels.find((m) => m.id === panel.panel_model_id);
          return sum + (model ? model.watts / 1000 : 0);
        }, 0);

        if (systemKw === 0) {
          setCalculatingProduction(false);
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/pvwatts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            lat: proposal.lat,
            lon: proposal.lng,
            system_capacity: systemKw,
            azimuth: 180,
            tilt: 20,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const annualKwh = data.annual_kwh;

          await supabase
            .from("proposals")
            .update(sanitizePatch({ annual_production_estimate: annualKwh }))
            .eq("id", proposalId);

          setProposal((prev: any) => ({
            ...prev,
            annual_production_estimate: annualKwh,
          }));
        }
      } catch (error) {
        console.error("Failed to calculate production:", error);
      } finally {
        setCalculatingProduction(false);
      }
    };

    const timer = setTimeout(calculateProduction, 2000);
    return () => clearTimeout(timer);
  }, [panels.length, panelModels, proposal?.lat, proposal?.lng, proposalId]);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 100;

    const checkGoogleMaps = () => {
      attempts++;

      if (isGoogleReady()) {
        setMapsLoading(false);
        setMapsError(null);
        return;
      }

      if (attempts >= maxAttempts) {
        setMapsLoading(false);
        setMapsError("Google Maps failed to load. Please refresh the page.");
        return;
      }

      setTimeout(checkGoogleMaps, 100);
    };

    checkGoogleMaps();
  }, []);

  useEffect(() => {
    async function loadPanelModels() {
      const { data, error } = await supabase
        .from("panel_models")
        .select("*")
        .order("brand", { ascending: true })
        .order("watts", { ascending: true });

      if (!error && data) {
        setPanelModels(data);
        if (data.length > 0 && !selectedPanelModelId) {
          setSelectedPanelModelId(data[0].id);
        }
      }
    }

    loadPanelModels();
  }, []);

  useEffect(() => {
    if (!proposalId) return;
    didInitDraftRef.current = false;
    isDirtyRef.current = false;
    lastLoadedProposalId.current = null;
    lastInitCustomerIdRef.current = null;
  }, [proposalId]);

  useEffect(() => {
    if (!proposalId) return;
    if (lastLoadedProposalId.current === proposalId) return;

    lastLoadedProposalId.current = proposalId;

    async function loadProposal() {
      const { data: proposalData } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .maybeSingle();

      if (proposalData) {
        setProposal(proposalData);
        setProposalDraft(proposalData);

        if (proposalData.customer_id) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("*")
            .eq("id", proposalData.customer_id)
            .maybeSingle();

          if (customerData) {
            setCustomer(customerData);

            if (customerData.sales_rep_id) {
              const { data: salesRepData } = await supabase
                .from("app_users")
                .select("ppw_redline")
                .eq("id", customerData.sales_rep_id)
                .maybeSingle();

              if (salesRepData) {
                setSalesRep(salesRepData);

                if (!proposalData.price_per_watt && salesRepData.ppw_redline) {
                  setProposalDraft((prev: any) => ({
                    ...prev,
                    price_per_watt: salesRepData.ppw_redline,
                  }));
                }
              }
            }
          }
        }

        if (proposalData.panel_model_id) {
          setSelectedPanelModelId(proposalData.panel_model_id);
        }
      }

      const { data: planesData } = await supabase
        .from("proposal_roof_planes")
        .select("*")
        .eq("proposal_id", proposalId);

      if (planesData) {
        setRoofPlanes(planesData);
      }

      const { data: obstructionsData } = await supabase
        .from("proposal_obstructions")
        .select("*")
        .eq("proposal_id", proposalId);

      if (obstructionsData) {
        setObstructions(obstructionsData);
      }

      const { data: panelsData } = await supabase
        .from("proposal_panels")
        .select("*")
        .eq("proposal_id", proposalId);

      if (panelsData) {
        setPanels(panelsData);
      }

      const { data: proposalAddersData } = await supabase
        .from("proposal_adders")
        .select("*, custom_adders(*)")
        .eq("proposal_id", proposalId);

      if (proposalAddersData) {
        setProposalAdders(proposalAddersData);
      }

      const { data: customAddersData } = await supabase
        .from("custom_adders")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (customAddersData) {
        setCustomAdders(customAddersData);
      }

      const { data: invertersData } = await supabase
        .from("inverters")
        .select("*")
        .eq("is_active", true)
        .order("brand", { ascending: true });

      if (invertersData) {
        setInverters(invertersData);
      }

      const { data: rackingData } = await supabase
        .from("racking")
        .select("*")
        .eq("is_active", true)
        .order("brand", { ascending: true });

      if (rackingData) {
        setRacking(rackingData);
      }

      const { data: batteriesData } = await supabase
        .from("batteries")
        .select("*")
        .eq("is_active", true)
        .order("brand", { ascending: true });

      if (batteriesData) {
        setBatteries(batteriesData);
      }
    }

    loadProposal();
  }, [proposalId]);

  useEffect(() => {
    if (!proposalId || !customer?.id) return;
    if (lastInitCustomerIdRef.current === customer.id) return;

    console.log("Draft init ran for customer:", customer.id);

    setDraftCustomer({
      full_name: customer.full_name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    });

    lastInitCustomerIdRef.current = customer.id;
    didInitDraftRef.current = true;
  }, [proposalId, customer?.id]);

  useEffect(() => {
    if (activeTab !== "solar-design") return;
    if (!isGoogleReady() || !mapDivRef.current || !proposal) return;

    const google = (window as any).google;

    if (!mapRef.current) {
      const map = new google.maps.Map(mapDivRef.current, {
        center: { lat: proposal.lat, lng: proposal.lng },
        zoom: 21,
        mapTypeId: "satellite",
        tilt: 0,
        disableDefaultUI: true,
        zoomControl: true,
      });

      mapRef.current = map;

      const homeMarker = new google.maps.Marker({
        position: { lat: proposal.lat, lng: proposal.lng },
        map: map,
        title: "Property Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 8,
        },
      });
      homeMarkerRef.current = homeMarker;

      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
      });
      drawingManager.setMap(map);
      drawingRef.current = drawingManager;

      google.maps.event.addListener(drawingManager, "polygoncomplete", async (polygon: any) => {
        const path = polygon.getPath().getArray().map((p: any) => ({
          lat: p.lat(),
          lng: p.lng(),
        }));

        polygon.setMap(null);

        const { data, error } = await supabase
          .from("proposal_roof_planes")
          .insert({
            proposal_id: proposalId,
            name: `Roof Plane ${roofPlanes.length + 1}`,
            pitch_deg: 20,
            path,
          })
          .select()
          .single();

        if (!error && data) {
          setRoofPlanes((prev) => [...prev, data]);
        }

        drawingManager.setDrawingMode(null);
        setToolMode("none");
      });

      google.maps.event.addListener(map, "click", (e: any) => {
        if (!e?.latLng) {
          console.log("MAP CLICK: No latLng");
          return;
        }

        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const currentToolMode = toolModeRef.current;
        const currentRoofId = selectedRoofIdRef.current;
        const currentPanelModelId = selectedPanelModelIdRef.current;

        console.log("MAP CLICK", {
          toolMode: currentToolMode,
          roofId: currentRoofId,
          lat,
          lng,
          hasLatLng: !!e.latLng
        });

        if (currentToolMode === "none") {
          console.log("MAP CLICK: Tool mode is none, ignoring");
          return;
        }

        if (currentToolMode === "add-panel") {
          if (currentRoofId && currentPanelModelId) {
            addPanelAt(lat, lng);
          } else {
            console.log("MAP CLICK: Missing roofId or panelModelId for add-panel");
          }
        } else if (currentToolMode === "circle") {
          const newObstruction = {
            id: `temp-${Date.now()}-${Math.random()}`,
            proposal_id: proposalId!,
            type: "circle" as const,
            roof_plane_id: currentRoofId,
            center_lat: lat,
            center_lng: lng,
            radius_ft: 5,
            width_ft: null,
            height_ft: null,
            rotation_deg: null,
          };
          console.log("MAP CLICK: Adding circle obstruction", newObstruction);
          setObstructions((prev) => {
            console.log("MAP CLICK: Obstructions before:", prev.length);
            const updated = [...prev, newObstruction];
            console.log("MAP CLICK: Obstructions after:", updated.length);
            return updated;
          });
        } else if (currentToolMode === "rect") {
          const newObstruction = {
            id: `temp-${Date.now()}-${Math.random()}`,
            proposal_id: proposalId!,
            type: "rect" as const,
            roof_plane_id: currentRoofId,
            center_lat: lat,
            center_lng: lng,
            radius_ft: null,
            width_ft: obstructionWidth,
            height_ft: obstructionHeight,
            rotation_deg: 0,
          };
          console.log("MAP CLICK: Adding rect obstruction", newObstruction);
          setObstructions((prev) => {
            console.log("MAP CLICK: Obstructions before:", prev.length);
            const updated = [...prev, newObstruction];
            console.log("MAP CLICK: Obstructions after:", updated.length);
            return updated;
          });
        } else if (currentToolMode === "tree") {
          const newObstruction = {
            id: `temp-${Date.now()}-${Math.random()}`,
            proposal_id: proposalId!,
            type: "tree" as const,
            roof_plane_id: currentRoofId,
            center_lat: lat,
            center_lng: lng,
            radius_ft: null,
            width_ft: obstructionWidth,
            height_ft: obstructionHeight,
            rotation_deg: 0,
          };
          console.log("MAP CLICK: Adding tree obstruction", newObstruction);
          setObstructions((prev) => {
            console.log("MAP CLICK: Obstructions before:", prev.length);
            const updated = [...prev, newObstruction];
            console.log("MAP CLICK: Obstructions after:", updated.length);
            return updated;
          });
        }
      });
    }
  }, [activeTab, mapsLoading, proposal?.lat, proposal?.lng, proposalId, obstructionWidth, obstructionHeight]);

  useEffect(() => {
    if (!mapRef.current || !isGoogleReady()) return;

    roofPolysRef.current.forEach((poly) => poly.setMap(null));
    roofPolysRef.current.clear();

    const google = (window as any).google;

    roofPlanes.forEach((plane) => {
      const poly = new google.maps.Polygon({
        paths: plane.path,
        strokeColor: selectedRoofId === plane.id ? "#FFA500" : "#00FF00",
        strokeOpacity: 0.8,
        strokeWeight: selectedRoofId === plane.id ? 3 : 2,
        fillColor: selectedRoofId === plane.id ? "#FFA500" : "#00FF00",
        fillOpacity: 0.2,
        clickable: true,
      });

      poly.setMap(mapRef.current);
      roofPolysRef.current.set(plane.id, poly);

      google.maps.event.addListener(poly, "click", () => {
        setSelectedRoofId(plane.id);
      });
    });
  }, [roofPlanes, selectedRoofId]);

  useEffect(() => {
    if (!mapRef.current || !isGoogleReady()) return;

    obstructionShapesRef.current.forEach((shape) => shape.setMap(null));
    obstructionShapesRef.current.clear();

    const google = (window as any).google;

    obstructions.forEach((obs) => {
      let shape: any = null;
      const isSelected = selectedObstruction?.id === obs.id;

      if (obs.type === "circle" && obs.radius_ft) {
        const radiusMeters = obs.radius_ft * 0.3048;
        shape = new google.maps.Circle({
          center: { lat: obs.center_lat, lng: obs.center_lng },
          radius: radiusMeters,
          strokeColor: isSelected ? "#FFA500" : "#FF0000",
          strokeOpacity: 0.8,
          strokeWeight: isSelected ? 3 : 2,
          fillColor: isSelected ? "#FFA500" : "#FF0000",
          fillOpacity: isSelected ? 0.5 : 0.35,
        });
      } else if ((obs.type === "rect" || obs.type === "tree") && obs.width_ft && obs.height_ft) {
        const widthMeters = obs.width_ft * 0.3048;
        const heightMeters = obs.height_ft * 0.3048;

        const latOffset = heightMeters / 111320;
        const lngOffset = widthMeters / (111320 * Math.cos((obs.center_lat * Math.PI) / 180));

        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(obs.center_lat - latOffset / 2, obs.center_lng - lngOffset / 2),
          new google.maps.LatLng(obs.center_lat + latOffset / 2, obs.center_lng + lngOffset / 2)
        );

        const baseColor = obs.type === "tree" ? "#228B22" : "#FF0000";
        shape = new google.maps.Rectangle({
          bounds,
          strokeColor: isSelected ? "#FFA500" : baseColor,
          strokeOpacity: 0.8,
          strokeWeight: isSelected ? 3 : 2,
          fillColor: isSelected ? "#FFA500" : baseColor,
          fillOpacity: isSelected ? 0.5 : 0.35,
        });
      }

      if (shape) {
        shape.setMap(mapRef.current);
        obstructionShapesRef.current.set(obs.id, shape);

        google.maps.event.addListener(shape, "click", () => {
          setSelectedObstruction(obs);
          setToolMode("none");
        });
      }
    });
  }, [obstructions, selectedObstruction]);

  useEffect(() => {
    if (!mapRef.current || !isGoogleReady()) return;

    panelRectanglesRef.current.forEach((rect) => rect.setMap(null));
    panelRectanglesRef.current.clear();

    const google = (window as any).google;

    panels.forEach((panel) => {
      const model = panelModels.find((m) => m.id === panel.panel_model_id);
      if (!model) return;

      const lengthMeters = (panel.is_portrait ? model.length_mm : model.width_mm) / 1000;
      const widthMeters = (panel.is_portrait ? model.width_mm : model.length_mm) / 1000;

      const latOffset = lengthMeters / 111320;
      const lngOffset = widthMeters / (111320 * Math.cos((panel.center_lat * Math.PI) / 180));

      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(panel.center_lat - latOffset / 2, panel.center_lng - lngOffset / 2),
        new google.maps.LatLng(panel.center_lat + latOffset / 2, panel.center_lng + lngOffset / 2)
      );

      const rect = new google.maps.Rectangle({
        bounds,
        strokeColor: "#0000FF",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#0000FF",
        fillOpacity: 0.3,
        clickable: true,
      });

      google.maps.event.addListener(rect, "click", () => {
        if (toolMode === "delete-panel") {
          deletePanelById(panel.id);
        }
      });

      rect.setMap(mapRef.current);
      panelRectanglesRef.current.set(panel.id, rect);
    });
  }, [panels, panelModels, toolMode]);

  useEffect(() => {
    if (!drawingRef.current) return;

    const google = (window as any).google;

    if (toolMode === "roof") {
      drawingRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    } else {
      drawingRef.current.setDrawingMode(null);
    }
  }, [toolMode]);

  const deletePanelById = (panelId: string) => {
    if (!panelId.startsWith('temp-')) {
      setDeletedPanelIds((prev) => [...prev, panelId]);
    }
    setPanels((prev) => prev.filter((p) => p.id !== panelId));
  };

  const deleteObstructionById = (obstructionId: string) => {
    if (!obstructionId.startsWith('temp-')) {
      setDeletedObstructionIds((prev) => [...prev, obstructionId]);
    }
    setObstructions((prev) => prev.filter((o) => o.id !== obstructionId));
  };

  const saveDesignChanges = async () => {
    if (!proposalId) return;
    setBusy("Saving design...");

    try {
      if (deletedPanelIds.length > 0) {
        const { error: deletePanelError } = await supabase
          .from("proposal_panels")
          .delete()
          .in('id', deletedPanelIds);

        if (deletePanelError) throw deletePanelError;
        setDeletedPanelIds([]);
      }

      if (deletedObstructionIds.length > 0) {
        const { error: deleteObstructionError } = await supabase
          .from("proposal_obstructions")
          .delete()
          .in('id', deletedObstructionIds);

        if (deleteObstructionError) throw deleteObstructionError;
        setDeletedObstructionIds([]);
      }

      const tempPanels = panels.filter(p => p.id.startsWith('temp-'));
      const tempObstructions = obstructions.filter(o => o.id.startsWith('temp-'));

      if (tempPanels.length > 0) {
        const panelsToInsert = tempPanels.map(p => ({
          proposal_id: p.proposal_id,
          roof_plane_id: p.roof_plane_id,
          panel_model_id: p.panel_model_id,
          center_lat: p.center_lat,
          center_lng: p.center_lng,
          rotation_deg: p.rotation_deg,
          is_portrait: p.is_portrait,
        }));

        const { data: savedPanels, error: panelError } = await supabase
          .from("proposal_panels")
          .insert(panelsToInsert)
          .select();

        if (panelError) throw panelError;

        if (savedPanels) {
          setPanels(prev => [
            ...prev.filter(p => !p.id.startsWith('temp-')),
            ...savedPanels
          ]);
        }
      }

      if (tempObstructions.length > 0) {
        const obstructionsToInsert = tempObstructions.map(o => ({
          proposal_id: o.proposal_id,
          type: o.type,
          roof_plane_id: o.roof_plane_id,
          center_lat: o.center_lat,
          center_lng: o.center_lng,
          radius_ft: o.radius_ft,
          width_ft: o.width_ft,
          height_ft: o.height_ft,
          rotation_deg: o.rotation_deg,
        }));

        const { data: savedObstructions, error: obstructionError } = await supabase
          .from("proposal_obstructions")
          .insert(obstructionsToInsert)
          .select();

        if (obstructionError) throw obstructionError;

        if (savedObstructions) {
          setObstructions(prev => [
            ...prev.filter(o => !o.id.startsWith('temp-')),
            ...savedObstructions
          ]);
        }
      }

      setBusy(null);
      alert("Design saved successfully!");
    } catch (error: any) {
      setBusy(null);
      alert(`Failed to save design: ${error.message}`);
      console.error("Save design error:", error);
    }
  };

  const addPanelAt = (lat: number, lng: number) => {
    if (!selectedRoofId || !selectedPanelModelId) return;

    const roof = roofPlanes.find((r) => r.id === selectedRoofId);
    if (!roof) return;

    const point = { lat, lng };
    const isInside = isPointInPolygon(point, roof.path);

    if (!isInside) {
      alert("Panel must be placed within the selected roof plane");
      return;
    }

    const newPanel = {
      id: `temp-${Date.now()}-${Math.random()}`,
      proposal_id: proposalId,
      roof_plane_id: selectedRoofId,
      panel_model_id: selectedPanelModelId,
      center_lat: lat,
      center_lng: lng,
      rotation_deg: panelRotation,
      is_portrait: panelOrientation === "portrait",
    };

    setPanels((prev) => [...prev, newPanel]);
  };

  const autoFillPanels = async () => {
    if (!selectedRoof || !selectedPanelModelId) return;

    setBusy("Auto-filling panels...");

    const model = panelModels.find((m) => m.id === selectedPanelModelId);
    if (!model) return;

    const lengthMeters = (panelOrientation === "portrait" ? model.length_mm : model.width_mm) / 1000;
    const widthMeters = (panelOrientation === "portrait" ? model.width_mm : model.length_mm) / 1000;

    const roofPath = selectedRoof.path;
    if (roofPath.length < 3) {
      setBusy(null);
      return;
    }

    let minLat = roofPath[0].lat;
    let maxLat = roofPath[0].lat;
    let minLng = roofPath[0].lng;
    let maxLng = roofPath[0].lng;

    roofPath.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    const latStepMeters = lengthMeters + rowSpacing;
    const lngStepMeters = widthMeters + colSpacing;

    const latStep = latStepMeters / 111320;
    const lngStep = lngStepMeters / (111320 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));

    const newPanels: any[] = [];

    for (let lat = minLat + latStep / 2; lat < maxLat; lat += latStep) {
      for (let lng = minLng + lngStep / 2; lng < maxLng; lng += lngStep) {
        const latOffset = lengthMeters / 111320;
        const lngOffset = widthMeters / (111320 * Math.cos((lat * Math.PI) / 180));

        const corners = [
          { lat: lat - latOffset / 2, lng: lng - lngOffset / 2 },
          { lat: lat - latOffset / 2, lng: lng + lngOffset / 2 },
          { lat: lat + latOffset / 2, lng: lng - lngOffset / 2 },
          { lat: lat + latOffset / 2, lng: lng + lngOffset / 2 },
        ];

        const allCornersInside = corners.every((corner) => isPointInPolygon(corner, roofPath));

        if (allCornersInside) {
          newPanels.push({
            proposal_id: proposalId,
            roof_plane_id: selectedRoofId,
            panel_model_id: selectedPanelModelId,
            center_lat: lat,
            center_lng: lng,
            rotation_deg: panelRotation,
            is_portrait: panelOrientation === "portrait",
          });
        }
      }
    }

    if (newPanels.length > 0) {
      const { data, error } = await supabase
        .from("proposal_panels")
        .insert(newPanels)
        .select();

      if (!error && data) {
        setPanels((prev) => [...prev, ...data]);
      }
    }

    setBusy(null);
  };

  const clearAllPanels = async () => {
    if (!selectedRoofId) return;

    const panelsToClear = panels.filter((p) => p.roof_plane_id === selectedRoofId);
    const panelIds = panelsToClear.map((p) => p.id);

    if (panelIds.length === 0) return;

    await supabase.from("proposal_panels").delete().in("id", panelIds);

    setPanels((prev) => prev.filter((p) => p.roof_plane_id !== selectedRoofId));
  };

  const deleteRoof = async (roofId: string) => {
    await supabase.from("proposal_roof_planes").delete().eq("id", roofId);
    await supabase.from("proposal_panels").delete().eq("roof_plane_id", roofId);

    setRoofPlanes((prev) => prev.filter((r) => r.id !== roofId));
    setPanels((prev) => prev.filter((p) => p.roof_plane_id !== roofId));

    if (selectedRoofId === roofId) {
      setSelectedRoofId(null);
    }
  };

  function isPointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const selectedFinanceValue = useMemo(() => {
    if (!proposalDraft) return "cash";
    if ((proposalDraft.finance_type ?? "cash") === "cash") return "cash";
    return proposalDraft.finance_option_id ?? "cash";
  }, [proposalDraft]);

  if (!proposalId)
    return <div style={{ padding: 16 }}>Select a proposal first.</div>;

  if (!proposal)
    return <div style={{ padding: 16 }}>Loading proposal workspace…</div>;

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

  const renderManageTab = () => {
    const panelModel = panelModels.find((m) => m.id === selectedPanelModelId);

    return (
      <div style={{ padding: 20 }}>
        <div style={{ position: "fixed", bottom: 10, left: 10, zIndex: 9999, background: "#fff", padding: 8, border: "1px solid #000", borderRadius: 4, fontSize: 11 }}>
          dirty: {String(isDirtyRef.current)} | init: {String(didInitDraftRef.current)}
        </div>

        <CollapsibleSection id="system-details" icon={Zap} title="System Details">
          <form onSubmit={(e) => e.preventDefault()}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 16, paddingBottom: 8, borderBottom: "2px solid #f97316" }}>
                  Solar System
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Panel Brand (from Solar Design)
                    </label>
                    <div style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                      {panelModel ? `${panelModel.brand} ${panelModel.model} (${panelModel.watts}W)` : "No panels placed yet"}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Inverter Type
                    </label>
                    <select
                      value={proposalDraft.inverter_type || proposal?.inverter_type || ""}
                      onChange={(e) => setProposalDraft((p: any) => ({ ...p, inverter_type: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#fff",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <option value="">Select Inverter</option>
                      {inverters.map((inv) => (
                        <option key={inv.id} value={`${inv.brand} ${inv.model}`}>
                          {inv.brand} {inv.model} ({inv.capacity_kw}kW)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Racking Type
                    </label>
                    <select
                      value={proposalDraft.racking_type || proposal?.racking_type || ""}
                      onChange={(e) => setProposalDraft((p: any) => ({ ...p, racking_type: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#fff",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <option value="">Select Racking</option>
                      <option value="Unirac NXT Butyl">Unirac NXT Butyl (Primary)</option>
                      {racking.map((rack) => (
                        <option key={rack.id} value={`${rack.brand} ${rack.model}`}>
                          {rack.brand} {rack.model} ({rack.roof_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Roof Type
                    </label>
                    <select
                      value={proposalDraft.roof_type || proposal?.roof_type || ""}
                      onChange={(e) => setProposalDraft((p: any) => ({ ...p, roof_type: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#fff",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <option value="">Select Roof Type</option>
                      <option value="composition">Composition</option>
                      <option value="tile">Tile</option>
                      <option value="metal">Metal</option>
                      <option value="flat">Flat</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 16, paddingBottom: 8, borderBottom: "2px solid #f97316" }}>
                  Battery Storage
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Battery Brand
                    </label>
                    <select
                      value={proposalDraft.battery_brand || proposal?.battery_brand || ""}
                      onChange={(e) => setProposalDraft((p: any) => ({ ...p, battery_brand: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#fff",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <option value="">No Battery</option>
                      {batteries.map((bat) => (
                        <option key={bat.id} value={`${bat.brand} ${bat.model}`}>
                          {bat.brand} {bat.model} ({bat.capacity_kwh}kWh)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Battery Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={proposalDraft.battery_quantity ?? proposal?.battery_quantity ?? 0}
                      onChange={(e) => setProposalDraft((p: any) => ({ ...p, battery_quantity: parseInt(e.target.value) || 0 }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#fff",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Total Battery Capacity
                    </label>
                    <div style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic", padding: "8px 0" }}>
                      {(() => {
                        const qty = proposalDraft.battery_quantity || proposal?.battery_quantity || 0;
                        const batteryBrand = proposalDraft.battery_brand || proposal?.battery_brand || "";
                        if (qty === 0 || !batteryBrand) return "0.0 kWh";
                        const selectedBattery = batteries.find(b => `${b.brand} ${b.model}` === batteryBrand);
                        if (!selectedBattery) return "0.0 kWh";
                        return `${(qty * Number(selectedBattery.capacity_kwh)).toFixed(1)} kWh`;
                      })()}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginTop: 24, marginBottom: 16, paddingBottom: 8, borderBottom: "2px solid #f97316" }}>
                  Contract Price
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Total Contract Price</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>
                      ${fmt(systemSummary.totalContractPrice, 2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase
                  .from("proposals")
                  .update(sanitizePatch({
                    inverter_type: proposalDraft.inverter_type ?? null,
                    racking_type: proposalDraft.racking_type ?? null,
                    roof_type: proposalDraft.roof_type ?? null,
                    battery_brand: proposalDraft.battery_brand ?? null,
                    battery_quantity: proposalDraft.battery_quantity ?? 0,
                  }))
                  .eq("id", proposalId);

                if (error) {
                  alert("Failed to save system details");
                } else {
                  setProposal((p: any) => ({ ...p, ...proposalDraft }));
                  isDirtyRef.current = false;
                  alert("System details saved successfully!");
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
              Save System Details
            </button>
          </form>
        </CollapsibleSection>

        <CollapsibleSection id="customer" icon={User} title="Customer Information">
        <form onSubmit={(e) => e.preventDefault()}>
          <CustomerFormInputs
            initialData={draftCustomer}
            onChange={handleCustomerChange}
          />

          <button
            type="button"
            onClick={async () => {
              if (!customer?.id) return;
              const { error } = await supabase
                .from("customers")
                .update(sanitizePatch({
                  full_name: draftCustomer.full_name.trim(),
                  email: draftCustomer.email.trim(),
                  phone: draftCustomer.phone.trim(),
                }))
                .eq("id", customer.id);

              if (error) {
                console.error("Failed to save customer:", error);
                alert("Failed to save customer information");
              } else {
                setCustomer((c: any) => ({ ...c, ...draftCustomer }));
                isDirtyRef.current = false;
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
        </form>
      </CollapsibleSection>

      <CollapsibleSection id="electricity" icon={Zap} title="Electricity Usage and Rate">
        <form onSubmit={(e) => e.preventDefault()}>
          <ElectricityUsageInputs
            initialData={{ annual_consumption: proposalDraft.annual_consumption ?? null }}
            onChange={handleElectricityChange}
          />

          <div style={{ marginTop: 16 }}>
            <ElectricityRateInputs
              initialData={{
                utility_company: proposalDraft.utility_company ?? null,
                electricity_rate: proposalDraft.electricity_rate ?? null,
              }}
              onChange={handleElectricityRateChange}
            />
          </div>

          <button
            type="button"
            onClick={async () => {
              const { error } = await supabase
                .from("proposals")
                .update(sanitizePatch({
                  annual_consumption: proposalDraft.annual_consumption ?? null,
                  utility_company: proposalDraft.utility_company ?? null,
                  electricity_rate: proposalDraft.electricity_rate ?? null,
                }))
                .eq("id", proposalId);

              if (error) {
                alert("Failed to save electricity information");
              } else {
                setProposal((p: any) => ({ ...p, ...proposalDraft }));
                isDirtyRef.current = false;
                alert("Electricity usage and rate saved successfully!");
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
            Save Electricity Information
          </button>
        </form>
      </CollapsibleSection>

      <CollapsibleSection id="system-specs" icon={Package} title="System Specifications">
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

      <CollapsibleSection id="adders" icon={Package} title="System Adders">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            Select additional items that apply to this project. Costs will be added to the final contract price.
          </div>

          {customAdders.map((adder) => {
            const isSelected = proposalAdders.some((pa) => pa.custom_adder_id === adder.id);
            const selectedAdder = proposalAdders.find((pa) => pa.custom_adder_id === adder.id);

            return (
              <div
                key={adder.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  background: isSelected ? "#f0fdf4" : "#fff",
                  border: isSelected ? "2px solid #10b981" : "1px solid #e5e7eb",
                  borderRadius: 6,
                  marginBottom: 8,
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (isSelected) {
                    setProposalAdders((prev) => prev.filter((pa) => pa.custom_adder_id !== adder.id));
                  } else {
                    setProposalAdders((prev) => [
                      ...prev,
                      {
                        id: `temp-${Date.now()}`,
                        proposal_id: proposalId,
                        custom_adder_id: adder.id,
                        quantity: 1,
                        custom_adders: adder,
                      },
                    ]);
                  }
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                    {adder.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{adder.description}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    {adder.calculation_type === "flat_rate"
                      ? `$${Number(adder.rate).toFixed(2)} flat`
                      : `$${Number(adder.rate).toFixed(2)}/kW`}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>
            );
          })}

          {customAdders.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13 }}>
              No adders available. Contact admin to add custom adders.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              const tempAdders = proposalAdders.filter((pa) => pa.id.startsWith("temp-"));
              const existingAdderIds = proposalAdders.filter((pa) => !pa.id.startsWith("temp-")).map((pa) => pa.custom_adder_id);
              const currentAdderIds = proposalAdders.map((pa) => pa.custom_adder_id);

              const toDelete = existingAdderIds.filter((id) => !currentAdderIds.includes(id));

              if (toDelete.length > 0) {
                await supabase
                  .from("proposal_adders")
                  .delete()
                  .eq("proposal_id", proposalId)
                  .in("custom_adder_id", toDelete);
              }

              if (tempAdders.length > 0) {
                const { data: savedAdders } = await supabase
                  .from("proposal_adders")
                  .insert(
                    tempAdders.map((pa) => ({
                      proposal_id: pa.proposal_id,
                      custom_adder_id: pa.custom_adder_id,
                      quantity: pa.quantity,
                    }))
                  )
                  .select("*, custom_adders(*)");

                if (savedAdders) {
                  setProposalAdders((prev) => [...prev.filter((pa) => !pa.id.startsWith("temp-")), ...savedAdders]);
                }
              }

              alert("Adders saved successfully!");
            } catch (error: any) {
              console.error("Failed to save adders:", error);
              alert("Failed to save adders");
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
          Save Adders
        </button>
      </CollapsibleSection>

      <CollapsibleSection id="pricing" icon={DollarSign} title="Pricing Details">
        <PricingDetailsInputs
          initialData={{
            total_price: proposalDraft.total_price ?? null,
            price_per_watt: proposalDraft.price_per_watt ?? null,
          }}
          onChange={handlePricingChange}
          systemSummary={systemSummary}
          salesRepRedline={salesRep?.ppw_redline}
        />

        <button
          type="button"
          onClick={async () => {
            const { error } = await supabase
              .from("proposals")
              .update(sanitizePatch({
                total_price: systemSummary.totalContractPrice,
                price_per_watt: proposalDraft.price_per_watt ?? null,
                system_price: systemSummary.baseSystemPrice,
                cash_down_payment: systemSummary.cashDeposit,
                cash_second_payment: systemSummary.cashProgress,
                cash_final_payment: systemSummary.cashFinal,
              }))
              .eq("id", proposalId);

            if (error) {
              alert("Failed to save pricing");
            } else {
              setProposal((p: any) => ({
                ...p,
                ...proposalDraft,
                total_price: systemSummary.totalContractPrice,
                system_price: systemSummary.baseSystemPrice,
                cash_down_payment: systemSummary.cashDeposit,
                cash_second_payment: systemSummary.cashProgress,
                cash_final_payment: systemSummary.cashFinal,
              }));
              isDirtyRef.current = false;
              alert("Pricing and payment schedule saved successfully!");
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
          Save Pricing & Payment Schedule
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
                  const totalContractPrice = systemSummary.totalContractPrice;
                  const cashDeposit = 2000;
                  const cashFinal = 1000;
                  const cashSecond = Math.max(0, totalContractPrice - 3000);

                  setProposalDraft((p: any) => ({
                    ...p,
                    finance_type: "cash",
                    finance_option_id: null,
                    cash_deposit: cashDeposit,
                    cash_second_payment: cashSecond,
                    cash_final_payment: cashFinal,
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

        {(proposalDraft.finance_type ?? "cash") === "cash" && (
          <div style={{ marginTop: 24, padding: 16, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
              Cash Payment Schedule
            </div>
            <CashPaymentInputs
              initialData={{
                cash_deposit: proposalDraft.cash_deposit ?? null,
                cash_second_payment: proposalDraft.cash_second_payment ?? null,
                cash_final_payment: proposalDraft.cash_final_payment ?? null,
              }}
              onChange={handleCashPaymentChange}
            />
            <div style={{ marginTop: 12, fontSize: 11, color: "#6b7280" }}>
              Payment schedule automatically calculated: $2,000 deposit + ${fmt(Math.max(0, systemSummary.totalContractPrice - 3000), 2)} progress + $1,000 final
            </div>
          </div>
        )}

        <button
          onClick={async () => {
            const updates: any = {
              finance_type: proposalDraft.finance_type ?? "cash",
              finance_option_id: proposalDraft.finance_option_id ?? null,
            };

            if ((proposalDraft.finance_type ?? "cash") === "cash") {
              updates.cash_deposit = proposalDraft.cash_deposit ?? null;
              updates.cash_second_payment = proposalDraft.cash_second_payment ?? null;
              updates.cash_final_payment = proposalDraft.cash_final_payment ?? null;
            }

            await supabase
              .from("proposals")
              .update(updates)
              .eq("id", proposalId);

            alert("Financing option saved successfully!");
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
          Save Financing & Payment Schedule
        </button>
      </CollapsibleSection>
      </div>
    );
  };

  const renderSolarDesignTab = () => (
    <div style={{ display: "flex", height: "calc(100vh - 180px)", gap: 16 }}>
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", paddingRight: 8, background: "#fff", borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Design Tools</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Panel Model</div>
          <select
            value={selectedPanelModelId ?? ""}
            onChange={(e) => setSelectedPanelModelId(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
              color: "#111827",
            }}
          >
            {panelModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.brand} {model.model} ({model.watts}W)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setToolMode(toolMode === "roof" ? "none" : "roof")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: toolMode === "roof" ? "#f97316" : "#fff",
              color: toolMode === "roof" ? "#fff" : "#111827",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Square size={16} />
            Draw Roof Plane
          </button>

          <button
            onClick={() => setToolMode(toolMode === "circle" ? "none" : "circle")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: toolMode === "circle" ? "#f97316" : "#fff",
              color: toolMode === "circle" ? "#fff" : "#111827",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Circle size={16} />
            Add Circle Obstruction
          </button>

          <button
            onClick={() => setToolMode(toolMode === "rect" ? "none" : "rect")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: toolMode === "rect" ? "#f97316" : "#fff",
              color: toolMode === "rect" ? "#fff" : "#111827",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Square size={16} />
            Add Rectangle Obstruction
          </button>

          <button
            onClick={() => setToolMode(toolMode === "tree" ? "none" : "tree")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: toolMode === "tree" ? "#f97316" : "#fff",
              color: toolMode === "tree" ? "#fff" : "#111827",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <TreeDeciduous size={16} />
            Add Tree
          </button>

          {(toolMode === "rect" || toolMode === "tree") && (
            <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Obstruction Size (feet)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                    Width
                  </label>
                  <input
                    type="number"
                    value={obstructionWidth}
                    onChange={(e) => setObstructionWidth(Number(e.target.value))}
                    min="1"
                    step="1"
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                    Height
                  </label>
                  <input
                    type="number"
                    value={obstructionHeight}
                    onChange={(e) => setObstructionHeight(Number(e.target.value))}
                    min="1"
                    step="1"
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {toolMode !== "none" && (
            <button
              onClick={() => setToolMode("none")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 14px",
                background: "#dc2626",
                color: "#fff",
                border: "1px solid #dc2626",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                marginTop: 8,
              }}
            >
              Stop Tool
            </button>
          )}

          {selectedObstruction && (
            <div style={{ marginTop: 12, padding: 12, background: "#fef3c7", borderRadius: 6, border: "1px solid #fbbf24" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#78350f", marginBottom: 8 }}>
                Selected: {selectedObstruction.type.charAt(0).toUpperCase() + selectedObstruction.type.slice(1)} Obstruction
              </div>

              {selectedObstruction.type === "circle" && selectedObstruction.radius_ft && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#78350f", marginBottom: 4 }}>
                    Radius (feet)
                  </label>
                  <input
                    type="number"
                    value={selectedObstruction.radius_ft}
                    onChange={(e) => {
                      const newRadius = Number(e.target.value);
                      setObstructions((prev) =>
                        prev.map((o) =>
                          o.id === selectedObstruction.id
                            ? { ...o, radius_ft: newRadius }
                            : o
                        )
                      );
                      setSelectedObstruction({ ...selectedObstruction, radius_ft: newRadius });
                    }}
                    min="1"
                    step="0.5"
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      background: "#fff",
                      border: "1px solid #fbbf24",
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
              )}

              {(selectedObstruction.type === "rect" || selectedObstruction.type === "tree") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#78350f", marginBottom: 4 }}>
                      Width (feet)
                    </label>
                    <input
                      type="number"
                      value={selectedObstruction.width_ft || 5}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setObstructions((prev) =>
                          prev.map((o) =>
                            o.id === selectedObstruction.id
                              ? { ...o, width_ft: newWidth }
                              : o
                          )
                        );
                        setSelectedObstruction({ ...selectedObstruction, width_ft: newWidth });
                      }}
                      min="1"
                      step="0.5"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        background: "#fff",
                        border: "1px solid #fbbf24",
                        borderRadius: 4,
                        fontSize: 13,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#78350f", marginBottom: 4 }}>
                      Height (feet)
                    </label>
                    <input
                      type="number"
                      value={selectedObstruction.height_ft || 5}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        setObstructions((prev) =>
                          prev.map((o) =>
                            o.id === selectedObstruction.id
                              ? { ...o, height_ft: newHeight }
                              : o
                          )
                        );
                        setSelectedObstruction({ ...selectedObstruction, height_ft: newHeight });
                      }}
                      min="1"
                      step="0.5"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        background: "#fff",
                        border: "1px solid #fbbf24",
                        borderRadius: 4,
                        fontSize: 13,
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    deleteObstructionById(selectedObstruction.id);
                    setSelectedObstruction(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedObstruction(null)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#fff",
                    color: "#78350f",
                    border: "1px solid #fbbf24",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Deselect
                </button>
              </div>
            </div>
          )}

          <button
            onClick={saveDesignChanges}
            disabled={!!busy}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 14px",
              background: busy ? "#9ca3af" : "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            {busy ? busy : `Save Design${(panels.filter(p => p.id.startsWith('temp-')).length + obstructions.filter(o => o.id.startsWith('temp-')).length + deletedPanelIds.length + deletedObstructionIds.length) > 0 ? ` (${panels.filter(p => p.id.startsWith('temp-')).length + obstructions.filter(o => o.id.startsWith('temp-')).length + deletedPanelIds.length + deletedObstructionIds.length} changes)` : ''}`}
          </button>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Panel Placement</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Orientation</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPanelOrientation("portrait")}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: panelOrientation === "portrait" ? "#f97316" : "#fff",
                  color: panelOrientation === "portrait" ? "#fff" : "#111827",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Portrait
              </button>
              <button
                onClick={() => setPanelOrientation("landscape")}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: panelOrientation === "landscape" ? "#f97316" : "#fff",
                  color: panelOrientation === "landscape" ? "#fff" : "#111827",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Landscape
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              Rotation (degrees): {panelRotation}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={panelRotation}
              onChange={(e) => setPanelRotation(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Row Spacing (ft)
              </label>
              <input
                type="number"
                step="0.1"
                value={rowSpacing}
                onChange={(e) => setRowSpacing(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Col Spacing (ft)
              </label>
              <input
                type="number"
                step="0.1"
                value={colSpacing}
                onChange={(e) => setColSpacing(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <button
            onClick={autoFillPanels}
            disabled={!selectedRoofId}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: "10px 14px",
              background: selectedRoofId ? "#10b981" : "#e5e7eb",
              color: selectedRoofId ? "#fff" : "#9ca3af",
              border: "none",
              borderRadius: 6,
              cursor: selectedRoofId ? "pointer" : "not-allowed",
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            <Grid size={16} />
            Auto-Fill Panels
          </button>

          <button
            onClick={() => setToolMode(toolMode === "add-panel" ? "none" : "add-panel")}
            disabled={!selectedRoofId || !selectedPanelModelId}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: "10px 14px",
              background: toolMode === "add-panel" ? "#f97316" : (selectedRoofId && selectedPanelModelId ? "#3b82f6" : "#e5e7eb"),
              color: (toolMode === "add-panel" || (selectedRoofId && selectedPanelModelId)) ? "#fff" : "#9ca3af",
              border: "none",
              borderRadius: 6,
              cursor: (selectedRoofId && selectedPanelModelId) ? "pointer" : "not-allowed",
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            <Pencil size={16} />
            {toolMode === "add-panel" ? "Stop Adding" : "Add Manually"}
          </button>

          <button
            onClick={() => setToolMode(toolMode === "delete-panel" ? "none" : "delete-panel")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: "10px 14px",
              background: toolMode === "delete-panel" ? "#f97316" : "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            <Trash2 size={16} />
            {toolMode === "delete-panel" ? "Stop Deleting" : "Delete Panels"}
          </button>

          <button
            onClick={clearAllPanels}
            disabled={!selectedRoofId}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: "10px 14px",
              background: selectedRoofId ? "#991b1b" : "#e5e7eb",
              color: selectedRoofId ? "#fff" : "#9ca3af",
              border: "none",
              borderRadius: 6,
              cursor: selectedRoofId ? "pointer" : "not-allowed",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Trash2 size={16} />
            Clear All Panels
          </button>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Roof Planes</div>
          {roofPlanes.map((roof) => (
            <div
              key={roof.id}
              onClick={() => setSelectedRoofId(roof.id)}
              style={{
                padding: "10px 12px",
                background: selectedRoofId === roof.id ? "#fef3c7" : "#f9fafb",
                border: selectedRoofId === roof.id ? "2px solid #f97316" : "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{roof.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {panels.filter((p) => p.roof_plane_id === roof.id).length} panels
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRoof(roof.id);
                }}
                style={{
                  padding: "4px 8px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {busy && (
          <div style={{ fontSize: 12, color: "#f97316", fontWeight: 600, marginTop: 8 }}>
            {busy}
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        {mapsError ? (
          <div style={{ padding: 20, color: "#ef4444" }}>{mapsError}</div>
        ) : mapsLoading ? (
          <div style={{ padding: 20 }}>Loading map...</div>
        ) : (
          <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
        )}

        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "12px 24px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>System Summary</div>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Panels</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{systemSummary.panelCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>System Size</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{fmt(systemSummary.systemKw, 2)} kW</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Production</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{fmt(systemSummary.annualProductionKwh, 0)} kWh</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Offset</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>{fmt(systemSummary.offsetPercent, 1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEnergyTab = () => (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Energy Usage Analysis</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Energy usage details and charts will be displayed here.</div>
      </div>
    </div>
  );

  const renderPaymentsTab = () => (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Payment Details</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Payment information and history will be displayed here.</div>
      </div>
    </div>
  );

  const renderOnlineProposalTab = () => (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Online Proposal</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Online proposal preview will be displayed here.</div>
      </div>
    </div>
  );

  const renderPDFProposalTab = () => (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>PDF Proposal</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>PDF proposal generation options will be displayed here.</div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "calc(100vh - 64px)", overflow: "auto", background: "#f5f5f7" }}>
      <div style={{ maxWidth: "100%", margin: "0 auto", padding: 20 }}>
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
            { id: "solar-design", label: "Solar Design", icon: Pencil },
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

        <div style={{ background: "#f5f5f7", minHeight: "400px" }}>
          {activeTab === "manage" && renderManageTab()}
          {activeTab === "energy" && renderEnergyTab()}
          {activeTab === "solar-design" && renderSolarDesignTab()}
          {activeTab === "payments" && renderPaymentsTab()}
          {activeTab === "online" && renderOnlineProposalTab()}
          {activeTab === "pdf" && renderPDFProposalTab()}
        </div>
      </div>
    </div>
  );
}
