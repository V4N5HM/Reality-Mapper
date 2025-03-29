from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
from .models import AnalysisRequest
from .database import db
from .worker import queue_request

api_blueprint = Blueprint('api', __name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@api_blueprint.route('/api/analysis', methods=['POST'])
def create_analysis():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400

    filename = secure_filename(file.filename)
    request_id = str(uuid.uuid4())
    saved_path = os.path.join(UPLOAD_FOLDER, f"{request_id}_{filename}")
    file.save(saved_path)

    analysis = AnalysisRequest(id=request_id, filename=saved_path)
    db.session.add(analysis)
    db.session.commit()

    queue_request(analysis)

    return jsonify({'request_id': request_id}), 202


@api_blueprint.route('/api/analysis/<request_id>', methods=['GET'])
def get_analysis_status(request_id):
    analysis = AnalysisRequest.query.get(request_id)
    if not analysis:
        return jsonify({'error': 'Not found'}), 404

    return jsonify({
        'request_id': request_id,
        'status': analysis.status,
        'result': analysis.result
    })


@api_blueprint.route('/api/analysis', methods=['GET'])
def list_analyses():
    all_requests = AnalysisRequest.query.all()
    return jsonify([
        {
            'request_id': str(req.id),
            'status': req.status,
            'result': req.result
        } for req in all_requests
    ])


@api_blueprint.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})