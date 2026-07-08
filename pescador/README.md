# FescarCuddle

FescarCuddle is an internal browser relay and debugging platform for authorized support, QA, and controlled access to private web applications.

## Purpose

This project is intended for:
- Internal troubleshooting of web sessions.
- QA validation of input forwarding (keyboard, mouse, and clipboard events).
- Reproducing authentication/session bugs in controlled environments.
- Authorized remote support workflows with explicit operator oversight.

## Authorized Use Only

Use this software only when all of the following are true:
- You own the environment, or you have written permission from the owner.
- Access is restricted to approved operators.
- Session handling complies with your organization security policy.
- User consent and legal requirements are satisfied.

## Prohibited Use

Do not use this software for:
- Unauthorized account access.
- Credential theft, session hijacking, or covert monitoring.
- Any operation that violates laws, contracts, or policy.

## Security Guardrails

Minimum controls recommended before deployment:
- Put the service behind a trusted reverse proxy.
- Restrict admin access by network policy and strong authentication.
- Rotate secrets regularly and avoid default credentials.
- Enable audit logging for all operator actions.
- Use separate non-production environments for debugging and replay tests.

## Project Components

- `index.js`: Fastify server, websocket routing, browser lifecycle, CDP screencast, admin actions.
- `pinpo.html`: Client-side relay view, CDP frame rendering, and input forwarding.
- `admin.html`: Operator dashboard for approved debugging actions.
- `zteler.js`: Session replay helper for QA/debugging.
- `Ztelererjs_extension/`: Browser extension used for controlled storage diagnostics.

## Development Notes

This repository may include legacy names from early prototypes. Current intent is internal debugging and authorized operations only.

## Disclaimer

The maintainers do not endorse misuse. You are responsible for lawful and policy-compliant operation in your environment.
