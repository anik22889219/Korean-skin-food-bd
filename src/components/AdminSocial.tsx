import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { Product } from '../types';
import { Wand2, Image as ImageIcon, Copy, Check, MessageSquare, ThumbsUp, Share2, Award, Sun, Heart, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

export const AdminSocial: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Settings
  const [tone, setTone] = useState<'korean_vibes' | 'dermatology' | 'weather_promo' | 'influencer'>('korean_vibes');
  const [postCopy, setPostCopy] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loaded = productService.getProducts();
    setProducts(loaded);
    if (loaded.length > 0) {
      setSelectedProduct(loaded[0]);
      generateDefaultPost(loaded[0], 'korean_vibes');
    }
  }, []);

  const generateDefaultPost = (p: Product, t: typeof tone) => {
    switch (t) {
      case 'korean_vibes':
        setPostCopy(`🌸 K-Beauty Secret Alert! 🌸\n\nBring the effortless, glowing Glass Skin trend straight from Seoul to Dhaka! The authentic [${p.brand}] ${p.name} is now available in Bangladesh.\n\n💧 Lightweight hydration\n🌟 Minimizes pores and feeds skin nutrients\n🛡️ 100% Imported & Genuine\n\n🛍️ Shop now on cash on delivery across Bangladesh! Special offer: ৳${p.discountPrice || p.price} BDT only.\n\n#KBeautyBangladesh #GlassSkin #KoreanSkincare #AuthenticCosmetics`);
        break;
      case 'dermatology':
        setPostCopy(`🔬 Clinically Audited Formulation 🔬\n\nDealing with skin barrier irritation under Dhaka's pollution? It's time to let science restore your skin cells. The [${p.brand}] ${p.name} is rich in cell-repairing active complexes.\n\n👩‍⚕️ Recommended for: Dry, sensitive, and compromised skin barriers.\n✨ Key Benefits: Deep cellular hydration, balanced pH levels, and natural barrier protection.\n\n✅ Buy 100% Genuine Korean Cosmetics. Tap link to view complete ingredients profile.\n\n#DermatologyApproved #BarrierRepair #KoreanSkinCare #AuthenticBD`);
        break;
      case 'weather_promo':
        setPostCopy(`☀️ Beat Dhaka's Heat & Humidity! ☀️\n\nSweaty, greasy skin? Keep your pores fresh and oil-free with [${p.brand}] ${p.name}. Specially designed lightweight Korean hydration that doesn't clog your pores under heavy humidity.\n\n🍃 Deep, weightless nourishment\n💦 Non-sticky fresh feel\n💥 Current Special Promo: ৳${p.discountPrice || p.price} BDT!\n\n🚀 Cash on delivery island-wide in Bangladesh.\n\n#SummerSkincare #DhakaBeauty #SweatProofSkincare #KBeautyBD`);
        break;
      case 'influencer':
        setPostCopy(`✨ POV: You finally unlocked the holy grail of Korean Skincare... ✨\n\nI’ve been testing the [${p.brand}] ${p.name} and honestly? My skin has never looked this plump and juicy. 😍 It absorbs instantly and leaves this gorgeous non-greasy dewiness.\n\nSwipe to see why this is trending all over Seoul! 👇 Available right now at Korean Skin Food BD.\n\n🏷️ Pricing: ৳${p.discountPrice || p.price} BDT\n\n#GlowingSkin #SkincareReview #KBeautyObsessed #KoreanSkinFoodBD`);
        break;
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      generateDefaultPost(selectedProduct, tone);
    }
  }, [tone, selectedProduct]);

  const handleGenerateWithAI = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    setCopied(false);

    try {
      // In a real full-stack app, we can use the server-side proxy or call the local endpoint.
      // Let's call the generate endpoint to get a customized social post for our specific tone!
      const response = await fetch('/api/functions/generateProductContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result) {
          // Format with custom tone
          const result = data.result;
          let prefix = "";
          let suffix = "\n\n🛍️ Shop on cash on delivery: koreanskinfoodbd.com";
          if (tone === 'weather_promo') prefix = "☀️ Beat Dhaka's Humid Heat! ☀️\n\n";
          else if (tone === 'dermatology') prefix = "🔬 Barrier-Repair Formulation 🔬\n\n";
          else if (tone === 'influencer') prefix = "✨ POV: Unlocking Glass Skin ✨\n\n";
          else prefix = "🌸 Seoul K-Beauty Secrets 🌸\n\n";

          setPostCopy(`${prefix}${result.productDescription || result.metaDescription}\n\n🏷️ Special Offer: ৳${selectedProduct.discountPrice || selectedProduct.price} BDT\n\n#KBeautyBangladesh #${selectedProduct.brand.replace(/\s+/g, '')} #GlassSkin`);
          return;
        }
      }
      
      // Fallback local simulation if endpoint is unavailable
      await new Promise(resolve => setTimeout(resolve, 1500));
      generateDefaultPost(selectedProduct, tone);
    } catch (err) {
      console.warn("AI generation fallback to built-in templates:", err);
      generateDefaultPost(selectedProduct, tone);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(postCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Selector and Options Header */}
      <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        <div className="lg:col-span-2 space-y-1">
          <h4 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <ThumbsUp className="text-[#E91E8C]" size={16} />
            <span>Social Media Copywriting Studio</span>
          </h4>
          <p className="text-xs text-gray-500">
            Craft high-engagement posts for Facebook and Instagram with custom targeted beauty hooks.
          </p>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Selected Skincare</label>
          <select
            value={selectedProduct?.id || ''}
            onChange={(e) => {
              const found = products.find(p => p.id === e.target.value);
              if (found) setSelectedProduct(found);
            }}
            className="w-full bg-pink-50/10 text-xs text-gray-800 px-3 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                [{p.brand}] {p.name.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Target Strategy/Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as any)}
            className="w-full bg-pink-50/10 text-xs text-gray-800 px-3 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
          >
            <option value="korean_vibes">🌸 Seoul Glass Skin Vibe</option>
            <option value="dermatology">🔬 Dermatology Barrier Science</option>
            <option value="weather_promo">☀️ Dhaka Summer Heat Promo</option>
            <option value="influencer">✨ POV Skincare Review</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 cols: Editor */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-pink-50 pb-3">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Social Copy Composer</span>
              <button
                onClick={handleGenerateWithAI}
                disabled={isGenerating || !selectedProduct}
                className="px-3 py-1.5 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-[10px] font-bold rounded-lg cursor-pointer transition flex items-center gap-1 shadow-sm"
              >
                <Wand2 size={11} className={isGenerating ? "animate-spin" : ""} />
                <span>{isGenerating ? "Rewriting Copy..." : "Optimize with Gemini"}</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Post Caption</label>
              <textarea
                value={postCopy}
                onChange={(e) => setPostCopy(e.target.value)}
                rows={12}
                className="w-full bg-pink-50/5 text-xs text-gray-800 p-4 border border-pink-100 rounded-2xl outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/10 leading-relaxed font-sans"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={handleCopyToClipboard}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white hover:bg-pink-50 text-gray-800 border-2 border-pink-100 hover:border-pink-200 font-bold rounded-xl cursor-pointer transition text-xs shadow-sm"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-[#E91E8C]" />
                  <span>Copy Caption Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 7 cols: Mockups Feed Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* FACEBOOK FEED CARD */}
            <div className="bg-[#f0f2f5] p-4 rounded-[24px] border border-gray-200 space-y-3 font-sans">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block px-1">Facebook feed preview</span>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 space-y-3">
                {/* Header Profile */}
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-[#E91E8C] rounded-full border border-pink-200 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">K</div>
                  <div>
                    <h5 className="font-bold text-xs text-gray-900 leading-tight">Korean Skin Food BD</h5>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">Sponsored · 🌐</span>
                  </div>
                </div>

                {/* Text Body */}
                <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {postCopy}
                </p>

                {/* Main Media graphic */}
                {selectedProduct && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                    <img src={selectedProduct.image} alt="" className="w-full h-44 object-cover" referrerPolicy="no-referrer" />
                    <div className="p-3 bg-[#f2f3f5] border-t border-gray-150 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">{selectedProduct.brand}</span>
                        <h6 className="font-extrabold text-gray-900 mt-0.5 leading-none">{selectedProduct.name}</h6>
                      </div>
                      <span className="bg-white px-3 py-1.5 rounded font-bold border border-gray-200 text-gray-800 text-[10px] shadow-sm whitespace-nowrap">SHOP NOW</span>
                    </div>
                  </div>
                )}

                {/* Interactive bar */}
                <div className="border-t border-gray-150 pt-2.5 flex justify-around text-gray-500 text-[10px] font-bold">
                  <span className="flex items-center gap-1 cursor-pointer hover:text-blue-600"><ThumbsUp size={12} /> Like</span>
                  <span className="flex items-center gap-1 cursor-pointer hover:text-gray-800"><MessageSquare size={12} /> Comment</span>
                  <span className="flex items-center gap-1 cursor-pointer hover:text-gray-800"><Share2 size={12} /> Share</span>
                </div>
              </div>
            </div>

            {/* INSTAGRAM FEED CARD */}
            <div className="bg-white p-4 rounded-[24px] border border-pink-100 shadow-sm space-y-3 font-sans">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block px-1">Instagram feed preview</span>
              
              <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden space-y-3 pb-3">
                {/* Profile Header */}
                <div className="flex items-center gap-2 p-3 pb-1">
                  <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600">
                    <div className="w-full h-full bg-white rounded-full p-0.5">
                      <div className="w-full h-full bg-[#E91E8C] rounded-full flex items-center justify-center text-white font-extrabold text-xs">K</div>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-extrabold text-[11px] text-gray-900 leading-none">koreanskinfood.bd</h5>
                    <span className="text-[9px] text-gray-500 leading-none mt-1 block">Seoul, South Korea</span>
                  </div>
                </div>

                {/* Media Image */}
                {selectedProduct && (
                  <div className="aspect-square bg-gray-50">
                    <img src={selectedProduct.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}

                {/* Action Icons */}
                <div className="flex justify-between items-center px-3 text-gray-800">
                  <div className="flex gap-3">
                    <Heart size={16} className="cursor-pointer hover:text-red-500" />
                    <MessageSquare size={16} className="cursor-pointer hover:text-gray-500" />
                    <Share2 size={16} className="cursor-pointer hover:text-gray-500" />
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </div>

                {/* Likes & Caption Text */}
                <div className="px-3 space-y-1.5 text-[11px] leading-relaxed">
                  <span className="font-bold block text-gray-900">182 likes</span>
                  <p className="text-gray-800 line-clamp-3">
                    <strong className="text-gray-900 mr-1.5">koreanskinfood.bd</strong>
                    {postCopy}
                  </p>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block pt-0.5">2 Hours Ago</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
