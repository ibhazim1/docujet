"use client";

import { useMemo, useState } from "react";
import { bookingProducts, bookingTypes } from "@/lib/site-data";

type FormValues = {
  fullName: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  productOfInterest: string;
  appointmentType: string;
  preferredDate: string;
  preferredTime: string;
  additionalNotes: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  fullName: "",
  companyName: "",
  email: "",
  phoneNumber: "",
  productOfInterest: bookingProducts[0],
  appointmentType: bookingTypes[0],
  preferredDate: "",
  preferredTime: "",
  additionalNotes: "",
};

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) errors.fullName = "Full name is required.";
  if (!values.companyName.trim())
    errors.companyName = "Company name is required.";
  if (!values.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.phoneNumber.trim()) {
    errors.phoneNumber = "Phone number is required.";
  }

  if (!values.preferredDate) {
    errors.preferredDate = "Preferred date is required.";
  }

  if (!values.preferredTime) {
    errors.preferredTime = "Preferred time is required.";
  }

  return errors;
}

export default function BookingForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  function updateField<Key extends keyof FormValues>(
    field: Key,
    value: FormValues[Key],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitted(false);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitted(true);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] md:p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Full Name"
          htmlFor="fullName"
          error={errors.fullName}
          input={
            <input
              id="fullName"
              name="fullName"
              value={values.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              className={inputClassName}
            />
          }
        />
        <Field
          label="Company Name"
          htmlFor="companyName"
          error={errors.companyName}
          input={
            <input
              id="companyName"
              name="companyName"
              value={values.companyName}
              onChange={(event) =>
                updateField("companyName", event.target.value)
              }
              className={inputClassName}
            />
          }
        />
        <Field
          label="Email Address"
          htmlFor="email"
          error={errors.email}
          input={
            <input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={inputClassName}
            />
          }
        />
        <Field
          label="Phone Number"
          htmlFor="phoneNumber"
          error={errors.phoneNumber}
          input={
            <input
              id="phoneNumber"
              name="phoneNumber"
              value={values.phoneNumber}
              onChange={(event) =>
                updateField("phoneNumber", event.target.value)
              }
              className={inputClassName}
            />
          }
        />
        <Field
          label="Product of Interest"
          htmlFor="productOfInterest"
          input={
            <select
              id="productOfInterest"
              name="productOfInterest"
              value={values.productOfInterest}
              onChange={(event) =>
                updateField("productOfInterest", event.target.value)
              }
              className={inputClassName}
            >
              {bookingProducts.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          }
        />
        <Field
          label="Appointment Type"
          htmlFor="appointmentType"
          input={
            <select
              id="appointmentType"
              name="appointmentType"
              value={values.appointmentType}
              onChange={(event) =>
                updateField("appointmentType", event.target.value)
              }
              className={inputClassName}
            >
              {bookingTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          }
        />
        <Field
          label="Preferred Date"
          htmlFor="preferredDate"
          error={errors.preferredDate}
          input={
            <input
              id="preferredDate"
              name="preferredDate"
              type="date"
              min={today}
              value={values.preferredDate}
              onChange={(event) =>
                updateField("preferredDate", event.target.value)
              }
              className={inputClassName}
            />
          }
        />
        <Field
          label="Preferred Time"
          htmlFor="preferredTime"
          error={errors.preferredTime}
          input={
            <input
              id="preferredTime"
              name="preferredTime"
              type="time"
              value={values.preferredTime}
              onChange={(event) =>
                updateField("preferredTime", event.target.value)
              }
              className={inputClassName}
            />
          }
        />
      </div>

      <div className="mt-5">
        <Field
          label="Additional Notes"
          htmlFor="additionalNotes"
          input={
            <textarea
              id="additionalNotes"
              name="additionalNotes"
              rows={5}
              value={values.additionalNotes}
              onChange={(event) =>
                updateField("additionalNotes", event.target.value)
              }
              className={`${inputClassName} resize-y`}
            />
          }
        />
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          This booking form is ready for frontend use and can be connected to a
          no-code backend or API later without changing the user-facing
          structure.
        </p>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-sky-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          Submit Appointment Request
        </button>
      </div>

      {submitted ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Demo form submitted. Backend integration pending.
        </div>
      ) : null}
    </form>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  input: React.ReactNode;
  error?: string;
};

function Field({ label, htmlFor, input, error }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-slate-800"
      >
        {label}
      </label>
      {input}
      {error ? (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
