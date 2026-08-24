import { createClient } from "./server";

type AppointmentRow = {
  id: string;
  customer_id: string;
  product_interest: string;
  appointment_type: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
};

type CustomerRow = {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  status: string;
  last_contact_at: string | null;
};

export type AdminAppointment = {
  id: string;
  customer: string;
  company: string;
  email: string;
  phone: string;
  product: string;
  appointmentType: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
};

export type AdminCustomer = {
  id: string;
  customer: string;
  company: string;
  email: string;
  phone: string;
  appointments: number;
  lastContact: string;
  status: string;
};

export async function getAdminAppointments() {
  const supabase = await createClient();

  const [appointmentsResult, customersResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, customer_id, product_interest, appointment_type, preferred_date, preferred_time, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, full_name, company_name, email, phone, status, last_contact_at"),
  ]);

  if (appointmentsResult.error) {
    return {
      data: [] as AdminAppointment[],
      error: appointmentsResult.error.message,
    };
  }

  if (customersResult.error) {
    return {
      data: [] as AdminAppointment[],
      error: customersResult.error.message,
    };
  }

  const customerMap = new Map(
    ((customersResult.data ?? []) as CustomerRow[]).map((customer) => [
      customer.id,
      customer,
    ]),
  );

  const data = ((appointmentsResult.data ?? []) as AppointmentRow[]).map(
    (appointment) => {
      const customer = customerMap.get(appointment.customer_id);

      return {
        id: appointment.id,
        customer: customer?.full_name ?? "Unknown customer",
        company: customer?.company_name ?? "Unknown company",
        email: customer?.email ?? "Unknown email",
        phone: customer?.phone ?? "Unknown phone",
        product: appointment.product_interest,
        appointmentType: appointment.appointment_type,
        preferredDate: appointment.preferred_date,
        preferredTime: appointment.preferred_time,
        status: appointment.status,
      };
    },
  );

  return { data, error: null };
}

export async function getAdminCustomers() {
  const supabase = await createClient();

  const [customersResult, appointmentsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, company_name, email, phone, status, last_contact_at")
      .order("created_at", { ascending: false }),
    supabase.from("appointments").select("customer_id"),
  ]);

  if (customersResult.error) {
    return {
      data: [] as AdminCustomer[],
      error: customersResult.error.message,
    };
  }

  if (appointmentsResult.error) {
    return {
      data: [] as AdminCustomer[],
      error: appointmentsResult.error.message,
    };
  }

  const appointmentCounts = new Map<string, number>();

  (appointmentsResult.data ?? []).forEach((row: { customer_id: string }) => {
    appointmentCounts.set(
      row.customer_id,
      (appointmentCounts.get(row.customer_id) ?? 0) + 1,
    );
  });

  const data = ((customersResult.data ?? []) as CustomerRow[]).map(
    (customer) => ({
      id: customer.id,
      customer: customer.full_name,
      company: customer.company_name,
      email: customer.email,
      phone: customer.phone,
      appointments: appointmentCounts.get(customer.id) ?? 0,
      lastContact: customer.last_contact_at
        ? new Date(customer.last_contact_at).toISOString().slice(0, 10)
        : "—",
      status: customer.status,
    }),
  );

  return { data, error: null };
}
