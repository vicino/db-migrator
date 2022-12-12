psql-local:
	docker-compose exec postgres psql -U postgres

docker-reset:
	docker-compose down
	docker-compose up -d