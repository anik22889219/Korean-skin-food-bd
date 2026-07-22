import React, { useState, useEffect } from 'react';
import { cloudinaryService, CloudinaryImage } from '../services/cloudinaryService';
import { X, Search, Upload, Check, Trash2, Image, Wand2 } from 'lucide-react';

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setImages(cloudinaryService.getImages());
      setSelectedUrl(null);
      setUploadPreview(null);
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
    if (confirm("Are you sure you want to delete this image from your Cloudinary library?")) {
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
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (!uploadName) {
      // Auto fill name from file name without extension
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setUploadName(baseName.replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string);
      setUploadError(null);
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
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
      setUploadError('Please choose an image and provide a title.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Save image into the Cloudinary database in Firestore
      const newImg = await cloudinaryService.uploadImage(uploadName.trim(), uploadPreview);
      
      // Update our list and auto select the newly uploaded image
      setImages(cloudinaryService.getImages());
      setSelectedUrl(newImg.url);
      
      // Reset upload form and switch to library tab so the user sees it in the grid
      setUploadPreview(null);
      setUploadName('');
      setActiveTab('library');
    } catch (err: any) {
      setUploadError('Failed to upload image: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  // Filter images by search query
  const filteredImages = images.filter(img => 
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] border border-pink-100 overflow-hidden max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-pink-50 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <Image size={18} className="text-[#E91E8C]" />
            <span className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">{title}</span>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-pink-600 transition p-1">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-pink-50 bg-pink-50/10 px-4">
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
            Upload from Device
          </button>
        </div>

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
                  placeholder="Search uploaded images in Cloudinary..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-pink-100 bg-white rounded-xl outline-none focus:ring-2 focus:ring-[#E91E8C]/15"
                />
              </div>

              {/* Grid of Images */}
              <div className="flex-1 overflow-y-auto min-h-[250px] max-h-[450px] pr-1">
                {filteredImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Image size={32} className="text-pink-200 mb-2 animate-pulse" />
                    <span className="text-xs">No media assets found. Upload some skin food photos!</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredImages.map((img) => {
                      const isSelected = selectedUrl === img.url;
                      return (
                        <div
                          key={img.id}
                          onClick={() => handleSelect(img.url)}
                          className={`relative group rounded-xl overflow-hidden aspect-square border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-[#E91E8C] ring-2 ring-[#E91E8C]/20 scale-98 shadow-md' 
                              : 'border-pink-50 hover:border-pink-200 hover:scale-[1.02]'
                          }`}
                        >
                          <img 
                            src={img.url} 
                            alt={img.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Selected Overlay Checkmark */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#E91E8C]/10 flex items-center justify-center">
                              <div className="bg-[#E91E8C] text-white p-1 rounded-full shadow-lg">
                                <Check size={14} strokeWidth={3} />
                              </div>
                            </div>
                          )}

                          {/* Hover Details Overlay */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
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
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {uploadPreview ? (
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden shadow-md">
                    <img src={uploadPreview} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setUploadPreview(null)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full transition"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center">
                    <Upload className="text-[#E91E8C] mb-2 animate-bounce" size={24} />
                    <span className="text-xs font-bold text-gray-800">Drag & Drop Image or Click to Browse</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">Supports PNG, JPEG, WebP</span>
                  </label>
                )}
              </div>

              {/* Image Name Field */}
              {uploadPreview && (
                <div className="space-y-1.5">
                  <label className="block text-gray-500 font-bold">Image Descriptive Name</label>
                  <input
                    type="text"
                    required
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Beauty of Joseon Sunscreen Bottle"
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
                <span>{isUploading ? "Uploading to Cloudinary Library..." : "Upload & Select Asset"}</span>
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
              Select Image
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
