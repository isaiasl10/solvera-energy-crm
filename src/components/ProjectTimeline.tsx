import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  Home,
  Warehouse,
  Phone,
  FileCheck,
  Zap,
  AlertCircle,
  TrendingUp,
  XCircle,
  Wrench
} from 'lucide-react';

type Customer = {
  id: string;
  full_name: string;
  signature_date: string | null;
};

type ProjectTimeline = {
  id?: string;
  customer_id: string;

  // Status fields
  site_survey_status: string;
  engineering_status: string;
  utility_status: string;
  permit_status: string;
  installation_status: string;
  material_order_status: string;
  inspection_status: string;

  // Date fields (legacy + new)
  site_survey_scheduled_date: string | null;
  site_survey_completed_date: string | null;
  engineering_plans_received_date: string | null;
  utility_application_submitted_date: string | null;
  utility_revision_date: string | null;
  utility_revision_submitted_date: string | null;
  utility_application_approved_date: string | null;
  city_permits_submitted_date: string | null;
  permit_revision_date: string | null;
  permit_revision_submitted_date: string | null;
  city_permits_approved_date: string | null;
  material_ordered_date: string | null;
  material_drop_ship_location: string | null;
  homeowner_contacted_for_delivery: boolean;
  installation_scheduled_date: string | null;
  installation_completed_date: string | null;
  city_inspection_date: string | null;
  city_inspection_status: string | null;
  city_inspection_notes: string | null;
  service_completed_date: string | null;
  pto_submitted_date: string | null;
  pto_approved_date: string | null;
  system_activated_date: string | null;

  // Notes fields
  utility_notes: string | null;
  permit_notes: string | null;
  installation_notes: string | null;
};

type ProjectTimelineProps = {
  customer: Customer;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Not set';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function ProjectTimeline({ customer }: ProjectTimelineProps) {
  const [timeline, setTimeline] = useState<ProjectTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tickets, setTickets] = useState<any>({});

  useEffect(() => {
    loadTimeline();

    const timestamp = Date.now();
    const timelineChannelName = `timeline_updates_${customer.id}_${timestamp}`;
    const schedulingChannelName = `scheduling_timeline_${customer.id}_${timestamp}`;

    const timelineSubscription = supabase
      .channel(timelineChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_timeline',
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          loadTimeline();
        }
      )
      .subscribe();

    const schedulingSubscription = supabase
      .channel(schedulingChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduling',
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          loadTimeline();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timelineSubscription);
      supabase.removeChannel(schedulingSubscription);
    };
  }, [customer.id]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const [timelineResult, ticketsResult] = await Promise.all([
        supabase
          .from('project_timeline')
          .select('*')
          .eq('customer_id', customer.id)
          .maybeSingle(),
        supabase
          .from('scheduling')
          .select('*')
          .eq('customer_id', customer.id)
          .order('scheduled_date', { ascending: false })
      ]);

      if (timelineResult.error && timelineResult.error.code !== 'PGRST116') throw timelineResult.error;
      if (ticketsResult.error) throw ticketsResult.error;

      const tickets = ticketsResult.data || [];

      const siteSurveyCompleted = tickets.find(t =>
        (t.appointment_type === 'site_survey' ||
         t.ticket_type === 'service' ||
         (t.ticket_type === 'inspection' && t.problem_code === 'site_survey')) &&
        (t.status === 'completed' || t.ticket_status === 'completed' || t.closed_at !== null)
      );

      const siteSurveyScheduled = tickets.find(t =>
        (t.appointment_type === 'site_survey' ||
         t.ticket_type === 'service' ||
         (t.ticket_type === 'inspection' && t.problem_code === 'site_survey')) &&
        (t.status === 'confirmed' || t.ticket_status === 'scheduled') &&
        !siteSurveyCompleted
      );

      const installationCompleted = tickets.find(t =>
        (t.appointment_type === 'installation' || t.ticket_type === 'installation') &&
        (t.status === 'completed' || t.ticket_status === 'completed' || t.closed_at !== null)
      );

      const installationScheduled = tickets.find(t =>
        (t.appointment_type === 'installation' || t.ticket_type === 'installation') &&
        (t.status === 'confirmed' || t.ticket_status === 'scheduled') &&
        !installationCompleted
      );

      const inspectionCompleted = tickets.find(t =>
        (t.appointment_type === 'inspection' || t.ticket_type === 'inspection') &&
        t.problem_code === 'city_inspection' &&
        (t.status === 'completed' || t.ticket_status === 'completed' || t.closed_at !== null)
      );

      const inspectionScheduled = tickets.find(t =>
        (t.appointment_type === 'inspection' || t.ticket_type === 'inspection') &&
        t.problem_code === 'city_inspection' &&
        (t.status === 'confirmed' || t.ticket_status === 'scheduled') &&
        !inspectionCompleted
      );

      let siteSurveyStatus = 'pending_schedule';
      let engineeringStatus = timelineResult.data?.engineering_status || 'pending';
      let installationStatus = 'pending_customer';
      let inspectionStatus = 'not_ready';

      if (siteSurveyCompleted) {
        siteSurveyStatus = 'completed';
        if (engineeringStatus === 'pending') {
          engineeringStatus = 'pending';
        }
      } else if (siteSurveyScheduled) {
        siteSurveyStatus = 'scheduled';
      }

      if (installationCompleted) {
        installationStatus = 'completed';
        if (!inspectionCompleted && !inspectionScheduled) {
          inspectionStatus = 'ready';
        }
      } else if (installationScheduled) {
        installationStatus = 'scheduled';
      }

      if (inspectionCompleted) {
        inspectionStatus = 'passed';
      } else if (inspectionScheduled) {
        inspectionStatus = 'scheduled';
      }

      const baseTimeline = {
        customer_id: customer.id,
        site_survey_status: siteSurveyStatus,
        engineering_status: engineeringStatus,
        utility_status: 'not_started',
        permit_status: 'not_started',
        installation_status: installationStatus,
        material_order_status: 'not_ordered',
        inspection_status: inspectionStatus,
        site_survey_scheduled_date: (siteSurveyScheduled || siteSurveyCompleted)?.scheduled_date || null,
        site_survey_completed_date: siteSurveyCompleted?.closed_at || siteSurveyCompleted?.scheduled_date || null,
        engineering_plans_received_date: null,
        utility_application_submitted_date: null,
        utility_revision_date: null,
        utility_revision_submitted_date: null,
        utility_application_approved_date: null,
        city_permits_submitted_date: null,
        permit_revision_date: null,
        permit_revision_submitted_date: null,
        city_permits_approved_date: null,
        material_ordered_date: null,
        material_drop_ship_location: null,
        homeowner_contacted_for_delivery: false,
        installation_scheduled_date: (installationScheduled || installationCompleted)?.scheduled_date || null,
        installation_completed_date: installationCompleted?.closed_at || installationCompleted?.scheduled_date || null,
        city_inspection_date: (inspectionScheduled || inspectionCompleted)?.scheduled_date || null,
        city_inspection_status: inspectionCompleted ? 'passed' : null,
        city_inspection_notes: null,
        service_completed_date: null,
        pto_submitted_date: null,
        pto_approved_date: null,
        system_activated_date: null,
        utility_notes: null,
        permit_notes: null,
        installation_notes: null,
      };

      const updatedTimeline = timelineResult.data ? {
        ...timelineResult.data,
        site_survey_status: siteSurveyStatus,
        site_survey_scheduled_date: (siteSurveyScheduled || siteSurveyCompleted)?.scheduled_date || timelineResult.data.site_survey_scheduled_date,
        site_survey_completed_date: siteSurveyCompleted?.closed_at || siteSurveyCompleted?.scheduled_date || timelineResult.data.site_survey_completed_date,
        engineering_status: siteSurveyCompleted && timelineResult.data.engineering_status === 'pending' ? 'pending' : timelineResult.data.engineering_status,
        installation_status: installationStatus,
        installation_scheduled_date: (installationScheduled || installationCompleted)?.scheduled_date || timelineResult.data.installation_scheduled_date,
        installation_completed_date: installationCompleted?.closed_at || installationCompleted?.scheduled_date || timelineResult.data.installation_completed_date,
        inspection_status: inspectionStatus,
        city_inspection_date: (inspectionScheduled || inspectionCompleted)?.scheduled_date || timelineResult.data.city_inspection_date,
      } : baseTimeline;

      if (timelineResult.data?.id) {
        await supabase
          .from('project_timeline')
          .update({
            site_survey_status: updatedTimeline.site_survey_status,
            site_survey_scheduled_date: updatedTimeline.site_survey_scheduled_date,
            site_survey_completed_date: updatedTimeline.site_survey_completed_date,
            engineering_status: updatedTimeline.engineering_status,
            installation_status: updatedTimeline.installation_status,
            installation_scheduled_date: updatedTimeline.installation_scheduled_date,
            installation_completed_date: updatedTimeline.installation_completed_date,
            inspection_status: updatedTimeline.inspection_status,
            city_inspection_date: updatedTimeline.city_inspection_date,
          })
          .eq('id', timelineResult.data.id);
      } else if (!timelineResult.data) {
        const { data: newTimeline } = await supabase
          .from('project_timeline')
          .insert([updatedTimeline])
          .select()
          .maybeSingle();

        if (newTimeline) {
          updatedTimeline.id = newTimeline.id;
        }
      }

      setTimeline(updatedTimeline);

      setTickets({
        siteSurveyScheduled,
        siteSurveyCompleted,
        installationScheduled,
        installationCompleted,
        inspectionScheduled,
        inspectionCompleted
      });
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeline = async (updates: Partial<ProjectTimeline>) => {
    if (!timeline) return;

    setSaving(true);
    try {
      const updatedTimeline = { ...timeline, ...updates };

      if (timeline.id) {
        const { error } = await supabase
          .from('project_timeline')
          .update(updates)
          .eq('id', timeline.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('project_timeline')
          .insert([updatedTimeline])
          .select()
          .single();

        if (error) throw error;
        updatedTimeline.id = data.id;
      }

      setTimeline(updatedTimeline);
    } catch (error) {
      console.error('Error updating timeline:', error);
      alert('Failed to update timeline');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading timeline...</div>;
  }

  if (!timeline) {
    return <div className="p-6 text-center">Failed to load timeline</div>;
  }

  const getCurrentPhase = () => {
    if (timeline.system_activated_date) return 'Completed';
    if (timeline.pto_approved_date) return 'System Activation';
    if (timeline.pto_submitted_date) return 'Awaiting PTO';
    if (timeline.inspection_status === 'passed') return 'Ready for PTO';
    if (timeline.inspection_status === 'service_completed') return 'Ready for Re-Inspection';
    if (timeline.inspection_status === 'service_required' || timeline.inspection_status === 'failed') return 'Service Required';
    if (timeline.inspection_status === 'scheduled') return 'Inspection Scheduled';
    if (timeline.inspection_status === 'ready') return 'Ready for Inspection';
    if (timeline.installation_status === 'completed') return 'Installation Complete';
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
    if (timeline.site_survey_status === 'completed') return 'Survey Complete - Pending Engineering';
    if (timeline.site_survey_status === 'scheduled') return 'Survey Scheduled';
    return 'New Lead';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Analytics Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Project Status</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Signature Date</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatDate(customer.signature_date)}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Current Phase</div>
            <div className="text-sm font-semibold text-gray-900">
              {getCurrentPhase()}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className="text-sm font-semibold">
              {timeline.system_activated_date ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Active
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> In Progress
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Workflow */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>

        {/* Site Survey */}
        <WorkflowPhase
          title="Site Survey"
          icon={<Home className="w-5 h-5" />}
          status={timeline.site_survey_status}
          statusOptions={[
            { value: 'pending_schedule', label: 'Pending Schedule' },
            { value: 'scheduled', label: 'Site Survey Scheduled' },
            { value: 'completed', label: 'Site Survey Complete' },
          ]}
          currentDate={
            timeline.site_survey_status === 'scheduled'
              ? timeline.site_survey_scheduled_date
              : timeline.site_survey_status === 'completed'
              ? timeline.site_survey_completed_date
              : null
          }
          ticket={timeline.site_survey_status === 'scheduled' ? tickets.siteSurveyScheduled : tickets.siteSurveyCompleted}
          onUpdate={(status, date) => {
            const updates: Partial<ProjectTimeline> = { site_survey_status: status };
            if (status === 'completed') {
              updates.engineering_status = 'pending';
            }
            updateTimeline(updates);
          }}
          saving={saving}
          autoFromTickets
        />

        {/* Engineering */}
        <WorkflowPhase
          title="Engineering"
          icon={<FileCheck className="w-5 h-5" />}
          status={timeline.engineering_status}
          statusOptions={[
            { value: 'pending', label: 'Pending Engineering' },
            { value: 'completed', label: 'Engineering Complete', dateField: 'engineering_plans_received_date' },
          ]}
          currentDate={timeline.engineering_status === 'completed' ? timeline.engineering_plans_received_date : null}
          onUpdate={(status, date) => {
            const updates: Partial<ProjectTimeline> = { engineering_status: status };
            if (status === 'completed') {
              updates.engineering_plans_received_date = date || new Date().toISOString();
              updates.utility_status = 'not_started';
              updates.permit_status = 'not_started';
            }
            updateTimeline(updates);
          }}
          saving={saving}
          disabled={timeline.site_survey_status !== 'completed'}
        />

        {/* Utility Application */}
        <WorkflowPhase
          title="Utility Application"
          icon={<Zap className="w-5 h-5" />}
          status={timeline.utility_status}
          statusOptions={[
            { value: 'not_started', label: 'Not Started' },
            { value: 'submitted', label: 'Application Submitted', dateField: 'utility_application_submitted_date' },
            { value: 'revision_required', label: 'Revision Required / Pending Engineering', dateField: 'utility_revision_date' },
            { value: 'revision_submitted', label: 'Revision Re-Submitted to Utility', dateField: 'utility_revision_submitted_date' },
            { value: 'approved', label: 'Utility App Approved', dateField: 'utility_application_approved_date' },
          ]}
          allDates={{
            utility_application_submitted_date: timeline.utility_application_submitted_date,
            utility_revision_date: timeline.utility_revision_date,
            utility_revision_submitted_date: timeline.utility_revision_submitted_date,
            utility_application_approved_date: timeline.utility_application_approved_date,
          }}
          notes={timeline.utility_notes}
          onUpdate={(status, date, notes) => {
            const updates: Partial<ProjectTimeline> = { utility_status: status };
            if (notes !== undefined) updates.utility_notes = notes;

            if (status === 'submitted' && date) {
              updates.utility_application_submitted_date = date;
            } else if (status === 'revision_required' && date) {
              updates.utility_revision_date = date;
            } else if (status === 'revision_submitted' && date) {
              updates.utility_revision_submitted_date = date;
            } else if (status === 'approved') {
              updates.utility_application_approved_date = date || new Date().toISOString();
            }
            updateTimeline(updates);
          }}
          saving={saving}
          disabled={timeline.engineering_status !== 'completed'}
        />

        {/* City Permits */}
        <WorkflowPhase
          title="City Permits"
          icon={<FileCheck className="w-5 h-5" />}
          status={timeline.permit_status}
          statusOptions={[
            { value: 'not_started', label: 'Not Started' },
            { value: 'submitted', label: 'Application Submitted', dateField: 'city_permits_submitted_date' },
            { value: 'revision_required', label: 'Revision Required / Pending Engineering', dateField: 'permit_revision_date' },
            { value: 'revision_submitted', label: 'Revision Re-Submitted to City', dateField: 'permit_revision_submitted_date' },
            { value: 'approved', label: 'City Permits Approved', dateField: 'city_permits_approved_date' },
          ]}
          allDates={{
            city_permits_submitted_date: timeline.city_permits_submitted_date,
            permit_revision_date: timeline.permit_revision_date,
            permit_revision_submitted_date: timeline.permit_revision_submitted_date,
            city_permits_approved_date: timeline.city_permits_approved_date,
          }}
          notes={timeline.permit_notes}
          onUpdate={(status, date, notes) => {
            const updates: Partial<ProjectTimeline> = { permit_status: status };
            if (notes !== undefined) updates.permit_notes = notes;

            if (status === 'submitted' && date) {
              updates.city_permits_submitted_date = date;
            } else if (status === 'revision_required' && date) {
              updates.permit_revision_date = date;
            } else if (status === 'revision_submitted' && date) {
              updates.permit_revision_submitted_date = date;
            } else if (status === 'approved') {
              updates.city_permits_approved_date = date || new Date().toISOString();
            }
            updateTimeline(updates);
          }}
          saving={saving}
          disabled={timeline.engineering_status !== 'completed'}
        />

        {/* Coordinate Installation */}
        <WorkflowPhase
          title="Coordinate Installation"
          icon={<Calendar className="w-5 h-5" />}
          status={timeline.installation_status}
          statusOptions={[
            { value: 'pending_customer', label: 'Pending Customer Confirmation' },
            { value: 'pending_material', label: 'Pending Material Availability' },
            { value: 'scheduled', label: 'Install Scheduled' },
            { value: 'completed', label: 'Installation Completed' },
          ]}
          currentDate={
            timeline.installation_status === 'scheduled' ? timeline.installation_scheduled_date :
            timeline.installation_status === 'completed' ? timeline.installation_completed_date :
            null
          }
          ticket={timeline.installation_status === 'scheduled' ? tickets.installationScheduled : tickets.installationCompleted}
          notes={timeline.installation_notes}
          onUpdate={(status, date, notes) => {
            const updates: Partial<ProjectTimeline> = { installation_status: status };
            if (notes !== undefined) updates.installation_notes = notes;

            if (status === 'completed') {
              updates.inspection_status = 'ready';
            }
            updateTimeline(updates);
          }}
          saving={saving}
          disabled={timeline.permit_status !== 'approved'}
          autoFromTickets
          installationValidation={timeline.installation_scheduled_date ? () => {
            const installDate = new Date(timeline.installation_scheduled_date!);
            const now = new Date();
            const hoursDiff = (installDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            return hoursDiff >= 48;
          } : undefined}
        />

        {/* Material Order */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className={`mt-1 ${timeline.material_order_status === 'ordered' || timeline.material_order_status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Order Material</h4>
                {timeline.material_order_status === 'ordered' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>

              {timeline.installation_status !== 'scheduled' ? (
                <div className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Material can only be ordered once installation is scheduled (48 hours in advance)
                </div>
              ) : timeline.material_order_status === 'not_ordered' ? (
                <div className="mt-2 space-y-2">
                  {timeline.installation_scheduled_date && (() => {
                    const installDate = new Date(timeline.installation_scheduled_date);
                    const now = new Date();
                    const hoursDiff = (installDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                    const canOrder = hoursDiff >= 48;

                    if (!canOrder) {
                      return (
                        <div className="text-sm text-red-600 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Installation must be scheduled at least 48 hours in advance before ordering material
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <button
                    onClick={() => {
                      if (timeline.installation_scheduled_date) {
                        const installDate = new Date(timeline.installation_scheduled_date);
                        const now = new Date();
                        const hoursDiff = (installDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                        if (hoursDiff < 48) {
                          alert('Installation must be scheduled at least 48 hours in advance before ordering material.');
                          return;
                        }
                      }
                      updateTimeline({
                        material_order_status: 'ordered',
                        material_ordered_date: new Date().toISOString()
                      });
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark Material Ordered
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="text-sm text-gray-600">
                    Ordered: <span className="font-medium">{formatDate(timeline.material_ordered_date)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateTimeline({ material_drop_ship_location: 'customer_home' })}
                      disabled={saving}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        timeline.material_drop_ship_location === 'customer_home'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <Home className="w-3 h-3 inline mr-1" />
                      Drop Ship to Home
                    </button>

                    <button
                      onClick={() => updateTimeline({ material_drop_ship_location: 'warehouse' })}
                      disabled={saving}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        timeline.material_drop_ship_location === 'warehouse'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <Warehouse className="w-3 h-3 inline mr-1" />
                      Warehouse Delivery
                    </button>
                  </div>

                  {timeline.material_drop_ship_location === 'customer_home' && (
                    <button
                      onClick={() => updateTimeline({ homeowner_contacted_for_delivery: !timeline.homeowner_contacted_for_delivery })}
                      disabled={saving}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        timeline.homeowner_contacted_for_delivery
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'border-gray-300 text-gray-700 hover:border-green-400'
                      }`}
                    >
                      <Phone className="w-3 h-3" />
                      {timeline.homeowner_contacted_for_delivery ? 'Homeowner Contacted' : 'Contact Homeowner'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* City Inspection */}
        <WorkflowPhase
          title="City Inspection"
          icon={<FileCheck className="w-5 h-5" />}
          status={timeline.inspection_status}
          statusOptions={[
            { value: 'not_ready', label: 'Not Ready' },
            { value: 'ready', label: 'Ready for Inspection' },
            { value: 'scheduled', label: 'Inspection Scheduled' },
            { value: 'passed', label: 'Inspection Passed' },
            { value: 'failed', label: 'Inspection Failed' },
            { value: 'service_required', label: 'Service Required' },
            { value: 'service_completed', label: 'Service Completed - Ready for Inspection', dateField: 'service_completed_date' },
          ]}
          currentDate={
            timeline.inspection_status === 'scheduled' ? timeline.city_inspection_date :
            timeline.inspection_status === 'service_completed' ? timeline.service_completed_date :
            null
          }
          ticket={timeline.inspection_status === 'scheduled' ? tickets.inspectionScheduled : tickets.inspectionCompleted}
          notes={timeline.city_inspection_notes}
          onUpdate={(status, date, notes) => {
            const updates: Partial<ProjectTimeline> = { inspection_status: status };
            if (notes !== undefined) updates.city_inspection_notes = notes;

            if (status === 'passed') {
              updates.city_inspection_status = 'passed';
            } else if (status === 'failed') {
              updates.city_inspection_status = 'failed';
            } else if (status === 'service_completed' && date) {
              updates.service_completed_date = date;
            }
            updateTimeline(updates);
          }}
          saving={saving}
          disabled={timeline.installation_status !== 'completed'}
          autoFromTickets
        />

        {/* PTO */}
        <WorkflowPhase
          title="Permission to Operate (PTO)"
          icon={<Zap className="w-5 h-5" />}
          status={timeline.pto_submitted_date ? (timeline.pto_approved_date ? 'approved' : 'submitted') : 'not_started'}
          statusOptions={[
            { value: 'not_started', label: 'Not Started' },
            { value: 'submitted', label: 'PTO Submitted', dateField: 'pto_submitted_date' },
            { value: 'approved', label: 'PTO Approved', dateField: 'pto_approved_date' },
          ]}
          allDates={{
            pto_submitted_date: timeline.pto_submitted_date,
            pto_approved_date: timeline.pto_approved_date,
          }}
          onUpdate={(status, date) => {
            const updates: Partial<ProjectTimeline> = {};

            if (status === 'submitted' && date) {
              updates.pto_submitted_date = date;
            } else if (status === 'approved') {
              updates.pto_approved_date = date || new Date().toISOString();
            }
            updateTimeline(updates);
          }}
          saving={saving}
          disabled={timeline.inspection_status !== 'passed'}
        />

        {/* System Activation */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className={`mt-1 ${timeline.system_activated_date ? 'text-green-600' : 'text-gray-400'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">System Activated</h4>
                {timeline.system_activated_date && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>

              {timeline.system_activated_date ? (
                <div className="mt-2 text-sm text-gray-600">
                  Activated: <span className="font-medium">{formatDate(timeline.system_activated_date)}</span>
                </div>
              ) : (
                <div className="mt-2">
                  {timeline.pto_approved_date ? (
                    <button
                      onClick={() => updateTimeline({ system_activated_date: new Date().toISOString() })}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark System Activated
                    </button>
                  ) : (
                    <div className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Requires PTO approval first
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type WorkflowPhaseProps = {
  title: string;
  icon: React.ReactNode;
  status: string;
  statusOptions: Array<{ value: string; label: string; dateField?: string; requiresDate?: boolean }>;
  currentDate?: string | null;
  allDates?: Record<string, string | null>;
  ticket?: any;
  notes?: string | null;
  onUpdate: (status: string, date?: string | null, notes?: string) => void;
  saving?: boolean;
  disabled?: boolean;
  autoFromTickets?: boolean;
  installationValidation?: () => boolean;
};

function WorkflowPhase({
  title,
  icon,
  status,
  statusOptions,
  currentDate,
  allDates,
  ticket,
  notes,
  onUpdate,
  saving,
  disabled,
  autoFromTickets,
  installationValidation,
}: WorkflowPhaseProps) {
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [dateValue, setDateValue] = useState('');
  const [notesValue, setNotesValue] = useState(notes || '');
  const [showNotes, setShowNotes] = useState(false);

  const currentOption = statusOptions.find(opt => opt.value === status);
  const selectedOption = statusOptions.find(opt => opt.value === selectedStatus);
  const isComplete = statusOptions[statusOptions.length - 1].value === status;

  const handleUpdate = () => {
    if (!autoFromTickets && selectedOption?.requiresDate && !dateValue) {
      alert('Please select a date for this status');
      return;
    }
    if (installationValidation && !installationValidation()) {
      alert('Installation date must be at least 48 hours in advance to allow time for material ordering.');
      return;
    }

    const formattedDate = dateValue ? new Date(dateValue + 'T00:00:00').toISOString() : null;
    onUpdate(selectedStatus, formattedDate, showNotes ? notesValue : undefined);
    setDateValue('');
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${disabled ? 'opacity-50' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${isComplete ? 'text-green-600' : disabled ? 'text-gray-300' : 'text-gray-400'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">{title}</h4>
            {isComplete && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {disabled && <XCircle className="w-5 h-5 text-gray-400" />}
          </div>

          {allDates ? (
            <div className="mb-3 space-y-1">
              {statusOptions.map((option) => {
                const dateFieldValue = option.dateField ? allDates[option.dateField] : null;
                if (dateFieldValue) {
                  return (
                    <div key={option.value} className="text-sm text-gray-600">
                      {option.label}: <span className="font-medium">{formatDate(dateFieldValue)}</span>
                    </div>
                  );
                }
                return null;
              })}
              {ticket && ticket.assigned_technicians && ticket.assigned_technicians.length > 0 && (
                <div className="text-sm text-gray-600 mt-1">
                  Technicians: <span className="font-medium">{ticket.assigned_technicians.join(', ')}</span>
                </div>
              )}
            </div>
          ) : currentOption && currentDate && (
            <div className="mb-3">
              <div className="text-sm text-gray-600">
                {currentOption.label}: <span className="font-medium">{formatDate(currentDate)}</span>
              </div>
              {ticket && ticket.assigned_technicians && ticket.assigned_technicians.length > 0 && (
                <div className="text-sm text-gray-600 mt-1">
                  Technicians: <span className="font-medium">{ticket.assigned_technicians.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {autoFromTickets && (
            <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
              Dates and technicians automatically update from tickets
            </div>
          )}

          {notes && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
              <strong>Notes:</strong> {notes}
            </div>
          )}

          {!disabled && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedStatus(option.value)}
                    disabled={saving}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      selectedStatus === option.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : status === option.value
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:border-blue-400'
                    }`}
                  >
                    {option.label}
                    {status === option.value && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                  </button>
                ))}
              </div>

              {!autoFromTickets && selectedOption?.dateField && (
                <div>
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {showNotes ? 'Hide Notes' : 'Add Notes'}
                </button>
              </div>

              {showNotes && (
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add notes about this phase..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}

              {selectedStatus !== status && (
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Update Status
                </button>
              )}
            </div>
          )}

          {disabled && (
            <div className="text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Complete previous steps first
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
