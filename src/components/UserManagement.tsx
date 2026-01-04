import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Mail, Phone, User, Shield, Loader2, Edit2, Trash2, Briefcase, Upload, Hash, Users, DollarSign } from 'lucide-react';

type RoleCategory = 'employee' | 'management' | 'field_tech' | 'admin';

type AppUser = {
  id: string;
  custom_id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  role_category: RoleCategory;
  status: 'active' | 'inactive';
  photo_url: string | null;
  reporting_manager_id: string | null;
  created_at: string;
  updated_at: string;
};

const ROLE_OPTIONS = {
  employee: [
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'procurement', label: 'Procurement' },
    { value: 'scheduling', label: 'Scheduling' },
    { value: 'sales_rep', label: 'Sales Representative' },
  ],
  management: [
    { value: 'field_ops_manager', label: 'Field Ops Manager' },
    { value: 'office_manager', label: 'Office Manager' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'procurement_manager', label: 'Procurement Manager' },
    { value: 'roof_lead', label: 'Roof Lead' },
    { value: 'foreman', label: 'Foreman' },
    { value: 'sales_manager', label: 'Sales Manager' },
  ],
  field_tech: [
    { value: 'battery_tech', label: 'Battery Tech' },
    { value: 'service_tech', label: 'Service Tech' },
    { value: 'journeyman_electrician', label: 'Journeyman Electrician' },
    { value: 'master_electrician', label: 'Master Electrician' },
    { value: 'apprentice_electrician', label: 'Apprentice Electrician' },
    { value: 'residential_wireman', label: 'Residential Wireman' },
    { value: 'pv_installer', label: 'PV Installer' },
  ],
  admin: [
    { value: 'admin', label: 'Admin' },
  ],
};

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState({
    custom_id: '',
    email: '',
    full_name: '',
    phone: '',
    role_category: 'employee' as RoleCategory,
    role: 'customer_service',
    status: 'active' as AppUser['status'],
    photo_url: null as string | null,
    reporting_manager_id: null as string | null,
    hourly_rate: 0,
    is_salary: false,
    battery_pay_rates: {} as Record<string, number>,
    per_watt_rate: 0,
    ppw_redline: 0,
  });
  const [sendInvite, setSendInvite] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managers, setManagers] = useState<AppUser[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchManagers();
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [formData.role]);

  const fetchManagers = async () => {
    try {
      let query = supabase
        .from('app_users')
        .select('*')
        .eq('status', 'active');

      if (formData.role === 'sales_rep') {
        query = query.eq('role', 'sales_manager');
      } else {
        query = query.eq('role_category', 'management');
      }

      const { data, error: fetchError } = await query.order('full_name', { ascending: true });

      if (fetchError) throw fetchError;
      setManagers(data || []);
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };

  const generateEmployeeId = async (): Promise<string> => {
    const { data, error: fetchError } = await supabase
      .from('app_users')
      .select('custom_id')
      .not('custom_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error('Error fetching IDs:', fetchError);
      return 'EMP-001';
    }

    let maxNum = 0;
    if (data && data.length > 0) {
      data.forEach(user => {
        if (user.custom_id) {
          const match = user.custom_id.match(/EMP-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });
    }

    const nextNum = maxNum + 1;
    return `EMP-${String(nextNum).padStart(3, '0')}`;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('app_users')
        .select('id, custom_id, email, full_name, phone, role, role_category, status, photo_url, reporting_manager_id, created_at, updated_at, hourly_rate, is_salary, battery_pay_rates, per_watt_rate, ppw_redline')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB');
        return;
      }

      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setError('Photo must be a JPEG, PNG, GIF, or WebP image');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('user-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const createAuthUser = async (email: string, password: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-auth-user`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create auth user');
      }

      return await response.json();
    } catch (err) {
      console.error('Error creating auth user:', err);
      throw err;
    }
  };

  const sendInviteEmail = async (email: string, fullName: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-invite`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, fullName }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invite email');
      }
    } catch (err) {
      console.error('Error sending invite email:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (formData.role === 'sales_rep') {
        if (!formData.reporting_manager_id) {
          setError('Manager is required for Sales Representatives');
          setSubmitting(false);
          return;
        }
        if (!formData.ppw_redline || formData.ppw_redline <= 0) {
          setError('PPW Redline is required for Sales Representatives');
          setSubmitting(false);
          return;
        }
      }

      if (formData.role === 'sales_manager') {
        if (!formData.ppw_redline || formData.ppw_redline <= 0) {
          setError('PPW Redline is required for Sales Managers');
          setSubmitting(false);
          return;
        }
      }

      let photoUrl = formData.photo_url;
      let employeeId = formData.custom_id;

      // Auto-generate employee ID if not provided and not editing
      if (!editingUser && !employeeId) {
        employeeId = await generateEmployeeId();
      }

      if (photoFile) {
        setUploadingPhoto(true);
        photoUrl = await uploadPhoto(photoFile);
        setUploadingPhoto(false);
      }

      if (editingUser) {
        const { error: updateError } = await supabase
          .from('app_users')
          .update({
            custom_id: employeeId || null,
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone,
            role_category: formData.role_category,
            role: formData.role,
            status: formData.status,
            photo_url: photoUrl,
            reporting_manager_id: formData.reporting_manager_id || null,
            hourly_rate: formData.hourly_rate,
            is_salary: formData.is_salary,
            battery_pay_rates: formData.battery_pay_rates,
            per_watt_rate: formData.per_watt_rate,
            ppw_redline: formData.ppw_redline || null,
          })
          .eq('id', editingUser.id);

        if (updateError) throw updateError;
      } else {
        const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

        await createAuthUser(formData.email, tempPassword);

        const { error: insertError } = await supabase
          .from('app_users')
          .insert([{
            custom_id: employeeId || null,
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone,
            role_category: formData.role_category,
            role: formData.role,
            status: formData.status,
            photo_url: photoUrl,
            reporting_manager_id: formData.reporting_manager_id || null,
            hourly_rate: formData.hourly_rate,
            is_salary: formData.is_salary,
            battery_pay_rates: formData.battery_pay_rates,
            per_watt_rate: formData.per_watt_rate,
            ppw_redline: formData.ppw_redline || null,
          }]);

        if (insertError) throw insertError;

        if (sendInvite) {
          try {
            await sendInviteEmail(formData.email, formData.full_name);
          } catch (emailErr) {
            console.error('Failed to send invite email:', emailErr);
          }
        }
      }

      setFormData({
        custom_id: '',
        email: '',
        full_name: '',
        phone: '',
        role_category: 'employee',
        role: 'customer_service',
        status: 'active',
        photo_url: null,
        reporting_manager_id: null,
        hourly_rate: 0,
        is_salary: false,
        battery_pay_rates: {},
        per_watt_rate: 0,
        ppw_redline: 0,
      });
      setSendInvite(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowForm(false);
      setEditingUser(null);
      await fetchUsers();
      await fetchManagers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
    }
  };

  const handleEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      custom_id: user.custom_id || '',
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role_category: user.role_category,
      role: user.role,
      status: user.status,
      photo_url: user.photo_url,
      reporting_manager_id: user.reporting_manager_id,
      hourly_rate: (user as any).hourly_rate || 0,
      is_salary: (user as any).is_salary || false,
      battery_pay_rates: (user as any).battery_pay_rates || {},
      per_watt_rate: (user as any).per_watt_rate || 0,
      ppw_redline: (user as any).ppw_redline || 0,
    });
    setPhotoPreview(user.photo_url);
    setPhotoFile(null);
    setSendInvite(false);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('app_users')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      custom_id: '',
      email: '',
      full_name: '',
      phone: '',
      role_category: 'employee',
      role: 'customer_service',
      status: 'active',
      photo_url: null,
      reporting_manager_id: null,
      hourly_rate: 0,
      is_salary: false,
      battery_pay_rates: {},
      per_watt_rate: 0,
      ppw_redline: 0,
    });
    setSendInvite(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
  };

  const getRoleBadgeColor = (category: RoleCategory) => {
    switch (category) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'management':
        return 'bg-purple-100 text-purple-800';
      case 'field_tech':
        return 'bg-green-100 text-green-800';
      case 'employee':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    for (const category of Object.keys(ROLE_OPTIONS)) {
      const roleOption = ROLE_OPTIONS[category as RoleCategory].find(r => r.value === role);
      if (roleOption) return roleOption.label;
    }
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCategoryLabel = (category: RoleCategory) => {
    switch (category) {
      case 'employee':
        return 'Employee';
      case 'management':
        return 'Management';
      case 'field_tech':
        return 'Field Tech';
      case 'admin':
        return 'Admin';
      default:
        return category;
    }
  };

  const handleCategoryChange = (category: RoleCategory) => {
    const firstRoleInCategory = ROLE_OPTIONS[category][0].value;
    setFormData({
      ...formData,
      role_category: category,
      role: firstRoleInCategory,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
            <p className="text-xs text-gray-500 mt-0.5">Create and manage user logins</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add User
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-3">
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>

              {error && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Employee ID {!editingUser && <span className="text-gray-400">(auto-generated if empty)</span>}
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.custom_id}
                        onChange={(e) => setFormData({ ...formData, custom_id: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="EMP-001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Role Category *
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        required
                        value={formData.role_category}
                        onChange={(e) => handleCategoryChange(e.target.value as RoleCategory)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="employee">Employee</option>
                        <option value="management">Management</option>
                        <option value="field_tech">Field Tech</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Specific Role *
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        {ROLE_OPTIONS[formData.role_category]?.map((roleOption) => (
                          <option key={roleOption.value} value={roleOption.value}>
                            {roleOption.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as AppUser['status'] })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {formData.role !== 'sales_rep' && formData.role !== 'sales_manager' && (
                    <div className="col-span-2 border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Compensation</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input
                              type="checkbox"
                              checked={formData.is_salary}
                              onChange={(e) => setFormData({ ...formData, is_salary: e.target.checked, hourly_rate: e.target.checked ? 0 : formData.hourly_rate })}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Salaried Employee
                            </span>
                          </label>
                        </div>

                        {!formData.is_salary && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Hourly Rate *
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required={!formData.is_salary}
                                value={formData.hourly_rate}
                                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Enter the hourly wage for this employee
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(formData.role === 'battery_tech' || formData.role === 'journeyman_electrician' || formData.role === 'master_electrician' || formData.role === 'apprentice_electrician' || formData.role === 'residential_wireman' || formData.role === 'service_tech') && (
                    <div className="col-span-2 border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Battery Pay Rates</h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Configure pay per job based on number of batteries installed
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            1 Battery
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.battery_pay_rates['1'] || 0}
                              onChange={(e) => setFormData({ ...formData, battery_pay_rates: { ...formData.battery_pay_rates, '1': parseFloat(e.target.value) || 0 } })}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="500.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            2 Batteries
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.battery_pay_rates['2'] || 0}
                              onChange={(e) => setFormData({ ...formData, battery_pay_rates: { ...formData.battery_pay_rates, '2': parseFloat(e.target.value) || 0 } })}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="700.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            3 Batteries
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.battery_pay_rates['3'] || 0}
                              onChange={(e) => setFormData({ ...formData, battery_pay_rates: { ...formData.battery_pay_rates, '3': parseFloat(e.target.value) || 0 } })}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="800.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            4+ Batteries
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.battery_pay_rates['4+'] || 0}
                              onChange={(e) => setFormData({ ...formData, battery_pay_rates: { ...formData.battery_pay_rates, '4+': parseFloat(e.target.value) || 0 } })}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="900.00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(formData.role === 'battery_tech' || formData.role === 'journeyman_electrician' || formData.role === 'master_electrician' || formData.role === 'apprentice_electrician' || formData.role === 'residential_wireman' || formData.role === 'service_tech' || formData.role === 'pv_installer') && (
                    <div className="col-span-2 border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Per-Watt Pay Rate</h3>
                      <p className="text-xs text-gray-500 mb-3">
                        {(formData.role === 'battery_tech' || formData.role === 'journeyman_electrician' || formData.role === 'master_electrician' || formData.role === 'apprentice_electrician' || formData.role === 'residential_wireman' || formData.role === 'service_tech')
                          ? 'Pay per watt for jobs WITHOUT batteries (e.g., $0.05 per watt). Jobs with batteries use battery pay instead.'
                          : 'Pay per watt for all installations (e.g., $0.05 per watt)'}
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rate per Watt ($)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.per_watt_rate}
                            onChange={(e) => setFormData({ ...formData, per_watt_rate: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.05"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Total pay = System size (W) × per-watt rate
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.role === 'sales_rep' && (
                    <div className="col-span-2 border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Sales Rep Configuration</h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Required fields for sales representatives
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            <Users className="w-4 h-4 inline mr-1" />
                            Sales Manager *
                          </label>
                          <select
                            required={formData.role === 'sales_rep'}
                            value={formData.reporting_manager_id || ''}
                            onChange={(e) => setFormData({ ...formData, reporting_manager_id: e.target.value || null })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                          >
                            <option value="">Select Sales Manager</option>
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.full_name} - {getRoleLabel(manager.role)}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Sales rep must have a sales manager
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            PPW Redline ($) *
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required={formData.role === 'sales_rep'}
                              value={formData.ppw_redline}
                              onChange={(e) => setFormData({ ...formData, ppw_redline: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="2.50"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Price per watt for commission calculation
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>Commission Formula:</strong> (PPW × System Size) - EPC Gross Total = Final Commission
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.role === 'sales_manager' && (
                    <div className="col-span-2 border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Sales Manager Configuration</h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Configure your PPW redline for override calculation
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Manager PPW Redline ($) *
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required={formData.role === 'sales_manager'}
                              value={formData.ppw_redline}
                              onChange={(e) => setFormData({ ...formData, ppw_redline: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="2.40"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Base PPW for calculating overrides from sales reps
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-800">
                          <strong>Override Calculation:</strong> Sales Rep PPW - Manager PPW = Override per Watt
                        </p>
                        <p className="text-xs text-green-800 mt-1">
                          <strong>Example:</strong> Rep PPW $2.50 - Manager PPW $2.40 = $0.10 override per watt
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.role !== 'sales_rep' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Reporting Manager
                      </label>
                      <select
                        value={formData.reporting_manager_id || ''}
                        onChange={(e) => setFormData({ ...formData, reporting_manager_id: e.target.value || null })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="">No Manager</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.full_name} - {getRoleLabel(manager.role)}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the manager this employee reports to
                      </p>
                    </div>
                  )}
                </div>

                {!editingUser && (
                  <div className="border-t border-gray-200 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendInvite}
                        onChange={(e) => setSendInvite(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Send invitation email to this user
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      User will receive an email with instructions to create their account
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Profile Photo
                  </label>
                  <div className="flex items-center gap-4">
                    {photoPreview && (
                      <div className="flex-shrink-0">
                        <img
                          src={photoPreview}
                          alt="Profile preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer border border-gray-300">
                        <Upload className="w-4 h-4" />
                        {photoPreview ? 'Change Photo' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, or WebP. Max 5MB.
                      </p>
                    </div>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          setFormData({ ...formData, photo_url: null });
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {uploadingPhoto && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading photo...
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>{editingUser ? 'Update User' : 'Create User'}</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">All Users</h3>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
                <p className="text-gray-500">Add your first user to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all"
                  >
                    <div className="flex gap-3 mb-2">
                      {user.photo_url ? (
                        <img
                          src={user.photo_url}
                          alt={user.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 mb-0.5">
                              {user.full_name}
                            </h3>
                            {user.custom_id && (
                              <p className="text-xs text-gray-500 mb-1">ID: {user.custom_id}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role_category)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {getCategoryLabel(user.role_category)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 ml-19">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        Added {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
