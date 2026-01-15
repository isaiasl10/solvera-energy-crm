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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Primary Homeowner</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
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
                padding: "7px 10px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
                color: "#111827",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
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
                padding: "7px 10px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
                color: "#111827",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
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
                padding: "7px 10px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
                color: "#111827",
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Second Homeowner (Optional)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Full Name
            </label>
            <input
              type="text"
              value={localData.second_homeowner_name || ''}
              onChange={(e) => handleChange('second_homeowner_name', e.target.value)}
              onBlur={handleBlur}
              placeholder="Enter second homeowner name"
              style={{
                width: "100%",
                padding: "7px 10px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
                color: "#111827",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              value={localData.second_homeowner_email || ''}
              onChange={(e) => handleChange('second_homeowner_email', e.target.value)}
              onBlur={handleBlur}
              placeholder="second@example.com"
              style={{
                width: "100%",
                padding: "7px 10px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
                color: "#111827",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={localData.second_homeowner_phone || ''}
              onChange={(e) => handleChange('second_homeowner_phone', e.target.value)}
              onBlur={handleBlur}
              placeholder="(555) 123-4567"
              style={{
                width: "100%",
                padding: "7px 10px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
                color: "#111827",
              }}
            />
          </div>
        </div>
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
          Data source
        </label>
        <select
          style={{
            width: "100%",
            padding: "7px 10px",
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 4,
            fontSize: 13,
            color: "#111827",
          }}
        >
          <option>Annual Consumption (kWh)</option>
          <option>Monthly Usage</option>
          <option>Utility Bill</option>
        </select>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
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
            padding: "7px 10px",
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 4,
            fontSize: 13,
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

  const [draftCustomer, setDraftCustomer] = useState<any>({
    full_name: "",
    email: "",
    phone: "",
    second_homeowner_name: "",
    second_homeowner_email: "",
    second_homeowner_phone: "",
  });
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
    customer: false,
    electricity: false,
    "system-specs": false,
    "system-details": false,
    pricing: false,
    adders: false,
    financing: false,
  });
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});

  const showSaveSuccess = (section: string) => {
    setSaveSuccess(prev => ({ ...prev, [section]: true }));
    setTimeout(() => {
      setSaveSuccess(prev => ({ ...prev, [section]: false }));
    }, 3000);
  };

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
    // Clear drawing state when tool mode changes
    setDrawingStart(null);
    if (previewShape) {
      previewShape.setMap(null);
      setPreviewShape(null);
    }
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
  const [showRoofPlanes, setShowRoofPlanes] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ lat: number; lng: number } | null>(null);
  const [previewShape, setPreviewShape] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"map" | "roof">("roof");

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
      const expectedSecond = Math.round(Math.max(0, systemSummary.totalContractPrice - 3000) * 100) / 100;
      const expectedFinal = 1000;

      const depositsMatch = Math.abs(currentDeposit - expectedDeposit) < 0.01;
      const secondMatch = Math.abs(currentSecond - expectedSecond) < 0.01;
      const finalMatch = Math.abs(currentFinal - expectedFinal) < 0.01;

      if (!depositsMatch || !secondMatch || !finalMatch) {
        setProposalDraft((p: any) => ({
          ...p,
          cash_deposit: expectedDeposit,
          cash_second_payment: expectedSecond,
          cash_final_payment: expectedFinal,
        }));
      }
    }
  }, [
    systemSummary.totalContractPrice,
    proposalDraft.finance_type,
    proposalDraft.cash_deposit,
    proposalDraft.cash_second_payment,
    proposalDraft.cash_final_payment,
    proposal?.finance_type,
    proposal?.cash_deposit,
    proposal?.cash_second_payment,
    proposal?.cash_final_payment
  ]);

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
      second_homeowner_name: customer.second_homeowner_name ?? "",
      second_homeowner_email: customer.second_homeowner_email ?? "",
      second_homeowner_phone: customer.second_homeowner_phone ?? "",
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
        zoom: viewMode === "roof" ? 22 : 21,
        mapTypeId: "satellite",
        tilt: 0,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
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
          console.log("MAP CLICK: Tool mode is none, deselecting obstruction if any");
          setSelectedObstruction(null);
          return;
        }

        if (currentToolMode === "add-panel") {
          if (currentRoofId && currentPanelModelId) {
            addPanelAt(lat, lng);
          } else {
            console.log("MAP CLICK: Missing roofId or panelModelId for add-panel");
          }
        } else if (currentToolMode === "circle" || currentToolMode === "rect" || currentToolMode === "tree") {
          setDrawingStart((prev) => {
            if (!prev) {
              // First click - set the start point
              return { lat, lng };
            } else {
              // Second click - complete the shape
              const google = (window as any).google;
              const R = 3959 * 5280; // Earth's radius in feet

              if (currentToolMode === "circle") {
                // Calculate distance in feet for circle radius
                const dLat = (lat - prev.lat) * Math.PI / 180;
                const dLng = (lng - prev.lng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(prev.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const radiusFt = R * c;

                const newObstruction = {
                  id: `temp-${Date.now()}-${Math.random()}`,
                  proposal_id: proposalId!,
                  type: "circle" as const,
                  roof_plane_id: currentRoofId,
                  center_lat: prev.lat,
                  center_lng: prev.lng,
                  radius_ft: Math.max(1, radiusFt),
                  width_ft: null,
                  height_ft: null,
                  rotation_deg: null,
                };
                setObstructions((obsPrev) => [...obsPrev, newObstruction]);
                setSelectedObstruction(newObstruction);
              } else {
                // For rect and tree, calculate proper dimensions
                const latDiff = Math.abs(lat - prev.lat);
                const lngDiff = Math.abs(lng - prev.lng);
                const centerLat = (prev.lat + lat) / 2;
                const centerLng = (prev.lng + lng) / 2;

                const heightMeters = latDiff * 111320;
                const widthMeters = lngDiff * 111320 * Math.cos((centerLat * Math.PI) / 180);

                const heightFt = heightMeters / 0.3048;
                const widthFt = widthMeters / 0.3048;

                const newObstruction = {
                  id: `temp-${Date.now()}-${Math.random()}`,
                  proposal_id: proposalId!,
                  type: currentToolMode as "rect" | "tree",
                  roof_plane_id: currentRoofId,
                  center_lat: centerLat,
                  center_lng: centerLng,
                  radius_ft: null,
                  width_ft: Math.max(1, widthFt),
                  height_ft: Math.max(1, heightFt),
                  rotation_deg: 0,
                };
                setObstructions((obsPrev) => [...obsPrev, newObstruction]);
                setSelectedObstruction(newObstruction);
              }

              // Clear preview shape
              setPreviewShape((prevShape: any) => {
                if (prevShape) {
                  prevShape.setMap(null);
                }
                return null;
              });

              // Reset tool mode to prevent additional placements
              setToolMode("none");

              // Reset drawing
              return null;
            }
          });
        }
      });

      // Add mousemove listener for preview
      google.maps.event.addListener(map, "mousemove", (e: any) => {
        if (!e?.latLng) return;

        setDrawingStart((prevStart) => {
          if (!prevStart) return prevStart;

          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const currentToolMode = toolModeRef.current;

          // Clear previous preview
          setPreviewShape((prevShape: any) => {
            if (prevShape) {
              prevShape.setMap(null);
            }

            const google = (window as any).google;
            const R = 3959 * 5280; // Earth's radius in feet

            if (currentToolMode === "circle") {
              // Calculate distance in feet for circle radius
              const dLat = (lat - prevStart.lat) * Math.PI / 180;
              const dLng = (lng - prevStart.lng) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(prevStart.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const radiusFt = R * c;

              const radiusMeters = radiusFt * 0.3048;

              const circle = new google.maps.Circle({
                center: { lat: prevStart.lat, lng: prevStart.lng },
                radius: radiusMeters,
                strokeColor: currentToolMode === "tree" ? "#228B22" : "#666666",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: currentToolMode === "tree" ? "#228B22" : "#999999",
                fillOpacity: 0.35,
                clickable: false,
              });

              circle.setMap(mapRef.current);
              return circle;
            } else if (currentToolMode === "rect" || currentToolMode === "tree") {
              // Calculate proper dimensions
              const latDiff = Math.abs(lat - prevStart.lat);
              const lngDiff = Math.abs(lng - prevStart.lng);
              const centerLat = (prevStart.lat + lat) / 2;
              const centerLng = (prevStart.lng + lng) / 2;

              const heightMeters = latDiff * 111320;
              const widthMeters = lngDiff * 111320 * Math.cos((centerLat * Math.PI) / 180);

              const latOffset = heightMeters / 111320;
              const lngOffset = widthMeters / (111320 * Math.cos(centerLat * Math.PI / 180));

              const bounds = {
                north: centerLat + latOffset / 2,
                south: centerLat - latOffset / 2,
                east: centerLng + lngOffset / 2,
                west: centerLng - lngOffset / 2,
              };

              const rect = new google.maps.Rectangle({
                bounds,
                strokeColor: currentToolMode === "tree" ? "#228B22" : "#666666",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: currentToolMode === "tree" ? "#228B22" : "#999999",
                fillOpacity: 0.35,
                clickable: false,
              });

              rect.setMap(mapRef.current);
              return rect;
            }

            return null;
          });

          return prevStart;
        });
      });
    }
  }, [activeTab, mapsLoading, proposal?.lat, proposal?.lng, proposalId, obstructionWidth, obstructionHeight, viewMode]);

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

    const google = (window as any).google;

    obstructionShapesRef.current.forEach((shape) => {
      google.maps.event.clearInstanceListeners(shape);
      shape.setMap(null);
    });
    obstructionShapesRef.current.clear();

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
          editable: isSelected,
          draggable: isSelected,
          clickable: true,
        });

        if (isSelected) {
          google.maps.event.addListener(shape, "radius_changed", () => {
            const newRadius = shape.getRadius() / 0.3048;
            const updatedObs = { ...obs, radius_ft: newRadius };
            setObstructions((prev) =>
              prev.map((o) =>
                o.id === obs.id ? updatedObs : o
              )
            );
            setSelectedObstruction(updatedObs);
          });

          google.maps.event.addListener(shape, "center_changed", () => {
            const newCenter = shape.getCenter();
            const updatedObs = {
              ...obs,
              center_lat: newCenter.lat(),
              center_lng: newCenter.lng()
            };
            setObstructions((prev) =>
              prev.map((o) =>
                o.id === obs.id ? updatedObs : o
              )
            );
            setSelectedObstruction(updatedObs);
          });
        }
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
          editable: isSelected,
          draggable: isSelected,
          clickable: true,
        });

        if (isSelected) {
          google.maps.event.addListener(shape, "bounds_changed", () => {
            const newBounds = shape.getBounds();
            const ne = newBounds.getNorthEast();
            const sw = newBounds.getSouthWest();

            const newCenterLat = (ne.lat() + sw.lat()) / 2;
            const newCenterLng = (ne.lng() + sw.lng()) / 2;

            const latDiff = ne.lat() - sw.lat();
            const lngDiff = ne.lng() - sw.lng();

            const newHeightMeters = latDiff * 111320;
            const newWidthMeters = lngDiff * 111320 * Math.cos((newCenterLat * Math.PI) / 180);

            const newHeightFt = newHeightMeters / 0.3048;
            const newWidthFt = newWidthMeters / 0.3048;

            const updatedObs = {
              ...obs,
              center_lat: newCenterLat,
              center_lng: newCenterLng,
              width_ft: Math.abs(newWidthFt),
              height_ft: Math.abs(newHeightFt),
            };

            setObstructions((prev) =>
              prev.map((o) =>
                o.id === obs.id ? updatedObs : o
              )
            );
            setSelectedObstruction(updatedObs);
          });
        }
      }

      if (shape) {
        shape.setMap(mapRef.current);
        obstructionShapesRef.current.set(obs.id, shape);

        google.maps.event.addListener(shape, "click", (e: any) => {
          e.stop();
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
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #e5e7eb", marginBottom: 8, overflow: "hidden" }}>
        <button
          onClick={() => toggleSection(id)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: isExpanded ? "#f9fafb" : "#fff",
            border: "none",
            cursor: "pointer",
            borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon size={16} style={{ color: "#6b7280" }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{title}</span>
          </div>
          {isExpanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
        </button>
        {isExpanded && <div style={{ padding: "16px" }}>{children}</div>}
      </div>
    );
  };

  const renderManageTab = () => {
    const panelModel = panelModels.find((m) => m.id === selectedPanelModelId);

    return (
      <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ position: "fixed", bottom: 10, left: 10, zIndex: 9999, background: "#fff", padding: 8, border: "1px solid #000", borderRadius: 4, fontSize: 11 }}>
          dirty: {String(isDirtyRef.current)} | init: {String(didInitDraftRef.current)}
        </div>

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
                  second_homeowner_name: draftCustomer.second_homeowner_name?.trim() || null,
                  second_homeowner_email: draftCustomer.second_homeowner_email?.trim() || null,
                  second_homeowner_phone: draftCustomer.second_homeowner_phone?.trim() || null,
                }))
                .eq("id", customer.id);

              if (error) {
                console.error("Failed to save customer:", error);
              } else {
                setCustomer((c: any) => ({ ...c, ...draftCustomer }));
                isDirtyRef.current = false;
                showSaveSuccess("customer");
              }
            }}
            style={{
              marginTop: 16,
              background: "#f97316",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Save Customer Information
          </button>
          {saveSuccess.customer && (
            <span style={{ marginLeft: 12, color: "#059669", fontSize: 12, fontWeight: 600 }}>
              ✓ Saved successfully
            </span>
          )}
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

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Monthly Meter Fee (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={proposalDraft.meter_fee ?? ""}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : null;
                setProposalDraft((p: any) => ({ ...p, meter_fee: value }));
              }}
              placeholder="0.00"
              style={{
                width: "200px",
                padding: "7px 10px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
                color: "#111827",
              }}
            />
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
              Monthly utility connection fee (typically $10-20)
            </div>
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
                  meter_fee: proposalDraft.meter_fee ?? null,
                }))
                .eq("id", proposalId);

              if (error) {
                console.error("Failed to save electricity information:", error);
              } else {
                setProposal((p: any) => ({ ...p, ...proposalDraft }));
                isDirtyRef.current = false;
                showSaveSuccess("electricity");
              }
            }}
            style={{
              marginTop: 16,
              background: "#f97316",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Save Electricity Information
          </button>
          {saveSuccess.electricity && (
            <span style={{ marginLeft: 12, color: "#059669", fontSize: 12, fontWeight: 600 }}>
              ✓ Saved successfully
            </span>
          )}
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
                  console.error("Failed to save system details:", error);
                } else {
                  setProposal((p: any) => ({ ...p, ...proposalDraft }));
                  isDirtyRef.current = false;
                  showSaveSuccess("system-details");
                }
              }}
              style={{
                marginTop: 16,
                background: "#f97316",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Save System Details
            </button>
            {saveSuccess["system-details"] && (
              <span style={{ marginLeft: 12, color: "#059669", fontSize: 12, fontWeight: 600 }}>
                ✓ Saved successfully
              </span>
            )}
          </form>
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
              console.error("Failed to save pricing:", error);
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
              showSaveSuccess("pricing");
            }
          }}
          style={{
            marginTop: 16,
            background: "#f97316",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          Save Pricing & Payment Schedule
        </button>
        {saveSuccess.pricing && (
          <span style={{ marginLeft: 12, color: "#059669", fontSize: 12, fontWeight: 600 }}>
            ✓ Saved successfully
          </span>
        )}
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

              showSaveSuccess("adders");
            } catch (error: any) {
              console.error("Failed to save adders:", error);
            }
          }}
          style={{
            marginTop: 16,
            background: "#f97316",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          Save Adders
        </button>
        {saveSuccess.adders && (
          <span style={{ marginLeft: 12, color: "#059669", fontSize: 12, fontWeight: 600 }}>
            ✓ Saved successfully
          </span>
        )}
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

            const { error } = await supabase
              .from("proposals")
              .update(updates)
              .eq("id", proposalId);

            if (error) {
              console.error("Failed to save financing:", error);
            } else {
              showSaveSuccess("financing");
            }
          }}
          style={{
            marginTop: 16,
            background: "#f97316",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          Save Financing & Payment Schedule
        </button>
        {saveSuccess.financing && (
          <span style={{ marginLeft: 12, color: "#059669", fontSize: 12, fontWeight: 600 }}>
            ✓ Saved successfully
          </span>
        )}
      </CollapsibleSection>
      </div>
    );
  };

  const renderSolarDesignTab = () => {
    return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        borderBottom: "2px solid #0ea5e9",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>View</span>
          <button
            onClick={() => {
              const newMode = viewMode === "map" ? "roof" : "map";
              setViewMode(newMode);
              if (mapRef.current) {
                mapRef.current.setZoom(newMode === "roof" ? 22 : 19);
              }
            }}
            title={viewMode === "map" ? "Switch to Roof View (zoomed)" : "Switch to Full Map View"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: viewMode === "roof" ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" : "rgba(255,255,255,0.1)",
              color: "#ffffff",
              border: "1px solid " + (viewMode === "roof" ? "#0ea5e9" : "rgba(255,255,255,0.2)"),
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              boxShadow: viewMode === "roof" ? "0 2px 8px rgba(14, 165, 233, 0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            <Grid size={15} />
            <span>{viewMode === "map" ? "Roof View" : "Map View"}</span>
          </button>
        </div>

        <div style={{ height: 32, width: 1, background: "rgba(255,255,255,0.2)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Drawing Tools</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setToolMode(toolMode === "roof" ? "none" : "roof")}
              title="Draw Roof Plane - Click to place corners, double-click to complete"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: toolMode === "roof" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "rgba(255,255,255,0.1)",
                color: "#ffffff",
                border: "1px solid " + (toolMode === "roof" ? "#10b981" : "rgba(255,255,255,0.2)"),
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: toolMode === "roof" ? 600 : 500,
                fontSize: 13,
                boxShadow: toolMode === "roof" ? "0 2px 8px rgba(16, 185, 129, 0.4)" : "none",
                transition: "all 0.2s",
              }}
            >
              <Square size={15} />
              <span>Roof Plane</span>
            </button>

            <button
              onClick={() => setShowRoofPlanes(!showRoofPlanes)}
              title="Toggle Roof Plane Visibility"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: showRoofPlanes ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "#ffffff",
                border: "1px solid " + (showRoofPlanes ? "#10b981" : "rgba(255,255,255,0.2)"),
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 13,
                transition: "all 0.2s",
              }}
            >
              <span>{roofPlanes.length}</span>
            </button>
          </div>
        </div>

        <div style={{ height: 32, width: 1, background: "rgba(255,255,255,0.2)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Obstructions</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setToolMode(toolMode === "circle" ? "none" : "circle")}
              title="Add Circular Obstruction - Click start, drag, and click to set size"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: toolMode === "circle" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "rgba(255,255,255,0.1)",
                color: "#ffffff",
                border: "1px solid " + (toolMode === "circle" ? "#ef4444" : "rgba(255,255,255,0.2)"),
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: toolMode === "circle" ? 600 : 500,
                fontSize: 13,
                boxShadow: toolMode === "circle" ? "0 2px 8px rgba(239, 68, 68, 0.4)" : "none",
                transition: "all 0.2s",
              }}
            >
              <Circle size={15} />
              <span>Circle</span>
            </button>

            <button
              onClick={() => setToolMode(toolMode === "rect" ? "none" : "rect")}
              title="Add Rectangular Obstruction - Click start, drag, and click to set size"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: toolMode === "rect" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "rgba(255,255,255,0.1)",
                color: "#ffffff",
                border: "1px solid " + (toolMode === "rect" ? "#ef4444" : "rgba(255,255,255,0.2)"),
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: toolMode === "rect" ? 600 : 500,
                fontSize: 13,
                boxShadow: toolMode === "rect" ? "0 2px 8px rgba(239, 68, 68, 0.4)" : "none",
                transition: "all 0.2s",
              }}
            >
              <Square size={15} />
              <span>Rectangle</span>
            </button>

            <button
              onClick={() => setToolMode(toolMode === "tree" ? "none" : "tree")}
              title="Add Tree Obstruction - Click start, drag, and click to set size"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: toolMode === "tree" ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" : "rgba(255,255,255,0.1)",
                color: "#ffffff",
                border: "1px solid " + (toolMode === "tree" ? "#22c55e" : "rgba(255,255,255,0.2)"),
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: toolMode === "tree" ? 600 : 500,
                fontSize: 13,
                boxShadow: toolMode === "tree" ? "0 2px 8px rgba(34, 197, 94, 0.4)" : "none",
                transition: "all 0.2s",
              }}
            >
              <TreeDeciduous size={15} />
              <span>Tree</span>
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Panel Configuration</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1" }}>Model</label>
              <select
                value={selectedPanelModelId ?? ""}
                onChange={(e) => setSelectedPanelModelId(e.target.value)}
                style={{
                  padding: "7px 10px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#ffffff",
                  minWidth: 200,
                  cursor: "pointer",
                }}
              >
                {panelModels.map((model) => (
                  <option key={model.id} value={model.id} style={{ background: "#1e293b", color: "#ffffff" }}>
                    {model.brand} {model.model} ({model.watts}W)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1" }}>Orientation</label>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setPanelOrientation("portrait")}
                  style={{
                    padding: "7px 12px",
                    background: panelOrientation === "portrait" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(255,255,255,0.1)",
                    color: "#ffffff",
                    border: "1px solid " + (panelOrientation === "portrait" ? "#f59e0b" : "rgba(255,255,255,0.2)"),
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: panelOrientation === "portrait" ? 600 : 500,
                    boxShadow: panelOrientation === "portrait" ? "0 2px 8px rgba(245, 158, 11, 0.3)" : "none",
                  }}
                >
                  Portrait
                </button>
                <button
                  onClick={() => setPanelOrientation("landscape")}
                  style={{
                    padding: "7px 12px",
                    background: panelOrientation === "landscape" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(255,255,255,0.1)",
                    color: "#ffffff",
                    border: "1px solid " + (panelOrientation === "landscape" ? "#f59e0b" : "rgba(255,255,255,0.2)"),
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: panelOrientation === "landscape" ? 600 : 500,
                    boxShadow: panelOrientation === "landscape" ? "0 2px 8px rgba(245, 158, 11, 0.3)" : "none",
                  }}
                >
                  Landscape
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1" }}>Rotation: {panelRotation}°</label>
              <input
                type="range"
                min="0"
                max="360"
                value={panelRotation}
                onChange={(e) => setPanelRotation(Number(e.target.value))}
                style={{
                  width: 120,
                  accentColor: "#f59e0b",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1" }}>Row Spacing</label>
                <input
                  type="number"
                  step="0.1"
                  value={rowSpacing}
                  onChange={(e) => setRowSpacing(Number(e.target.value))}
                  style={{
                    width: 70,
                    padding: "7px 8px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#ffffff",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1" }}>Col Spacing</label>
                <input
                  type="number"
                  step="0.1"
                  value={colSpacing}
                  onChange={(e) => setColSpacing(Number(e.target.value))}
                  style={{
                    width: 70,
                    padding: "7px 8px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#ffffff",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative", background: "#f9fafb" }}>
          {toolMode !== "none" && (
            <div style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              border: "2px solid #0ea5e9",
            }}>
              {toolMode === "roof" && "Click to place corners. Double-click to finish polygon."}
              {toolMode === "circle" && "Click start point, drag, then click to set circle size."}
              {toolMode === "rect" && "Click start corner, drag, then click to set rectangle size."}
              {toolMode === "tree" && "Click start corner, drag, then click to set tree coverage area."}
            </div>
          )}
          <div ref={mapDivRef} style={{ width: "100%", height: "100%" }}>
            {mapsLoading && (
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f9fafb",
                fontSize: 14,
                color: "#6b7280",
              }}>
                Loading map...
              </div>
            )}
            {mapsError && (
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fee2e2",
                fontSize: 14,
                color: "#991b1b",
                padding: 20,
                textAlign: "center",
              }}>
                {mapsError}
              </div>
            )}
          </div>
        </div>

        <div style={{
          width: 350,
          background: "#ffffff",
          borderLeft: "2px solid #e5e7eb",
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          <div style={{
            padding: "16px",
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
            border: "2px solid #0ea5e9",
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0c4a6e", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              System Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Panels:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{systemSummary.panelCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#475569" }}>System Size:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{fmt(systemSummary.systemKw, 2)} kW</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Est. Production:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{fmt(systemSummary.annualProductionKwh)} kWh/yr</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Offset:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{fmt(systemSummary.offsetPercent, 1)}%</span>
              </div>
              <div style={{ height: 1, background: "#cbd5e1", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Base Price:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>${fmt(systemSummary.baseSystemPrice, 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Adders:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>${fmt(systemSummary.totalAdderCost, 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "2px solid #0ea5e9" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0c4a6e" }}>Total Price:</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0c4a6e" }}>${fmt(systemSummary.totalPrice, 0)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={saveDesignChanges}
            disabled={!!busy}
            style={{
              padding: "14px 20px",
              background: busy ? "#9ca3af" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              boxShadow: busy ? "none" : "0 4px 12px rgba(16, 185, 129, 0.4)",
              transition: "all 0.2s",
            }}
          >
            {busy ? busy : `Save Design${(panels.filter(p => p.id.startsWith('temp-')).length + obstructions.filter(o => o.id.startsWith('temp-')).length + deletedPanelIds.length + deletedObstructionIds.length) > 0 ? ` (${panels.filter(p => p.id.startsWith('temp-')).length + obstructions.filter(o => o.id.startsWith('temp-')).length + deletedPanelIds.length + deletedObstructionIds.length})` : ''}`}
          </button>

          {showRoofPlanes && roofPlanes.length > 0 && (
            <div style={{
              padding: "16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 12 }}>
                Roof Planes ({roofPlanes.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roofPlanes.map((plane, idx) => (
                  <div
                    key={plane.id}
                    onClick={() => setSelectedRoofId(plane.id)}
                    style={{
                      padding: "10px 12px",
                      background: selectedRoofId === plane.id ? "#dbeafe" : "#ffffff",
                      border: "1px solid " + (selectedRoofId === plane.id ? "#3b82f6" : "#e2e8f0"),
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: selectedRoofId === plane.id ? "#1e40af" : "#475569" }}>
                      Plane {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedObstruction && (
        <div style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          padding: "20px",
          borderRadius: 10,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 2px #0ea5e9",
          zIndex: 1000,
          minWidth: 300,
          border: "2px solid #0ea5e9",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "2px solid rgba(255,255,255,0.1)",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.5px" }}>Selected</span>
            <button
              onClick={() => setSelectedObstruction(null)}
              style={{
                padding: "6px 12px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                color: "#ffffff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Deselect
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#cbd5e1" }}>Type:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", textTransform: "capitalize" }}>{selectedObstruction.type}</span>
            </div>
            {selectedObstruction.type === "circle" ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#cbd5e1" }}>Radius:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>
                  {(selectedObstruction.radius_ft ?? 5).toFixed(1)} ft
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#cbd5e1" }}>Width:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>
                    {(selectedObstruction.width_ft ?? 5).toFixed(1)} ft
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#cbd5e1" }}>Height:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>
                    {(selectedObstruction.height_ft ?? 5).toFixed(1)} ft
                  </span>
                </div>
              </>
            )}
            <button
              onClick={() => {
                deleteObstructionById(selectedObstruction.id);
                setSelectedObstruction(null);
              }}
              style={{
                marginTop: 10,
                padding: "10px 16px",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
              }}
            >
              Delete {selectedObstruction.type === "tree" ? "Tree" : "Obstruction"}
            </button>
          </div>
        </div>
      )}
    </div>
    );
  };

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
