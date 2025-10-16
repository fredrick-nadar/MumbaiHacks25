// EmailJS Service for TaxWise Login Notifications
import emailjs from '@emailjs/browser';

class EmailService {
  constructor() {
    // Initialize EmailJS with environment variables
    this.publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY';
    this.serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
    this.templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
    
    // App configuration
    this.supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@taxwise.app';
    this.appName = import.meta.env.VITE_APP_NAME || 'TaxWise';
    this.dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5173/dashboard/overview';
    
    // Initialize EmailJS
    emailjs.init(this.publicKey);
  }

  /**
   * Send login notification email
   * @param {Object} loginData - Login information
   * @param {string} loginData.userName - User's name
   * @param {string} loginData.userEmail - User's email
   * @param {string} loginData.loginTime - Login timestamp
   * @param {string} loginData.deviceInfo - Device/browser info
   * @param {string} loginData.ipAddress - User's IP address
   * @param {boolean} loginData.isFirstLogin - Whether this is first login after registration
   */
  async sendLoginNotification(loginData) {
    try {
      // Validate required fields
      if (!loginData.userEmail || !loginData.userEmail.includes('@')) {
        throw new Error('Valid email address is required');
      }

      const templateParams = {
        // EmailJS recipient configuration
        to_name: loginData.userName,
        to_email: loginData.userEmail,
        reply_to: loginData.userEmail,
        
        // Email content variables
        user_name: loginData.userName,
        user_email: loginData.userEmail,
        login_time: loginData.loginTime,
        device_info: loginData.deviceInfo,
        ip_address: loginData.ipAddress,
        login_type: loginData.isFirstLogin ? 'First Login (Welcome!)' : 'Regular Login',
        platform_name: this.appName,
        support_email: this.supportEmail,
        dashboard_url: this.dashboardUrl,
        app_logo: 'https://your-domain.com/logo.png', // Add your logo URL
        current_year: new Date().getFullYear(),
        login_date: new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        login_time_formatted: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };

      console.log('📧 EmailJS Template Params:', templateParams);
      console.log('📧 EmailJS Config:', {
        serviceId: this.serviceId,
        templateId: this.templateId,
        publicKey: this.publicKey?.substring(0, 10) + '...' // Only show first 10 chars for security
      });
      console.log('📧 Recipient:', templateParams.to_email, 'Name:', templateParams.to_name);

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      console.log('✅ Login notification email sent successfully:', response);
      return {
        success: true,
        response
      };
    } catch (error) {
      console.error('❌ Failed to send login notification email:', error);
      return {
        success: false,
        error: error.message || error
      };
    }
  }

  /**
   * Get device information for email
   */
  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return `${browser} on ${os}`;
  }

  /**
   * Get user's IP address (approximate)
   */
  async getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not fetch IP address:', error);
      return 'Unknown';
    }
  }
}

export default new EmailService();