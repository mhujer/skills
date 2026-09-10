FROM node:24

# Install git, curl, and python3 for Claude Code (python3 needed for custom statusline)
# supervisor runs the dev server so it can be restarted without restarting the container
RUN apt-get update && apt-get install -y git curl python3 sudo supervisor && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI from the official apt repository (https://github.com/cli/cli/blob/trunk/docs/install_linux.md)
RUN mkdir -p -m 755 /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y gh && rm -rf /var/lib/apt/lists/*

# Install PostgreSQL client from the PGDG repository (https://wiki.postgresql.org/wiki/Apt)
# Debian bookworm ships an older client, and pg_dump must be >= the server
RUN mkdir -p -m 755 /etc/apt/keyrings \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /etc/apt/keyrings/pgdg.asc \
    && chmod go+r /etc/apt/keyrings/pgdg.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/pgdg.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y postgresql-client-18 && rm -rf /var/lib/apt/lists/*

# Set home for non-root user
ENV HOME=/home/node

# Container must match the app's timezone: date-only values are derived from local time
ENV TZ=Europe/Prague

# Prepare home directory for non-root execution
RUN mkdir -p /home/node/.local/bin && chown -R node:node /home/node

# Named after the project (not /app): Claude Code derives its project namespace from the
# working directory, so a generic /app would collide with every other container
ENV APP_DIR=/{{PROJECT_NAME}}
RUN mkdir -p ${APP_DIR} && chown -R node:node ${APP_DIR}
WORKDIR ${APP_DIR}

# Fix dubious ownership error from git
RUN git config --system --add safe.directory ${APP_DIR}

# Install TypeScript LSP for Claude to use
RUN npm install -g typescript-language-server typescript

# Claude installs this project's missing dependencies itself
RUN echo 'node ALL=(ALL) NOPASSWD:ALL' >/etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# Switch to non-root user for remaining operations
USER node

# Install Claude Code using native method (recommended)
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude Code to PATH
ENV PATH="/home/node/.local/bin:${PATH}"

# Add Claude Code to shell config for interactive sessions
RUN echo 'export PATH="$HOME/.local/bin:$PATH"' >> /home/node/.bashrc

# Fix Claude Code colors (https://ranang.medium.com/fixing-claude-codes-flat-or-washed-out-remote-colors-82f8143351ed)
ENV COLORTERM=truecolor

EXPOSE 3000 9001

# Default command: install deps, then hand off to supervisord (runs the dev server)
CMD ["bash", "-c", "npm install && exec supervisord -c supervisord.conf"]
