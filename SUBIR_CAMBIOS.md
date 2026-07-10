## Deploy (Windows → servidor)

```bash
# 1. Sincronizar código
rsync -avz --delete \
  --exclude '*/node_modules/' \
  --exclude 'pescador/user_data/' \
  -e "ssh -i ~/.ssh/ESP-ethical-phishing-ec2instance.pem" \
  /mnt/c/Users/ricar/repos/fescarcuddle/ \
  admin@securedevwarrior.com:/home/admin/fescarcaddle/

# 2. En el servidor: reconstruir y levantar
ssh -i ~/.ssh/ESP-ethical-phishing-ec2instance.pem admin@securedevwarrior.com \
  "cd /home/admin/fescarcaddle && docker compose build && docker compose up -d && docker builder prune -f"
```

El `docker builder prune -f` al final limpia la build cache (~4GB) inmediatamente tras cada deploy, antes de que se acumule.

## Bajar todo (incluyendo volúmenes huérfanos)

```bash
docker compose down
docker volume prune -f
```

## Sincronizar remoto → Windows (menos usado)

```bash
rsync -avz --delete \
  -e "ssh -i ~/.ssh/ESP-ethical-phishing-ec2instance.pem" \
  admin@securedevwarrior.com:/home/admin/fescarcaddle/ \
  /mnt/c/Users/ricar/repos/fescarcuddle/
```