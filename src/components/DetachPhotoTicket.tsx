import { useState, useEffect, useRef } from 'react';
import { X, Camera, CheckCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type DetachPhotoTicketProps = {
  ticketId: string;
  onClose: () => void;
};

type PhotoItem = {
  id: string;
  label: string;
  isChecked: boolean;
  photos: string[];
};

const DETACH_PHOTOS = [
  'Front of Home',
  'Electrical Step Back',
  'Inverter/Combiner (Open)',
  'Inverter/Combiner (Labels)',
  'Verify Strings (DC)',
  'Verify System Operational',
  'All Arrays before Detach',
  'Existing Damages',
  'Existing Fire Setbacks',
  'Panels Removed (Racking Only)',
  'J-Box Open',
  'Removal Layout (Draw a String Diagram)',
  'Footing Photo (Upclose)',
];

export default function DetachPhotoTicket({ ticketId, onClose }: DetachPhotoTicketProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [footingBrand, setFootingBrand] = useState('');
  const [footingQuantity, setFootingQuantity] = useState('');
  const [additionalMaterial, setAdditionalMaterial] = useState('');
  const [critterGuard, setCritterGuard] = useState<'yes' | 'no' | ''>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    loadPhotoStatus();
  }, [ticketId]);

  const loadPhotoStatus = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('detach_photos')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const checkedPhotos = new Set(data?.checked_photos || []);
      const photoUrls = data?.photo_urls || {};

      setPhotos(DETACH_PHOTOS.map((label, idx) => ({
        id: `detach_${idx}`,
        label,
        isChecked: checkedPhotos.has(`detach_${idx}`),
        photos: photoUrls[`detach_${idx}`] || [],
      })));

      setFootingBrand(data?.footing_brand || '');
      setFootingQuantity(data?.footing_quantity || '');
      setAdditionalMaterial(data?.additional_material || '');
      setCritterGuard(data?.critter_guard || '');
    } catch (err) {
      console.error('Error loading photo status:', err);
      initializePhotos();
    } finally {
      setLoading(false);
    }
  };

  const initializePhotos = () => {
    setPhotos(DETACH_PHOTOS.map((label, idx) => ({
      id: `detach_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));
  };

  const saveToDatabase = async () => {
    try {
      const allCheckedPhotos = photos.filter(p => p.isChecked).map(p => p.id);

      const allPhotoUrls: { [key: string]: string[] } = {};
      photos.forEach(photo => {
        if (photo.photos.length > 0) {
          allPhotoUrls[photo.id] = photo.photos;
        }
      });

      const { error } = await supabase
        .from('detach_photos')
        .upsert({
          ticket_id: ticketId,
          checked_photos: allCheckedPhotos,
          photo_urls: allPhotoUrls,
          footing_brand: footingBrand,
          footing_quantity: footingQuantity,
          additional_material: additionalMaterial,
          critter_guard: critterGuard,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'ticket_id'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving photo status:', err);
    }
  };

  const handlePhotoUpload = async (photoId: string, file: File) => {
    try {
      setUploading(photoId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${photoId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('detach-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('detach-photos')
        .getPublicUrl(fileName);

      setPhotos(prev =>
        prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
      );

      setTimeout(saveToDatabase, 100);
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      const fileName = photoUrl.split('/detach-photos/')[1];
      if (fileName) {
        await supabase.storage.from('detach-photos').remove([fileName]);
      }

      setPhotos(prev =>
        prev.map(p => p.id === photoId ? { ...p, photos: p.photos.filter(url => url !== photoUrl) } : p)
      );

      setTimeout(saveToDatabase, 100);
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const handleFileSelect = (photoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(photoId, file);
    }
  };

  const handleCheckboxChange = (photoId: string) => {
    setPhotos(prev =>
      prev.map(p => p.id === photoId ? { ...p, isChecked: !p.isChecked } : p)
    );
    setTimeout(saveToDatabase, 100);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Detach Photo Ticket</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detach Photos</h3>
              <div className="space-y-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={photo.isChecked}
                        onChange={() => handleCheckboxChange(photo.id)}
                        className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <label className="font-medium text-gray-900">{photo.label}</label>
                        {photo.isChecked && (
                          <CheckCircle className="inline-block ml-2 w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRefs.current[photo.id]?.click()}
                        disabled={uploading === photo.id}
                        className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {uploading === photo.id ? (
                          'Uploading...'
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            Add Photo
                          </>
                        )}
                      </button>
                      <input
                        ref={el => fileInputRefs.current[photo.id] = el}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileSelect(photo.id, e)}
                        className="hidden"
                      />
                    </div>

                    {photo.photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        {photo.photos.map((photoUrl, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={photoUrl}
                              alt={`${photo.label} ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => handleDeletePhoto(photo.id, photoUrl)}
                              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Footing Brand
                  </label>
                  <input
                    type="text"
                    value={footingBrand}
                    onChange={(e) => {
                      setFootingBrand(e.target.value);
                      setTimeout(saveToDatabase, 500);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter footing brand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Footing Quantity
                  </label>
                  <input
                    type="text"
                    value={footingQuantity}
                    onChange={(e) => {
                      setFootingQuantity(e.target.value);
                      setTimeout(saveToDatabase, 500);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter footing quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Material Needed for Reset
                  </label>
                  <textarea
                    value={additionalMaterial}
                    onChange={(e) => {
                      setAdditionalMaterial(e.target.value);
                      setTimeout(saveToDatabase, 500);
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="List any additional materials needed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Critter Guard?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="yes"
                        checked={critterGuard === 'yes'}
                        onChange={(e) => {
                          setCritterGuard(e.target.value as 'yes' | 'no');
                          setTimeout(saveToDatabase, 100);
                        }}
                        className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="ml-2">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="no"
                        checked={critterGuard === 'no'}
                        onChange={(e) => {
                          setCritterGuard(e.target.value as 'yes' | 'no');
                          setTimeout(saveToDatabase, 100);
                        }}
                        className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="ml-2">No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
