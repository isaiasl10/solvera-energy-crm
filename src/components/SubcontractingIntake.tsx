// SubcontractingIntake.tsx

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { loadGoogleMaps } from "../lib/loadGoogleMaps";
import { Plus, Search, X } from "lucide-react";
import SubcontractJobDetail from "./SubcontractJobDetail";

type JobType = "new_install" | "detach_reset" | "service";

interface Contractor {
  id: string;
  company_name: string;
  ppw: number | null;
  adders: any[];
  address: string | null;
  phone_number: string | null;
  email: string | null;
  default_detach_reset_price_per_panel: number | null;
}

interface SubcontractJob {
  id: string;
  contractor_id: string;
  job_type: JobType;
  contractor_name: string;
  subcontract_customer_name: string;
  installation_address: string;
  system_size_kw: number | null;
  ppw: number | null;
  gross_revenue: number | null;
  net_revenue: number | null;
  subcontract_status: string | null;
  detach_reset_status: string | null;
  invoice_number: string | null;
  panel_qty: number | null;
  gross_amount: number | null;
  created_at: string;
}

export default function SubcontractingIntake() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contractor_id: "",
    customer_name: "",
    address: "",
    job_type: "new_install" as JobType,
  });
  const [selectedAdders, setSelectedAdders] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    loadSubcontractJobs();
    loadContractors();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`subcontract_jobs_live`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subcontract_jobs" }, loadSubcontractJobs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadContractors = async () => {
    const { data } = await supabase
      .from("contractors")
      .select("id, company_name, ppw, adders, default_detach_reset_price_per_panel")
      .order("company_name");

    setContractors(data || []);
  };

  const loadSubcontractJobs = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("subcontract_jobs")
      .select(`*, contractor:contractors(company_name, ppw)`)
      .order("created_at", { ascending: false });

    const mapped =
      data?.map((j: any) => ({
        id: j.id,
        contractor_id: j.contractor_id,
        job_type: j.job_type,
        contractor_name: j.contractor?.company_name || "",
        subcontract_customer_name: j.customer_name,
        installation_address: j.address,
        system_size_kw: j.system_size_kw,
        ppw: j.contractor?.ppw,
        gross_amount: j.gross_amount,
        gross_revenue: j.gross_amount,
        net_revenue: j.net_revenue,
        subcontract_status: j.workflow_status,
        detach_reset_status: j.workflow_status,
        invoice_number: j.invoice_number,
        panel_qty: j.panel_qty,
        created_at: j.created_at,
      })) || [];

    setJobs(mapped);
    setLoading(false);
  };

  const filteredJobs = jobs.filter(j =>
    [j.contractor_name, j.subcontract_customer_name, j.installation_address, j.invoice_number]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* UI untouched */}

      {/* JOB DETAIL WITH SCROLL FIX ONLY */}
      {selectedJobId && (
        <div style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
          <SubcontractJobDetail
            jobId={selectedJobId}
            onClose={() => setSelectedJobId(null)}
            onUpdate={loadSubcontractJobs}
          />
        </div>
      )}
    </div>
  );
}
