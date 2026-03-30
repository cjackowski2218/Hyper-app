import { useState, useRef, useEffect, useMemo, createContext, useContext } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ── Google Drive Sync ─────────────────────────────────────────────────────────
// Replace GOOGLE_CLIENT_ID after setting up a project at console.cloud.google.com
const GDRIVE_CLIENT_ID="385473971299-01ottoohahiub46hqfp11rg7tl7o0s6q.apps.googleusercontent.com";
const GDRIVE_BACKUP_FILE="hyper-backup.json";
const GDRIVE_API="https://www.googleapis.com/drive/v3";
const GDRIVE_UPLOAD="https://www.googleapis.com/upload/drive/v3";
const GDRIVE_SCOPE="https://www.googleapis.com/auth/drive.appdata";
const GDRIVE_TOKEN_KEY="hyper_drive_token";
const GDRIVE_EXP_KEY="hyper_drive_exp";
const gdriveGetToken=()=>{try{const t=localStorage.getItem(GDRIVE_TOKEN_KEY),e=parseInt(localStorage.getItem(GDRIVE_EXP_KEY)||"0");return t&&Date.now()<e?t:null;}catch(_){return null;}};
const gdriveSaveToken=(t,s)=>{try{localStorage.setItem(GDRIVE_TOKEN_KEY,t);localStorage.setItem(GDRIVE_EXP_KEY,String(Date.now()+(s-60)*1000));}catch(_){}};
const gdriveClearToken=()=>{try{localStorage.removeItem(GDRIVE_TOKEN_KEY);localStorage.removeItem(GDRIVE_EXP_KEY);}catch(_){}};
const gdriveIsConnected=()=>!!gdriveGetToken();
const gdriveSignIn=()=>new Promise((res,rej)=>{
  const redirect=window.location.origin+"/oauth-callback.html";
  const state=Math.random().toString(36).slice(2);
  const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",GDRIVE_CLIENT_ID);
  url.searchParams.set("redirect_uri",redirect);
  url.searchParams.set("response_type","token");
  url.searchParams.set("scope",GDRIVE_SCOPE);
  url.searchParams.set("state",state);
  const popup=window.open(url.toString(),"google-auth","width=500,height=600,scrollbars=yes");
  if(!popup){rej(new Error("Popup blocked"));return;}
  const handler=e=>{
    if(e.origin!==window.location.origin||!e.data||e.data.type!=="HYPER_OAUTH") return;
    window.removeEventListener("message",handler);clearInterval(poll);
    if(e.data.error){rej(new Error(e.data.error));return;}
    if(e.data.state!==state){rej(new Error("State mismatch"));return;}
    gdriveSaveToken(e.data.access_token,parseInt(e.data.expires_in||"3600"));
    res(e.data.access_token);
  };
  window.addEventListener("message",handler);
  const poll=setInterval(()=>{if(popup.closed){clearInterval(poll);window.removeEventListener("message",handler);rej(new Error("Popup closed"));}},500);
});
const gdriveFindFile=async(token)=>{
  const r=await fetch(`${GDRIVE_API}/files?spaces=appDataFolder&q=name='${GDRIVE_BACKUP_FILE}'&fields=files(id,modifiedTime)`,{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok) throw new Error("list:"+r.status);
  const d=await r.json();return d.files?.[0]||null;
};
const gdriveReadFile=async(token,id)=>{
  const r=await fetch(`${GDRIVE_API}/files/${id}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok) throw new Error("read:"+r.status);return r.json();
};
const gdriveWriteFile=async(token,data,existingId)=>{
  const body=JSON.stringify(data);
  const meta=JSON.stringify({name:GDRIVE_BACKUP_FILE,parents:["appDataFolder"]});
  const form=new FormData();
  form.append("metadata",new Blob([meta],{type:"application/json"}));
  form.append("file",new Blob([body],{type:"application/json"}));
  const url=existingId?`${GDRIVE_UPLOAD}/files/${existingId}?uploadType=multipart`:`${GDRIVE_UPLOAD}/files?uploadType=multipart`;
  const r=await fetch(url,{method:existingId?"PATCH":"POST",headers:{Authorization:`Bearer ${token}`},body:form});
  if(!r.ok) throw new Error("write:"+r.status);return r.json();
};
const gdriveBackup=async(state)=>{
  const token=gdriveGetToken();if(!token) return;
  try{const f=await gdriveFindFile(token);await gdriveWriteFile(token,{...state,backedUpAt:new Date().toISOString()},f?.id);}
  catch(e){console.warn("[Drive backup]",e.message);}
};
const gdriveCheckBackup=async()=>{
  const token=gdriveGetToken();if(!token) return null;
  try{const f=await gdriveFindFile(token);return f?{fileId:f.id,modifiedTime:f.modifiedTime}:null;}
  catch(_){return null;}
};
const gdriveRestore=async()=>{
  const token=gdriveGetToken();if(!token) return null;
  try{const f=await gdriveFindFile(token);if(!f) return null;return gdriveReadFile(token,f.id);}
  catch(_){return null;}
};
// ─────────────────────────────────────────────────────────────────────────────

const DARK={
  bg:"#131313",surf:"#1c1b1b",card:"#201f1f",card2:"#2a2a2a",
  border:"#353534",border2:"#404040",text:"#e5e2e1",
  muted:"#7a7470",muted2:"#d8c3ad",accent:"#f59e0b",
  green:"#22c55e",red:"#ef4444",blue:"#60a5fa",orange:"#f97316",
};
const LIGHT={
  bg:"#f8f9fb",surf:"#ffffff",card:"#ffffff",card2:"#f2f4f6",
  border:"#d8c3ad",border2:"#a89880",text:"#191c1e",
  muted:"#867461",muted2:"#534434",accent:"#f59e0b",
  green:"#16a34a",red:"#ba1a1a",blue:"#00658b",orange:"#ea580c",
};
const ThemeCtx=createContext(DARK);
const ProfileCtx=createContext({experience:"intermediate",sex:"male",bodyweight:185});
let _uid=Date.now();
const uid=pfx=>`${pfx||"id"}${++_uid}_${Math.random().toString(36).slice(2,7)}`;
const MC = {
  Chest:"#f97316", Shoulders:"#a78bfa", Triceps:"#34d399", Back:"#60a5fa",
  Biceps:"#fb923c", Quads:"#38bdf8", Hamstrings:"#f472b6", Glutes:"#4ade80",
  Calves:"#fbbf24", Core:"#e879f9", "Full Body":"#94a3b8",
};
// Volume landmarks sourced from RP Hypertrophy Guides (rpstrength.com) for intermediate lifters
// RP note: Glutes MEV/MV = 0 because squats, RDLs & lunges provide sufficient indirect stimulus
// RP note: Triceps numbers already account for heavy indirect volume from all pressing movements
// RP note: Calves recover rapidly and tolerate/need higher frequency and volume
const BASE_MUSCLES = {
  Chest:     {mv:8,  mev:10, mav:16, mrv:20},
  Back:      {mv:8,  mev:10, mav:18, mrv:22},
  Shoulders: {mv:6,  mev:8,  mav:16, mrv:22},
  Biceps:    {mv:4,  mev:8,  mav:16, mrv:22},
  Triceps:   {mv:2,  mev:4,  mav:12, mrv:16},
  Quads:     {mv:6,  mev:8,  mav:16, mrv:20},
  Hamstrings:{mv:4,  mev:6,  mav:12, mrv:18},
  Glutes:    {mv:0,  mev:0,  mav:8,  mrv:16},
  Calves:    {mv:6,  mev:8,  mav:14, mrv:20},
  // Core: indirect stimulus from all compound work makes direct MEV effectively 0
  // Direct work targets stability and anti-rotation — not primary hypertrophy driver
  Core:      {mv:0,  mev:0,  mav:8,  mrv:16},
};
// Muscles where indirect volume from compounds is significant (per RP)
// These have MV/MEV of 0 — direct work is a bonus, not a requirement
const INDIRECT_VOLUME_MUSCLES=new Set(["Glutes","Core"]);
// Per RP: "exceeding the 8-12 set per muscle per session maximum makes training very inefficient"
const MAX_SETS_PER_MUSCLE_PER_SESSION = 8;

function getMuscles(experience, sex) {
  const scales = {new:0.70, returning:0.75, intermediate:1.00, advanced:1.25};
  const s = scales[experience] || 1.00;
  const femMod = sex === "female" ? 1.15 : 1.0;
  const result = {};
  Object.keys(BASE_MUSCLES).forEach(function(m) {
    const v = BASE_MUSCLES[m];
    // Glutes and Core have MEV/MV=0 due to indirect compound stimulus — sex modifier doesn't apply
    const fm = INDIRECT_VOLUME_MUSCLES.has(m) ? 1.0 : femMod;
    result[m] = {
      mv:  Math.round(v.mv  * s * fm),
      mev: Math.round(v.mev * s * fm),
      mav: Math.round(v.mav * s * fm),
      mrv: Math.round(v.mrv * s * fm),
    };
  });
  return result;
}

const EX_PROFILE = {
  // Chest — barbell compounds 5-10, dumbbell/machine 8-15, isolation 10-20
  "Machine Press":           {type:"compound",  pct:0.030, preferReps:false, minReps:8,  maxReps:15},
  "Incline Dumbbell Press":  {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15, stretchFocused:true},
  "Flat Barbell Bench":      {type:"compound",  pct:0.030, preferReps:false, minReps:5,  maxReps:10},
  "Dumbbell Bench Press":    {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "Close Grip Bench Press":  {type:"compound",  pct:0.025, preferReps:false, minReps:5,  maxReps:10},
  "Incline Barbell Press":   {type:"compound",  pct:0.030, preferReps:false, minReps:5,  maxReps:10},
  "Decline Dumbbell Press":  {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "Landmine Press":          {type:"compound",  pct:0.020, preferReps:false, minReps:8,  maxReps:15},
  "Machine Fly":             {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Cable Fly":               {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Dumbbell Fly":            {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Pec Deck":                {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Push-Up":                 {type:"compound",  pct:0.000, preferReps:true,  minReps:5,  maxReps:30},
  // Shoulders — pressing 8-15, lateral/rear delt isolation 15-30
  "Lateral Overheads":       {type:"isolation", pct:0.010, preferReps:true,  minReps:15, maxReps:30},
  "Lateral Machine":         {type:"isolation", pct:0.010, preferReps:true,  minReps:15, maxReps:30},
  "Dumbbell Lateral Raise":  {type:"isolation", pct:0.010, preferReps:true,  minReps:15, maxReps:30},
  "Cable Lateral Raise":     {type:"isolation", pct:0.010, preferReps:true,  minReps:15, maxReps:30},
  "Standing Barbell Press":  {type:"compound",  pct:0.020, preferReps:false, minReps:5,  maxReps:10},
  "Dumbbell Shoulder Press": {type:"compound",  pct:0.020, preferReps:false, minReps:8,  maxReps:15},
  "Arnold Press":            {type:"compound",  pct:0.020, preferReps:false, minReps:8,  maxReps:15},
  "Upright Row":             {type:"compound",  pct:0.020, preferReps:false, minReps:8,  maxReps:15},
  "Reverse Pec Deck":        {type:"isolation", pct:0.010, preferReps:true,  minReps:15, maxReps:30},
  "Face Pull":               {type:"isolation", pct:0.015, preferReps:true,  minReps:15, maxReps:25, stretchFocused:true},
  "Rear Delt Fly":           {type:"isolation", pct:0.010, preferReps:true,  minReps:15, maxReps:30, stretchFocused:true},
  // Triceps — compounds 5-10, isolation 10-20
  "Tri Machine":             {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Tricep Pushdown":         {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Skull Crusher":           {type:"isolation", pct:0.015, preferReps:true,  minReps:8,  maxReps:15},
  "Overhead Tricep Extension":{type:"isolation",pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Cable Overhead Extension": {type:"isolation",pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "JM Press":                {type:"compound",  pct:0.025, preferReps:false, minReps:5,  maxReps:10},
  "Tate Press":              {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Dip":                     {type:"compound",  pct:0.000, preferReps:true,  minReps:5,  maxReps:20},
  // Back — barbell compounds 5-10, machine/cable 8-15, isolation 10-20
  "Barbell Row":             {type:"compound",  pct:0.030, preferReps:false, minReps:5,  maxReps:10},
  "Dumbbell Row":            {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "T-Bar Row":               {type:"compound",  pct:0.030, preferReps:false, minReps:5,  maxReps:10},
  "Chest Supported Row":     {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "Single Arm Cable Row":    {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "Meadows Row":             {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "Rack Pull":               {type:"compound",  pct:0.035, preferReps:false, minReps:3,  maxReps:8},
  "Lat Pulldown":            {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15, stretchFocused:true},
  "Seated Cable Row":        {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "Straight Arm Pulldown":   {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Cable Pullover":          {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Pull-Up":                 {type:"compound",  pct:0.000, preferReps:true,  minReps:3,  maxReps:20, stretchFocused:true},
  "Chin-Up":                 {type:"compound",  pct:0.000, preferReps:true,  minReps:3,  maxReps:20, stretchFocused:true},
  // Biceps — all isolation 10-20, higher end for cable
  "Barbell Curl":            {type:"isolation", pct:0.015, preferReps:true,  minReps:8,  maxReps:15},
  "EZ Bar Curl":             {type:"isolation", pct:0.015, preferReps:true,  minReps:8,  maxReps:15},
  "Hammer Curl":             {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Incline Dumbbell Curl":   {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Cable Curl":              {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Preacher Curl":           {type:"isolation", pct:0.015, preferReps:true,  minReps:8,  maxReps:15},
  "Spider Curl":             {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Concentration Curl":      {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Reverse Curl":            {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Machine Curl":            {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  // Quads — barbell 5-10, machine/dumbbell 8-15, isolation 10-20
  "Back Squat":              {type:"compound",  pct:0.030, preferReps:false, minReps:5,  maxReps:10},
  "Front Squat":             {type:"compound",  pct:0.025, preferReps:false, minReps:5,  maxReps:10},
  "Bulgarian Split Squat":   {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15, stretchFocused:true},
  "Hack Squat":              {type:"compound",  pct:0.030, preferReps:false, minReps:8,  maxReps:15},
  "Goblet Squat":            {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "Walking Lunge":           {type:"compound",  pct:0.020, preferReps:true,  minReps:10, maxReps:20},
  "Leg Press":               {type:"compound",  pct:0.030, preferReps:false, minReps:8,  maxReps:15},
  "Angled Leg Press":        {type:"compound",  pct:0.030, preferReps:false, minReps:8,  maxReps:15},
  "Leg Extension":           {type:"isolation", pct:0.020, preferReps:true,  minReps:10, maxReps:20},
  "Step Up":                 {type:"compound",  pct:0.020, preferReps:true,  minReps:10, maxReps:20},
  "Sissy Squat":             {type:"isolation", pct:0.000, preferReps:true,  minReps:8,  maxReps:20, stretchFocused:true},
  // Hamstrings — RDL/SLDL 6-12, leg curl 10-20
  "Romanian Deadlift":       {type:"compound",  pct:0.025, preferReps:false, minReps:6,  maxReps:12, stretchFocused:true},
  "Stiff Leg Deadlift":      {type:"compound",  pct:0.025, preferReps:false, minReps:6,  maxReps:12, stretchFocused:true},
  "Good Morning":            {type:"compound",  pct:0.020, preferReps:false, minReps:8,  maxReps:15},
  "Nordic Curl":             {type:"isolation", pct:0.000, preferReps:true,  minReps:3,  maxReps:12, stretchFocused:true},
  "Leg Curl":                {type:"isolation", pct:0.020, preferReps:true,  minReps:10, maxReps:20},
  "Lying Leg Curl":          {type:"isolation", pct:0.020, preferReps:true,  minReps:10, maxReps:20, stretchFocused:true},
  "Seated Leg Curl":         {type:"isolation", pct:0.020, preferReps:true,  minReps:10, maxReps:20},
  "Single Leg Romanian Deadlift":{type:"compound",pct:0.020,preferReps:false,minReps:8, maxReps:15},
  // Glutes — hip thrust/bridge 8-15, isolation 15-25
  "Hip Thrust":              {type:"compound",  pct:0.025, preferReps:false, minReps:8,  maxReps:15},
  "Glute Thrust":            {type:"compound",  pct:0.025, preferReps:false, minReps:10, maxReps:20},
  "Barbell Hip Thrust":      {type:"compound",  pct:0.030, preferReps:false, minReps:8,  maxReps:15},
  "Sumo Deadlift":           {type:"compound",  pct:0.030, preferReps:false, minReps:5,  maxReps:10},
  "Glute Bridge":            {type:"compound",  pct:0.025, preferReps:false, minReps:10, maxReps:20},
  "Single Leg Hip Thrust":   {type:"compound",  pct:0.020, preferReps:false, minReps:10, maxReps:20},
  "Cable Pull Through":      {type:"compound",  pct:0.020, preferReps:true,  minReps:12, maxReps:20, stretchFocused:true},
  "Abductor Machine":        {type:"isolation", pct:0.015, preferReps:true,  minReps:15, maxReps:25},
  "Reverse Hyper":           {type:"compound",  pct:0.015, preferReps:true,  minReps:12, maxReps:20},
  "Cable Kickback":          {type:"isolation", pct:0.015, preferReps:true,  minReps:12, maxReps:20},
  // Calves — higher rep ranges per RP (10-20 standing, 15-30 seated)
  "Calf Raise":              {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:20},
  "Seated Calf Raise":       {type:"isolation", pct:0.015, preferReps:true,  minReps:15, maxReps:30, stretchFocused:true},
  "Leg Press Calf Raise":    {type:"isolation", pct:0.015, preferReps:true,  minReps:15, maxReps:25},
  "Single Leg Calf Raise":   {type:"isolation", pct:0.000, preferReps:true,  minReps:10, maxReps:25},
  "Tibialis Raise":          {type:"isolation", pct:0.000, preferReps:true,  minReps:15, maxReps:30},
  // Core — higher rep ranges
  "Cable Crunch":            {type:"isolation", pct:0.015, preferReps:true,  minReps:10, maxReps:25},
  "Ab Wheel Rollout":        {type:"isolation", pct:0.000, preferReps:true,  minReps:5,  maxReps:20},
  "Hanging Leg Raise":       {type:"isolation", pct:0.000, preferReps:true,  minReps:8,  maxReps:20},
  "Pallof Press":            {type:"isolation", pct:0.010, preferReps:true,  minReps:10, maxReps:20},
  "Plank":                   {type:"isolation", pct:0.000, preferReps:true,  minReps:3,  maxReps:10},
  "Decline Sit-Up":          {type:"isolation", pct:0.000, preferReps:true,  minReps:10, maxReps:25},
  "Dragon Flag":             {type:"isolation", pct:0.000, preferReps:true,  minReps:3,  maxReps:10},
  "Landmine Rotation":       {type:"isolation", pct:0.010, preferReps:true,  minReps:8,  maxReps:15},
  "Dead Bug":                {type:"isolation", pct:0.000, preferReps:true,  minReps:8,  maxReps:20},
  "Cable Woodchop":          {type:"isolation", pct:0.010, preferReps:true,  minReps:10, maxReps:20},
  "Rotary Torso":            {type:"isolation", pct:0.010, preferReps:true,  minReps:15, maxReps:25},
  // Full Body — mostly rep-based or weight-based depending on exercise
  "Farmers Carry":           {type:"compound",  pct:0.000, preferReps:false, minReps:1,  maxReps:5},
  "Sled Push":               {type:"compound",  pct:0.000, preferReps:false, minReps:1,  maxReps:5},
  "Battle Ropes":            {type:"compound",  pct:0.000, preferReps:true,  minReps:5,  maxReps:20},
  "Turkish Get-Up":          {type:"compound",  pct:0.000, preferReps:true,  minReps:3,  maxReps:8},
  "Kettlebell Swing":        {type:"compound",  pct:0.000, preferReps:true,  minReps:10, maxReps:25},
  "Box Jump":                {type:"compound",  pct:0.000, preferReps:true,  minReps:5,  maxReps:10},
  "Burpee":                  {type:"compound",  pct:0.000, preferReps:true,  minReps:5,  maxReps:20},
  "Man Maker":               {type:"compound",  pct:0.000, preferReps:true,  minReps:5,  maxReps:15},
  "Clean and Press":         {type:"compound",  pct:0.025, preferReps:false, minReps:3,  maxReps:8},
  "Trap Bar Deadlift":       {type:"compound",  pct:0.035, preferReps:false, minReps:3,  maxReps:8},
};
const getProfile = n => EX_PROFILE[n] || {type:"compound", pct:0.025, preferReps:false, minReps:5, maxReps:15};
const snap = v => Math.max(Math.round(v/2.5)*2.5, 2.5);
// Compute ramped set count for the current week (MEV→MRV across working weeks)
// Deload targets MV (maintenance volume) per RP — just enough to not lose muscle
function rampedSets(mevSets, mrvSets, week, totalWeeks, mvSets) {
  const workingWeeks = totalWeeks - 1;
  if (week >= totalWeeks) return Math.max(1, mvSets||Math.ceil(mevSets/2)); // deload at MV
  if (workingWeeks <= 1) return mevSets;
  const progress = (week - 1) / (workingWeeks - 1);
  return Math.round(mevSets + progress * (mrvSets - mevSets));
}

// Epley e1RM — used for PR comparison so reps are factored in
const e1rm = (weight, reps) => {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps) || 1;
  return w * (1 + r / 30);
};

// Experience-scaled rollback between mesos (#13)
const rollbackWeight = (w, experience, isIsolation) => {
  if (isIsolation) return snap(parseFloat(w) * 0.94);
  const pct = {new:0.85, returning:0.88, intermediate:0.92, advanced:0.95}[experience] || 0.92;
  return snap(parseFloat(w) * pct);
};

// Experience-aware RIR sequence aligned with RP methodology
// Intermediate + Advanced: 3→2→1→0 (same sequence, volume differs)
// New/Returning: stay at 3-4 throughout — technique not calibrated enough for failure
const defaultRIR = (w, total, experience="intermediate") => {
  const t = total || 5;
  if (w >= t) return 4; // deload week always RIR 4
  const workingWeeks = t - 1;
  const isNovice = experience==="new" || experience==="returning";
  // Novices hold RIR 3 the entire meso — no ramp to failure
  if(isNovice){
    if(workingWeeks<=1) return 3;
    // Gentle: start at 4, hold at 3 for most of meso, end at 2 max
    const seqs={1:[3],2:[4,3],3:[4,3,3],4:[4,3,3,2],5:[4,3,3,2,2]};
    const seq=seqs[workingWeeks]||seqs[4];
    return seq[Math.min(w-1,seq.length-1)];
  }
  // Intermediate + Advanced: classic RP 3→2→1→0 ramp
  const seqs={1:[3],2:[3,1],3:[3,2,0],4:[3,2,1,0],5:[3,2,2,1,0]};
  const seq=seqs[workingWeeks]||seqs[4];
  return seq[Math.min(w-1,seq.length-1)];
};
const fmt = s => String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
const getTodayName = () => new Date().toLocaleDateString("en-US",{weekday:"long"});
// Returns "Starts" or "Started" depending on whether the meso's first training day has arrived
const mesoStartLabel=(startDate)=>{
  if(!startDate) return "Started";
  try {
    const start=new Date(startDate);
    const today=new Date();
    today.setHours(0,0,0,0);
    start.setHours(0,0,0,0);
    return start>today?"Starts":"Started";
  } catch(_){ return "Started"; }
};

function rpProg(name, lw, lrir, lreps, trir, isDrop, theme=DARK, experience="intermediate") {
  if (isDrop) return {action:"add_reps",ws:lw,note:"Chase reps",reason:"Drop sets: hold weight, add reps",color:theme.blue};
  const p=getProfile(name);
  const w=parseFloat(lw)||0;
  const expScale={new:1.5, returning:1.25, intermediate:1.0, advanced:0.6}[experience]||1.0;
  const inc=snap(w*p.pct*expScale);
  const lrepsN=parseInt(lreps)||0;

  // Bodyweight / zero-load exercises — rep guidance without needing a weight
  if(!w && p.preferReps){
    if(lrir===null||lrir===undefined) return {action:"baseline",ws:0,note:null,reason:"Log your reps and RIR to enable progression.",color:theme.muted2};
    const diff=lrir-trir;
    if(diff>=2&&lrepsN){
      if(lrepsN>=p.maxReps) return {action:"add_load",ws:0,note:"Add external load (vest/belt)",reason:"You've hit "+p.maxReps+" reps — time to add resistance.",color:theme.green};
      return {action:"add_reps",ws:0,note:"Aim for "+(lrepsN+1)+"-"+(lrepsN+2)+" reps",reason:"Too easy — add a rep.",color:theme.green};
    }
    if(diff>=0&&lrepsN) return {action:"add_reps",ws:0,note:"Aim for +1 rep",reason:"On target — chase one more rep.",color:theme.accent};
    if(diff===-1) return {action:"hold",ws:0,note:"Match last reps",reason:"Slightly too hard — hold reps.",color:theme.orange};
    return {action:"reduce",ws:0,note:"Drop 1-2 reps",reason:"Too hard — reduce reps slightly.",color:theme.red};
  }

  if(!w) return null;
  if(lrir===null||lrir===undefined) return {action:"baseline",ws:w,note:null,reason:"No prior session. Hold this weight and log RIR to enable progression.",color:theme.muted2};
  const diff=lrir-trir;
  const ctx="Last: RIR "+lrir+"  /  Target: RIR "+trir;

  if(diff>=2){
    if(p.preferReps && lrepsN){
      if(lrepsN>=p.maxReps) return {action:"add_weight",ws:w+inc,note:"Drop to "+p.minReps+"-"+(p.minReps+2)+" reps",reason:ctx+". Hit rep ceiling ("+p.maxReps+") — add "+inc+" lbs, drop back to "+p.minReps+" reps.",color:theme.green};
      return {action:"add_reps",ws:w,note:"Aim for "+(lrepsN+1)+"-"+(lrepsN+2)+" reps",reason:ctx+". Too easy — add a rep first.",color:theme.green};
    }
    return {action:"add_weight",ws:w+inc,note:null,reason:ctx+". Too easy — adding "+inc+" lbs.",color:theme.green};
  }
  if(diff>=0){
    if(p.preferReps && lrepsN){
      if(lrepsN>=p.maxReps) return {action:"add_weight",ws:w+snap(w*p.pct*expScale*0.6),note:"Drop to "+p.minReps+"-"+(p.minReps+2)+" reps",reason:ctx+". Hit rep ceiling — bump weight, reset reps.",color:theme.accent};
      return {action:"add_reps",ws:w,note:"Aim for +1 rep",reason:ctx+". On target — add a rep before adding weight.",color:theme.accent};
    }
    return {action:"add_weight",ws:w+snap(w*p.pct*expScale*0.6),note:null,reason:ctx+". On target — small weight bump.",color:theme.accent};
  }
  if(diff===-1) return {action:"hold",ws:w,note:"Match last reps",reason:ctx+". Slightly too hard — hold weight.",color:theme.orange};
  return {action:"reduce",ws:Math.max(w-inc,2.5),note:null,reason:ctx+". Too heavy — reducing "+inc+" lbs.",color:theme.red};
}

function buildScheme(sets) {
  const done=sets.filter(s=>s.done&&parseFloat(s.weight)>0&&parseFloat(s.reps)>0);
  if (!done.length) return null;
  const grp=arr=>{
    const g=[];
    arr.forEach(s=>{
      const last=g[g.length-1];
      if (last&&last.w===s.weight){last.r.push(s.reps||"-");}
      else{g.push({w:s.weight,r:[s.reps||"-"]});}
    });
    return g.map(x=>x.w+"x"+x.r.join(",")).join(" ");
  };
  const normals=done.filter(s=>s.type!=="drop");
  const drops=done.filter(s=>s.type==="drop");
  let out=grp(normals);
  if (drops.length) out+="  Drop "+grp(drops);
  return out||null;
}

const newSet=(w,type)=>({id:uid("s"),weight:w||"",reps:"",rir:String(defaultRIR(1)),type:type||"normal",done:false});

function extractLiftEntries(exs, mesoNum, mesoLabel, week, isDeload) {
  const dateStr=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const entries=[];
  exs.forEach(ex=>{
    const doneSets=ex.sets.filter(s=>s.done&&!s.incomplete&&parseFloat(s.weight)>0&&parseFloat(s.reps)>0);
    const normalSets=doneSets.filter(s=>s.type!=="drop");
    if (!normalSets.length) return;
    const topSet=normalSets.reduce((best,s)=>parseFloat(s.weight)>parseFloat(best.weight)?s:best,normalSets[0]);
    entries.push({
      id:uid("lh"),
      exercise:ex.name,muscle:ex.muscle,
      mesoNum:mesoNum,mesoLabel:mesoLabel,
      week:week,isDeload:isDeload,date:dateStr,
      topSetWeight:parseFloat(topSet.weight),
      topSetReps:parseInt(topSet.reps)||0,
      rir:parseInt(topSet.rir)||0,
      scheme:buildScheme(ex.sets)||"",
      label:"M"+mesoNum+(isDeload?"DL":"W"+week),
    });
  });
  return entries;
}

function findPeakWeight(liftHistory,exerciseName,mesoNum){
  const entries=liftHistory.filter(e=>e.exercise===exerciseName&&e.mesoNum===mesoNum&&!e.isDeload);
  if (!entries.length) return null;
  return entries.reduce((best,e)=>e.topSetWeight>best?e.topSetWeight:best,0);
}
function buildChartData(liftHistory,exerciseName){
  const entries=liftHistory.filter(e=>e.exercise===exerciseName);
  entries.sort((a,b)=>{
    if (a.mesoNum!==b.mesoNum) return a.mesoNum-b.mesoNum;
    if (a.isDeload&&!b.isDeload) return 1;
    if (!a.isDeload&&b.isDeload) return -1;
    return a.week-b.week;
  });
  const seen={};
  entries.forEach(e=>{seen[e.label]=e;});
  const deduped=[];
  entries.forEach(e=>{if(seen[e.label]===e) deduped.push(e);});
  return deduped.map(e=>({label:e.label,v:e.topSetWeight,meso:e.mesoNum,deload:e.isDeload,date:e.date}));
}

const INIT_LIBRARY=[
  // Chest
  {name:"Machine Press",muscle:"Chest",type:"compound",fav:true},
  {name:"Flat Barbell Bench",muscle:"Chest",type:"compound",fav:false},
  {name:"Incline Barbell Press",muscle:"Chest",type:"compound",fav:false},
  {name:"Incline Dumbbell Press",muscle:"Chest",type:"compound",fav:false},
  {name:"Decline Dumbbell Press",muscle:"Chest",type:"compound",fav:false},
  {name:"Dumbbell Bench Press",muscle:"Chest",type:"compound",fav:false},
  {name:"Close Grip Bench Press",muscle:"Chest",type:"compound",fav:false},
  {name:"Landmine Press",muscle:"Chest",type:"compound",fav:false},
  {name:"Push-Up",muscle:"Chest",type:"compound",fav:false},
  {name:"Machine Fly",muscle:"Chest",type:"isolation",fav:false},
  {name:"Pec Deck",muscle:"Chest",type:"isolation",fav:false},
  {name:"Cable Fly",muscle:"Chest",type:"isolation",fav:false},
  {name:"Dumbbell Fly",muscle:"Chest",type:"isolation",fav:false},
  // Back
  {name:"Barbell Row",muscle:"Back",type:"compound",fav:true},
  {name:"Dumbbell Row",muscle:"Back",type:"compound",fav:false},
  {name:"T-Bar Row",muscle:"Back",type:"compound",fav:false},
  {name:"Chest Supported Row",muscle:"Back",type:"compound",fav:false},
  {name:"Single Arm Cable Row",muscle:"Back",type:"compound",fav:false},
  {name:"Meadows Row",muscle:"Back",type:"compound",fav:false},
  {name:"Rack Pull",muscle:"Back",type:"compound",fav:false},
  {name:"Lat Pulldown",muscle:"Back",type:"compound",fav:true},
  {name:"Pull-Up",muscle:"Back",type:"compound",fav:false},
  {name:"Chin-Up",muscle:"Back",type:"compound",fav:false},
  {name:"Seated Cable Row",muscle:"Back",type:"compound",fav:false},
  {name:"Straight Arm Pulldown",muscle:"Back",type:"isolation",fav:false},
  {name:"Cable Pullover",muscle:"Back",type:"isolation",fav:false},
  // Shoulders
  {name:"Standing Barbell Press",muscle:"Shoulders",type:"compound",fav:true},
  {name:"Dumbbell Shoulder Press",muscle:"Shoulders",type:"compound",fav:false},
  {name:"Arnold Press",muscle:"Shoulders",type:"compound",fav:false},
  {name:"Upright Row",muscle:"Shoulders",type:"compound",fav:false},
  {name:"Lateral Overheads",muscle:"Shoulders",type:"isolation",fav:false},
  {name:"Lateral Machine",muscle:"Shoulders",type:"isolation",fav:false},
  {name:"Dumbbell Lateral Raise",muscle:"Shoulders",type:"isolation",fav:false},
  {name:"Cable Lateral Raise",muscle:"Shoulders",type:"isolation",fav:false},
  {name:"Face Pull",muscle:"Shoulders",type:"isolation",fav:false},
  {name:"Rear Delt Fly",muscle:"Shoulders",type:"isolation",fav:false},
  {name:"Reverse Pec Deck",muscle:"Shoulders",type:"isolation",fav:false},
  // Triceps
  {name:"Tri Machine",muscle:"Triceps",type:"isolation",fav:false},
  {name:"Tricep Pushdown",muscle:"Triceps",type:"isolation",fav:true},
  {name:"Skull Crusher",muscle:"Triceps",type:"isolation",fav:false},
  {name:"Overhead Tricep Extension",muscle:"Triceps",type:"isolation",fav:false},
  {name:"Cable Overhead Extension",muscle:"Triceps",type:"isolation",fav:false},
  {name:"JM Press",muscle:"Triceps",type:"compound",fav:false},
  {name:"Tate Press",muscle:"Triceps",type:"isolation",fav:false},
  {name:"Dip",muscle:"Triceps",type:"compound",fav:false},
  // Biceps
  {name:"Barbell Curl",muscle:"Biceps",type:"isolation",fav:true},
  {name:"EZ Bar Curl",muscle:"Biceps",type:"isolation",fav:false},
  {name:"Hammer Curl",muscle:"Biceps",type:"isolation",fav:false},
  {name:"Incline Dumbbell Curl",muscle:"Biceps",type:"isolation",fav:false},
  {name:"Cable Curl",muscle:"Biceps",type:"isolation",fav:false},
  {name:"Preacher Curl",muscle:"Biceps",type:"isolation",fav:false},
  {name:"Spider Curl",muscle:"Biceps",type:"isolation",fav:false},
  {name:"Concentration Curl",muscle:"Biceps",type:"isolation",fav:false},
  {name:"Reverse Curl",muscle:"Biceps",type:"isolation",fav:false},
  {name:"Machine Curl",muscle:"Biceps",type:"isolation",fav:false},
  // Quads
  {name:"Back Squat",muscle:"Quads",type:"compound",fav:true},
  {name:"Front Squat",muscle:"Quads",type:"compound",fav:false},
  {name:"Bulgarian Split Squat",muscle:"Quads",type:"compound",fav:false},
  {name:"Hack Squat",muscle:"Quads",type:"compound",fav:false},
  {name:"Goblet Squat",muscle:"Quads",type:"compound",fav:false},
  {name:"Walking Lunge",muscle:"Quads",type:"compound",fav:false},
  {name:"Leg Press",muscle:"Quads",type:"compound",fav:false},
  {name:"Angled Leg Press",muscle:"Quads",type:"compound",fav:false},
  {name:"Leg Extension",muscle:"Quads",type:"isolation",fav:false},
  {name:"Step Up",muscle:"Quads",type:"compound",fav:false},
  {name:"Sissy Squat",muscle:"Quads",type:"isolation",fav:false},
  // Hamstrings
  {name:"Romanian Deadlift",muscle:"Hamstrings",type:"compound",fav:true},
  {name:"Stiff Leg Deadlift",muscle:"Hamstrings",type:"compound",fav:false},
  {name:"Good Morning",muscle:"Hamstrings",type:"compound",fav:false},
  {name:"Single Leg Romanian Deadlift",muscle:"Hamstrings",type:"compound",fav:false},
  {name:"Nordic Curl",muscle:"Hamstrings",type:"isolation",fav:false},
  {name:"Leg Curl",muscle:"Hamstrings",type:"isolation",fav:false},
  {name:"Lying Leg Curl",muscle:"Hamstrings",type:"isolation",fav:false},
  {name:"Seated Leg Curl",muscle:"Hamstrings",type:"isolation",fav:false},
  // Glutes
  {name:"Hip Thrust",muscle:"Glutes",type:"compound",fav:true},
  {name:"Glute Thrust",muscle:"Glutes",type:"compound",fav:false},
  {name:"Barbell Hip Thrust",muscle:"Glutes",type:"compound",fav:false},
  {name:"Single Leg Hip Thrust",muscle:"Glutes",type:"compound",fav:false},
  {name:"Sumo Deadlift",muscle:"Glutes",type:"compound",fav:false},
  {name:"Glute Bridge",muscle:"Glutes",type:"compound",fav:false},
  {name:"Cable Pull Through",muscle:"Glutes",type:"compound",fav:false},
  {name:"Abductor Machine",muscle:"Glutes",type:"isolation",fav:false},
  {name:"Reverse Hyper",muscle:"Glutes",type:"compound",fav:false},
  {name:"Cable Kickback",muscle:"Glutes",type:"isolation",fav:false},
  // Calves
  {name:"Calf Raise",muscle:"Calves",type:"isolation",fav:true},
  {name:"Seated Calf Raise",muscle:"Calves",type:"isolation",fav:false},
  {name:"Leg Press Calf Raise",muscle:"Calves",type:"isolation",fav:false},
  {name:"Single Leg Calf Raise",muscle:"Calves",type:"isolation",fav:false},
  {name:"Tibialis Raise",muscle:"Calves",type:"isolation",fav:false},
  // Core
  {name:"Cable Crunch",muscle:"Core",type:"isolation",fav:false},
  {name:"Ab Wheel Rollout",muscle:"Core",type:"isolation",fav:false},
  {name:"Hanging Leg Raise",muscle:"Core",type:"isolation",fav:false},
  {name:"Pallof Press",muscle:"Core",type:"isolation",fav:false},
  {name:"Plank",muscle:"Core",type:"isolation",fav:false},
  {name:"Decline Sit-Up",muscle:"Core",type:"isolation",fav:false},
  {name:"Dragon Flag",muscle:"Core",type:"isolation",fav:false},
  {name:"Landmine Rotation",muscle:"Core",type:"isolation",fav:false},
  {name:"Dead Bug",muscle:"Core",type:"isolation",fav:false},
  {name:"Cable Woodchop",muscle:"Core",type:"isolation",fav:false},
  {name:"Rotary Torso",muscle:"Core",type:"isolation",fav:false},
  // Full Body
  {name:"Farmers Carry",muscle:"Full Body",type:"compound",fav:false},
  {name:"Sled Push",muscle:"Full Body",type:"compound",fav:false},
  {name:"Battle Ropes",muscle:"Full Body",type:"compound",fav:false},
  {name:"Turkish Get-Up",muscle:"Full Body",type:"compound",fav:false},
  {name:"Kettlebell Swing",muscle:"Full Body",type:"compound",fav:false},
  {name:"Box Jump",muscle:"Full Body",type:"compound",fav:false},
  {name:"Burpee",muscle:"Full Body",type:"compound",fav:false},
  {name:"Man Maker",muscle:"Full Body",type:"compound",fav:false},
  {name:"Clean and Press",muscle:"Full Body",type:"compound",fav:false},
  {name:"Trap Bar Deadlift",muscle:"Full Body",type:"compound",fav:false},
];
const GLOSSARY=[
  {term:"RIR",full:"Reps in Reserve",def:"How many more reps you could do before failure. Ramps down each week as the meso gets harder."},
  {term:"MEV",full:"Minimum Effective Volume",def:"Minimum sets per week a muscle needs to actually grow."},
  {term:"MAV",full:"Maximum Adaptive Volume",def:"The sweet spot for weekly sets where you get the most growth."},
  {term:"MRV",full:"Maximum Recoverable Volume",def:"The ceiling. Beyond this, recovery cannot keep up with volume."},
  {term:"SFR",full:"Stimulus to Fatigue Ratio",def:"Stimulus an exercise provides relative to how beat up it leaves you."},
  {term:"Mesocycle",full:"Mesocycle (Meso)",def:"A structured 4-6 week block with progressive overload, ending in a deload."},
  {term:"Deload",full:"Deload Week",def:"Recovery week - same exercises, half the sets, RIR 4."},
];
const WEEK_DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const AUTO_SPLITS={
  "Push/Pull/Legs":[
    {name:"Push",exs:[
      // Chest: best compound + stretch isolation
      "Flat Barbell Bench","Cable Fly",
      // Shoulders: compound press + lateral isolation
      "Dumbbell Shoulder Press","Cable Lateral Raise",
      // Triceps: stretch-position isolation
      "Overhead Tricep Extension",
    ]},
    {name:"Pull",exs:[
      // Back: vertical pull + horizontal row (different angles)
      "Lat Pulldown","Barbell Row",
      // Back isolation: stretch-position
      "Straight Arm Pulldown",
      // Rear delts
      "Face Pull",
      // Biceps: stretch + neutral grip
      "Incline Dumbbell Curl","Hammer Curl",
    ]},
    {name:"Legs",exs:[
      // Quads: compound + isolation
      "Back Squat","Leg Extension",
      // Hamstrings: stretch-position hinge + leg curl
      "Romanian Deadlift","Lying Leg Curl",
      // Glutes
      "Hip Thrust",
      // Calves
      "Calf Raise",
    ]},
  ],
  "Upper/Lower":[
    {name:"Upper A",exs:[
      // Chest compound + back compound (antagonist pair)
      "Flat Barbell Bench","Barbell Row",
      // Shoulder press
      "Dumbbell Shoulder Press",
      // Vertical pull
      "Lat Pulldown",
      // Arms
      "Tricep Pushdown","Barbell Curl",
    ]},
    {name:"Lower A",exs:[
      // Quad dominant
      "Back Squat","Leg Extension",
      // Hamstring dominant
      "Romanian Deadlift","Lying Leg Curl",
      // Calves
      "Calf Raise",
    ]},
    {name:"Upper B",exs:[
      // Incline press + stretch isolation (different angle from Upper A)
      "Incline Dumbbell Press","Cable Fly",
      // Horizontal row + lateral raise
      "Chest Supported Row","Cable Lateral Raise",
      // Arms: stretch-position
      "Overhead Tricep Extension","Incline Dumbbell Curl",
    ]},
    {name:"Lower B",exs:[
      // Unilateral quad + glute dominant
      "Bulgarian Split Squat","Hip Thrust",
      // Hamstring: seated curl (different feel from lying)
      "Seated Leg Curl",
      // Glute isolation
      "Glute Bridge",
      // Calves: seated for soleus emphasis
      "Seated Calf Raise",
    ]},
  ],
  "Full Body":[
    {name:"Full Body A",exs:[
      // One press, one pull, one squat, one hinge
      "Flat Barbell Bench","Barbell Row",
      "Back Squat","Romanian Deadlift",
      // Arms
      "Tricep Pushdown","Barbell Curl",
    ]},
    {name:"Full Body B",exs:[
      // Different angles from A
      "Incline Dumbbell Press","Lat Pulldown",
      "Leg Press","Hip Thrust",
      // Isolation variety
      "Overhead Tricep Extension","Hammer Curl",
      "Calf Raise",
    ]},
    {name:"Full Body C",exs:[
      // Machine/cable variation for variety
      "Machine Press","Seated Cable Row",
      "Bulgarian Split Squat","Lying Leg Curl",
      "Dumbbell Shoulder Press","Incline Dumbbell Curl",
      "Seated Calf Raise",
    ]},
  ],
  "Hybrid Split":[
    {name:"Push + Legs",exs:[
      // Push: one compound + isolation (not two compounds)
      "Machine Press","Cable Fly",
      "Cable Lateral Raise","Tricep Pushdown",
      // Legs: squat + isolation
      "Back Squat","Leg Extension","Calf Raise",
    ]},
    {name:"Pull + Legs",exs:[
      // Pull: vertical + horizontal
      "Lat Pulldown","Barbell Row",
      "Face Pull","Incline Dumbbell Curl",
      // Legs: hinge dominant
      "Romanian Deadlift","Lying Leg Curl","Hip Thrust",
    ]},
    {name:"Upper",exs:[
      // Balanced upper: press + row + shoulder + arm
      "Flat Barbell Bench","Chest Supported Row",
      "Dumbbell Shoulder Press","Straight Arm Pulldown",
      "Overhead Tricep Extension","Hammer Curl",
    ]},
    {name:"Legs",exs:[
      // Complete legs: quad compound + isolation + hinge + glute + calf
      "Back Squat","Leg Extension",
      "Romanian Deadlift","Lying Leg Curl",
      "Hip Thrust","Calf Raise",
    ]},
  ],
  "Bro Split":[
    {name:"Chest",exs:[
      // One compound + stretch isolations only (no redundant compounds)
      "Flat Barbell Bench",
      "Cable Fly","Pec Deck",
      "Incline Dumbbell Press",
    ]},
    {name:"Back",exs:[
      // Vertical pull + horizontal row + stretch isolation
      "Lat Pulldown","Barbell Row",
      "Seated Cable Row","Straight Arm Pulldown",
    ]},
    {name:"Shoulders",exs:[
      // Press + lateral + rear delt (all three heads)
      "Dumbbell Shoulder Press",
      "Cable Lateral Raise","Lateral Machine",
      "Face Pull","Rear Delt Fly",
    ]},
    {name:"Arms",exs:[
      // Biceps: stretch + neutral + peak
      "Incline Dumbbell Curl","Barbell Curl","Hammer Curl",
      // Triceps: stretch + pushdown
      "Overhead Tricep Extension","Tricep Pushdown",
    ]},
    {name:"Legs",exs:[
      // Complete legs
      "Back Squat","Leg Extension",
      "Romanian Deadlift","Lying Leg Curl",
      "Hip Thrust","Calf Raise",
    ]},
    {name:"Specialization",exs:[
      // Upper body weak points + stretch focus
      "Incline Barbell Press","Cable Fly",
      "Lat Pulldown","Cable Pullover",
      "Incline Dumbbell Curl","Overhead Tricep Extension",
    ]},
  ],
};
const SPLIT_DAYS={
  "Push/Pull/Legs":{
    "3":["Tuesday","Thursday","Saturday"],
    "4":["Monday","Tuesday","Thursday","Saturday"],
    "5":["Monday","Tuesday","Wednesday","Friday","Saturday"],
    "6":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  },
  "Upper/Lower":{
    "2":["Monday","Thursday"],
    "3":["Monday","Tuesday","Thursday"],
    "4":["Monday","Tuesday","Thursday","Friday"],
    "5":["Monday","Tuesday","Wednesday","Friday","Saturday"],
    "6":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  },
  "Full Body":{
    "2":["Monday","Thursday"],
    "3":["Monday","Wednesday","Friday"],
    "4":["Monday","Tuesday","Thursday","Friday"],
    "5":["Monday","Tuesday","Wednesday","Friday","Saturday"],
    "6":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  },
  "Hybrid Split":{
    "2":["Monday","Thursday"],
    "3":["Monday","Wednesday","Friday"],
    "4":["Monday","Tuesday","Thursday","Saturday"],
    "5":["Monday","Tuesday","Wednesday","Friday","Saturday"],
  },
  "Bro Split":{
    "3":["Monday","Wednesday","Friday"],
    "4":["Monday","Tuesday","Thursday","Friday"],
    "5":["Monday","Tuesday","Wednesday","Friday","Saturday"],
    "6":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  },
};
// Distribute n training sessions across available days with maximum rest spacing
function distributeDays(n, availDays) {
  if (!availDays || availDays.length === 0) return WEEK_DAYS.slice(0, n);
  if (n >= availDays.length) return availDays.slice(0, n);
  // Score each combination of n days from availDays by minimizing consecutive pairs
  // and maximizing minimum gap between any two training days
  const dayIdx = {};
  WEEK_DAYS.forEach((d, i) => { dayIdx[d] = i; });
  const sorted = availDays.slice().sort((a, b) => dayIdx[a] - dayIdx[b]);
  // Generate all C(avail, n) combinations and pick the one with best spacing
  function combos(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    return [...combos(rest, k - 1).map(c => [first, ...c]), ...combos(rest, k)];
  }
  const all = combos(sorted, n);
  let best = sorted.slice(0, n);
  let bestScore = -1;
  all.forEach(combo => {
    const idxs = combo.map(d => dayIdx[d]);
    // Gaps between consecutive training days (wrapping week)
    const gaps = [];
    for (let i = 0; i < idxs.length; i++) {
      const next = idxs[(i + 1) % idxs.length];
      const cur = idxs[i];
      gaps.push(next > cur ? next - cur : 7 + next - cur);
    }
    const minGap = Math.min(...gaps);
    const evenness = -Math.max(...gaps); // prefer even distribution
    const score = minGap * 10 + evenness;
    if (score > bestScore) { bestScore = score; best = combo; }
  });
  return best;
}

function splitNeedsPriority(split,n){
  // Only PPL creates a meaningful priority choice — it has 3 distinct day types
  // and uneven distribution means one gets noticeably more frequency than others
  if(split!=="Push/Pull/Legs") return false;
  const tc=(AUTO_SPLITS[split]||[]).length;
  return tc>0 && n%tc!==0;
}
function getPplSequence(n,priority){
  if (n===3) return [0,1,2];
  if (n===4){
    const pi=priority==="Push"?0:priority==="Pull"?1:priority==="Legs"?2:0;
    const others=[0,1,2].filter(i=>i!==pi);
    return [pi,others[0],others[1],pi];
  }
  if (n===5){
    // For 4-day: priority = group that trains twice
    // For 5-day: priority = group that trains once (others train twice)
    // We detect context by caller but use same param — here priority means "trains once" for n===5
    if (priority==="Push") return [1,2,1,0,2];  // Pull×2, Legs×2, Push×1
    if (priority==="Pull") return [0,2,0,1,2];  // Push×2, Legs×2, Pull×1
    if (priority==="Legs") return [0,1,0,1,2];  // Push×2, Pull×2, Legs×1
    return [0,1,2,0,1];
  }
  if (n===6) return [0,1,2,0,1,2];
  return Array(n).fill(null).map((_,i)=>i%3);
}
function autoGen(split,n,lib,priority,muscles,experience,availDays,repRange){
  const tmpl=AUTO_SPLITS[split];
  if (!tmpl) return [];
  const tc=tmpl.length;
  let seq;
  if (split==="Push/Pull/Legs"){
    seq=getPplSequence(n,priority);
  } else if (split==="Hybrid Split"){
    if(n===2) seq=[0,1];
    else if(n===3) seq=[0,1,2];
    else if(n===4) seq=[0,1,2,3];
    else seq=[0,1,2,3,0];
  } else if (split==="Bro Split"){
    if(n===3) seq=[0,1,4];
    else if(n===4) seq=[0,1,3,4];
    else if(n===5) seq=[0,1,2,3,4];
    else seq=[0,1,2,3,4,5];
  } else {
    seq=Array(n).fill(null).map((_,i)=>i%tc);
  }
  // Use distributeDays to space sessions across user's available days
  const days=distributeDays(n, availDays);

  // Count how many sessions per week each muscle group appears across all days
  const muscleFreq={};
  seq.forEach(ti=>{
    const t=tmpl[ti];
    const dayMuscles=new Set(t.exs.map(nm=>{const f=lib.find(e=>e.name===nm);return f?f.muscle:null;}).filter(Boolean));
    dayMuscles.forEach(m=>{muscleFreq[m]=(muscleFreq[m]||0)+1;});
  });

  const tmplCount={};
  const tmplSeen={};
  seq.forEach(ti=>{tmplCount[ti]=(tmplCount[ti]||0)+1;});

  return seq.map((ti,i)=>{
    const t=tmpl[ti];
    tmplSeen[ti]=(tmplSeen[ti]||0)+1;
    const alreadyLabeled=/ [A-C]$/.test(t.name);
    const needsSuffix=tmplCount[ti]>1&&!alreadyLabeled;
    const suffix=needsSuffix?(tmplSeen[ti]===1?" A":" B"):"";

    const isNovice=experience==="new"||experience==="returning";
    // Cap per exercise per session — scales with experience
    const expCap={new:3,returning:3,intermediate:4,advanced:5}[experience]||4;

    // Group exercises by muscle to apply tapered set distribution
    // IMPORTANT: build after novice filter so taper weights reflect actual exercises kept
    const muscleExOrderRaw={};
    t.exs.forEach(nm=>{
      const f=lib.find(e=>e.name===nm);
      if(!f) return;
      if(isNovice && f.type==="isolation") return; // exclude filtered exercises
      if(!muscleExOrderRaw[f.muscle]) muscleExOrderRaw[f.muscle]=[];
      muscleExOrderRaw[f.muscle].push(nm);
    });

    const getTaperWeights=(totalExs)=>{
      if(totalExs===1) return [1.0];
      if(totalExs===2) return [0.55,0.45];
      if(totalExs===3) return [0.50,0.32,0.18];
      return Array(totalExs).fill(null).map((_,i)=>Math.pow(0.6,i)).map((w,_,arr)=>w/arr.reduce((a,b)=>a+b,0));
    };

    const exercises=t.exs.map(nm=>{
      const found=lib.find(e=>e.name===nm);
      if (!found) return null;
      if(isNovice && found.type==="isolation") return null;
      const m=found.muscle;
      const lm=muscles&&muscles[m];
      let mevSets=3;

      if(lm){
        const freq=muscleFreq[m]||1;
        const exsForMuscle=muscleExOrderRaw[m]||[nm];
        const posInMuscle=exsForMuscle.indexOf(nm);
        const totalExs=exsForMuscle.length;
        const taperWeights=getTaperWeights(totalExs);
        const weight=taperWeights[Math.min(posInMuscle,taperWeights.length-1)]||taperWeights[taperWeights.length-1];

        // Sets per session = weekly MEV / frequency, distributed by taper weight
        const mevPerSession=lm.mev/freq;
        const rawSets=mevPerSession*weight;
        const minSets=found.type==="compound"?3:2;

        // Only apply expCap when multiple exercises share the muscle —
        // if there's only one exercise it must carry all the MEV sets for that session
        // Hard cap at MAX_SETS_PER_MUSCLE_PER_SESSION per RP guidance
        const uncapped=Math.max(minSets,Math.round(rawSets));
        const capped=totalExs===1?uncapped:Math.min(expCap,uncapped);
        mevSets=Math.min(MAX_SETS_PER_MUSCLE_PER_SESSION,capped);
      }

      const mrvSets=lm?(()=>{
        const freq=muscleFreq[m]||1;
        const exsForMuscle=muscleExOrderRaw[m]||[nm];
        const pos=exsForMuscle.indexOf(nm);
        const totalExs=exsForMuscle.length;
        const taperWeights=getTaperWeights(totalExs);
        const weight=taperWeights[Math.min(pos,taperWeights.length-1)]||taperWeights[taperWeights.length-1];
        const mavPerSession=lm.mav/freq;
        const minSets=found.type==="compound"?3:2;
        const uncapped=Math.max(mevSets+1,Math.round(mavPerSession*weight));
        const capped=totalExs===1?uncapped:Math.min(expCap+2,uncapped);
        return Math.min(MAX_SETS_PER_MUSCLE_PER_SESSION+2,capped);
      })():mevSets+2;

      const mvSets=lm?(()=>{
        const freq=muscleFreq[m]||1;
        const exsForMuscle=muscleExOrderRaw[m]||[nm];
        const pos=exsForMuscle.indexOf(nm);
        const totalExs=exsForMuscle.length;
        const taperWeights=getTaperWeights(totalExs);
        const weight=taperWeights[Math.min(pos,taperWeights.length-1)]||taperWeights[taperWeights.length-1];
        return Math.max(1,Math.round((lm.mv/freq)*weight));
      })():Math.max(1,Math.ceil(mevSets/2));

      const rrScale=getRRScale(repRange);
      const isCompound=found.type==="compound";
      const repOverride=isCompound
        ?{minReps:rrScale.compoundMin, maxReps:rrScale.compoundMax}
        :{minReps:rrScale.isoMin, maxReps:rrScale.isoMax};
      const sets=Array(mevSets).fill(null).map(()=>newSet("","normal"));
      return {...found,...repOverride,id:uid("ex"),lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",mevSets,mrvSets,mvSets,sets};
    }).filter(Boolean);

    // ── Post-build weekly volume cap ────────────────────────────────────────
    // The minimum-set floor can cause weekly totals to exceed MAV when a muscle
    // appears 2+ times per day at high frequency. Trim proportionally if needed.
    const perMuscleSets={};
    exercises.forEach(ex=>{
      perMuscleSets[ex.muscle]=(perMuscleSets[ex.muscle]||0)+ex.mevSets;
    });
    Object.entries(perMuscleSets).forEach(([m,dayTotal])=>{
      const lm=muscles&&muscles[m];
      if(!lm||!lm.mav) return;
      const freq=muscleFreq[m]||1;
      const weeklyProjected=dayTotal*freq;
      if(weeklyProjected<=lm.mav) return;
      // Scale down sets for this muscle proportionally, minimum 1 set per exercise
      const scale=lm.mav/(weeklyProjected);
      let remaining=Math.round(lm.mav/freq); // target per-day total
      const exsForMuscle=exercises.filter(e=>e.muscle===m);
      exsForMuscle.forEach((ex,i)=>{
        const isLast=i===exsForMuscle.length-1;
        const trimmed=isLast?Math.max(1,remaining):Math.max(1,Math.round(ex.mevSets*scale));
        remaining-=trimmed;
        ex.mevSets=trimmed;
        ex.sets=Array(trimmed).fill(null).map(()=>newSet("","normal"));
        // Keep mrvSets >= mevSets+1
        ex.mrvSets=Math.max(ex.mevSets+1,ex.mrvSets);
      });
    });
    // ────────────────────────────────────────────────────────────────────────

    return {id:uid("d"),day:days[i]||"Monday",name:t.name+suffix,exercises};
  });
}

// Rep range cycle per RP: Hypertrophy → Strength-Hyp → Power-Hyp → Hypertrophy
const REP_RANGE_CYCLE=["hypertrophy","strength-hyp","power-hyp"];
const REP_RANGE_LABELS={"hypertrophy":"Hypertrophy","strength-hyp":"Strength-Hyp","power-hyp":"Power-Hyp"};
const REP_RANGE_SUBS={"hypertrophy":"8–20 reps","strength-hyp":"4–12 reps","power-hyp":"3–8 reps"};
const RR_SCALE={
  "hypertrophy":   {compoundMin:6, compoundMax:15,isoMin:10,isoMax:20},
  "strength-hyp":  {compoundMin:4, compoundMax:10,isoMin:8, isoMax:15},
  "power-hyp":     {compoundMin:3, compoundMax:6, isoMin:6, isoMax:10},
};
const getRRScale=repRange=>RR_SCALE[repRange||"hypertrophy"]||RR_SCALE["hypertrophy"];
const nextRepRange=current=>{
  const idx=REP_RANGE_CYCLE.indexOf(current||"hypertrophy");
  return REP_RANGE_CYCLE[(idx+1)%REP_RANGE_CYCLE.length];
};
// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIZATION SCHEDULING HELPER
// Per RP: target muscle needs ≥48h (2 days) between sessions. We exhaustively
// check all C(5,3)=10 triples from the user's 5 days, find the one with the
// largest minimum gap, then assign Heavy/Moderate/Pump by preceding gap length
// (longest preceding rest → heaviest session).
//
// Mathematical property: every possible selection of exactly 5 days from a
// 7-day week is guaranteed to contain at least one valid triple (minGap ≥ 2).
// Proof: each of the 7 valid triples appears in exactly 3 of the 21 possible
// 5-day sets, and no 2 days can "cover" (appear in) all 7 valid triples —
// so any 5-day selection must contain at least one valid triple.
// This means findBestTargetDays never returns null when given exactly 5 days.
// ─────────────────────────────────────────────────────────────────────────────

function findBestTargetDays(availDays) {
  // availDays: array of exactly 5 weekday name strings
  const indices = availDays.map(d=>WEEK_DAYS.indexOf(d)).sort((a,b)=>a-b);
  let best = null;
  for(let i=0;i<3;i++) for(let j=i+1;j<4;j++) for(let k=j+1;k<5;k++){
    const t=[indices[i],indices[j],indices[k]];
    const g1=t[1]-t[0];          // gap A→B
    const g2=t[2]-t[1];          // gap B→C
    const g3=7-t[2]+t[0];        // gap C→A (wrap)
    const minGap=Math.min(g1,g2,g3);
    if(minGap<2) continue;
    if(!best||minGap>best.minGap||(minGap===best.minGap&&Math.min(g1,g2,g3)>Math.min(...best.gaps))){
      best={triple:t,gaps:[g1,g2,g3],minGap};
    }
  }
  if(!best) return null;
  // Preceding gap for each day: A←C (gaps[2]), B←A (gaps[0]), C←B (gaps[1])
  const assignments=best.triple.map((idx,i)=>({idx,preceding:[best.gaps[2],best.gaps[0],best.gaps[1]][i]}));
  assignments.sort((a,b)=>b.preceding-a.preceding||a.idx-b.idx);
  const heavyDay=WEEK_DAYS[assignments[0].idx];
  const moderateDay=WEEK_DAYS[assignments[1].idx];
  const pumpDay=WEEK_DAYS[assignments[2].idx];
  const targetIdxSet=new Set(best.triple);
  const maintDays=indices.filter(i=>!targetIdxSet.has(i)).map(i=>WEEK_DAYS[i]);
  return {heavyDay,moderateDay,pumpDay,maintADay:maintDays[0],maintBDay:maintDays[1],minGap:best.minGap,gaps:best.gaps};
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIZATION PHASE ENGINE
// Based on RP Hypertrophy methodology: target muscle → MRV volume, all other
// muscles hard-capped at MV to free systemic recovery capacity.
// ─────────────────────────────────────────────────────────────────────────────

// Exercises for each muscle × rep focus
// Heavy = barbell compounds (4-8 reps) — neurological stimulus, strength foundation
// Moderate = DB/machine compounds (8-15 reps) — primary hypertrophy driver
// Pump = isolation movements (15-30 reps) — occlusion, stretch-mediated growth
const SPEC_EX_MAP = {
  Chest:{
    heavy:    ["Flat Barbell Bench","Incline Barbell Press","Close Grip Bench Press"],
    moderate: ["Incline Dumbbell Press","Machine Press","Dumbbell Bench Press","Decline Dumbbell Press"],
    pump:     ["Cable Fly","Pec Deck","Machine Fly","Dumbbell Fly"],
  },
  Back:{
    heavy:    ["Barbell Row","T-Bar Row","Rack Pull"],
    moderate: ["Lat Pulldown","Chest Supported Row","Dumbbell Row","Seated Cable Row"],
    pump:     ["Straight Arm Pulldown","Cable Pullover"],
  },
  Shoulders:{
    heavy:    ["Standing Barbell Press","Upright Row"],
    moderate: ["Dumbbell Shoulder Press","Arnold Press"],
    pump:     ["Cable Lateral Raise","Dumbbell Lateral Raise","Face Pull","Rear Delt Fly","Reverse Pec Deck"],
  },
  Biceps:{
    heavy:    ["Barbell Curl","EZ Bar Curl","Preacher Curl"],
    moderate: ["Cable Curl","Machine Curl","Hammer Curl"],
    pump:     ["Incline Dumbbell Curl","Spider Curl","Concentration Curl"],
  },
  Triceps:{
    heavy:    ["Skull Crusher","JM Press","Close Grip Bench Press"],
    moderate: ["Tricep Pushdown","Tri Machine","Tate Press"],
    pump:     ["Overhead Tricep Extension","Cable Overhead Extension"],
  },
  Quads:{
    heavy:    ["Back Squat","Hack Squat","Front Squat"],
    moderate: ["Leg Press","Bulgarian Split Squat","Goblet Squat"],
    pump:     ["Leg Extension","Walking Lunge","Sissy Squat"],
  },
  Hamstrings:{
    heavy:    ["Romanian Deadlift","Stiff Leg Deadlift"],
    moderate: ["Lying Leg Curl","Seated Leg Curl","Leg Curl"],
    pump:     ["Nordic Curl","Single Leg Romanian Deadlift"],
  },
  Glutes:{
    heavy:    ["Barbell Hip Thrust","Sumo Deadlift"],
    moderate: ["Hip Thrust","Glute Bridge","Single Leg Hip Thrust"],
    pump:     ["Cable Kickback","Abductor Machine","Cable Pull Through"],
  },
  Calves:{
    heavy:    ["Calf Raise"],
    moderate: ["Leg Press Calf Raise","Seated Calf Raise"],
    pump:     ["Single Leg Calf Raise","Tibialis Raise"],
  },
};

// Rep range per focus (min/max reps)
const SPEC_REP_RANGES = {
  heavy:    {minReps:4, maxReps:8},
  moderate: {minReps:8, maxReps:15},
  pump:     {minReps:15,maxReps:30},
};

// Target muscle → training group (determines day structure)
const SPEC_TARGET_GROUP = {
  Chest:"push", Shoulders:"push", Triceps:"push",
  Back:"pull",  Biceps:"pull",
  Quads:"legs", Hamstrings:"legs", Glutes:"legs", Calves:"legs",
};

// Which non-target muscles appear alongside target exercises on each focus day
// These receive 1-2 MV maintenance sets per session
const SPEC_COMPANIONS = {
  push:{
    heavy:    ["Back","Biceps"],
    moderate: ["Back","Biceps"],
    pump:     ["Triceps","Shoulders"],
  },
  pull:{
    heavy:    ["Chest","Triceps"],
    moderate: ["Chest","Triceps"],
    pump:     ["Biceps","Shoulders"],
  },
  legs:{
    heavy:    ["Core"],
    moderate: ["Core"],
    pump:     ["Calves","Core"],
  },
};

// How remaining non-target muscles are split across the two maintenance days
const SPEC_MAINT_SPLIT = {
  push:[
    ["Quads","Hamstrings","Glutes","Calves"],      // Maint A: full legs
    ["Back","Biceps","Triceps","Shoulders"],        // Maint B: remaining upper
  ],
  pull:[
    ["Quads","Hamstrings","Glutes","Calves"],      // Maint A: full legs
    ["Chest","Triceps","Shoulders","Biceps"],       // Maint B: remaining upper
  ],
  legs:[
    ["Chest","Back","Shoulders","Triceps","Biceps"],// Maint A: full upper
    ["Calves"],                                     // Maint B: remaining legs
  ],
};

// Core algorithm: generate a 5-day specialization program
// Target muscle gets 3 sessions/week (heavy/moderate/pump) ramping MEV→MRV
// All other muscles are hard-capped at MV (maintenance) per RP specialization rules
function genSpecializationProgram(targetMuscle, lib, muscles, experience, availDays) {
  const lm = muscles[targetMuscle];
  if (!lm) return null;

  const group = SPEC_TARGET_GROUP[targetMuscle] || "push";
  const specExs = SPEC_EX_MAP[targetMuscle] || {heavy:[],moderate:[],pump:[]};

  // Per-session MEV/MRV for target muscle across 3 sessions per week
  // Heavy day: 40% of weekly volume (barbell compounds are most effective per set)
  // Moderate day: 35%
  // Pump day: 25%
  const sessionWeights = {heavy:0.40, moderate:0.35, pump:0.25};
  const perSessTarget = focus => ({
    mev: Math.max(2, Math.round(lm.mev * sessionWeights[focus])),
    mrv: Math.max(3, Math.round(lm.mrv * sessionWeights[focus])),
    mv:  Math.max(1, Math.round((lm.mv||2) * sessionWeights[focus])),
  });

  // Build exercises for a target focus day
  const buildTargetExs = focus => {
    const names = (specExs[focus]||[]).filter(n => lib.find(e=>e.name===n));
    const n = Math.min(names.length, focus==="pump"?3:2);
    const chosen = names.slice(0,n);
    const tw = n===1?[1.0]:n===2?[0.55,0.45]:[0.50,0.32,0.18];
    const {mev, mrv, mv} = perSessTarget(focus);
    const rr = SPEC_REP_RANGES[focus];
    return chosen.map((name,i)=>{
      const found = lib.find(e=>e.name===name);
      if(!found) return null;
      const w = tw[i];
      const exMev = Math.max(2, Math.round(mev*w));
      const exMrv = Math.max(exMev+1, Math.round(mrv*w));
      const exMv  = Math.max(1, Math.round(mv*w));
      return {
        ...found, ...rr,
        id:uid("ex"), lastScheme:"", lastWeight:"", lastRIR:null, lastReps:"", note:"",
        mevSets:exMev, mrvSets:exMrv, mvSets:exMv,
        sets:Array(exMev).fill(null).map(()=>newSet("","normal")),
        specRole:`target_${focus}`,
      };
    }).filter(Boolean);
  };

  // How many days each non-target muscle appears across all 5 days
  const companions = SPEC_COMPANIONS[group]||{heavy:[],moderate:[],pump:[]};
  const maintSplit = SPEC_MAINT_SPLIT[group]||[[],[]];
  const allNonTarget = Object.keys(muscles).filter(m=>m!==targetMuscle);
  const muscleFreq = {};
  allNonTarget.forEach(m=>{
    const inComp = ["heavy","moderate","pump"].filter(f=>(companions[f]||[]).includes(m)).length;
    const inMaint = maintSplit.filter(day=>day.includes(m)).length;
    muscleFreq[m] = Math.max(1, inComp + inMaint);
  });

  // Build maintenance exercises for a non-target muscle
  const buildMaintEx = (muscle, freq) => {
    const lmM = muscles[muscle];
    if(!lmM||lmM.mv===0) return []; // MV=0 muscles (Glutes) need no direct work
    const setsPerSess = Math.max(2, Math.min(3, Math.round(lmM.mv/freq)));
    // Prefer a compound; pick first available from lib
    const found = lib.find(e=>e.muscle===muscle&&e.type==="compound") || lib.find(e=>e.muscle===muscle);
    if(!found) return [];
    return [{
      ...found,
      minReps:8, maxReps:15,
      id:uid("ex"), lastScheme:"", lastWeight:"", lastRIR:null, lastReps:"", note:"",
      // Fixed sets throughout — no ramping for maintenance muscles
      mevSets:setsPerSess, mrvSets:setsPerSess, mvSets:setsPerSess,
      sets:Array(setsPerSess).fill(null).map(()=>newSet("","normal")),
      specRole:"maintenance",
    }];
  };

  // Use smart spacing algorithm — assigns Heavy/Moderate/Pump to days that
  // maximize recovery gaps per RP guidance (≥48h between target sessions).
  const assignment=findBestTargetDays(availDays);
  if(!assignment) return [];

  const sessionDayMap={
    [assignment.heavyDay]:   {name:`${targetMuscle} — Heavy`,   exs:[...buildTargetExs("heavy"),  ...(companions.heavy  ||[]).flatMap(m=>buildMaintEx(m,muscleFreq[m]||1))]},
    [assignment.moderateDay]:{name:`${targetMuscle} — Moderate`,exs:[...buildTargetExs("moderate"),...(companions.moderate||[]).flatMap(m=>buildMaintEx(m,muscleFreq[m]||1))]},
    [assignment.maintADay]:  {name:"Maintenance A",             exs:maintSplit[0].flatMap(m=>buildMaintEx(m,muscleFreq[m]||1))},
    [assignment.pumpDay]:    {name:`${targetMuscle} — Pump`,    exs:[...buildTargetExs("pump"),   ...(companions.pump   ||[]).flatMap(m=>buildMaintEx(m,muscleFreq[m]||1))]},
    [assignment.maintBDay]:  {name:"Maintenance B",             exs:(maintSplit[1]||[]).flatMap(m=>buildMaintEx(m,muscleFreq[m]||1))},
  };

  // Return sorted by weekday order so the program displays Mon → Sun
  return availDays
    .slice().sort((a,b)=>WEEK_DAYS.indexOf(a)-WEEK_DAYS.indexOf(b))
    .map(day=>{
      const dc=sessionDayMap[day];
      if(!dc) return null;
      return {id:uid("d"),day,name:dc.name,exercises:dc.exs.filter(e=>e&&e.sets&&e.sets.length>0)};
    }).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────

const Tag=({label,color})=>{const C=useContext(ThemeCtx);return(<span style={{fontSize:9,background:color+"1a",color,borderRadius:3,padding:"2px 6px",letterSpacing:"0.12em",fontWeight:700,textTransform:"uppercase",maxWidth:"calc(100vw - 40px)",textAlign:"center"}}>{label}</span>);};
const SLbl=({children,style})=>{const C=useContext(ThemeCtx);return(<div style={{fontSize:9,color:C.muted2,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:800,marginBottom:10,...(style||{})}}>{children}</div>);};
// Section — the core layout primitive. Replaces Card. Tonal depth + optional left accent.
const Section=({children,style,accent,marginBottom})=>{
  const C=useContext(ThemeCtx);
  return(
    <div style={{background:C.card,marginBottom:marginBottom!==undefined?marginBottom:8,borderLeft:accent?"3px solid "+accent:"3px solid transparent",...(style||{})}}>
      <div style={{padding:"16px 15px"}}>{children}</div>
    </div>
  );
};
// Keep Card as alias for backward compat — maps to Section
const Card=({children,style,hi})=>{
  const C=useContext(ThemeCtx);
  return(<Section accent={hi?hi:undefined} style={style} marginBottom={8}>{children}</Section>);
};

function IcoFlame({sz,col}){return(<svg width={sz||16} height={sz||16} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-5 4-5 9a5 5 0 0010 0c0-2-1-4-2-5 0 2-1 3-3 4 1-3 0-6 0-8z"/></svg>);}
function IcoTrophy({sz,col}){return(<svg width={sz||16} height={sz||16} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4H4v3a3 3 0 003 3m10-6h3v3a3 3 0 01-3 3M7 10a5 5 0 005 5 5 5 0 005-5V4H7v6z"/></svg>);}
function IcoWarn({sz,col}){return(<svg width={sz||14} height={sz||14} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);}
function IcoCheck({sz,col}){return(<svg width={sz||14} height={sz||14} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);}
function IcoX({sz,col}){return(<svg width={sz||14} height={sz||14} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);}
function IcoDrag({sz,col}){return(<svg width={sz||16} height={sz||16} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2" strokeLinecap="round"><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="17" x2="16" y2="17"/></svg>);}
function IcoUndo({sz,col}){return(<svg width={sz||14} height={sz||14} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h10a5 5 0 010 10H9"/><polyline points="3 10 7 6 3 10 7 14"/></svg>);}
function IcoStar({sz,col,filled}){return(<svg width={sz||16} height={sz||16} viewBox="0 0 24 24" fill={filled?(col||"currentColor"):"none"} stroke={col||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>);}
function IcoUp({sz,col}){return(<svg width={sz||14} height={sz||14} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>);}
function IcoPlus({sz,col}){return(<svg width={sz||12} height={sz||12} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);}
function IcoHome({active}){return(<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>);}
function IcoProgress({active}){return(<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>);}
function IcoPlan({active}){return(<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h2m-2 4h2m4-4h2m-2 4h2"/></svg>);}
function IcoLib({active}){return(<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V6a2 2 0 012-2h12a2 2 0 012 2v13"/><path d="M4 19a2 2 0 002 2h12a2 2 0 002-2"/><path d="M9 10h6M9 14h4"/></svg>);}
function IcoInfo(){return(<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>);}
function IcoSun({sz,col}){return(<svg width={sz||16} height={sz||16} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>);}
function IcoDown({sz,col}){return(<svg width={sz||14} height={sz||14} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>);}
function IcoMoon({sz,col}){return(<svg width={sz||16} height={sz||16} viewBox="0 0 24 24" fill="none" stroke={col||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>);}

// ── Specialization Phase Builder ─────────────────────────────────────────────
function SpecBuilder({library,muscles,experience,onLaunch,onBack,onCancel,existingMeso}){
  const C=useContext(ThemeCtx);
  const [target,setTarget]=useState(null);
  const [days,setDays]=useState([]);
  const [step,setStep]=useState(0);  // 0=pick muscle, 1=pick days, 2=preview

  const availMuscles=Object.keys(SPEC_EX_MAP).filter(m=>muscles[m]);

  // Cap at 5, prevent selecting more
  const toggleDay=d=>setDays(p=>{
    if(p.includes(d)) return p.filter(x=>x!==d);
    if(p.length>=5) return p;
    return [...p,d];
  });

  // Real-time validation — any selection of exactly 5 days is always schedulable
  // (provably true: every C(7,5) combination contains a valid target triple)
  const validation=useMemo(()=>{
    if(days.length<5) return {status:"need_more",remaining:5-days.length};
    const result=findBestTargetDays(days);
    return {status:"valid",...result};
  },[days]);

  const canPreview=validation.status==="valid";

  const preview=useMemo(()=>
    canPreview&&target?genSpecializationProgram(target,library,muscles,experience,days):null
  ,[canPreview,target,days,library,muscles,experience]);

  const doLaunch=()=>{
    if(!preview) return;
    onLaunch(
      {
        label:`${target} Specialization`,
        week:1,totalWeeks:5,repRange:"hypertrophy",
        deloadStyle:null,
        mode:"specialization",
        spec:{targetMuscle:target,heavyDay:`${target} — Heavy`,moderateDay:`${target} — Moderate`,pumpDay:`${target} — Pump`},
      },
      preview
    );
  };

  const SHORT_DAY={"Monday":"Mon","Tuesday":"Tue","Wednesday":"Wed","Thursday":"Thu","Friday":"Fri","Saturday":"Sat","Sunday":"Sun"};

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border+"60",padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.15em",textTransform:"uppercase",color:C.text}}>Specialization Phase</div>
          {existingMeso?<button onClick={onCancel} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"5px 10px",color:C.muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>Cancel</button>:null}
        </div>
        <div style={{display:"flex",gap:4}}>
          {["Target Muscle","Training Days","Preview"].map((s,i)=>(
            <div key={s} style={{flex:1,height:2,background:i<=step?C.blue:C.border}}/>
          ))}
        </div>
        <div style={{fontSize:9,color:C.blue,marginTop:6,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700}}>{["Target Muscle","Training Days","Preview"][step]}</div>
      </div>

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{padding:"16px 14px 24px"}}>

          {/* Step 0: pick target muscle */}
          {step===0&&(
            <div>
              <button onClick={onBack} style={{background:"none",border:"none",color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:20,padding:0,letterSpacing:"0.05em"}}>← Back</button>
              <div style={{background:C.blue+"12",borderLeft:"3px solid "+C.blue,padding:"12px 14px",marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:800,color:C.blue,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>How specialization works</div>
                <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>
                  Your target muscle trains 3× per week — Heavy (4–8 reps), Moderate (8–15 reps), and Pump (15–30 reps) — ramping from MEV to MRV over 5 weeks. All other muscles are capped at maintenance volume to free systemic recovery capacity.
                </div>
              </div>
              <SLbl>Choose your target muscle</SLbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {availMuscles.map(m=>{
                  const mc=MC[m]||"#888";
                  const sel=target===m;
                  const lm=muscles[m];
                  return(
                    <button key={m} onClick={()=>setTarget(m)} style={{background:sel?mc+"18":C.card,border:"none",borderLeft:"3px solid "+(sel?mc:C.border2),padding:"12px",textAlign:"left",cursor:"pointer",transition:"all .12s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:mc,flexShrink:0}}/>
                        <span style={{fontSize:12,fontWeight:800,color:sel?mc:C.text,textTransform:"uppercase",letterSpacing:"0.04em"}}>{m}</span>
                      </div>
                      <div style={{fontSize:10,color:C.muted}}>MEV {lm.mev} → MRV {lm.mrv} sets/wk</div>
                    </button>
                  );
                })}
              </div>
              <button onClick={()=>setStep(1)} disabled={!target} style={{width:"100%",marginTop:20,padding:"14px",background:target?C.blue:C.card2,color:target?"#fff":C.muted,border:"none",borderRadius:4,fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,letterSpacing:"0.12em",cursor:target?"pointer":"default",transition:"all .2s",textTransform:"uppercase"}}>Next</button>
            </div>
          )}

          {/* Step 1: pick training days */}
          {step===1&&(
            <div>
              <button onClick={()=>setStep(0)} style={{background:"none",border:"none",color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:20,padding:0,letterSpacing:"0.05em"}}>← Back</button>
              <div style={{fontSize:13,fontWeight:800,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>{target} Specialization</div>
              <div style={{fontSize:11,color:C.muted2,marginBottom:20,lineHeight:1.6}}>Select exactly 5 training days. The app schedules Heavy, Moderate, and Pump sessions with at least 2 rest days between each, per RP methodology.</div>
              <SLbl>Training days</SLbl>
              <div style={{display:"flex",gap:4,marginBottom:16}}>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((short,i)=>{
                  const full=WEEK_DAYS[i];
                  const sel=days.includes(full);
                  const disabled=!sel&&days.length>=5;
                  return(
                    <button key={full} onClick={()=>!disabled&&toggleDay(full)} style={{flex:1,height:52,borderRadius:0,border:"none",background:sel?C.blue:disabled?C.surf:C.card2,color:sel?"#fff":disabled?C.muted:C.muted2,fontSize:9,fontWeight:800,cursor:disabled?"default":"pointer",transition:"all .12s",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,letterSpacing:"0.05em",opacity:disabled?0.4:1}}>
                      {short}
                      {sel?<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:null}
                    </button>
                  );
                })}
              </div>

              {/* Real-time validation feedback */}
              {validation.status==="need_more"&&(
                <div style={{fontSize:11,color:C.muted2,marginBottom:16,padding:"10px 12px",background:C.card2,borderLeft:"3px solid "+C.border2}}>
                  Select {validation.remaining} more day{validation.remaining!==1?"s":""} — specialization needs 3 target sessions + 2 maintenance days.
                </div>
              )}

              {validation.status==="valid"&&(
                <div style={{padding:"10px 12px",background:C.green+"12",borderLeft:"3px solid "+C.green,marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:800,color:C.green,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>Schedule confirmed</div>
                  <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>
                    {target} sessions: <strong style={{color:C.text}}>{SHORT_DAY[validation.heavyDay]} (Heavy) · {SHORT_DAY[validation.moderateDay]} (Moderate) · {SHORT_DAY[validation.pumpDay]} (Pump)</strong>
                    <br/>Minimum {validation.minGap} rest day{validation.minGap!==1?"s":""} between sessions ✓
                  </div>
                </div>
              )}

              <button onClick={()=>setStep(2)} disabled={!canPreview} style={{width:"100%",padding:"14px",background:canPreview?C.blue:C.card2,color:canPreview?"#fff":C.muted,border:"none",borderRadius:4,fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,letterSpacing:"0.12em",cursor:canPreview?"pointer":"default",transition:"all .2s",textTransform:"uppercase"}}>Preview Program</button>
            </div>
          )}

          {/* Step 2: preview */}
          {step===2&&preview&&(
            <div>
              <button onClick={()=>setStep(1)} style={{background:"none",border:"none",color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:20,padding:0,letterSpacing:"0.05em"}}>← Back</button>
              <div style={{fontSize:24,fontWeight:900,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>{target} Specialization</div>
              <div style={{fontSize:11,color:C.muted2,marginBottom:16,lineHeight:1.6}}>5 weeks · 3 target sessions/week · all other muscles at maintenance volume</div>

              {/* Schedule summary */}
              <div style={{background:C.card2,borderLeft:"3px solid "+C.blue,padding:"12px 14px",marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:800,color:C.blue,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Session Schedule</div>
                {[
                  {day:validation.heavyDay,label:"Heavy",sub:"4–8 reps · neurological focus",color:C.red},
                  {day:validation.moderateDay,label:"Moderate",sub:"8–15 reps · hypertrophy focus",color:C.accent},
                  {day:validation.pumpDay,label:"Pump",sub:"15–30 reps · stretch-mediated",color:C.blue},
                ].map(s=>(
                  <div key={s.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <div style={{width:3,alignSelf:"stretch",background:s.color,flexShrink:0}}/>
                    <div style={{minWidth:36,fontSize:10,fontWeight:800,color:C.muted2,letterSpacing:"0.05em"}}>{SHORT_DAY[s.day]}</div>
                    <div>
                      <span style={{fontSize:11,fontWeight:800,color:s.color,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.label}</span>
                      <span style={{fontSize:10,color:C.muted,marginLeft:8}}>{s.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Volume ramp */}
              <Card hi={C.blue+"33"}>
                <SLbl>Weekly {target} volume (sets)</SLbl>
                <div style={{display:"flex",gap:4,alignItems:"flex-end",height:48,marginBottom:8}}>
                  {[1,2,3,4,5].map(w=>{
                    const lm=muscles[target];
                    const isDeload=w===5;
                    const total=isDeload?Math.max(1,lm.mv||2):Math.round(lm.mev+(w-1)/3*(lm.mrv-lm.mev));
                    const pct=total/lm.mrv;
                    return(
                      <div key={w} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <div style={{fontSize:9,color:isDeload?C.muted:C.text,fontWeight:700}}>{total}</div>
                        <div style={{width:"100%",height:Math.round(pct*36),background:isDeload?C.muted:C.blue,transition:"height .3s"}}/>
                        <div style={{fontSize:9,color:C.muted}}>{isDeload?"DL":"W"+w}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:10,color:C.muted2,lineHeight:1.5}}>RIR 3→2→1→0→deload. Volume ramps aggressively toward MRV in Week 4.</div>
              </Card>

              {/* Day-by-day preview */}
              <SLbl>5-Day Program</SLbl>
              {preview.map((day)=>{
                const isTarget=day.name.includes("—");
                const focus=day.name.includes("Heavy")?"heavy":day.name.includes("Moderate")?"moderate":day.name.includes("Pump")?"pump":null;
                const focusColor=focus==="heavy"?C.red:focus==="moderate"?C.accent:focus==="pump"?C.blue:C.muted;
                return(
                  <div key={day.id} style={{background:C.card,borderLeft:"3px solid "+(isTarget?focusColor:C.border2),marginBottom:5,padding:"12px 13px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2,letterSpacing:"0.06em"}}>{day.day}</div>
                        <div style={{fontSize:12,fontWeight:800,color:isTarget?focusColor:C.text,textTransform:"uppercase",letterSpacing:"0.04em"}}>{day.name}</div>
                      </div>
                      {focus&&<Tag label={focus==="heavy"?"4–8 reps":focus==="moderate"?"8–15 reps":"15–30 reps"} color={focusColor}/>}
                      {!focus&&<Tag label="Maintenance" color={C.muted}/>}
                    </div>
                    {day.exercises.map(ex=>(
                      <div key={ex.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,paddingLeft:4}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:ex.specRole==="maintenance"?C.muted:focusColor||C.accent,flexShrink:0}}/>
                        <span style={{fontSize:11,color:ex.specRole==="maintenance"?C.muted:C.text}}>{ex.name}</span>
                        <span style={{fontSize:10,color:C.muted,marginLeft:"auto"}}>{ex.mevSets} sets</span>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div style={{background:C.card2,borderLeft:"3px solid "+C.border2,padding:"12px 14px",marginBottom:16,marginTop:8}}>
                <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>
                  <strong style={{color:C.text}}>Why is maintenance volume so low?</strong> Systemic recovery is finite. Capping non-target muscles at MV lets your body pour all recovery capacity into growing {target}. The trade-off is intentional and temporary.
                </div>
              </div>

              <button onClick={doLaunch} style={{width:"100%",padding:"15px",background:C.blue,color:"#fff",border:"none",borderRadius:4,fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,letterSpacing:"0.12em",cursor:"pointer",textTransform:"uppercase"}}>Launch Specialization</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function GlossaryModal({onClose}){
  const C=useContext(ThemeCtx);
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"#000a"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:"16px 16px 0 0",padding:"0 0 32px",width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{position:"sticky",top:0,background:C.surf,padding:"16px 16px 12px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:"0.13em",textTransform:"uppercase",marginBottom:2}}>Reference</div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:22,fontWeight:900,letterSpacing:"-0.02em"}}>RP GLOSSARY</div>
          </div>
          <button onClick={onClose} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:8,padding:"6px 12px",color:C.muted2,fontSize:12,cursor:"pointer"}}>CLOSE</button>
        </div>
        <div style={{padding:"14px 16px"}}>
          {GLOSSARY.map((g,i)=>(
            <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:i<GLOSSARY.length-1?"1px solid "+C.accent+"33":"none"}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:5}}>
                <span style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,color:C.text}}>{g.term}</span>
                <span style={{fontSize:11,color:C.muted2,fontStyle:"italic"}}>{g.full}</span>
              </div>
              <div style={{fontSize:13,color:C.muted2,lineHeight:1.6}}>{g.def}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgBanner({ex,wk,totalWeeks,isDeload,deloadStyle}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const exp=P.experience||"intermediate";
  if(isDeload){
    const msg=deloadStyle==="intensity"
      ?"Intensity deload — same sets as last week, ~50% weight, RIR 4. Physical relief, not just volume reduction."
      :"Volume deload — same weight as last session, sets cut to minimum. Easy effort, RIR 4.";
    return(
      <div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.blue+"12",border:"1px solid "+C.blue+"33",borderRadius:8,padding:"8px 11px",marginBottom:11}}>
        <IcoInfo/>
        <div style={{fontSize:12,color:C.muted2,lineHeight:1.45}}>{msg}</div>
      </div>
    );
  }
  // Maintenance exercise in a specialization phase — don't encourage progression
  if(ex.specRole==="maintenance"){
    return(
      <div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.border2+"88",border:"1px solid "+C.border2,borderRadius:8,padding:"8px 11px",marginBottom:11}}>
        <IcoInfo/>
        <div style={{fontSize:12,color:C.muted2,lineHeight:1.45}}>Maintenance set — hold last weight. Recovery is being prioritised for your target muscle.</div>
      </div>
    );
  }
  if (!ex.lastWeight) return null;
  const p=rpProg(ex.name,ex.lastWeight,ex.lastRIR,ex.lastReps,defaultRIR(wk,totalWeeks,exp),false,C,exp);
  if (!p) return null;
  const lbls={
    add_weight:"Suggested: "+p.ws+" lbs",
    add_reps:"Hold "+p.ws+" lbs - "+(p.note||""),
    hold:"Hold "+p.ws+" lbs - "+(p.note||""),
    reduce:"Suggested: "+p.ws+" lbs (reduce)",
    baseline:"Week 1 baseline — log your RIR to enable progression",
    add_load:p.note||"Add external load to continue progressing",
  };
  return(
    <div style={{display:"flex",alignItems:"flex-start",gap:8,background:p.color+"12",border:"1px solid "+p.color+"33",borderRadius:8,padding:"8px 11px",marginBottom:11}}>
      <IcoUp sz={13} col={p.color}/>
      <div>
        <div style={{fontSize:12,color:C.text,fontWeight:600,marginBottom:2}}>{lbls[p.action]||""}</div>
        <div style={{fontSize:11,color:C.muted2,lineHeight:1.45}}>{p.reason}</div>
      </div>
    </div>
  );
}

function ExPicker({library,onAdd,onClose,title,excludeNames,defaultMuscle}){
  const C=useContext(ThemeCtx);
  const [q,setQ]=useState("");
  const [filt,setFilt]=useState(defaultMuscle||"All");
  const muscles=["All",...Object.keys(MC)];
  const list=library.filter(e=>e.name.toLowerCase().includes(q.toLowerCase())&&(filt==="All"||e.muscle===filt)&&!(excludeNames&&excludeNames.includes(e.name)));
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,background:"#000b"}} onClick={onClose}/>
      <div style={{position:"relative",background:C.surf,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,height:"85vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"12px 14px 8px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:13,fontWeight:700}}>{title||"Add Exercise"}</div>
            <button onClick={onClose} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:8,padding:"5px 12px",color:C.muted2,fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
          <div style={{position:"relative",marginBottom:7}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search exercises..." style={{width:"100%",background:C.card2,border:"none",borderBottom:"1px solid "+C.border2,padding:"8px 12px 8px 32px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,display:"flex",pointerEvents:"none"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
          </div>
          <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none"}}>
            {muscles.map(m=>(
              <button key={m} onClick={()=>setFilt(m)} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+(filt===m?(MC[m]||C.accent):C.border),background:filt===m?(MC[m]||C.accent)+"20":"none",color:filt===m?(MC[m]||C.accent):C.muted,fontSize:11,cursor:"pointer",maxWidth:"calc(100vw - 40px)",textAlign:"center",flexShrink:0}}>{m}</button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"6px 14px 16px"}}>
          {list.map(ex=>(
            <div key={ex.name} onClick={()=>{onAdd(ex);onClose();}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid "+C.border,cursor:"pointer"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:MC[ex.muscle]||"#888",flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{ex.name}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:1}}>{ex.muscle} · {ex.type}</div>
              </div>
              <IcoPlus sz={14} col={C.accent}/>
            </div>
          ))}
          {list.length===0?<div style={{padding:"20px 0",textAlign:"center",color:C.muted,fontSize:12}}>No exercises found</div>:null}
        </div>
      </div>
    </div>
  );
}

function SessionSummary({workout,exs,ratings,setRatings,don,totalVol,elapsed,sessionNote,setSessionNote,onComplete}){
  const C=useContext(ThemeCtx);
  const lifts=exs.filter(e=>e.muscle!=="Cardio");
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border+"60",padding:"13px 16px",paddingTop:"calc(13px + env(safe-area-inset-top))",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,letterSpacing:"0.2em",color:C.accent}}>HYPER</div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.08em",textTransform:"uppercase"}}>Session Summary</div>
          <div style={{fontSize:10,color:C.muted,letterSpacing:"0.04em"}}>{workout.day} — {workout.name}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px 24px"}}>
        <div style={{fontSize:28,fontWeight:900,marginBottom:16,display:"flex",alignItems:"center",gap:10,letterSpacing:"0.04em",textTransform:"uppercase"}}>
          {(()=>{const tot=exs.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0);return don===0?"Session Logged":don<tot?"Session Done":"Great Work";})()}{don===exs.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0)&&don>0?<span style={{display:"flex",alignItems:"center"}}><IcoFlame sz={26} col={C.accent}/></span>:null}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:16}}>
          {(()=>{
            const tot=exs.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0);
            const allDone=don===tot&&don>0;
            const exsDone=exs.filter(e=>e.sets.some(s=>s.done&&!s.incomplete)).length;
            return[
              <div key="ex" style={{background:C.card2,padding:"14px 8px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:exsDone===exs.length?C.green:C.text}}>{exsDone}/{exs.length}</div>
                <div style={{fontSize:9,color:exsDone===exs.length?C.green:C.muted,letterSpacing:"0.1em",marginTop:4,textTransform:"uppercase",fontWeight:700}}>Exercises</div>
              </div>,
              <div key="sets" style={{background:C.card2,padding:"14px 8px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:allDone?C.green:C.text}}>{don}/{tot}</div>
                <div style={{fontSize:9,color:allDone?C.green:C.muted,letterSpacing:"0.1em",marginTop:4,textTransform:"uppercase",fontWeight:700}}>Sets</div>
              </div>,
              <div key="time" style={{background:C.card2,padding:"14px 8px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900}}>{fmt(elapsed)}</div>
                <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginTop:4,textTransform:"uppercase",fontWeight:700}}>Time</div>
              </div>
            ];
          })()}
        </div>
        <div style={{marginBottom:16}}>
          <SLbl>Session Note</SLbl>
          <textarea value={sessionNote} onChange={e=>setSessionNote(e.target.value)} placeholder="Performance vs last week? Soreness, PRs, notes for next session..." rows={3} style={{width:"100%",background:C.card2,border:"none",borderBottom:"2px solid "+C.border2,padding:"10px 12px",color:C.text,fontSize:13,resize:"none",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/>
        </div>
        <SLbl>Rate Each Exercise (SFR)</SLbl>
        {lifts.map(ex=>{
          const mc=MC[ex.muscle]||"#888";
          const r=ratings[ex.id]||null;
          const scheme=buildScheme(ex.sets);
          const opts=[
            {id:"good",label:"Good stimulus",color:C.green,flag:false},
            {id:"flagged",label:"Joint pain or poor stimulus",color:C.red,flag:true},
          ];
          return(
            <div key={ex.id} style={{background:C.card,borderLeft:"3px solid "+(r==="flagged"?C.red:r==="good"?C.green:C.border),borderRadius:0,padding:"12px 13px",marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em"}}>{ex.name}</div>
                  {scheme?<div style={{fontSize:11,color:C.muted,marginTop:2}}>{scheme}</div>:null}
                </div>
                <Tag label={ex.muscle} color={mc}/>
              </div>
              <div style={{display:"flex",gap:5}}>
                {opts.map(opt=>(
                  <button key={opt.id} onClick={()=>setRatings(prev=>({...prev,[ex.id]:opt.id}))} style={{flex:1,padding:"9px 12px",background:r===opt.id?opt.color+"20":C.card2,border:"none",borderBottom:"2px solid "+(r===opt.id?opt.color:C.border2),cursor:"pointer",textAlign:"center",fontSize:11,fontWeight:r===opt.id?800:500,color:r===opt.id?opt.color:C.muted2,transition:"all .12s",letterSpacing:"0.04em"}}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {r&&opts.find(o=>o.id===r)?.flag?(
                <div style={{fontSize:11,color:C.muted2,marginTop:7,display:"flex",alignItems:"center",gap:5}}>
                  <IcoWarn sz={12} col={C.muted2}/> Flagged for review next meso
                </div>
              ):null}
            </div>
          );
        })}
        <button onClick={()=>onComplete(exs,ratings,sessionNote)} style={{width:"100%",marginTop:8,padding:"14px",background:C.accent,color:"#000",border:"none",borderRadius:6,fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,letterSpacing:"0.12em",cursor:"pointer",transition:"all .2s"}} onPointerDown={e=>e.currentTarget.style.pointerEvents="none"} onPointerUp={e=>{setTimeout(()=>e.currentTarget&&(e.currentTarget.style.pointerEvents=""),1500);}}>
          SAVE SESSION
        </button>
      </div>
    </div>
  );
}

function LoggerInner({workout,wk,totalWeeks,onMinimize,setPhase,exs,setExs,expId,setExpId,elapsed,don,tot,pct,liftHistory,deloadStyle,lastSessionNote}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const exp=P.experience||"intermediate";
  const [swiped,setSwiped]=useState(new Set());
  const [noteDismissed,setNoteDismissed]=useState(false);
  const [dragFrom,setDragFrom]=useState(null);
  const [insertAt,setInsertAt]=useState(null);
  const [ghostPos,setGhostPos]=useState({x:0,y:0});
  const [ghostLbl,setGhostLbl]=useState("");
  const [restTimers,setRestTimers]=useState({});
  const listRef=useRef(null);
  const txStart=useRef({});
  const dragRef=useRef({active:false,fromIdx:null});

  // Persistent AudioContext ref — must be created during a user gesture on iOS
  const audioCtxRef=useRef(null);
  const getAudioCtx=()=>{
    try {
      if(!audioCtxRef.current){
        audioCtxRef.current=new (window.AudioContext||window.webkitAudioContext)();
      }
      if(audioCtxRef.current.state==="suspended"){
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch(e){return null;}
  };

  // Play a short tone when rest timer hits zero
  const playDone=()=>{
    try {
      const ctx=getAudioCtx();
      if(!ctx) return;
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.frequency.value=880;
      osc.type="sine";
      gain.gain.setValueAtTime(0.4,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime+0.6);
    } catch(e){}
  };

  // Tick rest timers down
  useEffect(()=>{
    const active=Object.values(restTimers).some(v=>v>0);
    if(!active) return;
    const t=setInterval(()=>{
      setRestTimers(prev=>{
        const next={...prev};
        let justFinished=false;
        Object.keys(next).forEach(k=>{
          if(next[k]===1) justFinished=true;
          if(next[k]>0) next[k]--;
        });
        if(justFinished) playDone();
        return next;
      });
    },1000);
    return ()=>clearInterval(t);
  },[restTimers]);

  const updS=(eid,sid,f,v)=>setExs(p=>p.map(e=>e.id!==eid?e:{...e,sets:e.sets.map(s=>s.id!==sid?s:{...s,[f]:v})}));
  const updN=(eid,v)=>setExs(p=>p.map(e=>e.id!==eid?e:{...e,note:v}));
  const addSet=eid=>setExs(p=>p.map(e=>{
    if(e.id!==eid) return e;
    const last=e.sets[e.sets.length-1];
    const ns={id:uid("ns"),weight:last?last.weight:"",reps:"",rir:last?last.rir:String(defaultRIR(wk,totalWeeks,exp)),type:last&&last.type==="drop"?"drop":"normal",done:false};
    return {...e,sets:[...e.sets,ns]};
  }));
  const delSet=(eid,sid)=>{
    setExs(p=>p.map(e=>{
      if(e.id!==eid) return e;
      if(e.sets.filter(s=>!s.done).length<=1) return e;
      return {...e,sets:e.sets.filter(s=>s.id!==sid)};
    }));
    setSwiped(prev=>{const n=new Set(prev);n.delete(sid);return n;});
  };
  const onTS=(sid,e)=>{if(!e.touches[0])return;txStart.current[sid]=e.touches[0].clientX;};
  const onTE=(sid,e)=>{
    const sx=txStart.current[sid];
    if(sx===undefined) return;
    const t0=e.changedTouches[0];
    const endX=(t0&&t0.clientX!==undefined)?t0.clientX:sx;
    const d=endX-sx;
    if(d<-40){setSwiped(prev=>new Set([...prev,sid]));}
    else if(d>20){setSwiped(prev=>{const n=new Set(prev);n.delete(sid);return n;});}
    delete txStart.current[sid];
  };
  const logSet=(eid,sid)=>{
    // Guard: don't log a set with no weight or reps entered
    const ex=exs.find(e=>e.id===eid);
    const set=ex?ex.sets.find(s=>s.id===sid):null;
    if(!set||!set.weight||!set.reps) return;
    if(document.activeElement) document.activeElement.blur();
    getAudioCtx(); // Prime AudioContext on user gesture (required for iOS Safari)
    setExs(p=>{
      const ex=p.find(e=>e.id===eid);
      const loggedSet=ex?ex.sets.find(s=>s.id===sid):null;
      const loggedWeight=loggedSet?loggedSet.weight:"";
      const nx=p.map(e=>{
        if(e.id!==eid) return e;
        let passedLogged=false;
        const newSets=e.sets.map(s=>{
          if(s.id===sid){passedLogged=true;return {...s,done:true};}
          // Auto-fill weight of next undone set if empty
          if(passedLogged&&!s.done&&!s.weight&&loggedWeight&&s.type!=="drop"){
            passedLogged=false;return {...s,weight:loggedWeight};
          }
          return s;
        });
        return {...e,sets:newSets};
      });
      const completedEx=nx.find(e=>e.id===eid);
      if(completedEx&&completedEx.sets.every(s=>s.done)){
        const i=nx.findIndex(e=>e.id===eid);
        if(i<nx.length-1){setTimeout(()=>setExpId(nx[i+1].id),180);}
      }
      return nx;
    });
    // Rest time per RP: heavy compounds 3min, other compounds 2min, isolation 90s
    const prof=getProfile(ex.name);
    const isHeavyCompound=prof.type==="compound"&&prof.pct>=0.025;
    const restSecs=isHeavyCompound?180:prof.type==="compound"?120:90;
    setRestTimers({[sid]:restSecs});
  };
  const undoSet=(eid,sid)=>{
    setExs(p=>p.map(e=>e.id!==eid?e:{...e,sets:e.sets.map(s=>s.id!==sid?s:{...s,done:false})}));
    setRestTimers(prev=>{const n={...prev};delete n[sid];return n;});
  };
  const cycleRIR=(eid,sid,cur)=>{const o=[0,1,2,3,4];const i=o.indexOf(parseInt(cur));updS(eid,sid,"rir",String(o[(i+1)%o.length]));};
  const hdlTS=(e,idx)=>{
    if(exs[idx]&&exs[idx].sets.every(s=>s.done)) return;
    e.stopPropagation();
    dragRef.current={active:true,fromIdx:idx};
    setDragFrom(idx);setInsertAt(idx);
    setGhostLbl(exs[idx]?exs[idx].name:"");
    setGhostPos({x:e.touches[0].clientX,y:e.touches[0].clientY});
  };
  const hdlTM=(e,idx)=>{
    if(!dragRef.current.active) return;
    e.preventDefault();e.stopPropagation();
    const t=e.touches[0];
    setGhostPos({x:t.clientX,y:t.clientY});
    if(listRef.current){
      const rows=listRef.current.querySelectorAll("[data-xi]");
      let best=dragRef.current.fromIdx,bd=Infinity;
      rows.forEach(row=>{
        const rect=row.getBoundingClientRect();
        const mid=rect.top+rect.height/2;
        const dist=Math.abs(t.clientY-mid);
        if(dist<bd){bd=dist;best=parseInt(row.getAttribute("data-xi"));}
      });
      setInsertAt(best);
    }
  };
  const hdlTE=()=>{
    if(!dragRef.current.active) return;
    const from=dragRef.current.fromIdx,to=insertAt;
    if(from!==null&&to!==null&&from!==to){
      setExs(p=>{const n=[...p];const[m]=n.splice(from,1);n.splice(to,0,m);return n;});
    }
    dragRef.current={active:false,fromIdx:null};
    setDragFrom(null);setInsertAt(null);
    setGhostPos({x:0,y:0});setGhostLbl("");
  };
  const rrBg=rn=>{if(isNaN(rn))return C.muted+"22";if(rn===0)return C.red+"22";if(rn===1)return C.accent+"22";if(rn===2)return C.green+"22";return C.muted+"22";};
  const rrFg=rn=>{if(isNaN(rn))return C.muted;if(rn===0)return C.red;if(rn===1)return C.accent;if(rn===2)return C.green;return C.muted;};

  return(
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border+"60",padding:"12px 14px 10px",paddingTop:"calc(12px + env(safe-area-inset-top))",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <button onClick={onMinimize} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"5px 10px",color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,letterSpacing:"0.05em"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="19 12 5 12"/><polyline points="12 19 5 12 12 5"/></svg>
            Minimize
          </button>
          <div style={{fontSize:13,fontWeight:800,color:elapsed>3600?C.red:C.muted2,fontVariantNumeric:"tabular-nums",letterSpacing:"0.06em"}}>{fmt(elapsed)}</div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:3}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase"}}>{workout.day}</span>
            <span style={{color:C.border2}}>·</span>
            <span style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:"0.04em"}}>{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
            <span style={{color:C.border2}}>·</span>
            <span style={{fontSize:13,fontWeight:800,letterSpacing:"0.06em",color:C.text,textTransform:"uppercase"}}>{workout.name}</span>
          </div>
          <div style={{fontSize:10,color:C.muted,letterSpacing:"0.06em"}}>
            Week {wk} · RIR {defaultRIR(wk,totalWeeks,exp)} target
            {workout.name&&workout.name.includes("—")?(
              <span style={{marginLeft:6,color:C.blue,fontWeight:700}}>
                {workout.name.includes("Heavy")?"· Strength":workout.name.includes("Moderate")?"· Hypertrophy":"· Pump"}
              </span>
            ):null}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,height:2,background:C.border,overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:pct===100?C.green:C.accent,transition:"width .4s"}}/>
          </div>
          <span style={{fontSize:10,color:C.muted,flexShrink:0,fontWeight:700,letterSpacing:"0.06em"}}>{don}/{tot}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}} onTouchStart={e=>{const tag=e.target.tagName;if(tag!=="INPUT"&&tag!=="TEXTAREA"&&tag!=="BUTTON"&&!e.target.closest("button")&&document.activeElement&&(document.activeElement.tagName==="INPUT"||document.activeElement.tagName==="TEXTAREA")){document.activeElement.blur();}}}>        <div ref={listRef} style={{padding:"8px 12px 120px",position:"relative"}}>
          {lastSessionNote&&!noteDismissed?(
            <div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.surf,border:"1px solid "+C.border2,borderRadius:4,padding:"10px 12px",marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>Last session note</div>
                <div style={{fontSize:12,color:C.muted2,lineHeight:1.5,fontStyle:"italic"}}>"{lastSessionNote}"</div>
              </div>
              <button onClick={()=>setNoteDismissed(true)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:"2px",flexShrink:0,display:"flex",alignItems:"center"}}>
                <IcoX sz={12} col={C.muted}/>
              </button>
            </div>
          ):null}
          {dragFrom!==null?(
            <div style={{position:"fixed",left:0,right:0,top:ghostPos.y-24,zIndex:999,maxWidth:480,margin:"0 auto",padding:"0 12px",pointerEvents:"none"}}>
              <div style={{background:C.card2,border:"1px solid "+C.accent,borderRadius:6,padding:"12px 14px",boxShadow:"0 4px 24px #000000aa",display:"flex",alignItems:"center",gap:10}}>
                <IcoDrag sz={15} col={C.accent}/>
                <span style={{fontSize:14,fontWeight:700,color:C.text,flex:1}}>{ghostLbl}</span>
                <span style={{fontSize:11,color:C.accent,fontWeight:600,letterSpacing:"0.06em"}}>MOVE</span>
              </div>
            </div>
          ):null}
          {exs.map((ex,idx)=>{
            if(!ex||!ex.sets||!ex.id) return null;
            const isO=expId===ex.id;
            const isDone=ex.sets.every(s=>s.done);
            const mc=MC[ex.muscle]||"#888";
            const dc=ex.sets.filter(s=>s.done).length;
            const isDrag=dragFrom===idx;
            const isTgt=insertAt===idx&&dragFrom!==null&&dragFrom!==idx;
            return(
              <div key={ex.id} data-xi={idx}>
                {isTgt?<div style={{height:3,background:C.accent,borderRadius:2,marginBottom:4,marginTop:-2,boxShadow:"0 0 8px "+C.accent+"88"}}/>:null}
                <div style={{background:isDrag?"#0f1420":isO?C.card2:C.card,borderLeft:"3px solid "+(isDone?C.green:isO?mc:C.border),borderRadius:0,marginBottom:5,overflow:"hidden",opacity:isDrag?0.25:(isDone&&!isO?0.5:1),transition:"opacity .15s"}}>
                  <div onClick={()=>!dragRef.current.active&&setExpId(isO?null:ex.id)} style={{display:"flex",alignItems:"center",padding:"11px 12px",cursor:"pointer",gap:9}}>
                    <span onTouchStart={e=>hdlTS(e,idx)} onTouchMove={e=>hdlTM(e,idx)} onTouchEnd={hdlTE} style={{color:isDone?"transparent":C.muted2,cursor:isDone?"default":"grab",flexShrink:0,userSelect:"none",display:"flex",alignItems:"center",padding:"4px",touchAction:"none"}}>
                      <IcoDrag sz={15} col={isDone?"transparent":C.muted2}/>
                    </span>
                    <div style={{width:7,height:7,borderRadius:"50%",background:isDone?C.green:mc,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:16,fontWeight:700}}>{ex.name}</div>
                      {isDone?(
                        <div style={{fontSize:11,color:C.muted,marginTop:2}}>{buildScheme(ex.sets)}</div>
                      ):(
                        <div style={{marginTop:3}}>
                          {(()=>{
                            const pr=rpProg(ex.name,ex.lastWeight,ex.lastRIR,ex.lastReps,defaultRIR(wk,totalWeeks,exp),false,C,exp);
                            const sw=pr?pr.ws:(ex.lastWeight||"—");
                            const sc=ex.sets.filter(s=>s.type!=="drop").length;
                            const dc2=ex.sets.filter(s=>s.type==="drop").length;
                            return(
                              <div>
                                <span style={{fontSize:12,fontWeight:700,color:C.accent}}>{sw} lbs</span>
                                <span style={{fontSize:11,color:C.muted2}}> x {sc} sets</span>
                                {dc2>0?<span style={{fontSize:11,color:C.orange}}>  +{dc2} drop</span>:null}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div style={{flexShrink:0,textAlign:"right",marginRight:4}}>
                      {isDone?(
                        <span style={{color:C.green,display:"flex",alignItems:"center"}}><IcoCheck sz={15} col={C.green}/></span>
                      ):(
                        <span style={{fontSize:11,color:isO?C.accent:C.muted}}>{dc}/{ex.sets.length}</span>
                      )}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{isO?<polyline points="18 15 12 9 6 15"/>:<polyline points="6 9 12 15 18 9"/>}</svg>
                  </div>
                  {isO?(
                    <div style={{borderTop:"1px solid "+C.border,padding:"12px 12px 14px"}}>
                      {ex.lastScheme?(
                        <div style={{display:"flex",alignItems:"center",gap:8,background:C.surf,borderRadius:7,padding:"7px 10px",marginBottom:10}}>
                          <div style={{fontSize:9,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",flexShrink:0}}>Last</div>
                          <div style={{fontSize:12,color:C.muted2,fontWeight:500}}>{ex.lastScheme}</div>
                        </div>
                      ):null}
                      <ProgBanner ex={ex} wk={wk} totalWeeks={totalWeeks} isDeload={wk===totalWeeks} deloadStyle={deloadStyle}/>

                      <div style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 44px 56px 28px",gap:6,marginBottom:7,paddingBottom:6,borderBottom:"1px solid "+C.border}}>
                        {["#","Weight","Reps","RIR","",""].map((h,i)=>(
                          <span key={i} style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.09em"}}>{h}</span>
                        ))}
                      </div>
                      {ex.sets.map((set,si)=>{
                        const iDr=set.type==="drop";
                        const rn=parseInt(set.rir);
                        const rbg=rrBg(rn);
                        const rfg=rrFg(rn);
                        const canSw=!set.done&&ex.sets.filter(s=>!s.done).length>1;
                        const isRev=swiped.has(set.id);
                        const repsN=parseInt(set.reps);
                        const prof=getProfile(ex.name);
                        const minR=prof.type==="compound"?5:8;
                        const maxR=prof.preferReps?(ex.muscle==="Calves"||ex.muscle==="Core"?40:30):20;
                        const repFlag=!set.done&&set.reps&&!isNaN(repsN)&&(repsN<minR||repsN>maxR);
                        return(
                          <div key={set.id}>
                            <div onTouchStart={canSw?e=>onTS(set.id,e):undefined} onTouchEnd={canSw?e=>onTE(set.id,e):undefined} style={{position:"relative",overflow:"hidden",borderRadius:7,marginBottom:repFlag?2:5,transition:"opacity .2s",opacity:set.done?0.36:1}}>
                              {canSw?(
                                <div style={{position:"absolute",right:0,top:0,bottom:0,width:isRev?48:0,background:C.red,display:"flex",alignItems:"center",justifyContent:"center",transition:"width .2s",overflow:"hidden",borderRadius:"0 7px 7px 0",zIndex:2}}>
                                  <button onClick={()=>delSet(ex.id,set.id)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:"0 14px",height:"100%",display:"flex",alignItems:"center"}}>
                                    <IcoX sz={16} col="#fff"/>
                                  </button>
                                </div>
                              ):null}
                              <div style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 44px 56px 28px",gap:6,alignItems:"center",transform:isRev?"translateX(-48px)":"translateX(0)",transition:"transform .2s"}}>
                                <div style={{textAlign:"center"}}>
                                  {iDr?<span style={{fontSize:9,color:C.orange}}>D</span>:<span style={{fontSize:10,color:C.muted}}>{si+1}</span>}
                                </div>
                                <input type="number" inputMode="decimal" pattern="[0-9]*" enterKeyHint="next" disabled={set.done} value={set.weight} onChange={e=>updS(ex.id,set.id,"weight",e.target.value)} placeholder="lbs" style={{background:iDr?C.orange+"15":C.surf,border:"1px solid "+(iDr?C.orange+"44":C.border),borderRadius:6,padding:"8px 4px",color:iDr?C.orange:C.text,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",width:"100%",boxSizing:"border-box"}}/>
                                <input type="number" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" disabled={set.done} value={set.reps} onChange={e=>updS(ex.id,set.id,"reps",e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!set.done) logSet(ex.id,set.id);}} placeholder="reps" style={{background:C.surf,border:"1px solid "+C.border,borderRadius:6,padding:"8px 4px",color:C.text,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",width:"100%",boxSizing:"border-box"}}/>
                                <button disabled={set.done} onClick={()=>cycleRIR(ex.id,set.id,set.rir)} style={{background:rbg,border:"1px solid "+rfg+"55",borderRadius:6,padding:"8px 0",cursor:set.done?"default":"pointer",color:rfg,fontSize:13,fontWeight:800,textAlign:"center",transition:"all .1s",width:"100%"}}>{set.rir}</button>
                                {set.done&&restTimers[set.id]>0?(
                                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.border2,border:"1px solid "+C.border2,borderRadius:6,padding:"8px 0",fontSize:11,fontWeight:700,color:C.muted2}}>{fmt(restTimers[set.id])}</div>
                                ):(()=>{
                                  return(
                                    <button onClick={()=>{if(set.done)return;logSet(ex.id,set.id);}} style={{padding:"8px 0",borderRadius:6,fontWeight:800,fontSize:11,letterSpacing:"0.06em",cursor:set.done?"default":"pointer",transition:"all .15s",background:set.done?C.green+"22":(!set.weight||!set.reps)?C.card:C.accent,border:"1px solid "+(set.done?C.green+"44":(!set.weight||!set.reps)?C.border2:C.accent),color:set.done?C.green:(!set.weight||!set.reps)?C.muted:"#000",display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>
                                      {set.done?<IcoCheck sz={13} col={C.green}/>:"LOG"}
                                    </button>
                                  );
                                })()}
                                <button onClick={()=>set.done&&undoSet(ex.id,set.id)} style={{background:"none",border:"none",cursor:set.done?"pointer":"default",padding:"4px 0",display:"flex",alignItems:"center",justifyContent:"center",visibility:set.done?"visible":"hidden"}}>
                                  <IcoUndo sz={13} col={set.done?C.muted:"transparent"}/>
                                </button>
                              </div>
                            </div>
                            {repFlag?(
                              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5,paddingLeft:23,fontSize:10,color:C.accent}}>
                                <IcoWarn sz={10} col={C.accent}/> Outside hypertrophic rep range
                              </div>
                            ):null}
                          </div>
                        );
                      })}
                      <button onClick={()=>addSet(ex.id)} style={{width:"100%",marginTop:8,padding:"8px 0",background:"none",border:"1px dashed "+C.border2,borderRadius:7,color:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        <IcoPlus sz={12} col={C.muted}/> Add Set
                      </button>
                      <div style={{marginTop:10}}>
                        <textarea rows={1} value={ex.note} onChange={e=>updN(ex.id,e.target.value)} placeholder="Exercise cue" style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.border2,padding:"6px 0",color:C.muted2,fontSize:12,resize:"none",outline:"none",lineHeight:1.5}}/>
                      </div>
                    </div>
                  ):null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,"+C.bg+" 35%)",padding:"22px 14px 14px"}}>
        <button onClick={()=>{
          setExs(p=>p.map(e=>({...e,sets:e.sets.map(s=>s.done?s:{...s,done:true,weight:s.weight||"0",reps:"0",incomplete:true})})));
          setPhase("summary");
        }} disabled={don===0} style={{width:"100%",padding:"14px",borderRadius:6,fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,letterSpacing:"0.12em",cursor:don===0?"default":"pointer",transition:"all .2s",background:pct===100?C.accent:don===0?C.border:C.card2,border:"1px solid "+(pct===100?C.accent:don===0?C.border:C.border2),color:pct===100?"#000":don===0?C.muted+"66":C.muted}}>
          {pct===100?"FINISH WORKOUT":"FINISH EARLY — "+don+" of "+tot+" sets done"}
        </button>
      </div>
    </div>
  );
}

function Logger({workout,wk,totalWeeks,isDeload,deloadStyle,onComplete,onMinimize,visible,liftHistory,savedExs,onExsChange,exUpdateKey,lastSessionNote}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const exp=P.experience||"intermediate";
  const [exs,setExsRaw]=useState(()=>{
    // Restore in-progress sets if they were persisted (survives reload/backgrounding)
    if(savedExs&&savedExs.length>0) return savedExs;
    return workout.exercises.map(ex=>({
      ...ex,
      sets:(()=>{
        const allSets=ex.sets||[];
        const working=allSets.filter(s=>s.type!=="drop");
        const dropSets=allSets.filter(s=>s.type==="drop");

        if(isDeload){
          const style=deloadStyle||"volume";
          if(style==="intensity"){
            // Intensity deload: keep all working sets, cut weight ~50%
            const halfSets=working.map(s=>({
              ...s,
              rir:"4",
              weight:s.weight?String(snap(parseFloat(s.weight)*0.5)):"",
            }));
            return [...halfSets,...dropSets.map(s=>({...s,rir:"4"}))];
          } else {
            // Volume deload (default): cut to MV set count, keep weight
            const mev=ex.mevSets||working.length||3;
            const mvSets=ex.mvSets||Math.max(1,Math.ceil(mev/2));
            const reduced=working.slice(0,Math.max(1,mvSets)).map(s=>({...s,rir:"4"}));
            return reduced;
          }
        }

        // Ramp sets from MEV to MRV across working weeks
        const mev=ex.mevSets||working.length||3;
        const mrv=ex.mrvSets||mev+2;
        const targetCount=rampedSets(mev,mrv,wk,totalWeeks);
        let workingSets;
        if(targetCount>working.length){
          const last=working.slice(-1)[0];
          const extras=Array(targetCount-working.length).fill(null).map(()=>newSet(last?last.weight:"","normal"));
          workingSets=[...working,...extras];
        } else {
          workingSets=working.slice(0,targetCount);
        }
        return [...workingSets.map(s=>({...s,rir:String(defaultRIR(wk,totalWeeks,exp))})),...dropSets];
      })()
    }));
  });
  // Wrap setExs so every update is also bubbled up to App for persistence
  const setExs=useRef(null);
  setExs.current=(updater)=>{
    setExsRaw(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      onExsChange&&onExsChange(next);
      return next;
    });
  };
  const setExsFn=(...args)=>setExs.current(...args);

  // Re-sync exs when App externally updates exercises (swap/add/remove from Plan tab)
  // Merges incoming changes while preserving already-logged set data
  const prevUpdateKey=useRef(exUpdateKey);
  useEffect(()=>{
    if(exUpdateKey===prevUpdateKey.current) return;
    prevUpdateKey.current=exUpdateKey;
    if(!savedExs||savedExs.length===0) return;
    setExsRaw(prev=>{
      // For each incoming exercise: if it exists in prev (same name), keep its logged sets
      // If it's new (swap/add), use the incoming exercise fresh
      const merged=savedExs.map(incoming=>{
        const existing=prev.find(e=>e.name===incoming.name);
        return existing||incoming;
      });
      return merged;
    });
    onExsChange&&onExsChange(savedExs);
  },[exUpdateKey,savedExs]);
  const [expId,setExpId]=useState(null);
  const [phase,setPhase]=useState("log");
  const [elapsed,setElapsed]=useState(0);
  const [ratings,setRatings]=useState({});
  const [sessionNote,setSessionNote]=useState("");
  // Use persisted startedAt if available (survives page reload), otherwise now
  const t0=useRef(workout.startedAt||Date.now());
  useEffect(()=>{
    const t=setInterval(()=>setElapsed(Math.floor((Date.now()-t0.current)/1000)),1000);
    return ()=>clearInterval(t);
  },[]);
  const tot=exs.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0);
  const don=exs.reduce((a,e)=>a+e.sets.filter(s=>s.done&&!s.incomplete&&s.type!=="drop").length,0);
  const pct=tot>0?(don/tot)*100:0;
  const totalVol=exs.reduce((a,e)=>a+e.sets.filter(s=>s.done&&s.type!=="drop"&&s.weight&&s.reps).reduce((b,s)=>b+(parseFloat(s.weight)||0)*(parseFloat(s.reps)||0),0),0);
  return(
    <div style={{display:visible?"flex":"none",position:"fixed",inset:0,zIndex:300,flexDirection:"column",background:C.bg,maxWidth:480,margin:"0 auto"}}>
      {phase==="summary"?(
        <SessionSummary workout={workout} exs={exs} ratings={ratings} setRatings={setRatings} don={don} totalVol={totalVol} elapsed={elapsed} sessionNote={sessionNote} setSessionNote={setSessionNote} onComplete={onComplete}/>
      ):(
        <LoggerInner workout={workout} wk={wk} totalWeeks={totalWeeks} onMinimize={onMinimize} setPhase={setPhase} exs={exs} setExs={setExsFn} expId={expId} setExpId={setExpId} elapsed={elapsed} don={don} tot={tot} pct={pct} liftHistory={liftHistory} deloadStyle={deloadStyle} lastSessionNote={lastSessionNote}/>
      )}
    </div>
  );
}

function SessionEditModal({session,onSave,onClose}){
  const C=useContext(ThemeCtx);
  const [note,setNote]=useState(session.note||"");
  const [exs,setExs]=useState(session.exercises?session.exercises.map(ex=>({
    ...ex,
    sets:ex.sets.map(s=>s.incomplete||(!s.done)?{...s,weight:"",reps:""}:s)
  })):null);
  const [expandedId,setExpandedId]=useState(null);
  const updW=(eid,sid,v)=>setExs(p=>p.map(e=>e.id!==eid?e:{...e,sets:e.sets.map(s=>s.id!==sid?s:{...s,weight:v})}));
  const updR=(eid,sid,v)=>setExs(p=>p.map(e=>e.id!==eid?e:{...e,sets:e.sets.map(s=>s.id!==sid?s:{...s,reps:v})}));
  const addSet=eid=>setExs(p=>p.map(e=>{
    if(e.id!==eid) return e;
    const newS={id:uid("es"),weight:"",reps:"",rir:"",type:"normal",done:true,incomplete:false};
    return {...e,sets:[...e.sets,newS]};
  }));
  const delSet=(eid,sid)=>setExs(p=>p.map(e=>{
    if(e.id!==eid) return e;
    if(e.sets.length<=1) return e; // always keep at least 1 set
    return {...e,sets:e.sets.filter(s=>s.id!==sid)};
  }));
  return(
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"#000a"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 16px 12px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,letterSpacing:"0.06em"}}>{session.day}</div>
            <div style={{fontSize:11,color:C.muted}}>{session.date} · Week {session.week}</div>
          </div>
          <button onClick={onClose} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:8,padding:"6px 12px",color:C.muted2,fontSize:12,cursor:"pointer"}}>Cancel</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
          <div style={{marginBottom:16}}>
            <SLbl>Session Note</SLbl>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Session notes..." style={{width:"100%",background:C.card2,border:"none",borderBottom:"2px solid "+C.border2,padding:"10px 0",color:C.text,fontSize:13,resize:"none",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/>
          </div>
          {exs?exs.map(ex=>{
            const isOpen=expandedId===ex.id;
            const loggedCount=ex.sets.filter(s=>s.done&&!s.incomplete&&s.weight&&s.reps).length;
            const totalCount=ex.sets.filter(s=>s.type!=="drop").length;
            const mc=MC[ex.muscle]||"#888";
            return(
              <div key={ex.id} style={{marginBottom:6,background:C.card,border:"1px solid "+(isOpen?C.border2:C.border),borderRadius:6,overflow:"hidden"}}>
                <div onClick={()=>setExpandedId(isOpen?null:ex.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 13px",cursor:"pointer"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:mc,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700}}>{ex.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:1}}>{loggedCount}/{totalCount} sets logged</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{isOpen?<polyline points="18 15 12 9 6 15"/>:<polyline points="6 9 12 15 18 9"/>}</svg>
                </div>
                {isOpen?(
                  <div style={{borderTop:"1px solid "+C.border,padding:"10px 13px 12px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 28px",gap:8,marginBottom:6}}>
                      <span style={{fontSize:9,color:C.muted,textAlign:"center"}}>#</span>
                      <span style={{fontSize:9,color:C.muted,textAlign:"center",letterSpacing:"0.06em",textTransform:"uppercase"}}>Weight</span>
                      <span style={{fontSize:9,color:C.muted,textAlign:"center",letterSpacing:"0.06em",textTransform:"uppercase"}}>Reps</span>
                      <span/>
                    </div>
                    {ex.sets.filter(s=>s.type!=="drop"||s.done).map((set,si)=>(
                      <div key={set.id} style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 28px",gap:8,alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:10,color:C.muted,textAlign:"center"}}>{set.type==="drop"?"D":si+1}</span>
                        <input type="number" inputMode="decimal" value={set.weight} onChange={e=>updW(ex.id,set.id,e.target.value)} placeholder="lbs" style={{background:C.surf,border:"1px solid "+C.border2,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",width:"100%",boxSizing:"border-box"}}/>
                        <input type="number" inputMode="numeric" value={set.reps} onChange={e=>updR(ex.id,set.id,e.target.value)} placeholder="reps" style={{background:C.surf,border:"1px solid "+C.border2,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",width:"100%",boxSizing:"border-box"}}/>
                        {ex.sets.length>1?(
                          <button onClick={()=>delSet(ex.id,set.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <IcoX sz={12} col={C.muted}/>
                          </button>
                        ):<span/>}
                      </div>
                    ))}
                    <button onClick={()=>addSet(ex.id)} style={{width:"100%",marginTop:4,padding:"7px 0",background:"none",border:"1px dashed "+C.border2,borderRadius:7,color:C.muted,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                      <IcoPlus sz={11} col={C.muted}/> Add Set
                    </button>
                  </div>
                ):null}
              </div>
            );
          }):<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>No detailed set data for this session</div>}
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid "+C.border,flexShrink:0}}>
          <button onClick={()=>onSave(note,exs)} style={{width:"100%",padding:"14px",background:C.accent,color:"#000",border:"none",borderRadius:6,fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,letterSpacing:"0.12em",cursor:"pointer"}} onPointerDown={e=>e.currentTarget.style.pointerEvents="none"} onPointerUp={e=>{setTimeout(()=>e.currentTarget&&(e.currentTarget.style.pointerEvents=""),1500);}}>SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
}

function MesoCompleteScreen({meso,liftHistory,mesoNum,onStartNext,onReview,onSpecialize,onDismiss,program}){
  const C=useContext(ThemeCtx);
  const suggested=nextRepRange(meso.repRange);
  const mesoEntries=liftHistory.filter(e=>e.mesoNum===mesoNum&&!e.isDeload);
  const uniqueExs=[...new Set(mesoEntries.map(e=>e.exercise))];
  const prs=uniqueExs.map(name=>{
    const ents=mesoEntries.filter(e=>e.exercise===name&&!e.isDeload).sort((a,b)=>a.week-b.week);
    if(ents.length<2) return null;
    const firstE1rm=e1rm(ents[0].topSetWeight,ents[0].topSetReps||1);
    const peakEntry=ents.reduce((best,e)=>e1rm(e.topSetWeight,e.topSetReps||1)>e1rm(best.topSetWeight,best.topSetReps||1)?e:best,ents[0]);
    const peakE1rm=e1rm(peakEntry.topSetWeight,peakEntry.topSetReps||1);
    const pct=parseFloat(((peakE1rm-firstE1rm)/firstE1rm*100).toFixed(1));
    if(pct<=0) return null;
    return {name,muscle:ents[0].muscle,first:ents[0].topSetWeight,peak:peakEntry.topSetWeight,pct};
  }).filter(Boolean).sort((a,b)=>b.pct-a.pct);

  // Collect exercises flagged with low SFR (≤2 stars) across this meso
  const flagged=[];
  (program||[]).forEach(day=>{
    day.exercises.forEach(ex=>{
      if(ex.lastSFR&&ex.lastSFR==="flagged") flagged.push({name:ex.name,muscle:ex.muscle,sfr:ex.lastSFR});
    });
  });
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border+"60",padding:"13px 16px",paddingTop:"calc(13px + env(safe-area-inset-top))",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,letterSpacing:"0.2em",color:C.accent}}>HYPER</div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase"}}>Meso Complete</div>
          <div style={{fontSize:10,color:C.muted}}>{meso.label}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px 14px 100px"}}>
        <div style={{fontSize:32,fontWeight:900,marginBottom:4,display:"flex",alignItems:"center",gap:12,letterSpacing:"0.04em",textTransform:"uppercase"}}>
          Meso {mesoNum} Done <IcoTrophy sz={28} col={C.accent}/>
        </div>
        <div style={{fontSize:13,color:C.muted2,marginBottom:24,lineHeight:1.6}}>{meso.totalWeeks} weeks in the books. Here is what you built.</div>
        <Card hi={C.accent+"33"}>
          <SLbl>Meso Summary</SLbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            <div style={{background:C.card2,padding:"14px 12px"}}>
              <div style={{fontSize:32,fontWeight:900,color:C.accent,lineHeight:1}}>{meso.totalWeeks}</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:4,fontWeight:700}}>Weeks trained</div>
            </div>
            <div style={{background:C.card2,padding:"14px 12px"}}>
              <div style={{fontSize:32,fontWeight:900,color:C.green,lineHeight:1}}>{prs.length}</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:4,fontWeight:700}}>Lifts improved</div>
            </div>
          </div>
        </Card>
        {prs.length>0?(
          <Card>
            <SLbl>Progress this meso</SLbl>
            {prs.slice(0,6).map((p,i)=>{
              const mc=MC[p.muscle]||"#888";
              const bc=p.pct>=8?C.green:p.pct>=4?C.accent:C.orange;
              return(
                <div key={i} style={{marginBottom:i<Math.min(prs.length,6)-1?12:0,paddingBottom:i<Math.min(prs.length,6)-1?12:0,borderBottom:i<Math.min(prs.length,6)-1?"1px solid "+C.border:"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:700}}>{p.name}</span>
                      <span style={{fontSize:10,color:mc,marginLeft:7}}>{p.muscle}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:800,color:bc}}>+{p.pct}%</span>
                  </div>
                  <div style={{fontSize:11,color:C.muted}}>{p.first} lbs &rarr; {p.peak} lbs</div>
                </div>
              );
            })}
          </Card>
        ):(
          <Card>
            <SLbl>Progress this meso</SLbl>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>No lift data was recorded this meso. Log weights and reps next time to track progress here.</div>
          </Card>
        )}
        <Card hi={C.green+"44"}>
          <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:6}}>Next meso auto-calculated</div>
          <div style={{fontSize:12,color:C.muted2,lineHeight:1.7}}>Week 1 weights are rolled back from your peak. RIR resets to 3. Volume starts at MEV and ramps toward MRV.</div>
        </Card>
        {flagged.length>0?(
          <Card hi={C.accent+"44"}>
            <SLbl>Consider swapping next meso</SLbl>
            <div style={{fontSize:11,color:C.muted2,marginBottom:12,lineHeight:1.5}}>These exercises were rated low on SFR. Consider swapping for a variation with better stimulus-to-fatigue ratio.</div>
            {flagged.map((ex,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,paddingBottom:i<flagged.length-1?10:0,marginBottom:i<flagged.length-1?10:0,borderBottom:i<flagged.length-1?"1px solid "+C.border:"none"}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:MC[ex.muscle]||"#888",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{ex.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{ex.muscle}</div>
                </div>
                <div style={{fontSize:10,color:C.red,fontWeight:600,background:C.red+"18",borderRadius:5,padding:"2px 8px"}}>
                  Flagged
                </div>
              </div>
            ))}
            <div style={{fontSize:11,color:C.muted2,marginTop:10,lineHeight:1.5}}>Tap "Review &amp; Edit Program" to make swaps before launching.</div>
          </Card>
        ):null}
        <Card hi={C.blue+"33"}>
          <SLbl>Rep Range — Next Meso</SLbl>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <div style={{flex:1,background:C.card2,padding:"10px 12px",textAlign:"center",opacity:0.6}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted2}}>{REP_RANGE_LABELS[meso.repRange||"hypertrophy"]}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>{REP_RANGE_SUBS[meso.repRange||"hypertrophy"]}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:3,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700}}>This meso</div>
            </div>
            <div style={{fontSize:14,color:C.muted,fontWeight:900}}>→</div>
            <div style={{flex:1,background:C.accent+"20",borderBottom:"2px solid "+C.accent,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:800,color:C.accent}}>{REP_RANGE_LABELS[suggested]}</div>
              <div style={{fontSize:10,color:C.muted2,marginTop:2}}>{REP_RANGE_SUBS[suggested]}</div>
              <div style={{fontSize:9,color:C.accent,marginTop:3,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700}}>Suggested next</div>
            </div>
          </div>
          <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>RP recommends rotating rep ranges across mesos to prevent accommodation and protect joints.</div>
        </Card>
        {meso.mode==="specialization"?(
          <div style={{background:C.blue+"12",border:"1px solid "+C.blue+"33",borderRadius:6,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:4}}>Specialization complete</div>
            <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>Your {meso.spec?.targetMuscle} has been pushed to MRV. Return to a standard balanced meso to let all muscles catch up and lock in your gains.</div>
          </div>
        ):null}
        <button onClick={()=>onStartNext(suggested)} style={{width:"100%",padding:"15px",background:C.accent,color:"#000",border:"none",borderRadius:4,fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,letterSpacing:"0.12em",cursor:"pointer",marginBottom:8,textTransform:"uppercase"}}>Start Next Meso</button>
        <button onClick={()=>onReview(suggested)} style={{width:"100%",padding:"13px",background:"none",color:C.muted2,border:"1px solid "+C.border2,borderRadius:4,fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,letterSpacing:"0.1em",cursor:"pointer",marginBottom:8,textTransform:"uppercase"}}>Review &amp; Edit Program First</button>
        <button onClick={onSpecialize} style={{width:"100%",padding:"13px",background:"none",color:C.blue,border:"1px solid "+C.blue+"44",borderRadius:4,fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,letterSpacing:"0.1em",cursor:"pointer",marginBottom:16,textTransform:"uppercase"}}>Specialize a Muscle →</button>
        <div style={{textAlign:"center"}}>
          <button onClick={onDismiss} style={{background:"none",border:"none",padding:0,color:C.muted,fontSize:11,cursor:"pointer",textDecoration:"underline",textDecorationColor:C.border2,letterSpacing:"0.04em"}}>Dismiss and decide later</button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({meso,mesoCount,program,history,onStart,profile,activeLog,onResume,onAbandon,onEdit,onExtendMeso,onSetDeloadStyle}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const exp=P.experience||"intermediate";
  const isDeloadWeek=meso.week===meso.totalWeeks;
  const needsDeloadChoice=isDeloadWeek&&!meso.deloadStyle;
  const [confirmAbandon,setConfirmAbandon]=useState(false);
  const [showExtraPicker,setShowExtraPicker]=useState(false);
  useEffect(()=>{if(!activeLog) setConfirmAbandon(false);},[activeLog]);
  const TODAY=getTodayName();
  const todayWorkout=program.find(d=>d.day===TODAY)||null;
  const totalSets=todayWorkout?todayWorkout.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0):0;
  const FULL=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const SHORT=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayIdx=FULL.indexOf(TODAY);
  const dmap={};
  program.forEach(d=>{dmap[d.day]=d;});
  const completedDayNames=new Set(history.filter(s=>s.week===meso.week&&(s.mesoNum==null||s.mesoNum===mesoCount)).map(s=>s.day));
  const nextTraining=(()=>{
    const sorted=program.slice().sort((a,b)=>FULL.indexOf(a.day)-FULL.indexOf(b.day));
    const next=sorted.find(d=>FULL.indexOf(d.day)>todayIdx);
    if(next) return next;
    // Wrap to next week - find the first training day
    return sorted[0]||null;
  })();
  const PUSH=["Chest","Shoulders","Triceps"];
  const PULL=["Back","Biceps"];
  const LEGS=["Quads","Hamstrings","Glutes","Calves"];
  const getCat=day=>{
    if(!day) return null;
    const ms=day.exercises.map(e=>e.muscle);
    const p=ms.filter(m=>PUSH.includes(m)).length;
    const l=ms.filter(m=>PULL.includes(m)).length;
    const g=ms.filter(m=>LEGS.includes(m)).length;
    const total=p+l+g;
    if(total===0) return null;
    const hasUpper=p>0||l>0;
    const hasLegs=g>0;
    if(hasUpper&&hasLegs) return "Mix";
    if(hasLegs&&!hasUpper) return "Legs";
    if(p>=l) return "Push";
    return "Pull";
  };
  return(
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{padding:"12px 14px 100px",display:"flex",flexDirection:"column",gap:6}}>

        {/* Active Meso */}
        <Section accent={C.accent}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <SLbl>Active Mesocycle</SLbl>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{fontSize:16,fontWeight:900,letterSpacing:"0.04em",textTransform:"uppercase"}}>{meso.label}</div>
                {meso.mode==="specialization"?<Tag label="Spec" color={C.blue}/>:null}
              </div>
              {meso.startDate?<div style={{fontSize:10,color:C.muted,marginTop:2}}>{mesoStartLabel(meso.startDate)} {meso.startDate}</div>:null}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:26,fontWeight:900,color:C.accent,lineHeight:1}}>W{meso.week}</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontWeight:700}}>OF {meso.totalWeeks}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:12}}>
            {FULL.map((full,i)=>{
              const dp=dmap[full];
              const isT=full===TODAY;
              const isPast=FULL.indexOf(full)<todayIdx;
              const cat=getCat(dp);
              const isDone=dp&&completedDayNames.has(dp.name);
              return(
                <div key={full} style={{textAlign:"center"}}>
                  <div style={{fontSize:8,fontWeight:isT?800:500,color:isT?C.accent:C.muted,letterSpacing:"0.1em",marginBottom:4,textTransform:"uppercase"}}>{SHORT[i]}</div>
                  <div style={{height:38,background:isDone?C.green+"28":isT&&cat?C.accent+"22":cat?C.card2:C.bg,borderBottom:isDone?"2px solid "+C.green:isT?"2px solid "+C.accent:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",opacity:isPast&&!isDone?0.3:1}}>
                    {isDone?<IcoCheck sz={10} col={C.green}/>:cat?<span style={{fontSize:8,fontWeight:800,color:isT?C.accent:C.muted2}}>{cat}</span>:<div style={{width:10,height:1,background:C.border}}/>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,paddingTop:10,borderTop:"1px solid "+C.border+"60"}}>
            <span>RIR target: <strong style={{color:C.text}}>{defaultRIR(meso.week,meso.totalWeeks,exp)}</strong></span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:meso.totalWeeks-meso.week===0?C.accent:C.muted,fontWeight:meso.totalWeeks-meso.week===0?700:400}}>{meso.totalWeeks-meso.week===0?"Deload Week":meso.totalWeeks-meso.week+" wks remaining"}</span>
              {meso.totalWeeks-meso.week===1?(<button onClick={onExtendMeso} style={{background:"none",border:"1px solid "+C.border2,borderRadius:3,padding:"2px 7px",color:C.muted2,fontSize:10,cursor:"pointer"}}>+1 wk</button>):null}
            </div>
          </div>
        </Section>

        {/* Deload choice */}
        {needsDeloadChoice?(
          <Section accent={C.blue}>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:C.blue,marginBottom:4}}>Deload Week</div>
            <div style={{fontSize:11,color:C.muted2,lineHeight:1.6,marginBottom:12}}>Choose your deload style. Can't be changed once selected.</div>
            <div style={{display:"flex",gap:5}}>
              <button onClick={()=>onSetDeloadStyle("volume")} style={{flex:1,padding:"12px 10px",background:C.card2,border:"none",borderLeft:"3px solid "+C.blue,cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:11,fontWeight:800,color:C.text,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Volume</div>
                <div style={{fontSize:10,color:C.muted2,lineHeight:1.5}}>Same weight, sets cut in half.</div>
              </button>
              <button onClick={()=>onSetDeloadStyle("intensity")} style={{flex:1,padding:"12px 10px",background:C.card2,border:"none",borderLeft:"3px solid "+C.blue,cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:11,fontWeight:800,color:C.text,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Intensity</div>
                <div style={{fontSize:10,color:C.muted2,lineHeight:1.5}}>Same sets, weight cut ~50%.</div>
              </button>
            </div>
          </Section>
        ):isDeloadWeek&&meso.deloadStyle?(
          <Section accent={C.blue}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <IcoInfo/>
              <span style={{fontSize:12,color:C.muted2}}><strong style={{color:C.text}}>{meso.deloadStyle==="intensity"?"Intensity":"Volume"} Deload</strong> — {meso.deloadStyle==="intensity"?"Same sets, ~50% weight.":"Same weight, sets halved."} RIR 4.</span>
            </div>
          </Section>
        ):null}

        {/* Today */}
        {(()=>{
          const todayDone=completedDayNames.has(todayWorkout?.name);
          const inProgress=activeLog&&todayWorkout&&activeLog.name===todayWorkout.name;
          const accentColor=inProgress?C.green:todayDone?C.green:C.accent;

          // After completing today, show the next upcoming session as a preview
          if(todayDone&&!inProgress){
            const sortedProgram=program.slice().sort((a,b)=>FULL.indexOf(a.day)-FULL.indexOf(b.day));
            const nextSess=sortedProgram.find(d=>FULL.indexOf(d.day)>todayIdx&&!completedDayNames.has(d.name))||sortedProgram.find(d=>!completedDayNames.has(d.name));
            const nextSets=nextSess?nextSess.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0):0;
            return(
              <Section accent={C.green}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <IcoCheck sz={14} col={C.green}/>
                  <span style={{fontSize:11,fontWeight:800,color:C.green,letterSpacing:"0.08em",textTransform:"uppercase"}}>
                    {todayWorkout?todayWorkout.name+" complete":"Session complete"}
                  </span>
                </div>
                {nextSess?(
                  <div>
                    <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Next Session — {nextSess.day} {(()=>{const todayDate=new Date();const dayDiff=(FULL.indexOf(nextSess.day)-FULL.indexOf(getTodayName())+7)%7||7;const d=new Date(todayDate);d.setDate(d.getDate()+dayDiff);return d.toLocaleDateString("en-US",{month:"numeric",day:"numeric"});})()}</div>
                    <div style={{fontSize:15,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:12}}>{nextSess.name}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:C.card2}}>
                      {[{v:nextSets,l:"Sets"},{v:nextSess.exercises.length,l:"Exercises"},{v:defaultRIR(meso.week,meso.totalWeeks,exp),l:"Target RIR"}].map((stat,i)=>(
                        <div key={i} style={{padding:"10px 8px",borderRight:i<2?"1px solid "+C.border+"60":undefined,textAlign:"center"}}>
                          <div style={{fontSize:20,fontWeight:900,color:C.accent,lineHeight:1}}>{stat.v}</div>
                          <div style={{fontSize:8,color:C.muted,letterSpacing:"0.12em",fontWeight:700,marginTop:3,textTransform:"uppercase"}}>{stat.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ):(
                  <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>All sessions for this week complete. Rest up — next week starts soon.</div>
                )}
              </Section>
            );
          }

          return(
            <Section accent={accentColor}>
              <SLbl>Today</SLbl>
              <div style={{fontSize:18,fontWeight:900,letterSpacing:"0.03em",textTransform:"uppercase",marginBottom:14}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</div>
              {todayWorkout?(
                <div>
                  <div style={{fontSize:15,fontWeight:900,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.04em"}}>{todayWorkout.name}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",marginBottom:14,background:C.card2}}>
                    {[{v:totalSets,l:"Sets"},{v:todayWorkout.exercises.length,l:"Exercises"},{v:defaultRIR(meso.week,meso.totalWeeks,exp),l:"Target RIR"}].map((stat,i)=>(
                      <div key={i} style={{padding:"12px 10px",borderRight:i<2?"1px solid "+C.border+"60":undefined,textAlign:"center"}}>
                        <div style={{fontSize:24,fontWeight:900,color:C.accent,lineHeight:1}}>{stat.v}</div>
                        <div style={{fontSize:8,color:C.muted,letterSpacing:"0.12em",fontWeight:700,marginTop:3,textTransform:"uppercase"}}>{stat.l}</div>
                      </div>
                    ))}
                  </div>
                  {inProgress?(
                    <div>
                      <button onClick={onResume} style={{width:"100%",padding:"13px",background:C.green+"18",color:C.green,border:"none",borderBottom:"2px solid "+C.green,fontSize:12,fontWeight:900,letterSpacing:"0.12em",cursor:"pointer",textTransform:"uppercase"}}>Resume Workout</button>
                      {confirmAbandon?(
                        <div style={{background:C.card2,padding:"12px 14px",marginTop:6}}>
                          <div style={{fontSize:11,color:C.muted2,marginBottom:8}}>Abandon this session? All progress will be lost.</div>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>setConfirmAbandon(false)} style={{flex:1,padding:"9px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,cursor:"pointer",fontSize:11,fontWeight:600}}>Keep Going</button>
                            <button onClick={()=>{setConfirmAbandon(false);onAbandon();}} style={{flex:1,padding:"9px",background:C.red+"22",border:"1px solid "+C.red+"44",borderRadius:4,color:C.red,cursor:"pointer",fontSize:11,fontWeight:700}}>Yes, Abandon</button>
                          </div>
                        </div>
                      ):(
                        <button onClick={()=>setConfirmAbandon(true)} style={{width:"100%",padding:"8px",background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",letterSpacing:"0.06em",marginTop:4}}>Abandon session</button>
                      )}
                    </div>
                  ):(
                    <button onClick={()=>onStart(null)} style={{width:"100%",padding:"13px",background:C.accent,color:"#000",border:"none",fontSize:12,fontWeight:900,letterSpacing:"0.12em",cursor:"pointer",textTransform:"uppercase"}}>Start Workout</button>
                  )}
                </div>
              ):(
                <div>
                  <div style={{fontSize:15,fontWeight:800,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em",color:C.muted2}}>Rest Day</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:14}}>{nextTraining?"Next up: "+nextTraining.day+" — "+nextTraining.name:"Next session starts next week."}</div>
                  <SLbl>Train anyway</SLbl>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {program.slice().sort((a,b)=>FULL.indexOf(a.day)-FULL.indexOf(b.day)).map(d=>{
                      const done=completedDayNames.has(d.name);
                      return(
                        <button key={d.id} onClick={()=>onStart(d)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:C.card2,border:"none",borderLeft:"3px solid "+(done?C.green:C.border2),color:done?C.muted:C.text,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left",textTransform:"uppercase",letterSpacing:"0.04em",opacity:done?0.6:1}}>
                          <span>{d.name}{done?" ✓":""}</span>
                          <span style={{fontSize:10,color:C.muted,fontWeight:400,textTransform:"none",letterSpacing:0}}>{d.exercises.length} exercises</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>
          );
        })()}

        {/* Drive nudge — shown after first session if not connected, one-time */}
        {history.length>0&&!driveConnected&&!driveNudgeDismissed?(
          <Section accent={C.blue}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:800,color:C.blue,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Back up your data</div>
                <div style={{fontSize:11,color:C.muted2,lineHeight:1.6,marginBottom:10}}>Connect Google Drive so your training history is never lost — even if the app is reinstalled.</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setShowProfile(true);setProfileDraft(profile?{...profile}:{name:"",sex:"male",experience:"intermediate",bodyweight:""});}} style={{padding:"7px 14px",background:C.blue,border:"none",borderRadius:4,color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer",letterSpacing:"0.06em"}}>Connect</button>
                  <button onClick={()=>{setDriveNudgeDismissed(true);try{localStorage.setItem("hyper_drive_nudge_dismissed","1");}catch(_){}}} style={{padding:"7px 12px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted,fontSize:11,cursor:"pointer"}}>Maybe later</button>
                </div>
              </div>
            </div>
          </Section>
        ):null}

        {/* Recent Sessions */}
        <Section>
          <SLbl>Recent Sessions</SLbl>
          {history.length===0?(
            <div style={{fontSize:12,color:C.muted,padding:"16px 0",textAlign:"center"}}>No sessions logged yet</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {history.slice(0,6).map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"baseline",gap:7}}>
                      <div style={{fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.day}</div>
                      <div style={{fontSize:10,color:C.muted}}>Week {s.week}</div>
                    </div>
                    <div style={{fontSize:10,color:C.muted2,marginTop:1}}>{s.date}{s.note?<span style={{fontStyle:"italic",marginLeft:6}}>"{s.note.slice(0,40)}{s.note.length>40?"…":""}"</span>:null}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,fontWeight:700,color:s.sets===s.planned?C.green:C.accent}}>{s.sets}/{s.planned}</div>
                      <div style={{fontSize:9,color:C.muted,letterSpacing:"0.06em"}}>SETS</div>
                    </div>
                    <button onClick={()=>onEdit(s,i)} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"4px 9px",color:C.muted2,fontSize:10,fontWeight:600,cursor:"pointer"}}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Additional session — tucked away, for the rare case */}
          {program.length>0?(
            <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid "+C.border+"60"}}>
              {showExtraPicker?(
                <div>
                  <div style={{fontSize:10,color:C.muted2,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Choose session</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {program.slice().sort((a,b)=>FULL.indexOf(a.day)-FULL.indexOf(b.day)).map(d=>(
                      <button key={d.id} onClick={()=>{setShowExtraPicker(false);onStart(d);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:C.card2,border:"none",borderLeft:"3px solid "+C.border2,color:C.text,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"left",textTransform:"uppercase",letterSpacing:"0.04em"}}>
                        <span>{d.name}</span>
                        <span style={{fontSize:10,color:C.muted,fontWeight:400,textTransform:"none",letterSpacing:0}}>{d.day}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>setShowExtraPicker(false)} style={{background:"none",border:"none",padding:"8px 0 0",color:C.muted,fontSize:10,cursor:"pointer",letterSpacing:"0.06em"}}>Cancel</button>
                </div>
              ):(
                <button onClick={()=>setShowExtraPicker(true)} style={{background:"none",border:"none",padding:0,color:C.muted,fontSize:10,cursor:"pointer",letterSpacing:"0.06em",fontWeight:600,textDecoration:"underline",textDecorationColor:C.border2}}>+ Log additional session</button>
              )}
            </div>
          ):null}
        </Section>

      </div>
    </div>
  );
}

function MesoTab({meso,mesoCount,onGlossary,history,program,muscles}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const exp=P.experience||"intermediate";
  const thisWeekSessions=history.filter(s=>s.week===meso.week&&(s.mesoNum==null||s.mesoNum===mesoCount));
  const completedDayNames=new Set(thisWeekSessions.map(s=>s.day));
  const sessions=program.map(d=>({
    day:d.name,weekday:d.day,
    done:completedDayNames.has(d.name),
    sets:thisWeekSessions.find(s=>s.day===d.name)?thisWeekSessions.find(s=>s.day===d.name).sets:0,
    planned:d.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0),
  }));
  const completed=sessions.filter(s=>s.done).length;
  const weeklyVol={};
  program.forEach(d=>{d.exercises.forEach(ex=>{
    if(!weeklyVol[ex.muscle]) weeklyVol[ex.muscle]=0;
    const mev=ex.mevSets||ex.sets.filter(s=>s.type!=="drop").length||3;
    const mrv=ex.mrvSets||mev+2;
    weeklyVol[ex.muscle]+=rampedSets(mev,mrv,meso.week,meso.totalWeeks);
  });});

  // Actual sets logged this week per muscle — from session history
  const actualVol={};
  thisWeekSessions.forEach(session=>{
    if(!session.exercises) return;
    session.exercises.forEach(ex=>{
      if(!ex.muscle||!ex.sets) return;
      const done=ex.sets.filter(s=>s.done&&!s.incomplete&&s.type!=="drop").length;
      if(!actualVol[ex.muscle]) actualVol[ex.muscle]=0;
      actualVol[ex.muscle]+=done;
    });
  });

  const programMuscles=Object.keys(weeklyVol).filter(m=>muscles[m]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {/* Meso header */}
      <Section accent={C.accent}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <SLbl>Current Meso</SLbl>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{fontSize:15,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.04em"}}>{meso.label}</div>
              {meso.mode==="specialization"?<Tag label="Spec" color={C.blue}/>:null}
            </div>
            {meso.startDate?<div style={{fontSize:10,color:C.muted,marginTop:2}}>{mesoStartLabel(meso.startDate)} {meso.startDate}</div>:null}
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:26,fontWeight:900,color:C.accent,lineHeight:1}}>W{meso.week}</div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontWeight:700}}>OF {meso.totalWeeks}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:0}}>
          {Array(meso.totalWeeks).fill(null).map((_,i)=>(
            <div key={i} style={{flex:1,background:i===meso.week-1?C.accent:i<meso.week-1?C.accent+"33":C.card2,padding:"10px 4px",textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:900,color:i===meso.week-1?"#000":i<meso.week-1?C.accent:C.muted2}}>{i===meso.totalWeeks-1?"DL":"W"+(i+1)}</div>
              <div style={{fontSize:8,color:i===meso.week-1?"#000":C.muted,marginTop:2,letterSpacing:"0.06em"}}>RIR {defaultRIR(i+1,meso.totalWeeks,exp)}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Session consistency */}
      <Section>
        <SLbl>Session Consistency — Week {meso.week}</SLbl>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sessions.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,opacity:s.done?1:0.45}}>
              <div style={{width:3,height:32,background:s.done?C.green:C.border2,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:s.done?C.text:C.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.day}</div>
                <div style={{fontSize:10,color:C.muted}}>{s.weekday}</div>
              </div>
              <div style={{fontSize:11,color:C.muted}}>{s.done?s.sets+"/"+s.planned+" sets":"Upcoming"}</div>
              {s.done&&s.sets<s.planned?<Tag label={s.planned-s.sets+" skipped"} color={C.accent}/>:null}
            </div>
          ))}
        </div>
      </Section>

      {/* Volume landmarks */}
      <Section>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <SLbl>Volume vs Landmarks</SLbl>
            <div style={{fontSize:10,color:C.muted}}>Week {meso.week} — actual vs planned sets per muscle</div>
          </div>
          <button onClick={onGlossary} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"3px 9px",color:C.muted2,fontSize:10,cursor:"pointer",fontWeight:600,letterSpacing:"0.05em"}}>Glossary</button>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          {[{l:"Below MEV",c:C.accent+"88"},{l:"In range",c:C.green},{l:"Above MAV",c:C.red},{l:"Planned",c:C.border2}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>
              <div style={{width:8,height:4,background:x.c}}/>{x.l}
            </div>
          ))}
        </div>
        {programMuscles.length===0?<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>Build your program to see volume tracking</div>:programMuscles.map(m=>{
          const lm=muscles[m];
          const planned=weeklyVol[m]||0;
          const actual=actualVol[m]||0;
          const hasActual=actual>0;
          const sv=hasActual?actual:planned;
          const pv=Math.min(sv/lm.mrv,1);
          const plannedPv=Math.min(planned/lm.mrv,1);
          const mc=MC[m]||"#888";
          const sl=lm.mev===0?"BONUS":sv<lm.mev?"BELOW MEV":sv<=lm.mav?"IN RANGE":sv<lm.mrv?"HIGH VOL":"AT MRV";
          const fc=lm.mev===0?C.accent:sv>=lm.mrv?C.red:sv>lm.mav?C.red:sv>=lm.mev?C.green:C.accent+"88";
          const sc=fc===C.muted+"66"?C.muted:fc;
          const freq=program.reduce((a,d)=>a+(d.exercises.some(e=>e.muscle===m)?1:0),0);
          const muscleSessionsDone=program.filter(d=>d.exercises.some(e=>e.muscle===m)).every(d=>completedDayNames.has(d.name));
          return(
            <div key={m} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:mc}}/>
                  <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>{m}</span>
                  <span style={{fontSize:9,color:C.muted,background:C.card2,padding:"1px 5px"}}>{freq}×/wk</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {hasActual?<span style={{fontSize:11,fontWeight:700,color:C.text}}>{actual}<span style={{fontSize:10,fontWeight:400,color:C.muted}}> logged</span></span>:null}
                  {hasActual?<Tag label={sl} color={sc}/>:null}
                </div>
              </div>
              <div style={{position:"relative",height:6,background:C.card2,marginBottom:18}}>
                <div style={{position:"absolute",left:(lm.mev/lm.mrv*100)+"%",top:-5,bottom:-5,width:1.5,background:C.border2,zIndex:3}}/>
                <div style={{position:"absolute",left:(lm.mav/lm.mrv*100)+"%",top:-5,bottom:-5,width:1.5,background:C.border2,zIndex:3}}/>
                {hasActual?<div style={{position:"absolute",top:0,left:0,height:"100%",width:(plannedPv*100)+"%",background:C.border2,zIndex:1}}/>:null}
                <div style={{position:"absolute",top:0,left:0,height:"100%",width:(pv*100)+"%",background:hasActual?fc:C.border2,zIndex:2,transition:"width .4s"}}/>
                <div style={{position:"absolute",left:(lm.mev/lm.mrv*100)+"%",top:10,transform:"translateX(-50%)",fontSize:8,color:C.muted,maxWidth:"calc(100vw - 40px)",textAlign:"center"}}>MEV {lm.mev}</div>
                <div style={{position:"absolute",left:(lm.mav/lm.mrv*100)+"%",top:10,transform:"translateX(-50%)",fontSize:8,color:C.muted,maxWidth:"calc(100vw - 40px)",textAlign:"center"}}>MAV {lm.mav}</div>
                <div style={{position:"absolute",right:0,top:10,fontSize:8,color:C.muted,maxWidth:"calc(100vw - 40px)",textAlign:"center"}}>MRV {lm.mrv}</div>
              </div>
              {hasActual&&actual<planned&&!muscleSessionsDone?<div style={{fontSize:10,color:C.muted2,display:"flex",alignItems:"center",gap:4}}><IcoWarn sz={9} col={C.muted2}/> {planned-actual} sets still to go this week</div>:null}
              {INDIRECT_VOLUME_MUSCLES.has(m)?<div style={{fontSize:10,color:C.muted2,display:"flex",alignItems:"center",gap:4}}><IcoInfo/> <span>Squats, RDLs &amp; lunges provide indirect stimulus — direct sets are a bonus</span></div>:null}
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function ChartDot(props){
  const C=useContext(ThemeCtx);
  const {cx,cy,payload}=props;
  if(!cx||!cy) return null;
  if(payload&&payload.deload) return <circle cx={cx} cy={cy} r={3} fill={C.muted} opacity={0.5}/>;
  return <circle cx={cx} cy={cy} r={4} fill={C.accent}/>;
}

function HistoryTab({onGlossary,liftHistory}){
  const C=useContext(ThemeCtx);
  if(!liftHistory||liftHistory.length===0){
    return(
      <div style={{padding:"40px 0",textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>📈</div>
        <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>No lift history yet</div>
        <div style={{fontSize:12,color:C.muted2,lineHeight:1.7}}>Log your first session to start tracking progress across mesocycles.</div>
      </div>
    );
  }
  const allExercises=[...new Set(liftHistory.map(e=>e.exercise))].sort();
  const allMuscles=[...new Set(liftHistory.map(e=>e.muscle))].sort((a,b)=>Object.keys(MC).indexOf(a)-Object.keys(MC).indexOf(b));
  const [aMuscle,setAMuscle]=useState(allMuscles[0]||"");
  const [aEx,setAEx]=useState(allExercises[0]||"");
  const [zoom,setZoom]=useState("alltime");
  // Reset selections when history grows (e.g. after a session is completed)
  useEffect(()=>{
    if(allMuscles.length>0&&!allMuscles.includes(aMuscle)){
      setAMuscle(allMuscles[0]);
      const exs=allExercises.filter(n=>{const f=liftHistory.find(e=>e.exercise===n);return f&&f.muscle===allMuscles[0];});
      if(exs.length>0) setAEx(exs[0]);
    }
  },[liftHistory.length]);
  const exsForMuscle=allExercises.filter(n=>{const f=liftHistory.find(e=>e.exercise===n);return f&&f.muscle===aMuscle;});
  const pickMuscle=m=>{
    setAMuscle(m);
    const exs=allExercises.filter(n=>{const f=liftHistory.find(e=>e.exercise===n);return f&&f.muscle===m;});
    if(exs.length>0) setAEx(exs[0]);
  };
  const allChartData=buildChartData(liftHistory,aEx);
  const maxMeso=allChartData.length>0?Math.max.apply(null,allChartData.map(d=>d.meso)):1;
  const chartData=zoom==="thismeso"?allChartData.filter(d=>d.meso===maxMeso):allChartData;
  const bounds=[];
  let lastM=null;
  chartData.forEach(d=>{if(d.meso!==lastM&&lastM!==null) bounds.push(d.label);lastM=d.meso;});

  // Meso peaks: max top-set weight per meso for selected exercise, excluding deloads
  const mesoPeaks=(()=>{
    const entries=liftHistory.filter(e=>e.exercise===aEx&&!e.isDeload);
    const byMeso={};
    entries.forEach(e=>{
      if(!byMeso[e.mesoNum]||e.topSetWeight>byMeso[e.mesoNum].weight){
        byMeso[e.mesoNum]={mesoNum:e.mesoNum,label:e.mesoLabel||("Meso "+e.mesoNum),weight:e.topSetWeight};
      }
    });
    return Object.values(byMeso).sort((a,b)=>a.mesoNum-b.mesoNum);
  })();

  const prMap={};
  liftHistory.forEach(e=>{
    if(!e.isDeload){
      const est=e1rm(e.topSetWeight,e.topSetReps||1);
      if(!prMap[e.exercise]||est>prMap[e.exercise].e1rmVal){
        prMap[e.exercise]={name:e.exercise,weight:e.topSetWeight,reps:e.topSetReps||1,e1rmVal:est,date:e.date,muscle:e.muscle};
      }
    }
  });
  const prs=Object.values(prMap).sort((a,b)=>Object.keys(MC).indexOf(a.muscle)-Object.keys(MC).indexOf(b.muscle)).slice(0,6);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {/* Lift chart */}
      <Section>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <SLbl>Lift Progress</SLbl>
          <button onClick={onGlossary} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"3px 9px",color:C.muted2,fontSize:10,cursor:"pointer",fontWeight:600,letterSpacing:"0.05em"}}>Glossary</button>
        </div>
        {liftHistory.length===0?(
          <div style={{padding:"32px 0",textAlign:"center",color:C.muted,fontSize:12}}>Complete your first session to start tracking lift progress</div>
        ):(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:12}}>
              <select value={aMuscle} onChange={e=>pickMuscle(e.target.value)} style={{background:C.card2,border:"none",borderBottom:"2px solid "+C.border2,padding:"9px 10px",color:C.text,fontSize:11,fontWeight:700,outline:"none",cursor:"pointer",width:"100%"}}>
                {allMuscles.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <select value={aEx} onChange={e=>setAEx(e.target.value)} style={{background:C.card2,border:"none",borderBottom:"2px solid "+C.border2,padding:"9px 10px",color:C.text,fontSize:11,fontWeight:700,outline:"none",cursor:"pointer",width:"100%"}}>
                {exsForMuscle.length>0?exsForMuscle.map(n=><option key={n} value={n}>{n}</option>):<option>No data</option>}
              </select>
            </div>
            <div style={{display:"flex",gap:4,marginBottom:14}}>
              {[{id:"alltime",l:"All Mesos"},{id:"thismeso",l:"This Meso"}].map(z=>(
                <button key={z.id} onClick={()=>setZoom(z.id)} style={{padding:"5px 12px",border:"none",borderBottom:"2px solid "+(zoom===z.id?C.blue:"transparent"),background:"none",color:zoom===z.id?C.blue:C.muted,fontSize:11,fontWeight:zoom===z.id?800:500,cursor:"pointer",letterSpacing:"0.04em"}}>{z.l}</button>
              ))}
            </div>
            {chartData.length>0?(
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <XAxis dataKey="label" tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false} interval={zoom==="alltime"?2:0}/>
                    <YAxis tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
                    <Tooltip contentStyle={{background:C.card2,border:"none",borderRadius:4,fontSize:11}} itemStyle={{color:C.accent}} labelStyle={{color:C.muted2}} formatter={(v,_,entry)=>[v+" lbs"+(entry.payload&&entry.payload.deload?" (deload)":""),entry.payload?.date||""]} labelFormatter={l=>l}/>
                    {zoom==="alltime"?bounds.map(b=><ReferenceLine key={b} x={b} stroke={C.border2} strokeDasharray="3 3"/>):null}
                    <Line type="monotone" dataKey="v" stroke={C.accent} strokeWidth={2} dot={<ChartDot/>} activeDot={{r:6,fill:C.accent}} connectNulls/>
                  </LineChart>
                </ResponsiveContainer>
                {zoom==="alltime"?(
                  <div style={{marginTop:10,padding:"9px 12px",background:C.card2,borderLeft:"3px solid "+C.blue,fontSize:11,color:C.muted2,lineHeight:1.5,display:"flex",alignItems:"flex-start",gap:7}}>
                    <IcoUp sz={12} col={C.blue}/>
                    <span>The dip after each deload is intentional. You come back lighter and build to a new peak.</span>
                  </div>
                ):null}
              </div>
            ):<div style={{padding:"24px 0",textAlign:"center",color:C.muted,fontSize:12}}>No history yet for this exercise</div>}
          </div>
        )}
      </Section>

      {/* Meso peaks */}
      {mesoPeaks.length>=2?(
        <Section>
          <SLbl>Peak Per Meso — {aEx}</SLbl>
          <div style={{fontSize:10,color:C.muted2,marginBottom:14,lineHeight:1.5}}>Top set weight each block. The clearest signal of long-term progress.</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {(()=>{
              const maxW=Math.max(...mesoPeaks.map(p=>p.weight));
              const minW=Math.min(...mesoPeaks.map(p=>p.weight));
              return mesoPeaks.map((p,i)=>{
                const prev=mesoPeaks[i-1];
                const diff=prev?p.weight-prev.weight:null;
                const pct=prev?parseFloat(((p.weight-prev.weight)/prev.weight*100).toFixed(1)):null;
                const trending=diff===null?null:diff>0?"up":diff<0?"down":"flat";
                const barColor=trending==="up"?C.green:trending==="down"?C.red:trending==="flat"?C.muted:C.accent;
                const barW=maxW>minW?((p.weight-minW)/(maxW-minW)*60+40):80;
                return(
                  <div key={p.mesoNum}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:700,minWidth:52,textTransform:"uppercase",letterSpacing:"0.04em"}}>{p.label}</div>
                      <div style={{flex:1,height:5,background:C.card2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:barW+"%",background:barColor,transition:"width .5s"}}/>
                      </div>
                      <div style={{fontSize:13,fontWeight:800,color:C.text,minWidth:52,textAlign:"right"}}>{p.weight} lbs</div>
                      <div style={{minWidth:44,textAlign:"right"}}>
                        {trending==="up"?<span style={{fontSize:11,fontWeight:700,color:C.green}}>+{diff}</span>:
                         trending==="down"?<span style={{fontSize:11,fontWeight:700,color:C.red}}>{diff}</span>:
                         trending==="flat"?<span style={{fontSize:11,color:C.muted}}>—</span>:
                         <span style={{fontSize:10,color:C.muted}}>Base</span>}
                      </div>
                    </div>
                    {pct!==null&&trending!=="flat"?<div style={{paddingLeft:62,fontSize:9,color:trending==="up"?C.green:C.red,letterSpacing:"0.04em"}}>{trending==="up"?"+":""}{pct}% vs previous block</div>:null}
                  </div>
                );
              });
            })()}
          </div>
          {(()=>{
            if(mesoPeaks.length<2) return null;
            const first=mesoPeaks[0].weight;
            const last=mesoPeaks[mesoPeaks.length-1].weight;
            const totalDiff=last-first;
            const totalPct=parseFloat(((totalDiff/first)*100).toFixed(1));
            const up=totalDiff>0;
            const flat=totalDiff===0;
            return(
              <div style={{marginTop:14,padding:"9px 12px",background:flat?C.card2:up?C.green+"12":C.red+"12",borderLeft:"3px solid "+(flat?C.border2:up?C.green:C.red),display:"flex",alignItems:"center",gap:8}}>
                {flat?<span style={{fontSize:11,color:C.muted}}>No change across {mesoPeaks.length} mesos.</span>:(
                  <>{up?<IcoUp sz={12} col={C.green}/>:<IcoDown sz={12} col={C.red}/>}
                  <span style={{fontSize:11,color:up?C.green:C.red,fontWeight:700}}>{up?"+":""}{totalDiff} lbs ({up?"+":""}{totalPct}%) across {mesoPeaks.length} mesos</span></>
                )}
              </div>
            );
          })()}
        </Section>
      ):null}

      {/* Personal records */}
      <Section>
        <SLbl>Personal Records</SLbl>
        {prs.length===0?<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>No sessions logged yet</div>:(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {prs.map((p,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em"}}>{p.name}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2,display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{color:MC[p.muscle]||"#888",fontWeight:700}}>{p.muscle}</span>
                    {p.date?<span>{p.date}</span>:null}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontSize:14,fontWeight:900,color:C.accent}}>{p.weight}<span style={{fontSize:10,fontWeight:400,color:C.muted,marginLeft:2}}>lbs</span></span>
                    {p.reps>1?<div style={{fontSize:9,color:C.muted,letterSpacing:"0.06em"}}>×{p.reps} REPS</div>:null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function ProgressScreen({meso,mesoCount,onGlossary,liftHistory,history,program,muscles}){
  const C=useContext(ThemeCtx);
  const hasData=liftHistory&&liftHistory.length>0;
  const hasMeso=meso&&program&&program.length>0;
  // Default to history tab if no active meso but data exists
  const [sub,setSub]=useState(hasMeso?"meso":hasData?"history":"meso");
  if(!hasMeso&&!hasData){
    return(
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center"}}>
        <div style={{color:C.muted,fontSize:13,lineHeight:1.7}}>Build your first mesocycle to start tracking progress.</div>
      </div>
    );
  }
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",background:C.surf,borderBottom:"1px solid "+C.border+"60",flexShrink:0}}>
        {[{id:"meso",l:"This Meso",disabled:!hasMeso},{id:"history",l:"History"}].map(t=>(
          <button key={t.id} onClick={()=>!t.disabled&&setSub(t.id)} style={{flex:1,padding:"12px 0",background:"none",border:"none",borderBottom:"2px solid "+(sub===t.id?C.accent:"transparent"),color:sub===t.id?C.accent:t.disabled?C.muted+"44":C.muted,fontSize:11,fontWeight:sub===t.id?800:500,cursor:t.disabled?"default":"pointer",letterSpacing:"0.08em",textTransform:"uppercase"}}>{t.l}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{padding:"6px 14px 100px"}}>
          {sub==="meso"&&hasMeso?<MesoTab meso={meso} mesoCount={mesoCount} onGlossary={onGlossary} history={history} program={program} muscles={muscles}/>:null}
          {sub==="meso"&&!hasMeso?<div style={{padding:"40px 0",textAlign:"center",color:C.muted,fontSize:13,lineHeight:1.7}}>No active mesocycle. Your lift history is in the History tab.</div>:null}
          {sub==="history"?<HistoryTab onGlossary={onGlossary} liftHistory={liftHistory}/>:null}
        </div>
      </div>
    </div>
  );
}

function PlanCurrent({meso,program,library,onNewMeso,onUpdateDay,onSwapExercise,onRemoveExercise,onAddExercise,onGlossary}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const muscles=getMuscles(P.experience||"intermediate",P.sex||"male");
  const [expDay,setExpDay]=useState(null);
  const [confirmNew,setConfirmNew]=useState(false);
  const [picker,setPicker]=useState(null);

  // Compute week-1 planned volume per muscle to surface pre-session warnings
  const weeklyVol=useMemo(()=>{
    const vol={};
    program.forEach(d=>d.exercises.forEach(ex=>{
      vol[ex.muscle]=(vol[ex.muscle]||0)+ex.mevSets;
    }));
    return vol;
  },[program]);

  const volWarnings=useMemo(()=>{
    const w={};
    Object.entries(weeklyVol).forEach(([m,total])=>{
      const lm=muscles[m];
      if(!lm) return;
      if(total>lm.mrv) w[m]={level:"over",msg:`${total} sets — exceeds MRV (${lm.mrv}). Reduce volume.`};
      else if(total>lm.mav) w[m]={level:"high",msg:`${total} sets — above MAV (${lm.mav}). Too high for week 1.`};
    });
    return w;
  },[weeklyVol,muscles]);
  return(
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      {picker?<ExPicker library={library} title={picker.swapName?"Swap Exercise":"Add Exercise"} excludeNames={picker.swapName?[]:(program.find(d=>d.id===picker.dayId)||{exercises:[]}).exercises.map(e=>e.name)} defaultMuscle={picker.swapMuscle||"All"} onAdd={ex=>{
        if(picker.swapName) onSwapExercise(picker.dayId,picker.swapName,ex);
        else onAddExercise(picker.dayId,ex);
        setPicker(null);
      }} onClose={()=>setPicker(null)}/>:null}
      <div style={{padding:"6px 14px 100px",display:"flex",flexDirection:"column",gap:6}}>

        {/* Meso header */}
        <Section accent={C.accent}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <SLbl>Active Mesocycle</SLbl>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{fontSize:18,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.04em"}}>{meso.label}</div>
                {meso.mode==="specialization"?<Tag label="Spec" color={C.blue}/>:null}
              </div>
              {meso.mode==="specialization"&&meso.spec?(
                <div style={{fontSize:10,color:C.blue,marginTop:4,lineHeight:1.5,letterSpacing:"0.03em"}}>
                  Target: <strong>{meso.spec.targetMuscle}</strong> · 3×/wk MEV→MRV · all others at MV
                </div>
              ):null}
              {meso.startDate?<div style={{fontSize:10,color:C.muted,marginTop:2}}>{mesoStartLabel(meso.startDate)} {meso.startDate}</div>:null}
            </div>
            <button onClick={()=>setConfirmNew(true)} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"6px 12px",color:C.muted2,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase"}}>New Meso</button>
          </div>
          {/* Week tiles */}
          <div style={{display:"flex",gap:4}}>
            {Array(meso.totalWeeks).fill(null).map((_,i)=>(
              <div key={i} style={{flex:1,background:i===meso.week-1?C.accent:C.card2,padding:"10px 4px",textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:900,color:i===meso.week-1?"#000":C.muted2}}>{i===meso.totalWeeks-1?"DL":"W"+(i+1)}</div>
                <div style={{fontSize:8,color:i===meso.week-1?"#000":C.muted,marginTop:2,letterSpacing:"0.06em"}}>RIR {defaultRIR(i+1,meso.totalWeeks,P?.experience||"intermediate")}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Confirm new meso */}
        {confirmNew?(
          <Section accent={C.accent}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>Start a new mesocycle?</div>
            <div style={{fontSize:11,color:C.muted2,marginBottom:12,lineHeight:1.5}}>Your logged sessions are preserved. Your current program will be replaced.</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setConfirmNew(false)} style={{flex:1,padding:"9px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,cursor:"pointer",fontSize:11,fontWeight:600}}>Cancel</button>
              <button onClick={()=>{setConfirmNew(false);onNewMeso();}} style={{flex:2,padding:"9px",background:C.accent,border:"none",color:"#000",cursor:"pointer",fontSize:11,fontWeight:800,letterSpacing:"0.06em",textTransform:"uppercase"}}>Build New Meso</button>
            </div>
          </Section>
        ):null}

        {/* Training days */}
        <div>
          <div style={{padding:"4px 0 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <SLbl style={{marginBottom:0}}>Training Days</SLbl>
            <button onClick={onGlossary} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"3px 9px",color:C.muted2,fontSize:10,cursor:"pointer",fontWeight:600,letterSpacing:"0.05em"}}>Glossary</button>
          </div>
          {program.map((day,di)=>(
            <div key={day.id} style={{background:C.card,borderLeft:"3px solid "+(expDay===day.id?C.accent:C.border2),marginBottom:4,overflow:"hidden"}}>
              <div onClick={()=>setExpDay(expDay===day.id?null:day.id)} style={{display:"flex",alignItems:"center",padding:"12px 14px",cursor:"pointer",gap:10}}>
                <div style={{width:20,height:20,background:expDay===day.id?C.accent:C.card2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:9,fontWeight:900,color:expDay===day.id?"#000":C.muted2}}>{di+1}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.04em"}}>{day.name}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:1,letterSpacing:"0.06em"}}>{day.day} · {day.exercises.length} exercises</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{expDay===day.id?<polyline points="18 15 12 9 6 15"/>:<polyline points="6 9 12 15 18 9"/>}</svg>
              </div>
              {expDay===day.id?(
                <div style={{borderTop:"1px solid "+C.border+"60",padding:"10px 14px 12px"}}>
                  <SLbl>Exercises</SLbl>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {day.exercises.map((ex)=>(
                      <div key={ex.id} style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:MC[ex.muscle]||"#888",flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700}}>{ex.name}</div>
                          <div style={{fontSize:10,color:C.muted}}>{ex.muscle} · {ex.sets.filter(s=>s.type!=="drop").length} sets</div>
                        </div>
                        <button onClick={()=>setPicker({dayId:day.id,swapName:ex.name,swapMuscle:ex.muscle})} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"4px 8px",color:C.muted2,fontSize:10,fontWeight:600,cursor:"pointer",letterSpacing:"0.04em"}}>Swap</button>
                        {day.exercises.length>1?(
                          <button onClick={()=>onRemoveExercise(day.id,ex.name)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}}>
                            <IcoX sz={12} col={C.muted}/>
                          </button>
                        ):null}
                      </div>
                    ))}
                  </div>
                  {/* Volume warnings for muscles in this day */}
                  {(()=>{
                    const dayMuscles=[...new Set(day.exercises.map(e=>e.muscle))];
                    const warnings=dayMuscles.filter(m=>volWarnings[m]);
                    if(!warnings.length) return null;
                    return(
                      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
                        {warnings.map(m=>(
                          <div key={m} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"7px 10px",background:volWarnings[m].level==="over"?C.red+"12":C.accent+"12",borderLeft:"3px solid "+(volWarnings[m].level==="over"?C.red:C.accent)}}>
                            <IcoWarn sz={10} col={volWarnings[m].level==="over"?C.red:C.accent}/>
                            <div style={{fontSize:10,color:C.muted2,lineHeight:1.4}}>
                              <strong style={{color:volWarnings[m].level==="over"?C.red:C.accent}}>{m}:</strong> {volWarnings[m].msg}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <button onClick={()=>setPicker({dayId:day.id})} style={{width:"100%",marginTop:12,padding:"8px",background:C.card2,border:"none",borderLeft:"3px solid "+C.accent,color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"left",letterSpacing:"0.06em",textTransform:"uppercase"}}>
                    + Add Exercise
                  </button>
                </div>
              ):null}
            </div>
          ))}
        </div>

        <div style={{padding:"8px 0 4px",fontSize:10,color:C.muted2,lineHeight:1.6,display:"flex",alignItems:"flex-start",gap:7}}>
          <IcoWarn sz={12} col={C.muted2}/>
          Week 1 is your baseline. Start conservative — RIR 3 or higher. Log your RIR and the app takes over from Week 2.
        </div>
      </div>
    </div>
  );
}

function PlanBuilder({meso,library,onLaunch,onBack,onCancel}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const muscles=getMuscles(P.experience||"intermediate",P.sex||"male");
  const [step,setStep]=useState(0);
  const [mode,setMode]=useState(null);
  const [bName,setBName]=useState("");
  const [bWeeks,setBWeeks]=useState(5);
  const [bDays,setBDays]=useState([]);
  const [qSplit,setQSplit]=useState("Push/Pull/Legs");
  const [qPriority,setQPriority]=useState(null);
  const [availDays,setAvailDays]=useState(["Monday","Tuesday","Wednesday","Thursday","Friday"]);
  const [repRange,setRepRange]=useState(meso?.repRange||"hypertrophy");
  const [picker,setPicker]=useState(null);

  const needsPriority=splitNeedsPriority(qSplit,availDays.length);

  const addDay=()=>{
    const used=bDays.map(d=>d.day);
    const next=WEEK_DAYS.find(d=>!used.includes(d))||"Monday";
    setBDays(p=>[...p,{id:uid("d"),day:next,name:"",exercises:[]}]);
  };
  const dupDays=bDays.filter((d,i)=>bDays.findIndex(x=>x.day===d.day)!==i).map(d=>d.day);
  const rmDay=id=>setBDays(p=>p.filter(d=>d.id!==id));
  const updDay=(id,f,v)=>setBDays(p=>p.map(d=>d.id!==id?d:{...d,[f]:v}));
  const addEx=(dayId,ex)=>setBDays(p=>p.map(d=>{
    if(d.id!==dayId) return d;
    if(d.exercises.find(e=>e.name===ex.name)) return d;
    // Calculate MEV-based set counts using profile — consistent with Quick Build
    const lm=muscles[ex.muscle];
    const mevS=lm?Math.max(2,Math.min(5,Math.round(lm.mev/2))):3;
    const mrvS=lm?Math.max(mevS+1,Math.min(mevS+3,Math.round(lm.mav/2))):mevS+2;
    const mvS=lm?Math.max(1,Math.round(lm.mv/2)):Math.ceil(mevS/2);
    const nx={...ex,id:uid("ex"),lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",mevSets:mevS,mrvSets:mrvS,mvSets:mvS,sets:Array(mevS).fill(null).map(()=>newSet("","normal"))};
    return {...d,exercises:[...d.exercises,nx]};
  }));
  const rmEx=(dayId,exName)=>setBDays(p=>p.map(d=>d.id!==dayId?d:{...d,exercises:d.exercises.filter(e=>e.name!==exName)}));
  const chgSets=(dayId,exName,delta)=>setBDays(p=>p.map(d=>{
    if(d.id!==dayId) return d;
    return {...d,exercises:d.exercises.map(e=>{
      if(e.name!==exName) return e;
      const n=Math.max(1,e.sets.length+delta);
      if(n>e.sets.length){const newSets=Array(n-e.sets.length).fill(null).map(()=>newSet(""));return {...e,sets:[...e.sets,...newSets]};}
      return {...e,sets:e.sets.slice(0,n)};
    })};
  }));

  const canLaunch=bName.trim()&&bDays.length>0&&bDays.every(d=>d.name.trim()&&d.exercises.length>0);
  const doLaunch=()=>onLaunch({label:bName.trim(),week:1,totalWeeks:bWeeks,repRange:repRange||"hypertrophy"},bDays.map(d=>({...d,name:d.name.trim()})));

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {picker?(
        <ExPicker library={library} title={picker&&picker.includes("__swap__")?"Swap Exercise":"Add Exercise"} onAdd={ex=>{
          if(picker.includes("__swap__")){
            const parts=picker.split("__swap__");
            const dayId=parts[0];
            const oldName=parts[1];
            setBDays(p=>p.map(d=>{
              if(d.id!==dayId) return d;
              return {...d,exercises:d.exercises.map(e=>{
                if(e.name!==oldName) return e;
                return (()=>{
                  const lm=muscles[ex.muscle];
                  const mevS=lm?Math.max(2,Math.min(5,Math.round(lm.mev/2))):3;
                  const mrvS=lm?Math.max(mevS+1,Math.min(mevS+3,Math.round(lm.mav/2))):mevS+2;
                  const mvS=lm?Math.max(1,Math.round(lm.mv/2)):Math.ceil(mevS/2);
                  return {...ex,id:uid("ex"),lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",mevSets:mevS,mrvSets:mrvS,mvSets:mvS,sets:Array(mevS).fill(null).map(()=>newSet("","normal"))};
                })();
              })};
            }));
          } else {
            addEx(picker,ex);
          }
          setPicker(null);
        }} onClose={()=>setPicker(null)}/>
      ):null}
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border+"60",padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.15em",textTransform:"uppercase",color:C.text}}>New Mesocycle</div>
          {meso?<button onClick={onCancel} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"5px 10px",color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:"0.05em"}}>Cancel</button>:null}
        </div>
        <div style={{display:"flex",gap:4}}>
          {["Details","Training Days","Review"].map((s,i)=>(
            <div key={s} style={{flex:1,height:2,background:i<=step?C.accent:C.border}}/>
          ))}
        </div>
        <div style={{fontSize:9,color:C.accent,marginTop:6,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700}}>{["Details","Training Days","Review"][step]}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{padding:"16px 14px 24px"}}>
          {step===0?(
            <div>
              {!mode?(
                <div>
                  <div style={{fontSize:10,color:C.muted2,marginBottom:20,lineHeight:1.6,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>How do you want to build your mesocycle?</div>
                  <button onClick={()=>setMode("quick")} style={{width:"100%",background:C.card2,border:"none",borderLeft:"3px solid "+C.accent,borderRadius:0,padding:"18px 16px",marginBottom:8,textAlign:"left",cursor:"pointer",display:"block",transition:"all .12s"}}>
                    <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>Quick Build</div>
                    <div style={{fontSize:11,color:C.muted2,lineHeight:1.5}}>Pick your training days and split. The app fills in exercises — you can edit before launching.</div>
                  </button>
                  <button onClick={()=>setMode("manual")} style={{width:"100%",background:C.card,border:"none",borderLeft:"3px solid "+C.border2,borderRadius:0,padding:"18px 16px",textAlign:"left",cursor:"pointer",display:"block",transition:"all .12s"}}>
                    <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>Build Manually</div>
                    <div style={{fontSize:11,color:C.muted2,lineHeight:1.5}}>Add training days and exercises yourself from scratch.</div>
                  </button>
                  {onBack&&<button onClick={onBack} style={{background:"none",border:"none",color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",marginTop:16,padding:0,letterSpacing:"0.05em"}}>← Change program type</button>}
                </div>
              ):null}
              {mode==="quick"?(
                <div>
                  <button onClick={()=>setMode(null)} style={{background:"none",border:"none",color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:20,padding:0,letterSpacing:"0.05em"}}>← Back</button>

                  {/* 01 — Meso Name */}
                  <div style={{marginBottom:24}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={{fontSize:10,fontWeight:800,background:C.accent,color:"#000",padding:"2px 7px",letterSpacing:"0.05em"}}>01</span>
                      <span style={{fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:C.text}}>Meso Name</span>
                    </div>
                    <div style={{background:C.card2,padding:"4px 14px"}}>
                      <input value={bName} onChange={e=>setBName(e.target.value)} placeholder="E.G., HYPERTROPHY BLOCK A" style={{width:"100%",background:"transparent",border:"none",borderBottom:"2px solid "+(bName?C.accent:C.border2),padding:"12px 0",color:C.text,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",textTransform:"uppercase",letterSpacing:"0.05em"}}/>
                    </div>
                  </div>

                  {/* 02 — Training days */}
                  <div style={{marginBottom:24}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={{fontSize:10,fontWeight:800,background:C.accent,color:"#000",padding:"2px 7px",letterSpacing:"0.05em"}}>02</span>
                      <span style={{fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:C.text}}>Frequency</span>
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((short,i)=>{
                        const full=WEEK_DAYS[i];
                        const on=availDays.includes(full);
                        return(
                          <button key={full} onClick={()=>setAvailDays(p=>on?p.filter(d=>d!==full):[...p.filter(d=>d!==full),full].sort((a,b)=>WEEK_DAYS.indexOf(a)-WEEK_DAYS.indexOf(b)))} style={{flex:1,height:52,borderRadius:0,border:"none",background:on?C.accent:C.card2,color:on?"#000":C.muted,fontSize:9,fontWeight:800,cursor:"pointer",transition:"all .12s",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,letterSpacing:"0.05em"}}>
                            {short}
                            {on?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:null}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{fontSize:10,color:C.muted2,marginTop:6,letterSpacing:"0.03em"}}>{availDays.length} day{availDays.length!==1?"s":""}/week selected</div>
                  </div>

                  {/* 03 — Duration */}
                  <div style={{marginBottom:24}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={{fontSize:10,fontWeight:800,background:C.accent,color:"#000",padding:"2px 7px",letterSpacing:"0.05em"}}>03</span>
                      <span style={{fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:C.text}}>Duration (Weeks)</span>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {[3,4,5,6].map(w=>(
                        <button key={w} onClick={()=>setBWeeks(w)} style={{flex:1,padding:"14px 0",borderRadius:0,border:"none",background:bWeeks===w?C.accent:C.card2,color:bWeeks===w?"#000":C.muted2,fontWeight:800,fontSize:18,cursor:"pointer",transition:"all .12s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                          {w}
                          <span style={{fontSize:8,fontWeight:700,letterSpacing:"0.08em",opacity:0.7}}>{w===5?"REC":"WKS"}</span>
                        </button>
                      ))}
                    </div>
                    {bWeeks===3?<div style={{fontSize:10,color:C.muted2,marginTop:6}}>2 working weeks + 1 deload. Good for specialization or returning lifters.</div>:null}
                  </div>

                  {/* 04 — Training split */}
                  <div style={{marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={{fontSize:10,fontWeight:800,background:C.accent,color:"#000",padding:"2px 7px",letterSpacing:"0.05em"}}>04</span>
                      <span style={{fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:C.text}}>Program Architecture</span>
                    </div>
                    {[
                      {id:"Upper/Lower",     sub:"Advanced periodization focus"},
                      {id:"Push/Pull/Legs",  sub:"High volume hypertrophy"},
                      {id:"Full Body",       sub:"Efficiency & frequency base"},
                      {id:"Hybrid Split",    sub:"Push+Legs / Pull+Legs combos"},
                      {id:"Bro Split",       sub:"One muscle group per day"},
                    ].map(s=>(
                      <button key={s.id} onClick={()=>{setQSplit(s.id);setQPriority(null);}} style={{width:"100%",padding:"13px 14px",marginBottom:5,borderRadius:0,border:"1px solid "+(qSplit===s.id?C.accent:C.border2+"66"),background:qSplit===s.id?C.card2:C.card,cursor:"pointer",textAlign:"left",transition:"all .12s",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",overflow:"hidden"}}>
                        {qSplit===s.id?<div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:C.accent}}/>:null}
                        <div>
                          <div style={{fontSize:13,fontWeight:800,color:qSplit===s.id?C.accent:C.text,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:2}}>{s.id}</div>
                          <div style={{fontSize:10,color:C.muted2,letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:600}}>{s.sub}</div>
                        </div>
                        <div style={{width:16,height:16,borderRadius:"50%",border:"2px solid "+(qSplit===s.id?C.accent:C.muted),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {qSplit===s.id?<div style={{width:8,height:8,borderRadius:"50%",background:C.accent}}/>:null}
                        </div>
                      </button>
                    ))}
                  </div>

                  {(()=>{
                    const n=availDays.length;
                    const warnings=[];
                    if(qSplit==="Bro Split") warnings.push("Each muscle trains once per week. RP recommends 2× for better growth — consider Upper/Lower instead.");
                    if(qSplit==="Push/Pull/Legs"&&n===4){
                      if(qPriority){
                        const once=["Push","Pull","Legs"].filter(g=>g!==qPriority);
                        warnings.push("4-day PPL: "+qPriority+" trains twice. "+once.join(" and ")+" each train once.");
                      } else {
                        warnings.push("4-day PPL: one group trains twice, the other two train once. Choose below.");
                      }
                    }
                    if(qSplit==="Push/Pull/Legs"&&n===5){
                      if(qPriority){
                        const twice=["Push","Pull","Legs"].filter(g=>g!==qPriority);
                        warnings.push("5-day PPL: "+qPriority+" trains once. "+twice.join(" and ")+" each train twice.");
                      } else {
                        warnings.push("5-day PPL: two groups train twice, one trains once. Choose below.");
                      }
                    }
                    if(qSplit==="Push/Pull/Legs"&&n<3) warnings.push("PPL needs at least 3 days. Add more training days or switch split.");
                    if((qSplit==="Upper/Lower"||qSplit==="Full Body")&&n===2) warnings.push("2 days is the minimum — very low weekly volume. 4 days is the sweet spot.");
                    if(qSplit==="Bro Split"&&n<3) warnings.push("Bro Split needs at least 3 days to cover all muscle groups.");
                    return warnings.map((w,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,background:C.orange+"12",border:"1px solid "+C.orange+"33",borderRadius:8,padding:"9px 11px",marginBottom:10,fontSize:11,color:C.muted2,lineHeight:1.5}}>
                        <IcoWarn sz={12} col={C.orange}/><span>{w}</span>
                      </div>
                    ));
                  })()}

                  {needsPriority?(
                    <div style={{marginBottom:16,padding:"14px",background:C.card2,borderLeft:"2px solid "+C.accent}}>
                      {availDays.length===4?(
                        <>
                          <div style={{fontSize:11,fontWeight:800,marginBottom:4,color:C.text,textTransform:"uppercase",letterSpacing:"0.1em"}}>Which group trains twice?</div>
                          <div style={{fontSize:10,color:C.muted2,marginBottom:12,lineHeight:1.5}}>Pick your weakest or most important group to train twice this block.</div>
                          <div style={{display:"flex",gap:5}}>
                            {["Push","Pull","Legs"].map(opt=>(
                              <button key={opt} onClick={()=>setQPriority(qPriority===opt?null:opt)} style={{flex:1,padding:"12px 0",borderRadius:0,border:"none",background:qPriority===opt?C.accent:C.card,color:qPriority===opt?"#000":C.muted2,fontSize:12,fontWeight:800,cursor:"pointer",transition:"all .12s",textTransform:"uppercase",letterSpacing:"0.05em"}}>{opt}</button>
                            ))}
                          </div>
                        </>
                      ):(
                        <>
                          <div style={{fontSize:11,fontWeight:800,marginBottom:4,color:C.text,textTransform:"uppercase",letterSpacing:"0.1em"}}>Which group only trains once?</div>
                          <div style={{fontSize:10,color:C.muted2,marginBottom:12,lineHeight:1.5}}>Pick the one you're happy training only once per week this block.</div>
                          <div style={{display:"flex",gap:5}}>
                            {["Push","Pull","Legs"].map(opt=>(
                              <button key={opt} onClick={()=>setQPriority(qPriority===opt?null:opt)} style={{flex:1,padding:"12px 0",borderRadius:0,border:"none",background:qPriority===opt?C.accent:C.card,color:qPriority===opt?"#000":C.muted2,fontSize:12,fontWeight:800,cursor:"pointer",transition:"all .12s",textTransform:"uppercase",letterSpacing:"0.05em"}}>{opt}</button>
                            ))}
                          </div>
                        </>
                      )}
                      {!qPriority?<div style={{fontSize:10,color:C.accent,marginTop:10,display:"flex",alignItems:"center",gap:5,fontWeight:700}}><IcoWarn sz={10} col={C.accent}/> Select one to continue</div>:null}
                    </div>
                  ):null}

                  {/* 05 — Rep range */}
                  <div style={{marginBottom:24}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={{fontSize:10,fontWeight:800,background:C.accent,color:"#000",padding:"2px 7px",letterSpacing:"0.05em"}}>05</span>
                      <span style={{fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:C.text}}>Rep Range Focus</span>
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      {[{id:"hypertrophy",l:"Hypertrophy",sub:"8–20 reps"},{id:"strength-hyp",l:"Strength-Hyp",sub:"4–12 reps"},{id:"power-hyp",l:"Power-Hyp",sub:"3–8 reps"}].map(opt=>(
                        <button key={opt.id} onClick={()=>setRepRange(opt.id)} style={{flex:1,padding:"12px 0",borderRadius:0,border:"none",background:repRange===opt.id?C.accent:C.card2,cursor:"pointer",textAlign:"center",transition:"all .12s"}}>
                          <div style={{fontSize:10,fontWeight:800,color:repRange===opt.id?"#000":C.muted2,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>{opt.l}</div>
                          <div style={{fontSize:9,color:repRange===opt.id?"#000":C.muted,fontWeight:600}}>{opt.sub}</div>
                        </button>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:C.muted2,marginTop:6}}>RP recommends rotating rep ranges across mesos for long-term development.</div>
                  </div>

                  <button onClick={()=>{setBDays(autoGen(qSplit,availDays.length,library,qPriority,muscles,P.experience||"intermediate",availDays,repRange));setStep(2);}} disabled={!bName.trim()||(needsPriority&&!qPriority)||availDays.length<2} style={{width:"100%",padding:"15px",background:(bName.trim()&&(!needsPriority||qPriority)&&availDays.length>=2)?C.accent:C.card2,color:(bName.trim()&&(!needsPriority||qPriority)&&availDays.length>=2)?"#000":C.muted,border:"none",borderRadius:0,fontSize:13,fontWeight:900,letterSpacing:"0.15em",cursor:(bName.trim()&&(!needsPriority||qPriority)&&availDays.length>=2)?"pointer":"default",transition:"all .2s",textTransform:"uppercase"}}>GENERATE PROGRAM</button>
                </div>
              ):null}
              {mode==="manual"?(
                <div>
                  <button onClick={()=>setMode(null)} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",marginBottom:16,padding:0}}>← Back</button>
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:6,fontWeight:600}}>Meso name</div>
                    <input value={bName} onChange={e=>setBName(e.target.value)} placeholder="e.g. Mar 10 - Apr 13" style={{width:"100%",background:C.card2,border:"none",borderBottom:"2px solid "+(bName?C.accent:C.border2),padding:"12px 4px",color:C.text,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{marginBottom:24}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:10,fontWeight:600}}>Total weeks (including deload)</div>
                    <div style={{display:"flex",gap:8}}>
                      {[3,4,5,6].map(w=>(
                        <button key={w} onClick={()=>setBWeeks(w)} style={{flex:1,padding:"14px 0",borderRadius:4,border:"1px solid "+(bWeeks===w?C.accent:C.border),background:bWeeks===w?C.accent+"15":C.card,color:bWeeks===w?C.accent:C.muted2,fontWeight:bWeeks===w?700:400,fontSize:15,cursor:"pointer",transition:"all .15s"}}>
                          {w}<div style={{fontSize:9,color:bWeeks===w?C.accent+"aa":C.muted,marginTop:3,letterSpacing:"0.06em"}}>WEEKS</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>setStep(1)} disabled={!bName.trim()} style={{width:"100%",padding:"14px",background:bName.trim()?C.accent:C.card,color:bName.trim()?"#000":C.muted,border:"none",borderRadius:6,fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,letterSpacing:"0.12em",cursor:bName.trim()?"pointer":"default",transition:"all .2s"}}>NEXT: TRAINING DAYS</button>
                </div>
              ):null}
            </div>
          ):null}
          {step===1?(
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:16,lineHeight:1.6}}>Add your training days and build out each session.</div>
              {dupDays.length>0?(
                <div style={{display:"flex",alignItems:"flex-start",gap:7,background:C.orange+"12",border:"1px solid "+C.orange+"33",borderRadius:8,padding:"9px 11px",marginBottom:12,fontSize:11,color:C.muted2,lineHeight:1.5}}>
                  <IcoWarn sz={12} col={C.orange}/><span>Multiple sessions on the same day ({dupDays.join(", ")}). Each day can only have one session.</span>
                </div>
              ):null}
              {bDays.map(day=>(
                <div key={day.id} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:6,marginBottom:10,overflow:"hidden"}}>
                  <div style={{padding:"12px 14px",borderBottom:"1px solid "+C.border}}>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <input value={day.name} onChange={e=>updDay(day.id,"name",e.target.value)} placeholder="Session name (e.g. Push)" style={{flex:1,background:C.surf,border:"1px solid "+C.border,borderRadius:7,padding:"9px 11px",color:C.text,fontSize:13,outline:"none"}}/>
                      <button onClick={()=>rmDay(day.id)} style={{background:"none",border:"1px solid "+C.border,borderRadius:7,padding:"9px 12px",color:C.muted,cursor:"pointer",flexShrink:0}}><IcoX sz={13} col={C.muted}/></button>
                    </div>
                    <select value={day.day} onChange={e=>updDay(day.id,"day",e.target.value)} style={{background:C.surf,border:"1px solid "+C.border,borderRadius:7,padding:"8px 10px",color:C.muted2,fontSize:12,outline:"none",width:"100%"}}>
                      {WEEK_DAYS.map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{padding:"10px 14px 12px"}}>
                    {day.exercises.length===0?<div style={{fontSize:11,color:C.muted,marginBottom:10,textAlign:"center",padding:"8px 0"}}>No exercises yet</div>:null}
                    {day.exercises.map((ex,ei)=>(
                      <div key={ex.name} style={{display:"flex",alignItems:"center",gap:8,paddingBottom:ei<day.exercises.length-1?"9px":0,marginBottom:ei<day.exercises.length-1?"9px":0,borderBottom:ei<day.exercises.length-1?"1px solid "+C.border:"none"}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:MC[ex.muscle]||"#888",flexShrink:0}}/>
                        <div style={{flex:1,fontSize:12,fontWeight:600}}>{ex.name}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <button onClick={()=>chgSets(day.id,ex.name,-1)} style={{width:24,height:24,borderRadius:6,background:C.surf,border:"1px solid "+C.border,color:C.muted2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>-</button>
                          <span style={{fontSize:12,fontWeight:700,minWidth:24,textAlign:"center"}}>{ex.sets.length}</span>
                          <button onClick={()=>chgSets(day.id,ex.name,1)} style={{width:24,height:24,borderRadius:6,background:C.surf,border:"1px solid "+C.border,color:C.muted2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>+</button>
                          <span style={{fontSize:10,color:C.muted}}>sets</span>
                        </div>
                        <button onClick={()=>rmEx(day.id,ex.name)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}}><IcoX sz={12} col={C.muted}/></button>
                      </div>
                    ))}
                    <button onClick={()=>setPicker(day.id)} style={{width:"100%",marginTop:day.exercises.length>0?10:0,padding:"8px",background:"none",border:"1px dashed "+C.border2,borderRadius:8,color:C.accent,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                      <IcoPlus sz={12} col={C.accent}/> Add Exercise
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addDay} style={{width:"100%",padding:"12px",background:"none",border:"1px dashed "+C.border2,borderRadius:6,color:C.muted2,fontSize:13,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <IcoPlus sz={13} col={C.muted2}/> Add Training Day
              </button>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setStep(0)} style={{flex:1,padding:"13px",background:"none",border:"1px solid "+C.border,borderRadius:6,color:C.muted,cursor:"pointer",fontSize:13}}>Back</button>
                <button onClick={()=>setStep(2)} disabled={bDays.length===0} style={{flex:2,padding:"13px",background:bDays.length>0?C.accent:C.card,color:bDays.length>0?"#000":C.muted,border:"none",borderRadius:6,fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,letterSpacing:"0.12em",cursor:bDays.length>0?"pointer":"default",transition:"all .2s"}}>REVIEW</button>
              </div>
            </div>
          ):null}
          {step===2?(
            <div>
              <div style={{fontSize:11,color:C.muted2,marginBottom:16,lineHeight:1.6}}>Review your program. Swap or remove any exercises before launching. Weights start blank — Week 1 is your baseline.</div>
              <Card>
                <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{bName}</div>
                <div style={{fontSize:11,color:C.muted2}}>{bWeeks} weeks · Week {bWeeks} deload · {repRange==="strength-hyp"?"Strength-Hyp":repRange==="power-hyp"?"Power-Hyp":"Hypertrophy"}</div>
                <div style={{display:"flex",gap:6,marginTop:10}}>
                  {Array(bWeeks).fill(null).map((_,i)=>(
                    <div key={i} style={{flex:1,background:i===0?C.accent+"20":C.surf,border:"1px solid "+(i===0?C.accent:C.border),borderRadius:6,padding:"8px 4px",textAlign:"center"}}>
                      <div style={{fontSize:11,fontWeight:700,color:i===0?C.accent:C.muted2}}>{i===bWeeks-1?"DL":"W"+(i+1)}</div>
                      <div style={{fontSize:9,color:C.muted,marginTop:2}}>RIR {defaultRIR(i+1,bWeeks,P.experience||"intermediate")}</div>
                    </div>
                  ))}
                </div>
              </Card>
              {bDays.map(day=>(
                <Card key={day.id}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700}}>{day.name||"Unnamed Day"}</div>
                    <div style={{fontSize:11,color:C.muted}}>{day.day}</div>
                  </div>
                  {day.exercises.length===0?<div style={{fontSize:11,color:C.accent,marginBottom:8}}>No exercises — add some below</div>:day.exercises.map((ex,ei)=>(
                    <div key={ex.name} style={{display:"flex",alignItems:"center",gap:8,paddingBottom:ei<day.exercises.length-1?"10px":0,marginBottom:ei<day.exercises.length-1?"10px":0,borderBottom:ei<day.exercises.length-1?"1px solid "+C.border:"none"}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:MC[ex.muscle]||"#888",flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600}}>{ex.name}</div>
                        <div style={{fontSize:11,color:C.muted}}>{ex.muscle}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <button onClick={()=>chgSets(day.id,ex.name,-1)} style={{width:22,height:22,borderRadius:5,background:C.surf,border:"1px solid "+C.border,color:C.muted2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>-</button>
                        <span style={{fontSize:12,fontWeight:700,minWidth:20,textAlign:"center"}}>{ex.sets.filter(s=>s.type!=="drop").length}</span>
                        <button onClick={()=>chgSets(day.id,ex.name,1)} style={{width:22,height:22,borderRadius:5,background:C.surf,border:"1px solid "+C.border,color:C.muted2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>+</button>
                      </div>
                      <button onClick={()=>setPicker(day.id+"__swap__"+ex.name)} style={{background:"none",border:"1px solid "+C.border2,borderRadius:6,padding:"4px 9px",color:C.muted2,fontSize:11,cursor:"pointer"}}>Swap</button>
                      {day.exercises.length>1?(
                        <button onClick={()=>rmEx(day.id,ex.name)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}}>
                          <IcoX sz={12} col={C.muted}/>
                        </button>
                      ):null}
                    </div>
                  ))}
                  <button onClick={()=>setPicker(day.id)} style={{width:"100%",marginTop:10,padding:"8px",background:"none",border:"1px dashed "+C.border2,borderRadius:8,color:C.accent,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    <IcoPlus sz={12} col={C.accent}/> Add Exercise
                  </button>
                </Card>
              ))}
              <div style={{padding:"10px 0 6px",fontSize:11,color:C.muted2,lineHeight:1.6,display:"flex",alignItems:"flex-start",gap:7}}>
                <IcoWarn sz={13} col={C.muted2}/>
                Week 1 is your baseline. Start conservative — RIR 3 or higher. Log your RIR and the app takes over from Week 2.
              </div>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={()=>{if(mode==="quick"){setBDays(autoGen(qSplit,availDays.length,library,qPriority,muscles,P.experience||"intermediate",availDays,repRange));setStep(2);}else setStep(1);}} style={{flex:1,padding:"13px",background:"none",border:"1px solid "+C.border,borderRadius:6,color:C.muted2,cursor:"pointer",fontSize:13}}>Regenerate</button>
                <button onClick={doLaunch} disabled={!canLaunch} style={{flex:2,padding:"13px",background:canLaunch?C.accent:C.card,color:canLaunch?"#000":C.muted,border:"none",borderRadius:6,fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,letterSpacing:"0.12em",cursor:canLaunch?"pointer":"default",transition:"all .2s"}}>LAUNCH MESO</button>
              </div>
            </div>
          ):null}
        </div>
      </div>
    </div>
  );
}

function PlannerScreen({meso,program,library,onLaunch,onUpdateDay,onSwapExercise,onRemoveExercise,onAddExercise,onGlossary,autoOpenSpec,onAutoOpenConsumed}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const muscles=getMuscles(P.experience||"intermediate",P.sex||"male");
  const [showBuilder,setShowBuilder]=useState(!meso);
  const [builderMode,setBuilderMode]=useState(null); // null=choose, "standard", "spec"

  // Auto-open spec builder when triggered from MesoComplete
  useEffect(()=>{
    if(autoOpenSpec){setShowBuilder(true);setBuilderMode("spec");onAutoOpenConsumed&&onAutoOpenConsumed();}
  },[autoOpenSpec]);

  const doBack=()=>setBuilderMode(null);           // returns to mode chooser, stays in builder
  const doClose=()=>{setShowBuilder(false);setBuilderMode(null);}; // fully exits builder
  const doLaunch=(m,p)=>{onLaunch(m,p);doClose();};

  if(showBuilder){
    if(builderMode==="spec"){
      return(<SpecBuilder library={library} muscles={muscles} experience={P.experience||"intermediate"} existingMeso={meso} onLaunch={doLaunch} onBack={doBack} onCancel={doClose}/>);
    }
    if(builderMode==="standard"){
      return(<PlanBuilder meso={meso} library={library} onLaunch={doLaunch} onBack={doBack} onCancel={doClose}/>);
    }
    // Mode chooser
    return(
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:C.surf,borderBottom:"1px solid "+C.border+"60",padding:"12px 16px",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.15em",textTransform:"uppercase",color:C.text}}>New Mesocycle</div>
          {meso?<button onClick={doClose} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"5px 10px",color:C.muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>Cancel</button>:null}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 14px"}}>
          <div style={{fontSize:10,color:C.muted2,marginBottom:20,lineHeight:1.6,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Select program type</div>
          <button onClick={()=>setBuilderMode("standard")} style={{width:"100%",background:C.card2,border:"none",borderLeft:"3px solid "+C.accent,borderRadius:0,padding:"18px 16px",marginBottom:8,textAlign:"left",cursor:"pointer",display:"block"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>Standard Hypertrophy</div>
            <div style={{fontSize:11,color:C.muted2,lineHeight:1.5}}>Full-body balanced program. All muscles trained with progressive volume from MEV toward MRV.</div>
          </button>
          <button onClick={()=>setBuilderMode("spec")} style={{width:"100%",background:C.card,border:"none",borderLeft:"3px solid "+C.blue,borderRadius:0,padding:"18px 16px",textAlign:"left",cursor:"pointer",display:"block"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>Specialization Phase</div>
            <div style={{fontSize:11,color:C.muted2,lineHeight:1.5}}>Target one muscle with aggressive volume (MEV→MRV). All other muscles held at maintenance to maximize recovery.</div>
          </button>
        </div>
      </div>
    );
  }
  return(<PlanCurrent meso={meso} program={program} library={library} onNewMeso={()=>setShowBuilder(true)} onUpdateDay={onUpdateDay} onSwapExercise={onSwapExercise} onRemoveExercise={onRemoveExercise} onAddExercise={onAddExercise} onGlossary={onGlossary}/>);
}

function ExRow({ex,onToggleFav}){
  const C=useContext(ThemeCtx);
  const mc=MC[ex.muscle]||"#888";
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.card,border:"1px solid "+C.border,borderRadius:4,marginBottom:6}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:mc,flexShrink:0}}/>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700}}>{ex.name}</div>
        <div style={{fontSize:11,color:C.muted,marginTop:1,display:"flex",gap:6,alignItems:"center"}}>
          <span style={{color:mc}}>{ex.muscle}</span><span>-</span>
          <span style={{textTransform:"capitalize"}}>{ex.type}</span>
        </div>
      </div>
      <button onClick={()=>onToggleFav(ex.name)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}}>
        <IcoStar sz={18} col={ex.fav?C.accent:C.border2} filled={ex.fav}/>
      </button>
    </div>
  );
}

function LibraryScreen({library,setLibrary}){
  const C=useContext(ThemeCtx);
  const [search,setSearch]=useState("");
  const [filt,setFilt]=useState("All");
  const [showAdd,setShowAdd]=useState(false);
  const [addError,setAddError]=useState("");
  const [nEx,setNEx]=useState({name:"",muscle:"Chest",type:"compound"});
  const mf=["All",...Object.keys(MC)];
  const filtered=library.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())&&(filt==="All"||e.muscle===filt)).sort((a,b)=>b.fav-a.fav||a.name.localeCompare(b.name));
  const favs=filtered.filter(e=>e.fav);
  const rest=filtered.filter(e=>!e.fav);
  const togFav=n=>setLibrary(p=>p.map(e=>e.name===n?{...e,fav:!e.fav}:e));
  const addEx=()=>{
    if(!nEx.name.trim()) return;
    if(library.some(e=>e.name.toLowerCase()===nEx.name.trim().toLowerCase())){
      setAddError("An exercise with that name already exists.");
      return;
    }
    setAddError("");
    // Add to library
    setLibrary(p=>[...p,{...nEx,fav:false}]);
    // Inject into EX_PROFILE so progression engine works correctly for this exercise
    const isIso=nEx.type==="isolation";
    EX_PROFILE[nEx.name]={
      type:nEx.type,
      pct:isIso?0.015:0.025,
      preferReps:isIso,
      minReps:isIso?10:5,
      maxReps:isIso?20:15,
    };
    setNEx({name:"",muscle:"Chest",type:"compound"});
    setShowAdd(false);
  };
  return(
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{padding:"16px 14px 100px"}}>
        <div style={{marginBottom:14}}>
          <SLbl>Exercise Library</SLbl>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:26,fontWeight:900,letterSpacing:"0.02em"}}>{library.length} EXERCISES</div>
        </div>
        <div style={{position:"relative",marginBottom:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exercises..." style={{width:"100%",background:C.card2,border:"none",borderBottom:"1px solid "+C.border2,padding:"10px 14px 10px 38px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.muted,display:"flex",alignItems:"center",pointerEvents:"none"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,marginBottom:12,scrollbarWidth:"none"}}>
          {mf.map(m=>(
            <button key={m} onClick={()=>setFilt(m)} style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+(filt===m?(MC[m]||C.accent):C.border),background:filt===m?(MC[m]||C.accent)+"20":C.surf,color:filt===m?(MC[m]||C.accent):C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",maxWidth:"calc(100vw - 40px)",textAlign:"center",transition:"all .15s"}}>{m}</button>
          ))}
        </div>
        {filt==="All"&&!search&&favs.length>0?(
          <div>
            <SLbl>Favorites</SLbl>
            {favs.map(ex=><ExRow key={ex.name} ex={ex} onToggleFav={togFav}/>)}
            <div style={{marginTop:4,marginBottom:8}}><SLbl>All Exercises</SLbl></div>
            {rest.map(ex=><ExRow key={ex.name} ex={ex} onToggleFav={togFav}/>)}
          </div>
        ):filtered.map(ex=><ExRow key={ex.name} ex={ex} onToggleFav={togFav}/>)}
        {showAdd?(
          <div style={{background:C.card2,border:"1px solid "+C.border2,borderRadius:6,padding:"14px",marginTop:10}}>
            <SLbl>New Custom Exercise</SLbl>
            <input value={nEx.name} onChange={e=>{setNEx(p=>({...p,name:e.target.value}));setAddError("");}} placeholder="Exercise name" style={{width:"100%",background:C.surf,border:"none",borderBottom:"2px solid "+(addError?C.red:C.border2),padding:"10px 0",color:C.text,fontSize:13,outline:"none",marginBottom:addError?4:8,boxSizing:"border-box"}}/>
            {addError?<div style={{fontSize:10,color:C.red,marginBottom:8,fontWeight:600}}>{addError}</div>:null}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <select value={nEx.muscle} onChange={e=>setNEx(p=>({...p,muscle:e.target.value}))} style={{background:C.surf,border:"1px solid "+C.border,borderRadius:8,padding:"9px 10px",color:C.text,fontSize:13,outline:"none"}}>
                {Object.keys(MC).map(m=><option key={m}>{m}</option>)}
              </select>
              <select value={nEx.type} onChange={e=>setNEx(p=>({...p,type:e.target.value}))} style={{background:C.surf,border:"1px solid "+C.border,borderRadius:8,padding:"9px 10px",color:C.text,fontSize:13,outline:"none"}}>
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
              </select>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"10px",background:"none",border:"1px solid "+C.border,borderRadius:4,color:C.muted,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={addEx} style={{flex:2,padding:"10px",background:C.accent,border:"none",borderRadius:4,color:"#000",cursor:"pointer",fontSize:13,fontWeight:700}}>Add Exercise</button>
            </div>
          </div>
        ):<button onClick={()=>setShowAdd(true)} style={{width:"100%",padding:"12px",background:"none",border:"1px dashed "+C.border2,borderRadius:6,color:C.muted,fontSize:12,cursor:"pointer",marginTop:8}}>+ Create Custom Exercise</button>}
      </div>
    </div>
  );
}

// Onboarding
function OnboardingScreen({onComplete}){
  const C=useContext(ThemeCtx);
  const [phase,setPhase]=useState("intro"); // "intro" | "howItWorks" | "form"
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [sex,setSex]=useState("");
  const [experience,setExperience]=useState("");
  const [bodyweight,setBodyweight]=useState("");
  const nameRef=useRef(null);
  const bwRef=useRef(null);
  useEffect(()=>{if(phase==="form"&&step===0&&nameRef.current) nameRef.current.focus();},[phase,step]);
  useEffect(()=>{if(phase==="form"&&step===3&&bwRef.current) bwRef.current.focus();},[phase,step]);

  const expOptions=[
    {id:"new",label:"Just getting started",sub:"Under a year, or brand new to structured training"},
    {id:"returning",label:"Getting back into it",sub:"Used to train consistently but have been away a year or more"},
    {id:"intermediate",label:"Lifting regularly",sub:"Consistently training for 1–4 years"},
    {id:"advanced",label:"Long-term lifter",sub:"4+ years of consistent, structured training"},
  ];

  const finish=()=>{
    onComplete({name:name.trim(),sex,experience,bodyweight:parseFloat(bodyweight)||0});
  };

  const OPT_STYLE=(active)=>({
    padding:"14px 16px",
    background:active?C.accent+"18":C.card2,
    border:"none",
    borderLeft:"3px solid "+(active?C.accent:C.border2),
    borderRadius:0,
    cursor:"pointer",
    textAlign:"left",
    transition:"all .12s",
    width:"100%",
    display:"block",
  });

  const ProgressDots=({current,total})=>(
    <div style={{display:"flex",gap:4,marginBottom:28}}>
      {Array(total).fill(null).map((_,i)=>(
        <div key={i} style={{height:2,flex:1,background:i<=current?C.accent:C.border2,transition:"background .2s"}}/>
      ))}
    </div>
  );

  const BtnBack=({onClick})=>(
    <button onClick={onClick} style={{flex:1,padding:"13px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,cursor:"pointer",fontSize:12,fontWeight:600,letterSpacing:"0.06em"}}>Back</button>
  );
  const BtnNext=({onClick,disabled,label})=>(
    <button onClick={onClick} disabled={disabled} style={{flex:2,padding:"13px",background:disabled?C.card2:C.accent,color:disabled?C.muted2:"#000",border:"none",borderRadius:4,fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,letterSpacing:"0.12em",cursor:disabled?"default":"pointer",transition:"all .2s"}}>{label||"CONTINUE"}</button>
  );

  const HOW_IT_WORKS=[
    {title:"Mesocycles",body:"Training is organized into mesocycles — structured 4 to 6 week blocks. Each block ramps in difficulty week by week, then ends with a deload week so your body can recover. After the deload you start a new block, stronger than before."},
    {title:"Progressive Overload",body:"Each week the app suggests slightly more weight or reps than last time. This is the foundational principle of muscle growth — your body adapts and gets stronger when it's consistently challenged a little harder over time."},
    {title:"RIR — Reps In Reserve",body:"Instead of training to failure, you stop each set when you still have a few reps left. Week 1 you leave 3 reps in reserve (RIR 3). By the final working week you're at RIR 0 — right at your limit. This manages fatigue while still driving adaptation."},
    {title:"MEV, MAV, MRV",body:"Every muscle has a range of weekly sets that produces growth. MEV (Minimum Effective Volume) is the floor — below this, you won't grow. MAV (Maximum Adaptive Volume) is the sweet spot. MRV (Maximum Recoverable Volume) is the ceiling — push past it and recovery breaks down. HYPER tracks where you are.",credit:"Dr. Mike Israetel / Renaissance Periodization."},
    {title:"SFR — Stimulus to Fatigue Ratio",body:"After each session you rate your exercises by how much stimulus they gave relative to how beat up they left you. Low-rated exercises get flagged for swapping next block. The goal is maximum growth with minimum unnecessary fatigue.",credit:"Dr. Mike Israetel / Renaissance Periodization."},
    {title:"Deload",body:"The final week of every block cuts your sets in half at an easy intensity. This isn't a rest week — it's deliberate recovery. You come back to the next block lighter but fully fresh, ready to build past your previous peak."},
  ];

  // Intro split-path screen
  if(phase==="intro"){
    return(
      <div style={{position:"fixed",inset:0,zIndex:999,background:C.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:"env(safe-area-inset-bottom)"}}>
        <style>{`*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%;width:100%}::-webkit-scrollbar{width:0;height:0}input::placeholder{color:#534434}textarea::placeholder{color:#534434;font-style:italic}input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}button,select,input,textarea{font-family:'Inter',sans-serif}`}</style>
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"40px 28px",minHeight:"100%"}}>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:48,fontWeight:900,letterSpacing:"0.2em",color:C.accent,lineHeight:1,marginBottom:20}}>HYPER</div>
          <div style={{fontSize:13,color:C.muted2,lineHeight:1.8,marginBottom:40}}>A hypertrophy training log that tells you what to lift, guides your progression week to week, and tracks your gains across training blocks so you can see real progress over time.</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <button onClick={()=>setPhase("howItWorks")} style={{width:"100%",padding:"16px",background:C.card2,border:"none",borderLeft:"3px solid "+C.accent,borderRadius:0,cursor:"pointer",textAlign:"left",display:"block",transition:"all .12s"}}>
              <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>New to this style of training?</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>See how mesocycles, progressive overload, RIR, and more work. Takes about a minute.</div>
            </button>
            <button onClick={()=>setPhase("form")} style={{width:"100%",padding:"16px",background:C.card,border:"none",borderLeft:"3px solid "+C.border2,borderRadius:0,cursor:"pointer",textAlign:"left",display:"block",transition:"all .12s"}}>
              <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>I already know how this works</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>Skip the intro and set up your profile.</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // How it works screen
  if(phase==="howItWorks"){
    return(
      <div style={{position:"fixed",inset:0,zIndex:999,background:C.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",paddingBottom:"env(safe-area-inset-bottom)"}}>
        <style>{`*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:#534434}button,input{font-family:'Inter',sans-serif}`}</style>
        <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"14px 20px",paddingTop:"calc(14px + env(safe-area-inset-top))",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>setPhase("intro")} style={{background:"none",border:"none",color:C.muted2,fontSize:13,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:5}}>← Back</button>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,letterSpacing:"0.1em",color:C.text}}>HOW IT WORKS</div>
          <button onClick={()=>setPhase("form")} style={{background:"none",border:"1px solid "+C.border2,borderRadius:8,padding:"6px 14px",color:C.muted2,fontSize:12,cursor:"pointer"}}>Skip →</button>
        </div>
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"20px 24px 24px"}}>
          {HOW_IT_WORKS.map((s,i,arr)=>(
            <div key={i} style={{marginBottom:i<arr.length-1?28:0,paddingBottom:i<arr.length-1?28:0,borderBottom:i<arr.length-1?"1px solid "+C.accent+"33":"none"}}>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,color:C.text,marginBottom:8,letterSpacing:"0.03em"}}>{s.title}</div>
              <div style={{fontSize:13,color:C.muted2,lineHeight:1.75,marginBottom:s.credit?8:0}}>{s.body}</div>
              {s.credit?<div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>{s.credit}</div>:null}
            </div>
          ))}
          <button onClick={()=>setPhase("form")} style={{width:"100%",marginTop:32,padding:"16px",background:C.accent,color:"#000",border:"none",borderRadius:6,fontFamily:"'Inter',sans-serif",fontSize:16,fontWeight:900,letterSpacing:"0.12em",cursor:"pointer"}}>
            GOT IT — LET'S START
          </button>
        </div>
      </div>
    );
  }

  // Form steps
  const steps=[
    // Step 0: Name
    <div key="s0" style={{width:"100%"}}>
      <ProgressDots current={0} total={4}/>
      <div style={{fontFamily:"'Inter',sans-serif",fontSize:30,fontWeight:900,marginBottom:8,lineHeight:1.1,color:C.text}}>What should we call you?</div>
      <div style={{fontSize:13,color:C.muted2,lineHeight:1.6,marginBottom:24}}>This is just for your greeting screen. You can change it anytime.</div>
      <div style={{marginBottom:28}}>
        <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&name.trim()) setStep(1);}} placeholder="Your name" style={{width:"100%",background:C.card2,border:"none",borderBottom:"2px solid "+(name?C.accent:C.border2),padding:"14px 0",color:C.text,fontSize:18,fontWeight:700,outline:"none",boxSizing:"border-box",transition:"border-color .15s"}}/>
      </div>
      <div style={{display:"flex",gap:10}}>
        <BtnBack onClick={()=>setPhase("intro")}/>
        <BtnNext onClick={()=>setStep(1)} disabled={!name.trim()} label="CONTINUE"/>
      </div>
    </div>,

    // Step 1: Biological sex
    <div key="s1" style={{width:"100%"}}>
      <ProgressDots current={1} total={4}/>
      <div style={{fontFamily:"'Inter',sans-serif",fontSize:30,fontWeight:900,marginBottom:8,lineHeight:1.1,color:C.text}}>Biological sex</div>
      <div style={{fontSize:13,color:C.muted2,lineHeight:1.6,marginBottom:24}}>Used to calibrate your volume landmarks.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
        {[{id:"male",l:"Male"},{id:"female",l:"Female"}].map(opt=>(
          <button key={opt.id} onClick={()=>setSex(opt.id)} style={OPT_STYLE(sex===opt.id)}>
            <span style={{fontSize:14,fontWeight:sex===opt.id?700:400,color:sex===opt.id?C.accent:C.text}}>{opt.l}</span>
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <BtnBack onClick={()=>setStep(0)}/>
        <BtnNext onClick={()=>setStep(2)} disabled={!sex}/>
      </div>
    </div>,

    // Step 2: Experience
    <div key="s2" style={{width:"100%"}}>
      <ProgressDots current={2} total={4}/>
      <div style={{fontFamily:"'Inter',sans-serif",fontSize:30,fontWeight:900,marginBottom:8,lineHeight:1.1,color:C.text}}>Training experience</div>
      <div style={{fontSize:13,color:C.muted2,lineHeight:1.6,marginBottom:16}}>Used to set your starting volume. Be honest — the app recalibrates as you log sessions.</div>
      <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:16,padding:"10px 12px",background:C.card2,borderRadius:8,borderLeft:"2px solid "+C.border2}}>
        <strong style={{color:C.muted2}}>Structured training</strong> means following a planned program — specific exercises, sets, reps, and progressive overload over time. Casual gym-going without a plan doesn't count.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
        {expOptions.map(opt=>(
          <button key={opt.id} onClick={()=>setExperience(opt.id)} style={OPT_STYLE(experience===opt.id)}>
            <div style={{fontSize:14,fontWeight:experience===opt.id?700:500,color:experience===opt.id?C.accent:C.text,marginBottom:3}}>{opt.label}</div>
            <div style={{fontSize:11,color:C.muted2,lineHeight:1.4}}>{opt.sub}</div>
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <BtnBack onClick={()=>setStep(1)}/>
        <BtnNext onClick={()=>setStep(3)} disabled={!experience}/>
      </div>
    </div>,

    // Step 3: Bodyweight
    <div key="s3" style={{width:"100%"}}>
      <ProgressDots current={3} total={4}/>
      <div style={{fontFamily:"'Inter',sans-serif",fontSize:30,fontWeight:900,marginBottom:8,lineHeight:1.1,color:C.text}}>Your bodyweight</div>
      <div style={{fontSize:13,color:C.muted2,lineHeight:1.6,marginBottom:24}}>Used as a reference point for progression increments. You can update this anytime.</div>
      <div style={{marginBottom:24}}>
        <div style={{position:"relative"}}>
          <input ref={bwRef} type="number" inputMode="decimal" pattern="[0-9]*" value={bodyweight} onChange={e=>setBodyweight(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&parseFloat(bodyweight)>0) finish();}} placeholder="185" style={{width:"100%",background:"transparent",border:"none",borderBottom:"2px solid "+(bodyweight?C.accent:C.border2),padding:"14px 54px 14px 0",color:C.text,fontSize:28,fontWeight:900,outline:"none",boxSizing:"border-box"}}/>
          <span style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.muted2,fontWeight:600}}>lbs</span>
        </div>
      </div>
      <div style={{fontSize:11,color:C.muted2,marginBottom:24,lineHeight:1.5}}>You'll build your first training block right after this.</div>
      <div style={{display:"flex",gap:10}}>
        <BtnBack onClick={()=>setStep(2)}/>
        <BtnNext onClick={finish} disabled={!(parseFloat(bodyweight)>0)} label="GET STARTED"/>
      </div>
    </div>,
  ];

  return(
    <div style={{position:"fixed",inset:0,zIndex:999,background:C.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:"env(safe-area-inset-bottom)"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:#534434}input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}button,input{font-family:'Inter',sans-serif}`}</style>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"40px 28px",minHeight:"100%"}}>
        {steps[step]}
      </div>
    </div>
  );
}

const TABS=[{id:"home",label:"Home"},{id:"progress",label:"Progress"},{id:"plan",label:"Plan"},{id:"library",label:"Library"}];
const TICONS={home:IcoHome,progress:IcoProgress,plan:IcoPlan,library:IcoLib};

export default function App(){
  const [tab,setTab]=useState("home");
  const [isDark,setIsDark]=useState(true);
  const [meso,setMeso]=useState(null);
  const [program,setProgram]=useState([]);
  const [library,setLibrary]=useState(INIT_LIBRARY);
  const [history,setHistory]=useState([]);
  const [liftHistory,setLiftHistory]=useState([]);
  const [mesoCount,setMesoCount]=useState(0);
  const [profile,setProfile]=useState(null); // {name, sex, experience, bodyweight}
  const [activeLog,setActiveLog]=useState(null);
  const [activeLogExs,setActiveLogExs]=useState(null); // persisted in-progress set data


  const [loggerOpen,setLoggerOpen]=useState(false);
  const [exUpdateKey,setExUpdateKey]=useState(0);
  const [showGlossary,setShowGlossary]=useState(false);
  const [mesoComplete,setMesoComplete]=useState(null);
  const [loaded,setLoaded]=useState(false);

  const muscles=profile?getMuscles(profile.experience,profile.sex):getMuscles("intermediate","male");

  // Inject Inter font + global machined styles
  useEffect(()=>{
    if(!document.querySelector('link[href*="Inter"]')){
      const l=document.createElement('link');
      l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
      document.head.appendChild(l);
    }
    const s=document.createElement('style');
    s.id='hyper-global';
    s.textContent=`*{box-sizing:border-box}html,body{overscroll-behavior:none;padding-bottom:env(safe-area-inset-bottom);}button,input,textarea,select{font-family:'Inter',sans-serif}input::placeholder{color:#534434}input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d8c3ad;border-radius:2px}`;
    if(!document.getElementById('hyper-global')) document.head.appendChild(s);

    // Register Service Worker for offline support + auto-updates
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').then(reg=>{
        // Check immediately for a waiting SW (e.g. user reopens after a deploy)
        reg.update();
        // Check for updates every time the app gains focus
        document.addEventListener('visibilitychange',()=>{
          if(document.visibilityState==='visible') reg.update();
        });
        // When a new SW is waiting, set update flag
        const checkWaiting=()=>{
          if(reg.waiting) setSwUpdateReady(true);
        };
        checkWaiting();
        reg.addEventListener('updatefound',()=>{
          const newWorker=reg.installing;
          if(newWorker) newWorker.addEventListener('statechange',()=>{
            if(newWorker.state==='installed'&&navigator.serviceWorker.controller){
              setSwUpdateReady(true);
            }
          });
        });
      }).catch(()=>{});
    }
  },[]);

  // ── IndexedDB storage (survives Safari's localStorage purge for installed PWAs) ──
  const IDB_NAME="hyper_db", IDB_STORE="state", IDB_KEY="hyper_state";
  const openDB=()=>new Promise((res,rej)=>{
    const req=indexedDB.open(IDB_NAME,1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess=e=>res(e.target.result);
    req.onerror=e=>rej(e.target.error);
  });
  const idbGet=async()=>{
    try{
      const db=await openDB();
      return new Promise((res,rej)=>{
        const tx=db.transaction(IDB_STORE,"readonly");
        const req=tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess=e=>res(e.target.result);
        req.onerror=e=>rej(e.target.error);
      });
    }catch(e){
      // Fallback to localStorage if IndexedDB unavailable
      try{const r=localStorage.getItem(IDB_KEY);return r?JSON.parse(r):null;}catch(_){return null;}
    }
  };
  const idbSet=async(val)=>{
    try{
      const db=await openDB();
      return new Promise((res,rej)=>{
        const tx=db.transaction(IDB_STORE,"readwrite");
        tx.objectStore(IDB_STORE).put(val,IDB_KEY);
        tx.oncomplete=()=>res();
        tx.onerror=e=>rej(e.target.error);
      });
    }catch(e){
      // Fallback to localStorage
      try{localStorage.setItem(IDB_KEY,JSON.stringify(val));}catch(_){}
    }
  };
  const idbDel=async()=>{
    try{
      const db=await openDB();
      return new Promise((res,rej)=>{
        const tx=db.transaction(IDB_STORE,"readwrite");
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete=()=>res();
        tx.onerror=e=>rej(e.target.error);
      });
    }catch(e){
      try{localStorage.removeItem(IDB_KEY);}catch(_){}
    }
  };

  useEffect(()=>{
    idbGet().then(s=>{
      if(s){
        if(s.profile) setProfile(s.profile);
        if(s.meso) setMeso(s.meso);
        if(s.program&&s.program.length>0) setProgram(s.program);
        if(s.history) setHistory(s.history);
        if(s.liftHistory&&s.liftHistory.length>0) setLiftHistory(s.liftHistory);
        if(s.mesoCount) setMesoCount(s.mesoCount);
        if(s.isDark!==undefined) setIsDark(s.isDark);
        if(s.library&&s.library.length>0) setLibrary(s.library);
        if(s.activeLog) setActiveLog(s.activeLog);
        if(s.activeLogExs) setActiveLogExs(s.activeLogExs);
        setLoaded(true);
      } else {
        // No local data — check Drive for a backup to restore
        setLoaded(true);
        if(gdriveIsConnected()){
          gdriveCheckBackup().then(info=>{
            if(info) setDriveRestorePrompt({backedUpAt:info.modifiedTime});
          }).catch(()=>{});
        }
      }
    }).catch(()=>setLoaded(true));
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    const t=setTimeout(()=>{
      idbSet({profile,meso,program,history,liftHistory,mesoCount,library,isDark,activeLog,activeLogExs});
    },600);
    return ()=>clearTimeout(t);
  },[profile,meso,program,history,liftHistory,mesoCount,library,isDark,activeLog,activeLogExs,loaded]);

  const handleComplete=(exs,ratings,sessionNote)=>{
    const sets=exs.reduce((a,e)=>a+e.sets.filter(s=>s.done&&!s.incomplete&&s.type!=="drop").length,0);
    const planned=exs.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0);
    const dayName=activeLog.name;
    const dateStr=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
    const isDeload=meso.week===meso.totalWeeks;
    const newSession={day:dayName,date:dateStr,week:meso.week,mesoNum:mesoCount,sets,planned,note:sessionNote||"",exercises:exs,isDeload};
    const updatedHistory=[newSession,...history];
    setHistory(updatedHistory);
    const newEntries=extractLiftEntries(exs,mesoCount,meso.label,meso.week,isDeload);
    setLiftHistory(p=>[...p,...newEntries]);

    // Single setProgram call — merges SFR ratings + progression data atomically
    // (two separate calls would cause the second to overwrite the first's changes)
    setProgram(p=>p.map(day=>{
      if(day.name!==dayName) return day;
      return {...day,exercises:day.exercises.map(pex=>{
        const loggedEx=exs.find(e=>e.name===pex.name);
        // Apply SFR rating
        const withSFR=(loggedEx&&ratings[loggedEx.id])?{
          ...pex,
          lastSFR:ratings[loggedEx.id],
          sfrHistory:[...(pex.sfrHistory||[]),ratings[loggedEx.id]].slice(-6),
        }:pex;
        // Apply progression data
        const logged=loggedEx;
        if(!logged) return withSFR;
        const doneSets=logged.sets.filter(s=>s.done&&!s.incomplete&&s.weight&&s.reps);
        const normalSets=doneSets.filter(s=>s.type!=="drop");
        if(!normalSets.length) return withSFR;
        const topSet=normalSets.reduce((best,s)=>parseFloat(s.weight)>parseFloat(best.weight)?s:best,normalSets[0]);
        const scheme=buildScheme(logged.sets)||"";
        const nextSets=withSFR.sets.filter(s=>s.type!=="drop").map(()=>newSet(String(topSet.weight),"normal"));
        const nextDrops=withSFR.sets.filter(s=>s.type==="drop").map(()=>newSet(String(snap(parseFloat(topSet.weight)*0.6)),"drop"));
        return {
          ...withSFR,
          lastWeight:String(topSet.weight),
          lastRIR:parseInt(topSet.rir)||0,
          lastReps:String(topSet.reps||""),
          lastScheme:scheme,
          sets:[...nextSets,...nextDrops],
        };
      })};
    }));

    // Compute allDone from updatedHistory (synchronous, not subject to setState batching)
    const thisWeekSessions=updatedHistory.filter(s=>s.week===meso.week&&s.mesoNum===mesoCount);
    const completedDays=new Set(thisWeekSessions.map(s=>s.day));
    const allDone=program.map(d=>d.name).every(n=>completedDays.has(n));
    setActiveLog(null);
    setActiveLogExs(null);
    setLoggerOpen(false);
    // Silently back up to Google Drive after every session
    if(gdriveIsConnected()){
      const snapshot={profile,meso,program,history:updatedHistory,liftHistory:[...liftHistory,...newEntries],mesoCount,library,isDark};
      gdriveBackup(snapshot).catch(()=>{});
    }
    if(isDeload){
      if(allDone) setMesoComplete({meso,mesoNum:mesoCount});
      else setTab("home");
    } else {
      if(allDone) setMeso(m=>({...m,week:Math.min(m.week+1,m.totalWeeks)}));
      setTab("home");
    }
  };

  const handleStartNextMeso=(goToPlanner,suggestedRepRange)=>{
    const exp=profile?.experience||"intermediate";
    const newProgram=program.map(day=>({
      ...day,
      exercises:day.exercises.map(ex=>{
        const peak=findPeakWeight(liftHistory,ex.name,mesoCount);
        const isIso=getProfile(ex.name).type==="isolation";
        const w1=peak?rollbackWeight(peak,exp,isIso):(ex.lastWeight||"");
        const mev=ex.mevSets||Math.max(2,ex.sets.filter(s=>s.type!=="drop").length);
        const fresh=Array(mev).fill(null).map(()=>newSet(String(w1),"normal"));
        const drops=ex.sets.filter(s=>s.type==="drop").map(()=>newSet(String(snap(parseFloat(w1)*0.6)),"drop"));
        return {...ex,lastScheme:"",lastWeight:String(w1),lastRIR:null,lastReps:"",sets:[...fresh,...drops]};
      }),
    }));
    const todayIdx=WEEK_DAYS.indexOf(getTodayName());
    const sortedDays=newProgram.slice().sort((a,b)=>WEEK_DAYS.indexOf(a.day)-WEEK_DAYS.indexOf(b.day));
    const upcomingDay=sortedDays.find(d=>WEEK_DAYS.indexOf(d.day)>=todayIdx)||sortedDays[0];
    const _startDate=upcomingDay
      ? upcomingDay.day===getTodayName()
        ? new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
        : upcomingDay.day+", "+new Date(Date.now()+(WEEK_DAYS.indexOf(upcomingDay.day)-todayIdx+7)%7*86400000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
      : new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    setMeso(m=>({...m,label:"Meso "+(mesoCount+1),week:1,totalWeeks:m.totalWeeks,repRange:suggestedRepRange||nextRepRange(m.repRange),deloadStyle:null,startDate:_startDate}));
    setProgram(newProgram);
    setMesoCount(p=>p+1);
    setMesoComplete(null);
    setTab(goToPlanner?"plan":"home");
  };

  const handleLaunch=(newMeso,newProg)=>{
    // Find the first upcoming training day from the program (today or next occurring weekday)
    const todayIdx=WEEK_DAYS.indexOf(getTodayName());
    const sorted=newProg.slice().sort((a,b)=>WEEK_DAYS.indexOf(a.day)-WEEK_DAYS.indexOf(b.day));
    const upcoming=sorted.find(d=>WEEK_DAYS.indexOf(d.day)>=todayIdx)||sorted[0];
    const startDate=upcoming
      ? upcoming.day===getTodayName()
        ? new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
        : upcoming.day+", "+new Date(Date.now()+(WEEK_DAYS.indexOf(upcoming.day)-todayIdx+7)%7*86400000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
      : new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    setMeso({...newMeso,startDate});
    setProgram(newProg);
    setMesoCount(p=>p+1);
    setTab("home");
  };

  const handleUpdateDay=(dayId,newDay)=>{
    setProgram(p=>p.map(d=>d.id!==dayId?d:{...d,day:newDay}));
  };
  // Compute tapered set counts for a swapped/added exercise in context of its day
  const calcExSets=(dayId,exName,exType,exMuscle,isSwap=false,oldName=null)=>{
    const exp=profile?.experience||"intermediate";
    const lm=muscles[exMuscle];
    const expCap={new:3,returning:3,intermediate:4,advanced:5}[exp]||4;
    if(!lm) return {mevS:3,mrvS:5,mvS:2};
    const day=program.find(d=>d.id===dayId);
    if(!day) return {mevS:3,mrvS:5,mvS:2};
    // Build sibling list — exercises for same muscle on this day (after swap if applicable)
    const siblings=day.exercises.filter(e=>e.muscle===exMuscle&&(isSwap?e.name!==oldName:true)).map(e=>e.name);
    if(!siblings.includes(exName)) siblings.push(exName);
    const freq=program.reduce((a,d)=>a+(d.exercises.some(e=>e.muscle===exMuscle)?1:0),0)||1;
    const muscleFreqActual=program.filter(d=>d.exercises.some(e=>e.muscle===exMuscle)).length||1;
    const totalExs=siblings.length;
    const pos=siblings.indexOf(exName);
    const getTW=(n)=>{if(n===1)return[1.0];if(n===2)return[0.55,0.45];if(n===3)return[0.50,0.32,0.18];return Array(n).fill(null).map((_,i)=>Math.pow(0.6,i)).map((w,_,arr)=>w/arr.reduce((a,b)=>a+b,0));};
    const tw=getTW(totalExs);
    const weight=tw[Math.min(pos,tw.length-1)]||tw[tw.length-1];
    const minSets=exType==="compound"?3:2;
    const mevRaw=Math.max(minSets,Math.round((lm.mev/muscleFreqActual)*weight));
    const mevS=totalExs===1?mevRaw:Math.min(expCap,mevRaw);
    const mrvRaw=Math.max(mevS+1,Math.round((lm.mav/muscleFreqActual)*weight));
    const mrvS=totalExs===1?mrvRaw:Math.min(expCap+2,mrvRaw);
    const mvS=Math.max(1,Math.round((lm.mv/muscleFreqActual)*weight));
    return {mevS,mrvS,mvS};
  };
  const handleSwapExercise=(dayId,oldName,newEx)=>{
    const exp=profile?.experience||"intermediate";
    const lm=muscles[newEx.muscle];
    const {mevS,mrvS,mvS}=calcExSets(dayId,newEx.name,getProfile(newEx.name).type,newEx.muscle,true,oldName);
    const rrScale=getRRScale(meso?.repRange);
    const isCompound=getProfile(newEx.name).type==="compound";
    const repOverride=isCompound
      ?{minReps:rrScale.compoundMin,maxReps:rrScale.compoundMax}
      :{minReps:rrScale.isoMin,maxReps:rrScale.isoMax};
    const makeSwapped=(e)=>({
      ...newEx,...repOverride,
      id:e.id,lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",
      mevSets:mevS,mrvSets:mrvS,mvSets:mvS,
      sets:Array(e.sets.filter(s=>s.type!=="drop").length).fill(null).map(()=>newSet("","normal")),
    });
    setProgram(p=>p.map(d=>{
      if(d.id!==dayId) return d;
      return {...d,exercises:d.exercises.map(e=>e.name!==oldName?e:makeSwapped(e))};
    }));
    // Update activeLog and activeLogExs sequentially to avoid nested setState
    setActiveLog(al=>{
      if(!al||al.id!==dayId) return al;
      return {...al,exercises:al.exercises.map(e=>e.name!==oldName?e:makeSwapped(e))};
    });
    setActiveLogExs(exs=>{
      if(!exs) return exs;
      const matchesDayId=activeLog&&activeLog.id===dayId;
      if(!matchesDayId) return exs;
      return exs.map(e=>e.name!==oldName?e:makeSwapped(e));
    });
    if(activeLog&&activeLog.id===dayId){showToast("Session updated");setExUpdateKey(k=>k+1);}
  };

  const handleAddExercise=(dayId,newEx)=>{
    const exp=profile?.experience||"intermediate";
    const lm=muscles[newEx.muscle];
    const {mevS,mrvS,mvS}=calcExSets(dayId,newEx.name,getProfile(newEx.name).type,newEx.muscle,false);
    const rrScale=getRRScale(meso?.repRange);
    const isCompound=getProfile(newEx.name).type==="compound";
    const repOverride=isCompound
      ?{minReps:rrScale.compoundMin,maxReps:rrScale.compoundMax}
      :{minReps:rrScale.isoMin,maxReps:rrScale.isoMax};
    const nx={...newEx,...repOverride,id:uid("ex"),lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",mevSets:mevS,mrvSets:mrvS,mvSets:mvS,sets:Array(mevS).fill(null).map(()=>newSet("","normal"))};
    setProgram(p=>p.map(d=>{
      if(d.id!==dayId) return d;
      if(d.exercises.find(e=>e.name===newEx.name)) return d;
      return {...d,exercises:[...d.exercises,nx]};
    }));
    if(activeLog&&activeLog.id===dayId&&!activeLog.exercises.find(e=>e.name===newEx.name)){
      setActiveLog(al=>al&&al.id===dayId?{...al,exercises:[...al.exercises,nx]}:al);
      setActiveLogExs(exs=>exs?[...exs,nx]:exs);
      showToast("Exercise added to session");
      setExUpdateKey(k=>k+1);
    }
  };

  const handleRemoveExercise=(dayId,exName)=>{
    setProgram(p=>p.map(d=>d.id!==dayId?d:{...d,exercises:d.exercises.filter(e=>e.name!==exName)}));
    if(activeLog&&activeLog.id===dayId){
      setActiveLog(al=>al&&al.id===dayId?{...al,exercises:al.exercises.filter(e=>e.name!==exName)}:al);
      setActiveLogExs(exs=>exs?exs.filter(e=>e.name!==exName):exs);
      showToast("Exercise removed from session");
      setExUpdateKey(k=>k+1);
    }
  };

  const [confirmStart,setConfirmStart]=useState(null);
  const [showProfile,setShowProfile]=useState(false);
  const [showResetConfirm,setShowResetConfirm]=useState(false);
  const [toast,setToast]=useState(null);
  const [pendingSpecOpen,setPendingSpecOpen]=useState(false);
  const showToast=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  const [profileDraft,setProfileDraft]=useState(null); // local edits before save
  const [profileUpdatePrompt,setProfileUpdatePrompt]=useState(null); // {oldProfile, newProfile}
  const [editingSession,setEditingSession]=useState(null);
  const [swUpdateReady,setSwUpdateReady]=useState(false);
  const [driveConnected,setDriveConnected]=useState(()=>gdriveIsConnected());
  const [driveRestorePrompt,setDriveRestorePrompt]=useState(null);
  const [driveConnecting,setDriveConnecting]=useState(false);
  const [driveDisconnectConfirm,setDriveDisconnectConfirm]=useState(false);
  const [driveNudgeDismissed,setDriveNudgeDismissed]=useState(()=>{try{return localStorage.getItem("hyper_drive_nudge_dismissed")==="1";}catch(_){return false;}});

  const handleEditSession=(note,exs)=>{
    // Mark any previously-incomplete sets that now have weight+reps as done
    const cleanedExs=exs?exs.map(ex=>({
      ...ex,
      sets:ex.sets.map(s=>s.incomplete&&s.weight&&s.reps?{...s,done:true,incomplete:false}:s)
    })):exs;
    setHistory(prev=>prev.map((s,i)=>{
      if(i!==editingSession.idx) return s;
      return {...s,note,exercises:cleanedExs||s.exercises};
    }));
    if(cleanedExs&&editingSession){
      const s=editingSession.session;
      const sessionMesoNum=s.mesoNum||mesoCount;
      const sessionLabel="M"+sessionMesoNum+(s.isDeload?"DL":"W"+s.week);
      setLiftHistory(prev=>{
        const filtered=prev.filter(e=>!(e.mesoNum===sessionMesoNum&&e.week===s.week&&e.label===sessionLabel));
        const newEntries=extractLiftEntries(cleanedExs,sessionMesoNum,s.mesoLabel||meso?.label||"",s.week,s.isDeload||false);
        return [...filtered,...newEntries];
      });
      // Only sync progression engine if the edited session is the most recent for each exercise
      setProgram(p=>p.map(day=>{
        if(day.name!==s.day) return day;
        return {...day,exercises:day.exercises.map(pex=>{
          const logged=cleanedExs.find(e=>e.name===pex.name);
          if(!logged) return pex;
          // Check if a more recent session exists for this exercise
          const laterSession=history.find((h,hi)=>hi<editingSession.idx&&h.day===s.day&&h.exercises&&h.exercises.some(e=>e.name===pex.name));
          if(laterSession) return pex; // Don't overwrite newer data
          const doneSets=logged.sets.filter(s=>s.done&&!s.incomplete&&s.weight&&s.reps);
          const normalSets=doneSets.filter(s=>s.type!=="drop");
          if(!normalSets.length) return pex;
          const topSet=normalSets.reduce((best,s)=>parseFloat(s.weight)>parseFloat(best.weight)?s:best,normalSets[0]);
          return {
            ...pex,
            lastWeight:String(topSet.weight),
            lastRIR:parseInt(topSet.rir)||0,
            lastReps:String(topSet.reps||""),
            lastScheme:buildScheme(logged.sets)||pex.lastScheme,
          };
        })};
      }));
    }
    setEditingSession(null);
  };

  const handleSpecialize=()=>{
    setMesoComplete(null);
    setTab("plan");
    setPendingSpecOpen(true);
  };

  const handleDriveConnect=async()=>{
    setDriveConnecting(true);
    try{
      await gdriveSignIn();
      setDriveConnected(true);
      const hasLocal=!!profile;
      if(!hasLocal){
        const info=await gdriveCheckBackup();
        if(info) setDriveRestorePrompt({backedUpAt:info.modifiedTime});
        else showToast("Google Drive connected.");
      } else {
        showToast("Google Drive connected.");
      }
    } catch(e){
      if(e.message!=="Popup closed") showToast("Couldn't connect to Google Drive.",false);
    }
    setDriveConnecting(false);
  };

  const handleDriveDisconnect=()=>{
    gdriveClearToken();
    setDriveConnected(false);
    showToast("Google Drive disconnected.");
  };

  const handleDriveRestore=async()=>{
    const data=await gdriveRestore();
    if(!data){showToast("Restore failed — couldn't read backup.",false);return;}
    if(data.profile) setProfile(data.profile);
    if(data.meso) setMeso(data.meso);
    if(data.program&&data.program.length>0) setProgram(data.program);
    if(data.history) setHistory(data.history);
    if(data.liftHistory&&data.liftHistory.length>0) setLiftHistory(data.liftHistory);
    if(data.mesoCount) setMesoCount(data.mesoCount);
    if(data.isDark!==undefined) setIsDark(data.isDark);
    if(data.library&&data.library.length>0) setLibrary(data.library);
    setDriveRestorePrompt(null);
    showToast("Data restored from Google Drive.");
  };

  const handleExtendMeso=()=>{
    setMeso(m=>({...m,totalWeeks:m.totalWeeks+1}));
  };

  const handleSetDeloadStyle=(style)=>{
    setMeso(m=>({...m,deloadStyle:style}));
  };

  const handleExport=()=>{
    try {
      const data=JSON.stringify({profile,meso,program,history,liftHistory,mesoCount,library,isDark,exportedAt:new Date().toISOString()},null,2);
      const blob=new Blob([data],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download=`hyper-backup-${new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"}).replace(/[^a-z0-9]/gi,"-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e){showToast("Export failed.",false);}
  };

  const handleImport=(file)=>{
    if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try {
        const s=JSON.parse(e.target.result);
        // Basic shape validation — reject files that aren't a HYPER backup
        if(typeof s!=="object"||s===null||(!s.profile&&!s.meso&&!s.history)){
          showToast("Import failed — not a valid HYPER backup.",false);
          return;
        }
        if(s.meso&&typeof s.meso!=="object"){showToast("Import failed — corrupted meso data.",false);return;}
        if(s.program&&!Array.isArray(s.program)){showToast("Import failed — corrupted program data.",false);return;}
        if(s.profile) setProfile(s.profile);
        if(s.meso) setMeso(s.meso);
        if(s.program&&s.program.length>0) setProgram(s.program);
        if(s.history) setHistory(s.history);
        if(s.liftHistory&&s.liftHistory.length>0) setLiftHistory(s.liftHistory);
        if(s.mesoCount) setMesoCount(s.mesoCount);
        if(s.isDark!==undefined) setIsDark(s.isDark);
        if(s.library&&s.library.length>0) setLibrary(s.library);
        // Clear any in-progress session and overlays to avoid stale state
        setActiveLog(null);
        setActiveLogExs(null);
        setLoggerOpen(false);
        setMesoComplete(null);
        setShowProfile(false);
        showToast("Data imported successfully.");
      } catch(err){showToast("Import failed — invalid file.",false);}
    };
    reader.readAsText(file);
  };

  const handleOnboarding=(prof)=>{
    setProfile(prof);
    setTab("plan");
  };

  // Apply updated profile's volume landmarks to all exercises in the current program
  const handleApplyProfileToProgram=(newProf)=>{
    const newMuscles=getMuscles(newProf.experience,newProf.sex);
    const expCap={new:3,returning:3,intermediate:4,advanced:5}[newProf.experience]||4;
    setProgram(p=>p.map(day=>{
      // Build muscle order map for tapered distribution (same as autoGen)
      const muscleExOrder={};
      day.exercises.forEach(ex=>{
        if(!muscleExOrder[ex.muscle]) muscleExOrder[ex.muscle]=[];
        muscleExOrder[ex.muscle].push(ex.name);
      });
      // Count how many distinct days each muscle trains across the full program
      const muscleFreq={};
      p.forEach(d=>{
        const dayMuscles=new Set(d.exercises.map(e=>e.muscle));
        dayMuscles.forEach(m=>{muscleFreq[m]=(muscleFreq[m]||0)+1;});
      });
      return({
        ...day,
        exercises:day.exercises.map(ex=>{
          const lm=newMuscles[ex.muscle];
          if(!lm) return ex;
          const freq=muscleFreq[ex.muscle]||1;
          const exsForMuscle=muscleExOrder[ex.muscle]||[ex.name];
          const posInMuscle=exsForMuscle.indexOf(ex.name);
          const totalExs=exsForMuscle.length;
          const taperWeights=totalExs===1?[1.0]:totalExs===2?[0.55,0.45]:[0.50,0.32,0.18];
          const weight=taperWeights[Math.min(posInMuscle,taperWeights.length-1)]||taperWeights[taperWeights.length-1];
          const minSets=ex.type==="compound"?3:2;
          const mevSets=Math.min(expCap,Math.max(minSets,Math.round((lm.mev/freq)*weight)));
          const mrvSets=Math.min(expCap+2,Math.max(mevSets+1,Math.round((lm.mav/freq)*weight)));
          const mvSets=Math.max(1,Math.round((lm.mv/freq)*weight));
          const current=ex.sets.filter(s=>s.type!=="drop");
          let newSets;
          if(mevSets>current.length){
            const last=current[current.length-1];
            const extras=Array(mevSets-current.length).fill(null).map(()=>newSet(last?last.weight:"","normal"));
            newSets=[...current,...extras];
          } else {
            newSets=current.slice(0,mevSets);
          }
          const drops=ex.sets.filter(s=>s.type==="drop");
          return {...ex,mevSets,mrvSets,mvSets,sets:[...newSets,...drops]};
        })
      });
    }));
  };

  const handleProfileSave=()=>{
    if(!profileDraft) return;
    const experienceChanged=profileDraft.experience!==profile.experience;
    const sexChanged=profileDraft.sex!==profile.sex;
    // Always save the draft first
    setProfile(profileDraft);
    setShowProfile(false);
    setShowResetConfirm(false);
    setProfileDraft(null);
    // Sex change: apply to program silently (it's a correction, not a training decision)
    if(sexChanged&&program&&program.length>0){
      handleApplyProfileToProgram(profileDraft);
    }
    // Experience change: ask the user — it's a meaningful training decision
    if(experienceChanged&&program&&program.length>0){
      setProfileUpdatePrompt({oldProfile:profile,newProfile:profileDraft});
    }
  };

  const handleReset=async()=>{
    await idbDel();
    try{localStorage.removeItem(IDB_KEY);}catch(e){}
    setProfile(null);
    setMeso(null);
    setProgram([]);
    setHistory([]);
    setLiftHistory([]);
    setMesoCount(0);
    setLibrary(INIT_LIBRARY);
    setIsDark(true);
    setActiveLog(null);
    setActiveLogExs(null);
    setLoggerOpen(false);
    setMesoComplete(null);
    setShowProfile(false);
    setExUpdateKey(0);
    setTab("home");
  };

  const todayWorkout=program.length>0?(program.find(d=>d.day===getTodayName())||null):null;
  const C=isDark?DARK:LIGHT;

  if(!loaded){
    return(
      <ThemeCtx.Provider value={C}>
        <div style={{background:C.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",paddingBottom:"env(safe-area-inset-bottom)"}}>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:22,fontWeight:900,letterSpacing:"0.2em",color:C.accent}}>HYPER</div>
        </div>
      </ThemeCtx.Provider>
    );
  }

  if(!profile){
    return <ThemeCtx.Provider value={C}><OnboardingScreen onComplete={handleOnboarding} isDark={isDark} setIsDark={setIsDark}/></ThemeCtx.Provider>;
  }

  const initLetter=(profile.name||"?")[0].toUpperCase();

  return(
    <ThemeCtx.Provider value={C}>
    <ProfileCtx.Provider value={profile||{experience:"intermediate",sex:"male",bodyweight:185}}>
    <div style={{fontFamily:"'Inter',sans-serif",background:C.bg,color:C.text,height:"100dvh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",position:"relative",transition:"background .25s,color .25s",overflow:"hidden"}}>
      
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border+"60",padding:"13px 16px",paddingTop:"calc(13px + env(safe-area-inset-top))",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background .25s,border-color .25s"}}>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,letterSpacing:"0.2em",color:C.accent}}>HYPER</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {meso?null:<div/>}
          <div onClick={()=>{setProfileDraft({...profile});setShowProfile(true);}} style={{width:28,height:28,borderRadius:"50%",background:C.accent+"22",border:"1px solid "+C.accent+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.accent,cursor:"pointer"}}>{initLetter}</div>
        </div>
      </div>
      {toast?(
        <div style={{position:"fixed",bottom:"calc(env(safe-area-inset-bottom) + 72px)",left:"50%",transform:"translateX(-50%)",zIndex:900,background:toast.ok?C.green:C.red,color:"#fff",borderRadius:6,padding:"10px 20px",fontSize:13,fontWeight:600,boxShadow:"0 4px 20px #0006",maxWidth:"calc(100vw - 40px)",textAlign:"center",pointerEvents:"none",transition:"opacity .3s"}}>
          {toast.msg}
        </div>
      ):null}

      {/* SW update banner — appears when a new version is ready */}
      {swUpdateReady?(
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,maxWidth:480,margin:"0 auto",background:C.accent,padding:"12px 16px",paddingTop:"calc(12px + env(safe-area-inset-top))",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <span style={{fontSize:12,fontWeight:700,color:"#000",letterSpacing:"0.02em"}}>A new version of HYPER is ready.</span>
          <button onClick={()=>{
            navigator.serviceWorker.getRegistration().then(reg=>{
              if(reg&&reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
            });
            window.location.reload();
          }} style={{background:"#000",border:"none",borderRadius:4,padding:"6px 14px",color:C.accent,fontSize:11,fontWeight:900,cursor:"pointer",letterSpacing:"0.08em",flexShrink:0,textTransform:"uppercase"}}>Update</button>
        </div>
      ):null}

      {/* Drive restore prompt — shown when no local data but backup found */}
      {driveRestorePrompt&&!profile?(
        <div style={{position:"fixed",inset:0,zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px",background:"#000a"}}>
          <div style={{background:C.surf,borderRadius:6,padding:"24px 20px",width:"100%",maxWidth:340}}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Restore your data?</div>
            <div style={{fontSize:12,color:C.muted2,lineHeight:1.7,marginBottom:20}}>
              We found a backup in your Google Drive from {new Date(driveRestorePrompt.backedUpAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}. Restore it to pick up where you left off.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <button onClick={handleDriveRestore} style={{width:"100%",padding:"13px",background:C.accent,color:"#000",border:"none",borderRadius:4,fontSize:13,fontWeight:900,letterSpacing:"0.1em",cursor:"pointer",textTransform:"uppercase"}}>Restore Data</button>
              <button onClick={()=>setDriveRestorePrompt(null)} style={{width:"100%",padding:"11px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,fontSize:12,cursor:"pointer"}}>Start fresh</button>
            </div>
          </div>
        </div>
      ):null}
      {showProfile&&profileDraft?(
        <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>{setShowProfile(false);setShowResetConfirm(false);setProfileDraft(null);}}>
          <div style={{position:"absolute",inset:0,background:"#000a"}}/>
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 16px 14px",flexShrink:0,borderBottom:"1px solid "+C.border+"60"}}>
              <div style={{fontSize:14,fontWeight:900,letterSpacing:"0.15em",textTransform:"uppercase"}}>Profile</div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setShowProfile(false);setShowResetConfirm(false);setProfileDraft(null);}} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"6px 12px",color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:"0.05em"}}>Cancel</button>
                <button onClick={handleProfileSave} style={{background:C.accent,border:"none",borderRadius:4,padding:"6px 14px",color:"#000",fontSize:11,fontWeight:800,cursor:"pointer",letterSpacing:"0.05em"}}>Save</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"0 16px 40px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",marginBottom:8,borderBottom:"1px solid "+C.border+"60"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {isDark?<IcoMoon sz={14} col={C.muted2}/>:<IcoSun sz={14} col={C.muted2}/>}
                <span style={{fontSize:13,color:C.text,fontWeight:600}}>{isDark?"Dark mode":"Light mode"}</span>
              </div>
              <button onClick={()=>setIsDark(p=>!p)} style={{width:44,height:24,borderRadius:12,background:isDark?C.accent:C.border2,border:"none",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                <span style={{position:"absolute",top:2,left:isDark?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px #0004"}}/>
              </button>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:C.muted2,marginBottom:8,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Name</div>
              <input value={profileDraft.name||""} onChange={e=>setProfileDraft(p=>({...p,name:e.target.value}))} style={{width:"100%",background:"transparent",border:"none",borderBottom:"2px solid "+C.border2,padding:"8px 0",color:C.text,fontSize:15,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:C.muted2,marginBottom:8,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Bodyweight (lbs)</div>
              <input type="number" inputMode="decimal" value={profileDraft.bodyweight||""} onChange={e=>setProfileDraft(p=>({...p,bodyweight:parseFloat(e.target.value)||0}))} style={{width:"100%",background:"transparent",border:"none",borderBottom:"2px solid "+C.border2,padding:"8px 0",color:C.text,fontSize:15,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,color:C.muted2,marginBottom:8,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Training Experience</div>
              {[{id:"new",l:"Just getting started"},{id:"returning",l:"Getting back into it"},{id:"intermediate",l:"Lifting regularly"},{id:"advanced",l:"Long-term lifter"}].map(opt=>(
                <button key={opt.id} onClick={()=>setProfileDraft(p=>({...p,experience:opt.id}))} style={{width:"100%",padding:"10px 12px",marginBottom:4,borderRadius:0,border:"none",borderLeft:"3px solid "+(profileDraft.experience===opt.id?C.accent:C.border2),background:profileDraft.experience===opt.id?C.accent+"15":C.card2,color:profileDraft.experience===opt.id?C.accent:C.muted2,fontSize:12,fontWeight:profileDraft.experience===opt.id?800:500,cursor:"pointer",textAlign:"left",display:"block",letterSpacing:"0.04em"}}>{opt.l}</button>
              ))}
              {profileDraft.experience!==profile.experience&&program?.length>0?<div style={{fontSize:10,color:C.muted2,marginTop:4,display:"flex",alignItems:"center",gap:4}}><IcoWarn sz={10} col={C.muted2}/>Saving will prompt you to update your current program.</div>:null}
            </div>
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+C.border+"60"}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Data</div>
              {/* Google Drive backup */}
              <div style={{background:C.card2,borderLeft:"3px solid "+(driveConnected?C.green:C.border2),padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:driveConnected?C.green:C.text,letterSpacing:"0.04em"}}>
                      {driveConnected?"Google Drive — Connected":"Google Drive Backup"}
                    </div>
                    <div style={{fontSize:10,color:C.muted2,marginTop:2,lineHeight:1.5}}>
                      {driveConnected?"Your data backs up automatically after each session.":"Back up your data so it's never lost."}
                    </div>
                  </div>
                  {driveConnected?(
                    driveDisconnectConfirm?(
                      <div style={{display:"flex",gap:5,flexShrink:0,marginLeft:10}}>
                        <button onClick={()=>setDriveDisconnectConfirm(false)} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"5px 8px",color:C.muted2,fontSize:10,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                        <button onClick={()=>{handleDriveDisconnect();setDriveDisconnectConfirm(false);}} style={{background:C.red+"18",border:"1px solid "+C.red+"44",borderRadius:4,padding:"5px 8px",color:C.red,fontSize:10,fontWeight:700,cursor:"pointer"}}>Yes, disconnect</button>
                      </div>
                    ):(
                      <button onClick={()=>setDriveDisconnectConfirm(true)} style={{background:"none",border:"1px solid "+C.border2,borderRadius:4,padding:"5px 10px",color:C.muted,fontSize:10,fontWeight:600,cursor:"pointer",flexShrink:0,marginLeft:10}}>Disconnect</button>
                    )
                  ):(
                    <button onClick={handleDriveConnect} disabled={driveConnecting} style={{background:C.accent,border:"none",borderRadius:4,padding:"6px 12px",color:"#000",fontSize:11,fontWeight:800,cursor:driveConnecting?"default":"pointer",flexShrink:0,marginLeft:10,letterSpacing:"0.04em",opacity:driveConnecting?0.6:1}}>{driveConnecting?"Connecting…":"Connect"}</button>
                  )}
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={handleExport} style={{flex:1,padding:"8px 10px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export
                </button>
                <label style={{flex:1,padding:"8px 10px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,boxSizing:"border-box"}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10" transform="rotate(180 12 12)"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Import
                  <input type="file" accept=".json" style={{display:"none"}} onClick={e=>e.target.value=""} onChange={e=>handleImport(e.target.files[0])}/>
                </label>
              </div>
            </div>
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+C.border+"60"}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Biological Sex</div>
              <div style={{display:"flex",gap:5,marginBottom:16}}>
                {["male","female"].map(s=>(
                  <button key={s} onClick={()=>setProfileDraft(p=>({...p,sex:s}))} style={{flex:1,padding:"9px",borderRadius:0,border:"none",borderBottom:"2px solid "+(profileDraft.sex===s?C.accent:C.border2),background:profileDraft.sex===s?C.accent+"15":C.card2,color:profileDraft.sex===s?C.accent:C.muted2,fontSize:12,fontWeight:profileDraft.sex===s?800:500,cursor:"pointer",textTransform:"capitalize",letterSpacing:"0.06em"}}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{paddingTop:16,borderTop:"1px solid "+C.border+"60"}}>
              {showResetConfirm?(
                <div style={{background:C.card2,borderLeft:"3px solid "+C.red,padding:"14px"}}>
                  <div style={{fontSize:12,color:C.muted2,marginBottom:12,lineHeight:1.6}}>All training data, history, and records will be permanently deleted.</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setShowResetConfirm(false)} style={{flex:1,padding:"9px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,cursor:"pointer",fontSize:11,fontWeight:600}}>Cancel</button>
                    <button onClick={handleReset} style={{flex:1,padding:"9px",background:"none",border:"1px solid "+C.red+"55",borderRadius:4,color:C.red,cursor:"pointer",fontSize:11,fontWeight:700}}>Delete &amp; Reset</button>
                  </div>
                </div>
              ):(
                <button onClick={()=>setShowResetConfirm(true)} style={{background:"none",border:"none",padding:0,color:C.muted,fontSize:11,cursor:"pointer",textDecoration:"underline",textDecorationColor:C.muted+"66"}}>
                  Start over &amp; clear all data
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      ):null}
      {profileUpdatePrompt?(
        <div style={{position:"fixed",inset:0,zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}}>
          <div style={{position:"absolute",inset:0,background:"#000a"}}/>
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:6,padding:"22px 20px",width:"100%",maxWidth:340}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Update current program?</div>
            <div style={{fontSize:12,color:C.muted2,lineHeight:1.7,marginBottom:20}}>
              Your {profileUpdatePrompt.oldProfile.experience!==profileUpdatePrompt.newProfile.experience?"experience level":"profile"} changed. The app can recalculate your current program's set counts to match your updated {profileUpdatePrompt.oldProfile.experience!==profileUpdatePrompt.newProfile.experience?"training level":"profile"}.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <button onClick={()=>{handleApplyProfileToProgram(profileUpdatePrompt.newProfile);setProfileUpdatePrompt(null);}} style={{width:"100%",padding:"12px",background:C.accent,color:"#000",border:"none",borderRadius:4,fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:900,letterSpacing:"0.1em",cursor:"pointer",textTransform:"uppercase"}}>
                Update Now
              </button>
              <button onClick={()=>setProfileUpdatePrompt(null)} style={{width:"100%",padding:"11px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,fontSize:12,cursor:"pointer",letterSpacing:"0.04em"}}>
                Apply from next meso only
              </button>
            </div>
          </div>
        </div>
      ):null}
      {editingSession?<SessionEditModal session={editingSession.session} onSave={handleEditSession} onClose={()=>setEditingSession(null)}/>:null}
      {confirmStart?(
        <div style={{position:"fixed",inset:0,zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}} onClick={()=>setConfirmStart(null)}>
          <div style={{position:"absolute",inset:0,background:"#000a"}}/>
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:6,padding:"20px",width:"100%",maxWidth:340}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>Replace current session?</div>
            <div style={{fontSize:12,color:C.muted2,lineHeight:1.6,marginBottom:16}}>You have <strong style={{color:C.text}}>{activeLog?.name}</strong> in progress. Starting a new session will discard it.</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setConfirmStart(null)} style={{flex:1,padding:"10px",background:"none",border:"1px solid "+C.border2,borderRadius:4,color:C.muted2,cursor:"pointer",fontSize:12,fontWeight:600}}>Keep Current</button>
              <button onClick={()=>{setActiveLog({...confirmStart,startedAt:Date.now()});setActiveLogExs(null);setLoggerOpen(true);setConfirmStart(null);}} style={{flex:1,padding:"10px",background:C.red+"22",border:"1px solid "+C.red+"44",borderRadius:4,color:C.red,cursor:"pointer",fontSize:12,fontWeight:800}}>Start New</button>
            </div>
          </div>
        </div>
      ):null}
      {mesoComplete?<MesoCompleteScreen meso={mesoComplete.meso} liftHistory={liftHistory} mesoNum={mesoComplete.mesoNum} program={program} onStartNext={(r)=>handleStartNextMeso(false,r)} onReview={(r)=>handleStartNextMeso(true,r)} onSpecialize={handleSpecialize} onDismiss={()=>setMesoComplete(null)}/>:null}
      {activeLog?(()=>{const _lastNote=(history.find(h=>h.day===activeLog.name&&h.note)||{}).note||null;return(<Logger workout={activeLog} wk={meso?meso.week:1} totalWeeks={meso?meso.totalWeeks:5} isDeload={meso?meso.week===meso.totalWeeks:false} deloadStyle={meso?.deloadStyle||"volume"} onComplete={handleComplete} onMinimize={()=>setLoggerOpen(false)} visible={loggerOpen} liftHistory={liftHistory} savedExs={activeLogExs} onExsChange={setActiveLogExs} exUpdateKey={exUpdateKey} lastSessionNote={_lastNote}/>);})():null}
      {showGlossary?<GlossaryModal onClose={()=>setShowGlossary(false)}/>:null}
      <div style={{display:tab==="home"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
        {(meso&&program&&program.length>0)?(
          <HomeScreen meso={meso} mesoCount={mesoCount} program={program} history={history} onStart={d=>{
            if(activeLog&&loggerOpen===false){
              setConfirmStart(d||todayWorkout);
              return;
            }
            setActiveLog({...(d||todayWorkout),startedAt:Date.now()});setLoggerOpen(true);
          }} profile={profile} activeLog={activeLog} onResume={()=>setLoggerOpen(true)} onAbandon={()=>{setActiveLog(null);setActiveLogExs(null);setLoggerOpen(false);}} onEdit={(session,idx)=>setEditingSession({session,idx})} onExtendMeso={handleExtendMeso} onSetDeloadStyle={handleSetDeloadStyle}/>
        ):(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center"}}>
            <div style={{width:56,height:56,borderRadius:0,background:C.card2,border:"none",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
              <IcoPlan active={false}/>
            </div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:26,fontWeight:900,letterSpacing:"-0.02em",marginBottom:8}}>NO ACTIVE MESO</div>
            <div style={{fontSize:13,color:C.muted2,lineHeight:1.7,marginBottom:28,maxWidth:280}}>Go to the Plan tab and use Quick Build — pick your split, available days, and the app fills in the rest.</div>
            <button onClick={()=>setTab("plan")} style={{padding:"14px 32px",background:C.accent,color:"#000",border:"none",borderRadius:6,fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,letterSpacing:"0.12em",cursor:"pointer"}}>BUILD PROGRAM</button>
          </div>
        )}
      </div>
      <div style={{display:tab==="progress"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
        <ProgressScreen meso={meso} mesoCount={mesoCount} onGlossary={()=>setShowGlossary(true)} liftHistory={liftHistory} history={history} program={program} muscles={muscles}/>
      </div>
      <div style={{display:tab==="plan"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
        <PlannerScreen meso={meso} program={program} library={library} onLaunch={handleLaunch} onUpdateDay={handleUpdateDay} onSwapExercise={handleSwapExercise} onRemoveExercise={handleRemoveExercise} onAddExercise={handleAddExercise} onGlossary={()=>setShowGlossary(true)} autoOpenSpec={pendingSpecOpen} onAutoOpenConsumed={()=>setPendingSpecOpen(false)}/>
      </div>
      <div style={{display:tab==="library"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
        <LibraryScreen library={library} setLibrary={setLibrary}/>
      </div>
      <div className="hyper-nav" style={{background:C.surf,borderTop:"1px solid "+C.border+"60",display:"flex",flexShrink:0,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map(t=>{
          const Icon=TICONS[t.id];
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:active?C.accent:C.muted,transition:"color .15s"}}>
              <div style={{padding:"4px 12px",borderRadius:4,background:active?C.accent+"15":"transparent",transition:"background .15s"}}>
                <Icon active={active}/>
              </div>
              <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:active?800:500}}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
    </ProfileCtx.Provider>
    </ThemeCtx.Provider>
  );
}
