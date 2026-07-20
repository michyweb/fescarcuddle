import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import config from "./config.js";

const rawEmailMode = (process.argv[2] || "inicial").toLowerCase().trim();
const validModes = new Set(["inicial", "extension"]);

if (!validModes.has(rawEmailMode)) {
  throw new Error("Modo invalido. Usa: node script.js inicial | node script.js extension");
}

const isExtensionMode = rawEmailMode === "extension";
const templatePath = new URL(isExtensionMode ? "./template-extension-24h.html" : "./template.html", import.meta.url);

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

function generateEmailToken() {
  return randomBytes(24).toString("base64url");
}

function buildInvitationLinkWithToken(baseLink, token) {
  try {
    const parsedUrl = new URL(baseLink);
    parsedUrl.searchParams.set("token", token);
    return parsedUrl.toString();
  } catch {
    const separator = baseLink.includes("?") ? "&" : "?";
    return `${baseLink}${separator}token=${encodeURIComponent(token)}`;
  }
}

const template = await readFile(templatePath, "utf8");

const trainingName = `prevención de phishing`;
const invitationLinkBase = config.invitationLink;
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString("es-ES", {
  dateStyle: "full",
  timeStyle: "short",
});
const recipientEmails = Array.isArray(config.recipientEmails) ? config.recipientEmails.filter(Boolean) : [];

if (!recipientEmails.length) {
  throw new Error("config.recipientEmails debe incluir al menos una dirección de correo.");
}

const transporter = nodemailer.createTransport({
  host: "smtp.eu.mailgun.org",
  port: 587,
  secure: false,
  auth: {
    user: "postmaster@mg.securedevwarrior.com",
    pass: "W6wneGPaph7IpRxUMG5s",
  },
});
for (const recipientEmail of recipientEmails) {
  const token = generateEmailToken();
  const invitationLink = buildInvitationLinkWithToken(invitationLinkBase, token);

  await transporter.sendMail({
    from: '"Secure Dev Warrior" <postmaster@mg.securedevwarrior.com>',
    to: recipientEmail,
    subject: isExtensionMode
      ? `Extension de acceso 24h - Secure Dev Warrior (${trainingName})`
      : `Invitación a Secure Dev Warrior: training de ${trainingName}`,
    text: isExtensionMode
      ? renderTemplate(
        `Hola,\n\nTu acceso en ${config.appName} bajo la organización ${config.organizationName} ha sido extendido 24 horas adicionales.\n\nPuedes continuar usando este enlace: {{invitationLink}}.\n\nEl nuevo vencimiento es el {{extendedExpiresAt}}.\n\nMantienes acceso al training de ${trainingName} durante ${config.trainingDuration}.\n\nSi no reconoces esta extension, puedes ignorar este mensaje.\n`,
        {
          invitationLink,
          extendedExpiresAt: expiresAt,
        },
      )
      : renderTemplate(
        `Hola,\n\nSe te ha dado de alta en ${config.appName} bajo la organización ${config.organizationName}. Podrás acceder con tu cuenta de ${config.ssoProvider}.\n\nPuedes usar el siguiente enlace para aceptar la invitación: {{invitationLink}}.\n\nLa invitación caduca en 24 horas, el {{invitationExpiresAt}}.\n\nAdemás, se te ha concedido acceso al training de ${trainingName} durante ${config.trainingDuration}.\n\nSi no has solicitado este acceso, puedes ignorar este mensaje.\n`,
        {
          invitationLink,
          invitationExpiresAt: expiresAt,
        },
      ),
    html: renderTemplate(template, {
      appName: config.appName,
      organizationName: config.organizationName,
      ssoProvider: config.ssoProvider,
      invitationLink,
      invitationExpiresAt: expiresAt,
      extendedExpiresAt: expiresAt,
      trainingDuration: config.trainingDuration,
      trainingName,
    }),
    attachments: [
      {
        filename: "iconweb.png",
        path: fileURLToPath(new URL("./iconweb.png", import.meta.url)),
        cid: "iconweb",
      },
    ],
  });
}