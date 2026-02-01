import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, message, website } = req.body;

    // Honeypot check
    if (website) {
        // Silently reject spam
        return res.status(200).json({ message: 'Email sent successfully' });
    }

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const contactTo = process.env.CONTACT_TO || emailUser;

    if (!emailUser || !emailPass) {
        return res.status(500).json({ error: 'Server email configuration is missing' });
    }

    if (!contactTo || !emailRegex.test(contactTo)) {
        return res.status(500).json({ error: 'Recipient email configuration is invalid' });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const mailOptions = {
            from: emailUser,
            to: contactTo,
            replyTo: email, // Allow replying to the sender
            subject: `New Contact Form Submission from ${name}`,
            text: `
        Name: ${name}
        Email: ${email}
        
        Message:
        ${message}
      `,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email Error:', error);
        return res.status(500).json({ error: 'Failed to send email' });
    }
}
