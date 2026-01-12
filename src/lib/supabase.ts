export { supabase } from './supabaseClient';

export type Customer = {
  id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  address: string;
  phone_number: string;
  email: string;
  system_size_kw: number;
  panel_quantity: number;
  panel_brand: string;
  panel_wattage: number;
  inverter_option: string;
  racking_type: string;
  status: string;
  contract_price?: number;
  roof_type?: string;
  utility_company?: string;
  utility_app_id?: string;
  hoa_name?: string;
  hoa_email?: string;
  hoa_phone?: string;
  epc_ppw?: number;
  bom_cost?: number;
  permit_engineering_cost?: number;
  adder_steep_roof?: boolean;
  adder_metal_roof?: boolean;
  adder_tile_roof?: boolean;
  adder_small_system?: boolean;
  adder_fsu?: boolean;
  adder_mpu?: boolean;
  adder_critter_guard?: boolean;
  battery_brand?: string;
  battery_quantity?: number;
  signature_date?: string;
  sales_rep_id?: string;
};

export type SchedulingAppointment = {
  id: string;
  customer_id: string;
  appointment_type: 'site_survey' | 'installation' | 'inspection';
  scheduled_date: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  assigned_technicians: string[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  ticket_type?: string;
  problem_code?: string;
  ticket_status?: string;
  priority?: string;
  notes?: string;
  resolution_description?: string;
  is_active?: boolean;
  in_transit_at?: string | null;
  arrived_at?: string | null;
  begin_ticket_at?: string | null;
  work_performed?: string | null;
  departing_at?: string | null;
  closed_at?: string | null;
  alert_customer_transit?: boolean;
  alert_customer_arrival?: boolean;
  alert_customer_departure?: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomAdder = {
  id: string;
  name: string;
  description: string;
  calculation_type: 'per_kw' | 'per_panel' | 'flat_rate';
  rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const calculateAdderCost = (
  adder: CustomAdder,
  systemSizeKw: number,
  panelQuantity: number
): number => {
  switch (adder.calculation_type) {
    case 'per_kw':
      return adder.rate * systemSizeKw;
    case 'per_panel':
      return adder.rate * panelQuantity;
    case 'flat_rate':
      return adder.rate;
    default:
      return 0;
  }
};

export const fetchActiveAdders = async (): Promise<CustomAdder[]> => {
  const { data, error } = await supabase
    .from('custom_adders')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching adders:', error);
    return [];
  }

  return data || [];
};

export type Financier = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type FinancingProduct = {
  id: string;
  financier_id: string;
  product_name: string;
  product_type: 'LOAN' | 'LEASE' | 'PPA';
  term_months: number;
  apr: number;
  active: boolean;
  created_at: string;
  financier?: Financier;
};

export type CustomerFinancing = {
  id: string;
  customer_id: string;
  contract_type: 'CASH' | 'LOAN' | 'LEASE' | 'PPA';
  financing_product_id?: string;
  deposit_amount: number;
  deposit_received: boolean;
  deposit_received_date?: string;
  pre_install_payment_amount: number;
  pre_install_payment_received: boolean;
  pre_install_payment_received_date?: string;
  final_payment_amount: number;
  final_payment_received: boolean;
  final_payment_received_date?: string;
  created_at: string;
  updated_at: string;
  financing_product?: FinancingProduct;
};

export type Document = {
  id: string;
  customer_id: string;
  document_type: string;
  identification_type?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
};

export type SiteSurveyPhotos = {
  id: string;
  ticket_id: string;
  checked_photos: string[];
  photo_urls: { [key: string]: string[] };
  created_at: string;
  updated_at: string;
};
