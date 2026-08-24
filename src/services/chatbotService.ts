import { db, sanitizeForFirestore } from './firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

export interface OrderState {
  products: { id: string; name: string; price: number; quantity: number }[];
  phone: string;
  address: string;
  isConfirmed: boolean;
}

/**
 * Sends conversation messages to the server chatbot API
 */
export async function sendChatbotMessage(messages: ChatMessage[]): Promise<{ reply: string; orderState: OrderState }> {
  try {
    const response = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map(m => ({
          sender: m.sender,
          text: m.text
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Chatbot API response failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling sendChatbotMessage:", error);
    // Graceful error fallback
    return {
      reply: "আমি দুঃখিত, আমার সিস্টেমে কিছু সমস্যা হচ্ছে। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন বা সরাসরি আমাদের হোয়াটসঅ্যাপে নক করুন! 🌸",
      orderState: {
        products: [],
        phone: "",
        address: "",
        isConfirmed: false
      }
    };
  }
}

/**
 * Generates a clean conversation summary based on chat history and recommended products
 */
export function generateConversationSummary(messages: ChatMessage[], orderState: OrderState): string {
  const userMessages = messages.filter(m => m.sender === 'user').map(m => m.text.toLowerCase());
  const concerns: string[] = [];
  if (userMessages.some(m => m.includes('oily') || m.includes('তৈলাক্ত') || m.includes('তেলতেলে'))) concerns.push('Oily skin');
  if (userMessages.some(m => m.includes('dry') || m.includes('শুষ্ক') || m.includes('খসখসে'))) concerns.push('Dry skin');
  if (userMessages.some(m => m.includes('acne') || m.includes('ব্রণ') || m.includes('ব্রন'))) concerns.push('Acne-prone');
  if (userMessages.some(m => m.includes('sensitive') || m.includes('সংবেদনশীল'))) concerns.push('Sensitive skin');
  if (userMessages.some(m => m.includes('glow') || m.includes('উজ্জ্বল') || m.includes('গ্লো'))) concerns.push('Glowing skin');
  if (userMessages.some(m => m.includes('pigmentation') || m.includes('মেছতা') || m.includes('দাগ'))) concerns.push('Pigmentation');

  const productsText = orderState.products.map(p => p.name).join(', ');

  let summary = "Discussed skincare routine.";
  if (concerns.length > 0) {
    summary += ` Customer has ${concerns.join(', ')}.`;
  } else {
    summary += " Customer asked about general skincare.";
  }
  if (productsText) {
    summary += ` Recommended: ${productsText}.`;
  } else {
    summary += " Explored various K-Beauty product recommendations.";
  }
  return summary;
}

/**
 * Saves a lead or draft order to Firestore with status 'sent_to_whatsapp' to both draft_orders and chat_leads collections
 */
export async function saveLeadToFirestore(orderState: OrderState, messages: ChatMessage[] = []): Promise<any> {
  try {
    const leadId = "LEAD-" + Math.floor(100000 + Math.random() * 900000);
    
    const itemsSubtotal = orderState.products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    // Standard flat delivery charge
    const deliveryCharge = 80;
    const totalAmount = itemsSubtotal + deliveryCharge;

    // 1. Save to draft_orders for backward compatibility
    const draftRef = doc(collection(db, "draft_orders"), leadId);
    const draftPayload = {
      id: leadId,
      customerName: "WhatsApp Bot Lead",
      customerPhone: orderState.phone,
      address: orderState.address,
      items: orderState.products.map(p => ({
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: p.quantity
      })),
      totalAmount,
      status: "sent_to_whatsapp",
      createdAt: new Date().toISOString(),
      sessionType: "WhatsApp Bot",
      paymentMethod: "Cash on Delivery",
      isPaid: false
    };
    await setDoc(draftRef, sanitizeForFirestore(draftPayload));

    // 2. Save to chat_leads with the requested schema
    const leadRef = doc(collection(db, "chat_leads"), leadId);
    const leadPayload = {
      id: leadId,
      customer_name: "WhatsApp Chat Lead",
      customer_phone: orderState.phone || "",
      customer_address: orderState.address || "",
      items: orderState.products.map(p => ({
        product_id: p.id,
        name_en: p.name,
        quantity: p.quantity,
        unit_price: p.price
      })),
      total: totalAmount,
      conversation_summary: generateConversationSummary(messages, orderState),
      status: "sent_to_whatsapp" as const,
      created_at: new Date(),
      last_updated_at: new Date()
    };
    await setDoc(leadRef, sanitizeForFirestore(leadPayload));

    console.log("Successfully saved draft lead to both draft_orders and chat_leads collections:", leadId);
    return leadPayload;
  } catch (error) {
    console.error("Error saving lead order to Firestore:", error);
    throw error;
  }
}

/**
 * Helper to normalize and clean WhatsApp phone numbers to international digits
 */
export function formatWhatsAppNumber(rawNumber?: string): string {
  if (!rawNumber) return '8801755837545';
  let digits = rawNumber.replace(/\D/g, '');
  if (digits.startsWith('800')) {
    digits = '880' + digits.slice(3);
  } else if (digits.startsWith('01')) {
    digits = '880' + digits.slice(1);
  } else if (!digits.startsWith('880') && digits.length === 10 && digits.startsWith('1')) {
    digits = '880' + digits;
  }
  if (digits === '8801712345678' || digits === '01712345678' || !digits) {
    digits = '8801755837545';
  }
  return digits;
}

/**
 * Retrieves the site settings to fetch the WhatsApp number
 */
export async function fetchSiteSettings(): Promise<{ whatsappNumber: string }> {
  try {
    const settingsRef = doc(db, 'site_settings', 'main_config');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.whatsappNumber) {
        const cleaned = formatWhatsAppNumber(data.whatsappNumber);
        return { whatsappNumber: cleaned };
      }
    }
  } catch (error) {
    console.error("Error fetching site settings:", error);
  }
  // Fallback to default WhatsApp number
  return { whatsappNumber: '8801755837545' };
}
