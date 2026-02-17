.PHONY: format lint type-check security-check test check-all

PY = python

format:
	cd backend && $(PY) -m black .

lint:
	cd backend && $(PY) -m ruff check .

type-check:
	cd backend && $(PY) -m mypy .

security-check:
	cd backend && $(PY) -X utf8 -m bandit -ll -c bandit.yml -r .

test:
	cd backend && $(PY) -m pytest

check-all: format lint type-check security-check test

