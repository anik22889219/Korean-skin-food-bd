import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, Mic, X, Check, CheckCheck, Phone, Info } from 'lucide-react';
import { ChatMessage, OrderState, sendChatbotMessage, saveLeadToFirestore, fetchSiteSettings } from '../services/chatbotService';

export function WhatsAppChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('8801712345678');
  const [orderState, setOrderState] = useState<OrderState>({
    products: [],
    phone: '',
    address: '',
    isConfirmed: false
  });
  const [hasLeadBeenSaved, setHasLeadBeenSaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load site settings on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await fetchSiteSettings();
      if (settings && settings.whatsappNumber) {
        // Clean up whatsapp number for wa.me URL (digits only)
        const cleanNumber = settings.whatsappNumber.replace(/\D/g, '');
        setWhatsappNumber(cleanNumber);
      }
    }
    loadSettings();
  }, []);

  // Initialize with a friendly welcome message when opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          text: "আসসালামু আলাইকুম! আমি কোরিয়ান স্কিন ফুড অ্যাসিস্ট্যান্ট। আপনার ত্বকের যত্ন নিতে আমি এখানে আছি। আপনার ত্বকের ধরণ কেমন এবং কি ধরণের সমস্যা সমাধান করতে চাচ্ছেন? যেমন: তৈলাক্ত বা শুষ্ক ত্বক, ব্রণ বা হাইড্রেশনের সমস্যা? 🌸",
          sender: 'bot',
          timestamp: formatTime(new Date())
        }
      ]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom whenever messages list or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMsgText = inputText.trim();
    setInputText('');

    // Add user message to state
    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      text: userMsgText,
      sender: 'user',
      timestamp: formatTime(new Date())
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      // Call our API endpoint via the service
      const response = await sendChatbotMessage(updatedMessages);
      
      // Update the bot's typing and messages state
      setIsTyping(false);
      
      const botMessage: ChatMessage = {
        id: 'bot-' + Date.now(),
        text: response.reply,
        sender: 'bot',
        timestamp: formatTime(new Date())
      };

      setMessages(prev => [...prev, botMessage]);

      if (response.orderState) {
        setOrderState(response.orderState);
        
        // If order gets confirmed, save the lead to Firestore automatically in the background
        if (response.orderState.isConfirmed && !hasLeadBeenSaved) {
          try {
            await saveLeadToFirestore(response.orderState, updatedMessages);
            setHasLeadBeenSaved(true);
          } catch (err) {
            console.error("Failed to automatically save lead on confirmation:", err);
          }
        }
      }
    } catch (error) {
      console.error("Chatbot response error:", error);
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          text: "আমি দুঃখিত, আপনার বার্তাটি বুঝতে আমার সমস্যা হয়েছে। অনুগ্রহ করে আবার বলুন। 🌸",
          sender: 'bot',
          timestamp: formatTime(new Date())
        }
      ]);
    }
  };

  const handleWhatsAppRedirect = async () => {
    // 1. Build a beautifully formatted order summary message
    const itemsText = orderState.products
      .map(p => `• ${p.name} × ${p.quantity} (৳${p.price})`)
      .join('\n');
    
    const subtotal = orderState.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const deliveryCharge = 80; // standard charge
    const totalAmount = subtotal + deliveryCharge;

    const summaryText = `🌸 *Korean Skin Food BD - Order Summary* 🌸\n` +
      `--------------------------------------\n` +
      `*Items Ordered:*\n${itemsText}\n\n` +
      `*Subtotal:* ৳${subtotal}\n` +
      `*Delivery Charge:* ৳${deliveryCharge}\n` +
      `*Grand Total:* ৳${totalAmount}\n` +
      `--------------------------------------\n` +
      `*Customer Phone:* ${orderState.phone}\n` +
      `*Delivery Address:* ${orderState.address}\n` +
      `--------------------------------------\n` +
      `Please process my order. Thank you!`;

    const encodedSummary = encodeURIComponent(summaryText);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedSummary}`;

    // 2. Open wa.me in a new tab
    window.open(whatsappUrl, '_blank');

    // 3. Double-check that lead is saved in Firestore if not already
    if (!hasLeadBeenSaved) {
      try {
        await saveLeadToFirestore(orderState, messages);
        setHasLeadBeenSaved(true);
      } catch (err) {
        console.error("Failed to manually save lead on redirect:", err);
      }
    }
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 font-sans" id="whatsapp-chatbot-widget">
      {/* Floating WhatsApp Action Button */}
      {!isOpen && (
        <motion.button
          id="whatsapp-chat-open-btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 sm:p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer border-2 border-white/25 transition duration-200 relative group"
        >
          <MessageCircle size={26} className="fill-white" />
          <span className="absolute right-16 bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-pink-100 hidden sm:inline-block">
            K Beauty Assistant 🌸
          </span>
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center animate-bounce">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          </span>
        </motion.button>
      )}

      {/* WhatsApp Styled Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="whatsapp-chat-panel"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-[#efeae2] w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] sm:w-[360px] md:w-[390px] h-[500px] sm:h-[550px] max-h-[calc(100vh-110px)] rounded-3xl overflow-hidden shadow-2xl border border-emerald-950/20 flex flex-col justify-between"
          >
            {/* Header: Dark Green WhatsApp Bar */}
            <div id="whatsapp-chat-header" className="bg-[#075E54] px-4 py-3.5 flex items-center justify-between text-white shadow-md relative">
              <div className="flex items-center space-x-3">
                {/* Bot Avatar */}
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=100&auto=format&fit=crop&q=60"
                    alt="Bot Avatar"
                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                  />
                  {/* Status Indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075E54] rounded-full animate-pulse" />
                </div>
                {/* Bot Name & Status Info */}
                <div>
                  <h4 className="text-sm font-bold tracking-wide">Korean Skin Food Assistant</h4>
                  <p className="text-[10px] text-emerald-100 font-medium">online • skincare expert</p>
                </div>
              </div>
              
              <button
                id="whatsapp-chat-close-btn"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages Log Panel */}
            <div
              id="whatsapp-messages-container"
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-emerald-800/10"
              style={{
                backgroundImage: `radial-gradient(#dfdcd6 1.5px, transparent 1.5px), radial-gradient(#dfdcd6 1.5px, #efeae2 1.5px)`,
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            >
              {messages.map((m, index) => {
                const isUser = m.sender === 'user';
                const showBotAvatar = !isUser && (index === 0 || messages[index - 1]?.sender !== 'bot');

                return (
                  <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end space-x-1.5`}>
                    {/* Bot avatar adjacent to first message of group */}
                    {!isUser && (
                      <div className="w-6 h-6 flex-shrink-0">
                        {showBotAvatar && (
                          <img
                            src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=100&auto=format&fit=crop&q=60"
                            alt="avatar"
                            className="w-6 h-6 rounded-full object-cover border border-emerald-950/10"
                          />
                        )}
                      </div>
                    )}

                    {/* Speech Bubble */}
                    <div
                      className={`max-w-[78%] px-3.5 py-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-[#DCF8C6] text-gray-900 rounded-[14px] rounded-tr-none'
                          : 'bg-white text-gray-900 rounded-[14px] rounded-tl-none'
                      }`}
                    >
                      {/* Message Content */}
                      <p className="text-gray-950 text-[13px]">{m.text}</p>
                      
                      {/* Time & Double tick indicator */}
                      <div className="flex items-center justify-end space-x-1 mt-1 text-[9px] text-gray-500 text-right select-none">
                        <span>{m.timestamp}</span>
                        {isUser && (
                          <span className="text-[#34B7F1] flex items-center">
                            <CheckCheck size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      {/* Tail elements like WhatsApp bubbles */}
                      {isUser ? (
                        <div className="absolute top-0 right-[-6px] w-0 h-0 border-[6px] border-transparent border-t-[#DCF8C6]" />
                      ) : (
                        <div className="absolute top-0 left-[-6px] w-0 h-0 border-[6px] border-transparent border-t-white" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bot typing dot bubble */}
              {isTyping && (
                <div className="flex justify-start items-end space-x-1.5">
                  <div className="w-6 h-6 flex-shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=100&auto=format&fit=crop&q=60"
                      alt="avatar"
                      className="w-6 h-6 rounded-full object-cover border border-emerald-950/10"
                    />
                  </div>
                  <div className="bg-white rounded-[14px] rounded-tl-none px-4 py-2.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] flex items-center space-x-1.5 max-w-[80px] relative">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <div className="absolute top-0 left-[-6px] w-0 h-0 border-[6px] border-transparent border-t-white" />
                  </div>
                </div>
              )}

              {/* Special WhatsApp order confirmation call-to-action button */}
              {orderState.isConfirmed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white/95 backdrop-blur border border-emerald-200 p-4 rounded-2xl shadow-lg space-y-3.5 text-center mt-4"
                >
                  <div className="flex items-center justify-center space-x-1.5 text-emerald-800">
                    <Phone size={16} className="fill-emerald-800" />
                    <span className="text-xs font-black tracking-wide uppercase">WhatsApp Order Ready!</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    আপনার তথ্য সংরক্ষণ করা হয়েছে। আপনার অর্ডারটি সম্পূর্ণ করতে নিচের সবুজ বাটনে ক্লিক করে হোয়াটসঅ্যাপে পাঠান।
                  </p>
                  
                  <div className="bg-[#f0f9f4] rounded-xl p-2.5 text-left text-xs text-emerald-900 border border-emerald-100 font-mono space-y-1">
                    <p className="font-bold flex items-center justify-between text-[11px]">
                      <span>অর্ডার বিবরণী</span>
                      <span className="bg-emerald-200/50 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-sans">Draft Saved</span>
                    </p>
                    <div className="divide-y divide-emerald-50 text-[10px] space-y-1 pt-1">
                      {orderState.products.map(p => (
                        <p key={p.id} className="pt-1 flex justify-between font-medium">
                          <span>{p.name.substring(0, 25)}... ×{p.quantity}</span>
                          <span className="font-bold">৳{p.price * p.quantity}</span>
                        </p>
                      ))}
                      <p className="pt-1 flex justify-between font-black text-emerald-950 text-[11px]">
                        <span>Grand Total (with Delivery):</span>
                        <span>৳{orderState.products.reduce((sum, p) => sum + (p.price * p.quantity), 0) + 80}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    id="whatsapp-chat-redirect-btn"
                    onClick={handleWhatsAppRedirect}
                    className="w-full bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs shadow-md cursor-pointer transition duration-150"
                  >
                    <MessageCircle size={16} className="fill-white" />
                    <span>Send Order via WhatsApp</span>
                  </button>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input pill with Send/Mic actions */}
            <form id="whatsapp-input-bar" onSubmit={handleSend} className="bg-transparent px-3.5 py-2.5 flex items-center space-x-2">
              <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center shadow-sm border border-gray-300/30">
                <input
                  id="whatsapp-chat-input"
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-gray-800 placeholder-gray-400 py-1.5"
                />
              </div>

              {inputText.trim() ? (
                <button
                  id="whatsapp-chat-send-btn"
                  type="submit"
                  className="bg-[#075E54] hover:bg-[#064e46] text-white p-3 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  <Send size={16} className="fill-white" />
                </button>
              ) : (
                <button
                  id="whatsapp-chat-mic-btn"
                  type="button"
                  className="bg-[#075E54] text-white p-3 rounded-full flex items-center justify-center shadow-md select-none pointer-events-none opacity-90"
                >
                  <Mic size={16} />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
