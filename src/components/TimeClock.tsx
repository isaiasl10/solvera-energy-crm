import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, MapPin, DollarSign, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type TimeEntry = {
  id: string;
  clock_in_time: string;
  clock_in_latitude: number;
  clock_in_longitude: number;
  clock_out_time: string | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  total_hours: number | null;
  customer_id: string | null;
};

type UserInfo = {
  hourly_rate: number;
  is_salary: boolean;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
};

export default function TimeClock() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockkingIn] = useState(false);
  const [clockingOut, setClockkingOut] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [weekEntries, setWeekEntries] = useState<TimeEntry[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo & { id: string }>({ id: '', hourly_rate: 0, is_salary: false });
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('app_users')
        .select('id, hourly_rate, is_salary')
        .eq('email', user?.email)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        setError('User not found in database');
        setLoading(false);
        return;
      }

      setUserInfo(userData);

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, full_name')
        .order('full_name', { ascending: true });

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      const { data: currentData, error: currentError } = await supabase
        .from('time_clock')
        .select('*')
        .eq('user_id', userData.id)
        .is('clock_out_time', null)
        .maybeSingle();

      if (currentError && currentError.code !== 'PGRST116') throw currentError;
      setCurrentEntry(currentData);

      const startOfWeek = getStartOfWeek();
      const { data: weekData, error: weekError } = await supabase
        .from('time_clock')
        .select('*')
        .eq('user_id', userData.id)
        .gte('clock_in_time', startOfWeek.toISOString())
        .order('clock_in_time', { ascending: false });

      if (weekError) throw weekError;
      setWeekEntries(weekData || []);
    } catch (err) {
      console.error('Error loading time clock data:', err);
      setError('Failed to load time clock data');
    } finally {
      setLoading(false);
    }
  };

  const getStartOfWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    return new Date(now.setDate(diff));
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleClockIn = async () => {
    setError(null);
    setLocationError(null);

    if (!selectedCustomerId) {
      setError('Please select a customer before clocking in');
      return;
    }

    setClockkingIn(true);

    try {
      const location = await getCurrentLocation();

      const { data, error } = await supabase
        .from('time_clock')
        .insert({
          user_id: userInfo.id,
          customer_id: selectedCustomerId,
          clock_in_time: new Date().toISOString(),
          clock_in_latitude: location.latitude,
          clock_in_longitude: location.longitude,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      setSelectedCustomerId('');
      await loadData();
    } catch (err: any) {
      console.error('Error clocking in:', err);
      if (err.message && err.message.includes('geolocation')) {
        setLocationError('Unable to get your location. Please enable location services.');
      } else {
        setError('Failed to clock in');
      }
    } finally {
      setClockkingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    setError(null);
    setLocationError(null);
    setClockkingOut(true);

    try {
      const location = await getCurrentLocation();
      const clockOutTime = new Date();
      const clockInTime = new Date(currentEntry.clock_in_time);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('time_clock')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          clock_out_latitude: location.latitude,
          clock_out_longitude: location.longitude,
          total_hours: hoursWorked,
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      setCurrentEntry(null);
      await loadData();
    } catch (err: any) {
      console.error('Error clocking out:', err);
      if (err.message && err.message.includes('geolocation')) {
        setLocationError('Unable to get your location. Please enable location services.');
      } else {
        setError('Failed to clock out');
      }
    } finally {
      setClockkingOut(false);
    }
  };

  const calculateWeekHours = () => {
    return weekEntries.reduce((total, entry) => {
      if (entry.total_hours) {
        return total + entry.total_hours;
      }
      return total;
    }, 0);
  };

  const calculateEstimatedPay = () => {
    const weekHours = calculateWeekHours();
    return weekHours * userInfo.hourly_rate;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (userInfo.is_salary) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Salaried Employee</h3>
        <p className="text-sm text-blue-700">Time clock is not applicable for salaried employees</p>
      </div>
    );
  }

  const weekHours = calculateWeekHours();
  const estimatedPay = calculateEstimatedPay();

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {locationError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm flex items-start gap-2">
          <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Location Required</p>
            <p className="text-xs mt-1">{locationError}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <Clock className="w-16 h-16 text-orange-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">Time Clock</h2>
          <p className="text-sm text-gray-600 mt-1">
            {currentEntry ? 'Currently clocked in' : 'Clock in to start tracking time'}
          </p>
        </div>

        {currentEntry && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-900">Clocked In</p>
                <p className="text-xs text-green-700 mt-1">
                  {formatTime(currentEntry.clock_in_time)} on {formatDate(currentEntry.clock_in_time)}
                </p>
                {currentEntry.customer_id && (
                  <p className="text-xs text-green-600 mt-1">
                    Working on: {customers.find(c => c.id === currentEntry.customer_id)?.full_name || 'Unknown Customer'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-green-700">
                <MapPin className="w-4 h-4" />
                <span className="text-xs">Location recorded</span>
              </div>
            </div>
          </div>
        )}

        {!currentEntry && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Customer/Project
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-4">
          {!currentEntry ? (
            <button
              onClick={handleClockIn}
              disabled={clockingIn || !selectedCustomerId}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {clockingIn ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Clocking In...
                </>
              ) : (
                <>
                  <Clock className="w-6 h-6" />
                  Clock In
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleClockOut}
              disabled={clockingOut}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {clockingOut ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Clocking Out...
                </>
              ) : (
                <>
                  <Clock className="w-6 h-6" />
                  Clock Out
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Hourly Rate</p>
              <p className="text-xl font-bold text-gray-900">${userInfo.hourly_rate.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Hours This Week</p>
              <p className="text-xl font-bold text-gray-900">{weekHours.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Estimated Paycheck</p>
              <p className="text-xl font-bold text-gray-900">${estimatedPay.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          This Week's Entries
        </h3>

        {weekEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No time entries for this week
          </div>
        ) : (
          <div className="space-y-2">
            {weekEntries.map((entry) => {
              const customer = customers.find(c => c.id === entry.customer_id);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(entry.clock_in_time)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatTime(entry.clock_in_time)} - {entry.clock_out_time ? formatTime(entry.clock_out_time) : 'In Progress'}
                    </p>
                    {customer && (
                      <p className="text-xs text-orange-600 font-medium mt-1">
                        {customer.full_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.total_hours ? (
                      <>
                        <p className="text-sm font-bold text-gray-900">
                          {entry.total_hours.toFixed(2)} hrs
                        </p>
                        <p className="text-xs text-green-600 font-semibold">
                          ${(entry.total_hours * userInfo.hourly_rate).toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-yellow-600 font-semibold">Active</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
