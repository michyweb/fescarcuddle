# MongoDB Integration Guide

## Architecture

- **MongoDB** stores all target configurations
- **add_target.js** creates/updates targets in MongoDB
- **index.js** reads targets from MongoDB on startup
- **Persistent volumes** store favicons in `user_data/favicons/`

## Quick Start

### 1. First Time Setup

```bash
cd ~/fescarcuddle

# Pull latest code
git pull origin main

# Create .env.local (optional - defaults work fine)
cat > .env.local << 'EOF'
# Optional - MongoDB URL (default: mongodb://mongodb:27017/fescarcuddle)
# MONGO_URL=mongodb://mongodb:27017/fescarcuddle

# Optional - Target name to use on startup (default: "default")
# TARGET_NAME=my_target
EOF

# Start all services including MongoDB
docker-compose up -d
docker-compose logs -f mongodb  # Wait for "waiting for connections"
docker-compose logs -f pescador # Should show "No targets found in database"
```

### 2. Add Your First Target

```bash
# Add a target from the server
docker-compose run \
  -e TARGET_URL="https://example.com/login" \
  -e TARGET_LANGUAGE="es-419,es;q=0.9,en;q=0.8" \
  pescador

# Logs will show:
# [ADD_TARGET] MongoDB connected
# [ADD_TARGET] Saved target 'example' to MongoDB
# [ADD_TARGET] Done
```

### 3. Start the Server

```bash
# If pescador exited due to "no targets found", restart it:
docker-compose restart pescador
docker-compose logs -f pescador

# Should show:
# [STARTUP] Initializing browser with target: example
```

## Usage Examples

### Add Multiple Targets

```bash
# Target 1
docker-compose run -e TARGET_URL="https://bank.com/login" pescador

# Target 2
docker-compose run -e TARGET_URL="https://ecommerce.com/signin" pescador

# Now restart pescador to use first target
docker-compose restart pescador
```

### Use Specific Target

```bash
# Set which target to use
docker-compose exec -e TARGET_NAME=ecommerce pescador bash
# Or restart with env:
docker-compose down
TARGET_NAME=ecommerce docker-compose up -d
```

### View MongoDB Targets

```bash
# Connect to MongoDB CLI
docker-compose exec mongodb mongosh fescarcuddle

# List all targets
db.targets.find()

# Find specific target
db.targets.findOne({name: "example"})

# Delete target
db.targets.deleteOne({name: "example"})
```

## Data Storage

- **Targets metadata**: MongoDB (`fescarcuddle` database)
- **Favicons**: `/app/user_data/favicons/` (persists in `pescador_data` volume)
- **Logs**: Docker logs accessible via `docker-compose logs`

## Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### No Targets Found
```bash
# Add a target first
docker-compose run -e TARGET_URL="https://example.com/login" pescador
```

### Target Not Updating on Restart
```bash
# Make sure MongoDB is running and connected
docker-compose logs -f mongodb

# Check existing targets
docker-compose exec mongodb mongosh fescarcuddle -c 'db.targets.find()'
```
