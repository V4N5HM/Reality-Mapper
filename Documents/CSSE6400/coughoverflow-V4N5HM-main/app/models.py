from .database import db
from datetime import datetime


class AnalysisRequest(db.Model):
    id = db.Column(db.String(64), primary_key=True)
    filename = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(20), default='queued')
    result = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)