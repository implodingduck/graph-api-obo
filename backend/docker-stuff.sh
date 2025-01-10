docker build -t graph-api-obo-backend .

docker stop gaob
docker rm gaob

docker run -d --env-file .env -p 8888:80 --name gaob graph-api-obo-backend
