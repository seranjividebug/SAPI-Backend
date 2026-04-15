const nodemailer = require('nodemailer');

// Create SMTP transporter
function createTransporter() {
  const options = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production' ? process.env.SMTP_SSL_REJECT_UNAUTHORIZED !== 'false' : false
    }
  };



  return nodemailer.createTransport(options);
}

// Send registration email with credentials
async function sendRegistrationEmail(email, fullName, password, role) {
  try {
    const transporter = createTransporter();
    
    const roleName = role === 1 ? 'Admin' : 'User';
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your SAPI Account Credentials',
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'SAPI Backend',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      },
      text: `
Hello ${fullName},

Your account has been successfully created as a ${roleName}.

Login Credentials:
Email: ${email}
Password: ${password}

Please keep your credentials secure and do not share them with anyone.

Login here: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

If you did not request this account, please ignore this email.

© ${new Date().getFullYear()} SAPI. All rights reserved.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #1a1a4a; color: white; padding: 20px; text-align: center;">
            <img src="https://thesovereignaipowerindex.org/logo.png" alt="SAPI Logo" style="max-width: 150px; margin-bottom: 15px;">
            <h1 style="margin: 0; color: #d4af37;">Welcome to SAPI</h1>
            <p style="margin: 5px 0 0 0; color: #ffffff;">Sovereign AI Power Index</p>
          </div>
          
          <div style="padding: 20px; background-color: #1a1a4a;">
            <h2 style="color: #d4af37; margin-top: 0;">Hello ${fullName},</h2>
            <p style="color: #e0e0e0; line-height: 1.6;">
              Your account has been successfully created as a <strong style="color: #d4af37;">${roleName}</strong>. 
              Below are your login credentials:
            </p>
            
            <div style="background-color: #0a0a2a; padding: 15px; border-left: 4px solid #d4af37; margin: 20px 0;">
              <p style="margin: 5px 0; color: #ffffff;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0; color: #ffffff;"><strong>Password:</strong> ${password}</p>
            </div>
            
            <p style="color: #e0e0e0; line-height: 1.6;">
              Please keep your credentials secure and do not share them with anyone.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background-color: #d4af37; color: #1a1a1a; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            
            <p style="color: #999999; font-size: 12px; margin-top: 30px;">
              If you did not request this account, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #999999; font-size: 12px; padding: 20px; background-color: #1a1a4a;">
            <p>&copy; ${new Date().getFullYear()} SAPI. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending registration email:', error);
    return { success: false, error: error.message };
  }
}

// Send contact notification email
async function sendContactNotificationEmail(name, email, organization, role, area_of_interest, message) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: ['malinisaran199@gmail.com', 'azam@coreintel.io'],
      subject: `New Request Introduction`,
      text: `
New Contact Request Received

Name: ${name}
Email: ${email}
Organization: ${organization || 'Not specified'}
Role: ${role || 'Not specified'}
Area of Interest: ${area_of_interest || 'Not specified'}

Message:
${message}

Received at: ${new Date().toISOString()}
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #1a1a4a; color: white; padding: 20px; text-align: center;">
            <img src="https://thesovereignaipowerindex.org/logo.png" alt="SAPI Logo" style="max-width: 150px; margin-bottom: 15px;">
            <h1 style="margin: 0; color: #d4af37;">New Contact Request</h1>
          </div>
          
          <div style="padding: 20px; background-color: #1a1a4a;">
            <h2 style="color: #d4af37; margin-top: 0;">From: ${name}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #444; color: #d4af37;"><strong>Email:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #444; color: #ffffff;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #444; color: #d4af37;"><strong>Organization:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #444; color: #ffffff;">${organization || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #444; color: #d4af37;"><strong>Role:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #444; color: #ffffff;">${role || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #444; color: #d4af37;"><strong>Area of Interest:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #444; color: #ffffff;">${area_of_interest || 'Not specified'}</td>
              </tr>
            </table>
            
            <h3 style="color: #d4af37; margin-top: 20px;">Message:</h3>
            <p style="color: #e0e0e0; line-height: 1.6; background-color: #0a0a2a; padding: 15px; border-left: 4px solid #d4af37;">
              ${message}
            </p>
            
            <p style="color: #999999; font-size: 12px; margin-top: 20px;">
              Received at: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send contact notification:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendRegistrationEmail,
  sendContactNotificationEmail
};
