import { useState, useRef, useEffect, useMemo, memo, createContext, useContext } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const DARK={
  bg:"#10141e",surf:"#151a26",card:"#1a2030",card2:"#1e2538",
  border:"#232d3f",border2:"#2a3549",text:"#dde3ed",
  muted:"#475569",muted2:"#8896a8",accent:"#f59e0b",
  green:"#22c55e",red:"#ef4444",blue:"#60a5fa",orange:"#f97316",
};
const LIGHT={
  bg:"#f4f0eb",surf:"#faf8f5",card:"#ffffff",card2:"#f0ece6",
  border:"#e6e0d6",border2:"#d4cdc0",text:"#1a1d2e",
  muted:"#94a3b8",muted2:"#64748b",accent:"#f59e0b",
  green:"#16a34a",red:"#dc2626",blue:"#3b82f6",orange:"#ea580c",
};
const ThemeCtx=createContext(DARK);
const ProfileCtx=createContext({experience:"intermediate",sex:"male",bodyweight:185});
let _uid=0;
const uid=pfx=>`${pfx||"id"}${++_uid}_${Math.random().toString(36).slice(2,7)}`;
const MC = {
  Chest:"#f97316", Shoulders:"#a78bfa", Triceps:"#34d399", Back:"#60a5fa",
  Biceps:"#fb923c", Quads:"#38bdf8", Hamstrings:"#f472b6", Glutes:"#4ade80",
  Calves:"#fbbf24", Core:"#e879f9", "Full Body":"#94a3b8",
};
const BASE_MUSCLES = {
  Chest:     {mv:4,  mev:8,  mav:16, mrv:20},
  Back:      {mv:6,  mev:10, mav:20, mrv:25},
  Shoulders: {mv:4,  mev:8,  mav:16, mrv:20},
  Biceps:    {mv:3,  mev:6,  mav:14, mrv:20},
  Triceps:   {mv:3,  mev:6,  mav:14, mrv:20},
  Quads:     {mv:4,  mev:8,  mav:16, mrv:20},
  Hamstrings:{mv:3,  mev:6,  mav:12, mrv:18},
  Glutes:    {mv:3,  mev:6,  mav:12, mrv:16},
  Calves:    {mv:3,  mev:6,  mav:12, mrv:16},
};
function getMuscles(experience, sex) {
  const scales = {new:0.70, returning:0.75, intermediate:1.00, advanced:1.25};
  const s = scales[experience] || 1.00;
  const femMod = sex === "female" ? 1.15 : 1.0;
  const result = {};
  Object.keys(BASE_MUSCLES).forEach(function(m) {
    const v = BASE_MUSCLES[m];
    result[m] = {
      mv:  Math.round(v.mv  * s * femMod),
      mev: Math.round(v.mev * s * femMod),
      mav: Math.round(v.mav * s * femMod),
      mrv: Math.round(v.mrv * s * femMod),
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
const getGreeting = () => { const h=new Date().getHours(); if(h<12) return "Good morning,"; if(h<17) return "Good afternoon,"; return "Good evening,"; };

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
  const done=sets.filter(s=>s.done);
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
    const doneSets=ex.sets.filter(s=>s.done&&!s.incomplete&&s.weight&&s.reps);
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
  return deduped.map(e=>({label:e.label,v:e.topSetWeight,meso:e.mesoNum,deload:e.isDeload}));
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
    const expCap={new:4,returning:4,intermediate:5,advanced:7}[experience]||5;

    // Group exercises by muscle to apply tapered set distribution
    // Role order: compound first = most sets, isolation last = fewest
    // This mirrors how RP templates are actually written
    const muscleExOrder={};
    t.exs.forEach(nm=>{
      const f=lib.find(e=>e.name===nm);
      if(!f) return;
      if(!muscleExOrder[f.muscle]) muscleExOrder[f.muscle]=[];
      muscleExOrder[f.muscle].push(nm);
    });

    const exercises=t.exs.map(nm=>{
      const found=lib.find(e=>e.name===nm);
      if (!found) return null;
      if(isNovice && found.type==="isolation") return null;
      const m=found.muscle;
      const lm=muscles&&muscles[m];
      let mevSets=3;

      if(lm){
        const freq=muscleFreq[m]||1;
        const exsForMuscle=muscleExOrder[m]||[nm];
        const posInMuscle=exsForMuscle.indexOf(nm); // 0=first/main, 1=secondary, 2+=accessory
        const totalExs=exsForMuscle.length;

        // Sets per session = weekly MEV / frequency
        const mevPerSession=lm.mev/freq;

        // Taper weights: distribute sets toward main compound, less to accessory
        // Weights sum to 1.0: [0.50, 0.32, 0.18] for 3 exercises
        //                     [0.55, 0.45] for 2 exercises
        //                     [1.0] for 1 exercise
        const taperWeights=(()=>{
          if(totalExs===1) return [1.0];
          if(totalExs===2) return [0.55,0.45];
          if(totalExs===3) return [0.50,0.32,0.18];
          // 4+ exercises: diminishing returns
          return Array(totalExs).fill(null).map((_,i)=>{
            const w=Math.pow(0.6,i);
            return w;
          }).map((w,_,arr)=>w/arr.reduce((a,b)=>a+b,0));
        })();

        const weight=taperWeights[Math.min(posInMuscle,taperWeights.length-1)]||taperWeights[taperWeights.length-1];
        const rawSets=mevPerSession*weight;

        // Minimum: compounds=3, isolations=2
        const minSets=found.type==="compound"?3:2;
        mevSets=Math.min(expCap,Math.max(minSets,Math.round(rawSets)));
      }

      const mrvSets=lm?(()=>{
        const freq=muscleFreq[m]||1;
        const exsForMuscle=muscleExOrder[m]||[nm];
        const pos=exsForMuscle.indexOf(nm);
        const totalExs=exsForMuscle.length;
        const taperWeights=totalExs===1?[1.0]:totalExs===2?[0.55,0.45]:[0.50,0.32,0.18];
        const weight=taperWeights[Math.min(pos,taperWeights.length-1)]||taperWeights[taperWeights.length-1];
        const mavPerSession=lm.mav/freq;
        const minSets=found.type==="compound"?3:2;
        return Math.min(expCap+2,Math.max(mevSets+1,Math.round(mavPerSession*weight)));
      })():mevSets+2;

      const mvSets=lm?(()=>{
        const freq=muscleFreq[m]||1;
        const exsForMuscle=muscleExOrder[m]||[nm];
        const pos=exsForMuscle.indexOf(nm);
        const totalExs=exsForMuscle.length;
        const taperWeights=totalExs===1?[1.0]:totalExs===2?[0.55,0.45]:[0.50,0.32,0.18];
        const weight=taperWeights[Math.min(pos,taperWeights.length-1)]||taperWeights[taperWeights.length-1];
        return Math.max(1,Math.round((lm.mv/freq)*weight));
      })():Math.max(1,Math.ceil(mevSets/2));

      const rrScale = {
        "hypertrophy":    {compoundMin:6,  compoundMax:15, isoMin:10, isoMax:20},
        "strength-hyp":   {compoundMin:4,  compoundMax:10, isoMin:8,  isoMax:15},
        "power-hyp":      {compoundMin:3,  compoundMax:6,  isoMin:6,  isoMax:10},
      }[repRange||"hypertrophy"]||{compoundMin:6,compoundMax:15,isoMin:10,isoMax:20};
      const isCompound=found.type==="compound";
      const repOverride=isCompound
        ?{minReps:rrScale.compoundMin, maxReps:rrScale.compoundMax}
        :{minReps:rrScale.isoMin, maxReps:rrScale.isoMax};
      const sets=Array(mevSets).fill(null).map(()=>newSet("","normal"));
      return {...found,...repOverride,id:uid("ex"),lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",mevSets,mrvSets,mvSets,sets};
    }).filter(Boolean);

    return {id:uid("d"),day:days[i]||"Monday",name:t.name+suffix,exercises};
  });
}

// Rep range cycle per RP: Hypertrophy → Strength-Hyp → Power-Hyp → Hypertrophy
const REP_RANGE_CYCLE=["hypertrophy","strength-hyp","power-hyp"];
const REP_RANGE_LABELS={"hypertrophy":"Hypertrophy","strength-hyp":"Strength-Hyp","power-hyp":"Power-Hyp"};
const REP_RANGE_SUBS={"hypertrophy":"8–20 reps","strength-hyp":"4–12 reps","power-hyp":"3–8 reps"};
const nextRepRange=current=>{
  const idx=REP_RANGE_CYCLE.indexOf(current||"hypertrophy");
  return REP_RANGE_CYCLE[(idx+1)%REP_RANGE_CYCLE.length];
};
const Tag=({label,color})=>{const C=useContext(ThemeCtx);return(<span style={{fontSize:9,background:color+"1a",color,borderRadius:4,padding:"2px 7px",letterSpacing:1,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>);};
const SLbl=({children})=>{const C=useContext(ThemeCtx);return(<div style={{fontSize:10,color:C.muted,letterSpacing:2.5,textTransform:"uppercase",marginBottom:8}}>{children}</div>);};
const Card=({children,style,hi})=>{const C=useContext(ThemeCtx);return(<div style={{background:C.card,border:"1px solid "+(hi||C.border),borderRadius:12,padding:"14px 15px",marginBottom:10,...(style||{})}}>{children}</div>);};

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

function GlossaryModal({onClose}){
  const C=useContext(ThemeCtx);
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"#000a"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:"16px 16px 0 0",padding:"0 0 32px",width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{position:"sticky",top:0,background:C.surf,padding:"16px 16px 12px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:2.5,textTransform:"uppercase",marginBottom:2}}>Reference</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,letterSpacing:-0.5}}>RP GLOSSARY</div>
          </div>
          <button onClick={onClose} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:8,padding:"6px 12px",color:C.muted2,fontSize:12,cursor:"pointer"}}>CLOSE</button>
        </div>
        <div style={{padding:"14px 16px"}}>
          {GLOSSARY.map((g,i)=>(
            <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:i<GLOSSARY.length-1?"1px solid "+C.accent+"33":"none"}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:5}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:C.text}}>{g.term}</span>
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

function ExPicker({library,onAdd,onClose,title}){
  const C=useContext(ThemeCtx);
  const [q,setQ]=useState("");
  const [filt,setFilt]=useState("All");
  const muscles=["All",...Object.keys(MC)];
  const list=library.filter(e=>e.name.toLowerCase().includes(q.toLowerCase())&&(filt==="All"||e.muscle===filt));
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
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search exercises..." style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px 8px 32px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,display:"flex",pointerEvents:"none"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
          </div>
          <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none"}}>
            {muscles.map(m=>(
              <button key={m} onClick={()=>setFilt(m)} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+(filt===m?(MC[m]||C.accent):C.border),background:filt===m?(MC[m]||C.accent)+"20":"none",color:filt===m?(MC[m]||C.accent):C.muted,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{m}</button>
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
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"13px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:19,fontWeight:900,letterSpacing:3,color:C.accent}}>HYPER</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700}}>Session Summary</div>
          <div style={{fontSize:10,color:C.muted}}>{workout.day} - {workout.name}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px 24px"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:32,fontWeight:900,marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
          {(()=>{const tot=exs.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0);return don===0?"SESSION LOGGED":don<tot?"SESSION DONE":"GREAT WORK";})()}{don>0?<IcoFlame sz={28} col={C.accent}/>:null}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          {[{l:"SETS",v:don},{l:"VOLUME",v:totalVol>=1000?(totalVol/1000).toFixed(1)+"k":totalVol},{l:"TIME",v:fmt(elapsed)}].map(s=>(
            <div key={s.l} style={{background:C.card,border:"1px solid "+C.border,borderRadius:10,padding:"13px 8px",textAlign:"center"}}>
              <div style={{fontSize:19,fontWeight:800}}>{s.v}</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginTop:3,textTransform:"uppercase"}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <SLbl>Session Note</SLbl>
          <textarea value={sessionNote} onChange={e=>setSessionNote(e.target.value)} placeholder="Performance vs last week? Soreness going in? Any muscles that didn't fire? PRs, injuries, notes for next session..." rows={4} style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:13,resize:"none",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/>
        </div>
        <SLbl>Rate Each Exercise (SFR)</SLbl>
        <div style={{fontSize:11,color:C.muted,marginBottom:12,lineHeight:1.6}}>
          How well did this exercise work? <strong style={{color:C.muted2}}>5</strong> = great pump, felt in muscle, no joint pain. <strong style={{color:C.muted2}}>1</strong> = joint pain, couldn't feel target muscle. Low ratings flag for rotation next meso.
        </div>
        {lifts.map(ex=>{
          const mc=MC[ex.muscle]||"#888";
          const r=ratings[ex.id]||0;
          const scheme=buildScheme(ex.sets);
          return(
            <div key={ex.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:10,padding:"12px 13px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{ex.name}</div>
                  {scheme?<div style={{fontSize:11,color:C.muted,marginTop:2}}>{scheme}</div>:null}
                </div>
                <Tag label={ex.muscle} color={mc}/>
              </div>
              <div style={{display:"flex",gap:5}}>
                {[1,2,3,4,5].map(s=>(
                  <button key={s} onClick={()=>setRatings(prev=>({...prev,[ex.id]:s}))} style={{flex:1,padding:"9px 0",background:r>=s?C.accent+"20":C.surf,border:"1px solid "+(r>=s?C.accent+"55":C.border),borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}}>
                    <IcoStar sz={15} col={r>=s?C.accent:C.border2} filled={r>=s}/>
                  </button>
                ))}
              </div>
              {r>0&&r<=2?(
                <div style={{fontSize:11,color:C.accent,marginTop:7,display:"flex",alignItems:"center",gap:5}}>
                  <IcoWarn sz={12} col={C.accent}/> Flagged for rotation next meso
                </div>
              ):null}
            </div>
          );
        })}
        <button onClick={()=>onComplete(exs,ratings,sessionNote)} style={{width:"100%",marginTop:8,padding:"14px",background:C.accent,color:"#000",border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:"pointer",transition:"all .2s"}}>
          SAVE SESSION
        </button>
      </div>
    </div>
  );
}

function LoggerInner({workout,wk,totalWeeks,onMinimize,setPhase,exs,setExs,expId,setExpId,elapsed,don,tot,pct,liftHistory}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const exp=P.experience||"intermediate";
  // Build all-time best e1RM per exercise from history (Epley formula — accounts for reps)
  const allTimeBest=useMemo(()=>{
    const best={};
    (liftHistory||[]).forEach(e=>{
      if(!e.isDeload){
        const est=e1rm(e.topSetWeight,e.topSetReps||1);
        if(!best[e.exercise]||est>best[e.exercise]) best[e.exercise]=est;
      }
    });
    return best;
  },[liftHistory]);
  const [swiped,setSwiped]=useState(new Set());
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
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"12px 14px 10px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <button onClick={onMinimize} style={{background:"none",border:"1px solid "+C.border2,borderRadius:6,padding:"5px 10px",color:C.muted2,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="19 12 5 12"/><polyline points="12 19 5 12 12 5"/></svg>
            Minimize
          </button>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700}}><span style={{color:C.muted,fontWeight:500}}>{workout.day} - </span>{workout.name}</div>
            <div style={{fontSize:10,color:C.muted}}>Week {wk} - RIR target {defaultRIR(wk,totalWeeks,exp)}</div>
            <div style={{fontSize:10,color:C.muted2,marginTop:2}}>Do compounds first — heavier loads, more rest.</div>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:elapsed>3600?C.red:C.muted2}}>{fmt(elapsed)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:pct===100?C.green:C.accent,borderRadius:2,transition:"width .4s"}}/>
          </div>
          <span style={{fontSize:10,color:C.muted,flexShrink:0}}>{don}/{tot}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}} onTouchStart={e=>{if(e.target.tagName!=="INPUT"&&e.target.tagName!=="TEXTAREA"&&document.activeElement&&(document.activeElement.tagName==="INPUT"||document.activeElement.tagName==="TEXTAREA")){document.activeElement.blur();}}}>
        <div ref={listRef} style={{padding:"8px 12px 120px",position:"relative"}}>
          {dragFrom!==null?(
            <div style={{position:"fixed",left:0,right:0,top:ghostPos.y-24,zIndex:999,maxWidth:480,margin:"0 auto",padding:"0 12px",pointerEvents:"none"}}>
              <div style={{background:C.card2,border:"1px solid "+C.accent,borderRadius:10,padding:"12px 14px",boxShadow:"0 4px 24px #000000aa",display:"flex",alignItems:"center",gap:10}}>
                <IcoDrag sz={15} col={C.accent}/>
                <span style={{fontSize:14,fontWeight:700,color:C.text,flex:1}}>{ghostLbl}</span>
                <span style={{fontSize:11,color:C.accent,fontWeight:600,letterSpacing:1}}>MOVE</span>
              </div>
            </div>
          ):null}
          {exs.map((ex,idx)=>{
            const isO=expId===ex.id;
            const isDone=ex.sets.every(s=>s.done);
            const mc=MC[ex.muscle]||"#888";
            const dc=ex.sets.filter(s=>s.done).length;
            const isDrag=dragFrom===idx;
            const isTgt=insertAt===idx&&dragFrom!==null&&dragFrom!==idx;
            return(
              <div key={ex.id} data-xi={idx}>
                {isTgt?<div style={{height:3,background:C.accent,borderRadius:2,marginBottom:4,marginTop:-2,boxShadow:"0 0 8px "+C.accent+"88"}}/>:null}
                <div style={{background:isDrag?"#0f1420":isO?C.card2:C.card,border:"1px solid "+(isO?C.border2:C.border),borderLeft:"3px solid "+(isDone?C.green+"66":isO?mc:C.border),borderRadius:10,marginBottom:6,overflow:"hidden",opacity:isDrag?0.25:(isDone&&!isO?0.5:1),transition:"opacity .15s"}}>
                  <div onClick={()=>!dragRef.current.active&&setExpId(isO?null:ex.id)} style={{display:"flex",alignItems:"center",padding:"11px 12px",cursor:"pointer",gap:9}}>
                    <span onTouchStart={e=>hdlTS(e,idx)} onTouchMove={e=>hdlTM(e,idx)} onTouchEnd={hdlTE} style={{color:isDone?"transparent":C.muted2,cursor:isDone?"default":"grab",flexShrink:0,userSelect:"none",display:"flex",alignItems:"center",padding:"4px",touchAction:"none"}}>
                      <IcoDrag sz={15} col={isDone?"transparent":C.muted2}/>
                    </span>
                    <div style={{width:7,height:7,borderRadius:"50%",background:isDone?C.green:mc,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:700}}>{ex.name}</div>
                      {isDone?(
                        <div style={{fontSize:11,color:C.muted,marginTop:2}}>{buildScheme(ex.sets)}</div>
                      ):(
                        <div style={{marginTop:3}}>
                          {(()=>{
                            const pr=rpProg(ex.name,ex.lastWeight,ex.lastRIR,ex.lastReps,defaultRIR(wk,totalWeeks,exp),false,C,exp);
                            const sw=pr?pr.ws:(ex.lastWeight||"?");
                            const sc=ex.sets.filter(s=>s.type!=="drop").length;
                            const dc2=ex.sets.filter(s=>s.type==="drop").length;
                            return(
                              <div>
                                <span style={{fontSize:12,fontWeight:700,color:C.accent}}>{sw} lbs</span>
                                <span style={{fontSize:11,color:C.muted2}}> x {sc} sets</span>
                                {dc2>0?<span style={{fontSize:11,color:C.orange}}>  +{dc2} drop</span>:null}
                                <span style={{fontSize:10,color:C.muted,marginLeft:6}}>RIR {defaultRIR(wk,totalWeeks,exp)} target</span>
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
                          <div style={{fontSize:9,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",flexShrink:0}}>Last</div>
                          <div style={{fontSize:12,color:C.muted2,fontWeight:500}}>{ex.lastScheme}</div>
                        </div>
                      ):null}
                      <ProgBanner ex={ex} wk={wk} totalWeeks={totalWeeks} isDeload={wk===totalWeeks} deloadStyle={deloadStyle}/>
                      {getProfile(ex.name).type==="compound"&&!ex.lastWeight&&wk===1?(
                        <div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.blue+"12",border:"1px solid "+C.blue+"33",borderRadius:8,padding:"8px 11px",marginBottom:11}}>
                          <IcoInfo/>
                          <div style={{fontSize:12,color:C.muted2,lineHeight:1.5}}>Warm up first — do 2–3 sets ramping from ~50% to ~80% of your working weight before logging sets here.</div>
                        </div>
                      ):null}
                      <div style={{display:"grid",gridTemplateColumns:"18px 1fr 1fr 36px 58px 24px",gap:5,marginBottom:7,paddingBottom:6,borderBottom:"1px solid "+C.border}}>
                        {["#","Weight","Reps","RIR","",""].map((h,i)=>(
                          <span key={i} style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1.5}}>{h}</span>
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
                        // Per-exercise rep ranges: compounds 5-20, isolation 8-30, calves/core higher
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
                              <div style={{display:"grid",gridTemplateColumns:"18px 1fr 1fr 36px 58px 24px",gap:5,alignItems:"center",transform:isRev?"translateX(-48px)":"translateX(0)",transition:"transform .2s"}}>
                                <div style={{textAlign:"center"}}>
                                  {iDr?<span style={{fontSize:9,color:C.orange}}>Drop</span>:<span style={{fontSize:10,color:C.muted}}>{si+1}</span>}
                                </div>
                                <div style={{position:"relative"}}>
                                  <input type="number" inputMode="decimal" pattern="[0-9]*" enterKeyHint="next" disabled={set.done} value={set.weight} onChange={e=>updS(ex.id,set.id,"weight",e.target.value)} placeholder="lbs" style={{background:iDr?C.orange+"15":C.surf,border:"1px solid "+(iDr?C.orange+"44":C.border),borderRadius:6,padding:"8px 6px",color:iDr?C.orange:C.text,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",width:"100%"}}/>
                                  {(()=>{
                                    if(!set.done) return null;
                                    const w=parseFloat(set.weight)||0;
                                    const r=parseInt(set.reps)||1;
                                    const est=e1rm(w,r);
                                    const best=allTimeBest[ex.name]||0;
                                    if(est>0&&est>=best&&best>0) return(
                                      <span style={{position:"absolute",top:-6,right:-4,fontSize:8,fontWeight:800,color:C.accent,letterSpacing:0.5,background:C.accent+"22",borderRadius:3,padding:"1px 4px",lineHeight:1.4}}>PR</span>
                                    );
                                    return null;
                                  })()}
                                </div>
                                <input type="number" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" disabled={set.done} value={set.reps} onChange={e=>updS(ex.id,set.id,"reps",e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!set.done) logSet(ex.id,set.id);}} placeholder="reps" style={{background:C.surf,border:"1px solid "+C.border,borderRadius:6,padding:"8px 6px",color:C.text,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",width:"100%"}}/>
                                <button disabled={set.done} onClick={()=>cycleRIR(ex.id,set.id,set.rir)} style={{background:rbg,border:"1px solid "+rfg+"55",borderRadius:6,padding:"8px 0",cursor:set.done?"default":"pointer",color:rfg,fontSize:13,fontWeight:800,textAlign:"center",transition:"all .1s",width:"100%"}}>{set.rir}</button>
                                {set.done&&restTimers[set.id]>0?(
                                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.border2,border:"1px solid "+C.border2,borderRadius:6,padding:"8px 0",fontSize:12,fontWeight:700,color:C.muted2}}>{fmt(restTimers[set.id])}</div>
                                ):(()=>{
                                  const isEmpty=!set.weight||!set.reps;
                                  return(
                                    <button onClick={()=>{if(set.done)return;logSet(ex.id,set.id);}} style={{padding:"8px 0",borderRadius:6,fontWeight:800,fontSize:11,letterSpacing:1.5,cursor:set.done?"default":"pointer",transition:"all .15s",background:set.done?C.green+"22":isEmpty?C.border:C.accent,border:"1px solid "+(set.done?C.green+"44":isEmpty?C.border2:C.accent),color:set.done?C.green:isEmpty?C.muted:"#000",display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent",activeStyle:{transform:"scale(0.95)"}}}>
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
                        <textarea rows={1} value={ex.note} onChange={e=>updN(ex.id,e.target.value)} placeholder="Exercise cue" style={{width:"100%",background:C.surf,border:"1px solid "+C.border,borderRadius:7,padding:"8px 10px",color:C.muted2,fontSize:12,resize:"none",outline:"none",lineHeight:1.5}}/>
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
        }} disabled={pct<100&&don===0} style={{width:"100%",padding:"14px",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:pct<100&&don===0?"default":"pointer",transition:"all .2s",background:pct===100?C.accent:don===0?C.border:C.card2,border:"1px solid "+(pct===100?C.accent:don===0?C.border:C.border2),color:pct===100?"#000":don===0?C.muted+"66":C.muted}}>
          {pct===100?"FINISH WORKOUT":"FINISH EARLY — "+don+" of "+tot+" sets done"}
        </button>
      </div>
    </div>
  );
}

function Logger({workout,wk,totalWeeks,isDeload,deloadStyle,onComplete,onMinimize,visible,liftHistory,savedExs,onExsChange}){
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
  const [expId,setExpId]=useState(null);
  const [phase,setPhase]=useState("log");
  const [elapsed,setElapsed]=useState(0);
  const [ratings,setRatings]=useState({});
  const [sessionNote,setSessionNote]=useState("");
  const t0=useRef(Date.now());
  useEffect(()=>{
    const t=setInterval(()=>setElapsed(Math.floor((Date.now()-t0.current)/1000)),1000);
    return ()=>clearInterval(t);
  },[]);
  const tot=exs.reduce((a,e)=>a+e.sets.filter(s=>s.type!=="drop").length,0);
  const don=exs.reduce((a,e)=>a+e.sets.filter(s=>s.done&&s.type!=="drop").length,0);
  const pct=tot>0?(don/tot)*100:0;
  const totalVol=exs.reduce((a,e)=>a+e.sets.filter(s=>s.done&&s.type!=="drop"&&s.weight&&s.reps).reduce((b,s)=>b+(parseFloat(s.weight)||0)*(parseFloat(s.reps)||0),0),0);
  return(
    <div style={{display:visible?"flex":"none",position:"fixed",inset:0,zIndex:300,flexDirection:"column",background:C.bg,maxWidth:480,margin:"0 auto"}}>
      {phase==="summary"?(
        <SessionSummary workout={workout} exs={exs} ratings={ratings} setRatings={setRatings} don={don} totalVol={totalVol} elapsed={elapsed} sessionNote={sessionNote} setSessionNote={setSessionNote} onComplete={onComplete}/>
      ):(
        <LoggerInner workout={workout} wk={wk} totalWeeks={totalWeeks} onMinimize={onMinimize} setPhase={setPhase} exs={exs} setExs={setExsFn} expId={expId} setExpId={setExpId} elapsed={elapsed} don={don} tot={tot} pct={pct} liftHistory={liftHistory}/>
      )}
    </div>
  );
}

function SessionEditModal({session,onSave,onClose}){
  const C=useContext(ThemeCtx);
  const [note,setNote]=useState(session.note||"");
  const [exs,setExs]=useState(session.exercises?session.exercises.map(ex=>({
    ...ex,
    sets:ex.sets.map(s=>({...s}))
  })):null);
  const updW=(eid,sid,v)=>setExs(p=>p.map(e=>e.id!==eid?e:{...e,sets:e.sets.map(s=>s.id!==sid?s:{...s,weight:v})}));
  const updR=(eid,sid,v)=>setExs(p=>p.map(e=>e.id!==eid?e:{...e,sets:e.sets.map(s=>s.id!==sid?s:{...s,reps:v})}));
  return(
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"#000a"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 16px 12px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,letterSpacing:1}}>{session.day}</div>
            <div style={{fontSize:11,color:C.muted}}>{session.date} · Week {session.week}</div>
          </div>
          <button onClick={onClose} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:8,padding:"6px 12px",color:C.muted2,fontSize:12,cursor:"pointer"}}>Cancel</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
          <div style={{marginBottom:16}}>
            <SLbl>Session Note</SLbl>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Session notes..." style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:13,resize:"none",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/>
          </div>
          {exs?exs.map(ex=>(
            <div key={ex.id} style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:MC[ex.muscle]||"#888"}}/>
                <span style={{fontSize:13,fontWeight:700}}>{ex.name}</span>
                <Tag label={ex.muscle} color={MC[ex.muscle]||"#888"}/>
              </div>
              {ex.sets.filter(s=>s.done&&!s.incomplete).map((set,si)=>(
                <div key={set.id} style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr",gap:8,alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:10,color:C.muted,textAlign:"center"}}>{set.type==="drop"?"D":si+1}</span>
                  <input type="number" inputMode="decimal" value={set.weight} onChange={e=>updW(ex.id,set.id,e.target.value)} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",width:"100%"}}/>
                  <input type="number" inputMode="numeric" value={set.reps} onChange={e=>updR(ex.id,set.id,e.target.value)} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",width:"100%"}}/>
                </div>
              ))}
            </div>
          )):<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>No detailed set data for this session</div>}
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid "+C.border,flexShrink:0}}>
          <button onClick={()=>onSave(note,exs)} style={{width:"100%",padding:"14px",background:C.accent,color:"#000",border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:"pointer"}}>SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
}

function MesoCompleteScreen({meso,liftHistory,mesoNum,onStartNext,onReview,program}){
  const C=useContext(ThemeCtx);
  const suggested=nextRepRange(meso.repRange);
  const mesoEntries=liftHistory.filter(e=>e.mesoNum===mesoNum&&!e.isDeload);
  const uniqueExs=[...new Set(mesoEntries.map(e=>e.exercise))];
  const prs=uniqueExs.map(name=>{
    const ents=mesoEntries.filter(e=>e.exercise===name&&!e.isDeload).sort((a,b)=>a.week-b.week);
    if(ents.length<2) return null;
    const first=ents[0].topSetWeight;
    const peak=ents[ents.length-1].topSetWeight;
    const pct=parseFloat(((peak-first)/first*100).toFixed(1));
    if(pct<=0) return null;
    return {name,muscle:ents[0].muscle,first,peak,pct};
  }).filter(Boolean).sort((a,b)=>b.pct-a.pct);

  // Collect exercises flagged with low SFR (≤2 stars) across this meso
  const flagged=[];
  (program||[]).forEach(day=>{
    day.exercises.forEach(ex=>{
      if(ex.lastSFR&&ex.lastSFR<=2) flagged.push({name:ex.name,muscle:ex.muscle,sfr:ex.lastSFR});
    });
  });
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"13px 16px",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:19,fontWeight:900,letterSpacing:3,color:C.accent}}>HYPER</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700}}>Meso Complete</div>
          <div style={{fontSize:10,color:C.muted}}>{meso.label}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px 14px 100px"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:36,fontWeight:900,marginBottom:4,display:"flex",alignItems:"center",gap:12}}>
          MESO {mesoNum} DONE <IcoTrophy sz={32} col={C.accent}/>
        </div>
        <div style={{fontSize:13,color:C.muted2,marginBottom:24,lineHeight:1.6}}>{meso.totalWeeks} weeks in the books. Here is what you built.</div>
        <Card hi={C.accent+"33"}>
          <SLbl>Meso Summary</SLbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:C.surf,borderRadius:9,padding:"12px"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.accent}}>{meso.totalWeeks}</div>
              <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginTop:2}}>Weeks trained</div>
            </div>
            <div style={{background:C.surf,borderRadius:9,padding:"12px"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.green}}>{prs.length}</div>
              <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginTop:2}}>Lifts improved</div>
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
        ):null}
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
                <div style={{display:"flex",gap:2}}>
                  {[1,2,3,4,5].map(s=><div key={s} style={{width:8,height:8,borderRadius:"50%",background:ex.sfr>=s?C.accent:C.border2}}/>)}
                </div>
              </div>
            ))}
            <div style={{fontSize:11,color:C.muted2,marginTop:10,lineHeight:1.5}}>Tap "Review &amp; Edit Program" to make swaps before launching.</div>
          </Card>
        ):null}
        <Card hi={C.blue+"33"}>
          <SLbl>Rep Range — Next Meso</SLbl>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{flex:1,background:C.surf,borderRadius:8,padding:"10px 12px",textAlign:"center",opacity:0.6}}>
              <div style={{fontSize:11,fontWeight:600,color:C.muted2}}>{REP_RANGE_LABELS[meso.repRange||"hypertrophy"]}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>{REP_RANGE_SUBS[meso.repRange||"hypertrophy"]}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:3,letterSpacing:1,textTransform:"uppercase"}}>This meso</div>
            </div>
            <div style={{fontSize:16,color:C.muted}}>→</div>
            <div style={{flex:1,background:C.accent+"18",border:"1px solid "+C.accent+"44",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color:C.accent}}>{REP_RANGE_LABELS[suggested]}</div>
              <div style={{fontSize:10,color:C.muted2,marginTop:2}}>{REP_RANGE_SUBS[suggested]}</div>
              <div style={{fontSize:9,color:C.accent,marginTop:3,letterSpacing:1,textTransform:"uppercase"}}>Suggested next</div>
            </div>
          </div>
          <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>RP recommends rotating rep ranges across mesos to prevent accommodation and protect joints.</div>
        </Card>
        <button onClick={()=>onStartNext(suggested)} style={{width:"100%",padding:"15px",background:C.accent,color:"#000",border:"none",borderRadius:11,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,letterSpacing:3,cursor:"pointer",marginBottom:10}}>START NEXT MESO</button>
        <button onClick={()=>onReview(suggested)} style={{width:"100%",padding:"13px",background:"none",color:C.muted2,border:"1px solid "+C.border2,borderRadius:11,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:2,cursor:"pointer"}}>REVIEW &amp; EDIT PROGRAM FIRST</button>
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
  const userName=profile&&profile.name?profile.name:"";
  return(
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{padding:"16px 14px 100px"}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,color:C.muted,letterSpacing:1.5,textTransform:"uppercase"}}>{getGreeting()}</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:32,fontWeight:900,letterSpacing:-0.5,lineHeight:1.1}}>{userName.toUpperCase()}</div>
        </div>
        {activeLog?(
          <div style={{background:C.green+"15",border:"1px solid "+C.green+"44",borderRadius:12,padding:"14px 15px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:confirmAbandon?10:10}}>
              <div>
                <div style={{fontSize:10,color:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>In Progress</div>
                <div style={{fontSize:14,fontWeight:700}}>{activeLog.name}</div>
              </div>
              {!confirmAbandon?(
                <button onClick={()=>setConfirmAbandon(true)} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",padding:"4px"}}>Abandon</button>
              ):null}
            </div>
            {confirmAbandon?(
              <div style={{marginBottom:10}}>
                <div style={{fontSize:12,color:C.muted2,marginBottom:8}}>Abandon this session? All progress will be lost.</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setConfirmAbandon(false)} style={{flex:1,padding:"9px",background:"none",border:"1px solid "+C.border2,borderRadius:8,color:C.muted2,cursor:"pointer",fontSize:12}}>Keep Going</button>
                  <button onClick={()=>{setConfirmAbandon(false);onAbandon();}} style={{flex:1,padding:"9px",background:C.red+"22",border:"1px solid "+C.red+"44",borderRadius:8,color:C.red,cursor:"pointer",fontSize:12,fontWeight:700}}>Yes, Abandon</button>
                </div>
              </div>
            ):(
              <button onClick={()=>{setConfirmAbandon(false);onResume();}} style={{width:"100%",padding:"12px",background:C.green,color:"#000",border:"none",borderRadius:8,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:900,letterSpacing:2,cursor:"pointer"}}>RESUME WORKOUT</button>
            )}
          </div>
        ):null}
        <Card hi={C.accent+"33"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <SLbl>Active Mesocycle</SLbl>
              <div style={{fontSize:16,fontWeight:700}}>{meso.label}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:30,fontWeight:900,color:C.accent,lineHeight:1}}>WK {meso.week}</div>
              <div style={{fontSize:10,color:C.muted}}>of {meso.totalWeeks}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:10}}>
            {FULL.map((full,i)=>{
              const dp=dmap[full];
              const isT=full===TODAY;
              const isPast=FULL.indexOf(full)<todayIdx;
              const cat=getCat(dp);
              const isDone=dp&&completedDayNames.has(dp.name);
              return(
                <div key={full} style={{textAlign:"center"}}>
                  <div style={{fontSize:9,fontWeight:isT?700:400,color:isT?C.accent:C.muted,letterSpacing:0.5,marginBottom:4,textTransform:"uppercase"}}>{SHORT[i]}</div>
                  <div style={{height:42,borderRadius:7,background:isDone?C.green+"18":cat?C.card2:C.surf,border:"1px solid "+(isDone?C.green+"44":isT?C.accent+"88":cat?C.border2:C.border),display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,opacity:isPast&&!isDone?0.40:1}}>
                    {isDone?<IcoCheck sz={12} col={C.green}/>:cat?<span style={{fontSize:10,fontWeight:700,color:isT?C.accent:C.muted2,letterSpacing:0.3}}>{cat}</span>:<div style={{width:12,height:1.5,background:C.border,borderRadius:1}}/>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,paddingTop:8,borderTop:"1px solid "+C.border}}>
            <span>RIR target: <strong style={{color:C.text}}>{defaultRIR(meso.week,meso.totalWeeks,exp)}</strong></span>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:meso.totalWeeks-meso.week===0?C.accent:C.muted}}>{meso.totalWeeks-meso.week===0?"Deload Week":meso.totalWeeks-meso.week+" weeks remaining"}</span>
              {meso.totalWeeks-meso.week===1?(
                <button onClick={onExtendMeso} style={{background:"none",border:"1px solid "+C.border2,borderRadius:5,padding:"3px 8px",color:C.muted2,fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>+ 1 week</button>
              ):null}
            </div>
          </div>
        </Card>
        {needsDeloadChoice?(
          <Card hi={C.blue+"44"}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:900,letterSpacing:1,marginBottom:4}}>DELOAD WEEK</div>
            <div style={{fontSize:12,color:C.muted2,lineHeight:1.6,marginBottom:16}}>Choose your deload style for this week. This can't be changed once selected.</div>
            <div style={{display:"flex",gap:10,marginBottom:4}}>
              <button onClick={()=>onSetDeloadStyle("volume")} style={{flex:1,padding:"14px 10px",background:C.card2,border:"1px solid "+C.border2,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Volume Deload</div>
                <div style={{fontSize:11,color:C.muted2,lineHeight:1.5}}>Same weight, sets cut in half. Best when you're tired but joints feel okay.</div>
              </button>
              <button onClick={()=>onSetDeloadStyle("intensity")} style={{flex:1,padding:"14px 10px",background:C.card2,border:"1px solid "+C.border2,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Intensity Deload</div>
                <div style={{fontSize:11,color:C.muted2,lineHeight:1.5}}>Same sets, weight cut ~50%. Best when joints are sore and you need physical relief.</div>
              </button>
            </div>
          </Card>
        ):isDeloadWeek&&meso.deloadStyle?(
          <div style={{display:"flex",alignItems:"center",gap:8,background:C.blue+"12",border:"1px solid "+C.blue+"33",borderRadius:10,padding:"10px 14px",marginBottom:10}}>
            <IcoInfo/>
            <span style={{fontSize:12,color:C.muted2}}><strong style={{color:C.text}}>{meso.deloadStyle==="intensity"?"Intensity":"Volume"} Deload</strong> — {meso.deloadStyle==="intensity"?"Same sets, ~50% weight.":"Same weight, sets halved."} RIR 4 throughout.</span>
          </div>
        ):null}
        <Card hi={C.accent+"55"}>
          <SLbl>Today - {TODAY}</SLbl>
          {todayWorkout?(
            <div>
              <div style={{fontSize:20,fontWeight:800,marginBottom:14}}>{todayWorkout.name}</div>
              <div style={{display:"flex",gap:20,paddingTop:12,borderTop:"1px solid "+C.border,marginBottom:14}}>
                <div><span style={{fontSize:22,fontWeight:800,color:C.accent}}>{totalSets}</span><span style={{fontSize:10,color:C.muted,marginLeft:4}}>SETS</span></div>
                <div><span style={{fontSize:22,fontWeight:800,color:C.accent}}>{todayWorkout.exercises.length}</span><span style={{fontSize:10,color:C.muted,marginLeft:4}}>EXERCISES</span></div>
                <div><span style={{fontSize:22,fontWeight:800,color:C.accent}}>RIR {defaultRIR(meso.week,meso.totalWeeks,exp)}</span></div>
              </div>
              <button onClick={()=>activeLog&&activeLog.name===todayWorkout.name?onResume():onStart(null)} style={{width:"100%",padding:"14px",background:C.accent,color:"#000",border:"none",borderRadius:9,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,letterSpacing:3,cursor:"pointer"}}>{activeLog&&activeLog.name===todayWorkout.name?"RESUME WORKOUT":"START WORKOUT"}</button>
            </div>
          ):(
            <div>
              <div style={{fontSize:18,fontWeight:700,marginBottom:4,color:C.muted2}}>Rest Day</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:16}}>{nextTraining?"Next up: "+nextTraining.day+" — "+nextTraining.name:"Next session starts next week."}</div>
              <div style={{fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Train anyway</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {program.map(d=>(
                  <button key={d.id} onClick={()=>onStart(d)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.card2,border:"1px solid "+C.border2,borderRadius:9,color:C.text,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                    <span>{d.name}</span>
                    <span style={{fontSize:11,color:C.muted}}>{d.exercises.length} exercises</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card>
          <SLbl>Recent Sessions</SLbl>
          {history.length===0?<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>No sessions logged yet</div>:history.slice(0,4).map((s,i)=>(
            <div key={i} style={{paddingBottom:i<Math.min(history.length,4)-1?"12px":0,marginBottom:i<Math.min(history.length,4)-1?"12px":0,borderBottom:i<Math.min(history.length,4)-1?"1px solid "+C.border:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{s.day}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.date} · Week {s.week}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:s.sets===s.planned?C.green:C.accent}}>{s.sets}/{s.planned}</div>
                    <div style={{fontSize:9,color:C.muted}}>sets</div>
                  </div>
                  <button onClick={()=>onEdit(s,i)} style={{background:"none",border:"1px solid "+C.border2,borderRadius:6,padding:"4px 9px",color:C.muted2,fontSize:11,cursor:"pointer"}}>Edit</button>
                </div>
              </div>
              {s.note?<div style={{fontSize:11,color:C.muted2,marginTop:5,fontStyle:"italic",lineHeight:1.4}}>"{s.note}"</div>:null}
            </div>
          ))}
        </Card>
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
    <div>
      <Card hi={C.accent+"33"}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <SLbl>Current Meso</SLbl>
            <div style={{fontSize:15,fontWeight:700}}>{meso.label}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.accent,lineHeight:1}}>WK {meso.week}</div>
            <div style={{fontSize:10,color:C.muted}}>of {meso.totalWeeks}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          {Array(meso.totalWeeks).fill(null).map((_,i)=>(
            <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<meso.week-1?C.accent:i===meso.week-1?C.accent+"88":C.border2}}/>
          ))}
        </div>
        <div style={{display:"flex",gap:16,paddingTop:10,borderTop:"1px solid "+C.border}}>
          <div><span style={{fontSize:18,fontWeight:800}}>{completed}</span><span style={{fontSize:10,color:C.muted,marginLeft:4}}>SESSIONS</span></div>
          <div><span style={{fontSize:18,fontWeight:800}}>{defaultRIR(meso.week,meso.totalWeeks,exp)}</span><span style={{fontSize:10,color:C.muted,marginLeft:4}}>TARGET RIR</span></div>
          <div><span style={{fontSize:18,fontWeight:800,color:meso.totalWeeks-meso.week<=1?C.accent:C.text}}>{meso.totalWeeks-meso.week}</span><span style={{fontSize:10,color:C.muted,marginLeft:4}}>WKS LEFT</span></div>
        </div>
      </Card>
      <Card>
        <SLbl>Session Consistency — Week {meso.week}</SLbl>
        {sessions.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,paddingBottom:i<sessions.length-1?"9px":0,marginBottom:i<sessions.length-1?"9px":0,borderBottom:i<sessions.length-1?"1px solid "+C.border:"none",opacity:s.done?1:0.5}}>
            <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:s.done?C.green:C.border2}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:s.done?C.text:C.muted}}>{s.day}</div>
              <div style={{fontSize:10,color:C.muted}}>{s.weekday}</div>
            </div>
            <div style={{fontSize:11,color:C.muted}}>{s.done?s.sets+"/"+s.planned+" sets":"Upcoming"}</div>
            {s.done&&s.sets<s.planned?<span style={{fontSize:9,background:C.accent+"22",color:C.accent,borderRadius:4,padding:"2px 6px",letterSpacing:1,fontWeight:700}}>{s.planned-s.sets} SKIPPED</span>:null}
          </div>
        ))}
      </Card>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <SLbl>Volume vs Landmarks</SLbl>
            <div style={{fontSize:11,color:C.muted,marginTop:-4}}>Week {meso.week} — actual vs planned sets per muscle</div>
          </div>
          <button onClick={onGlossary} style={{background:"none",border:"1px solid "+C.border2,borderRadius:20,padding:"3px 10px",color:C.muted2,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Landmarks
          </button>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:14,fontSize:10,color:C.muted,flexWrap:"wrap"}}>
          {[{l:"Below MEV",c:C.muted+"66"},{l:"In range",c:C.green},{l:"High",c:C.accent},{l:"At MRV",c:C.red}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:2,background:x.c}}/>{x.l}</div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:2,background:C.muted+"44",border:"1px solid "+C.border2}}/><span>Planned</span></div>
        </div>
        {programMuscles.length===0?<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>Build your program to see volume tracking</div>:programMuscles.map(m=>{
          const lm=muscles[m];
          const planned=weeklyVol[m]||0;
          const actual=actualVol[m]||0;
          const hasActual=actual>0;
          // Status and color based on actual if we have it, otherwise planned
          const sv=hasActual?actual:planned;
          const pv=Math.min(sv/lm.mrv,1);
          const plannedPv=Math.min(planned/lm.mrv,1);
          const mc=MC[m]||"#888";
          const sl=sv<lm.mev?"BELOW MEV":sv<=lm.mav?"IN RANGE":sv<lm.mrv?"HIGH VOL":"AT MRV";
          const fc=sv>=lm.mrv?C.red:sv>lm.mav?C.accent:sv>=lm.mev?C.green:C.muted+"66";
          const sc=fc===C.muted+"66"?C.muted:fc;
          const freq=program.reduce((a,d)=>a+(d.exercises.some(e=>e.muscle===m)?1:0),0);
          // Have all planned sessions for this muscle been done this week?
          const muscleSessionsDone=program.filter(d=>d.exercises.some(e=>e.muscle===m)).every(d=>completedDayNames.has(d.name));
          return(
            <div key={m} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:mc}}/>
                  <span style={{fontSize:12,fontWeight:600}}>{m}</span>
                  <span style={{fontSize:9,color:C.muted,background:C.card2,borderRadius:3,padding:"1px 5px"}}>{freq}×/wk</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:hasActual?C.text:C.muted}}>
                    {hasActual?(
                      <>{actual}<span style={{fontSize:10,fontWeight:400,color:C.muted}}>/{planned} planned</span></>
                    ):(
                      <>{planned}<span style={{fontSize:10,fontWeight:400,color:C.muted}}>/{lm.mrv} mrv</span></>
                    )}
                  </span>
                  <Tag label={hasActual?sl:(muscleSessionsDone?"DONE":"PLANNED")} color={hasActual?sc:C.muted}/>
                </div>
              </div>
              <div style={{position:"relative",height:8,background:C.border2,borderRadius:4}}>
                {/* Landmark tick marks */}
                <div style={{position:"absolute",left:(lm.mv/lm.mrv*100)+"%",top:-3,bottom:-3,width:2,background:"#ffffff22",borderRadius:1,zIndex:3}}/>
                <div style={{position:"absolute",left:(lm.mev/lm.mrv*100)+"%",top:-3,bottom:-3,width:2,background:"#ffffff33",borderRadius:1,zIndex:3}}/>
                <div style={{position:"absolute",left:(lm.mav/lm.mrv*100)+"%",top:-3,bottom:-3,width:2,background:"#ffffff33",borderRadius:1,zIndex:3}}/>
                {/* Planned bar — ghost/muted, shown behind actual */}
                {hasActual?(
                  <div style={{position:"absolute",top:0,left:0,height:"100%",width:(plannedPv*100)+"%",background:C.border2,borderRadius:4,zIndex:1,border:"1px solid "+C.border2,boxSizing:"border-box"}}/>
                ):null}
                {/* Actual bar — solid, on top */}
                <div style={{position:"absolute",top:0,left:0,height:"100%",width:(pv*100)+"%",background:hasActual?fc:C.muted+"44",borderRadius:4,zIndex:2,transition:"width .4s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:C.muted}}>
                <span>MV {lm.mv}</span><span>MEV {lm.mev}</span><span>MAV {lm.mav}</span><span>MRV {lm.mrv}</span>
              </div>
              {hasActual&&actual<planned&&!muscleSessionsDone?(
                <div style={{fontSize:10,color:C.muted2,marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                  <IcoWarn sz={9} col={C.muted2}/> {planned-actual} sets still to go this week
                </div>
              ):null}
              {freq===1&&sv>=lm.mev?(
                <div style={{fontSize:10,color:C.muted2,marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                  <IcoWarn sz={9} col={C.muted2}/> Training 2×/week improves SRA for this muscle
                </div>
              ):null}
            </div>
          );
        })}
      </Card>
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
    <div>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <SLbl>Lift Progress</SLbl>
          <button onClick={onGlossary} style={{background:"none",border:"1px solid "+C.border2,borderRadius:20,padding:"3px 10px",color:C.muted2,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Glossary
          </button>
        </div>
        {liftHistory.length===0?(
          <div style={{padding:"32px 0",textAlign:"center",color:C.muted,fontSize:12}}>Complete your first session to start tracking lift progress</div>
        ):(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              <select value={aMuscle} onChange={e=>pickMuscle(e.target.value)} style={{background:C.card2,border:"1px solid "+C.border2,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:12,fontWeight:600,outline:"none",cursor:"pointer",width:"100%"}}>
                {allMuscles.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <select value={aEx} onChange={e=>setAEx(e.target.value)} style={{background:C.card2,border:"1px solid "+C.border2,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:12,fontWeight:600,outline:"none",cursor:"pointer",width:"100%"}}>
                {exsForMuscle.length>0?exsForMuscle.map(n=><option key={n} value={n}>{n}</option>):<option>No data</option>}
              </select>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[{id:"alltime",l:"All Mesos"},{id:"thismeso",l:"This Meso"}].map(z=>(
                <button key={z.id} onClick={()=>setZoom(z.id)} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+(zoom===z.id?C.blue:C.border),background:zoom===z.id?C.blue+"15":C.surf,color:zoom===z.id?C.blue:C.muted,fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>{z.l}</button>
              ))}
            </div>
            {chartData.length>0?(
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <XAxis dataKey="label" tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false} interval={zoom==="alltime"?2:0}/>
                    <YAxis tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
                    <Tooltip contentStyle={{background:C.card2,border:"1px solid "+C.border2,borderRadius:8,fontSize:12}} itemStyle={{color:C.accent}} labelStyle={{color:C.muted2}} formatter={(v,_,entry)=>[v+" lbs"+(entry.payload&&entry.payload.deload?" (deload)":""),""]}/>
                    {zoom==="alltime"?bounds.map(b=><ReferenceLine key={b} x={b} stroke={C.border2} strokeDasharray="3 3"/>):null}
                    <Line type="monotone" dataKey="v" stroke={C.accent} strokeWidth={2} dot={<ChartDot/>} activeDot={{r:6,fill:C.accent}} connectNulls/>
                  </LineChart>
                </ResponsiveContainer>
                {zoom==="alltime"?(
                  <div style={{marginTop:10,padding:"8px 10px",background:C.blue+"12",border:"1px solid "+C.blue+"33",borderRadius:7,fontSize:11,color:C.muted2,lineHeight:1.5,display:"flex",alignItems:"flex-start",gap:7}}>
                    <IcoUp sz={13} col={C.blue}/>
                    <span>The dip after each deload is intentional. You come back lighter and build to a new peak.</span>
                  </div>
                ):null}
              </div>
            ):<div style={{padding:"24px 0",textAlign:"center",color:C.muted,fontSize:12}}>No history yet for this exercise</div>}
          </div>
        )}
      </Card>

      {mesoPeaks.length>=2?(
        <Card>
          <SLbl>Peak Per Meso — {aEx}</SLbl>
          <div style={{fontSize:11,color:C.muted2,marginBottom:14,lineHeight:1.5}}>Top set weight each block. This is the clearest signal of long-term progress.</div>
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
                <div key={p.mesoNum} style={{marginBottom:i<mesoPeaks.length-1?14:0,paddingBottom:i<mesoPeaks.length-1?14:0,borderBottom:i<mesoPeaks.length-1?"1px solid "+C.accent+"33":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <div style={{fontSize:11,color:C.muted,fontWeight:600,minWidth:52}}>{p.label}</div>
                    <div style={{flex:1,height:7,background:C.border2,borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:barW+"%",background:barColor,borderRadius:4,transition:"width .5s"}}/>
                    </div>
                    <div style={{fontSize:14,fontWeight:800,color:C.text,minWidth:52,textAlign:"right"}}>{p.weight} lbs</div>
                    <div style={{minWidth:44,textAlign:"right"}}>
                      {trending==="up"?<span style={{fontSize:11,fontWeight:700,color:C.green}}>+{diff} lbs</span>:
                       trending==="down"?<span style={{fontSize:11,fontWeight:700,color:C.red}}>{diff} lbs</span>:
                       trending==="flat"?<span style={{fontSize:11,color:C.muted}}>—</span>:
                       <span style={{fontSize:10,color:C.muted}}>Baseline</span>}
                    </div>
                  </div>
                  {pct!==null&&trending!=="flat"?(
                    <div style={{paddingLeft:62,fontSize:10,color:trending==="up"?C.green:C.red}}>{trending==="up"?"+":""}{pct}% vs previous block</div>
                  ):null}
                </div>
              );
            });
          })()}
          {(()=>{
            if(mesoPeaks.length<2) return null;
            const first=mesoPeaks[0].weight;
            const last=mesoPeaks[mesoPeaks.length-1].weight;
            const totalDiff=last-first;
            const totalPct=parseFloat(((totalDiff/first)*100).toFixed(1));
            const up=totalDiff>0;
            const flat=totalDiff===0;
            return(
              <div style={{marginTop:14,padding:"10px 12px",background:flat?C.surf:up?C.green+"12":C.red+"12",border:"1px solid "+(flat?C.border:up?C.green+"33":C.red+"33"),borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
                {flat?<span style={{fontSize:12,color:C.muted}}>No change across {mesoPeaks.length} mesos.</span>:(
                  <>
                    {up?<IcoUp sz={13} col={C.green}/>:<IcoDown sz={13} col={C.red}/>}
                    <span style={{fontSize:12,color:up?C.green:C.red,fontWeight:600}}>
                      {up?"+":""}{totalDiff} lbs ({up?"+":""}{totalPct}%) across {mesoPeaks.length} mesos
                    </span>
                  </>
                )}
              </div>
            );
          })()}
        </Card>
      ):null}

      <Card>
        <SLbl>Personal Records</SLbl>
        {prs.length===0?<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>No sessions logged yet</div>:prs.map((p,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:i<prs.length-1?"10px":0,marginBottom:i<prs.length-1?"10px":0,borderBottom:i<prs.length-1?"1px solid "+C.border:"none"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>{p.name}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2,display:"flex",gap:6,alignItems:"center"}}>
                <span style={{color:MC[p.muscle]||"#888"}}>{p.muscle}</span>
                {p.date?<span>- {p.date}</span>:null}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <IcoTrophy sz={15} col={C.accent}/>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:14,fontWeight:800,color:C.accent}}>{p.weight} lbs</span>
                {p.reps>1?<div style={{fontSize:10,color:C.muted}}>×{p.reps} reps</div>:null}
              </div>
            </div>
          </div>
        ))}
      </Card>
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
      <div style={{display:"flex",background:C.surf,borderBottom:"1px solid "+C.border,flexShrink:0}}>
        {[{id:"meso",l:"This Meso",disabled:!hasMeso},{id:"history",l:"History"}].map(t=>(
          <button key={t.id} onClick={()=>!t.disabled&&setSub(t.id)} style={{flex:1,padding:"11px 0",background:"none",border:"none",borderBottom:"2px solid "+(sub===t.id?C.accent:"transparent"),color:sub===t.id?C.accent:t.disabled?C.muted+"44":C.muted,fontSize:13,fontWeight:sub===t.id?700:400,cursor:t.disabled?"default":"pointer",transition:"all .15s"}}>{t.l}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{padding:"14px 14px 100px"}}>
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
  const [expDay,setExpDay]=useState(null);
  const [confirmNew,setConfirmNew]=useState(false);
  const [picker,setPicker]=useState(null);
  return(
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      {picker?<ExPicker library={library} title={picker.swapName?"Swap Exercise":"Add Exercise"} onAdd={ex=>{
        if(picker.swapName) onSwapExercise(picker.dayId,picker.swapName,ex);
        else onAddExercise(picker.dayId,ex);
        setPicker(null);
      }} onClose={()=>setPicker(null)}/>:null}
      <div style={{padding:"16px 14px 100px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <SLbl>Active Mesocycle</SLbl>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,letterSpacing:-0.5}}>{meso.label}</div>
          </div>
          <button onClick={()=>setConfirmNew(true)} style={{background:"none",border:"1px solid "+C.border2,borderRadius:8,padding:"7px 12px",color:C.muted2,fontSize:11,cursor:"pointer",flexShrink:0}}>New Meso</button>
        </div>
        {confirmNew?(
          <div style={{background:C.card2,border:"1px solid "+C.accent+"44",borderRadius:10,padding:"14px",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Start a new mesocycle?</div>
            <div style={{fontSize:11,color:C.muted2,marginBottom:12}}>Your logged sessions are preserved. Your current program will be replaced.</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmNew(false)} style={{flex:1,padding:"9px",background:"none",border:"1px solid "+C.border,borderRadius:8,color:C.muted2,cursor:"pointer",fontSize:12}}>Cancel</button>
              <button onClick={()=>{setConfirmNew(false);onNewMeso();}} style={{flex:2,padding:"9px",background:C.accent,border:"none",borderRadius:8,color:"#000",cursor:"pointer",fontSize:12,fontWeight:700}}>Build New Meso</button>
            </div>
          </div>
        ):null}
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <SLbl>Week Structure</SLbl>
            <button onClick={onGlossary} style={{background:"none",border:"1px solid "+C.border2,borderRadius:20,padding:"3px 10px",color:C.muted2,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5,marginTop:-6}}>
              <IcoInfo/> Terms
            </button>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {Array(meso.totalWeeks).fill(null).map((_,i)=>(
              <div key={i} style={{flex:1,background:i===meso.week-1?C.accent+"20":C.surf,border:"1px solid "+(i===meso.week-1?C.accent:C.border),borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                <div style={{fontSize:12,fontWeight:800,color:i===meso.week-1?C.accent:C.muted2}}>{i===meso.totalWeeks-1?"DL":"W"+(i+1)}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:3}}>RIR {defaultRIR(i+1,meso.totalWeeks,P?.experience||"intermediate")}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:C.muted2,lineHeight:1.5}}>Sets ramp from MEV toward MRV each week. Deload targets maintenance volume (MV), RIR 4.</div>
        </Card>
        <SLbl>Training Days</SLbl>
        {program.map((day,di)=>(
          <div key={day.id} style={{background:C.card,border:"1px solid "+(expDay===day.id?C.border2:C.border),borderRadius:12,marginBottom:8,overflow:"hidden"}}>
            <div onClick={()=>setExpDay(expDay===day.id?null:day.id)} style={{display:"flex",alignItems:"center",padding:"13px 14px",cursor:"pointer",gap:10}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:C.accent+"20",border:"1px solid "+C.accent+"44",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:800,color:C.accent}}>{di+1}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700}}>{day.name}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{day.day} · {day.exercises.length} exercises</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{expDay===day.id?<polyline points="18 15 12 9 6 15"/>:<polyline points="6 9 12 15 18 9"/>}</svg>
            </div>
            {expDay===day.id?(
              <div style={{borderTop:"1px solid "+C.border,padding:"10px 14px 14px"}}>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>Training Day</div>
                  <select value={day.day} onChange={e=>onUpdateDay(day.id,e.target.value)} style={{width:"100%",background:C.surf,border:"1px solid "+C.border2,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,fontWeight:600,outline:"none",cursor:"pointer"}}>
                    {WEEK_DAYS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Exercises</div>
                {day.exercises.map((ex,ei)=>(
                  <div key={ex.id} style={{display:"flex",alignItems:"center",gap:8,paddingBottom:ei<day.exercises.length-1?"10px":0,marginBottom:ei<day.exercises.length-1?"10px":0,borderBottom:ei<day.exercises.length-1?"1px solid "+C.border:"none"}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:MC[ex.muscle]||"#888",flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>{ex.name}</div>
                      <div style={{fontSize:11,color:C.muted}}>{ex.muscle} · {ex.sets.filter(s=>s.type!=="drop").length} sets</div>
                    </div>
                    <button onClick={()=>setPicker({dayId:day.id,swapName:ex.name})} style={{background:"none",border:"1px solid "+C.border2,borderRadius:6,padding:"5px 9px",color:C.muted2,fontSize:11,cursor:"pointer"}}>Swap</button>
                    {day.exercises.length>1?(
                      <button onClick={()=>onRemoveExercise(day.id,ex.name)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}}>
                        <IcoX sz={13} col={C.muted}/>
                      </button>
                    ):null}
                  </div>
                ))}
                <button onClick={()=>setPicker({dayId:day.id})} style={{width:"100%",marginTop:12,padding:"8px",background:"none",border:"1px dashed "+C.border2,borderRadius:8,color:C.accent,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <IcoPlus sz={12} col={C.accent}/> Add Exercise
                </button>
              </div>
            ):null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanBuilder({meso,library,onLaunch,onCancel}){
  const C=useContext(ThemeCtx);
  const P=useContext(ProfileCtx);
  const muscles=getMuscles(P.experience||"intermediate",P.sex||"male");
  const [step,setStep]=useState(0);
  const [mode,setMode]=useState(null);
  const [bName,setBName]=useState("");
  const [bWeeks,setBWeeks]=useState(5);
  const [bDays,setBDays]=useState([]);
  const [qSplit,setQSplit]=useState("Push/Pull/Legs");
  const [qDays,setQDays]=useState(3);
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
                return {...ex,id:uid("ex"),lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",sets:[newSet(""),newSet(""),newSet("")]};
              })};
            }));
          } else {
            addEx(picker,ex);
          }
          setPicker(null);
        }} onClose={()=>setPicker(null)}/>
      ):null}
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700}}>New Mesocycle</div>
          {meso?<button onClick={onCancel} style={{background:"none",border:"1px solid "+C.border2,borderRadius:6,padding:"5px 10px",color:C.muted,fontSize:11,cursor:"pointer"}}>Cancel</button>:null}
        </div>
        <div style={{display:"flex",gap:5}}>
          {["Details","Training Days","Review"].map((s,i)=>(
            <div key={s} style={{flex:1,height:3,borderRadius:2,background:i<=step?C.accent:C.border2}}/>
          ))}
        </div>
        <div style={{fontSize:10,color:C.accent,marginTop:6,letterSpacing:1.5,textTransform:"uppercase"}}>{["Details","Training Days","Review"][step]}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{padding:"16px 14px 24px"}}>
          {step===0?(
            <div>
              {!mode?(
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:20,lineHeight:1.6}}>How do you want to build your mesocycle?</div>
                  <button onClick={()=>setMode("quick")} style={{width:"100%",background:C.card2,border:"1px solid "+C.accent+"44",borderRadius:12,padding:"18px 16px",marginBottom:10,textAlign:"left",cursor:"pointer",display:"block"}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Quick Build</div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>Pick your training days and split. The app fills in exercises — you can edit before launching.</div>
                  </button>
                  <button onClick={()=>setMode("manual")} style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"18px 16px",textAlign:"left",cursor:"pointer",display:"block"}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Build Manually</div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>Add training days and exercises yourself from scratch.</div>
                  </button>
                </div>
              ):null}
              {mode==="quick"?(
                <div>
                  <button onClick={()=>setMode(null)} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",marginBottom:16,padding:0}}>← Back</button>

                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:8,fontWeight:600}}>Meso name</div>
                    <input value={bName} onChange={e=>setBName(e.target.value)} placeholder="e.g. Spring Block" style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:9,padding:"12px 14px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                  </div>

                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:8,fontWeight:600}}>Training days</div>
                    <div style={{display:"flex",gap:5}}>
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((short,i)=>{
                        const full=WEEK_DAYS[i];
                        const on=availDays.includes(full);
                        return(
                          <button key={full} onClick={()=>setAvailDays(p=>on&&p.length>2?p.filter(d=>d!==full):[...p.filter(d=>d!==full),full].sort((a,b)=>WEEK_DAYS.indexOf(a)-WEEK_DAYS.indexOf(b)))} style={{flex:1,padding:"10px 0",borderRadius:8,border:"1px solid "+(on?C.accent:C.border),background:on?C.accent+"18":C.card,color:on?C.accent:C.muted,fontSize:11,fontWeight:on?700:400,cursor:"pointer",transition:"all .12s"}}>{short}</button>
                        );
                      })}
                    </div>
                    <div style={{fontSize:10,color:C.muted2,marginTop:6}}>{availDays.length} day{availDays.length!==1?"s":""}/week — sessions spaced optimally across your schedule.</div>
                  </div>

                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:8,fontWeight:600}}>Total weeks (incl. deload)</div>
                    <div style={{display:"flex",gap:8}}>
                      {[3,4,5,6].map(w=>(
                        <button key={w} onClick={()=>setBWeeks(w)} style={{flex:1,padding:"12px 0",borderRadius:9,border:"1px solid "+(bWeeks===w?C.accent:C.border),background:bWeeks===w?C.accent+"15":C.card,color:bWeeks===w?C.accent:C.muted2,fontWeight:bWeeks===w?700:400,fontSize:15,cursor:"pointer",transition:"all .15s"}}>
                          {w}<div style={{fontSize:9,color:bWeeks===w?C.accent+"aa":C.muted,marginTop:2,letterSpacing:1}}>{w===5?"★ REC":"WKS"}</div>
                        </button>
                      ))}
                    </div>
                    {bWeeks===3?<div style={{fontSize:10,color:C.muted2,marginTop:6}}>2 working weeks + 1 deload. Good for specialization or returning lifters.</div>:null}
                  </div>

                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:8,fontWeight:600}}>Training split</div>
                    {[
                      {id:"Upper/Lower",     sub:"Every muscle 2×/week — best for most. Great on 4 days."},
                      {id:"Push/Pull/Legs",  sub:"Classic PPL — optimal on 6 days. Needs at least 3."},
                      {id:"Full Body",       sub:"Hit everything every session — ideal for 3 days or fewer."},
                      {id:"Hybrid Split",    sub:"Push+Legs / Pull+Legs combos — ideal for 3–4 days."},
                      {id:"Bro Split",       sub:"One muscle per day — each muscle trains once per week."},
                    ].map(s=>(
                      <button key={s.id} onClick={()=>{setQSplit(s.id);setQPriority(null);}} style={{width:"100%",padding:"11px 14px",marginBottom:6,borderRadius:9,border:"1px solid "+(qSplit===s.id?C.accent:C.border),background:qSplit===s.id?C.accent+"12":C.card,cursor:"pointer",textAlign:"left",transition:"all .15s",display:"block"}}>
                        <div style={{fontSize:13,fontWeight:qSplit===s.id?700:400,color:qSplit===s.id?C.accent:C.text,marginBottom:2}}>{s.id}</div>
                        <div style={{fontSize:11,color:C.muted2,lineHeight:1.3}}>{s.sub}</div>
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
                    <div style={{marginBottom:16,padding:"14px",background:C.card2,border:"1px solid "+C.border2,borderRadius:10}}>
                      {availDays.length===4?(
                        <>
                          <div style={{fontSize:12,fontWeight:700,marginBottom:4,color:C.text}}>Which group trains twice?</div>
                          <div style={{fontSize:11,color:C.muted2,marginBottom:12,lineHeight:1.5}}>Pick the one you want to train twice per week throughout this block — your weakest or most important group.</div>
                          <div style={{display:"flex",gap:8}}>
                            {["Push","Pull","Legs"].map(opt=>(
                              <button key={opt} onClick={()=>setQPriority(qPriority===opt?null:opt)} style={{flex:1,padding:"10px 0",borderRadius:9,border:"1px solid "+(qPriority===opt?C.accent:C.border),background:qPriority===opt?C.accent+"15":C.surf,color:qPriority===opt?C.accent:C.muted2,fontSize:13,fontWeight:qPriority===opt?700:400,cursor:"pointer",transition:"all .15s"}}>{opt}</button>
                            ))}
                          </div>
                        </>
                      ):(
                        <>
                          <div style={{fontSize:12,fontWeight:700,marginBottom:4,color:C.text}}>Which group only trains once?</div>
                          <div style={{fontSize:11,color:C.muted2,marginBottom:12,lineHeight:1.5}}>Pick the one you're happy training only once per week throughout this block.</div>
                          <div style={{display:"flex",gap:8}}>
                            {["Push","Pull","Legs"].map(opt=>(
                              <button key={opt} onClick={()=>setQPriority(qPriority===opt?null:opt)} style={{flex:1,padding:"10px 0",borderRadius:9,border:"1px solid "+(qPriority===opt?C.accent:C.border),background:qPriority===opt?C.accent+"15":C.surf,color:qPriority===opt?C.accent:C.muted2,fontSize:13,fontWeight:qPriority===opt?700:400,cursor:"pointer",transition:"all .15s"}}>{opt}</button>
                            ))}
                          </div>
                        </>
                      )}
                      {!qPriority?<div style={{fontSize:10,color:C.accent,marginTop:10,display:"flex",alignItems:"center",gap:5}}><IcoWarn sz={10} col={C.accent}/> Select one to continue</div>:null}
                    </div>
                  ):null}

                  <div style={{marginBottom:24}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:8,fontWeight:600}}>Rep range focus</div>
                    <div style={{display:"flex",gap:6}}>
                      {[{id:"hypertrophy",l:"Hypertrophy",sub:"8–20 reps"},{id:"strength-hyp",l:"Strength-Hyp",sub:"4–12 reps"},{id:"power-hyp",l:"Power-Hyp",sub:"3–8 reps"}].map(opt=>(
                        <button key={opt.id} onClick={()=>setRepRange(opt.id)} style={{flex:1,padding:"10px 0",borderRadius:9,border:"1px solid "+(repRange===opt.id?C.accent:C.border),background:repRange===opt.id?C.accent+"15":C.card,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                          <div style={{fontSize:11,fontWeight:repRange===opt.id?700:500,color:repRange===opt.id?C.accent:C.muted2}}>{opt.l}</div>
                          <div style={{fontSize:9,color:C.muted,marginTop:2}}>{opt.sub}</div>
                        </button>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:C.muted2,marginTop:6}}>RP recommends rotating rep ranges across mesos for long-term development.</div>
                  </div>

                  <button onClick={()=>{setBDays(autoGen(qSplit,availDays.length,library,qPriority,muscles,P.experience||"intermediate",availDays,repRange));setStep(2);}} disabled={!bName.trim()||(needsPriority&&!qPriority)||availDays.length<2} style={{width:"100%",padding:"14px",background:(bName.trim()&&(!needsPriority||qPriority)&&availDays.length>=2)?C.accent:C.card,color:(bName.trim()&&(!needsPriority||qPriority)&&availDays.length>=2)?"#000":C.muted,border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:(bName.trim()&&(!needsPriority||qPriority)&&availDays.length>=2)?"pointer":"default",transition:"all .2s"}}>GENERATE PROGRAM</button>
                </div>
              ):null}
              {mode==="manual"?(
                <div>
                  <button onClick={()=>setMode(null)} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",marginBottom:16,padding:0}}>← Back</button>
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:6,fontWeight:600}}>Meso name</div>
                    <input value={bName} onChange={e=>setBName(e.target.value)} placeholder="e.g. Mar 10 - Apr 13" style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:9,padding:"12px 14px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{marginBottom:24}}>
                    <div style={{fontSize:11,color:C.muted2,marginBottom:10,fontWeight:600}}>Total weeks (including deload)</div>
                    <div style={{display:"flex",gap:8}}>
                      {[3,4,5,6].map(w=>(
                        <button key={w} onClick={()=>setBWeeks(w)} style={{flex:1,padding:"14px 0",borderRadius:9,border:"1px solid "+(bWeeks===w?C.accent:C.border),background:bWeeks===w?C.accent+"15":C.card,color:bWeeks===w?C.accent:C.muted2,fontWeight:bWeeks===w?700:400,fontSize:15,cursor:"pointer",transition:"all .15s"}}>
                          {w}<div style={{fontSize:9,color:bWeeks===w?C.accent+"aa":C.muted,marginTop:3,letterSpacing:1}}>WEEKS</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>setStep(1)} disabled={!bName.trim()} style={{width:"100%",padding:"14px",background:bName.trim()?C.accent:C.card,color:bName.trim()?"#000":C.muted,border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:bName.trim()?"pointer":"default",transition:"all .2s"}}>NEXT: TRAINING DAYS</button>
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
                <div key={day.id} style={{background:C.card,border:"1px solid "+C.border2,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
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
              <button onClick={addDay} style={{width:"100%",padding:"12px",background:"none",border:"1px dashed "+C.border2,borderRadius:10,color:C.muted2,fontSize:13,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <IcoPlus sz={13} col={C.muted2}/> Add Training Day
              </button>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setStep(0)} style={{flex:1,padding:"13px",background:"none",border:"1px solid "+C.border,borderRadius:10,color:C.muted,cursor:"pointer",fontSize:13}}>Back</button>
                <button onClick={()=>setStep(2)} disabled={bDays.length===0} style={{flex:2,padding:"13px",background:bDays.length>0?C.accent:C.card,color:bDays.length>0?"#000":C.muted,border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:bDays.length>0?"pointer":"default",transition:"all .2s"}}>REVIEW</button>
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
                <button onClick={()=>{if(mode==="quick"){setBDays(autoGen(qSplit,availDays.length,library,qPriority,muscles,P.experience||"intermediate",availDays,repRange));setStep(2);}else setStep(1);}} style={{flex:1,padding:"13px",background:"none",border:"1px solid "+C.border,borderRadius:10,color:C.muted2,cursor:"pointer",fontSize:13}}>Regenerate</button>
                <button onClick={doLaunch} disabled={!canLaunch} style={{flex:2,padding:"13px",background:canLaunch?C.accent:C.card,color:canLaunch?"#000":C.muted,border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:canLaunch?"pointer":"default",transition:"all .2s"}}>LAUNCH MESO</button>
              </div>
            </div>
          ):null}
        </div>
      </div>
    </div>
  );
}

function PlannerScreen({meso,program,library,onLaunch,onUpdateDay,onSwapExercise,onRemoveExercise,onAddExercise,onGlossary}){
  const C=useContext(ThemeCtx);
  const [showBuilder,setShowBuilder]=useState(!meso);
  if(showBuilder){
    return(<PlanBuilder meso={meso} library={library} onLaunch={(m,p)=>{onLaunch(m,p);setShowBuilder(false);}} onCancel={()=>setShowBuilder(false)}/>);
  }
  return(<PlanCurrent meso={meso} program={program} library={library} onNewMeso={()=>setShowBuilder(true)} onUpdateDay={onUpdateDay} onSwapExercise={onSwapExercise} onRemoveExercise={onRemoveExercise} onAddExercise={onAddExercise} onGlossary={onGlossary}/>);
}

function ExRow({ex,onToggleFav}){
  const C=useContext(ThemeCtx);
  const mc=MC[ex.muscle]||"#888";
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.card,border:"1px solid "+C.border,borderRadius:9,marginBottom:6}}>
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
  const [nEx,setNEx]=useState({name:"",muscle:"Chest",type:"compound"});
  const mf=["All",...Object.keys(MC)];
  const filtered=library.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())&&(filt==="All"||e.muscle===filt)).sort((a,b)=>b.fav-a.fav||a.name.localeCompare(b.name));
  const favs=filtered.filter(e=>e.fav);
  const rest=filtered.filter(e=>!e.fav);
  const togFav=n=>setLibrary(p=>p.map(e=>e.name===n?{...e,fav:!e.fav}:e));
  const addEx=()=>{
    if(!nEx.name.trim()) return;
    setLibrary(p=>[...p,{...nEx,fav:false}]);
    setNEx({name:"",muscle:"Chest",type:"compound"});
    setShowAdd(false);
  };
  return(
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{padding:"16px 14px 100px"}}>
        <div style={{marginBottom:14}}>
          <SLbl>Exercise Library</SLbl>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,letterSpacing:-0.5}}>{library.length} EXERCISES</div>
        </div>
        <div style={{position:"relative",marginBottom:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exercises..." style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:9,padding:"10px 14px 10px 38px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.muted,display:"flex",alignItems:"center",pointerEvents:"none"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,marginBottom:12,scrollbarWidth:"none"}}>
          {mf.map(m=>(
            <button key={m} onClick={()=>setFilt(m)} style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+(filt===m?(MC[m]||C.accent):C.border),background:filt===m?(MC[m]||C.accent)+"20":C.surf,color:filt===m?(MC[m]||C.accent):C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s"}}>{m}</button>
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
          <div style={{background:C.card2,border:"1px solid "+C.border2,borderRadius:12,padding:"14px",marginTop:10}}>
            <SLbl>New Custom Exercise</SLbl>
            <input value={nEx.name} onChange={e=>setNEx(p=>({...p,name:e.target.value}))} placeholder="Exercise name" style={{width:"100%",background:C.surf,border:"1px solid "+C.border,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
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
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"10px",background:"none",border:"1px solid "+C.border,borderRadius:8,color:C.muted,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={addEx} style={{flex:2,padding:"10px",background:C.accent,border:"none",borderRadius:8,color:"#000",cursor:"pointer",fontSize:13,fontWeight:700}}>Add Exercise</button>
            </div>
          </div>
        ):<button onClick={()=>setShowAdd(true)} style={{width:"100%",padding:"12px",background:"none",border:"1px dashed "+C.border2,borderRadius:10,color:C.muted,fontSize:12,cursor:"pointer",marginTop:8}}>+ Create Custom Exercise</button>}
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
    border:"1px solid "+(active?C.accent:C.border2),
    borderRadius:10,
    cursor:"pointer",
    textAlign:"left",
    transition:"all .15s",
    width:"100%",
    display:"block",
  });

  const ProgressDots=({current,total})=>(
    <div style={{display:"flex",gap:6,marginBottom:28}}>
      {Array(total).fill(null).map((_,i)=>(
        <div key={i} style={{height:3,flex:1,borderRadius:2,background:i<=current?C.accent:C.border2,transition:"background .2s"}}/>
      ))}
    </div>
  );

  const BtnBack=({onClick})=>(
    <button onClick={onClick} style={{flex:1,padding:"13px",background:"none",border:"1px solid "+C.border2,borderRadius:10,color:C.muted2,cursor:"pointer",fontSize:13,fontWeight:500}}>Back</button>
  );
  const BtnNext=({onClick,disabled,label})=>(
    <button onClick={onClick} disabled={disabled} style={{flex:2,padding:"13px",background:disabled?C.card:C.accent,color:disabled?C.muted2:"#000",border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:disabled?"default":"pointer",transition:"all .2s"}}>{label||"CONTINUE"}</button>
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
        <style>{`*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%;width:100%}::-webkit-scrollbar{width:0;height:0}input::placeholder{color:#3a4a60}textarea::placeholder{color:#3a4a60;font-style:italic}input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}button,select,input,textarea{font-family:'DM Sans',sans-serif}`}</style>
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"40px 28px",minHeight:"100%"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:60,fontWeight:900,letterSpacing:4,color:C.accent,lineHeight:1,marginBottom:16}}>HYPER</div>
          <div style={{fontSize:14,color:C.muted2,lineHeight:1.8,marginBottom:48}}>A hypertrophy training log that tells you what to lift, guides your progression week to week, and tracks your gains across training blocks so you can see real progress over time.</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={()=>setPhase("howItWorks")} style={{width:"100%",padding:"18px 20px",background:C.card2,border:"1px solid "+C.border2,borderRadius:12,cursor:"pointer",textAlign:"left",display:"block",transition:"all .15s"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>New to this style of training?</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>See how the program works — mesocycles, progressive overload, RIR, and more. Takes about a minute.</div>
            </button>
            <button onClick={()=>setPhase("form")} style={{width:"100%",padding:"18px 20px",background:C.card2,border:"1px solid "+C.border2,borderRadius:12,cursor:"pointer",textAlign:"left",display:"block",transition:"all .15s"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>I already know how this works</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>Skip the intro and set up your profile.</div>
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
        <style>{`*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:#3a4a60}button,input{font-family:'DM Sans',sans-serif}`}</style>
        <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"14px 20px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>setPhase("intro")} style={{background:"none",border:"none",color:C.muted2,fontSize:13,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:5}}>← Back</button>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,letterSpacing:2,color:C.text}}>HOW IT WORKS</div>
          <button onClick={()=>setPhase("form")} style={{background:"none",border:"1px solid "+C.border2,borderRadius:8,padding:"6px 14px",color:C.muted2,fontSize:12,cursor:"pointer"}}>Skip →</button>
        </div>
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"20px 24px 24px"}}>
          {HOW_IT_WORKS.map((s,i,arr)=>(
            <div key={i} style={{marginBottom:i<arr.length-1?28:0,paddingBottom:i<arr.length-1?28:0,borderBottom:i<arr.length-1?"1px solid "+C.accent+"33":"none"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:C.text,marginBottom:8,letterSpacing:0.5}}>{s.title}</div>
              <div style={{fontSize:13,color:C.muted2,lineHeight:1.75,marginBottom:s.credit?8:0}}>{s.body}</div>
              {s.credit?<div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>{s.credit}</div>:null}
            </div>
          ))}
          <button onClick={()=>setPhase("form")} style={{width:"100%",marginTop:32,padding:"16px",background:C.accent,color:"#000",border:"none",borderRadius:11,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,letterSpacing:3,cursor:"pointer"}}>
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
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:30,fontWeight:900,marginBottom:8,lineHeight:1.1,color:C.text}}>What should we call you?</div>
      <div style={{fontSize:13,color:C.muted2,lineHeight:1.6,marginBottom:24}}>This is just for your greeting screen. You can change it anytime.</div>
      <div style={{marginBottom:28}}>
        <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&name.trim()) setStep(1);}} placeholder="Your name" style={{width:"100%",background:C.card2,border:"1px solid "+C.border2,borderRadius:10,padding:"14px 16px",color:C.text,fontSize:16,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",gap:10}}>
        <BtnBack onClick={()=>setPhase("intro")}/>
        <BtnNext onClick={()=>setStep(1)} disabled={!name.trim()} label="CONTINUE"/>
      </div>
    </div>,

    // Step 1: Biological sex
    <div key="s1" style={{width:"100%"}}>
      <ProgressDots current={1} total={4}/>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:30,fontWeight:900,marginBottom:8,lineHeight:1.1,color:C.text}}>Biological sex</div>
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
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:30,fontWeight:900,marginBottom:8,lineHeight:1.1,color:C.text}}>Training experience</div>
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
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:30,fontWeight:900,marginBottom:8,lineHeight:1.1,color:C.text}}>Your bodyweight</div>
      <div style={{fontSize:13,color:C.muted2,lineHeight:1.6,marginBottom:24}}>Used as a reference point for progression increments. You can update this anytime.</div>
      <div style={{marginBottom:24}}>
        <div style={{position:"relative"}}>
          <input ref={bwRef} type="number" inputMode="decimal" pattern="[0-9]*" value={bodyweight} onChange={e=>setBodyweight(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&parseFloat(bodyweight)>0) finish();}} placeholder="185" style={{width:"100%",background:C.card2,border:"1px solid "+C.border2,borderRadius:10,padding:"14px 54px 14px 16px",color:C.text,fontSize:22,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
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
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:#3a4a60}input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}button,input{font-family:'DM Sans',sans-serif}`}</style>
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
  const [showGlossary,setShowGlossary]=useState(false);
  const [mesoComplete,setMesoComplete]=useState(null);
  const [loaded,setLoaded]=useState(false);

  const muscles=profile?getMuscles(profile.experience,profile.sex):getMuscles("intermediate","male");

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
      }
      setLoaded(true);
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
    const newSession={day:dayName,date:dateStr,week:meso.week,mesoNum:mesoCount,sets,planned,note:sessionNote||"",exercises:exs};
    const updatedHistory=[newSession,...history];
    setHistory(updatedHistory);
    const newEntries=extractLiftEntries(exs,mesoCount,meso.label,meso.week,isDeload);
    setLiftHistory(p=>[...p,...newEntries]);

    // Persist SFR ratings on program exercises for next-meso rotation review
    if(Object.keys(ratings).length>0){
      setProgram(p=>p.map(day=>{
        if(day.name!==dayName) return day;
        return {...day,exercises:day.exercises.map(pex=>{
          const loggedEx=exs.find(e=>e.name===pex.name);
          if(!loggedEx||!ratings[loggedEx.id]) return pex;
          const prev=pex.sfrHistory||[];
          return {...pex,lastSFR:ratings[loggedEx.id],sfrHistory:[...prev,ratings[loggedEx.id]].slice(-6)};
        })};
      }));
    }

    // Update program with what was just logged so progression engine works next session
    setProgram(p=>p.map(day=>{
      if(day.name!==dayName) return day;
      return {...day,exercises:day.exercises.map(pex=>{
        const logged=exs.find(e=>e.name===pex.name);
        if(!logged) return pex;
        const doneSets=logged.sets.filter(s=>s.done&&!s.incomplete&&s.weight&&s.reps);
        const normalSets=doneSets.filter(s=>s.type!=="drop");
        if(!normalSets.length) return pex;
        const topSet=normalSets.reduce((best,s)=>parseFloat(s.weight)>parseFloat(best.weight)?s:best,normalSets[0]);
        const scheme=buildScheme(logged.sets)||"";
        // Reset sets for next session (fresh, same count, pre-fill suggested weight)
        const nextSets=pex.sets.filter(s=>s.type!=="drop").map(()=>newSet(String(topSet.weight),"normal"));
        const nextDrops=pex.sets.filter(s=>s.type==="drop").map(()=>newSet(String(snap(parseFloat(topSet.weight)*0.6)),"drop"));
        return {
          ...pex,
          lastWeight:String(topSet.weight),
          lastRIR:parseInt(topSet.rir)||0,
          lastReps:String(topSet.reps||""),
          lastScheme:scheme,
          sets:[...nextSets,...nextDrops],
        };
      })};
    }));

    setActiveLog(null);
    setActiveLogExs(null);
    setLoggerOpen(false);
    const thisWeekSessions=updatedHistory.filter(s=>s.week===meso.week&&s.mesoNum===mesoCount);
    const completedDays=new Set(thisWeekSessions.map(s=>s.day));
    const allDone=program.map(d=>d.name).every(n=>completedDays.has(n));
    if(isDeload){
      if(allDone) setMesoComplete({meso,mesoNum:mesoCount});
      else setTab("home");
    } else {
      if(allDone) setMeso(m=>m&&m.week===meso.week?{...m,week:Math.min(m.week+1,m.totalWeeks)}:m);
      setTab("home");
    }
  };

  const handleStartNextMeso=(goToPlanner,suggestedRepRange)=>{
    const nextNum=mesoCount+1;
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
    setMeso(m=>({...m,label:"Meso "+nextNum,week:1,totalWeeks:m.totalWeeks,repRange:suggestedRepRange||nextRepRange(m.repRange),deloadStyle:null}));
    setProgram(newProgram);
    setMesoCount(nextNum);
    setMesoComplete(null);
    setTab(goToPlanner?"plan":"home");
  };

  const handleLaunch=(newMeso,newProg)=>{
    setMeso(newMeso);
    setProgram(newProg);
    setMesoCount(p=>p+1);
    setTab("home");
  };

  const handleUpdateDay=(dayId,newDay)=>{
    setProgram(p=>p.map(d=>d.id!==dayId?d:{...d,day:newDay}));
  };
  const handleSwapExercise=(dayId,oldName,newEx)=>{
    setProgram(p=>p.map(d=>{
      if(d.id!==dayId) return d;
      return {...d,exercises:d.exercises.map(e=>{
        if(e.name!==oldName) return e;
        return {...newEx,id:e.id,lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",sets:e.sets.map(s=>({...s,weight:"",reps:"",done:false}))};
      })};
    }));
  };
  const handleAddExercise=(dayId,newEx)=>{
    setProgram(p=>p.map(d=>{
      if(d.id!==dayId) return d;
      if(d.exercises.find(e=>e.name===newEx.name)) return d;
      const nx={...newEx,id:uid("ex"),lastScheme:"",lastWeight:"",lastRIR:null,lastReps:"",note:"",sets:[newSet(""),newSet(""),newSet("")]};
      return {...d,exercises:[...d.exercises,nx]};
    }));
  };

  const handleRemoveExercise=(dayId,exName)=>{
    setProgram(p=>p.map(d=>d.id!==dayId?d:{...d,exercises:d.exercises.filter(e=>e.name!==exName)}));
  };

  const [confirmStart,setConfirmStart]=useState(null); // stores the workout to start after confirmation
  const [showProfile,setShowProfile]=useState(false);
  const [showResetConfirm,setShowResetConfirm]=useState(false);
  const [toast,setToast]=useState(null); // {msg, ok}
  const showToast=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  const [profileDraft,setProfileDraft]=useState(null); // local edits before save
  const [profileUpdatePrompt,setProfileUpdatePrompt]=useState(null); // {oldProfile, newProfile}
  const [editingSession,setEditingSession]=useState(null);

  const handleEditSession=(note,exs)=>{
    setHistory(prev=>prev.map((s,i)=>{
      if(i!==editingSession.idx) return s;
      return {...s,note,exercises:exs||s.exercises};
    }));
    if(exs&&editingSession){
      const s=editingSession.session;
      const sessionMesoNum=s.mesoNum||mesoCount;
      const sessionLabel="M"+sessionMesoNum+"W"+s.week;
      setLiftHistory(prev=>{
        const filtered=prev.filter(e=>!(e.mesoNum===sessionMesoNum&&e.week===s.week&&e.label===sessionLabel));
        const newEntries=extractLiftEntries(exs,sessionMesoNum,s.mesoLabel||meso?.label||"",s.week,false);
        return [...filtered,...newEntries];
      });
      // Sync progression engine so next session banner reflects the edited weights
      setProgram(p=>p.map(day=>{
        if(day.name!==s.day) return day;
        return {...day,exercises:day.exercises.map(pex=>{
          const logged=exs.find(e=>e.name===pex.name);
          if(!logged) return pex;
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
      a.click();
      URL.revokeObjectURL(url);
    } catch(e){showToast("Export failed.",false);}
  };

  const handleImport=(file)=>{
    if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try {
        const s=JSON.parse(e.target.result);
        if(s.profile) setProfile(s.profile);
        if(s.meso) setMeso(s.meso);
        if(s.program&&s.program.length>0) setProgram(s.program);
        if(s.history) setHistory(s.history);
        if(s.liftHistory&&s.liftHistory.length>0) setLiftHistory(s.liftHistory);
        if(s.mesoCount) setMesoCount(s.mesoCount);
        if(s.isDark!==undefined) setIsDark(s.isDark);
        if(s.library&&s.library.length>0) setLibrary(s.library);
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
    setProgram(p=>p.map(day=>({
      ...day,
      exercises:day.exercises.map(ex=>{
        const lm=newMuscles[ex.muscle];
        if(!lm) return ex;
        // Recalculate set counts for this exercise based on new MEV/MRV
        // Keep same ratio of exercises per muscle per day
        const sameMuscleSiblings=day.exercises.filter(e=>e.muscle===ex.muscle).length||1;
        const mevSets=Math.max(2,Math.min(5,Math.round(lm.mev/sameMuscleSiblings)));
        const mrvSets=Math.max(mevSets+1,Math.min(mevSets+3,Math.round(lm.mav/sameMuscleSiblings)));
        const mvSets=Math.max(1,Math.round(lm.mv/sameMuscleSiblings));
        // Resize sets array to new MEV count, preserving any logged weight
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
    })));
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
    setTab("home");
  };

  const todayWorkout=program.length>0?(program.find(d=>d.day===getTodayName())||null):null;
  const C=isDark?DARK:LIGHT;

  if(!loaded){
    return(
      <ThemeCtx.Provider value={C}>
        <div style={{background:C.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",paddingBottom:"env(safe-area-inset-bottom)"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,letterSpacing:4,color:C.accent}}>HYPER</div>
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
    <div style={{fontFamily:"'DM Sans',sans-serif",background:C.bg,color:C.text,height:"100dvh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",position:"relative",transition:"background .25s,color .25s",overflow:"hidden"}}>
      
      <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"13px 16px",paddingTop:"calc(13px + env(safe-area-inset-top))",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background .25s,border-color .25s"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,letterSpacing:3,color:C.accent}}>HYPER</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {meso?<div style={{fontSize:10,background:C.card,border:"1px solid "+C.border2,borderRadius:5,padding:"4px 9px",color:C.muted2,transition:"background .25s"}}>{meso.label} - WK {meso.week}</div>:null}
          <div onClick={()=>{setProfileDraft({...profile});setShowProfile(true);}} style={{width:28,height:28,borderRadius:"50%",background:C.accent+"22",border:"1px solid "+C.accent+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.accent,cursor:"pointer"}}>{initLetter}</div>
        </div>
      </div>
      {toast?(
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:900,background:toast.ok?C.green:C.red,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,boxShadow:"0 4px 20px #0006",whiteSpace:"nowrap",pointerEvents:"none",transition:"opacity .3s"}}>
          {toast.msg}
        </div>
      ):null}
      {showProfile&&profileDraft?(
        <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>{setShowProfile(false);setShowResetConfirm(false);setProfileDraft(null);}}>
          <div style={{position:"absolute",inset:0,background:"#000a"}}/>
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 16px 16px",flexShrink:0}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>PROFILE</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowProfile(false);setShowResetConfirm(false);setProfileDraft(null);}} style={{background:"none",border:"1px solid "+C.border2,borderRadius:8,padding:"6px 12px",color:C.muted2,fontSize:12,cursor:"pointer"}}>Cancel</button>
                <button onClick={handleProfileSave} style={{background:C.accent,border:"none",borderRadius:8,padding:"6px 14px",color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"0 16px 40px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",marginBottom:8,borderBottom:"1px solid "+C.border}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {isDark?<IcoMoon sz={14} col={C.muted2}/>:<IcoSun sz={14} col={C.muted2}/>}
                <span style={{fontSize:13,color:C.text,fontWeight:500}}>{isDark?"Dark mode":"Light mode"}</span>
              </div>
              <button onClick={()=>setIsDark(p=>!p)} style={{width:44,height:24,borderRadius:12,background:isDark?C.accent:C.border2,border:"none",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                <span style={{position:"absolute",top:2,left:isDark?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px #0004"}}/>
              </button>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.muted2,marginBottom:6,fontWeight:600}}>Name</div>
              <input value={profileDraft.name||""} onChange={e=>setProfileDraft(p=>({...p,name:e.target.value}))} style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.muted2,marginBottom:6,fontWeight:600}}>Bodyweight (lbs)</div>
              <input type="number" inputMode="decimal" value={profileDraft.bodyweight||""} onChange={e=>setProfileDraft(p=>({...p,bodyweight:parseFloat(e.target.value)||0}))} style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:C.muted2,marginBottom:6,fontWeight:600}}>Training Experience</div>
              {[{id:"new",l:"Just getting started"},{id:"returning",l:"Getting back into it"},{id:"intermediate",l:"Lifting regularly"},{id:"advanced",l:"Long-term lifter"}].map(opt=>(
                <button key={opt.id} onClick={()=>setProfileDraft(p=>({...p,experience:opt.id}))} style={{width:"100%",padding:"10px 12px",marginBottom:6,borderRadius:8,border:"1px solid "+(profileDraft.experience===opt.id?C.accent:C.border),background:profileDraft.experience===opt.id?C.accent+"15":C.card,color:profileDraft.experience===opt.id?C.accent:C.muted2,fontSize:13,fontWeight:profileDraft.experience===opt.id?700:400,cursor:"pointer",textAlign:"left",display:"block"}}>{opt.l}</button>
              ))}
              {profileDraft.experience!==profile.experience&&program?.length>0?<div style={{fontSize:10,color:C.muted2,marginTop:2,display:"flex",alignItems:"center",gap:4}}><IcoWarn sz={10} col={C.muted2}/>Saving will prompt you to update your current program.</div>:null}
            </div>
            <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid "+C.border}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Data</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleExport} style={{flex:1,padding:"8px 10px",background:"none",border:"1px solid "+C.border2,borderRadius:8,color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export
                </button>
                <label style={{flex:1,padding:"8px 10px",background:"none",border:"1px solid "+C.border2,borderRadius:8,color:C.muted2,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,boxSizing:"border-box"}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10" transform="rotate(180 12 12)"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Import
                  <input type="file" accept=".json" style={{display:"none"}} onChange={e=>handleImport(e.target.files[0])}/>
                </label>
              </div>
            </div>
            <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid "+C.border}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Correct onboarding data</div>
              <div style={{fontSize:11,color:C.muted2,marginBottom:12,lineHeight:1.5}}>These were set during setup. Only change if you made a mistake.</div>
              <div style={{fontSize:11,color:C.muted2,marginBottom:6,fontWeight:600}}>Biological Sex</div>
              <div style={{display:"flex",gap:8,marginBottom:4}}>
                {["male","female"].map(s=>(
                  <button key={s} onClick={()=>setProfileDraft(p=>({...p,sex:s}))} style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid "+(profileDraft.sex===s?C.accent:C.border),background:profileDraft.sex===s?C.accent+"15":C.card,color:profileDraft.sex===s?C.accent:C.muted2,fontSize:13,fontWeight:profileDraft.sex===s?700:400,cursor:"pointer",textTransform:"capitalize"}}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid "+C.border}}>
              {showResetConfirm?(
                <div style={{background:C.card,border:"1px solid "+C.border2,borderRadius:10,padding:"14px"}}>
                  <div style={{fontSize:12,color:C.muted2,marginBottom:12,lineHeight:1.6}}>All training data, history, and records will be permanently deleted.</div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setShowResetConfirm(false)} style={{flex:1,padding:"9px",background:"none",border:"1px solid "+C.border2,borderRadius:8,color:C.muted2,cursor:"pointer",fontSize:12}}>Cancel</button>
                    <button onClick={handleReset} style={{flex:1,padding:"9px",background:"none",border:"1px solid "+C.red+"55",borderRadius:8,color:C.red,cursor:"pointer",fontSize:12,fontWeight:600}}>Delete &amp; Reset</button>
                  </div>
                </div>
              ):(
                <button onClick={()=>setShowResetConfirm(true)} style={{background:"none",border:"none",padding:0,color:C.muted,fontSize:12,cursor:"pointer",textDecoration:"underline",textDecorationColor:C.muted+"66"}}>
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
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:14,padding:"22px 20px",width:"100%",maxWidth:340}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>Update current program?</div>
            <div style={{fontSize:12,color:C.muted2,lineHeight:1.7,marginBottom:20}}>
              Your {profileUpdatePrompt.oldProfile.experience!==profileUpdatePrompt.newProfile.experience?"experience level":"profile"} changed. The app can recalculate your current program's set counts to match your updated {profileUpdatePrompt.oldProfile.experience!==profileUpdatePrompt.newProfile.experience?"training level":"profile"}.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{handleApplyProfileToProgram(profileUpdatePrompt.newProfile);setProfileUpdatePrompt(null);}} style={{width:"100%",padding:"12px",background:C.accent,color:"#000",border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:900,letterSpacing:2,cursor:"pointer"}}>
                UPDATE NOW
              </button>
              <button onClick={()=>setProfileUpdatePrompt(null)} style={{width:"100%",padding:"11px",background:"none",border:"1px solid "+C.border2,borderRadius:10,color:C.muted2,fontSize:13,cursor:"pointer"}}>
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
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.surf,borderRadius:14,padding:"20px",width:"100%",maxWidth:340}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Replace current session?</div>
            <div style={{fontSize:12,color:C.muted2,lineHeight:1.6,marginBottom:16}}>You have <strong style={{color:C.text}}>{activeLog?.name}</strong> in progress. Starting a new session will discard it.</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmStart(null)} style={{flex:1,padding:"10px",background:"none",border:"1px solid "+C.border2,borderRadius:8,color:C.muted2,cursor:"pointer",fontSize:13}}>Keep Current</button>
              <button onClick={()=>{setActiveLog(confirmStart);setLoggerOpen(true);setConfirmStart(null);}} style={{flex:1,padding:"10px",background:C.red+"22",border:"1px solid "+C.red+"44",borderRadius:8,color:C.red,cursor:"pointer",fontSize:13,fontWeight:700}}>Start New</button>
            </div>
          </div>
        </div>
      ):null}
      {mesoComplete?<MesoCompleteScreen meso={mesoComplete.meso} liftHistory={liftHistory} mesoNum={mesoComplete.mesoNum} program={program} onStartNext={(r)=>handleStartNextMeso(false,r)} onReview={(r)=>handleStartNextMeso(true,r)}/>:null}
      {activeLog?<Logger workout={activeLog} wk={meso?meso.week:1} totalWeeks={meso?meso.totalWeeks:5} isDeload={meso?meso.week===meso.totalWeeks:false} deloadStyle={meso?.deloadStyle||"volume"} onComplete={handleComplete} onMinimize={()=>setLoggerOpen(false)} visible={loggerOpen} liftHistory={liftHistory} savedExs={activeLogExs} onExsChange={setActiveLogExs}/>:null}
      {showGlossary?<GlossaryModal onClose={()=>setShowGlossary(false)}/>:null}
      <div style={{display:tab==="home"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
        {(meso&&program&&program.length>0)?(
          <HomeScreen meso={meso} mesoCount={mesoCount} program={program} history={history} onStart={d=>{
            if(activeLog&&loggerOpen===false){
              setConfirmStart(d||todayWorkout);
              return;
            }
            setActiveLog(d||todayWorkout);setLoggerOpen(true);
          }} profile={profile} activeLog={activeLog} onResume={()=>setLoggerOpen(true)} onAbandon={()=>{setActiveLog(null);setActiveLogExs(null);setLoggerOpen(false);}} onEdit={(session,idx)=>setEditingSession({session,idx})} onExtendMeso={handleExtendMeso} onSetDeloadStyle={handleSetDeloadStyle}/>
        ):(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center"}}>
            <div style={{width:64,height:64,borderRadius:16,background:C.card,border:"1px solid "+C.border2,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
              <IcoPlan active={false}/>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,letterSpacing:-0.5,marginBottom:8}}>NO ACTIVE MESO</div>
            <div style={{fontSize:13,color:C.muted2,lineHeight:1.7,marginBottom:28,maxWidth:280}}>Go to the Plan tab and use Quick Build — pick your split, available days, and the app fills in the rest.</div>
            <button onClick={()=>setTab("plan")} style={{padding:"14px 32px",background:C.accent,color:"#000",border:"none",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,letterSpacing:3,cursor:"pointer"}}>BUILD PROGRAM</button>
          </div>
        )}
      </div>
      <div style={{display:tab==="progress"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
        <ProgressScreen meso={meso} mesoCount={mesoCount} onGlossary={()=>setShowGlossary(true)} liftHistory={liftHistory} history={history} program={program} muscles={muscles}/>
      </div>
      <div style={{display:tab==="plan"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
        <PlannerScreen meso={meso} program={program} library={library} onLaunch={handleLaunch} onUpdateDay={handleUpdateDay} onSwapExercise={handleSwapExercise} onRemoveExercise={handleRemoveExercise} onAddExercise={handleAddExercise} onGlossary={()=>setShowGlossary(true)}/>
      </div>
      <div style={{display:tab==="library"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
        <LibraryScreen library={library} setLibrary={setLibrary}/>
      </div>
      <div className="hyper-nav" style={{background:C.surf,borderTop:"1px solid "+C.border,display:"flex",flexShrink:0,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map(t=>{
          const Icon=TICONS[t.id];
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:active?C.accent:C.muted,transition:"color .15s"}}>
              <Icon active={active}/>
              <span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",fontWeight:active?700:400}}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
    </ProfileCtx.Provider>
    </ThemeCtx.Provider>
  );
}
