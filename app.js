/* ---------- constants ---------- */
const ANIM_SPEED = 40;               // a 40s-equivalent lap completes the loop in 1 real second
const CAUTION_CHANCE_PER_LAP = 0.04;
const GRID_SPACING_DEG = 1.4;

// Rectangular oval, modeled on Indianapolis Motor Speedway (2.5 miles):
// two long straights (front/back stretch) and two short "chute" straights
// (the short sides), joined by four near-identical, tight 90-degree turns -
// a rounded rectangle, distinct from a stadium's two big 180-degree caps.
// Real proportions (ft): front/back stretch ~3300-3330, short chutes ~660,
// each turn ~1320 (quarter circle) -> turn radius = 1320*2/pi =~ 840.
const CENTER_X = 450;
const CENTER_Y = 230;
const HALF_STRAIGHT = 250;   // half the front/back stretch length (px)
const HALF_CHUTE = 50;       // half the short-chute length (px)
const CORNER_R = 127;        // turn radius (px)
const STRAIGHT_LEN = 2 * HALF_STRAIGHT;
const CHUTE_LEN = 2 * HALF_CHUTE;
const OUTER_HALF_W = HALF_STRAIGHT + CORNER_R;
const OUTER_HALF_H = HALF_CHUTE + CORNER_R;
const TOP_Y = CENTER_Y - OUTER_HALF_H;
const BOTTOM_Y = CENTER_Y + OUTER_HALF_H;
const LEFT_X = CENTER_X - OUTER_HALF_W;
const RIGHT_X = CENTER_X + OUTER_HALF_W;
const TURN_ARC_LEN = (Math.PI / 2) * CORNER_R;
const LAP_LEN = 2 * STRAIGHT_LEN + 2 * CHUTE_LEN + 4 * TURN_ARC_LEN;
const STRAIGHT_FRAC = STRAIGHT_LEN / LAP_LEN;
const CHUTE_FRAC = CHUTE_LEN / LAP_LEN;
const TURN_FRAC = TURN_ARC_LEN / LAP_LEN;
// Segment order around the lap, starting on the frontstretch: front straight,
// turn 1, right chute, turn 2, back straight, turn 3, left chute, turn 4.
const SEGMENTS = [STRAIGHT_FRAC, TURN_FRAC, CHUTE_FRAC, TURN_FRAC, STRAIGHT_FRAC, TURN_FRAC, CHUTE_FRAC, TURN_FRAC];
// Where the start/finish line sits along the frontstretch, offset toward turn 1.
const START_FINISH_FRONT_T = 0.58;
const SF_OFFSET = START_FINISH_FRONT_T * STRAIGHT_FRAC;

// Quali/pace lap-time formula, scaled 1.25x (2.5mi IMS / 2.0mi baseline) from
// a 2-mile-track calibration of 100 OVR+roll 1.0 -> 40.0s, 40 OVR+roll 0.0 -> 44.0s,
// giving 50.0s / 55.0s anchors here. score = 0.6*(ovr/100) + 0.4*roll (quali)
// or 0.55*skill + 0.45*roll - tire penalty (race pace), laptime = A - B*score.
const LAPTIME_A = 45.263157894736842 * 1.25;
const LAPTIME_B = 5.263157894736842 * 1.25;

// Race-pace spread cap: skill+luck alone (ignoring tire wear) should only
// spread the field by this many seconds per lap, not the ~5s the qualifying
// weighting would otherwise produce - keeps green-flag racing tight while
// tire wear (added separately, in real seconds) still costs time on top.
const RACE_PACE_SPREAD_SECONDS = 2.0;
const RACE_SCORE_MIN = 0.55 * 0.4 + 0.45 * 0; // worst skill (40) + worst luck (0)
const RACE_SCORE_MAX = 0.55 * 0.99 + 0.45 * 1; // best skill (99) + best luck (1)
const RACE_PACE_B = RACE_PACE_SPREAD_SECONDS / (RACE_SCORE_MAX - RACE_SCORE_MIN);
const RACE_PACE_BASE = LAPTIME_A - LAPTIME_B + RACE_PACE_B * RACE_SCORE_MAX; // best case matches quali's best case
const TIRE_PENALTY_SECONDS_PER_LAP = 0.04;

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
  const tireAvg = (driver.tiresLeftLaps + driver.tiresRightLaps) / 2;
  const score = clamp(0.55 * skillNorm + 0.45 * roll, RACE_SCORE_MIN, RACE_SCORE_MAX);
  const tirePenaltySeconds = Math.min(tireAvg, 60) * TIRE_PENALTY_SECONDS_PER_LAP * tireWeight;
  return clamp(RACE_PACE_BASE - RACE_PACE_B * score + tirePenaltySeconds, 34, 60);
}

function riskTolerance(position, fieldSize) {
  return clamp((position - 1) / Math.max(fieldSize - 1, 1), 0, 1);
}

const REPEAT_CAUTION_WINDOW_LAPS = 8;
const REPEAT_CAUTION_BACKMARKER_POSITION = 30;
const REPEAT_CAUTION_WORN_TIRE_LAPS = 25;

function decidePitStrategy(driver, position, fieldSize, lapsRemaining, lapsSinceLastCaution) {
  const rt = riskTolerance(position, fieldSize);
  const wear = (driver.tiresLeftLaps + driver.tiresRightLaps) / 2;
  const protectWeight = 0.6 * (settings.trackPositionValue / 50);

  const pitDesire = clamp(wear / 35, 0, 1);
  const protectPosition = clamp(1 - rt, 0, 1) * clamp(1 - lapsRemaining / 15, 0, 1);
  let pitProbability = clamp(pitDesire - protectPosition * protectWeight + rt * 0.1, 0.05, 0.95);

  const isRepeatCaution = lapsSinceLastCaution !== null && lapsSinceLastCaution <= REPEAT_CAUTION_WINDOW_LAPS;
  if (isRepeatCaution) {
    const isBackmarkerOnWornTires = position >= REPEAT_CAUTION_BACKMARKER_POSITION && wear >= REPEAT_CAUTION_WORN_TIRE_LAPS;
    pitProbability = isBackmarkerOnWornTires ? clamp(pitProbability * 0.6, 0.05, 0.5) : clamp(pitProbability * 0.05, 0, 0.05);
  }

  if (Math.random() > pitProbability) return "stay";

  const fourTireProbability = clamp(0.8 - rt * 0.55, 0.15, 0.85);
  return Math.random() < fourTireProbability ? "four" : "two";
}

/* ---------- SVG track (rectangular oval) ---------- */
// theta is a 0-360 lap-fraction angle; theta=0 is defined to land exactly on
// the start/finish line (see SF_OFFSET) so lap-completion logic elsewhere,
// which keys off totalDegrees crossing a multiple of 360, lines up with
// actually crossing the S/F line physically.
function trackPoint(theta) {
  const sExternal = (((theta % 360) + 360) % 360) / 360;
  const s = (sExternal + SF_OFFSET) % 1;

  let acc = 0;
  if (s < (acc += STRAIGHT_FRAC)) {
    const t = (s - (acc - STRAIGHT_FRAC)) / STRAIGHT_FRAC; // frontstretch, left -> right
    return { x: CENTER_X - HALF_STRAIGHT + t * STRAIGHT_LEN, y: BOTTOM_Y };
  }
  if (s < (acc += TURN_FRAC)) {
    const u = (s - (acc - TURN_FRAC)) / TURN_FRAC; // turn 1, bottom -> right
    const th = (Math.PI / 2) * (1 - u);
    return { x: CENTER_X + HALF_STRAIGHT + CORNER_R * Math.cos(th), y: CENTER_Y + HALF_CHUTE + CORNER_R * Math.sin(th) };
  }
  if (s < (acc += CHUTE_FRAC)) {
    const t = (s - (acc - CHUTE_FRAC)) / CHUTE_FRAC; // right chute, bottom -> top
    return { x: RIGHT_X, y: CENTER_Y + HALF_CHUTE - t * CHUTE_LEN };
  }
  if (s < (acc += TURN_FRAC)) {
    const u = (s - (acc - TURN_FRAC)) / TURN_FRAC; // turn 2, right -> top
    const th = -u * (Math.PI / 2);
    return { x: CENTER_X + HALF_STRAIGHT + CORNER_R * Math.cos(th), y: CENTER_Y - HALF_CHUTE + CORNER_R * Math.sin(th) };
  }
  if (s < (acc += STRAIGHT_FRAC)) {
    const t = (s - (acc - STRAIGHT_FRAC)) / STRAIGHT_FRAC; // backstretch, right -> left
    return { x: RIGHT_X - CORNER_R - t * STRAIGHT_LEN, y: TOP_Y };
  }
  if (s < (acc += TURN_FRAC)) {
    const u = (s - (acc - TURN_FRAC)) / TURN_FRAC; // turn 3, top -> left
    const th = -Math.PI / 2 - u * (Math.PI / 2);
    return { x: CENTER_X - HALF_STRAIGHT + CORNER_R * Math.cos(th), y: CENTER_Y - HALF_CHUTE + CORNER_R * Math.sin(th) };
  }
  if (s < (acc += CHUTE_FRAC)) {
    const t = (s - (acc - CHUTE_FRAC)) / CHUTE_FRAC; // left chute, top -> bottom
    return { x: LEFT_X, y: CENTER_Y - HALF_CHUTE + t * CHUTE_LEN };
  }
  const u = (s - acc) / TURN_FRAC; // turn 4, left -> bottom
  const th = Math.PI - u * (Math.PI / 2);
  return { x: CENTER_X - HALF_STRAIGHT + CORNER_R * Math.cos(th), y: CENTER_Y + HALF_CHUTE + CORNER_R * Math.sin(th) };
}

function initTrackSvg(order) {
  const svg = document.getElementById("track");
  svg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";

  const frontLeft = `${CENTER_X - HALF_STRAIGHT},${BOTTOM_Y}`;
  const frontRight = `${CENTER_X + HALF_STRAIGHT},${BOTTOM_Y}`;
  const rightChuteBottom = `${RIGHT_X},${CENTER_Y + HALF_CHUTE}`;
  const rightChuteTop = `${RIGHT_X},${CENTER_Y - HALF_CHUTE}`;
  const backRight = `${CENTER_X + HALF_STRAIGHT},${TOP_Y}`;
  const backLeft = `${CENTER_X - HALF_STRAIGHT},${TOP_Y}`;
  const leftChuteTop = `${LEFT_X},${CENTER_Y - HALF_CHUTE}`;
  const leftChuteBottom = `${LEFT_X},${CENTER_Y + HALF_CHUTE}`;
  const R = CORNER_R;

  const trackOutline = document.createElementNS(ns, "path");
  trackOutline.setAttribute(
    "d",
    `M ${frontLeft} L ${frontRight} A ${R},${R} 0 0,0 ${rightChuteBottom} L ${rightChuteTop} A ${R},${R} 0 0,0 ${backRight} L ${backLeft} A ${R},${R} 0 0,0 ${leftChuteTop} L ${leftChuteBottom} A ${R},${R} 0 0,0 ${frontLeft} Z`
  );
  trackOutline.setAttribute("fill", "none");
  trackOutline.setAttribute("stroke", "#3a4150");
  trackOutline.setAttribute("stroke-width", "3");
  svg.appendChild(trackOutline);

  const sfX = CENTER_X - HALF_STRAIGHT + START_FINISH_FRONT_T * STRAIGHT_LEN;

  const startLine = document.createElementNS(ns, "line");
  startLine.setAttribute("x1", sfX);
  startLine.setAttribute("y1", BOTTOM_Y - 16);
  startLine.setAttribute("x2", sfX);
  startLine.setAttribute("y2", BOTTOM_Y + 16);
  startLine.setAttribute("stroke", "#ffffff");
  startLine.setAttribute("stroke-width", "5");
  svg.appendChild(startLine);

  const startLabel = document.createElementNS(ns, "text");
  startLabel.setAttribute("x", sfX);
  startLabel.setAttribute("y", BOTTOM_Y + 34);
  startLabel.setAttribute("fill", "#e8eaed");
  startLabel.setAttribute("font-size", "13");
  startLabel.setAttribute("text-anchor", "middle");
  startLabel.textContent = "START / FINISH";
  svg.appendChild(startLabel);

  const turnLabels = [
    { text: "TURN 1", x: CENTER_X + HALF_STRAIGHT + R * 0.7, y: BOTTOM_Y - R * 0.7 },
    { text: "TURN 2", x: CENTER_X + HALF_STRAIGHT + R * 0.7, y: TOP_Y + R * 0.7 },
    { text: "TURN 3", x: CENTER_X - HALF_STRAIGHT - R * 0.7, y: TOP_Y + R * 0.7 },
    { text: "TURN 4", x: CENTER_X - HALF_STRAIGHT - R * 0.7, y: BOTTOM_Y - R * 0.7 },
  ];
  for (const { text, x, y } of turnLabels) {
    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", y);
    label.setAttribute("fill", "#6b7280");
    label.setAttribute("font-size", "12");
    label.setAttribute("text-anchor", "middle");
    label.textContent = text;
    svg.appendChild(label);
  }

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
    const { x, y } = trackPoint(theta);
    d.el.setAttribute("transform", `translate(${x},${y})`);
  }
}

/* ---------- leaderboard ---------- */
// Interval to the leader: full laps down if lapped, otherwise a time gap
// estimated from the trailing distance at the leader's current pace - the
// same approximation real-time "interval" overlays use between timing loops.
function formatGap(leader, driver) {
  if (driver === leader) return "Leader";
  const degBehind = leader.totalDegrees - driver.totalDegrees;
  const lapsBehind = Math.floor(degBehind / 360);
  if (lapsBehind >= 1) return `-${lapsBehind} Lap${lapsBehind > 1 ? "s" : ""}`;
  // In-race (fictional) seconds behind, not animation wall-clock seconds:
  // a full lap (360deg) takes the leader's currentLapTime fictional seconds.
  const gapSeconds = (degBehind / 360) * leader.currentLapTime;
  return `+${gapSeconds.toFixed(1)}s`;
}

function renderLeaderboard(order) {
  const el = document.getElementById("leaderboard");
  const leader = order[0];
  el.innerHTML = order
    .map(
      (d, i) => `
    <li>
      <span class="pos">P${i + 1}</span>
      <span class="dot" style="background:${d.color}"></span>
      <span class="num">#${d.number}</span>
      <span class="lname">${d.lastName}</span>
      <span class="gap">${formatGap(leader, d)}</span>
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
  const priorCautions = raceState.cautionEvents;
  const lapsSinceLastCaution = priorCautions.length > 0 ? lapNumber - priorCautions[priorCautions.length - 1].lap : null;
  const decisions = {};
  for (const d of raceState.order) {
    decisions[d.driverId] = decidePitStrategy(d, d.position, fieldSize, lapsRemaining, lapsSinceLastCaution);
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
    .map((d, i) => `<tr><td>P${i + 1}</td><td>P${d.qualiPosition}</td><td>#${d.number}</td><td>${d.name}</td><td>${d.skill}</td></tr>`)
    .join("");
}

function renderStrategyTable(order, cautionEvents) {
  const headRow = document.querySelector("#strategyTable thead tr");
  headRow.innerHTML =
    `<th>Pos</th><th>Start</th><th>+/-</th><th>Car</th>` +
    cautionEvents.map((e) => `<th>Caution L${e.lap}</th>`).join("");

  const symbol = { stay: "-", two: "2", four: "4" };
  const clsFor = { stay: "", two: "pit-2", four: "pit-4" };

  const tbody = document.querySelector("#strategyTable tbody");
  tbody.innerHTML = order
    .map((d, i) => {
      const finish = i + 1;
      const change = d.qualiPosition - finish; // positive = gained positions
      const changeHtml =
        change > 0
          ? `<span class="gain">&#9650; ${change}</span>`
          : change < 0
          ? `<span class="loss">&#9660; ${Math.abs(change)}</span>`
          : `<span class="even">&mdash;</span>`;
      const cells = cautionEvents
        .map((e) => {
          const decision = e.decisions[d.driverId] || "stay";
          return `<td class="${clsFor[decision]}">${symbol[decision]}</td>`;
        })
        .join("");
      return `<tr><td>P${finish}</td><td>P${d.qualiPosition}</td><td>${changeHtml}</td><td>#${d.number}</td>${cells}</tr>`;
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
