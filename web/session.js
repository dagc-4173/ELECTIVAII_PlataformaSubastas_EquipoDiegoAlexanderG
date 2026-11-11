import { setupAuctions } from "./auctions.js";

const tokenKey = "subastas.accessToken";
const login = document.querySelector("#login");
const profile = document.querySelector("#profile");
const form = document.querySelector("#login-form");
const submit = document.querySelector("#submit");
const password = document.querySelector("#password");
const status = document.querySelector("#status");
const retry = document.querySelector("#retry");
const registration = document.querySelector("#registration");
const registrationForm = document.querySelector("#registration-form");
const registerSubmit = document.querySelector("#register-submit");
const openRegistration = document.querySelector("#open-registration");
const backToLogin = document.querySelector("#back-to-login");

class ApiError extends Error {
  constructor(statusCode, details) {
    super(`HTTP ${statusCode}`);
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request(path, options) {
  const response = await fetch(path, { cache: "no-store", ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.error);
  }
  return response.json();
}

function showLogin(message = "", focus = false) {
  auctions.close();
  registration.hidden = true;
  profile.hidden = true;
  document.querySelector("#profile-name").textContent = "";
  login.hidden = false;
  status.textContent = message;
  if (focus) document.querySelector("#login-heading").focus();
}

async function showProfile(token) {
  const user = await request("/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  document.querySelector("#profile-name").textContent = user.name;
  login.hidden = true;
  profile.hidden = false;
  status.textContent = "";
  document.querySelector("#profile-heading").focus();
}

async function restoreSession() {
  retry.hidden = true;
  const token = sessionStorage.getItem(tokenKey);
  if (!token) {
    showLogin();
    return;
  }
  status.textContent = "Comprobando sesión…";

  try {
    await showProfile(token);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      sessionStorage.removeItem(tokenKey);
      showLogin("Tu sesión venció o dejó de ser válida. Inicia sesión de nuevo.", true);
      return;
    }
    status.textContent = "No pudimos comprobar tu sesión. Vuelve a intentarlo.";
    retry.hidden = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  openRegistration.disabled = true;
  status.textContent = "Iniciando sesión…";
  const fields = new FormData(form);
  let token;

  try {
    const result = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }),
    });
    token = result.accessToken;
    await showProfile(token);
    sessionStorage.setItem(tokenKey, token);
    form.reset();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      status.textContent = token
        ? "La sesión dejó de ser válida. Inicia sesión de nuevo."
        : "El correo electrónico o la contraseña son incorrectos.";
      password.value = "";
      password.focus();
    } else {
      status.textContent = "No pudimos iniciar sesión. Vuelve a intentarlo.";
    }
  } finally {
    submit.disabled = false;
    openRegistration.disabled = false;
  }
});

openRegistration.addEventListener("click", () => {
  password.value = "";
  login.hidden = true;
  registration.hidden = false;
  status.textContent = "";
  document.querySelector("#registration-heading").focus();
});

backToLogin.addEventListener("click", () => {
  registrationForm.reset();
  showLogin("", true);
});

registrationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = new FormData(registrationForm);
  const name = fields.get("name").trim();
  const email = fields.get("email").trim();
  const newPassword = fields.get("password");

  if (!name || !newPassword.trim()) {
    status.textContent = !name ? "Escribe tu nombre." : "Escribe una contraseña que no esté vacía.";
    registrationForm.elements.namedItem(!name ? "name" : "password").focus();
    return;
  }

  registerSubmit.disabled = true;
  backToLogin.disabled = true;
  status.textContent = "Creando cuenta…";

  try {
    await request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: crypto.randomUUID(), name, email, password: newPassword }),
    });
    registrationForm.reset();
    form.elements.namedItem("email").value = email;
    showLogin("Tu cuenta está lista. Inicia sesión con tu contraseña.", true);
  } catch (error) {
    if (error instanceof ApiError && error.details?.message === "Email is already registered") {
      status.textContent = "Ya existe una cuenta con ese correo. Usa otro o inicia sesión.";
      registrationForm.elements.namedItem("email").focus();
    } else if (error instanceof ApiError && error.statusCode === 400) {
      status.textContent = "Revisa el nombre, el correo electrónico y la contraseña.";
    } else {
      status.textContent = "No pudimos crear la cuenta. Vuelve a intentarlo.";
    }
  } finally {
    registerSubmit.disabled = false;
    backToLogin.disabled = false;
  }
});

retry.addEventListener("click", restoreSession);

const auctions = setupAuctions(request, () => {
  sessionStorage.removeItem(tokenKey);
  showLogin("Tu sesión venció o dejó de ser válida. Inicia sesión de nuevo.", true);
});

document.querySelector("#open-auctions").addEventListener("click", () => {
  profile.hidden = true;
  auctions.open(sessionStorage.getItem(tokenKey));
});

document.querySelector("#back-to-profile").addEventListener("click", () => {
  auctions.close();
  profile.hidden = false;
  document.querySelector("#profile-heading").focus();
});

document.querySelector("#logout").addEventListener("click", () => {
  sessionStorage.removeItem(tokenKey);
  showLogin("Sesión cerrada.", true);
});

await restoreSession();
