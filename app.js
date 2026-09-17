/* ---------- constants ---------- */
const ANIM_SPEED = 40;               // a 40s lap completes the circle in 1 real second
const CAUTION_CHANCE_PER_LAP = 0.04;
const TRACK_RADIUS = 240;
const CENTER = 300;
const GRID_SPACING_DEG = 1.4;
// Quali/pace lap-time formula: 100 OVR + roll 1.0 -> 40.0s, 40 OVR + roll 0.0 -> 44.0s,
// derived from score = 0.6*(ovr/100) + 0.4*roll, laptime = A - B*score.
const LAPTIME_A = 45.263157894736842;
const LAPTIME_B = 5.263157894736842;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function abbrev(lastName) {
  const clean = (lastName || "").replace(/[^A-Za-z]/g, "").toUpperCase();
  return clean.slice(0, 3) || "???";
}

function colorFor(index) {
  return `hsl(${(index * 47) % 360}, 70%, 58%)`;
}

/* ---------- settings & state ---------- */
const settings = {
  fieldSize: 40,
  totalLaps: 100,
  trackPositionValue: 50,
  newTireValue: 50,
  pitVariation: 10,
};

let currentField = [];   // live preview / finalized entry list
let qualified = [];      // field sorted by qualifying result
let raceState = null;

/* ---------- field & qualifying ---------- */
function buildField(fieldSize) {
  const chartered = DRIVERS.filter((d) => d.chartered === true);
  const nonChartered = DRIVERS.filter((d) => d.chartered === false);
  const selected = chartered.slice(0, fieldSize);
  const remaining = fieldSize - selected.length;
  if (remaining > 0) {
    const pool = [...nonChartered];
    for (let i = pool.length - 1; i > 0 && pool.length > remaining; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    selected.push(...pool.slice(0, remaining));
  }
  return selected.map((d, i) => ({
    driverId: d.driverId,
    name: d.name,
    lastName: d.lastName,
    number: d.number,
    chartered: d.chartered,
    skill: d.skill,
    color: colorFor(i),
    abbrev: abbrev(d.lastName),
    tiresLeftLaps: 0,
    tiresRightLaps: 0,
  }));
}

function renderEntryList(field) {
  const el = document.getElementById("entryList");
  document.getElementById("entryCount").textContent = `${field.length} cars`;
  el.innerHTML = field
    .map(
      (d) => `
    <div class="entry-row ${d.chartered ? "" : "non-chartered"}">
      <span class="num">#${d.number}</span>
      <span class="name">${d.name}</span>
      <span class="skill">${d.skill}</span>
    </div>`
    )
    .join("");
}

function computeQualiTime(driver) {
  const skillNorm = driver.skill / 100;
  const roll = Math.random();
  const score = 0.6 * skillNorm + 0.4 * roll;
  return { time: LAPTIME_A - LAPTIME_B * score, roll };
}

function runQualifying(field) {
  const withTimes = field.map((d) => {
    const { time } = computeQualiTime(d);
    return { ...d, qualiTime: time };
  });
  withTimes.sort((a, b) => a.qualiTime - b.qualiTime);
  withTimes.forEach((d, i) => (d.qualiPosition = i + 1));
  return withTimes;
}

function renderQualifying(sorted) {
  const tbody = document.querySelector("#qualiTable tbody");
  tbody.innerHTML = sorted
    .map(
      (d) => `
    <tr>
      <td>P${d.qualiPosition}</td>
      <td>#${d.number}</td>
      <td>${d.name}</td>
      <td>${d.qualiTime.toFixed(3)}s</td>
    </tr>`
    )
    .join("");
}

/* ---------- pace & strategy ---------- */
function computeLapTime(driver) {
  const skillNorm = driver.skill / 100;
  const roll = Math.random();
  const tireWeight = settings.newTireValue / 50;
  const tirePenaltyPerLap = 0.006 * tireWeight;
  const tireAvg = (driver.tiresLeftLaps + driver.tiresRightLaps) / 2;
  let score = 0.55 * skillNorm + 0.45 * roll - Math.min(tireAvg, 60) * tirePenaltyPerLap;
  score = clamp(score, -0.5, 1.3);
  return clamp(LAPTIME_A - LAPTIME_B * score, 34, 60);
}

function riskTolerance(position, fieldSize) {
  return clamp((position - 1) / Math.max(fieldSize - 1, 1), 0, 1);
}

function decidePitStrategy(driver, position, fieldSize, lapsRemaining) {
  const rt = riskTolerance(position, fieldSize);
  const wear = (driver.tiresLeftLaps + driver.tiresRightLaps) / 2;
  const protectWeight = 0.6 * (settings.trackPositionValue / 50);

  const pitDesire = clamp(wear / 35, 0, 1);
  const protectPosition = clamp(1 - rt, 0, 1) * clamp(1 - lapsRemaining / 15, 0, 1);
  const pitProbability = clamp(pitDesire - protectPosition * protectWeight + rt * 0.1, 0.05, 0.95);

  if (Math.random() > pitProbability) return "stay";

  const fourTireProbability = clamp(0.8 - rt * 0.55, 0.15, 0.85);
  return Math.random() < fourTireProbability ? "four" : "two";
}

/* ---------- SVG track ---------- */
function polarPoint(theta) {
  const angle = ((theta - 90) * Math.PI) / 180;
  return {
    x: CENTER + TRACK_RADIUS * Math.cos(angle),
    y: CENTER + TRACK_RADIUS * Math.sin(angle),
  };
}

function initTrackSvg(order) {
  const svg = document.getElementById("track");
  svg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";

  const trackCircle = document.createElementNS(ns, "circle");
  trackCircle.setAttribute("cx", CENTER);
  trackCircle.setAttribute("cy", CENTER);
  trackCircle.setAttribute("r", TRACK_RADIUS);
  trackCircle.setAttribute("fill", "none");
  trackCircle.setAttribute("stroke", "#3a4150");
  trackCircle.setAttribute("stroke-width", "3");
  svg.appendChild(trackCircle);

  const startLine = document.createElementNS(ns, "line");
  startLine.setAttribute("x1", CENTER);
  startLine.setAttribute("y1", CENTER - TRACK_RADIUS - 12);
  startLine.setAttribute("x2", CENTER);
  startLine.setAttribute("y2", CENTER - TRACK_RADIUS + 12);
  startLine.setAttribute("stroke", "#ffffff");
  startLine.setAttribute("stroke-width", "5");
  svg.appendChild(startLine);

  const startLabel = document.createElementNS(ns, "text");
  startLabel.setAttribute("x", CENTER);
  startLabel.setAttribute("y", CENTER - TRACK_RADIUS - 20);
  startLabel.setAttribute("fill", "#e8eaed");
  startLabel.setAttribute("font-size", "13");
  startLabel.setAttribute("text-anchor", "middle");
  startLabel.textContent = "START / FINISH";
  svg.appendChild(startLabel);

  for (const d of order) {
    const g = document.createElementNS(ns, "g");
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("r", 9);
    circle.setAttribute("fill", d.color);
    circle.setAttribute("stroke", "#0b0c0e");
    circle.setAttribute("stroke-width", "1.5");
    const text = document.createElementNS(ns, "text");
    text.setAttribute("y", -13);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "9");
    text.setAttribute("fill", "#e8eaed");
    text.textContent = d.abbrev;
    g.appendChild(circle);
    g.appendChild(text);
    svg.appendChild(g);
    d.el = g;
  }
}

function renderDots(order) {
  for (const d of order) {
    const theta = ((d.totalDegrees % 360) + 360) % 360;
    const { x, y } = polarPoint(theta);
    d.el.setAttribute("transform", `translate(${x},${y})`);
  }
}

/* ---------- leaderboard ---------- */
function renderLeaderboard(order) {
  const el = document.getElementById("leaderboard");
  el.innerHTML = order
    .map(
      (d, i) => `
    <li>
      <span class="pos">P${i + 1}</span>
      <span class="dot" style="background:${d.color}"></span>
      <span class="num">#${d.number}</span>
      <span class="lname">${d.lastName}</span>
    </li>`
    )
    .join("");
}

/* ---------- pit stops ---------- */
function applyPitStops(order, decisions) {
  const before = new Map(order.map((d, i) => [d.driverId, i + 1]));
  const stay = order.filter((d) => decisions[d.driverId] === "stay");
  const two = order.filter((d) => decisions[d.driverId] === "two");
  const four = order.filter((d) => decisions[d.driverId] === "four");

  const variation = settings.pitVariation / 100;
  const timeFor = (base) => base * (1 + (Math.random() * 2 - 1) * variation);
  two.sort((a, b) => timeFor(10) - timeFor(10));
  four.sort((a, b) => timeFor(13) - timeFor(13));

  for (const d of two) d.tiresRightLaps = 0;
  for (const d of four) {
    d.tiresLeftLaps = 0;
    d.tiresRightLaps = 0;
  }

  const newOrder = [...stay, ...two, ...four];
  const pitReport = [...two, ...four].map((d) => ({
    driver: d,
    tires: decisions[d.driverId] === "two" ? "2" : "4",
    before: before.get(d.driverId),
    after: newOrder.indexOf(d) + 1,
  }));
  pitReport.sort((a, b) => a.after - b.after);
  return { newOrder, pitReport };
}

/* ---------- race loop ---------- */
function startRaceSimulation() {
  qualified.forEach((d) => {
    d.tiresLeftLaps = 0;
    d.tiresRightLaps = 0;
  });

  const order = qualified.map((d, i) => ({
    ...d,
    totalDegrees: -i * GRID_SPACING_DEG,
    position: i + 1,
  }));
  order.forEach((d) => (d.currentLapTime = computeLapTime(d)));

  raceState = {
    order,
    totalLaps: settings.totalLaps,
    paused: false,
    finished: false,
    leaderLapMark: 0,
    cautionEvents: [],
    lastTime: null,
    lastLeaderboardRender: 0,
  };

  initTrackSvg(order);
  renderLeaderboard(order);
  updateLapCounter(1);
  setFlag("green", "GREEN");

  requestAnimationFrame(tick);
}

function updateStandings() {
  raceState.order.sort((a, b) => b.totalDegrees - a.totalDegrees);
  raceState.order.forEach((d, i) => (d.position = i + 1));
}

function setFlag(cls, text) {
  const el = document.getElementById("raceFlag");
  el.className = `flag ${cls}`;
  el.textContent = text;
}

function updateLapCounter(lap) {
  document.getElementById("lapCounter").textContent = `Lap ${clamp(lap, 1, raceState.totalLaps)} / ${raceState.totalLaps}`;
}

function checkCautionTrigger(leaderLapIndex) {
  if (leaderLapIndex <= raceState.leaderLapMark) return false;
  let triggered = false;
  for (let lap = raceState.leaderLapMark + 1; lap <= leaderLapIndex; lap++) {
    if (lap <= raceState.totalLaps - 2 && Math.random() < CAUTION_CHANCE_PER_LAP) {
      triggered = true;
      raceState.leaderLapMark = lap;
      break;
    }
    raceState.leaderLapMark = lap;
  }
  return triggered;
}

function showCautionModal(lapNumber) {
  const fieldSize = raceState.order.length;
  const lapsRemaining = raceState.totalLaps - lapNumber;
  const decisions = {};
  for (const d of raceState.order) {
    decisions[d.driverId] = decidePitStrategy(d, d.position, fieldSize, lapsRemaining);
  }
  raceState.cautionEvents.push({ lap: lapNumber, decisions });

  document.getElementById("cautionSub").textContent = `Lap ${lapNumber} - strategy calls and current tire wear`;
  const tbody = document.querySelector("#cautionTable tbody");
  const label = { stay: "Stay Out", two: "2 Tires", four: "4 Tires" };
  tbody.innerHTML = raceState.order
    .map((d) => {
      const decision = decisions[d.driverId];
      const cls = decision === "two" ? "pit-2" : decision === "four" ? "pit-4" : "";
      return `<tr>
        <td>P${d.position}</td>
        <td>#${d.number}</td>
        <td>${d.name}</td>
        <td class="${cls}">${label[decision]}</td>
        <td>${d.tiresLeftLaps}</td>
        <td>${d.tiresRightLaps}</td>
      </tr>`;
    })
    .join("");

  const modal = document.getElementById("cautionModal");
  modal.classList.remove("hidden", "fade-out");
  setFlag("caution", "CAUTION");

  setTimeout(() => {
    modal.classList.add("fade-out");
    setTimeout(() => {
      modal.classList.add("hidden");
      const { newOrder } = applyPitStops(raceState.order, decisions);
      const baseLap = raceState.leaderLapMark;
      newOrder.forEach((d, i) => {
        d.totalDegrees = baseLap * 360 - i * GRID_SPACING_DEG;
        d.currentLapTime = computeLapTime(d);
      });
      raceState.order = newOrder;
      updateStandings();
      renderDots(raceState.order);
      renderLeaderboard(raceState.order);
      setFlag("green", "GREEN");
      raceState.paused = false;
    }, 650);
  }, 10000);
}

function finalizeRace() {
  raceState.finished = true;
  updateStandings();
  setFlag("finish", "FINISH");
  renderResults(raceState.order);
  renderStrategyTable(raceState.order, raceState.cautionEvents);
  showScreen("screen-results");
}

function tick(now) {
  if (!raceState.paused) {
    if (raceState.lastTime === null) raceState.lastTime = now;
    const dt = (now - raceState.lastTime) / 1000;
    raceState.lastTime = now;

    for (const d of raceState.order) {
      const degPerSec = (360 * ANIM_SPEED) / d.currentLapTime;
      const prevLapIndex = Math.floor(d.totalDegrees / 360);
      d.totalDegrees += degPerSec * dt;
      const newLapIndex = Math.floor(d.totalDegrees / 360);
      if (newLapIndex > prevLapIndex) {
        d.tiresLeftLaps += newLapIndex - prevLapIndex;
        d.tiresRightLaps += newLapIndex - prevLapIndex;
        d.currentLapTime = computeLapTime(d);
      }
    }

    updateStandings();
    renderDots(raceState.order);

    if (now - raceState.lastLeaderboardRender > 150) {
      renderLeaderboard(raceState.order);
      raceState.lastLeaderboardRender = now;
    }

    const leaderLapIndex = Math.floor(raceState.order[0].totalDegrees / 360);
    updateLapCounter(leaderLapIndex + 1);

    if (leaderLapIndex >= raceState.totalLaps) {
      finalizeRace();
      return;
    }

    if (checkCautionTrigger(leaderLapIndex)) {
      raceState.paused = true;
      showCautionModal(raceState.leaderLapMark);
    }
  } else {
    raceState.lastTime = now;
  }

  if (!raceState.finished) requestAnimationFrame(tick);
}

/* ---------- results & strategy screens ---------- */
function renderResults(order) {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = order
    .map((d, i) => `<tr><td>P${i + 1}</td><td>#${d.number}</td><td>${d.name}</td><td>${d.skill}</td></tr>`)
    .join("");
}

function renderStrategyTable(order, cautionEvents) {
  const headRow = document.querySelector("#strategyTable thead tr");
  headRow.innerHTML =
    `<th>Pos</th><th>Car</th>` + cautionEvents.map((e) => `<th>Caution L${e.lap}</th>`).join("");

  const symbol = { stay: "-", two: "2", four: "4" };
  const clsFor = { stay: "", two: "pit-2", four: "pit-4" };

  const tbody = document.querySelector("#strategyTable tbody");
  tbody.innerHTML = order
    .map((d, i) => {
      const cells = cautionEvents
        .map((e) => {
          const decision = e.decisions[d.driverId] || "stay";
          return `<td class="${clsFor[decision]}">${symbol[decision]}</td>`;
        })
        .join("");
      return `<tr><td>P${i + 1}</td><td>#${d.number}</td>${cells}</tr>`;
    })
    .join("");
}

/* ---------- screen navigation ---------- */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ---------- wiring ---------- */
function bindSlider(id, settingKey, format) {
  const input = document.getElementById(id);
  const label = document.getElementById(id + "Value");
  input.addEventListener("input", () => {
    settings[settingKey] = Number(input.value);
    label.textContent = format(settings[settingKey]);
    if (settingKey === "fieldSize") {
      currentField = buildField(settings.fieldSize);
      renderEntryList(currentField);
    }
  });
}

bindSlider("fieldSize", "fieldSize", (v) => `${v}`);
bindSlider("raceLaps", "totalLaps", (v) => `${v}`);
bindSlider("trackPositionValue", "trackPositionValue", (v) => `${v}%`);
bindSlider("newTireValue", "newTireValue", (v) => `${v}%`);
bindSlider("pitVariation", "pitVariation", (v) => `${v}%`);

currentField = buildField(settings.fieldSize);
renderEntryList(currentField);

document.getElementById("startWeekend").addEventListener("click", () => {
  qualified = runQualifying(currentField);
  renderQualifying(qualified);
  showScreen("screen-qualifying");
});

document.getElementById("startRace").addEventListener("click", () => {
  showScreen("screen-race");
  startRaceSimulation();
});

document.getElementById("viewStrategy").addEventListener("click", () => {
  showScreen("screen-strategy");
});

document.getElementById("restartApp").addEventListener("click", () => {
  window.location.reload();
});
