import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DATA_URL = "./newsstands.json"; ////

const state = {
  stands: [],
  filtered: [],
  selected: null,
  markerMeshes: [],
  originalCamera: null,
  targetCamera: null,
  targetLookAt: null,
  isAnimatingCamera: false
};

const $ = (selector) => document.querySelector(selector);

const globeEl = $("#globe");
const loader = $("#globe-loader");
const standCountHero = $("#stand-count-hero");
const directoryBody = $("#directory-body");
const searchInput = $("#search-input");
const boroughFilter = $("#borough-filter");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060606);

const EARTH_RADIUS = 1.55;
const MIN_CAMERA_DISTANCE = EARTH_RADIUS * 1.12;
const CLOSE_CAMERA_DISTANCE = EARTH_RADIUS * 1.22;

const camera = new THREE.PerspectiveCamera(
  35,
  globeEl.clientWidth / globeEl.clientHeight,
  0.1,
  100
);
camera.position.set(0, 0.15, 4.25);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(globeEl.clientWidth, globeEl.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
globeEl.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = MIN_CAMERA_DISTANCE;
controls.maxDistance = 5.5;
controls.rotateSpeed = 0.45;
controls.zoomSpeed = 0.65;

const ambient = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(5, 3, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8ab4ff, 1.4);
rimLight.position.set(-4, 1, -4);
scene.add(rimLight);

const globeGroup = new THREE.Group();
scene.add(globeGroup);

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");

const earthTexture = textureLoader.load(
  "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
  },
  undefined,
  () => {}
);

const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture,
  roughness: 1,
  metalness: 0
});

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
  earthMaterial
);
globeGroup.add(earth);

const wire = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.004, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0x8b8b8b,
    wireframe: true,
    transparent: true,
    opacity: 0.045
  })
);
globeGroup.add(wire);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.035, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x9bb7ff,
    transparent: true,
    opacity: 0.045,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  })
);
globeGroup.add(atmosphere);

const locator = new THREE.Mesh(
  new THREE.RingGeometry(0.015, 0.023, 32),
  new THREE.MeshBasicMaterial({
    color: 0xd9ff3f,
    side: THREE.DoubleSide
  })
);
locator.visible = false;
globeGroup.add(locator);

const markerGeometry = new THREE.SphereGeometry(0.007, 8, 8);
const markerMaterial = new THREE.MeshBasicMaterial({
  color: 0xd9ff3f
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function latLonToVector3(lat, lon, radius = EARTH_RADIUS + 0.025) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function addMarkers(stands) {
  for (const mesh of state.markerMeshes) {
    globeGroup.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  state.markerMeshes = [];

  for (const stand of stands) {
    const mesh = new THREE.Mesh(markerGeometry, markerMaterial);
    mesh.position.copy(latLonToVector3(stand.latitude, stand.longitude));
    mesh.userData.stand = stand;
    globeGroup.add(mesh);
    state.markerMeshes.push(mesh);
  }
}

function makeStand(row) {
  return {
    id: row.news_stand_ || row.NewsStand_ || "—",
    street: row.street_on || row.Street_on || "Unknown street",
    borough: row.boro_name || row.BoroName || "Unknown",
    district: row.boro_cd || row.BoroCD || "—",
    latitude: Number(row.latitude || row.Latitude),
    longitude: Number(row.longitude || row.Longitude),
    built: row.built_date || row.Built_Date || "—",
    neighborhood: row.ntaname || row.NTAName || "—"
  };
}


function beginArrival() {
  const intro = document.getElementById("arrival-intro");
  const status = document.getElementById("arrival-status");
  const coordinate = document.getElementById("arrival-coordinate");
  if (!intro) return;

  const nycSurface = latLonToVector3(40.7128, -74.0060, EARTH_RADIUS);
  const direction = nycSurface.clone().normalize();
  const highOrbit = direction.clone().multiplyScalar(8.8);
  const lowOrbit = direction.clone().multiplyScalar(CLOSE_CAMERA_DISTANCE);

  camera.position.copy(highOrbit);
  controls.target.set(0, 0, 0);

  const start = performance.now();
  const duration = 5700;

  function fly(now) {
    const raw = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - raw, 3);

    camera.position.lerpVectors(highOrbit, lowOrbit, eased);
    controls.target.lerpVectors(
      new THREE.Vector3(0, 0, 0),
      nycSurface,
      Math.min(eased * 1.15, 1)
    );

    if (status) {
      status.textContent = raw < 0.28
        ? "APPROACHING THE EAST COAST…"
        : raw < 0.62
          ? "ENTERING THE ATMOSPHERE…"
          : raw < 0.9
            ? "LOCKING ONTO NEW YORK…"
            : "FIELD NETWORK ONLINE";
    }

    if (coordinate && raw > 0.3) {
      const altitude = Math.max(1, Math.round(12000 * (1 - eased) + 35));
      coordinate.textContent = `40.7128° N / 74.0060° W  ·  ALT ${altitude.toLocaleString()} KM`;
    }

    if (raw < 1) {
      requestAnimationFrame(fly);
    } else {
      controls.target.copy(nycSurface);
      camera.position.copy(lowOrbit);
      setTimeout(() => {
        intro.classList.add("done");
        setTimeout(() => intro.remove(), 1300);
      }, 250);
    }
  }

  requestAnimationFrame(fly);
}

async function loadStands() {
  try {
    const response = await fetch(DATA_URL, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Local newsstand dataset returned ${response.status}`);
    }

    const rows = await response.json();

    state.stands = rows
      .map(makeStand)
      .filter((stand) => Number.isFinite(stand.latitude) && Number.isFinite(stand.longitude));

    if (!state.stands.length) {
      throw new Error("No usable newsstand records were found in newsstands.json.");
    }

    state.filtered = [...state.stands];

    standCountHero.textContent = `${state.stands.length} LOCATIONS`;
    populateBoroughs();
    addMarkers(state.stands);
    renderDirectory();

    const nycCenter = {
      latitude: 40.7128,
      longitude: -74.0060
    };
    const nycSurface = latLonToVector3(
      nycCenter.latitude,
      nycCenter.longitude,
      EARTH_RADIUS
    );
    const nycDirection = nycSurface.clone().normalize();

    camera.position.copy(
      nycDirection.multiplyScalar(CLOSE_CAMERA_DISTANCE)
    );
    controls.target.set(0, 0, 0);
    loader.classList.add("hidden");
  } catch (error) {
    console.error(error);

    // this fallback gonna keep the visual experience usable if a browser/network blocks the API.
    state.stands = [
      { id: "DEMO-001", street: "5 AVENUE / W 42 ST", borough: "Manhattan", district: "105", latitude: 40.7532, longitude: -73.9822, built: "Demo", neighborhood: "Midtown-Midtown South" },
      { id: "DEMO-002", street: "BROADWAY / W 34 ST", borough: "Manhattan", district: "105", latitude: 40.7484, longitude: -73.9857, built: "Demo", neighborhood: "Midtown-Midtown South" },
      { id: "DEMO-003", street: "ATLANTIC AVENUE / FLATBUSH", borough: "Brooklyn", district: "302", latitude: 40.6835, longitude: -73.9768, built: "Demo", neighborhood: "Downtown Brooklyn" },
      { id: "DEMO-004", street: "QUEENS BOULEVARD / 59 AVE", borough: "Queens", district: "404", latitude: 40.7346, longitude: -73.8690, built: "Demo", neighborhood: "Elmhurst" },
      { id: "DEMO-005", street: "FORDHAM ROAD / GRAND CONCOURSE", borough: "Bronx", district: "207", latitude: 40.8625, longitude: -73.8971, built: "Demo", neighborhood: "Fordham South" }
    ];
    state.filtered = [...state.stands];
    standCountHero.textContent = "DATA OFFLINE";
    populateBoroughs();
    addMarkers(state.stands);
    renderDirectory();

    const nycSurface = latLonToVector3(40.7128, -74.0060, EARTH_RADIUS);
    const nycDirection = nycSurface.clone().normalize();
    camera.position.copy(
      nycDirection.multiplyScalar(CLOSE_CAMERA_DISTANCE)
    );
    controls.target.set(0, 0, 0);

    loader.innerHTML = `
      <div style="max-width:260px;line-height:1.7">
        <div style="color:#d9ff3f;margin-bottom:10px">FIELD DATA UNAVAILABLE</div>
        <div>Showing a small demo set. Make sure newsstands.json is beside index.html and reload the page.</div>
      </div>
    `;
  }
}

function populateBoroughs() {
  const boroughs = [...new Set(state.stands.map((s) => s.borough))]
    .filter(Boolean)
    .sort();

  boroughFilter.innerHTML = `<option value="ALL">All boroughs</option>`;
  boroughs.forEach((borough) => {
    const option = document.createElement("option");
    option.value = borough;
    option.textContent = borough;
    boroughFilter.appendChild(option);
  });
}

function renderDirectory() {
  const query = searchInput.value.trim().toLowerCase();
  const borough = boroughFilter.value;

  state.filtered = state.stands.filter((stand) => {
    const haystack = [
      stand.id,
      stand.street,
      stand.borough,
      stand.neighborhood
    ].join(" ").toLowerCase();

    return (!query || haystack.includes(query)) &&
      (borough === "ALL" || stand.borough === borough);
  });

  if (!state.filtered.length) {
    directoryBody.innerHTML = `
      <tr><td colspan="5" class="table-empty">No locations match the current search.</td></tr>
    `;
    return;
  }

  directoryBody.innerHTML = state.filtered.map((stand) => `
    <tr data-id="${escapeHtml(stand.id)}">
      <td>${escapeHtml(stand.id)}</td>
      <td>${escapeHtml(stand.street)}</td>
      <td>${escapeHtml(stand.borough)}</td>
      <td>${escapeHtml(stand.neighborhood)}</td>
      <td>${stand.latitude.toFixed(5)}, ${stand.longitude.toFixed(5)}</td>
    </tr>
  `).join("");

  directoryBody.querySelectorAll("tr[data-id]").forEach((row) => {
    row.addEventListener("click", () => {
      const stand = state.stands.find((item) => item.id === row.dataset.id);
      if (stand) selectStand(stand);
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectStand(stand) {
  state.selected = stand;

  $("#stand-empty").hidden = true;
  $("#stand-details").hidden = false;

  $("#detail-name").textContent = stand.street;
  $("#detail-location").textContent = `${stand.borough}, New York`;
  $("#detail-id").textContent = stand.id;
  $("#detail-borough").textContent = stand.borough;
  $("#detail-district").textContent = stand.district;
  $("#detail-built").textContent = stand.built;
  $("#detail-neighborhood").textContent = stand.neighborhood;
  $("#detail-coords").textContent =
    `${stand.latitude.toFixed(5)}, ${stand.longitude.toFixed(5)}`;

  const mapUrl =
    `https://www.google.com/maps/search/?api=1&query=${stand.latitude},${stand.longitude}`;
  $("#detail-map-link").href = mapUrl;

  focusGlobeOnStand(stand);
}

function focusGlobeOnStand(stand) {
  const surfacePoint = latLonToVector3(
    stand.latitude,
    stand.longitude,
    EARTH_RADIUS
  );

  const direction = surfacePoint.clone().normalize();
  const destination = direction.multiplyScalar(CLOSE_CAMERA_DISTANCE);

  state.originalCamera = camera.position.clone();
  state.targetCamera = destination;

  state.targetLookAt = new THREE.Vector3(0, 0, 0);
  state.isAnimatingCamera = true;

  locator.position.copy(
    latLonToVector3(
      stand.latitude,
      stand.longitude,
      EARTH_RADIUS + 0.018
    )
  );

  locator.scale.setScalar(0.55);
  locator.lookAt(camera.position);

  const networkTop =
    $("#network").getBoundingClientRect().top + window.scrollY;

  if (
    window.innerWidth < 800 &&
    Math.abs(window.scrollY - networkTop) > 350
  ) {
    window.scrollTo({
      top: networkTop - 20,
      behavior: "smooth"
    });
  }
}

renderer.domElement.addEventListener("pointerdown", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(state.markerMeshes, false);
  if (hits.length) {
    selectStand(hits[0].object.userData.stand);
  }
});

searchInput.addEventListener("input", renderDirectory);
boroughFilter.addEventListener("change", renderDirectory);

$("#menu-button").addEventListener("click", () => {
  $("#main-nav").classList.toggle("open");
});

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => $("#main-nav").classList.remove("open"));
});

function animate() {
  requestAnimationFrame(animate);

  if (state.isAnimatingCamera && state.targetCamera) {
    camera.position.lerp(state.targetCamera, 0.075);

    if (state.targetLookAt) {
      controls.target.lerp(state.targetLookAt, 0.09);
    }

    if (camera.position.distanceTo(state.targetCamera) < 0.008) {
      camera.position.copy(state.targetCamera);
      if (state.targetLookAt) {
        controls.target.copy(state.targetLookAt);
      }
      state.isAnimatingCamera = false;
    }
  }

  // never allow the camera to run into the Earth
  const cameraDistance = camera.position.length();
  if (cameraDistance < MIN_CAMERA_DISTANCE) {
    camera.position
      .normalize()
      .multiplyScalar(MIN_CAMERA_DISTANCE);
  }

controls.update();
const time = performance.now() * 0.003;

state.markerMeshes.forEach((mesh) => {
  const same =
    state.selected &&
    mesh.userData.stand.id === state.selected.id;

  const distance = camera.position.length();

  const zoomFactor = THREE.MathUtils.clamp(
    (distance - MIN_CAMERA_DISTANCE) /
      (5.0 - MIN_CAMERA_DISTANCE),
    0,
    1
  );

  const baseScale = THREE.MathUtils.lerp(
    0.18,
    0.85,
    zoomFactor
  );

  if (same) {
    const pulse =
      1 + Math.sin(time) * 0.10;

    mesh.scale.setScalar(baseScale * pulse);
  } else {
    mesh.scale.setScalar(baseScale);
  }
});

  renderer.render(scene, camera);
}

function resize() {
  const width = globeEl.clientWidth;
  const height = globeEl.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener("resize", resize);

const date = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric"
}).format(new Date());

$("#current-date").textContent = date.toUpperCase();

beginArrival();
loadStands();
animate();
