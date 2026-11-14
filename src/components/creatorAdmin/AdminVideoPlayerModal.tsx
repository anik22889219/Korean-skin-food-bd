import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { isYouTubeUrl, getYouTubeEmbedUrl } from '../../utils/youtubeUrl';

interface AdminVideoPlayerModalProps {
  videoUrl: string;
  onClose: () => void;
}

export const AdminVideoPlayerModal: React.FC<AdminVideoPlayerModalProps> = ({
  videoUrl,
  onClose
}) => {
  const isYT = isYouTubeUrl(videoUrl);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-800/80 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer transition"
          title="Close video"
        >
          <X size={16} />
        </button>
        <div className="aspect-video bg-black flex items-center justify-center">
          {isYT ? (
            <iframe
              src={getYouTubeEmbedUrl(videoUrl, { autoplay: true, controls: true })}
              title="YouTube Reel Preview"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={videoUrl} controls autoPlay className="w-full h-full object-contain" />
          )}
        </div>
      </div>
    </motion.div>
  );
};
