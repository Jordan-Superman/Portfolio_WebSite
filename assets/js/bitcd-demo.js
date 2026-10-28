// Interactive BIT_CD change-detection demo on the Satellite Survey page.
// Talks to the Flask API in BIT_CD-master/webapp. Set data-api on #bitcd-demo
// to the deployed API URL; on localhost it uses http://localhost:5000.
document.addEventListener("DOMContentLoaded", () => {
  const demo = document.getElementById("bitcd-demo");
  if (!demo || !window.L) return;

  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  const api = (local ? "http://localhost:5000" : demo.dataset.api || "").replace(/\/$/, "");

  // must match BOUNDS in webapp/app.py
  const bounds = L.latLngBounds([-36.826942, 174.679512], [-36.783633, 174.751868]);
  const example = { lat: -36.807861, lon: 174.730528 };
  const HALF_M = 256; // half of the 512 m square

  const status = document.getElementById("demo-status");
  const runBtn = document.getElementById("demo-run");
  const exampleBtn = document.getElementById("demo-example");
  const before = document.getElementById("demo-before");
  const after = document.getElementById("demo-after");
  const exampleSrc = { before: before.src, after: after.src };

  const teal = getComputedStyle(document.documentElement).getPropertyValue("--teal").trim() || "#2a9d8f";

  const map = L.map("demo-map", { scrollWheelZoom: false, maxBounds: bounds.pad(0.5) });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.fitBounds(bounds);
  L.rectangle(bounds, { color: teal, weight: 2, fill: false, dashArray: "6 6", interactive: false }).addTo(map);

  let square = null;
  let picked = null;

  function squareAround({ lat, lon }) {
    const dLat = HALF_M / 111320;
    const dLon = HALF_M / (111320 * Math.cos((lat * Math.PI) / 180));
    return L.latLngBounds([lat - dLat, lon - dLon], [lat + dLat, lon + dLon]);
  }

  function showSquare(point) {
    if (square) square.remove();
    square = L.rectangle(squareAround(point), { color: "#e63946", weight: 2, fillOpacity: 0.1 }).addTo(map);
  }

  function setStatus(text, isError = false) {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  }

  function showExample() {
    picked = null;
    runBtn.disabled = true;
    before.src = exampleSrc.before;
    after.src = exampleSrc.after;
    showSquare(example);
    setStatus("Showing an example: a new subdivision on Maika Lane, Birkenhead.");
  }

  map.on("click", (e) => {
    if (demo.classList.contains("is-loading")) return;
    if (!bounds.contains(e.latlng)) {
      setStatus("That spot is outside the demo area. Pick somewhere inside the dashed box.", true);
      return;
    }
    picked = { lat: +e.latlng.lat.toFixed(6), lon: +e.latlng.lng.toFixed(6) };
    showSquare(picked);
    if (api) {
      runBtn.disabled = false;
      setStatus(`Selected ${picked.lat}, ${picked.lon}. Press "Run detection here".`);
    } else {
      setStatus("The live demo is offline right now, so only the example is available.", true);
    }
  });

  runBtn.addEventListener("click", async () => {
    if (!picked || !api) return;
    demo.classList.add("is-loading");
    runBtn.disabled = exampleBtn.disabled = true;
    setStatus("Fetching 2017 and 2024 imagery and running the model. The first run can take up to a minute while the server wakes up.");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 150000);
    try {
      const res = await fetch(`${api}/api/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(picked),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `The server returned an error (${res.status}).`);

      before.src = data.before;
      after.src = data.after;
      const n = data.boxes;
      setStatus(n === 0
        ? "No new buildings detected in this square."
        : `Detected ${n} changed area${n === 1 ? "" : "s"} (processed in ${data.seconds}s).`);
    } catch (err) {
      const msg = err.name === "AbortError" ? "The demo took too long to respond, please try again."
        : err instanceof TypeError ? "Couldn't reach the demo server. It may be offline, please try again later."
        : err.message;
      setStatus(msg, true);
    } finally {
      clearTimeout(timer);
      demo.classList.remove("is-loading");
      runBtn.disabled = !picked;
      exampleBtn.disabled = false;
    }
  });

  exampleBtn.addEventListener("click", showExample);
  showSquare(example);
});
