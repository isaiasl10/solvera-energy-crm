import { useState, useEffect } from 'react';
import { X, Camera, CheckCircle, AlertCircle, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type InspectionPhotoTicketProps = {
  ticketId: string;
  onClose: () => void;
};

type InspectionData = {
  id?: string;
  status: 'passed' | 'failed';
  passed_photo_url: string | null;
  failed_reason: string | null;
  failed_photo_url: string | null;
  correction_photo_url: string | null;
};

export default function InspectionPhotoTicket({ ticketId, onClose }: InspectionPhotoTicketProps) {
  const [inspectionData, setInspectionData] = useState<InspectionData>({
    status: 'passed',
    passed_photo_url: null,
    failed_reason: null,
    failed_photo_url: null,
    correction_photo_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    loadInspectionData();
  }, [ticketId]);

  const loadInspectionData = async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_photos')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setInspectionData({
          id: data.id,
          status: data.status || 'passed',
          passed_photo_url: data.passed_photo_url,
          failed_reason: data.failed_reason,
          failed_photo_url: data.failed_photo_url,
          correction_photo_url: data.correction_photo_url,
        });
      }
    } catch (error) {
      console.error('Error loading inspection data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    photoType: 'passed' | 'failed' | 'correction'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(photoType);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${photoType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(fileName);

      setInspectionData(prev => ({
        ...prev,
        [`${photoType}_photo_url`]: publicUrl,
      }));
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploading(null);
    }
  };

  const handleDeletePhoto = async (photoType: 'passed' | 'failed' | 'correction') => {
    const urlKey = `${photoType}_photo_url` as keyof InspectionData;
    const photoUrl = inspectionData[urlKey] as string | null;

    if (!photoUrl) return;

    try {
      const urlParts = photoUrl.split('/inspection-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('inspection-photos').remove([filePath]);
      }

      setInspectionData(prev => ({
        ...prev,
        [urlKey]: null,
      }));
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ticket_id: ticketId,
        status: inspectionData.status,
        passed_photo_url: inspectionData.passed_photo_url,
        failed_reason: inspectionData.failed_reason,
        failed_photo_url: inspectionData.failed_photo_url,
        correction_photo_url: inspectionData.correction_photo_url,
        updated_at: new Date().toISOString(),
      };

      if (inspectionData.id) {
        const { error } = await supabase
          .from('inspection_photos')
          .update(dataToSave)
          .eq('id', inspectionData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inspection_photos')
          .insert([dataToSave]);

        if (error) throw error;
      }

      alert('Inspection data saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving inspection data:', error);
      alert('Failed to save inspection data');
    } finally {
      setSaving(false);
    }
  };

  const PhotoUploadSection = ({
    label,
    photoType,
    photoUrl,
    required = false,
  }: {
    label: string;
    photoType: 'passed' | 'failed' | 'correction';
    photoUrl: string | null;
    required?: boolean;
  }) => (
    <div className="border border-gray-300 rounded-lg p-4">
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {photoUrl ? (
        <div className="space-y-2">
          <img
            src={photoUrl}
            alt={label}
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="flex gap-2">
            <label className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-center text-sm font-medium">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, photoType)}
                className="hidden"
                disabled={uploading === photoType}
              />
              {uploading === photoType ? 'Uploading...' : 'Replace Photo'}
            </label>
            <button
              type="button"
              onClick={() => handleDeletePhoto(photoType)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              disabled={uploading === photoType}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-50">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload(e, photoType)}
            className="hidden"
            disabled={uploading === photoType}
          />
          {uploading === photoType ? (
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600 animate-bounce" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="text-center">
              <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Click to upload photo</p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP up to 10MB</p>
            </div>
          )}
        </label>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">City Inspection Photos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Inspection Documentation</p>
                <p>Upload photos of the inspection results. Select whether the inspection passed or failed, then upload the required documentation.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Inspection Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInspectionData(prev => ({ ...prev, status: 'passed' }))}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  inspectionData.status === 'passed'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Passed</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectionData(prev => ({ ...prev, status: 'failed' }))}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  inspectionData.status === 'failed'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Failed</span>
              </button>
            </div>
          </div>

          {inspectionData.status === 'passed' ? (
            <PhotoUploadSection
              label="Passed Inspection Photo"
              photoType="passed"
              photoUrl={inspectionData.passed_photo_url}
              required
            />
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Reason for Failure <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={inspectionData.failed_reason || ''}
                  onChange={(e) => setInspectionData(prev => ({ ...prev, failed_reason: e.target.value }))}
                  placeholder="Describe what failed the inspection..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <PhotoUploadSection
                label="Photo of What Failed"
                photoType="failed"
                photoUrl={inspectionData.failed_photo_url}
                required
              />

              <PhotoUploadSection
                label="Photo of Corrections Made"
                photoType="correction"
                photoUrl={inspectionData.correction_photo_url}
              />
            </>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading !== null}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Saving...' : 'Save Inspection Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
