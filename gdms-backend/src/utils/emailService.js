const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendResetEmail = async (email, resetToken) => {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: `"Hidellana Distributors" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hello,</p>
                <p>You requested a password reset for your GDMS account. Click the button below to reset it:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888;">&copy; ${new Date().getFullYear()} Hidellana GDMS. All rights reserved.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Reset email sent to ${email}`);
    } catch (error) {
        console.error('Error sending reset email:', error);
    }
};

module.exports = { sendResetEmail };
