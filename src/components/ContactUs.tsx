import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Phone, MessageSquare, MapPin, CheckCircle, 
  ChevronDown, ChevronUp, Wand2, Send 
} from 'lucide-react';

export const ContactUs: React.FC = () => {
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    skinType: 'All',
    concern: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API lead submission
    console.log('[ContactUs] Skincare Inquiry Lead Captured:', formData);
    setIsSubmitted(true);
  };

  const faqs = [
    {
      q: 'Are your Korean products 100% genuine and authentic?',
      a: 'Absolutely! We pride ourselves on sourcing products directly from licensed beauty manufacturers in South Korea (Seoul). Every product is complete with manufacturer seal codes, and we back them with a 100% full money-back authenticity guarantee.'
    },
    {
      q: 'What are the delivery charges in Bangladesh?',
      a: 'We offer standard cash on delivery (COD) services across Bangladesh. The delivery fee is ৳80 inside Dhaka City and ৳150 outside Dhaka City. Free delivery is available for orders above ৳2,000.'
    },
    {
      q: 'How long does delivery take?',
      a: 'Orders inside Dhaka City are typically delivered within 24 to 48 hours. Orders outside Dhaka City are dispatched via reliable courier services and take 3 to 5 business days to arrive at your doorstep.'
    },
    {
      q: 'Can I get a personalized skin consultation?',
      a: 'Yes, we provide free skincare consultation! Fill out our contact form indicating your Skin Type and specific concern (e.g. hyperpigmentation, acne, dryness), and our beauty consultant will suggest the ideal Korean skincare routine.'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[1720px] mx-auto px-4 py-8 md:px-8 lg:px-12 space-y-16"
    >
      {/* Page Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="bg-pink-50 text-[#E91E8C] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-pink-200/50 inline-block">
          Get In Touch
        </span>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Contact Our Skincare Desk</h1>
        <p className="text-xs text-gray-500 font-semibold leading-relaxed">
          Have questions about a product, shipping, or need professional advice? Drop us a line below or reach out directly through WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Contact Info & Info Blocks - 5 cols */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white p-6 rounded-[28px] border border-pink-50 shadow-sm space-y-6">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Wand2 className="text-[#E91E8C]" size={16} />
              <span>Direct Support Channels</span>
            </h3>
            
            <div className="space-y-4 text-xs font-semibold text-gray-700">
              {/* WhatsApp / Phone */}
              <a 
                href="https://wa.me/8801700000000" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50 text-emerald-800 border border-emerald-100 transition"
              >
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider">WhatsApp Live Chat</span>
                  <span className="text-sm font-extrabold font-mono">+880 1700-000000</span>
                </div>
              </a>

              {/* Email Support */}
              <a 
                href="mailto:koreanskinfood.bd@gmail.com" 
                className="flex items-center gap-4 p-4 rounded-2xl bg-pink-50/20 hover:bg-pink-50/45 text-pink-900 border border-pink-100/60 transition"
              >
                <div className="w-10 h-10 bg-[#E91E8C] rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Mail size={18} />
                </div>
                <div>
                  <span className="block text-[10px] text-pink-600 font-bold uppercase tracking-wider">Email Assistance</span>
                  <span className="text-xs font-extrabold truncate">koreanskinfood.bd@gmail.com</span>
                </div>
              </a>

              {/* Physical / Online Store */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 text-slate-800 border border-slate-100">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Skincare Hub Location</span>
                  <span className="text-xs font-extrabold">Banani Road 11, Dhaka, Bangladesh</span>
                </div>
              </div>
            </div>
          </div>

          {/* Value badging / Trust blocks */}
          <div className="bg-pink-50/15 p-6 rounded-[28px] border border-pink-100/30 space-y-4">
            <h4 className="text-xs font-black text-pink-850 uppercase tracking-widest">Our Customer Promise</h4>
            <ul className="space-y-2.5 text-xs text-gray-650 font-bold">
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#E91E8C]" />
                <span>100% Genuine, Seoul-sourced imports only</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#E91E8C]" />
                <span>Strict batch-by-batch expiration quality checks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#E91E8C]" />
                <span>Safe cash on delivery with open package check</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Lead Capture Skincare Inquiry Form - 7 cols */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-pink-100 shadow-md">
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.form 
                  key="contact-form"
                  onSubmit={handleFormSubmit} 
                  className="space-y-5 text-xs text-gray-700 font-semibold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="space-y-1 pb-2">
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">Skincare Consultation Inquiry</h3>
                    <p className="text-[10px] text-gray-500">Provide details about your concerns for customized recommendations.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-500 font-bold mb-1">Your Full Name *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Tabassum Khan"
                        className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 font-bold mb-1">Phone Number *</label>
                      <input 
                        type="tel" 
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g., 01700000000"
                        className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none font-mono focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-500 font-bold mb-1">Email Address</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g., user@domain.com"
                        className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 font-bold mb-1">Your Skin Type</label>
                      <select 
                        value={formData.skinType}
                        onChange={(e) => setFormData({ ...formData, skinType: e.target.value })}
                        className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                      >
                        <option value="All">Unsure / Select Skin Type</option>
                        <option value="Oily">Oily Skin</option>
                        <option value="Dry">Dry Skin</option>
                        <option value="Sensitive">Sensitive Skin</option>
                        <option value="Combination">Combination Skin</option>
                        <option value="Acne-Prone">Acne-Prone Skin</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1">Skincare Barrier / Target Concern</label>
                    <input 
                      type="text" 
                      value={formData.concern}
                      onChange={(e) => setFormData({ ...formData, concern: e.target.value })}
                      placeholder="e.g., Hyperpigmentation, Acne scars, Dark spots, Dehydration"
                      className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1">Your Message or Question *</label>
                    <textarea 
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please write down detail queries..."
                      className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-3.5 rounded-xl font-bold cursor-pointer transition shadow-md flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    <span>Send Skincare Inquiry</span>
                  </button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success-form"
                  className="py-12 text-center space-y-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-bounce">
                    <CheckCircle size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-gray-900">Inquiry Received Safely!</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                      Thank you for contacting us, <span className="font-bold text-gray-800">{formData.name}</span>. Our expert skincare counselor will review your skin parameters and get in touch with you shortly.
                    </p>
                  </div>
                  <button 
                    onClick={() => { setIsSubmitted(false); setFormData({ name: '', email: '', phone: '', skinType: 'All', concern: '', message: '' }); }}
                    className="px-6 py-2.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] rounded-xl text-xs font-bold transition border border-pink-200/50 cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs text-gray-500 font-medium">Quick answers regarding shopping, shipping policy, and authentic cosmetics.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div 
                key={index} 
                className="bg-white border border-pink-50 rounded-2xl overflow-hidden shadow-sm hover:border-pink-200 transition"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-xs md:text-sm text-gray-800 cursor-pointer hover:bg-pink-50/10 transition"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} className="text-[#E91E8C]" /> : <ChevronDown size={16} className="text-[#E91E8C]" />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-pink-50"
                    >
                      <p className="px-6 py-4 text-xs leading-relaxed text-gray-500 font-semibold bg-pink-50/5">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
