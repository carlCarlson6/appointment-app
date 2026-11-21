import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const from = process.env.EMAIL_FROM ?? "Appointments <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, text: string) {
  if (!resend) {
    console.log(`[email skipped — RESEND_API_KEY not set] to=${to} subject="${subject}"`);
    console.log(text);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) console.error("[email error]", error);
  } catch (err) {
    console.error("[email error]", err);
  }
}

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

export function sendBookingConfirmationClient(params: {
  to: string;
  clientName: string;
  businessName: string;
  serviceName: string;
  start: string;
  timezone: string;
  confirmationUrl: string;
  cancelUrl: string;
}) {
  const { to, clientName, businessName, serviceName, start, timezone, confirmationUrl, cancelUrl } =
    params;
  return sendEmail(
    to,
    `Booking confirmed: ${serviceName} at ${businessName}`,
    [
      `Hi ${clientName},`,
      ``,
      `Your booking is confirmed:`,
      `  ${serviceName} at ${businessName}`,
      `  ${formatTime(start, timezone)} (${timezone})`,
      ``,
      `View it here: ${confirmationUrl}`,
      ``,
      `Need to cancel? ${cancelUrl}`,
      ``,
      `Thanks!`,
    ].join("\n"),
  );
}

export function sendBookingNotificationOwner(params: {
  to: string;
  businessName: string;
  serviceName: string;
  start: string;
  timezone: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
}) {
  const { to, businessName, serviceName, start, timezone, clientName, clientEmail, clientPhone } =
    params;
  return sendEmail(
    to,
    `New booking: ${serviceName} at ${businessName}`,
    [
      `New booking for ${businessName}:`,
      `  ${serviceName}`,
      `  ${formatTime(start, timezone)} (${timezone})`,
      `  Client: ${clientName}`,
      `  Email: ${clientEmail}`,
      ...(clientPhone ? [`  Phone: ${clientPhone}`] : []),
    ].join("\n"),
  );
}

export function sendCancellationClient(params: {
  to: string;
  clientName: string;
  businessName: string;
  serviceName: string;
  start: string;
  timezone: string;
}) {
  const { to, clientName, businessName, serviceName, start, timezone } = params;
  return sendEmail(
    to,
    `Booking cancelled: ${serviceName} at ${businessName}`,
    [
      `Hi ${clientName},`,
      ``,
      `Your booking has been cancelled:`,
      `  ${serviceName} at ${businessName}`,
      `  ${formatTime(start, timezone)} (${timezone})`,
      ``,
      `Feel free to book another time.`,
    ].join("\n"),
  );
}

export function sendCancellationOwner(params: {
  to: string;
  businessName: string;
  serviceName: string;
  start: string;
  timezone: string;
  clientName: string;
}) {
  const { to, businessName, serviceName, start, timezone, clientName } = params;
  return sendEmail(
    to,
    `Cancellation: ${serviceName} at ${businessName}`,
    [
      `A booking was cancelled for ${businessName}:`,
      `  ${serviceName}`,
      `  ${formatTime(start, timezone)} (${timezone})`,
      `  Client: ${clientName}`,
    ].join("\n"),
  );
}
