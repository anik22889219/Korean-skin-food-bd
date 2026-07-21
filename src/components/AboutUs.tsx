import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, CheckCircle, ShieldCheck, Heart, Users, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AboutUs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-16"
    >
      {/* Hero Banner Section */}
      <div className="relative rounded-[32px] overflow-hidden bg-slate-900 p-8 md:p-16 flex flex-col md:flex-row justify-between items-center gap-10 shadow-xl text-white">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#E91E8C]/20 via-transparent to-pink-500/10 pointer-events-none" />
        
        <div className="space-y-6 max-w-xl z-10 text-center md:text-left">
          <span className="bg-gradient-to-r from-[#E91E8C] to-pink-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-pink-400/30 inline-block">
            Our Story & Legacy
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Elevating Bangladesh's <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E91E8C] to-pink-400">
              Skincare Standards
            </span>
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            Korean Skin Food BD is Bangladesh's pioneering online destination for premium, 100% genuine Korean cosmeceuticals. Founded with a vision to make advanced Seoul-formulated skincare accessible, we bridge the gap between clinical Korean research and Bangladesh's distinct skin types and climatic conditions.
          </p>
          <div className="flex justify-center md:justify-start gap-4">
            <button 
              onClick={() => navigate('/shop')}
              className="px-6 py-3 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-[#E91E8C]/20"
            >
              Explore Catalog
            </button>
            <button 
              onClick={() => navigate('/contact-us')}
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold cursor-pointer border border-white/20 transition"
            >
              Talk to Skin Expert
            </button>
          </div>
        </div>

        <div className="relative w-48 md:w-72 h-48 md:h-72 flex-shrink-0 z-10">
          <div className="absolute inset-0 bg-pink-500 rounded-full opacity-10 blur-3xl animate-pulse" />
          <img 
            src="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&auto=format&fit=crop&q=60" 
            alt="Skincare Lab" 
            className="w-full h-full object-cover rounded-[32px] border border-white/10 shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Brand Values / Key Pillars */}
      <div className="space-y-8 text-center">
        <div className="space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Why Choose Korean Skin Food BD?</h2>
          <p className="text-xs text-gray-500 font-medium">
            We are more than just an e-commerce platform. We are your dedicated skincare partner, providing expert-approved formulas and professional guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="bg-white p-6 rounded-[24px] border border-pink-50 shadow-sm hover:shadow-md transition text-center space-y-4">
            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-[#E91E8C] mx-auto border border-pink-100">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">100% Authentic Imports</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Every single product we sell is imported directly from verified brand manufacturers in South Korea. We guarantee absolute authenticity with batch tracking and customs verification documentation.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-6 rounded-[24px] border border-pink-50 shadow-sm hover:shadow-md transition text-center space-y-4">
            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-[#E91E8C] mx-auto border border-pink-100">
              <Sparkles size={24} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">BD Climate Tailored</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Bangladesh's high humidity, heat, and seasonal shifts require skincare that nurtures without causing breakouts. We hand-select lightweight, pore-safe, glass-skin formulas perfect for our locale.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-6 rounded-[24px] border border-pink-50 shadow-sm hover:shadow-md transition text-center space-y-4">
            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-[#E91E8C] mx-auto border border-pink-100">
              <Heart size={24} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Cruelty-Free & Safe</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              We advocate for clean, safe, and ethical cosmeceuticals. Our entire collection features cruelty-free products clinically vetted to be hypoallergenic, paraben-free, and skin-barrier friendly.
            </p>
          </div>
        </div>
      </div>

      {/* Social Proof Stats Bar */}
      <div className="bg-pink-50/30 rounded-[28px] p-8 border border-pink-100/50 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
        <div className="space-y-1">
          <span className="text-2xl md:text-3xl font-extrabold text-[#E91E8C] font-mono">15,000+</span>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Customers</p>
        </div>
        <div className="space-y-1">
          <span className="text-2xl md:text-3xl font-extrabold text-[#E91E8C] font-mono">100%</span>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Seoul Authentic</p>
        </div>
        <div className="space-y-1">
          <span className="text-2xl md:text-3xl font-extrabold text-[#E91E8C] font-mono">50+</span>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Top K-Beauty Brands</p>
        </div>
        <div className="space-y-1">
          <span className="text-2xl md:text-3xl font-extrabold text-[#E91E8C] font-mono">4.9/5</span>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Customer Rating</p>
        </div>
      </div>

      {/* Dynamic Lead Capture Banner (As Digital Marketers!) */}
      <div className="bg-gradient-to-r from-pink-500 to-[#E91E8C] text-white p-8 rounded-[32px] shadow-lg flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center lg:text-left">
          <h3 className="text-lg md:text-xl font-black tracking-tight">Need a Personalized Skincare Consultation?</h3>
          <p className="text-[11px] md:text-xs text-pink-50">
            Tell our skincare experts your skin type, barriers, and challenges. We will prepare a customized skincare routing schedule featuring genuine Korean formulas.
          </p>
        </div>
        <button 
          onClick={() => navigate('/contact-us')}
          className="bg-white text-[#E91E8C] hover:bg-pink-50 px-6 py-3.5 rounded-xl font-black text-xs cursor-pointer transition shadow-md whitespace-nowrap shrink-0"
        >
          Book Consultation Free
        </button>
      </div>
    </motion.div>
  );
};
