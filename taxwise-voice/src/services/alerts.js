const cron = require('node-cron');
const User = require('../models/User');
const Alert = require('../models/Alert');
const twilioService = require('./twilioClient');
const config = require('../config/env');

class AlertsService {
  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;
    this.cronJob = null;
  }

  /**
   * Initialize alerts scheduler
   * @param {Express} app - Express app instance
   */
  initAlertsScheduler(app) {
    console.log('🚨 Initializing alerts scheduler...');
    
    // Run daily at 9:00 AM
    this.cronJob = cron.schedule('0 9 * * *', async () => {
      await this.runDailyAlerts();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    // Also run every 4 hours for more frequent monitoring
    cron.schedule('0 */4 * * *', async () => {
      await this.runFrequentAlerts();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    console.log('✅ Alerts scheduler initialized');
    console.log('📅 Daily alerts: 9:00 AM IST');
    console.log('🔄 Frequent alerts: Every 4 hours');

    // Store reference to app for potential manual triggers
    this.app = app;
  }

  /**
   * Run daily comprehensive alerts check
   */
  async runDailyAlerts() {
    if (this.isRunning) {
      console.log('⚠️ Daily alerts already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();
    
    console.log('🚨 Starting daily alerts check...');
    
    try {
      const users = await User.find({});
      console.log(`👥 Checking ${users.length} users for alerts`);
      
      let alertsTriggered = 0;
      let notificationsSent = 0;
      
      for (const user of users) {
        const alerts = await this.checkUserAlerts(user);
        
        for (const alert of alerts) {
          await this.processAlert(alert, user);
          alertsTriggered++;
          
          // Send notifications
          const notifications = await this.sendAlertNotifications(alert, user);
          notificationsSent += notifications.sent;
        }
      }
      
      console.log(`✅ Daily alerts completed: ${alertsTriggered} alerts, ${notificationsSent} notifications sent`);
      
    } catch (error) {
      console.error('❌ Error in daily alerts:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run frequent alerts for critical issues
   */
  async runFrequentAlerts() {
    console.log('🔄 Running frequent alerts check...');
    
    try {
      // Check for critical issues that need immediate attention
      const criticalUsers = await User.find({
        $or: [
          { 'vitals.cibilEstimate': { $lt: config.CIBIL_THRESHOLD - 50 } }, // Very low CIBIL
          { 'vitals.utilization': { $gt: 80 } }, // Very high utilization
          { 'vitals.financeScore': { $lt: 40 } } // Very low finance score
        ]
      });
      
      if (criticalUsers.length > 0) {
        console.log(`🚨 Found ${criticalUsers.length} users with critical financial issues`);
        
        for (const user of criticalUsers) {
          // Check if we've already alerted this user recently (within 4 hours)
          const recentAlert = await Alert.findOne({
            userId: user._id,
            createdAt: { $gte: new Date(Date.now() - 4 * 60 * 60 * 1000) }
          });
          
          if (!recentAlert) {
            const alerts = await this.checkCriticalUserAlerts(user);
            for (const alert of alerts) {
              await this.processAlert(alert, user);
              await this.sendAlertNotifications(alert, user, true); // Mark as urgent
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error in frequent alerts:', error);
    }
  }

  /**
   * Check user for various alert conditions
   * @param {User} user - User document
   * @returns {Promise<Array>} Array of alert documents
   */
  async checkUserAlerts(user) {
    const alerts = [];
    const { vitals } = user;
    
    // CIBIL Drop Alert
    if (vitals.cibilEstimate < config.CIBIL_THRESHOLD) {
      const alert = await Alert.createCibilDropAlert(
        user._id,
        vitals.cibilEstimate,
        config.CIBIL_THRESHOLD, // Assume this was previous score
        config.CIBIL_THRESHOLD
      );
      alerts.push(alert);
    }
    
    // High Utilization Alert
    if (vitals.utilization > 70) {
      const alert = new Alert({
        userId: user._id,
        kind: 'UTILIZATION_HIGH',
        severity: vitals.utilization > 80 ? 'HIGH' : 'MEDIUM',
        payload: {
          utilization: vitals.utilization,
          threshold: 30,
          message: `Credit utilization is ${vitals.utilization}%, well above the recommended 30%`
        }
      });
      await alert.save();
      alerts.push(alert);
    }
    
    // Low Finance Score Alert
    if (vitals.financeScore < 60) {
      const alert = new Alert({
        userId: user._id,
        kind: 'FINANCE_SCORE_LOW',
        severity: vitals.financeScore < 40 ? 'HIGH' : 'MEDIUM',
        payload: {
          financeScore: vitals.financeScore,
          threshold: 60,
          message: `Finance score is ${vitals.financeScore}, below healthy threshold`
        }
      });
      await alert.save();
      alerts.push(alert);
    }
    
    // Spending vs Income Alert
    if (vitals.monthExpense > vitals.monthIncome * 0.9) { // Spending > 90% of income
      const spendingRatio = ((vitals.monthExpense / vitals.monthIncome) * 100).toFixed(1);
      
      const alert = new Alert({
        userId: user._id,
        kind: 'SPEND_SPIKE',
        severity: vitals.monthExpense > vitals.monthIncome ? 'HIGH' : 'MEDIUM',
        payload: {
          currentSpend: vitals.monthExpense,
          monthIncome: vitals.monthIncome,
          spendingRatio: parseFloat(spendingRatio),
          message: `Monthly spending is ${spendingRatio}% of income`
        }
      });
      await alert.save();
      alerts.push(alert);
    }
    
    return alerts;
  }

  /**
   * Check user for critical alerts only
   * @param {User} user - User document
   * @returns {Promise<Array>} Array of critical alert documents
   */
  async checkCriticalUserAlerts(user) {
    const alerts = [];
    const { vitals } = user;
    
    // Critical CIBIL Alert
    if (vitals.cibilEstimate < config.CIBIL_THRESHOLD - 50) {
      const alert = new Alert({
        userId: user._id,
        kind: 'CIBIL_DROP',
        severity: 'CRITICAL',
        payload: {
          currentScore: vitals.cibilEstimate,
          threshold: config.CIBIL_THRESHOLD,
          message: `CRITICAL: CIBIL score is ${vitals.cibilEstimate}, significantly below threshold`
        }
      });
      await alert.save();
      alerts.push(alert);
    }
    
    return alerts;
  }

  /**
   * Process individual alert
   * @param {Alert} alert - Alert document
   * @param {User} user - User document
   */
  async processAlert(alert, user) {
    console.log(`🚨 Processing ${alert.kind} alert for user ${user.name}:`, {
      severity: alert.severity,
      payload: alert.payload
    });
    
    // Log alert for monitoring
    console.log(`📊 Alert Details:`, {
      userId: user._id.toString(),
      userName: user.name,
      phone: user.phoneFormatted,
      alertKind: alert.kind,
      severity: alert.severity,
      createdAt: alert.createdAt
    });
  }

  /**
   * Send alert notifications via SMS, WhatsApp, and optional call
   * @param {Alert} alert - Alert document
   * @param {User} user - User document
   * @param {boolean} urgent - Whether this is an urgent alert
   * @returns {Promise<Object>} Notification results
   */
  async sendAlertNotifications(alert, user, urgent = false) {
    const results = {
      sms: null,
      whatsapp: null,
      call: null,
      sent: 0
    };
    
    try {
      // Get notification messages
      const smsMessage = alert.getNotificationMessage();
      const whatsappMessage = alert.getWhatsAppMessage();
      
      // Send SMS
      if (user.phone) {
        console.log(`📱 Sending SMS alert to ${user.name}...`);
        results.sms = await twilioService.sendSMS(user.phone, smsMessage);
        
        if (results.sms.success) {
          await alert.markChannelSent('sms', results.sms.messageId);
          results.sent++;
          console.log(`✅ SMS sent to ${user.phoneFormatted}`);
        } else {
          console.error(`❌ SMS failed to ${user.phoneFormatted}:`, results.sms.error);
          await alert.markChannelSent('sms', null, results.sms.error);
        }
      }
      
      // Send WhatsApp - Send to both user and your personal number for monitoring
      console.log(`💬 Sending WhatsApp alerts...`);
      
      // Send to user
      if (user.phone) {
        results.whatsapp = await twilioService.sendWhatsApp(user.phone, whatsappMessage);
        
        if (results.whatsapp.success) {
          await alert.markChannelSent('whatsapp', results.whatsapp.messageId);
          results.sent++;
          console.log(`✅ WhatsApp sent to user ${user.phoneFormatted}`);
        } else {
          console.error(`❌ WhatsApp failed to user ${user.phoneFormatted}:`, results.whatsapp.error);
          await alert.markChannelSent('whatsapp', null, results.whatsapp.error);
        }
      }
      
      // Send WhatsApp to your monitoring number
      if (config.YOUR_WHATSAPP_NUMBER) {
        const adminMessage = `🚨 *TaxWise Alert Monitor*\n\nUser: ${user.name} (${user.phoneFormatted})\nAlert: ${alert.kind}\nSeverity: ${alert.severity}\n\n${alert.getNotificationMessage()}\n\nTime: ${new Date().toLocaleString('en-IN')}`;
        
        const adminResult = await twilioService.sendWhatsApp(config.YOUR_WHATSAPP_NUMBER, adminMessage);
        
        if (adminResult.success) {
          console.log(`✅ Admin WhatsApp notification sent`);
        } else {
          console.error(`❌ Admin WhatsApp notification failed:`, adminResult.error);
        }
      }
      
      // Optional outbound call for high severity alerts or urgent situations
      if ((alert.severity === 'HIGH' || alert.severity === 'CRITICAL' || urgent) && user.phone) {
        console.log(`📞 Initiating outbound call for ${alert.severity} alert...`);
        
        const bridgeUrl = `${config.BASE_URL}/voice/bridge-to-vapi`;
        const statusCallbackUrl = `${config.BASE_URL}/voice/status-callback`;
        
        results.call = await twilioService.makeCall(
          user.phone,
          bridgeUrl,
          statusCallbackUrl,
          ['initiated', 'answered', 'completed']
        );
        
        if (results.call.success) {
          alert.channels.call.initiated = true;
          alert.channels.call.initiatedAt = new Date();
          alert.channels.call.callSid = results.call.callSid;
          alert.channels.call.status = 'initiated';
          await alert.save();
          
          console.log(`✅ Alert call initiated: ${results.call.callSid}`);
        } else {
          console.error(`❌ Alert call failed:`, results.call.error);
          alert.channels.call.error = results.call.error;
          await alert.save();
        }
      }
      
    } catch (error) {
      console.error(`❌ Error sending alert notifications:`, error);
    }
    
    return results;
  }

  /**
   * Manual trigger for testing alerts
   * @param {string} userId - User ID to test
   */
  async triggerTestAlert(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      console.log(`🧪 Triggering test alert for ${user.name}...`);
      
      // Create a test alert
      const testAlert = new Alert({
        userId: user._id,
        kind: 'MANUAL_ALERT',
        severity: 'MEDIUM',
        payload: {
          message: 'This is a test alert from TaxWise Voice System',
          timestamp: new Date().toISOString(),
          testMode: true
        }
      });
      
      await testAlert.save();
      
      // Send notifications
      const results = await this.sendAlertNotifications(testAlert, user);
      
      console.log(`✅ Test alert completed:`, results);
      return results;
      
    } catch (error) {
      console.error('❌ Error triggering test alert:', error);
      throw error;
    }
  }

  /**
   * Stop the alerts scheduler
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 Alerts scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      scheduled: this.cronJob ? this.cronJob.scheduled : false,
      cronExpression: '0 9 * * * (Daily at 9 AM IST)',
      frequentExpression: '0 */4 * * * (Every 4 hours)'
    };
  }
}

// Export singleton instance
module.exports = new AlertsService();