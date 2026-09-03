import { NextResponse } from "next/server";
import { sendBookingWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

type BookingPayload = {
  fullName?: string;
  phoneNumber?: string;
  appointmentType?: string;
  preferredDate?: string;
  preferredTime?: string;
  appointmentId?: string;
};

export async function POST(request: Request) {
  let payload: BookingPayload;
  try {
    payload = (await request.json()) as BookingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid notification request." }, { status: 400 });
  }

  if (
    !payload.fullName?.trim() ||
    !payload.phoneNumber?.trim() ||
    !payload.appointmentType?.trim() ||
    !payload.preferredDate?.trim() ||
    !payload.preferredTime?.trim() ||
    !payload.appointmentId?.trim()
  ) {
    return NextResponse.json({ error: "Incomplete booking notification details." }, { status: 400 });
  }

  try {
    await sendBookingWhatsApp({
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      appointmentType: payload.appointmentType,
      preferredDate: payload.preferredDate,
      preferredTime: payload.preferredTime,
      appointmentId: payload.appointmentId,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("WhatsApp booking notification failed", error);
    return NextResponse.json({ sent: false, error: "WhatsApp notification could not be sent." }, { status: 502 });
  }
}
