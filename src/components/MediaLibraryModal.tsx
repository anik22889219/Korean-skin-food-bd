import React, { useState, useEffect } from 'react';
import { cloudinaryService, CloudinaryImage } from '../services/cloudinaryService';
import { X, Search, Upload, Check, Trash2, Image, Wand2, Film, Play, Info } from 'lucide-react';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  title?: string;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  title = "Cloudinary Media Library"
}) => {
  const [images, setImages] = useState<CloudinaryImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  
  // Device upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cloudinary Direct Unsigned Settings (Defaults to user's Cloudinary dxvmfaxeh & ml_default)
  const [cloudName, setCloudName] = useState(localStorage.getItem('cloudinary_cloud_name') || 'dxvmfaxeh');
  const [uploadPreset, setUploadPreset] = useState(localStorage.getItem('cloudinary_upload_preset') || 'ml_default');
  const [showCloudinaryConfig, setShowCloudinaryConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImages(cloudinaryService.getImages());
      setSelectedUrl(null);
      setUploadPreview(null);
      setRawFile(null);
      setUploadName('');
      setActiveTab('library');
      setUploadError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    setSelectedUrl(url);
  };

  const handleConfirmSelect = () => {
    if (selectedUrl) {
      onSelectImage(selectedUrl);
      onClose();
    }
  };

  const handleDeleteImage = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this asset from your Cloudinary library?")) {
      try {
        await cloudinaryService.deleteImage(id);
        setImages(cloudinaryService.getImages());
        if (selectedUrl === id) {
          setSelectedUrl(null);
        }
      } catch (err: any) {
        console.error(err);
      }
    }
  };

  const compressImageBase64 = (dataUrl: string, maxDim = 900, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
    });
  };

  // Device upload handling
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setUploadError('Please select a valid image (PNG, JPG, WebP) or video (MP4, WebM, MOV) file.');
      return;
    }

    setFileType(isVideo ? 'video' : 'image');
    setRawFile(file);

    if (!uploadName) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setUploadName(baseName.replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string);
      setUploadError(null);
    };
    reader.onerror = () => {
      setUploadError('Failed to read media file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPreview || !uploadName.trim()) {
      setUploadError('Please choose a media file and provide a title.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      let finalUrl = uploadPreview;
      let directUploadSuccess = false;

      // If user provided Cloudinary Cloud Name & Upload Preset, upload directly to Cloudinary API!
      if (cloudName.trim() && uploadPreset.trim()) {
        try {
          const formData = new FormData();
          if (rawFile) {
            formData.append('file', rawFile);
          } else {
            formData.append('file', uploadPreview);
          }
          formData.append('upload_preset', uploadPreset.trim());
          
          const endpoint = fileType === 'video' 
            ? `https://api.cloudinary.com/v1_1/${cloudName.trim()}/video/upload`
            : `https://api.cloudinary.com/v1_1/${cloudName.trim()}/image/upload`;

          const res = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.secure_url) {
              finalUrl = data.secure_url;
              directUploadSuccess = true;
              localStorage.setItem('cloudinary_cloud_name', cloudName.trim());
              localStorage.setItem('cloudinary_upload_preset', uploadPreset.trim());
            }
          } else {
            const errRes = await res.json().catch(() => ({}));
            const cErrMsg = errRes.error?.message || (await res.text().catch(() => 'Upload failed'));
            console.warn('[Cloudinary API Direct Upload Error]:', cErrMsg);
            throw new Error(`Cloudinary Direct Upload Error: ${cErrMsg}`);
          }
        } catch (cErr: any) {
          console.warn('[Cloudinary API] direct upload failure:', cErr);
          if (cErr.message && cErr.message.includes('Cloudinary Direct Upload Error')) {
            throw cErr;
          }
        }
      }

      // If direct Cloudinary upload was not used or failed, enforce Firestore 1MB document limit guard
      if (!directUploadSuccess && finalUrl.startsWith('data:')) {
        if (fileType === 'image') {
          // Compress image to fit within Firestore's 1MB limit
          finalUrl = await compressImageBase64(finalUrl);
        }

        if (finalUrl.length > 800000) {
          throw new Error(`File is too large (${Math.round(finalUrl.length / 1024)} KB) to store directly in database. Please ensure your Cloudinary settings (Cloud Name: dxvmfaxeh, Preset: ml_default) are valid.`);
        }
      }

      // Save media item into Firestore Cloudinary collection
      const newImg = await cloudinaryService.uploadImage(uploadName.trim(), finalUrl, fileType);
      
      setImages(cloudinaryService.getImages());
      setSelectedUrl(newImg.url);
      
      setUploadPreview(null);
      setRawFile(null);
      setUploadName('');
      setActiveTab('library');
    } catch (err: any) {
      setUploadError('Failed to upload media: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const filteredImages = images.filter(img => 
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] border border-pink-100 overflow-hidden max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-pink-50 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-[#E91E8C]" />
            <span className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">{title}</span>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-pink-600 transition p-1">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-pink-50 bg-pink-50/10 px-4 justify-between items-center">
          <div className="flex">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition ${
                activeTab === 'library'
                  ? 'border-[#E91E8C] text-[#E91E8C]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Media Library ({images.length})
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition ${
                activeTab === 'upload'
                  ? 'border-[#E91E8C] text-[#E91E8C]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Upload Image/Video from Device
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCloudinaryConfig(!showCloudinaryConfig)}
            className="text-[10px] text-[#E91E8C] font-bold underline px-2 py-1 hover:text-[#FF4B91]"
          >
            {showCloudinaryConfig ? "Hide Cloudinary Credentials" : "Cloudinary Direct API Config"}
          </button>
        </div>

        {/* Cloudinary Config Box */}
        {showCloudinaryConfig && (
          <div className="p-3 bg-pink-50/40 border-b border-pink-100 space-y-2 text-xs">
            <div className="flex items-center gap-1 text-slate-800 font-bold">
              <Info size={14} className="text-[#E91E8C]" />
              <span>Optional: Direct Cloudinary Unsigned Upload Credentials</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Cloud Name (e.g. dxvmfaxeh)"
                value={cloudName}
                onChange={(e) => {
                  setCloudName(e.target.value);
                  localStorage.setItem('cloudinary_cloud_name', e.target.value.trim());
                }}
                className="bg-white border border-pink-200 rounded-lg p-1.5 text-xs outline-none focus:border-[#E91E8C]"
              />
              <input
                type="text"
                placeholder="Unsigned Upload Preset (e.g. ml_default)"
                value={uploadPreset}
                onChange={(e) => {
                  setUploadPreset(e.target.value);
                  localStorage.setItem('cloudinary_upload_preset', e.target.value.trim());
                }}
                className="bg-white border border-pink-200 rounded-lg p-1.5 text-xs outline-none focus:border-[#E91E8C]"
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-white min-h-[350px]">
          {activeTab === 'library' ? (
            <div className="space-y-4 h-full flex flex-col">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-pink-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search uploaded images & videos..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-pink-100 bg-white rounded-xl outline-none focus:ring-2 focus:ring-[#E91E8C]/15"
                />
              </div>

              {/* Grid of Images & Videos */}
              <div className="flex-1 overflow-y-auto min-h-[250px] max-h-[450px] pr-1">
                {filteredImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Image size={32} className="text-pink-200 mb-2 animate-pulse" />
                    <span className="text-xs">No media assets found. Upload some photos or videos!</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredImages.map((img) => {
                      const isSelected = selectedUrl === img.url;
                      const isVideo = img.type === 'video' || img.url.includes('video') || img.url.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i);

                      return (
                        <div
                          key={img.id}
                          onClick={() => handleSelect(img.url)}
                          className={`relative group rounded-xl overflow-hidden aspect-square border-2 cursor-pointer transition-all bg-slate-900 ${
                            isSelected 
                              ? 'border-[#E91E8C] ring-2 ring-[#E91E8C]/20 scale-98 shadow-md' 
                              : 'border-pink-50 hover:border-pink-200 hover:scale-[1.02]'
                          }`}
                        >
                          {isVideo ? (
                            <div className="relative w-full h-full">
                              <video src={img.url} className="w-full h-full object-cover" muted />
                              <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Play size={8} className="fill-current" />
                                <span>Video</span>
                              </div>
                            </div>
                          ) : (
                            <img 
                              src={img.url} 
                              alt={img.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          
                          {/* Selected Overlay Checkmark */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#E91E8C]/10 flex items-center justify-center z-10">
                              <div className="bg-[#E91E8C] text-white p-1 rounded-full shadow-lg">
                                <Check size={14} strokeWidth={3} />
                              </div>
                            </div>
                          )}

                          {/* Hover Details Overlay */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end z-20">
                            <p className="text-[9px] font-bold text-white truncate max-w-[80%]">{img.name}</p>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteImage(e, img.id)}
                              className="text-red-400 hover:text-red-500 transition p-1 bg-black/40 rounded-md backdrop-blur-xs"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Upload Screen */
            <form onSubmit={handleUploadSubmit} className="space-y-4 max-w-md mx-auto">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs font-semibold">
                  {uploadError}
                </div>
              )}

              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
                  dragActive 
                    ? 'border-[#E91E8C] bg-pink-50/20' 
                    : 'border-pink-100 hover:border-[#E91E8C]/50 hover:bg-pink-50/5'
                }`}
              >
                <input
                  type="file"
                  id="file-upload-input"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {uploadPreview ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden shadow-md bg-slate-900 flex items-center justify-center">
                    {fileType === 'video' ? (
                      <video src={uploadPreview} className="w-full h-full object-cover" controls muted />
                    ) : (
                      <img src={uploadPreview} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setUploadPreview(null)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full transition z-10"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center">
                    <Upload className="text-[#E91E8C] mb-2 animate-bounce" size={24} />
                    <span className="text-xs font-bold text-gray-800">Drag & Drop Image/Video or Click to Browse</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">Supports PNG, JPEG, WebP, MP4, WebM, MOV</span>
                  </label>
                )}
              </div>

              {/* Media Name Field */}
              {uploadPreview && (
                <div className="space-y-1.5">
                  <label className="block text-gray-500 font-bold text-xs">Media Title / Description</label>
                  <input
                    type="text"
                    required
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Skin Food Reel Video #1"
                    className="w-full bg-pink-50/10 text-gray-800 px-3 py-2 text-xs border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C]"
                  />
                </div>
              )}

              {/* Action Upload CTA */}
              <button
                type="submit"
                disabled={isUploading || !uploadPreview || !uploadName.trim()}
                className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Wand2 size={13} className={isUploading ? "animate-spin" : ""} />
                <span>{isUploading ? "Uploading Media Asset..." : "Upload & Select Asset"}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-pink-50/20 border-t border-pink-50 flex justify-end gap-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-gray-500 hover:text-pink-750 hover:bg-pink-50 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          {activeTab === 'library' && (
            <button
              type="button"
              disabled={!selectedUrl}
              onClick={handleConfirmSelect}
              className="px-5 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-sm disabled:opacity-45"
            >
              Select Media
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
