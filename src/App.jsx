import React, { useState } from "react";

export default function App() {

const [name,setName] = useState("")
const [phone,setPhone] = useState("")
const [date,setDate] = useState("")
const [time,setTime] = useState("")

function normalizePhone(phone){

const digits = String(phone || "").replace(/\D/g,'')

if(digits.length === 10){
return "+1"+digits
}

if(digits.length === 11 && digits.startsWith("1")){
return "+"+digits
}

if(String(phone).trim().startsWith("+")){
return String(phone).trim()
}

return String(phone).trim()

}

async function sendBookingSMS(phone,date,time){

const normalized = normalizePhone(phone)

alert("Trying to send SMS to: "+normalized)

try{

const response = await fetch("/api/send-sms",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
to:normalized,
message:`Thanks for booking with Mz Para's Nailz 💅

Appointment Date: ${date}
Appointment Time: ${time}

We look forward to seeing you!`
})
})

const data = await response.json()

alert("SMS API response: "+JSON.stringify(data))

}catch(error){

alert("SMS failed: "+error.message)

}

}

async function book(){

if(!name || !phone || !date || !time){
alert("Please complete all fields")
return
}

await sendBookingSMS(phone,date,time)

setTimeout(()=>{
alert("Appointment booked! Confirmation text sent.")
},800)

}

return (

<div style={{fontFamily:"Arial",padding:"40px",maxWidth:"500px",margin:"auto"}}>

<h1>Mz Para's Nailz Booking</h1>

<p>Book your appointment below</p>

<label>Name</label>
<input
style={{width:"100%",padding:"10px",marginBottom:"10px"}}
value={name}
onChange={(e)=>setName(e.target.value)}
/>

<label>Phone</label>
<input
style={{width:"100%",padding:"10px",marginBottom:"10px"}}
value={phone}
onChange={(e)=>setPhone(e.target.value)}
placeholder="4046429408"
/>

<label>Date</label>
<input
type="date"
style={{width:"100%",padding:"10px",marginBottom:"10px"}}
value={date}
onChange={(e)=>setDate(e.target.value)}
/>

<label>Time</label>
<input
type="time"
style={{width:"100%",padding:"10px",marginBottom:"20px"}}
value={time}
onChange={(e)=>setTime(e.target.value)}
/>

<button
style={{
width:"100%",
padding:"15px",
background:"black",
color:"white",
fontSize:"16px",
border:"none"
}}
onClick={book}
>

Request Appointment

</button>

</div>

)

}