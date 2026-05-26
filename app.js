let videos = [];
let lastRenderedSignature = "";
let appStarted = false;
let usuarioActual = null;

const AUTH_USER_KEY = "usuarioKennel";

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

function logout(){
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  lastRenderedSignature = "";
  appStarted = false;
  usuarioActual = null;
  getElement("videosContainer").replaceChildren();
  showLogin();
}

function showAuthMessage(message,type = "error"){
  const messageBox =
    getElement("authMessage");

  messageBox.textContent = message;
  messageBox.className = `auth-message ${type}`;
}

function clearAuthMessage(){
  showAuthMessage("","neutral");
}

function setAuthLoading(button,isLoading,text){
  button.disabled = isLoading;
  button.textContent = isLoading ? "Procesando..." : text;
}

function setAuthPanel(panel){
  clearAuthMessage();
  getElement("loginPanel").classList.toggle("hidden",panel !== "login");
  getElement("registerPanel").classList.toggle("hidden",panel !== "register");
}

async function hashPassword(password){
  const encodedPassword =
    new TextEncoder().encode(password);

  const hashBuffer =
    await crypto.subtle.digest("SHA-256",encodedPassword);

  return Array
    .from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2,"0"))
    .join("");
}

async function postAuth(payload){
  const response =
    await fetch(API_URL,{
      method:"POST",
      headers:{
        "Content-Type":"text/plain;charset=utf-8"
      },
      body:JSON.stringify(payload)
    });

  if(!response.ok){
    throw new Error("Error de conexion");
  }

  return response.json();
}

function responseIsOk(data){
  return data && (
    data.ok === true ||
    data.success === true ||
    data.status === "ok" ||
    data.status === "success"
  );
}

function getResponseMessage(data,fallback){
  return data && (data.message || data.mensaje || data.error) || fallback;
}

function getResponseUser(data,mail){
  return data.usuario || data.user || {
    mail
  };
}

function getUserStatus(data){
  const usuario =
    data.usuario || data.user || {};

  return String(data.estado || data.Estado || usuario.estado || usuario.Estado || "").trim().toLowerCase();
}

function normalizarVideosHabilitados(value){
  return (
    value === true ||
    String(value || "")
      .trim()
      .toUpperCase() === "TRUE"
  );
}

function getVideosHabilitados(data){
  const usuario =
    data.usuario || data.user || data || {};

  return normalizarVideosHabilitados(
    data.videosHabilitados ||
    data["Videos Habilitados"] ||
    usuario.videosHabilitados ||
    usuario["Videos Habilitados"]
  );
}

function prepararUsuario(data,mail){
  const usuario =
    getResponseUser(data,mail);

  return {
    ...usuario,
    estado:getUserStatus(data) || usuario.estado || "activo",
    videosHabilitados:getVideosHabilitados(data)
  };
}

function guardarUsuario(usuario,remember){
  const storage =
    remember ? localStorage : sessionStorage;

  storage.setItem(
    AUTH_USER_KEY,
    JSON.stringify(usuario)
  );
}

function obtenerUsuarioPersistido(){
  const rawUsuario =
    localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);

  if(!rawUsuario){
    return null;
  }

  try{
    return JSON.parse(rawUsuario);
  }catch(error){
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

function obtenerStorageSesion(){
  if(localStorage.getItem(AUTH_USER_KEY)){
    return localStorage;
  }

  if(sessionStorage.getItem(AUTH_USER_KEY)){
    return sessionStorage;
  }

  return null;
}

async function refrescarSesionUsuario(){
  const usuarioPersistido =
    obtenerUsuarioPersistido();

  const storage =
    obtenerStorageSesion();

  if(!usuarioPersistido || !usuarioPersistido.mail || !storage){
    logout();
    return;
  }

  try{
    const data =
      await postAuth({
        action:"session",
        mail:String(usuarioPersistido.mail).trim().toLowerCase()
      });

    const status =
      getUserStatus(data);

    if(!responseIsOk(data) || status !== "activo"){
      logout();
      return;
    }

    const usuario =
      prepararUsuario(data,usuarioPersistido.mail);

    storage.setItem(
      AUTH_USER_KEY,
      JSON.stringify(usuario)
    );

    abrirAppSegunPermisos(usuario);

  }catch(error){
    console.error(error);
    logout();
  }
}

function abrirAppSegunPermisos(usuario){
  appStarted = true;
  usuarioActual = usuario;
  showApp();

  if(usuario.videosHabilitados){
    cargarVideos();
    return;
  }

  mostrarBloqueoVideos();
}

async function contactarPago(){
  const alias = "matiashenquin";

  const mensaje =
    'Hola Eduardo, ya abon\u00e9 el total del pago al alias "matiashenquin", te env\u00edo el comprobante, ya estoy en condiciones de ver los videos.';

  try{
    await navigator.clipboard.writeText(
      alias
    );
  }catch(error){
    console.error(error);
  }

  const whatsappURL =
    "https://wa.me/5493424307388?text=" +
    encodeURIComponent(mensaje);

  window.open(
    whatsappURL,
    "_blank"
  );
}

async function handleLoginSubmit(event){
  event.preventDefault();
  clearAuthMessage();

  const submitButton =
    getElement("loginSubmit");

  const mail =
    getElement("loginMail").value.trim().toLowerCase();

  const password =
    getElement("loginPassword").value;

  const remember =
    getElement("rememberMe").checked;

  if(!mail || !password){
    showAuthMessage("Completa mail y password.");
    return;
  }

  try{
    setAuthLoading(submitButton,true,"Ingresar");

    const passwordHash =
      await hashPassword(password);

    const data =
      await postAuth({
        action:"login",
        mail,
        passwordHash
      });

    const status =
      getUserStatus(data);

    if(status === "pendiente"){
      showAuthMessage("Tu cuenta esta pendiente de aprobacion.","warning");
      return;
    }

    const loginAccepted =
      responseIsOk(data) || status === "activo";

    if(!loginAccepted || status && status !== "activo"){
      showAuthMessage(
        getResponseMessage(data,"Mail o password incorrectos.")
      );
      return;
    }

    const usuario =
      prepararUsuario(data,mail);

    guardarUsuario(usuario,remember);
    abrirAppSegunPermisos(usuario);

  }catch(error){
    console.error(error);
    showAuthMessage("No se pudo conectar con el servidor. Intenta nuevamente.");
  }finally{
    setAuthLoading(submitButton,false,"Ingresar");
  }
}

async function handleRegisterSubmit(event){
  event.preventDefault();
  clearAuthMessage();

  const submitButton =
    getElement("registerSubmit");

  const nombre =
    getElement("registerNombre").value.trim();

  const apellido =
    getElement("registerApellido").value.trim();

  const mail =
    getElement("registerMail").value.trim().toLowerCase();

  const telefono =
    getElement("registerTelefono").value.trim();

  const password =
    getElement("registerPassword").value;

  const confirmPassword =
    getElement("registerConfirmPassword").value;

  if(!nombre || !apellido || !mail || !telefono || !password || !confirmPassword){
    showAuthMessage("Completa todos los campos.");
    return;
  }

  if(password !== confirmPassword){
    showAuthMessage("Las passwords no coinciden.");
    return;
  }

  try{
    setAuthLoading(submitButton,true,"Crear cuenta");

    const passwordHash =
      await hashPassword(password);

    const data =
      await postAuth({
        action:"register",
        nombre,
        apellido,
        mail,
        telefono,
        passwordHash
      });

    const registerAccepted =
      responseIsOk(data) || getUserStatus(data) === "pendiente";

    if(!registerAccepted){
      showAuthMessage(
        getResponseMessage(data,"No se pudo crear la cuenta.")
      );
      return;
    }

    getElement("registerForm").reset();
    setAuthPanel("login");
    showAuthMessage(
      "Tu cuenta fue creada y esta pendiente de aprobacion.",
      "success"
    );

  }catch(error){
    console.error(error);
    showAuthMessage("No se pudo conectar con el servidor. Intenta nuevamente.");
  }finally{
    setAuthLoading(submitButton,false,"Crear cuenta");
  }
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
    console.error("Error cargando videos");

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

function mostrarBloqueoVideos(){

  const container =
    getElement("videosContainer");

  videos = [];
  lastRenderedSignature = "payment-lock";

  container.innerHTML = `

    <div class="payment-lock-wrapper">

      <div class="payment-title">
        ACCESO BLOQUEADO
      </div>

      <div class="payment-subtitle">
        Tu cuenta fue aprobada correctamente.
        <br>
        Pero todavia no se habilito el acceso a las clases.
      </div>

      <div class="payment-subtitle">
        Envia el comprobante de pago por WhatsApp
        para desbloquear automaticamente los videos.
      </div>

      <button
        class="payment-link"
        onclick="contactarPago()"
      >

        <div class="container">
          <div class="left-side">

            <div class="card">
              <div class="card-line"></div>
              <div class="buttons"></div>
            </div>

            <div class="post">
              <div class="post-line"></div>

              <div class="screen">
                <div class="dollar">$</div>
              </div>

              <div class="numbers"></div>
              <div class="numbers-line2"></div>

            </div>

          </div>

          <div class="right-side">

            <div class="new">
              Enviar comprobante
            </div>

            <svg
              viewBox="0 0 451.846 451.847"
              class="arrow"
            >
              <path
                fill="#cfcfcf"
                d="M345.441 248.292L151.154 442.573c-12.359 12.365-32.397 12.365-44.75 0-12.354-12.354-12.354-32.391 0-44.744L278.318 225.92 106.409 54.017c-12.354-12.359-12.354-32.394 0-44.748 12.354-12.359 32.391-12.359 44.75 0l194.287 194.284c6.177 6.18 9.262 14.271 9.262 22.366 0 8.099-3.091 16.196-9.267 22.373z"
              ></path>
            </svg>

          </div>
        </div>

      </button>

    </div>

  `;

}

function filtrarVideos(){

  if(usuarioActual && !usuarioActual.videosHabilitados){
    mostrarBloqueoVideos();
    return;
  }

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

window.addEventListener("load",async ()=>{
  getElement("loginForm").addEventListener("submit",handleLoginSubmit);
  getElement("registerForm").addEventListener("submit",handleRegisterSubmit);
  getElement("showRegister").addEventListener("click",()=>setAuthPanel("register"));
  getElement("showLogin").addEventListener("click",()=>setAuthPanel("login"));

  const usuario =
    obtenerUsuarioPersistido();

  if(usuario){
    if(appStarted){
      return;
    }

    await refrescarSesionUsuario();
    return;
  }

  showLogin();
});
