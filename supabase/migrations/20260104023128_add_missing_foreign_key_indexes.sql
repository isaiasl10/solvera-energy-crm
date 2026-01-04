/*
  # Add Missing Foreign Key Indexes
  
  1. Performance Improvements
    - Add indexes on all foreign key columns that don't have covering indexes
    - This significantly improves JOIN performance and query optimization
  
  2. Tables Affected
    - appointments: organization_id
    - batteries: organization_id
    - custom_adders: organization_id
    - customer_financing: organization_id
    - documents: customer_id
    - financiers: organization_id
    - financing_products: organization_id
    - inspection_photos: organization_id
    - installation_photos: organization_id
    - inverters: organization_id
    - optimizers: organization_id
    - panels: organization_id
    - project_activity_log: organization_id, user_id
    - project_messages: organization_id, user_id
    - racking: organization_id
    - sales_commissions: sales_manager_id
    - scheduling: pv_installer_id
    - site_survey_photos: organization_id
*/

-- Add indexes for organization_id foreign keys
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_batteries_organization_id ON public.batteries(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_adders_organization_fk ON public.custom_adders(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_financing_organization_id ON public.customer_financing(organization_id);
CREATE INDEX IF NOT EXISTS idx_financiers_organization_id ON public.financiers(organization_id);
CREATE INDEX IF NOT EXISTS idx_financing_products_organization_fk ON public.financing_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_organization_id ON public.inspection_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_installation_photos_organization_id ON public.installation_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_inverters_organization_id ON public.inverters(organization_id);
CREATE INDEX IF NOT EXISTS idx_optimizers_organization_id ON public.optimizers(organization_id);
CREATE INDEX IF NOT EXISTS idx_panels_organization_id ON public.panels(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_log_organization_id ON public.project_activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_organization_id ON public.project_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_racking_organization_id ON public.racking(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_survey_photos_organization_id ON public.site_survey_photos(organization_id);

-- Add indexes for other foreign keys
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_log_user_id ON public.project_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_user_id ON public.project_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_sales_manager_id ON public.sales_commissions(sales_manager_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_pv_installer_id ON public.scheduling(pv_installer_id);
