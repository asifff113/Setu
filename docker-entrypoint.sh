#!/bin/sh
# Runs as root (the image's default user) so it can fix ownership on a
# freshly-mounted, root-owned volume (Fly/Render disks come up owned by
# root:root regardless of what the image itself contains at that path), then
# drops to the unprivileged `node` user via setpriv's exec — replacing this
# process rather than forking one, so the relay still ends up as PID 1 and
# receives SIGTERM/SIGINT directly for its graceful-shutdown handling.
set -e

if [ -n "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
  chown -R node:node "$DATA_DIR" 2>/dev/null || true
fi

exec setpriv --reuid=node --regid=node --clear-groups "$@"
