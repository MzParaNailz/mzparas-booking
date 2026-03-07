import React, { useState } from "react";

export default function App() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  async function startDepositCheckout() {
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          date,
          time,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to start deposit checkout.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("No checkout URL returned.");
      }
    } catch (error) {
      alert("Checkout error: " + error.message);
    }
  }

  async function book() {
    if (!name || !phone || !date || !time) {
      alert("Please complete all fields");
      return;
    }

    await startDepositCheckout();
  }

  return (
    <div style={{ fontFamily: "Arial", padding: "40px", maxWidth: "520px", margin: "auto" }}>
      <h1>Mz Para's Nailz</h1>
      <p>Book your appointment and pay a required $50 deposit.</p>

      <label>Name</label>
      <input
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label>Phone</label>
      <input
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="4046429408"
      />

      <label>Date</label>
      <input
        type="date"
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <label>Time</label>
      <input
        type="time"
        style={{ width: "100%", padding: "10px", marginBottom: "20px" }}
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />

      <div style={{ marginBottom: "20px", padding: "12px", background: "#f6f6f6", borderRadius: "10px" }}>
        <strong>$50 deposit due now</strong>
        <div style={{ fontSize: "14px", marginTop: "6px" }}>
          Your appointment is reserved after deposit payment.
        </div>
      </div>

      <button
        style={{
          width: "100%",
          padding: "15px",
          background: "black",
          color: "white",
          fontSize: "16px",
          border: "none",
          borderRadius: "10px",
        }}
        onClick={book}
      >
        Pay $50 Deposit
      </button>
    </div>
  );
}