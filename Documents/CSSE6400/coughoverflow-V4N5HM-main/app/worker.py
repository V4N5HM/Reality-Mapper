import threading
import queue
import subprocess
from flask import current_app
from .database import db
from .models import AnalysisRequest

request_queue = queue.Queue()


def queue_request(analysis):
    print(f"[QUEUE] Putting request {analysis.id} into queue")
    request_queue.put(analysis)


def process_requests(app):
    with app.app_context():
        print("[WORKER] Background worker started.")
        while True:
            print("[WORKER] Waiting for next request...")
            original = request_queue.get()
            analysis = AnalysisRequest.query.get(original.id)

            print(f"[WORKER] Got request from queue: {analysis.id}")
            try:
                analysis.status = 'processing'
                db.session.commit()
                print(f"[WORKER] Processing file: {analysis.filename}")

                result = subprocess.run(
                    ['./overflowengine-arm64', analysis.filename],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )

                print(f"[WORKER] Subprocess STDOUT: {result.stdout}")
                print(f"[WORKER] Subprocess STDERR: {result.stderr}")
                print(f"[WORKER] Subprocess return code: {result.returncode}")

                if result.returncode == 0:
                    analysis.status = 'completed'
                    analysis.result = result.stdout.strip()
                else:
                    analysis.status = 'error'
                    analysis.result = result.stderr.strip()

            except Exception as e:
                analysis.status = 'error'
                analysis.result = f"[Exception] {str(e)}"

            db.session.commit()
            request_queue.task_done()


def start_worker(app):
    print("[WORKER] Starting worker thread...")
    threading.Thread(target=process_requests, args=(app,), daemon=True).start()

