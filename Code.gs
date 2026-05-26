const SPREADSHEET_ID =
  "1XmmbOUHWJm1HLxe8_CLfbS6WEWB-2N3H6f6fCbCOIzQ";

/* ======================================================
   API PRINCIPAL
====================================================== */

function doGet(e){

  const action =
    e?.parameter?.action || "videos";

  if(action === "videos"){

    return getVideos_();

  }

  return jsonOutput_({

    ok:false,
    error:"Accion invalida"

  });

}

function doPost(e){

  try{

    const data =
      JSON.parse(e.postData.contents);

    const action =
      data.action || "";

    if(action === "register"){

      return register_(data);

    }

    if(action === "login"){

      return login_(data);

    }

    if(action === "session"){

      return session_(data);

    }

    return jsonOutput_({

      ok:false,
      error:"Accion invalida"

    });

  }catch(error){

    return jsonOutput_({

      ok:false,
      error:error.toString()

    });

  }

}

/* ======================================================
   OBTENER VIDEOS
====================================================== */

function getVideos_(){

  try{

    const ss =
      SpreadsheetApp.openById(
        SPREADSHEET_ID
      );

    const sheet =
      ss.getSheetByName(
        "Video De Clases"
      );

    const values =
      sheet
      .getDataRange()
      .getValues();

    const headers =
      values.shift();

    const videos =
      values.map(row => {

        let obj = {};

        headers.forEach((h, i)=>{

          obj[h] = row[i];

        });

        return obj;

      });

    return jsonOutput_({

      ok:true,
      videos:videos

    });

  }catch(error){

    return jsonOutput_({

      ok:false,
      error:error.toString()

    });

  }

}

/* ======================================================
   REGISTRO
====================================================== */

function register_(data){

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      "Usuarios"
    );

  const values =
    sheet
    .getDataRange()
    .getValues();

  const headers =
    values.shift();

  const mail =
    String(data.mail || "")
    .trim()
    .toLowerCase();

  const existe =
    values.find(row => {

      const rowMail =
        String(
          row[
            headers.indexOf("Mail")
          ] || ""
        )
        .trim()
        .toLowerCase();

      return rowMail === mail;

    });

  if(existe){

    return jsonOutput_({

      ok:false,
      error:"El mail ya existe"

    });

  }

  const nuevaFila = [

    generarId_(),
    data.nombre || "",
    data.apellido || "",
    mail,
    data.passwordHash || "",
    data.telefono || "",
    "alumno",
    "pendiente",
    new Date(),
    "",
    "",
    ""

  ];

  sheet.appendRow(nuevaFila);

  return jsonOutput_({

    ok:true,
    estado:"pendiente",
    videosHabilitados:false,
    message:
      "Cuenta creada correctamente"

  });

}

/* ======================================================
   LOGIN
====================================================== */

function login_(data){

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      "Usuarios"
    );

  const values =
    sheet
    .getDataRange()
    .getValues();

  const headers =
    values.shift();

  const mail =
    String(data.mail || "")
    .trim()
    .toLowerCase();

  const passwordHash =
    String(
      data.passwordHash || ""
    );

  const usuario =
    values.find(row => {

      const rowMail =
        String(
          row[
            headers.indexOf("Mail")
          ] || ""
        )
        .trim()
        .toLowerCase();

      const rowPass =
        String(
          row[
            headers.indexOf(
              "PasswordHash"
            )
          ] || ""
        );

      return (
        rowMail === mail &&
        rowPass === passwordHash
      );

    });

  if(!usuario){

    return jsonOutput_({

      ok:false,
      error:
        "Mail o contrasena incorrectos"

    });

  }

  const estado =
    normalizarTexto_(
      usuario[
        headers.indexOf("Estado")
      ]
    );

  const videosHabilitados =
    normalizarBoolean_(
      usuario[
        headers.indexOf(
          "Videos Habilitados"
        )
      ]
    );

  if(estado !== "activo"){

    return jsonOutput_({

      ok:false,
      estado:estado,
      videosHabilitados:videosHabilitados,
      error:
        "Tu cuenta aun no fue aprobada"

    });

  }

  return jsonOutput_({

    ok:true,
    estado:estado,
    videosHabilitados:videosHabilitados,

    usuario:{

      id:
        usuario[
          headers.indexOf(
            "IDUsuario"
          )
        ],

      nombre:
        usuario[
          headers.indexOf(
            "Nombre"
          )
        ],

      apellido:
        usuario[
          headers.indexOf(
            "Apellido"
          )
        ],

      mail:
        usuario[
          headers.indexOf(
            "Mail"
          )
        ],

      rol:
        usuario[
          headers.indexOf(
            "Rol"
          )
        ],

      estado:
        estado,

      videosHabilitados:
        videosHabilitados

    }

  });

}

/* ======================================================
   SESION
====================================================== */

function session_(data){

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      "Usuarios"
    );

  const values =
    sheet
    .getDataRange()
    .getValues();

  const headers =
    values.shift();

  const mail =
    String(data.mail || "")
    .trim()
    .toLowerCase();

  const usuario =
    values.find(row => {

      const rowMail =
        String(
          row[
            headers.indexOf("Mail")
          ] || ""
        )
        .trim()
        .toLowerCase();

      return rowMail === mail;

    });

  if(!usuario){

    return jsonOutput_({

      ok:false,
      error:"Sesion invalida"

    });

  }

  return jsonOutput_(
    usuarioResponse_(
      usuario,
      headers
    )
  );

}

/* ======================================================
   HELPERS
====================================================== */

function generarId_(){

  return "USR-" +

    Utilities.getUuid()
    .substring(0,8)
    .toUpperCase();

}

function normalizarTexto_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function normalizarBoolean_(value){

  return (
    value === true ||
    String(value || "")
      .trim()
      .toUpperCase() === "TRUE"
  );

}

function usuarioResponse_(usuario,headers){

  const estado =
    normalizarTexto_(
      usuario[
        headers.indexOf("Estado")
      ]
    );

  const videosHabilitados =
    normalizarBoolean_(
      usuario[
        headers.indexOf(
          "Videos Habilitados"
        )
      ]
    );

  return {

    ok:true,
    estado:estado,
    videosHabilitados:videosHabilitados,

    usuario:{

      id:
        usuario[
          headers.indexOf(
            "IDUsuario"
          )
        ],

      nombre:
        usuario[
          headers.indexOf(
            "Nombre"
          )
        ],

      apellido:
        usuario[
          headers.indexOf(
            "Apellido"
          )
        ],

      mail:
        usuario[
          headers.indexOf(
            "Mail"
          )
        ],

      rol:
        usuario[
          headers.indexOf(
            "Rol"
          )
        ],

      estado:
        estado,

      videosHabilitados:
        videosHabilitados

    }

  };

}

function jsonOutput_(obj){

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService
      .MimeType
      .JSON
    );

}
