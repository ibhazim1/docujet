import { NextResponse } from "next/server";
import { sendBookingEmail } from "@/lib/email";

export const runtime = "nodejs";

type BookingPayload = {
  fullName?: string;
  email?: string;
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
    return NextResponse.json({ error: "Invalid email request." }, { status: 400 });
  }

  if (
    !payload.fullName?.trim() ||
    !payload.email?.trim() ||
    !payload.appointmentType?.trim() ||
    !payload.preferredDate?.trim() ||
    !payload.preferredTime?.trim() ||
    !payload.appointmentId?.trim()
  ) {
    return NextResponse.json({ error: "Incomplete booking email details." }, { status: 400 });
  }

  try {
    await sendBookingEmail({
      fullName: payload.fullName,
      email: payload.email,
      appointmentType: payload.appointmentType,
      preferredDate: payload.preferredDate,
      preferredTime: payload.preferredTime,
      appointmentId: payload.appointmentId,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Booking email failed", error);
    return NextResponse.json({ sent: false, error: "Email could not be sent." }, { status: 502 });
  }
}
