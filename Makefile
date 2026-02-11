.PHONY: help ensure-bun install setup dev dev-mcp dev-all build build-web build-mcp typecheck \
       docker-build docker-up docker-down docker-logs \
       db-reset generate-api-key clean lint format

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Setup ──────────────────────────────────────────────

install: ensure-bun ## Install dependencies
	bun install

ensure-bun: ## Check for bun and install if missing
	@command -v bun >/dev/null 2>&1 || { \
		echo "bun not found. Installing..."; \
		curl -fsSL https://bun.sh/install | bash; \
		echo "Restart your shell or run: source ~/.$$(basename $$SHELL)rc"; \
	}

setup: install ## Full setup: install + .env + initial API key
	@test -f .env || cp .env.example .env
	@echo "Generating initial API key..."
	@bun run packages/web/src/scripts/generate-api-key.ts setup

# ── Development ────────────────────────────────────────

dev: ## Start web server (dev mode)
	bun run --filter @claude-share/web dev

dev-mcp: ## Start MCP server (dev mode)
	bun run --filter @claude-share/mcp dev

dev-all: ## Start web + MCP servers in parallel
	@make dev & make dev-mcp & wait

# ── Build ──────────────────────────────────────────────

build: ## Build all packages
	bun run --filter '*' build

build-web: ## Build web server only
	bun run --filter @claude-share/web build

build-mcp: ## Build MCP server only
	bun run --filter @claude-share/mcp build

typecheck: ## Run TypeScript type checking
	bun run --filter '*' typecheck

# ── Docker ─────────────────────────────────────────────

docker-build: ## Build Docker image
	docker compose build

docker-up: ## Start Docker containers
	docker compose up -d

docker-down: ## Stop Docker containers
	docker compose down

docker-logs: ## Follow Docker container logs
	docker compose logs -f

# ── Database ───────────────────────────────────────────

db-reset: ## Reset database (delete and recreate)
	rm -f data/sessions.db data/sessions.db-wal data/sessions.db-shm
	@echo "Database reset. It will be recreated on next server start."

generate-api-key: ## Generate a new API key
	bun run packages/web/src/scripts/generate-api-key.ts

# ── Utilities ──────────────────────────────────────────

clean: ## Remove build artifacts and dependencies
	rm -rf node_modules packages/*/node_modules packages/*/dist

lint: ## Run linter
	bunx biome check .

format: ## Format code
	bunx biome format --write .
