const nodemailer = require('nodemailer');

// Create SMTP transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Send registration email with credentials
async function sendRegistrationEmail(email, fullName, password, role) {
  try {
    const transporter = createTransporter();
    
    const roleName = role === 1 ? 'Admin' : 'User';
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Welcome to SAPI - Your Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4a90e2; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Welcome to SAPI</h1>
            <p style="margin: 5px 0 0 0;">Sovereign AI Power Index</p>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Hello ${fullName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Your account has been successfully created as a <strong>${roleName}</strong>. 
              Below are your login credentials:
            </p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Please keep your credentials secure and do not share them with anyone.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background-color: #4a90e2; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Your Account
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you did not request this account, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px; padding: 20px;">
            <p>&copy; ${new Date().getFullYear()} SAPI. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Registration email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending registration email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendRegistrationEmail
};
