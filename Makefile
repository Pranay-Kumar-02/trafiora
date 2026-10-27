.PHONY: help build test lint run clean migrate

help:
	@echo "Trafiora Build and Development Targets:"
	@echo "  make build    - Install dependencies and build frontend/backend"
	@echo "  make test     - Run backend unit and integration test suite"
	@echo "  make lint     - Run Ruff and ESLint linters"
	@echo "  make run-api  - Start FastAPI backend server"
	@echo "  make run-web  - Start Next.js development server"
	@echo "  make migrate  - Run Alembic database migrations"

test:
	pytest tests/backend/unit -v

lint:
	ruff check apps/api
	mypy apps/api/src

run-api:
	cd apps/api && uvicorn src.main:app --reload --port 8000

run-web:
	cd apps/web && npm run dev
