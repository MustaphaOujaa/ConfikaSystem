import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY && process.loadEnvFile) {
  try {
    process.loadEnvFile('.env');
  } catch {}
}

const resend = new Resend(process.env.RESEND_API_KEY);

const recipient = process.argv[2] || 'confikam@gmail.com';

console.log(`Sending test email to ${recipient}...`);

const response = await resend.emails.send({
  from: 'hello@confikasystem.de',
  to: recipient,
  subject: 'Test Email',
  html: '<p>It works!</p>',
});

console.log('Result:', response);
