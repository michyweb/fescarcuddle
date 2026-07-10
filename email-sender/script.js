import { readFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";

const templatePath = new URL("./template.html", import.meta.url);

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

const template = await readFile(templatePath, "utf8");

const invitationLink = "https://securedevwarrior.com/invitacion?token=2134hhJHD3KJH234jkhhd3h22h=";
const invitationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString("es-ES", {
  dateStyle: "full",
  timeStyle: "short",
});

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
  to: "enrique@masosl.com",
  subject: "Invitación a Secure Dev Warrior: training de PHP",
  text: renderTemplate(
    `Hola,\n\nSe te ha dado de alta en Secure Dev Warrior. Podrás acceder con tu cuenta de GitHub.\n\nPuedes usar el siguiente enlace para aceptar la invitación: {{invitationLink}}.\n\nLa invitación caduca en 24 horas, el {{invitationExpiresAt}}.\n\nAdemás, se te ha concedido acceso al training de desarrollo seguro en PHP durante 3 meses.\n\nSi no has solicitado este acceso, puedes ignorar este mensaje.\n`,
    {
      invitationLink,
      invitationExpiresAt,
    },
  ),
  html: renderTemplate(template, {
    appName: "Secure Dev Warrior",
    invitationLink,
    invitationExpiresAt,
    trainingDuration: "3 meses",
    trainingName: "desarrollo seguro en PHP",
  }),
  attachments: [
    {
      filename: "iconweb.png",
      path: fileURLToPath(new URL("./iconweb.png", import.meta.url)),
      cid: "iconweb",
    },
  ],
});