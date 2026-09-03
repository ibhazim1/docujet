type BookingNotification = {
  fullName: string;
  phoneNumber: string;
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

function readableAppointmentId(id: string) {
  return id.length > 12 ? `APT-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}` : id;
}

function normalizePhone(phone: string) {
  const normalized = phone.trim().replace(/[\s().-]/g, "");
  if (!normalized.startsWith("+")) {
    throw new Error("Use the customer's international WhatsApp number, including the + country code.");
  }
  const digits = normalized.slice(1);
  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error("Use the customer's international WhatsApp number, including the + country code.");
  }
  return normalized;
}

export async function sendBookingWhatsApp(booking: BookingNotification) {
  const accountSid = requiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = requiredEnv("TWILIO_AUTH_TOKEN");
  const from = requiredEnv("TWILIO_WHATSAPP_FROM");
  const contentSid = requiredEnv("TWILIO_CONTENT_SID");
  const to = normalizePhone(booking.phoneNumber);
  const form = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify({
      1: booking.fullName,
      2: booking.appointmentType,
      3: booking.preferredDate,
      4: booking.preferredTime,
      5: readableAppointmentId(booking.appointmentId),
    }),
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twilio rejected the WhatsApp message (${response.status}): ${detail.slice(0, 300)}`);
  }
}
