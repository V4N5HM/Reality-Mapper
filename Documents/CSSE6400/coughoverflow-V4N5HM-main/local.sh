docker build -t coughoverflow .
docker run --rm -p 8080:8080 -v $(pwd)/uploads:/app/uploads coughoverflow