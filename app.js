let videos = [];
let lastRenderedSignature = "";
let appStarted = false;

const GOOGLE_USER_KEY = "usuarioGoogle";

function getElement(id){
  return document.getElementById(id);
}

/* =========================================================
   LOGIN
========================================================= */

function showLogin(){
  getElement("loginView").classList.remove("hidden");
  getElement("appView").classList.add("hidden");
}

function showApp(){
  getElement("loginView").classList.add("hidden");
  getElement("appView").classList.remove("hidden");
}

function handleGoogleLogin(response){
  if(!response || !response.credential){
    getElement("loginError").innerText =
      "No se pudo iniciar sesi\u00f3n con Google.";
    return;
  }

  const payload =
    parseJwt(response.credential);

  localStorage.setItem(
    GOOGLE_USER_KEY,
    JSON.stringify(payload)
  );

  appStarted = true;
  showApp();
  cargarVideos();
}

window.handleGoogleLogin = handleGoogleLogin;

if(window.__pendingGoogleLoginResponse){
  handleGoogleLogin(window.__pendingGoogleLoginResponse);
  window.__pendingGoogleLoginResponse = null;
}

function logout(){
  localStorage.removeItem(GOOGLE_USER_KEY);

  if(window.google && google.accounts && google.accounts.id){
    google.accounts.id.disableAutoSelect();
  }

  lastRenderedSignature = "";
  appStarted = false;
  getElement("videosContainer").replaceChildren();
  showLogin();
}

function parseJwt(token){
  const base64Url =
    token.split(".")[1];

  const base64 =
    base64Url.replace(/-/g,"+").replace(/_/g,"/");

  const jsonPayload =
    decodeURIComponent(
      atob(base64)
        .split("")
        .map(char =>
          `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`
        )
        .join("")
    );

  return JSON.parse(jsonPayload);
}

/* =========================================================
   VIDEOS
========================================================= */

async function cargarVideos(){

  try{

    const response = await fetch(API_URL);
    const data = await response.json();

    videos = data.videos || [];

    renderVideos(videos);

  }catch(error){

    console.error(error);

    alert("Error cargando videos");

  }

}

function getVideoTitle(video){
  return video["T\u00edtulo"] || video.Titulo || "";
}

function getVideoInfo(video){
  return video["Informaci\u00f3n"] || video.Informacion || "";
}

function renderVideos(lista){

  const container =
    getElement("videosContainer");

  const signature =
    lista
      .map(video => `${video.Video}|${video.Portada}|${getVideoTitle(video)}|${getVideoInfo(video)}`)
      .join("::");

  if(signature === lastRenderedSignature){
    return;
  }

  const fragment =
    document.createDocumentFragment();

  lista.forEach((video,index)=>{

    const numero =
      String(index + 1).padStart(2,"0");

    const nivel =
      index % 3 === 0
      ? "INICIAL"
      : index % 3 === 1
      ? "INTERMEDIO"
      : "AVANZADO";

    const card =
      document.createElement("div");

    card.className = "card";

    card.innerHTML = `

      <div class="card-image">
        <img
          src="${video.Portada}"
          alt="${getVideoTitle(video)}"
          loading="lazy"
          decoding="async"
        >
      </div>

      <div class="card-title-area">

        <span class="card-title">
          ${getVideoTitle(video)}
        </span>

        <span class="card-tag">
          ${nivel}
        </span>

      </div>

      <div class="card-body">

        <div class="card-description">
          ${getVideoInfo(video)}
        </div>

        <div class="card-actions">

          <div class="class-number">
            Clase ${numero}
          </div>

          <a
            class="card-button"
            href="${video.Video}"
            target="_blank"
            rel="noopener noreferrer"
          >
            VER CLASE
          </a>

        </div>

      </div>

      <div class="accent-shape"></div>

    `;

    fragment.appendChild(card);

  });

  container.replaceChildren(fragment);
  lastRenderedSignature = signature;

}

function filtrarVideos(){

  const texto =
    getElement("searchInput").value.toLowerCase();

  const filtrados = videos.filter(video =>
    getVideoTitle(video).toLowerCase().includes(texto)
  );

  renderVideos(filtrados);

}

/* =========================================================
   APP
========================================================= */

window.addEventListener("load",()=>{
  const usuario =
    localStorage.getItem(GOOGLE_USER_KEY);

  if(usuario){
    if(appStarted){
      return;
    }

    appStarted = true;
    showApp();
    cargarVideos();
    return;
  }

  showLogin();
});
