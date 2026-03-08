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
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const LS_KEY = "mzparas_lux_booking_v4";
const REQUIRED_DEPOSIT = 50;

const DEFAULT_SERVICES = [
  { id: "svc-acrylic-full", name: "Full Set Acrylic", durationMin: 90, price: 65 },
  { id: "svc-acrylic-fill", name: "Acrylic Fill", durationMin: 60, price: 45 },
  { id: "svc-natural-mani", name: "Natural Manicure", durationMin: 45, price: 30 },
  { id: "svc-natural-pedi", name: "Natural Pedicure", durationMin: 60, price: 45 },
  { id: "svc-gel-add", name: "Gel Polish Add-On", durationMin: 15, price: 10 },
  { id: "svc-design", name: "Design Add-On", durationMin: 15, price: 10 },
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

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocal(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export default function App() {
  const localLoaded = useMemo(() => loadLocal(), []);

  const [services] = useState(localLoaded?.services ?? DEFAULT_SERVICES);
  const [hours] = useState(localLoaded?.hours ?? DEFAULT_HOURS);
  const [settings, setSettings] = useState(localLoaded?.settings ?? DEFAULT_SETTINGS);
  const [appointments, setAppointments] = useState(localLoaded?.appointments ?? []);

  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [selectedServiceIds, setSelectedServiceIds] = useState(() => [DEFAULT_SERVICES[0].id]);
  const [selectedTimeISO, setSelectedTimeISO] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [adminAuthed, setAdminAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const todayISO = useMemo(() => toISODate(new Date()), []);

  useEffect(() => {
    saveLocal({ services, hours, settings, appointments });
  }, [services, hours, settings, appointments]);

  useEffect(() => {
    setSelectedTimeISO(null);
    setErrorMsg("");
    setSuccessMsg("");
  }, [selectedDate, selectedServiceIds.join("|")]);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
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

  function toggleService(id) {
    setSelectedServiceIds((prev) => {
      const has = prev.includes(id);
      if (has) {
        const next = prev.filter((x) => x !== id);
        return next.length ? next : prev;
      }
      return [...prev, id];
    });
  }

  const slots = useMemo(() => {
    if (hoursForDay.closed) return [];

    const [openH, openM] = hoursForDay.open.split(":").map(Number);
    const [closeH, closeM] = hoursForDay.close.split(":").map(Number);

    const day = parseISODate(selectedDate);
    const open = new Date(day.getFullYear(), day.getMonth(), day.getDate(), openH, openM, 0, 0);
    const close = new Date(day.getFullYear(), day.getMonth(), day.getDate(), closeH, closeM, 0, 0);

    const step = clamp(settings.slotStepMin, 5, 60);
    const buffer = clamp(settings.bufferMin, 0, 60);
    const needed = totalDuration + buffer;
    if (!needed || needed <= 0) return [];

    const dayAppts = appointments
      .filter((a) => a.date === selectedDate)
      .map((a) => ({ start: new Date(a.startISO), end: new Date(a.endISO) }));

    const results = [];
    for (let t = new Date(open); t <= close; t = addMinutes(t, step)) {
      const end = addMinutes(t, needed);
      if (end > close) continue;

      if (selectedDate === todayISO) {
        const grace = addMinutes(new Date(), 10);
        if (t < grace) continue;
      }

      const conflict = dayAppts.some((a) => overlaps(t, end, a.start, a.end));
      if (conflict) continue;

      results.push({ start: t, end });
    }

    return results;
  }, [appointments, hoursForDay, selectedDate, settings.bufferMin, settings.slotStepMin, todayISO, totalDuration]);

  const appointmentsForDay = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDate)
      .sort((a, b) => a.startISO.localeCompare(b.startISO));
  }, [appointments, selectedDate]);

  function validate() {
    if (!selectedServices.length) return "Please select at least one service.";
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
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg("No checkout URL returned.");
      }
    } catch (error) {
      setErrorMsg("Checkout error: " + error.message);
    }
  }

  async function bookWithDeposit() {
    setSuccessMsg("");
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }

    const start = new Date(selectedTimeISO);
    const end = addMinutes(start, totalDuration + clamp(settings.bufferMin, 0, 60));

    const conflict = appointments
      .filter((a) => a.date === selectedDate)
      .some((a) => overlaps(start, end, new Date(a.startISO), new Date(a.endISO)));

    if (conflict) {
      setErrorMsg("That time was just booked. Please choose another slot.");
      return;
    }

    const draftAppt = {
      id: uid(),
      createdAtISO: new Date().toISOString(),
      date: selectedDate,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      serviceIds: selectedServiceIds,
      totalDurationMin: totalDuration,
      totalPrice,
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        notes: customerNotes.trim(),
      },
      status: "deposit_pending",
    };

    setAppointments((prev) =>
      [...prev, draftAppt].sort((a, b) => a.startISO.localeCompare(b.startISO))
    );

    await startDepositCheckout();
  }

  function cancelAppt(id) {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-20 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border bg-white shadow-sm">
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
            <Badge variant="secondary" className="rounded-xl">
              Clean White Luxury
            </Badge>
            <Badge className="rounded-xl">Deposit Required</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="book" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-[420px]">
            <TabsTrigger value="book">Book</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Choose services</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      {services.map((s) => {
                        const checked = selectedServiceIds.includes(s.id);
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => toggleService(s.id)}
                            className={`flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left transition focus:outline-none ${
                              checked
                                ? "border-neutral-900 ring-1 ring-neutral-300"
                                : "border-neutral-200 hover:bg-neutral-50"
                            }`}
                          >
                            <div>
                              <div className="font-medium">{s.name}</div>
                              <div className="text-sm text-neutral-600">{s.durationMin} min</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${s.price}</div>
                              <div className={`text-xs ${checked ? "text-neutral-900" : "text-neutral-500"}`}>
                                {checked ? "Selected" : "Tap to add"}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                      <Label htmlFor="date">Select date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                      <div className="text-sm text-neutral-600">{friendlyDate}</div>
                    </div>

                    <div className="rounded-2xl border bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-neutral-600">Estimated total</div>
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
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
                        {errorMsg}
                      </div>
                    ) : null}

                    {successMsg ? (
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
                        {successMsg}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Pick a time</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {slots.length === 0 ? (
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-700">
                        No available slots for this day. Try another date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {slots.map((s) => {
                          const iso = s.start.toISOString();
                          const active = selectedTimeISO === iso;
                          return (
                            <Button
                              key={iso}
                              variant={active ? "default" : "outline"}
                              className={`h-11 rounded-2xl ${active ? "" : "border-neutral-200"}`}
                              onClick={() => setSelectedTimeISO(iso)}
                            >
                              {formatTime(s.start)}
                            </Button>
                          );
                        })}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Your name</Label>
                        <Input
                          id="name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g., Jasmine"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone">
                          Phone number {settings.requirePhone ? "(required)" : "(optional)"}
                        </Label>
                        <Input
                          id="phone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g., 404-642-9408"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                          id="notes"
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="Design idea, preferred shape/length, etc."
                        />
                      </div>

                      <Button className="h-12 w-full rounded-2xl" onClick={bookWithDeposit}>
                        Pay $50 Deposit
                      </Button>

                      <div className="text-xs text-neutral-500">
                        Your appointment is reserved after deposit payment.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Deposit summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border bg-white p-4">
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
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <span className="text-sm text-neutral-600">Remaining at appointment</span>
                        <span className="font-semibold">${remainingBalance}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                      Deposits help secure your time slot and reduce no-shows.
                    </div>

                    {appointmentsForDay.length === 0 ? (
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-700">
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
                              className="rounded-2xl border border-neutral-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">{a.customer?.name}</div>
                                  <div className="mt-1 text-sm text-neutral-700">
                                    {formatTime(start)} – {formatTime(end)}
                                  </div>
                                  <div className="mt-1 text-sm text-neutral-600">{svcs}</div>
                                  <div className="mt-1 text-xs text-neutral-500">{a.status}</div>
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
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Admin access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!adminAuthed ? (
                      <>
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
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
                          />
                        </div>

                        <Button
                          className="h-11 rounded-2xl"
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
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                          <div className="flex items-center gap-2 font-medium">
                            <Shield className="h-4 w-4" /> Admin unlocked
                          </div>
                          <div className="mt-1 text-xs text-neutral-600">CSV export ready</div>
                        </div>

                        <div className="grid gap-2">
                          <Button
                            variant="outline"
                            className="h-11 rounded-2xl border-neutral-200"
                            onClick={() => setAdminAuthed(false)}
                          >
                            Lock Admin
                          </Button>

                          <Button
                            variant="outline"
                            className="h-11 rounded-2xl border-neutral-200"
                            onClick={exportCSV}
                          >
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                          </Button>

                          <Button
                            variant="destructive"
                            className="h-11 rounded-2xl"
                            onClick={() => {
                              if (confirm("Delete ALL appointments?")) {
                                setAppointments([]);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Clear All
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="mt-6 rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Salon name</Label>
                      <Input
                        value={settings.salonName}
                        onChange={(e) => setSettings((p) => ({ ...p, salonName: e.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Location line</Label>
                      <Input
                        value={settings.locationLine}
                        onChange={(e) => setSettings((p) => ({ ...p, locationLine: e.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Phone</Label>
                      <Input
                        value={settings.phone}
                        onChange={(e) => setSettings((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Instagram</Label>
                      <Input
                        value={settings.instagram}
                        onChange={(e) => setSettings((p) => ({ ...p, instagram: e.target.value }))}
                      />
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                      <Label>Admin PIN</Label>
                      <Input
                        type="password"
                        value={settings.adminPin}
                        onChange={(e) => setSettings((p) => ({ ...p, adminPin: e.target.value }))}
                      />
                      <div className="text-xs text-neutral-600">Change this from the default.</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">All appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!adminAuthed ? (
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-700">
                        Unlock Admin to view and manage appointments.
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-700">
                        No appointments yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appointments
                          .slice()
                          .sort((a, b) => a.startISO.localeCompare(b.startISO))
                          .map((a) => {
                            const start = new Date(a.startISO);
                            const svcs = a.serviceIds
                              .map((id) => services.find((s) => s.id === id)?.name)
                              .filter(Boolean)
                              .join(", ");

                            return (
                              <div key={a.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
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
                                    <div className="text-xs text-neutral-500 mt-1">{a.status}</div>
                                  </div>

                                  <div className="flex flex-col items-end gap-2">
                                    <div className="font-semibold">${a.totalPrice}</div>
                                    <Button
                                      variant="outline"
                                      className="rounded-2xl border-neutral-200"
                                      onClick={() => {
                                        if (confirm("Cancel this appointment?")) cancelAppt(a.id);
                                      }}
                                    >
                                      Cancel
                                    </Button>
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
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium">Luxury booking with deposit protection</div>
            <Badge variant="secondary" className="rounded-xl">
              $50 Deposit Required
            </Badge>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>Clients choose services and time</li>
            <li>$50 deposit required to reserve the appointment</li>
            <li>Remaining balance is due at the appointment</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}