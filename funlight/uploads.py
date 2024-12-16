import os
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from funlight import db
from funlight.models import Message, Attachment

uploads = Blueprint('uploads', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@uploads.route('/upload', methods=['POST'])
@login_required
def upload_files():
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
        
    files = request.files.getlist('files[]')
    uploaded_files = []
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            
            # Create unique filename
            base, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(os.path.join(current_app.config['UPLOAD_FOLDER'], filename)):
                filename = f"{base}_{counter}{ext}"
                counter += 1
            
            # Save file
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Create attachment record
            attachment = Attachment(
                filename=filename,
                file_type=file.content_type
            )
            uploaded_files.append({
                'filename': filename,
                'file_type': file.content_type,
                'url': f"/uploads/{filename}"
            })
    
    return jsonify({
        'success': True,
        'files': uploaded_files
    })

@uploads.route('/uploads/<path:filename>')
@login_required
def serve_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
