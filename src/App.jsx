import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Instagram,
  Lock,
  Shield,
  Download,
  Trash2,
  CreditCard,
  CheckCircle2,
  Sparkles,
  CalendarPlus,
  BadgeDollarSign,
  ChevronDown,
  Landmark,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

const PENDING_KEY = "mzparas_pending_booking_v4";
const REQUIRED_DEPOSIT = 50;
const ZELLE_RECIPIENT = "516-451-4570";

const DEFAULT_SERVICES = [
  { id: "svc-acrylic-full", name: "Full Set Acrylic", durationMin: 90, price: 65 },
  { id: "svc-acrylic-fill", name: "Acrylic Fill", durationMin: 60, price: 45 },
  { id: "svc-natural-mani", name: "Natural Manicure", durationMin: 45, price: 30 },
  { id: "svc-natural-pedi", name: "Natural Pedicure", durationMin: 60, price: 45 },
  { id: "svc-gel-add", name: "Gel Polish Add-On", durationMin: 15, price: 10 },
  { id: "svc-design", name: "Design Add-On", durationMin: 15, price: 10 },
];

const FEATURED_GALLERY = [
  {
    title: "Luxury Acrylic Sets",
    subtitle: "Clean structure • glossy finish • high-end detail",
    tone: "from-[#F2E6DC] to-[#EADDD1]",
  },
  {
    title: "Signature Natural Nails",
    subtitle: "Soft, polished, elevated everyday beauty",
    tone: "from-[#EEE3D8] to-[#E5D7CA]",
  },
  {
    title: "Pedicure Experience",
    subtitle: "Relaxed finish with refined salon care",
    tone: "from-[#F4ECE4] to-[#E8DDD0]",
  },
];

const DEFAULT_HOURS = {
  0: { open: "10:00", close: "18:00", closed: false },
  1: { open: "10:00", close: "19:00", closed: false },
  2: { open: "10:00", close: "19:00", closed: false },
  3: { open: "10:00", close: "19:00", closed: false },
  4: { open: "10:00", close: "19:00", closed: false },
  5: { open: "10:00", close: "20:00", closed: false },
  6: { open: "09:00", close: "20:00", closed: false },
};

const DEFAULT_SETTINGS = {
  salonName: "Mz Para’s Nailz",
  locationLine: "Flatbush, Brooklyn, NY",
  phone: "516-451-4570",
  instagram: "@MzParasNailz",
  slotStepMin: 15,
  bufferMin: 10,
  requirePhone: true,
  adminPin: "1234",
};

const pad2 = (n) => String(n).padStart(2, "0");
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function formatTime(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad2(m)} ${ampm}`;
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (String(phone).trim().startsWith("+")) return String(phone).trim();
  return String(phone).trim();
}

async function sendBookingSMS(phone, service, date, time, locationLine) {
  const normalized = normalizePhone(phone);
  if (!normalized) return;

  try {
    const res = await fetch("/api/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: normalized,
        message: `Thanks for booking with Mz Para's Nailz 💅

Service: ${service}
Date: ${date}
Time: ${time}
Location: ${locationLine}

We look forward to seeing you!`,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("SMS API error:", data);
    }
  } catch (err) {
    console.error("SMS failed:", err);
  }
}

function savePendingBooking(booking) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(booking));
}

function loadPendingBooking() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPendingBooking() {
  localStorage.removeItem(PENDING_KEY);
}

function formatICSDate(date) {
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  const h = pad2(date.getUTCHours());
  const min = pad2(date.getUTCMinutes());
  const s = pad2(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

function downloadAppointmentICS(booking, salonName, locationLine, serviceNames) {
  const start = new Date(booking.startISO);
  const end = new Date(booking.endISO);
  const now = new Date();

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mz Paras Nailz//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${booking.id}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${salonName} Appointment`,
    `DESCRIPTION:${serviceNames}`,
    `LOCATION:${locationLine}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");

  downloadText("mzparas-appointment.ics", ics);
}

function dbRowToAppointment(row) {
  return {
    id: row.id,
    createdAtISO: row.created_at_iso,
    date: row.date,
    startISO: row.start_iso,
    endISO: row.end_iso,
    serviceIds: row.service_ids || [],
    totalDurationMin: row.total_duration_min,
    totalPrice: Number(row.total_price || 0),
    customer: {
      name: row.customer_name || "",
      phone: row.customer_phone || "",
      notes: row.customer_notes || "",
    },
    status: row.status,
    paymentMethod: row.payment_method || "",
  };
}

function appointmentToDbRow(appt) {
  return {
    id: appt.id,
    created_at_iso: appt.createdAtISO,
    date: appt.date,
    start_iso: appt.startISO,
    end_iso: appt.endISO,
    service_ids: appt.serviceIds,
    total_duration_min: appt.totalDurationMin,
    total_price: appt.totalPrice,
    customer_name: appt.customer?.name || "",
    customer_phone: appt.customer?.phone || "",
    customer_notes: appt.customer?.notes || "",
    status: appt.status,
    payment_method: appt.paymentMethod || "",
  };
}

export default function App() {
  const [services] = useState(DEFAULT_SERVICES);
  const [hours] = useState(DEFAULT_HOURS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [appointments, setAppointments] = useState([]);

  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [selectedServiceId, setSelectedServiceId] = useState(DEFAULT_SERVICES[0].id);
  const [selectedTimeISO, setSelectedTimeISO] = useState(null);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [lastConfirmedBooking, setLastConfirmedBooking] = useState(null);
  const [lastZelleBooking, setLastZelleBooking] = useState(null);

  const [adminAuthed, setAdminAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(true);

  const todayISO = useMemo(() => toISODate(new Date()), []);

  async function refreshAppointments() {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("start_iso", { ascending: true });

    if (error) {
      console.error(error);
      setErrorMsg("Could not load appointments from database.");
      setLoadingBookings(false);
      return;
    }

    setAppointments((data || []).map(dbRowToAppointment));
    setLoadingBookings(false);
  }

  useEffect(() => {
    refreshAppointments();
  }, []);

  useEffect(() => {
    setSelectedTimeISO(null);
    setTimeMenuOpen(false);
    setErrorMsg("");
    setSuccessMsg("");
  }, [selectedDate, selectedServiceId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositStatus = params.get("deposit");

    if (!depositStatus) return;

    async function finalizeStripeSuccess() {
      if (depositStatus === "success") {
        const pending = loadPendingBooking();

        if (pending) {
          const confirmedBooking = { ...pending, status: "confirmed" };

          const { error } = await supabase
            .from("appointments")
            .insert([appointmentToDbRow(confirmedBooking)]);

          if (!error) {
            const start = new Date(pending.startISO);
            const serviceNames = pending.serviceIds
              .map((id) => services.find((s) => s.id === id)?.name)
              .filter(Boolean)
              .join(", ");

            sendBookingSMS(
              pending.customer?.phone || "",
              serviceNames,
              pending.date,
              formatTime(start),
              settings.locationLine
            );

            setLastConfirmedBooking(confirmedBooking);
            setLastZelleBooking(null);
            clearPendingBooking();
            setSuccessMsg("Deposit paid successfully. Your appointment is confirmed.");
            setCustomerName("");
            setCustomerPhone("");
            setCustomerNotes("");
            setSelectedTimeISO(null);
            await refreshAppointments();
          } else {
            console.error(error);
            setErrorMsg("Payment succeeded, but the appointment could not be saved.");
          }
        } else {
          setSuccessMsg("Deposit paid successfully.");
        }
      }

      if (depositStatus === "cancel") {
        clearPendingBooking();
        setErrorMsg("Deposit payment was canceled. Your appointment was not confirmed.");
      }

      params.delete("deposit");
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", newUrl);
    }

    finalizeStripeSuccess();
  }, [services, settings.locationLine]);

  const selectedServices = useMemo(
    () => services.filter((s) => s.id === selectedServiceId),
    [services, selectedServiceId]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.durationMin || 0), 0),
    [selectedServices]
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.price || 0), 0),
    [selectedServices]
  );

  const remainingBalance = useMemo(
    () => Math.max(0, totalPrice - REQUIRED_DEPOSIT),
    [totalPrice]
  );

  const dayOfWeek = useMemo(() => parseISODate(selectedDate).getDay(), [selectedDate]);

  const hoursForDay = useMemo(
    () => hours?.[dayOfWeek] ?? { open: "10:00", close: "18:00", closed: false },
    [hours, dayOfWeek]
  );

  const friendlyDate = useMemo(() => {
    const d = parseISODate(selectedDate);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === todayISO && (a.status === "confirmed" || a.status === "completed"));
  }, [appointments, todayISO]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => new Date(a.startISO) >= new Date())
      .sort((a, b) => a.startISO.localeCompare(b.startISO));
  }, [appointments]);

  const confirmedDepositsCollected = useMemo(() => {
    return appointments.filter((a) => a.status === "confirmed" || a.status === "completed").length * REQUIRED_DEPOSIT;
  }, [appointments]);

  const todayRevenue = useMemo(() => {
    return todayAppointments.reduce((sum, a) => sum + (a.totalPrice || 0), 0);
  }, [todayAppointments]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || services[0],
    [services, selectedServiceId]
  );

  const allTimeOptions = useMemo(() => {
    if (hoursForDay.closed) return [];

    const [openH, openM] = hoursForDay.open.split(":").map(Number);
    const [closeH, closeM] = hoursForDay.close.split(":").map(Number);

    const day = parseISODate(selectedDate);
    const open = new Date(day.getFullYear(), day.getMonth(), day.getDate(), openH, openM, 0, 0);
    const close = new Date(day.getFullYear(), day.getMonth(), day.getDate(), closeH, closeM, 0, 0);

    const step = clamp(settings.slotStepMin, 5, 60);
    const buffer = clamp(settings.bufferMin, 0, 60);
    const needed = totalDuration + buffer;

    const dayAppts = appointments
      .filter((a) =>
        a.date === selectedDate &&
        (a.status === "confirmed" || a.status === "completed" || a.status === "zelle_pending_verification")
      )
      .map((a) => ({ start: new Date(a.startISO), end: new Date(a.endISO) }));

    const results = [];
    for (let t = new Date(open); t <= close; t = addMinutes(t, step)) {
      const end = addMinutes(t, needed);
      if (end > close) continue;

      let available = true;

      if (selectedDate === todayISO) {
        const grace = addMinutes(new Date(), 10);
        if (t < grace) available = false;
      }

      const conflict = dayAppts.some((a) => overlaps(t, end, a.start, a.end));
      if (conflict) available = false;

      results.push({
        iso: t.toISOString(),
        label: formatTime(t),
        available,
      });
    }

    return results;
  }, [appointments, hoursForDay, selectedDate, settings.bufferMin, settings.slotStepMin, todayISO, totalDuration]);

  const selectedTimeLabel = useMemo(() => {
    if (!selectedTimeISO) return "";
    const found = allTimeOptions.find((t) => t.iso === selectedTimeISO);
    return found ? found.label : formatTime(new Date(selectedTimeISO));
  }, [selectedTimeISO, allTimeOptions]);

  const appointmentsForDay = useMemo(() => {
    return appointments
      .filter((a) =>
        a.date === selectedDate &&
        (a.status === "confirmed" || a.status === "completed" || a.status === "zelle_pending_verification")
      )
      .sort((a, b) => a.startISO.localeCompare(b.startISO));
  }, [appointments, selectedDate]);

  function validate() {
    if (!selectedServiceId) return "Please select a service.";
    if (!selectedTimeISO) return "Please pick a time.";
    if (!customerName.trim()) return "Please enter your name.";
    if (settings.requirePhone && !customerPhone.trim()) return "Please enter your phone number.";
    return "";
  }

  async function startDepositCheckout() {
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          date: selectedDate,
          time: selectedTimeISO ? formatTime(new Date(selectedTimeISO)) : "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Unable to start deposit checkout.");
        return false;
      }

      if (data.url) {
        window.location.href = data.url;
        return true;
      }

      setErrorMsg("No checkout URL returned.");
      return false;
    } catch (error) {
      setErrorMsg("Checkout error: " + error.message);
      return false;
    }
  }

  async function bookWithStripe() {
    setSuccessMsg("");
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }

    const start = new Date(selectedTimeISO);
    const end = addMinutes(start, totalDuration + clamp(settings.bufferMin, 0, 60));

    const conflict = appointments
      .filter((a) =>
        a.date === selectedDate &&
        (a.status === "confirmed" || a.status === "completed" || a.status === "zelle_pending_verification")
      )
      .some((a) => overlaps(start, end, new Date(a.startISO), new Date(a.endISO)));

    if (conflict) {
      setErrorMsg("That time was just booked. Please choose another slot.");
      return;
    }

    const pendingAppt = {
      id: uid(),
      createdAtISO: new Date().toISOString(),
      date: selectedDate,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      serviceIds: [selectedServiceId],
      totalDurationMin: totalDuration,
      totalPrice,
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        notes: customerNotes.trim(),
      },
      status: "pending_payment",
      paymentMethod: "stripe",
    };

    savePendingBooking(pendingAppt);
    await startDepositCheckout();
  }

  async function bookWithZelle() {
    setSuccessMsg("");
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }

    const start = new Date(selectedTimeISO);
    const end = addMinutes(start, totalDuration + clamp(settings.bufferMin, 0, 60));

    const conflict = appointments
      .filter((a) =>
        a.date === selectedDate &&
        (a.status === "confirmed" || a.status === "completed" || a.status === "zelle_pending_verification")
      )
      .some((a) => overlaps(start, end, new Date(a.startISO), new Date(a.endISO)));

    if (conflict) {
      setErrorMsg("That time was just booked. Please choose another slot.");
      return;
    }

    const zelleBooking = {
      id: uid(),
      createdAtISO: new Date().toISOString(),
      date: selectedDate,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      serviceIds: [selectedServiceId],
      totalDurationMin: totalDuration,
      totalPrice,
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        notes: customerNotes.trim(),
      },
      status: "zelle_pending_verification",
      paymentMethod: "zelle",
    };

    const { error } = await supabase
      .from("appointments")
      .insert([appointmentToDbRow(zelleBooking)]);

    if (error) {
      console.error(error);
      setErrorMsg("Could not save the Zelle reservation.");
      return;
    }

    await refreshAppointments();
    setLastZelleBooking(zelleBooking);
    setLastConfirmedBooking(null);
    setSuccessMsg("Zelle reservation request submitted. Your appointment will be confirmed after payment verification.");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerNotes("");
    setSelectedTimeISO(null);
  }

  function handleReserve() {
    if (paymentMethod === "zelle") {
      bookWithZelle();
      return;
    }
    bookWithStripe();
  }

  async function cancelAppt(id) {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      setErrorMsg("Could not cancel the appointment.");
      return;
    }

    await refreshAppointments();
  }

  async function markCompleted(id) {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", id);

    if (error) {
      console.error(error);
      setErrorMsg("Could not mark the appointment as completed.");
      return;
    }

    await refreshAppointments();
  }

  async function markZelleConfirmed(id) {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;

    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", id);

    if (error) {
      console.error(error);
      setErrorMsg("Could not confirm the Zelle payment.");
      return;
    }

    const start = new Date(appt.startISO);
    const serviceNames = appt.serviceIds
      .map((serviceId) => services.find((s) => s.id === serviceId)?.name)
      .filter(Boolean)
      .join(", ");

    sendBookingSMS(
      appt.customer?.phone || "",
      serviceNames,
      appt.date,
      formatTime(start),
      settings.locationLine
    );

    await refreshAppointments();
  }

  function exportCSV() {
    const header = [
      "id",
      "createdAtISO",
      "date",
      "start",
      "end",
      "customerName",
      "customerPhone",
      "services",
      "totalDurationMin",
      "totalPrice",
      "notes",
      "status",
      "paymentMethod",
    ];

    const rows = appointments
      .slice()
      .sort((a, b) => a.startISO.localeCompare(b.startISO))
      .map((a) => {
        const svcs = a.serviceIds
          .map((id) => services.find((s) => s.id === id)?.name)
          .filter(Boolean)
          .join(" | ");

        return [
          a.id,
          a.createdAtISO,
          a.date,
          new Date(a.startISO).toLocaleString(),
          new Date(a.endISO).toLocaleString(),
          a.customer?.name ?? "",
          a.customer?.phone ?? "",
          svcs,
          a.totalDurationMin,
          a.totalPrice,
          String(a.customer?.notes ?? "").split("\n").join(" "),
          a.status,
          a.paymentMethod ?? "",
        ];
      });

    const csv = [header, ...rows]
      .map((r) => r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    downloadText("mzparas_appointments.csv", csv);
  }

  const headerNote = useMemo(() => {
    if (hoursForDay.closed) return "Closed today.";
    return `Hours: ${hoursForDay.open} – ${hoursForDay.close}`;
  }, [hoursForDay]);

  const lastConfirmedServiceNames = useMemo(() => {
    if (!lastConfirmedBooking) return "";
    return lastConfirmedBooking.serviceIds
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }, [lastConfirmedBooking, services]);

  const lastZelleServiceNames = useMemo(() => {
    if (!lastZelleBooking) return "";
    return lastZelleBooking.serviceIds
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }, [lastZelleBooking, services]);

  return (
    <div className="min-h-screen bg-[#F5F0E9] text-neutral-900">
      <header className="sticky top-0 z-20 border-b border-[#E7DFD6] bg-[#F5F0E9]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#E7DFD6] bg-white shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">{settings.salonName}</div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {settings.locationLine}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-4 w-4" /> {settings.phone}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Instagram className="h-4 w-4" /> {settings.instagram}
                </span>
              </div>
              <div className="mt-1 text-xs text-neutral-500">{headerNote}</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Badge className="rounded-xl bg-[#EDE4DA] text-neutral-900 hover:bg-[#EDE4DA]">
              Clean White Luxury
            </Badge>
            <Badge className="rounded-xl bg-black text-white hover:bg-black">
              Database Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="book" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-[#E7DFD6] sm:w-[420px]">
            <TabsTrigger value="book">Book</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="mt-6">
            {lastConfirmedBooking ? (
              <Card className="mb-6 rounded-2xl bg-white border border-[#E7DFD6] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#F8F3ED] px-3 py-1 text-sm text-neutral-800">
                        <CheckCircle2 className="h-4 w-4" />
                        Deposit received
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                          Your appointment is confirmed
                        </h2>
                        <p className="mt-1 text-sm text-neutral-600">
                          Thank you for reserving with {settings.salonName}.
                        </p>
                      </div>
                      <div className="grid gap-2 text-sm text-neutral-700">
                        <div><span className="font-medium">Service:</span> {lastConfirmedServiceNames}</div>
                        <div><span className="font-medium">Date:</span> {lastConfirmedBooking.date}</div>
                        <div><span className="font-medium">Time:</span> {formatTime(new Date(lastConfirmedBooking.startISO))}</div>
                        <div><span className="font-medium">Deposit paid:</span> ${REQUIRED_DEPOSIT}</div>
                        <div><span className="font-medium">Remaining balance at appointment:</span> ${Math.max(0, lastConfirmedBooking.totalPrice - REQUIRED_DEPOSIT)}</div>
                        <div><span className="font-medium">Location:</span> {settings.locationLine}</div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 md:w-[250px]">
                      <Button
                        className="h-11 rounded-2xl bg-black text-white hover:bg-neutral-900"
                        onClick={() =>
                          downloadAppointmentICS(
                            lastConfirmedBooking,
                            settings.salonName,
                            settings.locationLine,
                            lastConfirmedServiceNames
                          )
                        }
                      >
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Add to calendar
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl border-[#E7DFD6] bg-white text-neutral-900 hover:bg-[#EFE7DD]"
                        onClick={() => setLastConfirmedBooking(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {lastZelleBooking ? (
              <Card className="mb-6 rounded-2xl bg-white border border-[#E7DFD6] shadow-sm">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F8F3ED] px-3 py-1 text-sm text-neutral-800">
                      <Landmark className="h-4 w-4" />
                      Zelle payment selected
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight">
                        Send your $50 deposit with Zelle
                      </h2>
                      <p className="mt-1 text-sm text-neutral-600">
                        Your appointment is pending verification until the Zelle deposit is received.
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-neutral-700">
                      <div><span className="font-medium">Send to:</span> {ZELLE_RECIPIENT}</div>
                      <div><span className="font-medium">Amount:</span> ${REQUIRED_DEPOSIT}</div>
                      <div><span className="font-medium">Client name:</span> {lastZelleBooking.customer?.name}</div>
                      <div><span className="font-medium">Service:</span> {lastZelleServiceNames}</div>
                      <div><span className="font-medium">Date:</span> {lastZelleBooking.date}</div>
                      <div><span className="font-medium">Time:</span> {formatTime(new Date(lastZelleBooking.startISO))}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              {FEATURED_GALLERY.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-3xl border border-[#E7DFD6] bg-gradient-to-br ${item.tone} p-6 shadow-sm`}
                >
                  <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="text-lg font-semibold tracking-tight">{item.title}</div>
                  <div className="mt-2 text-sm text-neutral-700">{item.subtitle}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card className="rounded-2xl bg-white border border-[#E7DFD6] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Select your service</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <Label>Service menu</Label>
                      <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                        <SelectTrigger className="border-[#E7DFD6] bg-white">
                          <SelectValue placeholder="Choose a service" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} — {service.durationMin} min — ${service.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4">
                      <div className="font-medium">{selectedService.name}</div>
                      <div className="mt-1 text-sm text-neutral-600">{selectedService.durationMin} minutes</div>
                      <div className="mt-2 text-lg font-semibold">${selectedService.price}</div>
                    </div>

                    <Separator className="bg-[#E7DFD6]" />

                    <div className="grid gap-2">
                      <Label htmlFor="date">Select date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border-[#E7DFD6] bg-white"
                      />
                      <div className="text-sm text-neutral-600">{friendlyDate}</div>
                    </div>

                    <div className="rounded-2xl border border-[#E7DFD6] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-neutral-600">Estimated service total</div>
                        <div className="text-lg font-semibold">${totalPrice}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm text-neutral-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" /> {totalDuration} min
                        </span>
                        <span>+ {settings.bufferMin} min buffer</span>
                      </div>
                    </div>

                    {errorMsg ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-3 text-sm text-neutral-800">
                        {errorMsg}
                      </div>
                    ) : null}

                    {successMsg ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-3 text-sm text-neutral-800">
                        {successMsg}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="rounded-2xl bg-white border border-[#E7DFD6] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Reserve your time</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {allTimeOptions.length === 0 ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-6 text-center text-sm text-neutral-700">
                        No time slots available for this day. Try another date.
                      </div>
                    ) : (
                      <div className="relative">
                        <Label className="mb-2 block">Available time menu</Label>
                        <button
                          type="button"
                          onClick={() => setTimeMenuOpen((prev) => !prev)}
                          className="flex h-11 w-full items-center justify-between rounded-2xl border border-[#E7DFD6] bg-white px-4 text-left text-sm shadow-sm transition hover:bg-[#F8F3ED]"
                        >
                          <span className={selectedTimeLabel ? "text-neutral-900" : "text-neutral-500"}>
                            {selectedTimeLabel || "Choose a time slot"}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition ${timeMenuOpen ? "rotate-180" : ""}`} />
                        </button>

                        {timeMenuOpen ? (
                          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#E7DFD6] bg-white p-2 shadow-lg">
                            {allTimeOptions.map((slot) => (
                              <button
                                key={slot.iso}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => {
                                  if (!slot.available) return;
                                  setSelectedTimeISO(slot.iso);
                                  setTimeMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                  slot.available
                                    ? "bg-white text-neutral-900 hover:bg-[#EFE7DD]"
                                    : "bg-white cursor-not-allowed text-neutral-400 line-through decoration-neutral-300 decoration-1"
                                }`}
                              >
                                <span>{slot.label}</span>
                                <span className="text-xs">{slot.available ? "Open" : "Unavailable"}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <Separator className="bg-[#E7DFD6]" />

                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Client name</Label>
                        <Input
                          id="name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g., Jasmine"
                          className="border-[#E7DFD6] bg-white"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone number {settings.requirePhone ? "(required)" : "(optional)"}</Label>
                        <Input
                          id="phone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g., 404-642-9408"
                          className="border-[#E7DFD6] bg-white"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="notes">Booking notes (optional)</Label>
                        <Textarea
                          id="notes"
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="Design idea, preferred shape, length, etc."
                          className="border-[#E7DFD6] bg-white"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Payment method</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("stripe")}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              paymentMethod === "stripe"
                                ? "border-black bg-white ring-1 ring-[#D8CDBF]"
                                : "border-[#E7DFD6] bg-white hover:bg-[#EFE7DD]"
                            }`}
                          >
                            <div className="font-medium">Card deposit</div>
                            <div className="mt-1 text-xs text-neutral-600">Pay online now</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod("zelle")}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              paymentMethod === "zelle"
                                ? "border-black bg-white ring-1 ring-[#D8CDBF]"
                                : "border-[#E7DFD6] bg-white hover:bg-[#EFE7DD]"
                            }`}
                          >
                            <div className="font-medium">Zelle</div>
                            <div className="mt-1 text-xs text-neutral-600">Manual verification</div>
                          </button>
                        </div>
                      </div>

                      <Button
                        className="h-12 w-full rounded-2xl bg-black text-white hover:bg-neutral-900"
                        onClick={handleReserve}
                      >
                        {paymentMethod === "zelle"
                          ? "Submit Zelle reservation request"
                          : "Secure appointment with $50 deposit"}
                      </Button>

                      <div className="text-xs text-neutral-500">
                        {paymentMethod === "zelle"
                          ? "Zelle reservations are confirmed after payment verification."
                          : "Appointment is confirmed only after successful deposit payment."}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="rounded-2xl bg-white border border-[#E7DFD6] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Payment & policy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-[#E7DFD6] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600">Service total</span>
                        <span className="font-semibold">${totalPrice}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
                          <CreditCard className="h-4 w-4" /> Deposit due now
                        </span>
                        <span className="text-lg font-semibold">${REQUIRED_DEPOSIT}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#E7DFD6] pt-3">
                        <span className="text-sm text-neutral-600">Remaining at appointment</span>
                        <span className="font-semibold">${remainingBalance}</span>
                      </div>
                    </div>

                    {paymentMethod === "zelle" ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4 text-sm text-neutral-700">
                        Send your Zelle deposit to <span className="font-medium">{ZELLE_RECIPIENT}</span>. Your appointment will be confirmed after payment verification.
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4 text-sm text-neutral-700">
                        Your time slot is only held after deposit payment succeeds.
                      </div>
                    )}

                    <div className="rounded-2xl border border-[#E7DFD6] bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 font-medium">
                        <BadgeDollarSign className="h-4 w-4" />
                        Cancellation & deposit policy
                      </div>
                      <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-700">
                        <li>$50 deposit is required to reserve your appointment.</li>
                        <li>Deposits are non-refundable.</li>
                        <li>Rescheduling requests should be made at least 24 hours in advance.</li>
                        <li>Late arrivals may require shortened service time.</li>
                        <li>No-shows forfeit the deposit.</li>
                      </ul>
                    </div>

                    {loadingBookings ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-6 text-center text-sm text-neutral-700">
                        Loading appointments...
                      </div>
                    ) : appointmentsForDay.length === 0 ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-6 text-center text-sm text-neutral-700">
                        No appointments yet for {friendlyDate}.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appointmentsForDay.map((a) => {
                          const start = new Date(a.startISO);
                          const end = new Date(a.endISO);
                          const svcs = a.serviceIds
                            .map((id) => services.find((s) => s.id === id)?.name)
                            .filter(Boolean)
                            .join(", ");

                          return (
                            <motion.div
                              key={a.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-2xl border border-[#E7DFD6] bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">{a.customer?.name}</div>
                                  <div className="mt-1 text-sm text-neutral-700">
                                    {formatTime(start)} – {formatTime(end)}
                                  </div>
                                  <div className="mt-1 text-sm text-neutral-600">{svcs}</div>
                                  <div className="mt-1 text-xs text-neutral-500">
                                    {a.status} {a.paymentMethod ? `• ${a.paymentMethod}` : ""}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">${a.totalPrice}</div>
                                  <div className="text-xs text-neutral-500">{a.totalDurationMin} min</div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="admin" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card className="rounded-2xl bg-white border border-[#E7DFD6] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Admin access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!adminAuthed ? (
                      <>
                        <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4 text-sm text-neutral-700">
                          <div className="flex items-center gap-2 font-medium">
                            <Lock className="h-4 w-4" /> Enter PIN to manage appointments
                          </div>
                          <div className="mt-1 text-xs text-neutral-600">Default is 1234.</div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="pin">PIN</Label>
                          <Input
                            id="pin"
                            type="password"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder="••••"
                            className="border-[#E7DFD6] bg-white"
                          />
                        </div>

                        <Button
                          className="h-11 rounded-2xl bg-black text-white hover:bg-neutral-900"
                          onClick={() => {
                            if (pinInput === settings.adminPin) {
                              setAdminAuthed(true);
                              setPinInput("");
                            } else {
                              alert("Incorrect PIN");
                            }
                          }}
                        >
                          Unlock
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4">
                              <div className="text-xs uppercase tracking-wide text-neutral-500">Today’s bookings</div>
                              <div className="mt-1 text-2xl font-semibold">{todayAppointments.length}</div>
                            </div>
                            <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4">
                              <div className="text-xs uppercase tracking-wide text-neutral-500">Upcoming</div>
                              <div className="mt-1 text-2xl font-semibold">{upcomingAppointments.length}</div>
                            </div>
                            <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4">
                              <div className="text-xs uppercase tracking-wide text-neutral-500">Deposits collected</div>
                              <div className="mt-1 text-2xl font-semibold">${confirmedDepositsCollected}</div>
                            </div>
                            <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4">
                              <div className="text-xs uppercase tracking-wide text-neutral-500">Today’s revenue</div>
                              <div className="mt-1 text-2xl font-semibold">${todayRevenue}</div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-4 text-sm text-neutral-700">
                            <div className="flex items-center gap-2 font-medium">
                              <Shield className="h-4 w-4" /> Admin unlocked
                            </div>
                            <div className="mt-1 text-xs text-neutral-600">Bookings now live in Supabase and visible across devices.</div>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Button
                            variant="outline"
                            className="h-11 rounded-2xl border-[#E7DFD6] bg-white text-neutral-900 hover:bg-[#EFE7DD]"
                            onClick={() => setAdminAuthed(false)}
                          >
                            Lock Admin
                          </Button>

                          <Button
                            variant="outline"
                            className="h-11 rounded-2xl border-[#E7DFD6] bg-white text-neutral-900 hover:bg-[#EFE7DD]"
                            onClick={refreshAppointments}
                          >
                            Refresh bookings
                          </Button>

                          <Button
                            variant="outline"
                            className="h-11 rounded-2xl border-[#E7DFD6] bg-white text-neutral-900 hover:bg-[#EFE7DD]"
                            onClick={exportCSV}
                          >
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                          </Button>

                          <Button
                            variant="destructive"
                            className="h-11 rounded-2xl"
                            onClick={async () => {
                              if (!confirm("Delete ALL appointments?")) return;
                              const { error } = await supabase.from("appointments").delete().neq("id", "");
                              if (error) {
                                console.error(error);
                                setErrorMsg("Could not clear appointments.");
                                return;
                              }
                              clearPendingBooking();
                              await refreshAppointments();
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Clear All
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="mt-6 rounded-2xl bg-white border border-[#E7DFD6] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Salon name</Label>
                      <Input
                        value={settings.salonName}
                        onChange={(e) => setSettings((p) => ({ ...p, salonName: e.target.value }))}
                        className="border-[#E7DFD6] bg-white"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Location line</Label>
                      <Input
                        value={settings.locationLine}
                        onChange={(e) => setSettings((p) => ({ ...p, locationLine: e.target.value }))}
                        className="border-[#E7DFD6] bg-white"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Phone</Label>
                      <Input
                        value={settings.phone}
                        onChange={(e) => setSettings((p) => ({ ...p, phone: e.target.value }))}
                        className="border-[#E7DFD6] bg-white"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Instagram</Label>
                      <Input
                        value={settings.instagram}
                        onChange={(e) => setSettings((p) => ({ ...p, instagram: e.target.value }))}
                        className="border-[#E7DFD6] bg-white"
                      />
                    </div>

                    <Separator className="bg-[#E7DFD6]" />

                    <div className="grid gap-2">
                      <Label>Admin PIN</Label>
                      <Input
                        type="password"
                        value={settings.adminPin}
                        onChange={(e) => setSettings((p) => ({ ...p, adminPin: e.target.value }))}
                        className="border-[#E7DFD6] bg-white"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="rounded-2xl bg-white border border-[#E7DFD6] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!adminAuthed ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-6 text-center text-sm text-neutral-700">
                        Unlock Admin to view and manage appointments.
                      </div>
                    ) : loadingBookings ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-6 text-center text-sm text-neutral-700">
                        Loading appointments...
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="rounded-2xl border border-[#E7DFD6] bg-[#F8F3ED] p-6 text-center text-sm text-neutral-700">
                        No appointments yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appointments.map((a) => {
                          const start = new Date(a.startISO);
                          const svcs = a.serviceIds
                            .map((id) => services.find((s) => s.id === id)?.name)
                            .filter(Boolean)
                            .join(", ");

                          return (
                            <div key={a.id} className="rounded-2xl border border-[#E7DFD6] bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">{a.customer?.name}</div>
                                  <div className="text-sm text-neutral-600">
                                    {a.date} • {formatTime(start)}
                                  </div>
                                  <div className="text-sm text-neutral-600">{svcs}</div>
                                  {a.customer?.phone ? (
                                    <div className="text-sm text-neutral-600">Phone: {a.customer.phone}</div>
                                  ) : null}
                                  <div className="text-xs text-neutral-500 mt-1">
                                    {a.status} {a.paymentMethod ? `• ${a.paymentMethod}` : ""}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  <div className="font-semibold">${a.totalPrice}</div>
                                  <div className="flex flex-wrap gap-2 justify-end">
                                    {a.status === "zelle_pending_verification" ? (
                                      <Button
                                        variant="outline"
                                        className="rounded-2xl border-[#E7DFD6] bg-white text-neutral-900 hover:bg-[#EFE7DD]"
                                        onClick={() => markZelleConfirmed(a.id)}
                                      >
                                        Mark Zelle Confirmed
                                      </Button>
                                    ) : null}

                                    {a.status !== "completed" && a.status !== "zelle_pending_verification" ? (
                                      <Button
                                        variant="outline"
                                        className="rounded-2xl border-[#E7DFD6] bg-white text-neutral-900 hover:bg-[#EFE7DD]"
                                        onClick={() => markCompleted(a.id)}
                                      >
                                        Mark completed
                                      </Button>
                                    ) : null}

                                    <Button
                                      variant="outline"
                                      className="rounded-2xl border-[#E7DFD6] bg-white text-neutral-900 hover:bg-[#EFE7DD]"
                                      onClick={() => cancelAppt(a.id)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mt-6 rounded-2xl border border-[#E7DFD6] bg-white p-5 text-sm text-neutral-700">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium">Database-backed booking system</div>
            <Badge className="rounded-xl bg-[#EDE4DA] text-neutral-900 hover:bg-[#EDE4DA]">
              Supabase Live
            </Badge>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>Bookings are now shared across devices</li>
            <li>Zelle and card deposits both save to the same database</li>
            <li>Admin actions update live records instead of browser-only storage</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}