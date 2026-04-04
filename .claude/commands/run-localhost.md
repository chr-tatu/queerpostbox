Start a Jekyll dev server for the current worktree on the first available port.

1. Determine the worktree name:
   - Run `git rev-parse --show-toplevel` to get the repo root
   - If in a worktree (path contains `.claude/worktrees/`), the name is the last directory segment (e.g., `listen-button`)
   - If in the main repo, the name is `main`

2. Find the first available port starting from 4000:
   ```
   for port in $(seq 4000 4099); do
     if ! lsof -i:$port -sTCP:LISTEN >/dev/null 2>&1; then
       echo $port
       break
     fi
   done
   ```
   Do NOT kill any existing processes on occupied ports — just skip to the next one.

3. Start Jekyll in the background from the current worktree directory:
   ```
   cd <worktree-path> && /opt/homebrew/opt/ruby/bin/bundle exec jekyll serve --port <port> &
   ```
   Wait a few seconds, then verify the server is responding with curl.

4. Output the result:
   ```
   <name> (:<port>) → http://localhost:<port>/
   ```

5. Rename this Claude session to include the port by running:
   ```
   /rename <name> (:<port>)
   ```
   For example: `/rename listen-button (:4003)`
