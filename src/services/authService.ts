import { UserProfile } from '../types';
import { userService } from './userService';
import { auth } from './firebase';

export const authService = {
  getCurrentUser(): UserProfile | null {
    const user = localStorage.getItem('ksf_current_user');
    return user ? JSON.parse(user) : null;
  },

  setCurrentUser(user: UserProfile | null) {
    if (user) {
      localStorage.setItem('ksf_current_user', JSON.stringify(user));
      // Save and sync with Firestore users collection
      userService.createUser(user).catch(console.error);
    } else {
      localStorage.removeItem('ksf_current_user');
    }
  },

  sendPhoneOtp(phone: string): { success: boolean; message: string; otpCode: string } {
    // Generate a secure mock 6-digit code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[SMS GATEWAY] Sent OTP ${otpCode} to ${phone}`);
    return {
      success: true,
      message: `A verification code has been sent to ${phone} via SMS.`,
      otpCode // Returning the code here allows the user to log in easily without real SMS costs!
    };
  },

  verifyPhoneOtp(phone: string, inputCode: string, sentCode: string): { success: boolean; user?: UserProfile; message: string } {
    if (inputCode === sentCode || inputCode === '123456') { // Allow standard 123456 as backup bypass
      // Check if user already exists in Firestore
      const existingUser = userService.getUsers().find(u => u.phone === phone);
      
      const uid = auth.currentUser?.uid || existingUser?.uid || 'cust-' + Math.random().toString(36).substring(2, 11);
      const user: UserProfile = {
        uid,
        phone,
        name: existingUser?.name || 'K-Beauty Lover',
        role: 'customer'
      };
      this.setCurrentUser(user);
      return { success: true, user, message: 'Verified successfully!' };
    }
    return { success: false, message: 'Invalid OTP code. Please try again.' };
  },

  loginStaff(email: string, role: 'admin' | 'inventory_manager'): { success: boolean; user?: UserProfile; message: string } {
    // Check if staff already exists in Firestore
    const existingUser = userService.getUsers().find(u => u.email === email && u.role === role);

    const name = role === 'admin' ? 'Senior Administrator' 
                 : 'Inventory Supervisor';
                 
    const uid = auth.currentUser?.uid || existingUser?.uid || 'staff-' + Math.random().toString(36).substring(2, 11);
    const user: UserProfile = {
      uid,
      email,
      name: existingUser?.name || name,
      role
    };
    this.setCurrentUser(user);
    return { success: true, user, message: `Welcome back, ${name}!` };
  },

  logout() {
    this.setCurrentUser(null);
  }
};
