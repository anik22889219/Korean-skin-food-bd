import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface AdminVideoPlayerModalProps {
  videoUrl: string;
  onClose: () => void;
}

export const AdminVideoPlayerModal: React.FC<AdminVideoPlayerModalProps> = ({
  videoUrl,
  onClose
}) => {
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
        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-800/80 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer transition"
          title="Close video"
        >
          <X size={16} />
        </button>
        <div className="aspect-video bg-black flex items-center justify-center">
          <video src={videoUrl} controls autoPlay className="w-full h-full object-contain" />
        </div>
      </div>
    </motion.div>
  );
};
