# 🚨 EmailJS Template Configuration Fix

## The Problem:
**Error**: "The recipients address is empty" (422 error)

## The Solution:
You need to configure your EmailJS template to properly receive the recipient email address.

---

## 🎯 STEP 1: Fix EmailJS Template Settings

1. **Go to EmailJS Dashboard** → `https://dashboard.emailjs.com/admin`
2. **Click "Email Templates"** → Find your template `template_a7f5vsq`
3. **Click "Settings"** tab (at the top of template editor)

### 🔧 Template Settings Configuration:

**Settings Tab Fields:**
- **Template Name**: `TaxWise Login Notification`
- **Template ID**: `template_a7f5vsq` (keep existing)

**Email Configuration:**
- **To Email**: `{{to_email}}` ⬅️ **CRITICAL: Enter exactly this**
- **To Name**: `{{to_name}}` 
- **From Name**: `TaxWise Security`
- **From Email**: `your-gmail@gmail.com` (your Gmail address)
- **Reply To**: `{{reply_to}}`
- **Subject**: `{{login_type}} - {{platform_name}} Security Alert`

### 📧 IMPORTANT: To Email Field
The **"To Email"** field in template settings MUST be: `{{to_email}}`

This tells EmailJS to use the email address we send from the application.

---

## 🎯 STEP 2: Verify Template Content

Your template content (in the "Content" tab) should use these variables:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{platform_name}} Login Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff;">
    
    <!-- Main Container -->
    <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);">
        
        <!-- Header -->
        <div style="background: rgba(30, 30, 30, 0.8); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(135deg, #00d4ff, #0099cc); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 24px;">TW</span>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #ffffff;">{{platform_name}}</h1>
            <p style="margin: 8px 0 0; color: #aaa; font-size: 16px;">Tax Management Assistant</p>
        </div>

        <!-- Login Alert -->
        <div style="padding: 32px 24px; background: rgba(15, 15, 15, 0.9);">
            <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px; font-size: 20px; color: #00d4ff;">🔐 Login Alert</h2>
                <p style="margin: 0; color: #ffffff; font-size: 16px;">
                    <strong>Hello {{user_name}}!</strong> Your TaxWise account was accessed successfully.
                </p>
                <p style="margin: 8px 0 0; color: #aaa; font-size: 14px;">Login Type: {{login_type}}</p>
            </div>

            <!-- User Info -->
            <div style="background: rgba(30, 30, 30, 0.8); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <h3 style="margin: 0 0 16px; color: #ffffff; font-size: 18px;">Login Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #aaa; width: 40%;">User:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #ffffff; font-weight: 600;">{{user_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #aaa;">Email:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #ffffff;">{{user_email}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #aaa;">Date:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #ffffff;">{{login_date}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #aaa;">Time:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #ffffff;">{{login_time_formatted}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #aaa;">Device:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #ffffff;">{{device_info}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #aaa;">IP Address:</td>
                        <td style="padding: 12px 0; color: #ffffff;">{{ip_address}}</td>
                    </tr>
                </table>
            </div>

            <!-- Action Buttons -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #00d4ff, #0099cc); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-right: 16px;">
                    Open Dashboard
                </a>
                <a href="mailto:{{support_email}}" style="display: inline-block; background: rgba(40, 40, 40, 0.8); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; border: 1px solid rgba(255, 255, 255, 0.2);">
                    Contact Support
                </a>
            </div>

            <!-- Security Notice -->
            <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="margin: 0; color: #ffc107; font-size: 14px;">
                    <strong>⚠️ Security Notice:</strong> If you didn't log in, please contact our support team immediately at {{support_email}}
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: rgba(20, 20, 20, 0.9); padding: 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
            <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
                © {{current_year}} {{platform_name}}. All rights reserved.
            </p>
            <p style="margin: 0; color: #666; font-size: 12px;">
                This email was sent because you logged into your TaxWise account.
            </p>
        </div>
    </div>
</body>
</html>
```

---

## 🎯 STEP 3: Save and Test

1. **Save Template** → Click "Save" button
2. **Test Template** → Click "Test" button in EmailJS dashboard
3. **Test with App** → Try logging in to your application

---

## 🔍 Verification Checklist

Before testing, verify these settings in EmailJS:

- [ ] **Template Settings → To Email**: `{{to_email}}`
- [ ] **Template Settings → To Name**: `{{to_name}}`
- [ ] **Template Settings → Subject**: `{{login_type}} - {{platform_name}} Security Alert`
- [ ] **Service Connected**: Gmail service is active
- [ ] **Template Saved**: All changes saved successfully

---

## 🚀 Expected Result

After fixing the template settings, when you log in:

1. ✅ No "recipients address is empty" error
2. ✅ Email sent to the user's actual email address
3. ✅ Email contains all user-specific information
4. ✅ Dark theme matching TaxWise design

**The key fix is setting the "To Email" field to `{{to_email}}` in your EmailJS template settings!**