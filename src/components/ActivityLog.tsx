import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Clock, User, FileEdit, AlertCircle } from 'lucide-react';

type ActivityLogEntry = {
  id: string;
  customer_id: string;
  user_id: string | null;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string;
  created_at: string;
  user_name?: string;
};

type ActivityLogProps = {
  customerId: string;
};

export default function ActivityLog({ customerId }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    loadActivities();

    const subscription = supabase
      .channel(`project_activity:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_activity_log',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [customerId]);

  const loadActivities = async () => {
    try {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('project_activity_log')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      const userIds = [...new Set(activitiesData?.map(a => a.user_id).filter(Boolean) || [])];
      const { data: usersData } = await supabase
        .from('app_users')
        .select('id, full_name')
        .in('id', userIds);

      const usersMap = new Map(usersData?.map(u => [u.id, u.full_name]) || []);

      const activitiesWithNames = activitiesData?.map(activity => ({
        ...activity,
        user_name: activity.user_id ? usersMap.get(activity.user_id) || 'Unknown User' : 'System',
      })) || [];

      setActivities(activitiesWithNames);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} minute${Math.floor(diffInMinutes) !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)} day${Math.floor(diffInDays) !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const getFilteredActivities = () => {
    const now = new Date();
    return activities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      const diffInHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);

      if (filter === 'today') {
        return diffInHours < 24;
      } else if (filter === 'week') {
        return diffInHours < 168;
      }
      return true;
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return <FileEdit className="w-4 h-4 text-green-600" />;
      case 'update':
        return <FileEdit className="w-4 h-4 text-blue-600" />;
      case 'status_change':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredActivities = getFilteredActivities();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading activity log...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
          <span className="text-sm text-gray-500">({filteredActivities.length} entries)</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              filter === 'week'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              filter === 'today'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No activity to display for this filter.</p>
          </div>
        ) : (
          filteredActivities.map((activity, index) => (
            <div
              key={activity.id}
              className={`flex gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${
                index === 0 ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {getActionIcon(activity.action_type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 mb-1">{activity.description}</p>

                {activity.field_name && (activity.old_value || activity.new_value) && (
                  <div className="text-xs text-gray-600 space-y-1 mt-2 bg-gray-100 rounded p-2">
                    {activity.old_value && (
                      <div>
                        <span className="font-semibold">Previous:</span> {activity.old_value}
                      </div>
                    )}
                    {activity.new_value && (
                      <div>
                        <span className="font-semibold">New:</span> {activity.new_value}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{activity.user_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(activity.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
