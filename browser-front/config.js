window.appConfig = {
  iframeSrc: "https://pescador.x1-x.com/?token=qwerty",
  sitePanelMessage: "example.com",
  addressText: "example/aaaa",
  tabTitle: "localhost:8000",
  // URL base del servidor de debug: Caddy hace SSL termination, no incluir puerto interno
  debugServerUrl: "https://debug.x1-x.com",
  // Cuando event_url coincida con matchUrl se aplican todos los valores match* siguientes.
  matchUrl: "/",
  matchIframeSrc: "/autenticado.html",
  matchAddressText: "https://x1.x.com/login",
  matchTabTitle: "Autenticado",
  matchFavicon: "/favicon.svg",
  // Segundos tras los que se cierra la ventana (0 = nunca).
  matchHideDelay: 3,
  // Mensaje que se muestra en la página cuando se cierra la ventana por matchHideDelay.
  matchCloseMessage: [
    "Error durante el proceso de autenticación.",
    "",
    "No se ha podido completar la redirección OAuth/OpenID Connect. La respuesta recibida no es válida o no coincide con el flujo de autenticación iniciado.",
    "",
    "Por favor, vuelve a intentarlo. Si el problema persiste, contacta con soporte técnico indicando el código de error y la hora aproximada del intento."
  ].join("\n")
};