module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, project_type, message } = req.body;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY 
      },
      body: JSON.stringify({
        // ⚠️ CRITICAL: The email address below MUST be verified in your Brevo account!
        sender: { email: "hello@echelon.dev", name: "ECHELON Website" }, 
        to: [{ email: "hello@echelon.dev", name: "ECHELON Team" }],
        replyTo: { email: email, name: name },
        subject: `New Enquiry: ${project_type.toUpperCase()} — ${name}`,
        htmlContent: `
          <h3>New Project Enquiry</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Level:</strong> ${project_type}</p>
          <p><strong>Brief:</strong><br/> ${message.replace(/\n/g, '<br>')}</p>
        `
      })
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      // If Brevo rejects it, this will print the EXACT reason in your Vercel Logs
      const errorData = await response.json();
      console.error("BREVO REJECTED THE EMAIL:", errorData); 
      return res.status(response.status).json({ error: errorData });
    }
  } catch (error) {
    console.error("SERVER CRASHED:", error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
