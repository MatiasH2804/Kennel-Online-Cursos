let videos = [];
let lastRenderedSignature = "";

function login(){

  const usuario = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value.trim();

  if(usuario === "admin" && password === "1234"){

    localStorage.setItem("logueado","true");

    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");

    cargarVideos();

  }else{

    document.getElementById("loginError").innerText =
      "Usuario o contrase\u00f1a incorrectos";

  }

}

function logout(){

  localStorage.removeItem("logueado");

  location.reload();

}

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

function renderVideos(lista){

  const container =
    document.getElementById("videosContainer");

  const signature =
    lista
      .map(video => `${video.Video}|${video.Portada}|${video["T\u00edtulo"]}|${video["Informaci\u00f3n"]}`)
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
          alt="${video["T\u00edtulo"]}"
          loading="lazy"
          decoding="async"
        >
      </div>

      <div class="card-title-area">

        <span class="card-title">
          ${video["T\u00edtulo"]}
        </span>

        <span class="card-tag">
          ${nivel}
        </span>

      </div>

      <div class="card-body">

        <div class="card-description">
          ${video["Informaci\u00f3n"]}
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

  const texto = document
    .getElementById("searchInput")
    .value
    .toLowerCase();

  const filtrados = videos.filter(v=>
    v["T\u00edtulo"].toLowerCase().includes(texto)
  );

  renderVideos(filtrados);

}

window.onload = ()=>{

  document
    .getElementById("appView")
    .classList
    .remove("hidden");

  cargarVideos();

};
