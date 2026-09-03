type BookingEmail = {
  fullName: string;
  email: string;
  appointmentType: string;
  preferredDate: string;
  preferredTime: string;
  appointmentId: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export async function sendBookingEmail(booking: BookingEmail) {
  const apiKey = requiredEnv("BREVO_API_KEY");
  const senderEmail = requiredEnv("BREVO_SENDER_EMAIL");
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "DocuJet";
  const safeName = escapeHtml(booking.fullName);
  const safeType = escapeHtml(booking.appointmentType);
  const safeDate = escapeHtml(booking.preferredDate);
  const safeTime = escapeHtml(booking.preferredTime);
  const safeId = escapeHtml(booking.appointmentId.length > 12
    ? `APT-${booking.appointmentId.replaceAll("-", "").slice(0, 8).toUpperCase()}`
    : booking.appointmentId);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: booking.email, name: booking.fullName }],
      subject: `Appointment confirmed - ${booking.preferredDate}`,
      htmlContent: `<p>Hello ${safeName},</p><p>Your appointment has been confirmed.</p><p><strong>Appointment type:</strong> ${safeType}<br /><strong>Date:</strong> ${safeDate}<br /><strong>Time:</strong> ${safeTime}<br /><strong>Booking ID:</strong> ${safeId}</p><p>Please contact us if you need to reschedule.</p><p>Regards,<br />${escapeHtml(senderName)}</p>`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Brevo rejected the email (${response.status}): ${detail.slice(0, 300)}`);
  }
}
