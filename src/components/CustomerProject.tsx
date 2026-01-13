import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, X, Loader2, Trash2 } from 'lucide-react';
import { supabase, type Customer, type CustomAdder, calculateAdderCost, fetchActiveAdders } from '../lib/supabase';
import DocumentsSection from './DocumentsSection';
import SchedulingSection from './SchedulingSection';
import FinancingSection from './FinancingSection';
import ProjectTimeline from './ProjectTimeline';
import ProjectChat from './ProjectChat';
import ActivityLog from './ActivityLog';
import SalesRepProjectView from './SalesRepProjectView';
import { useAuth } from '../contexts/AuthContext';
import { logCustomerUpdate } from '../lib/activityLogger';

type CustomerProjectProps = {
  customer: Customer;
  onBack: () => void;
  initialTab?: Tab;
};

type Tab = 'system' | 'pricing' | 'adders' | 'epc-costs' | 'documents' | 'scheduling' | 'timeline' | 'chat' | 'activity';
type EditingSection = 'customer' | 'sales_rep' | 'system' | 'utility' | 'hoa' | 'epc_pricing' | 'adders' | 'bom_cost' | 'permit_engineering_cost' | null;
type DeductionTab = 'bom' | 'permit_engineering' | 'labor';

type AdderKey = 'adder_steep_roof' | 'adder_metal_roof' | 'adder_tile_roof' | 'adder_small_system' | 'adder_fsu' | 'adder_mpu' | 'adder_critter_guard';

type SalesCommission = {
  id: string;
  customer_id: string;
  sales_rep_id: string;
  sales_manager_id: string | null;
  total_commission: number;
  sales_manager_override_amount: number | null;
  m1_payment_amount: number;
  m1_payment_status: 'pending' | 'eligible' | 'paid';
  m1_eligibility_date: string | null;
  m1_paid_date: string | null;
  m1_payroll_period_end: string | null;
  m2_payment_amount: number;
  m2_payment_status: 'pending' | 'eligible' | 'paid';
  m2_paid_date: string | null;
  m2_payroll_period_end: string | null;
  manager_override_payment_status: 'pending' | 'eligible' | 'paid';
  manager_override_eligibility_date: string | null;
  manager_override_paid_date: string | null;
  manager_override_payroll_period_end: string | null;
  site_survey_complete_date: string | null;
  install_complete_date: string | null;
  signature_date: string;
};

type ProjectTimelineData = {
  installation_status: string;
  inspection_status: string;
  permit_status: string;
  utility_status: string;
  engineering_status: string;
  site_survey_status: string;
  material_order_status: string;
  pto_submitted_date: string | null;
  pto_approved_date: string | null;
  system_activated_date: string | null;
};

const getDerivedProjectStatus = (timeline: ProjectTimelineData): string => {
  if (timeline.system_activated_date) return 'System Active';
  if (timeline.pto_approved_date) return 'System Activation';
  if (timeline.pto_submitted_date) return 'Awaiting PTO';
  if (timeline.inspection_status === 'passed') return 'Inspection Passed - Pending PTO';
  if (timeline.inspection_status === 'service_completed') return 'Ready for Re-Inspection';
  if (timeline.inspection_status === 'service_required' || timeline.inspection_status === 'failed') return 'Service Required';
  if (timeline.inspection_status === 'scheduled') return 'Inspection Scheduled';
  if (timeline.inspection_status === 'ready') return 'Installation Completed - Ready for Inspection';
  if (timeline.installation_status === 'completed') return 'Installation Completed - Ready for Inspection';
  if (timeline.installation_status === 'scheduled') return 'Installation Scheduled';
  if (timeline.material_order_status === 'ordered') return 'Material Ordered';
  if (timeline.installation_status === 'pending_material') return 'Pending Material';
  if (timeline.permit_status === 'approved') return 'Permits Approved';
  if (timeline.permit_status === 'revision_submitted') return 'Permit Revision Submitted';
  if (timeline.permit_status === 'revision_required') return 'Permit Revision Required';
  if (timeline.permit_status === 'submitted') return 'Permit Review';
  if (timeline.utility_status === 'approved') return 'Utility Approved';
  if (timeline.utility_status === 'revision_submitted') return 'Utility Revision Submitted';
  if (timeline.utility_status === 'revision_required') return 'Utility Revision Required';
  if (timeline.utility_status === 'submitted') return 'Utility Review';
  if (timeline.engineering_status === 'completed') return 'Engineering Complete';
  if (timeline.engineering_status === 'pending') return 'Pending Engineering';
  if (timeline.installation_status === 'pending_customer') return 'Coordinating Installation';
  if (timeline.site_survey_status === 'completed') return 'Survey Complete';
  if (timeline.site_survey_status === 'scheduled') return 'Survey Scheduled';
  return 'New Lead';
};

export default function CustomerProject({ customer: initialCustomer, onBack, initialTab }: CustomerProjectProps) {
  const { canEdit, isEmployee, isSalesRep, user } = useAuth();

  if (isSalesRep) {
    return <SalesRepProjectView customer={initialCustomer} onBack={onBack} />;
  }

  const mapCustomerToFormData = (cust: Customer) => ({
    ...cust,
    address: cust.installation_address,
  });

  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'system');
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [customer, setCustomer] = useState(initialCustomer);
  const [formData, setFormData] = useState(mapCustomerToFormData(initialCustomer));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deductionTab, setDeductionTab] = useState<DeductionTab>('bom');
  const [adders, setAdders] = useState<CustomAdder[]>([]);
  const [addersLoading, setAddersLoading] = useState(true);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [salesRepName, setSalesRepName] = useState<string>('Not assigned');
  const [salesRepPpwRedline, setSalesRepPpwRedline] = useState<number | null>(null);
  const [commission, setCommission] = useState<SalesCommission | null>(null);
  const [commissionLoading, setCommissionLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadAdders = async () => {
      setAddersLoading(true);
      const fetchedAdders = await fetchActiveAdders();
      setAdders(fetchedAdders);
      setAddersLoading(false);
    };
    loadAdders();
  }, []);

  useEffect(() => {
    const fetchSalesReps = async () => {
      let query = supabase
        .from('app_users')
        .select('id, full_name, email')
        .eq('role', 'sales_rep')
        .eq('status', 'active');

      if (user?.role === 'sales_manager') {
        query = query.eq('reporting_manager_id', user.id);
      }

      const { data } = await query.order('full_name', { ascending: true });

      if (data) {
        setSalesReps(data);
      }
    };
    fetchSalesReps();
  }, [user]);

  useEffect(() => {
    const fetchSalesRepData = async () => {
      if (customer.sales_rep_id) {
        const { data } = await supabase
          .from('app_users')
          .select('full_name, ppw_redline')
          .eq('id', customer.sales_rep_id)
          .maybeSingle();

        if (data) {
          setSalesRepName(data.full_name);
          setSalesRepPpwRedline(data.ppw_redline);
        }
      } else {
        setSalesRepName('Not assigned');
        setSalesRepPpwRedline(null);
      }
    };
    fetchSalesRepData();
  }, [customer.sales_rep_id]);

  useEffect(() => {
    const loadProjectStatus = async () => {
      try {
        const { data: timeline } = await supabase
          .from('project_timeline')
          .select('*')
          .eq('customer_id', customer.id)
          .maybeSingle();

        if (timeline) {
          const status = getDerivedProjectStatus(timeline);
          setProjectStatus(status);
        } else {
          setProjectStatus(customer.status);
        }
      } catch (error) {
        console.error('Error loading project status:', error);
        setProjectStatus(customer.status);
      }
    };

    loadProjectStatus();

    const channelName = `project_timeline_${customer.id}_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_timeline',
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          loadProjectStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [customer.id, customer.status]);

  useEffect(() => {
    const loadCommission = async () => {
      setCommissionLoading(true);
      try {
        const { data: existingCommission, error } = await supabase
          .from('sales_commissions')
          .select('*')
          .eq('customer_id', customer.id)
          .maybeSingle();

        if (error) throw error;

        if (existingCommission) {
          const parsedCommission: SalesCommission = {
            ...existingCommission,
            total_commission: parseFloat(existingCommission.total_commission) || 0,
            sales_manager_override_amount: existingCommission.sales_manager_override_amount
              ? parseFloat(existingCommission.sales_manager_override_amount)
              : null,
            m1_payment_amount: parseFloat(existingCommission.m1_payment_amount) || 0,
            m2_payment_amount: parseFloat(existingCommission.m2_payment_amount) || 0,
            manager_override_payment_status: existingCommission.manager_override_payment_status || 'pending',
            manager_override_eligibility_date: existingCommission.manager_override_eligibility_date || null,
            manager_override_paid_date: existingCommission.manager_override_paid_date || null,
            manager_override_payroll_period_end: existingCommission.manager_override_payroll_period_end || null,
          };
          setCommission(parsedCommission);
        }
      } catch (error) {
        console.error('Error loading commission:', error);
      } finally {
        setCommissionLoading(false);
      }
    };

    loadCommission();

    const channelName = `sales_commissions_${customer.id}_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_commissions',
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          loadCommission();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [customer.id]);

  useEffect(() => {
    const reloadCustomerData = async () => {
      try {
        const { data: freshData, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customer.id)
          .maybeSingle();

        if (error) throw error;

        if (freshData) {
          setCustomer(freshData);
          if (editingSection === null) {
            setFormData(mapCustomerToFormData(freshData));
          }
        }
      } catch (error) {
        console.error('Error reloading customer data:', error);
      }
    };

    const channelName = `customer_updates_${customer.id}_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${customer.id}`,
        },
        () => {
          reloadCustomerData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [customer.id, editingSection]);

  const allTabs = [
    { id: 'system' as Tab, label: 'System Details' },
    { id: 'pricing' as Tab, label: 'Pricing & Financing' },
    { id: 'adders' as Tab, label: 'Adders' },
    { id: 'epc-costs' as Tab, label: 'EPC Costs' },
    { id: 'documents' as Tab, label: 'Documents' },
    { id: 'scheduling' as Tab, label: 'Scheduling' },
    { id: 'timeline' as Tab, label: 'Timeline' },
    { id: 'chat' as Tab, label: 'Chat' },
    { id: 'activity' as Tab, label: 'Activity Log' },
  ];

  const tabs = isEmployee
    ? allTabs.filter(tab => tab.id === 'system' || tab.id === 'timeline' || tab.id === 'chat' || tab.id === 'activity')
    : allTabs;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`Field changed - ${name}:`, value);
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      console.log('Updated formData:', updated);
      return updated;
    });
    setError(null);
  };

  const handleAdderToggle = (adderKey: AdderKey) => {
    setFormData(prev => ({
      ...prev,
      [adderKey]: !prev[adderKey],
    }));
    setError(null);
  };

  const getAdderFieldKey = (adderName: string): AdderKey | null => {
    const nameMap: Record<string, AdderKey> = {
      'Steep Roof': 'adder_steep_roof',
      'Metal Roof': 'adder_metal_roof',
      'Tile Roof': 'adder_tile_roof',
      'Small System Adder': 'adder_small_system',
      'FSU': 'adder_fsu',
      'MPU': 'adder_mpu',
      'Critter Guard': 'adder_critter_guard',
    };
    return nameMap[adderName] || null;
  };

  const calculateTotalAdders = (customerData: Customer) => {
    let total = 0;
    const systemSize = customerData.system_size_kw;
    const panelQty = customerData.panel_quantity;

    adders.forEach((adder) => {
      const fieldKey = getAdderFieldKey(adder.name);
      if (fieldKey && customerData[fieldKey]) {
        total += calculateAdderCost(adder, systemSize, panelQty);
      }
    });

    return total;
  };

  const handleEdit = (section: EditingSection) => {
    setFormData(mapCustomerToFormData(customer));
    setEditingSection(section);
    setError(null);
  };

  const handleCancel = () => {
    setFormData(mapCustomerToFormData(customer));
    setEditingSection(null);
    setError(null);
  };

  const handleSaveSection = async (section: EditingSection) => {
    setLoading(true);
    setError(null);

    console.log('=== SAVE STARTED ===');
    console.log('Section:', section);
    console.log('Customer ID:', customer.id);
    console.log('FormData before save:', JSON.stringify(formData, null, 2));

    try {
      let updateData: Partial<Customer> = {};

      switch (section) {
        case 'customer':
          updateData = {
            full_name: formData.full_name,
            email: formData.email,
            phone_number: formData.phone_number,
            installation_address: formData.address,
            signature_date: formData.signature_date || null,
          };
          break;
        case 'sales_rep':
          updateData = {
            sales_rep_id: formData.sales_rep_id || null,
          };
          break;
        case 'system':
          updateData = {
            system_size_kw: typeof formData.system_size_kw === 'string'
              ? parseFloat(formData.system_size_kw)
              : formData.system_size_kw,
            contract_price: (() => {
              if (formData.contract_price === '' || formData.contract_price === null || formData.contract_price === undefined) {
                return null;
              }
              if (typeof formData.contract_price === 'string') {
                const parsed = parseFloat(formData.contract_price);
                return isNaN(parsed) ? null : parsed;
              }
              return typeof formData.contract_price === 'number' ? formData.contract_price : null;
            })(),
            panel_quantity: typeof formData.panel_quantity === 'string'
              ? parseInt(formData.panel_quantity)
              : formData.panel_quantity,
            panel_brand: formData.panel_brand,
            panel_wattage: typeof formData.panel_wattage === 'string'
              ? parseInt(formData.panel_wattage)
              : formData.panel_wattage,
            inverter_option: formData.inverter_option,
            racking_type: formData.racking_type,
            roof_type: formData.roof_type || null,
            battery_brand: formData.battery_brand && formData.battery_brand !== '' ? formData.battery_brand : null,
            battery_quantity: (() => {
              if (formData.battery_quantity === '' || formData.battery_quantity === null || formData.battery_quantity === undefined) {
                return 0;
              }
              if (typeof formData.battery_quantity === 'string') {
                const parsed = parseInt(formData.battery_quantity, 10);
                return isNaN(parsed) ? 0 : parsed;
              }
              return typeof formData.battery_quantity === 'number' ? formData.battery_quantity : 0;
            })(),
            signature_date: formData.signature_date || null,
          };
          break;
        case 'utility':
          updateData = {
            utility_company: formData.utility_company || null,
            utility_app_id: formData.utility_app_id || null,
          };
          break;
        case 'hoa':
          updateData = {
            hoa_name: formData.hoa_name || null,
            hoa_email: formData.hoa_email || null,
            hoa_phone: formData.hoa_phone || null,
          };
          break;
        case 'epc_pricing':
          updateData = {
            epc_ppw: (() => {
              if (formData.epc_ppw === '' || formData.epc_ppw === null || formData.epc_ppw === undefined) {
                return null;
              }
              if (typeof formData.epc_ppw === 'string') {
                const parsed = parseFloat(formData.epc_ppw);
                return isNaN(parsed) ? null : parsed;
              }
              return typeof formData.epc_ppw === 'number' ? formData.epc_ppw : null;
            })(),
          };
          break;
        case 'adders':
          updateData = {
            adder_steep_roof: formData.adder_steep_roof || false,
            adder_metal_roof: formData.adder_metal_roof || false,
            adder_tile_roof: formData.adder_tile_roof || false,
            adder_small_system: formData.adder_small_system || false,
            adder_fsu: formData.adder_fsu || false,
            adder_mpu: formData.adder_mpu || false,
            adder_critter_guard: formData.adder_critter_guard || false,
          };
          break;
        case 'bom_cost':
          updateData = {
            bom_cost: (() => {
              if (formData.bom_cost === '' || formData.bom_cost === null || formData.bom_cost === undefined) {
                return 0;
              }
              if (typeof formData.bom_cost === 'string') {
                const parsed = parseFloat(formData.bom_cost);
                return isNaN(parsed) ? 0 : parsed;
              }
              return typeof formData.bom_cost === 'number' ? formData.bom_cost : 0;
            })(),
          };
          break;
        case 'permit_engineering_cost':
          updateData = {
            permit_engineering_cost: (() => {
              if (formData.permit_engineering_cost === '' || formData.permit_engineering_cost === null || formData.permit_engineering_cost === undefined) {
                return 0;
              }
              if (typeof formData.permit_engineering_cost === 'string') {
                const parsed = parseFloat(formData.permit_engineering_cost);
                return isNaN(parsed) ? 0 : parsed;
              }
              return typeof formData.permit_engineering_cost === 'number' ? formData.permit_engineering_cost : 0;
            })(),
          };
          break;
      }

      console.log('Update payload:', JSON.stringify(updateData, null, 2));

      const { data: updatedData, error: updateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer.id)
        .select()
        .single();

      console.log('Update response - data:', updatedData);
      console.log('Update response - error:', updateError);

      if (updateError) {
        console.error('UPDATE FAILED:', updateError);
        throw updateError;
      }

      if (updatedData) {
        console.log('SUCCESS - Updated customer data:', updatedData);
        setCustomer(updatedData);
        setFormData(mapCustomerToFormData(updatedData));
      }

      if (user) {
        Object.entries(updateData).forEach(([fieldName, newValue]) => {
          const oldValue = customer[fieldName as keyof Customer];
          if (oldValue !== newValue) {
            logCustomerUpdate(customer.id, user.id, fieldName, oldValue, newValue);
          }
        });
      }

      setEditingSection(null);
      console.log('=== SAVE COMPLETED SUCCESSFULLY ===');
    } catch (err) {
      console.error('=== SAVE FAILED ===');
      console.error('Error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: EditingSection) => {
    await handleSaveSection(section);
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (deleteError) throw deleteError;

      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const SectionHeader = ({ title, section }: { title: string; section: EditingSection }) => {
    const isSalesRepSection = section === 'sales_rep';
    const canEditThisSection = canEdit && !(isSalesRepSection && user?.role_category === 'sales_rep');

    return (
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {canEditThisSection && (
          <>
            {editingSection === section ? (
              <div className="flex gap-1">
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition-all disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveSection(section)}
                  disabled={loading}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      Save
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit(section)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-all"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 py-1.5">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-0.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            {canEdit && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete Project
              </button>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                {customer.customer_id}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {projectStatus || customer.status}
              </span>
            </div>
            <h1 className="text-base font-bold text-gray-900">{customer.full_name}</h1>
            <p className="text-xs text-gray-500">{customer.installation_address}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-2 mt-2 p-3 bg-red-50 border border-red-200 rounded">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error Saving Changes</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto px-2 py-2">
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  {tab.icon && <tab.icon className="w-3 h-3" />}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-xs mb-2">
                {error}
              </div>
            )}

            {activeTab === 'pricing' && (() => {
              const displayData = formData;
              const systemSize = displayData.system_size_kw;
              const contractPrice = displayData.contract_price || 0;
              const overallPpw = contractPrice / systemSize;
              const commission = salesRepPpwRedline && contractPrice
                ? contractPrice - (salesRepPpwRedline * systemSize)
                : null;

              return (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <SectionHeader title="Contract Pricing" section="system" />
                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">
                            Contract Price
                          </label>
                          {editingSection === 'system' ? (
                            <input
                              type="number"
                              step="0.01"
                              name="contract_price"
                              value={formData.contract_price || ''}
                              onChange={handleChange}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="25000.00"
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-900">
                              {customer.contract_price
                                ? `$${customer.contract_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : 'Not specified'}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">
                            System Size
                          </label>
                          <p className="text-sm font-bold text-gray-900">{(systemSize / 1000).toFixed(2)} kW</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">
                            Price Per Watt (PPW)
                          </label>
                          <p className="text-sm font-bold text-green-600">
                            ${overallPpw.toFixed(2)}/W
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {commission !== null && customer.sales_rep_id && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-900">Sales Commission</h3>
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Sales Representative
                            </label>
                            <p className="text-sm font-bold text-gray-900">{salesRepName}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              PPW Redline
                            </label>
                            <p className="text-sm font-bold text-gray-900">
                              ${salesRepPpwRedline?.toFixed(2)}/W
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Total Commission
                            </label>
                            <p className="text-sm font-bold text-green-600">
                              ${commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-2">
                    <FinancingSection customer={customer} />
                  </div>
                </div>
              );
            })()}

            {activeTab === 'system' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <SectionHeader title="Customer Information" section="customer" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Full Name
                      </label>
                      {editingSection === 'customer' ? (
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">{customer.full_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Email
                      </label>
                      {editingSection === 'customer' ? (
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">{customer.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Phone Number
                      </label>
                      {editingSection === 'customer' ? (
                        <input
                          type="tel"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">{customer.phone_number}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Address
                      </label>
                      {editingSection === 'customer' ? (
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">{customer.installation_address}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Signature Date
                      </label>
                      {editingSection === 'customer' ? (
                        <input
                          type="date"
                          name="signature_date"
                          value={formData.signature_date || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">
                          {customer.signature_date
                            ? new Date(customer.signature_date).toLocaleDateString()
                            : 'Not signed'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <SectionHeader title="Sales Representative" section="sales_rep" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Assigned Sales Rep
                      </label>
                      {editingSection === 'sales_rep' ? (
                        <select
                          name="sales_rep_id"
                          value={formData.sales_rep_id || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="">Not assigned</option>
                          {salesReps.map((rep) => (
                            <option key={rep.id} value={rep.id}>
                              {rep.full_name} ({rep.email})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-gray-900">{salesRepName}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <SectionHeader title="Utility Information" section="utility" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Utility Company
                      </label>
                      {editingSection === 'utility' ? (
                        <input
                          type="text"
                          name="utility_company"
                          value={formData.utility_company || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="e.g., PG&E, SDG&E"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">
                          {customer.utility_company || 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Utility App ID
                      </label>
                      {editingSection === 'utility' ? (
                        <input
                          type="text"
                          name="utility_app_id"
                          value={formData.utility_app_id || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="If applicable"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">
                          {customer.utility_app_id || 'Not applicable'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <SectionHeader title="HOA Information" section="hoa" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        HOA Name
                      </label>
                      {editingSection === 'hoa' ? (
                        <input
                          type="text"
                          name="hoa_name"
                          value={formData.hoa_name || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Homeowners Association"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">
                          {customer.hoa_name || 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        HOA Email
                      </label>
                      {editingSection === 'hoa' ? (
                        <input
                          type="email"
                          name="hoa_email"
                          value={formData.hoa_email || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="hoa@example.com"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">
                          {customer.hoa_email || 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        HOA Phone Number
                      </label>
                      {editingSection === 'hoa' ? (
                        <input
                          type="tel"
                          name="hoa_phone"
                          value={formData.hoa_phone || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="(555) 123-4567"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">
                          {customer.hoa_phone || 'Not specified'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <SectionHeader title="System Details" section="system" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        System Size (kW)
                      </label>
                      {editingSection === 'system' ? (
                        <input
                          type="number"
                          step="0.01"
                          name="system_size_kw"
                          value={formData.system_size_kw}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">{customer.system_size_kw} kW</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Contract Price
                      </label>
                      {editingSection === 'system' ? (
                        <input
                          type="number"
                          step="0.01"
                          name="contract_price"
                          value={formData.contract_price || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="25000.00"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">
                          {customer.contract_price
                            ? `$${customer.contract_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Panel Quantity
                      </label>
                      {editingSection === 'system' ? (
                        <input
                          type="number"
                          name="panel_quantity"
                          value={formData.panel_quantity}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">{customer.panel_quantity}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Panel Brand
                      </label>
                      {editingSection === 'system' ? (
                        <select
                          name="panel_brand"
                          value={formData.panel_brand}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="SunPower">SunPower</option>
                          <option value="LG">LG</option>
                          <option value="Canadian Solar">Canadian Solar</option>
                          <option value="Panasonic">Panasonic</option>
                          <option value="REC">REC</option>
                          <option value="Q CELLS">Q CELLS</option>
                          <option value="Jinko Solar">Jinko Solar</option>
                          <option value="Trina Solar">Trina Solar</option>
                          <option value="LONGi">LONGi</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <p className="text-xs text-gray-900">{customer.panel_brand}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Panel Wattage (W)
                      </label>
                      {editingSection === 'system' ? (
                        <input
                          type="number"
                          name="panel_wattage"
                          value={formData.panel_wattage}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">{customer.panel_wattage}W</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Inverter Type
                      </label>
                      {editingSection === 'system' ? (
                        <select
                          name="inverter_option"
                          value={formData.inverter_option}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="Enphase IQ8+">Enphase IQ8+</option>
                          <option value="Enphase IQ8M">Enphase IQ8M</option>
                          <option value="SolarEdge HD-Wave">SolarEdge HD-Wave</option>
                          <option value="SolarEdge Optimizers">SolarEdge Optimizers</option>
                          <option value="Tesla Inverter">Tesla Inverter</option>
                          <option value="SMA Sunny Boy">SMA Sunny Boy</option>
                          <option value="Fronius Primo">Fronius Primo</option>
                          <option value="Generac PWRcell">Generac PWRcell</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <p className="text-xs text-gray-900">{customer.inverter_option}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Racking Type
                      </label>
                      {editingSection === 'system' ? (
                        <select
                          name="racking_type"
                          value={formData.racking_type}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="IronRidge XR Rail">IronRidge XR Rail</option>
                          <option value="IronRidge Flush Mount">IronRidge Flush Mount</option>
                          <option value="Unirac SolarMount">Unirac SolarMount</option>
                          <option value="Snapnrack">Snapnrack</option>
                          <option value="Quick Mount PV">Quick Mount PV</option>
                          <option value="Ecofasten Rock-It">Ecofasten Rock-It</option>
                          <option value="Ground Mount">Ground Mount</option>
                          <option value="Ballasted Roof Mount">Ballasted Roof Mount</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <p className="text-xs text-gray-900">{customer.racking_type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Roof Type
                      </label>
                      {editingSection === 'system' ? (
                        <select
                          name="roof_type"
                          value={formData.roof_type || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="">Select Roof Type</option>
                          <option value="Asphalt Shingle">Asphalt Shingle</option>
                          <option value="Tile">Tile</option>
                          <option value="Metal">Metal</option>
                          <option value="Flat">Flat</option>
                          <option value="Tar and Gravel">Tar and Gravel</option>
                          <option value="Wood Shake">Wood Shake</option>
                          <option value="Composite">Composite</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <p className="text-xs text-gray-900">{customer.roof_type || 'Not specified'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <SectionHeader title="Battery Storage" section="system" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Battery Brand
                      </label>
                      {editingSection === 'system' ? (
                        <select
                          name="battery_brand"
                          value={formData.battery_brand || ''}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="">No Battery</option>
                          <option value="Sonnen">Sonnen (20kW each)</option>
                          <option value="Duracell">Duracell (10kW each)</option>
                          <option value="Enphase">Enphase (5kW each)</option>
                          <option value="EP Cube">EP Cube (3.3kW each)</option>
                        </select>
                      ) : (
                        <p className="text-xs text-gray-900">{customer.battery_brand || 'No Battery'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Battery Quantity
                      </label>
                      {editingSection === 'system' ? (
                        <input
                          type="number"
                          name="battery_quantity"
                          value={formData.battery_quantity === null || formData.battery_quantity === undefined ? 0 : formData.battery_quantity}
                          onChange={handleChange}
                          min="0"
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">{customer.battery_quantity || 0}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Total Battery Capacity
                      </label>
                      {(() => {
                        const displayData = editingSection === 'system' ? formData : customer;
                        const batteryKwPerUnit: Record<string, number> = {
                          'Sonnen': 20,
                          'Duracell': 10,
                          'Enphase': 5,
                          'EP Cube': 3.3,
                        };
                        const brand = displayData.battery_brand || '';
                        const quantity = displayData.battery_quantity || 0;
                        const kwPerUnit = batteryKwPerUnit[brand] || 0;
                        const totalKw = kwPerUnit * quantity;
                        return (
                          <p className="text-xs font-bold text-gray-900">
                            {totalKw > 0 ? `${totalKw.toFixed(1)} kW` : 'N/A'}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'adders' && (() => {
              const displayData = editingSection === 'adders' ? formData : customer;
              const totalAdders = calculateTotalAdders(displayData);
              const systemSize = displayData.system_size_kw;
              const panelQty = displayData.panel_quantity;

              const getFormulaDisplay = (adder: CustomAdder) => {
                switch (adder.calculation_type) {
                  case 'per_kw':
                    return `$${adder.rate.toFixed(2)} × System Size`;
                  case 'per_panel':
                    return `$${adder.rate.toFixed(2)} × Panel Quantity`;
                  case 'flat_rate':
                    return `$${adder.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                  default:
                    return '';
                }
              };

              const adderConfigs = adders.map((adder) => {
                const fieldKey = getAdderFieldKey(adder.name);
                return {
                  key: fieldKey,
                  label: adder.name,
                  price: calculateAdderCost(adder, systemSize, panelQty),
                  formula: getFormulaDisplay(adder),
                  description: adder.description,
                };
              }).filter(config => config.key !== null);

              if (addersLoading) {
                return (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <SectionHeader title="Project Adders" section="adders" />
                  <div className="bg-gray-50 border border-gray-200 rounded p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {adderConfigs.length === 0 ? (
                        <div className="col-span-2 text-center py-4">
                          <p className="text-sm text-gray-500">No adders available. Please configure adders in Administration.</p>
                        </div>
                      ) : (
                        adderConfigs.map(({ key, label, price, formula, description }) => {
                          if (!key) return null;
                          const isEnabled = displayData[key];
                          return (
                            <div
                              key={key}
                              className={`bg-white border-2 rounded p-2 transition-all ${
                                isEnabled ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2">
                                  {editingSection === 'adders' ? (
                                    <input
                                      type="checkbox"
                                      checked={formData[key] || false}
                                      onChange={() => handleAdderToggle(key)}
                                      className="mt-0.5 h-4 w-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                    />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isEnabled || false}
                                      disabled
                                      className="mt-0.5 h-4 w-4 text-orange-600 rounded opacity-50"
                                    />
                                  )}
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-900">
                                      {label}
                                    </label>
                                    <p className="text-xs text-gray-500">{formula}</p>
                                    {description && (
                                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-bold ${isEnabled ? 'text-orange-600' : 'text-gray-400'}`}>
                                    ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Adders:</span>
                        <span className="text-base font-bold text-gray-900">
                          ${totalAdders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeTab === 'epc-costs' && (() => {
              const epcPpw = customer.epc_ppw || 0;
              const systemSize = customer.system_size_kw;
              const totalAdders = calculateTotalAdders(customer);
              const baseEpcCost = epcPpw * systemSize;
              const epcGrossTotal = baseEpcCost + totalAdders;
              const bomCost = customer.bom_cost || 0;
              const permitEngineeringCost = customer.permit_engineering_cost || 0;
              const laborBatteryPay = customer.labor_battery_pay || 0;
              const laborHourlyPay = customer.labor_hourly_pay || 0;
              const laborPerWattPay = customer.labor_per_watt_pay || 0;
              const laborTotal = customer.labor_total || 0;
              const epcNetProfit = epcGrossTotal - totalAdders - bomCost - permitEngineeringCost - laborTotal;

              return (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h2 className="text-sm font-bold text-gray-900">EPC Cost Breakdown</h2>

                    <div className="space-y-1.5">
                      <h3 className="text-xs font-semibold text-gray-900">EPC Gross</h3>

                      <div className="bg-blue-50 rounded p-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-medium text-gray-700">Base EPC Cost</p>
                            <p className="text-xs text-gray-500">EPC PPW × System Size ({systemSize} kW)</p>
                            {editingSection !== 'epc_pricing' && (
                              <p className="text-xs text-gray-400 mt-0.5">${epcPpw.toFixed(4)}/W × {systemSize} kW</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-blue-600">
                              ${baseEpcCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {canEdit && (
                              <>
                                {editingSection === 'epc_pricing' ? (
                                  <button
                                    onClick={() => handleSave('epc_pricing')}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
                                  >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingSection('epc_pricing')}
                                    className="flex items-center gap-1 px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors text-xs font-medium"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {editingSection === 'epc_pricing' && (
                          <div className="mt-2 bg-white border border-gray-300 rounded p-2">
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              EPC PPW (Price Per Watt)
                            </label>
                            <input
                              type="number"
                              step="0.0001"
                              name="epc_ppw"
                              value={formData.epc_ppw || ''}
                              onChange={handleChange}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="0.0000"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Preview: ${((formData.epc_ppw || 0) * systemSize).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="bg-red-50 rounded p-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-medium text-gray-700">Total Adders</p>
                            <p className="text-xs text-gray-500">Additional project costs</p>
                          </div>
                          <p className="text-xs font-semibold text-red-600">
                            ${totalAdders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="border-2 border-orange-400 rounded p-2 bg-white">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-gray-900">EPC Gross Total</p>
                            <p className="text-xs text-gray-500">Base EPC + Adders</p>
                          </div>
                          <p className="text-sm font-bold text-orange-600">
                            ${epcGrossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-900">EPC Deductions</h3>

                    <div className="border-b border-gray-200">
                      <nav className="flex -mb-px">
                        <button
                          onClick={() => setDeductionTab('bom')}
                          className={`
                            flex items-center gap-0.5 px-2 py-1.5 text-xs font-medium border-b-2 transition-colors
                            ${deductionTab === 'bom'
                              ? 'border-gray-900 text-gray-900'
                              : 'border-transparent text-gray-500 hover:text-gray-700'}
                          `}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          BOM Cost
                        </button>
                        <button
                          onClick={() => setDeductionTab('permit_engineering')}
                          className={`
                            flex items-center gap-0.5 px-2 py-1.5 text-xs font-medium border-b-2 transition-colors
                            ${deductionTab === 'permit_engineering'
                              ? 'border-gray-900 text-gray-900'
                              : 'border-transparent text-gray-500 hover:text-gray-700'}
                          `}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Permit & Eng
                        </button>
                        <button
                          onClick={() => setDeductionTab('labor')}
                          className={`
                            flex items-center gap-0.5 px-2 py-1.5 text-xs font-medium border-b-2 transition-colors
                            ${deductionTab === 'labor'
                              ? 'border-gray-900 text-gray-900'
                              : 'border-transparent text-gray-500 hover:text-gray-700'}
                          `}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Labor Costs
                        </button>
                      </nav>
                    </div>

                    {deductionTab === 'bom' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-900">Bill of Materials (BOM)</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Actual cost of materials purchased</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">
                              ${bomCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {canEdit && (
                              <>
                                {editingSection === 'bom_cost' ? (
                                  <button
                                    onClick={() => handleSave('bom_cost')}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
                                  >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingSection('bom_cost')}
                                    className="flex items-center gap-1 px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors text-xs font-medium"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Add
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {editingSection === 'bom_cost' ? (
                          <div className="bg-white border border-gray-300 rounded p-2">
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Enter BOM Cost
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              name="bom_cost"
                              value={formData.bom_cost || ''}
                              onChange={handleChange}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                        ) : bomCost === 0 ? (
                          <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
                            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-amber-800">
                              <span className="font-semibold">No BOM cost recorded.</span> Click "Add" to enter actual material costs.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {deductionTab === 'permit_engineering' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-900">Permit & Engineering Costs</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Actual costs for permits, engineering, inspections</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">
                              ${permitEngineeringCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {canEdit && (
                              <>
                                {editingSection === 'permit_engineering_cost' ? (
                                  <button
                                    onClick={() => handleSave('permit_engineering_cost')}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
                                  >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingSection('permit_engineering_cost')}
                                    className="flex items-center gap-1 px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors text-xs font-medium"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Add
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {editingSection === 'permit_engineering_cost' ? (
                          <div className="bg-white border border-gray-300 rounded p-2">
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Enter Permit & Engineering Cost
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              name="permit_engineering_cost"
                              value={formData.permit_engineering_cost || ''}
                              onChange={handleChange}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                        ) : permitEngineeringCost === 0 ? (
                          <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
                            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-amber-800">
                              <span className="font-semibold">No permit/engineering costs recorded.</span> Click "Add" to enter actual costs.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {deductionTab === 'labor' && (() => {
                      const laborBreakdown = customer.labor_breakdown || [];

                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-semibold text-gray-900">Labor Costs</h4>
                              <p className="text-xs text-gray-500 mt-0.5">Auto-calculated from time entries and tickets</p>
                            </div>
                            <p className="text-sm font-bold text-gray-900">
                              ${laborTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          {laborTotal > 0 ? (
                            <div className="space-y-2">
                              <div className="bg-white border border-gray-200 rounded p-2">
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center pb-1 border-b border-gray-200">
                                    <span className="text-xs font-semibold text-gray-700">Battery Pay</span>
                                    <span className="text-xs font-bold text-gray-900">
                                      ${laborBatteryPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center pb-1 border-b border-gray-200">
                                    <span className="text-xs font-semibold text-gray-700">Hourly Pay</span>
                                    <span className="text-xs font-bold text-gray-900">
                                      ${laborHourlyPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-gray-700">Per Watt Pay</span>
                                    <span className="text-xs font-bold text-gray-900">
                                      ${laborPerWattPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                                <h5 className="text-xs font-semibold text-gray-700 mb-2">Detailed Breakdown</h5>
                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                  {laborBreakdown.map((item: any, index: number) => (
                                    <div key={index} className="bg-white border border-gray-200 rounded p-1.5">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-gray-900">{item.user_name}</p>
                                          <p className="text-xs text-gray-600 capitalize">
                                            {item.type === 'battery_pay' ? 'Battery Installation' :
                                             item.type === 'hourly_pay' ? `Hourly (${item.hours?.toFixed(2)}h @ $${item.rate}/hr)` :
                                             item.type === 'per_watt_pay' ? `Per Watt (${item.system_size_kw}kW @ $${item.rate}/W)` : item.type}
                                          </p>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-900">
                                          ${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {laborBreakdown.length === 0 && (
                                    <p className="text-xs text-gray-500 italic">No labor entries recorded yet.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded p-2 flex items-start gap-2">
                              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <p className="text-sm text-blue-800">
                                <span className="font-semibold">No labor costs recorded.</span> Labor costs automatically calculate from time clock entries and completed installation tickets.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-900">EPC Net</h3>

                    <div className="bg-red-50 rounded p-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-medium text-gray-700">Less Adders</p>
                        <p className="text-xs font-semibold text-red-600">
                          -${totalAdders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="border-2 border-green-400 rounded p-2 bg-white">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-gray-900">EPC Net Profit</p>
                          <p className="text-xs text-gray-500">Gross - Adders - BOM - Permit/Eng - Labor</p>
                          <p className="text-xs text-gray-400">
                            ${epcGrossTotal.toFixed(2)} - ${totalAdders.toFixed(2)} - ${bomCost.toFixed(2)} - ${permitEngineeringCost.toFixed(2)} - ${laborTotal.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-green-600">
                          ${epcNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Commission Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-900">Sales Commissions</h3>

                    {commissionLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : !commission ? (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">No commission data yet.</span> Commission tracking will be set up automatically based on sale details.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Total Commission */}
                        <div className="bg-blue-50 rounded p-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-medium text-gray-700">Total Sales Commission</p>
                              <p className="text-xs text-gray-500">{salesRepName}</p>
                            </div>
                            <p className="text-xs font-semibold text-blue-600">
                              ${commission.total_commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {/* Sales Manager Override */}
                        {commission.sales_manager_override_amount && commission.sales_manager_override_amount > 0 && (
                          <div className={`rounded p-2 ${
                            commission.manager_override_payment_status === 'paid' ? 'bg-green-50' :
                            commission.manager_override_payment_status === 'eligible' ? 'bg-yellow-50' : 'bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-medium text-gray-700">Sales Manager Override</p>
                                <p className="text-xs text-gray-500">
                                  {commission.manager_override_payment_status === 'paid'
                                    ? `Approved: ${new Date(commission.manager_override_paid_date!).toLocaleDateString()}`
                                    : commission.manager_override_payment_status === 'eligible'
                                    ? `Eligible since: ${commission.manager_override_eligibility_date ? new Date(commission.manager_override_eligibility_date).toLocaleDateString() : 'N/A'}`
                                    : 'Requires: Installation scheduled'
                                  }
                                </p>
                                {commission.manager_override_payroll_period_end && (
                                  <p className="text-xs text-gray-400">
                                    Payroll period: {new Date(commission.manager_override_payroll_period_end).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className={`text-xs font-semibold ${
                                  commission.manager_override_payment_status === 'paid' ? 'text-green-600' :
                                  commission.manager_override_payment_status === 'eligible' ? 'text-yellow-600' : 'text-gray-600'
                                }`}>
                                  ${commission.sales_manager_override_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                                  commission.manager_override_payment_status === 'paid' ? 'bg-green-200 text-green-800' :
                                  commission.manager_override_payment_status === 'eligible' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'
                                }`}>
                                  {commission.manager_override_payment_status === 'paid' ? 'APPROVED' : commission.manager_override_payment_status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* M1 Payment */}
                        <div className={`rounded p-2 ${
                          commission.m1_payment_status === 'paid' ? 'bg-green-50' :
                          commission.m1_payment_status === 'eligible' ? 'bg-yellow-50' : 'bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-medium text-gray-700">M1 Payment (Milestone 1)</p>
                              <p className="text-xs text-gray-500">
                                {commission.m1_payment_status === 'paid'
                                  ? `Approved: ${new Date(commission.m1_paid_date!).toLocaleDateString()}`
                                  : commission.m1_payment_status === 'eligible'
                                  ? `Eligible since: ${commission.m1_eligibility_date ? new Date(commission.m1_eligibility_date).toLocaleDateString() : 'N/A'}`
                                  : 'Requires: Survey complete + 3 days from signature'
                                }
                              </p>
                              {commission.m1_payroll_period_end && (
                                <p className="text-xs text-gray-400">
                                  Payroll period: {new Date(commission.m1_payroll_period_end).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-semibold ${
                                commission.m1_payment_status === 'paid' ? 'text-green-600' :
                                commission.m1_payment_status === 'eligible' ? 'text-yellow-600' : 'text-gray-600'
                              }`}>
                                ${commission.m1_payment_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                                commission.m1_payment_status === 'paid' ? 'bg-green-200 text-green-800' :
                                commission.m1_payment_status === 'eligible' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'
                              }`}>
                                {commission.m1_payment_status === 'paid' ? 'APPROVED' : commission.m1_payment_status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* M2 Payment */}
                        <div className={`rounded p-2 ${
                          commission.m2_payment_status === 'paid' ? 'bg-green-50' :
                          commission.m2_payment_status === 'eligible' ? 'bg-yellow-50' : 'bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-medium text-gray-700">M2 Payment (Milestone 2)</p>
                              <p className="text-xs text-gray-500">
                                {commission.m2_payment_status === 'paid'
                                  ? `Approved: ${new Date(commission.m2_paid_date!).toLocaleDateString()}`
                                  : commission.m2_payment_status === 'eligible'
                                  ? 'Eligible: Install complete'
                                  : 'Requires: Installation complete'
                                }
                              </p>
                              {commission.m2_payroll_period_end && (
                                <p className="text-xs text-gray-400">
                                  Payroll period: {new Date(commission.m2_payroll_period_end).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-semibold ${
                                commission.m2_payment_status === 'paid' ? 'text-green-600' :
                                commission.m2_payment_status === 'eligible' ? 'text-yellow-600' : 'text-gray-600'
                              }`}>
                                ${commission.m2_payment_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                                commission.m2_payment_status === 'paid' ? 'bg-green-200 text-green-800' :
                                commission.m2_payment_status === 'eligible' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'
                              }`}>
                                {commission.m2_payment_status === 'paid' ? 'APPROVED' : commission.m2_payment_status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Totals Summary */}
                        <div className="border-2 border-blue-400 rounded p-2 bg-white">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <p className="text-xs font-bold text-gray-900">Total Paid</p>
                              <p className="text-xs font-bold text-blue-600">
                                ${((commission.m1_payment_status === 'paid' ? commission.m1_payment_amount : 0) +
                                   (commission.m2_payment_status === 'paid' ? commission.m2_payment_amount : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-xs font-bold text-gray-900">Remaining Balance</p>
                              <p className="text-xs font-bold text-orange-600">
                                ${(commission.total_commission -
                                   (commission.m1_payment_status === 'paid' ? commission.m1_payment_amount : 0) -
                                   (commission.m2_payment_status === 'paid' ? commission.m2_payment_amount : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {activeTab === 'documents' && (
              <DocumentsSection customerId={customer.id} />
            )}

            {activeTab === 'scheduling' && (
              <SchedulingSection customer={customer} />
            )}

            {activeTab === 'timeline' && (
              <ProjectTimeline customer={customer} />
            )}

            {activeTab === 'chat' && (
              <ProjectChat customerId={customer.id} />
            )}

            {activeTab === 'activity' && (
              <ActivityLog customerId={customer.id} />
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Project</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to delete this project for <strong>{customer.full_name}</strong>?
                </p>
                <p className="text-sm text-red-600 font-medium">
                  This action cannot be undone. All project data including documents, scheduling, timeline, messages, and photos will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
