// Initialize Supabase client
const SUPABASE_URL = "https://qdqrrkpkhdhjhwzewuza.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcXJya3BraGRoamh3emV3dXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjIwNTUsImV4cCI6MjA3NzMzODA1NX0.wFKgwtuSBKGj3_nARoL0SwPDhz_x3Etafm3vcPmKu0E";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// app.js - simple terminal frontend for Hacker City prototype

// === CONFIG ===
// Replace with your Cloudflare Worker / API base URL once deployed.
const API_BASE = "https://YOUR_WORKER_OR_API_DOMAIN/api"; // <-- replace after backend deploy

// === UI refs ===
const outEl = document.getElementById("output");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");

function log(text, cls){
  const t = text === undefined ? "" : String(text);
  const line = document.createElement("div");
  line.textContent = t;
  if (cls) line.classList.add(cls);
  outEl.appendChild(line);
  outEl.parentElement.scrollTop = outEl.parentElement.scrollHeight;
}

// initial welcome and help
log("Welcome to Hacker City — Prototype (2083)");
log("Type 'help' for quick commands.");
log("");

function showHelp(){
  log("Commands:");
  log(" register <email> <password>");
  log(" login <email> <password>");
  log(" char create <name>");
  log(" jobs");
  log(" accept <jobId>");
  log(" cmd <sessionId> <command>    (sends hacking command to session)");
  log(" help");
  log("");
}

// small helper to call API
async function api(path, opts = {}){
  opts.headers = opts.headers || {};
  opts.headers["Content-Type"] = "application/json";
  const token = localStorage.getItem("hc_token");
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  opts.body = opts.body ? JSON.stringify(opts.body) : undefined;
  try {
    const res = await fetch(API_BASE + path, opts);
    const json = await res.json();
    return json;
  } catch (e){
    return { error: "network or CORS error: " + e.message };
  }
}

// command processor
async function handleCommand(raw){
  if (!raw || !raw.trim()) return;
  const parts = raw.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === "help"){ showHelp(); return; }

  if (cmd === "register"){
    const email = parts[1];
    const pass = parts[2];
    if (!email || !pass){ log("usage: register <email> <password>"); return; }
    log(`Registering ${email}...`);
    const r = await api("/auth/register", { method: "POST", body: { email, password: pass }});
    if (r.token){ localStorage.setItem("hc_token", r.token); log("Registered & logged in."); }
    else log("Error: " + (r.error || JSON.stringify(r)));
    return;
  }

  if (cmd === "login"){
    const email = parts[1];
    const pass = parts[2];
    if (!email || !pass){ log("usage: login <email> <password>"); return; }
    log(`Logging in ${email}...`);
    const r = await api("/auth/login", { method: "POST", body: { email, password: pass }});
    if (r.token){ localStorage.setItem("hc_token", r.token); log("Logged in."); }
    else log("Error: " + (r.error || JSON.stringify(r)));
    return;
  }

  if (cmd === "char" && parts[1] === "create"){
    const name = parts.slice(2).join(" ");
    if (!name){ log("usage: char create <name>"); return; }
    log(`Creating character "${name}"...`);
    const r = await api("/character", { method: "POST", body: { name }});
    if (r.character) log("Character created: " + r.character.name);
    else log("Error: " + (r.error || JSON.stringify(r)));
    return;
  }

  if (cmd === "jobs"){
    const r = await api("/jobs", { method: "GET" });
    if (r.jobs){
      log("Jobs:");
      r.jobs.forEach(j => log(` ${j.id} | ${j.title} | type:${j.type} | reward:$${j.reward_cash}`));
    } else log("Error: " + (r.error || JSON.stringify(r)));
    return;
  }

  if (cmd === "accept"){
    const jobId = parts[1];
    if (!jobId){ log("usage: accept <jobId>"); return; }
    log("Accepting job...");
    const r = await api(`/jobs/${encodeURIComponent(jobId)}/accept`, { method: "POST" });
    if (r.sessionId){ localStorage.setItem("hc_last_session", r.sessionId); log("Hacking session started: " + r.sessionId); }
    else if (r.ok) log("Job completed: reward " + (r.reward || "unknown"));
    else log("Error: " + (r.error || JSON.stringify(r)));
    return;
  }

  if (cmd === "cmd"){
    const sessionId = parts[1] || localStorage.getItem("hc_last_session");
    if (!sessionId){ log("usage: cmd <sessionId> <command> (or accept a job first)"); return; }
    const sub = parts.slice(2).join(" ");
    if (!sub){ log("usage: cmd <sessionId> <command>"); return; }
    log(`> (session ${sessionId}) ${sub}`);
    const r = await api(`/hacking/${encodeURIComponent(sessionId)}/command`, { method: "POST", body: { cmd: sub }});
    if (r.output) {
      log(r.output);
      if (r.status) log("[session status: " + r.status + "]");
    } else log("Error: " + (r.error || JSON.stringify(r)));
    return;
  }

  log("Unknown command. Type 'help'.");
}

// wire input
sendBtn.addEventListener("click", () => {
  const val = inputEl.value.trim();
  if (!val) return;
  log("> " + val);
  handleCommand(val);
  inputEl.value = "";
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter"){
    sendBtn.click();
  }
});

// initial help
showHelp();
