from app import create_app
from app.worker import start_worker

app = create_app()

if __name__ == '__main__':
    start_worker(app)
    app.run(host='0.0.0.0', port=8080)
