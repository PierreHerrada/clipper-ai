---
name: deploy
description: Build and restart the Docker stack. Use when the user asks to deploy, rebuild, or restart Docker.
disable-model-invocation: true
allowed-tools: Bash, Read
---

Rebuild and restart the Corsair Docker stack.

## Steps

1. Run tests first to make sure nothing is broken:
   ```bash
   cd /Users/pierreherrada/clipper-ai/backend && python3 -m pytest tests/ -x -q
   cd /Users/pierreherrada/clipper-ai/frontend && npm test -- --run
   ```

2. If tests pass, rebuild and restart:
   ```bash
   cd /Users/pierreherrada/clipper-ai && docker-compose up --build -d
   ```

3. Verify the container is running:
   ```bash
   docker-compose ps
   ```

4. Report the result: container status and any errors.

If tests fail, do NOT deploy. Report the failures instead.
