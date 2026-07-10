import { readFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import config from "./config.js";

const templatePath = new URL("./template.html", import.meta.url);

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

const template = await readFile(templatePath, "utf8");

const trainingName = `desarrollo de código seguro en ${config.trainingLanguage}`;
const invitationLink = config.invitationLink;
const invitationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString("es-ES", {
  dateStyle: "full",
  timeStyle: "short",
});
const recipients = Array.isArray(config.recipients) ? config.recipients.filter(Boolean) : [];

if (!recipients.length) {
  throw new Error("config.recipients debe incluir al menos una dirección de correo.");
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

await transporter.sendMail({
  from: '"Secure Dev Warrior" <postmaster@mg.securedevwarrior.com>',
  to: recipients,
  subject: `Invitación a Secure Dev Warrior: training de ${trainingName}`,
  text: renderTemplate(
    `Hola,\n\nSe te ha dado de alta en ${config.appName}. Podrás acceder con tu cuenta de ${config.ssoProvider}.\n\nPuedes usar el siguiente enlace para aceptar la invitación: {{invitationLink}}.\n\nLa invitación caduca en 24 horas, el {{invitationExpiresAt}}.\n\nAdemás, se te ha concedido acceso al training de ${trainingName} durante ${config.trainingDuration}.\n\nSi no has solicitado este acceso, puedes ignorar este mensaje.\n`,
    {
      invitationLink,
      invitationExpiresAt,
    },
  ),
  html: renderTemplate(template, {
    appName: config.appName,
    ssoProvider: config.ssoProvider,
    invitationLink,
    invitationExpiresAt,
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