"use client";

import React, { useState, useRef } from 'react';
import { Loader2, Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react';

interface ImageUploaderProps {
  onUpload?: (url: string) => void;
  currentUrl?: string;
  label?: string;
  multiple?: boolean;
  onMultipleUpload?: (urls: string[]) => void;
  currentUrls?: string[];
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'df2h0h2gz';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'lukeni_upload';

export default function ImageUploader({
  onUpload,
  currentUrl,
  label = 'Image principale',
  multiple = false,
  onMultipleUpload,
  currentUrls = [],
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'lukeni/' + (multiple ? 'articles' : 'events'));

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
          return data.secure_url;
        }
        throw new Error('Upload failed');
      });

      const urls = await Promise.all(uploadPromises);

      if (multiple && onMultipleUpload) {
        onMultipleUpload([...currentUrls, ...urls]);
      } else if (urls[0] && onUpload) {
        onUpload(urls[0]);
      }

      setPreview(null);
      showMsg('success', `✅ ${urls.length} image(s) uploadée(s)`);
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const showMsg = (type: 'success' | 'error', text: string) => {
    const div = document.createElement('div');
    div.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-bold z-[9999] ${
      type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
    }`;
    div.textContent = text;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  const removeImage = (index?: number) => {
    if (multiple && onMultipleUpload && index !== undefined) {
      onMultipleUpload(currentUrls.filter((_, i) => i !== index));
    } else if (onUpload) {
      onUpload('');
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-400 mb-1 font-mono">
        🖼️ {label}
      </label>

      {/* Upload zone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isUploading
            ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5'
            : 'border-white/10 hover:border-[#D4AF37]/50 hover:bg-white/[0.02]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
            <p className="text-xs text-gray-400">Upload en cours...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={24} className="text-gray-600" />
            <p className="text-xs text-gray-500">
              {multiple
                ? 'Cliquez ou glissez des images ici'
                : 'Cliquez ou glissez une image ici'}
            </p>
            <p className="text-[10px] text-gray-600">PNG, JPG, WEBP — Max 5MB</p>
          </div>
        )}
      </div>

      {/* Preview - Single */}
      {!multiple && currentUrl && (
        <div className="relative rounded-xl overflow-hidden border border-white/10">
          <img src={currentUrl} alt="Preview" className="w-full h-40 object-cover" />
          <button
            onClick={() => removeImage()}
            className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-red-500 transition-colors"
          >
            <X size={14} />
          </button>
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded-full">
            <CheckCircle size={12} className="text-green-400" />
            <span className="text-[10px] text-white">Uploadé</span>
          </div>
        </div>
      )}

      {/* Preview - Multiple */}
      {multiple && currentUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {currentUrls.map((url, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-white/10 group">
              <img src={url} alt={`Image ${i + 1}`} className="w-full h-24 object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white">
                #{i + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}