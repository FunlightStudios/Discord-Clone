from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash, current_app
from flask_login import login_required, current_user
from funlight import socketio, db
from funlight.models import Server, Channel, Message, User, ServerMember, Role, Category, FriendAssociation
from flask_socketio import emit, join_room, leave_room
from werkzeug.utils import secure_filename
import os
import time
import uuid
from datetime import datetime

main = Blueprint('main', __name__)

@main.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('index.html')

@main.route('/dashboard')
@login_required
def dashboard():
    # Get user's servers
    servers = Server.query.join(ServerMember).filter(ServerMember.user_id == current_user.id).all()
    
    # Get user's friends
    friends = []
    friend_associations = FriendAssociation.query.filter(
        (
            ((FriendAssociation.user1_id == current_user.id) | 
             (FriendAssociation.user2_id == current_user.id)) &
            (FriendAssociation.status == 'accepted')
        )
    ).all()
    
    for assoc in friend_associations:
        friend = assoc.user2 if assoc.user1_id == current_user.id else assoc.user1
        friends.append(friend)
    
    return render_template('dashboard.html', 
                         servers=servers,
                         friends=friends)

@main.route('/server/<int:server_id>')
@login_required
def server(server_id):
    # Get current server
    current_server = Server.query.get_or_404(server_id)
    
    # Check if user is member of the server
    is_member = ServerMember.query.filter_by(
        user_id=current_user.id,
        server_id=server_id
    ).first()
    
    if not is_member and current_server.owner_id != current_user.id:
        flash('You are not a member of this server')
        return redirect(url_for('main.dashboard'))
    
    # Get user's servers for the sidebar
    servers = Server.query.join(ServerMember).filter(
        ServerMember.user_id == current_user.id
    ).all()
    
    # Get server's categories and channels
    categories = Category.query.filter_by(server_id=server_id).order_by(Category.position).all()
    
    # Get the current channel (default to first channel if none specified)
    channel_id = request.args.get('channel_id', type=int)
    current_channel = None
    
    if channel_id:
        current_channel = Channel.query.get(channel_id)
    else:
        # Default to first text channel
        current_channel = Channel.query.filter_by(server_id=server_id, type='text').first()
    
    # Get server members
    members = User.query.join(ServerMember).filter(
        ServerMember.server_id == server_id
    ).all()
    
    return render_template('server.html',
        current_server=current_server,
        current_channel=current_channel,
        servers=servers,
        categories=categories,
        members=members
    )

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@main.route('/api/servers', methods=['POST'])
@login_required
def create_server():
    try:
        if 'name' not in request.form:
            return jsonify({'error': 'Server name is required'}), 400

        server_name = request.form['name']
        template = request.form.get('template', 'custom')
        
        # Handle server icon upload
        icon_path = None
        if 'icon' in request.files:
            icon = request.files['icon']
            if icon and icon.filename:
                filename = secure_filename(icon.filename)
                icon_path = f'server_icons/{uuid.uuid4()}_{filename}'
                os.makedirs(os.path.join(current_app.static_folder, 'server_icons'), exist_ok=True)
                icon.save(os.path.join(current_app.static_folder, icon_path))

        # Create server in database
        server = Server(
            name=server_name,
            owner_id=current_user.id,
            icon=icon_path,
            template=template
        )
        db.session.add(server)
        db.session.flush()

        # Create default categories
        text_category = Category(name="TEXTKANÄLE", server_id=server.id)
        voice_category = Category(name="SPRACHKANÄLE", server_id=server.id)
        db.session.add(text_category)
        db.session.add(voice_category)
        db.session.flush()

        # Create default channels
        text_channel = Channel(
            name="allgemein",
            server_id=server.id,
            category_id=text_category.id,
            type="text"
        )
        voice_channel = Channel(
            name="Allgemein",
            server_id=server.id,
            category_id=voice_category.id,
            type="voice"
        )
        db.session.add(text_channel)
        db.session.add(voice_channel)

        # Add owner as member with admin role
        member = ServerMember(
            user_id=current_user.id,
            server_id=server.id,
            role='admin'
        )
        db.session.add(member)
        
        try:
            db.session.commit()
            return jsonify({
                'id': server.id,
                'name': server.name,
                'icon': icon_path,
                'owner_id': server.owner_id
            }), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error during commit: {str(e)}")
            return jsonify({'error': f'Database error: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Error creating server: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@main.route('/api/servers/<int:server_id>', methods=['GET'])
@login_required
def get_server(server_id):
    try:
        server = Server.query.get_or_404(server_id)
        member = ServerMember.query.filter_by(
            user_id=current_user.id,
            server_id=server_id
        ).first()
        
        if not member:
            return jsonify({'error': 'Not a member of this server'}), 403
        
        channels = Channel.query.filter_by(server_id=server_id).all()
        members = ServerMember.query.filter_by(server_id=server_id).all()
        
        return jsonify({
            'id': server.id,
            'name': server.name,
            'description': server.description,
            'icon': server.icon,
            'channels': [{
                'id': channel.id,
                'name': channel.name,
                'type': channel.type
            } for channel in channels],
            'members': [{
                'id': member.user.id,
                'username': member.nickname or member.user.username,
                'avatar': member.user.avatar,
                'status': 'online' if member.user.is_online else 'offline',
                'roles': [{
                    'id': role.id,
                    'name': role.name,
                    'color': role.color
                } for role in member.roles]
            } for member in members]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/api/servers/<int:server_id>', methods=['PUT'])
@login_required
def update_server(server_id):
    server = Server.query.get_or_404(server_id)
    
    # Check if user has permission to update server
    if server.owner_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        # Update server name and description
        server.name = request.form.get('name', server.name)
        server.description = request.form.get('description', server.description)
        
        # Handle icon upload
        if 'icon' in request.files:
            icon = request.files['icon']
            if icon and allowed_file(icon.filename):
                filename = secure_filename(icon.filename)
                icon_path = os.path.join('uploads', 'server_icons', filename)
                icon.save(os.path.join(current_app.root_path, 'static', icon_path))
                server.icon = icon_path
        
        db.session.commit()
        return jsonify({'message': 'Server updated successfully'})
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating server: {str(e)}")
        return jsonify({'message': 'Failed to update server'}), 500

@main.route('/api/servers/<int:server_id>', methods=['DELETE'])
@login_required
def delete_server(server_id):
    server = Server.query.get_or_404(server_id)
    
    # Check if user has permission to delete server
    if server.owner_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        # Delete server icon if it exists
        if server.icon:
            icon_path = os.path.join(current_app.root_path, 'static', server.icon)
            if os.path.exists(icon_path):
                os.remove(icon_path)
        
        # Delete the server (this will cascade delete categories and channels)
        db.session.delete(server)
        db.session.commit()
        
        return jsonify({'message': 'Server deleted successfully'})
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting server: {str(e)}")
        return jsonify({'message': 'Failed to delete server'}), 500

@main.route('/api/servers/<int:server_id>/channels', methods=['POST'])
@login_required
def create_channel(server_id):
    server = Server.query.get_or_404(server_id)
    
    # Check if user has permission to create channels
    member = ServerMember.query.filter_by(
        user_id=current_user.id,
        server_id=server_id
    ).first()
    
    if not member and server.owner_id != current_user.id:
        return jsonify({'error': 'Not authorized'}), 403
    
    data = request.get_json()
    
    # Validate channel name
    if not data.get('name'):
        return jsonify({'error': 'Channel name is required'}), 400
        
    # Create new channel
    channel = Channel(
        name=data['name'],
        type=data.get('type', 'text'),
        topic=data.get('topic', ''),
        server_id=server_id,
        private=data.get('private', False)
    )
    
    db.session.add(channel)
    db.session.commit()
    
    return jsonify({
        'id': channel.id,
        'name': channel.name,
        'type': channel.type,
        'topic': channel.topic,
        'private': channel.private
    }), 201

@main.route('/server/<int:server_id>/members')
@login_required
def get_server_members(server_id):
    server = Server.query.get_or_404(server_id)
    member = ServerMember.query.filter_by(
        user_id=current_user.id,
        server_id=server_id
    ).first()
    
    if not member:
        return jsonify({'error': 'Not a member of this server'}), 403
    
    members = ServerMember.query.filter_by(server_id=server_id).all()
    return jsonify({
        'members': [{
            'id': m.id,
            'user': {
                'id': m.user_id,
                'username': User.query.get(m.user_id).username,
                'avatar': User.query.get(m.user_id).avatar
            },
            'nickname': m.nickname,
            'roles': [{
                'id': role.id,
                'name': role.name,
                'color': role.color
            } for role in m.roles]
        } for m in members]
    })

@main.route('/server/<int:server_id>/join', methods=['POST'])
@login_required
def join_server(server_id):
    server = Server.query.get_or_404(server_id)
    
    # Check if already a member
    existing_member = ServerMember.query.filter_by(
        user_id=current_user.id,
        server_id=server_id
    ).first()
    
    if existing_member:
        return jsonify({'error': 'Already a member of this server'}), 400
    
    # Add as new member
    member = ServerMember(
        user_id=current_user.id,
        server_id=server_id
    )
    
    try:
        db.session.add(member)
        db.session.commit()
        return jsonify({'message': 'Joined server successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main.route('/api/servers/<int:server_id>/categories', methods=['POST'])
@login_required
def create_category():
    try:
        server_id = request.form.get('server_id')
        name = request.form.get('name')
        position = request.form.get('position', 0)
        
        if not name:
            return jsonify({'error': 'Category name is required'}), 400
            
        # Check permissions
        member = ServerMember.query.filter_by(
            user_id=current_user.id,
            server_id=server_id
        ).first()
        
        if not member or not any(role.permissions & 0x10 for role in member.roles):  # MANAGE_CHANNELS permission
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        category = Category(
            name=name,
            server_id=server_id,
            position=position
        )
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'id': category.id,
            'name': category.name,
            'position': category.position
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main.route('/api/servers/<int:server_id>/roles', methods=['POST'])
@login_required
def create_role():
    try:
        server_id = request.form.get('server_id')
        name = request.form.get('name')
        color = request.form.get('color', '#99AAB5')
        permissions = request.form.get('permissions', 0)
        
        if not name:
            return jsonify({'error': 'Role name is required'}), 400
            
        # Check permissions
        member = ServerMember.query.filter_by(
            user_id=current_user.id,
            server_id=server_id
        ).first()
        
        if not member or not any(role.permissions & 0x8 for role in member.roles):  # MANAGE_ROLES permission
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        role = Role(
            name=name,
            server_id=server_id,
            color=color,
            permissions=permissions
        )
        db.session.add(role)
        db.session.commit()
        
        return jsonify({
            'id': role.id,
            'name': role.name,
            'color': role.color,
            'permissions': role.permissions
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main.route('/api/servers/<int:server_id>/members/<int:user_id>/roles', methods=['POST'])
@login_required
def assign_role():
    try:
        server_id = request.form.get('server_id')
        user_id = request.form.get('user_id')
        role_id = request.form.get('role_id')
        
        # Check permissions
        member = ServerMember.query.filter_by(
            user_id=current_user.id,
            server_id=server_id
        ).first()
        
        if not member or not any(role.permissions & 0x8 for role in member.roles):  # MANAGE_ROLES permission
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        target_member = ServerMember.query.filter_by(
            user_id=user_id,
            server_id=server_id
        ).first()
        
        if not target_member:
            return jsonify({'error': 'Member not found'}), 404
            
        role = Role.query.get(role_id)
        if not role or role.server_id != server_id:
            return jsonify({'error': 'Role not found'}), 404
            
        target_member.roles.append(role)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Role assigned successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        join_room(f'user_{current_user.id}')
        current_user.status = 'online'
        db.session.commit()
        emit('user_status_changed', 
             {'user_id': current_user.id, 'status': 'online'}, 
             broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        current_user.status = 'offline'
        db.session.commit()
        emit('user_status_changed', 
             {'user_id': current_user.id, 'status': 'offline'}, 
             broadcast=True)

@socketio.on('join_server')
def on_join(data):
    if current_user.is_authenticated:
        server_id = data.get('server_id')
        if server_id:
            join_room(f'server_{server_id}')
            emit('joined_server', {'server_id': server_id}, room=request.sid)

@socketio.on('leave_server')
def on_leave(data):
    if current_user.is_authenticated:
        server_id = data.get('server_id')
        if server_id:
            leave_room(f'server_{server_id}')
            emit('left_server', {'server_id': server_id}, room=request.sid)

@socketio.on_error()
def error_handler(e):
    print('SocketIO error:', str(e))
    emit('error', str(e), room=request.sid)

@socketio.on('message')
def handle_message(data):
    try:
        if not current_user.is_authenticated:
            emit('error', 'Not authenticated', room=request.sid)
            return
            
        channel_id = data.get('channel_id')
        content = data.get('content')
        
        if not channel_id:
            emit('error', 'Channel ID is required', room=request.sid)
            return
            
        if not content:
            emit('error', 'Message content is required', room=request.sid)
            return
        
        # Verify channel exists and user has access
        channel = Channel.query.get(channel_id)
        if not channel:
            emit('error', 'Channel not found', room=request.sid)
            return
            
        server_member = ServerMember.query.filter_by(
            user_id=current_user.id,
            server_id=channel.server_id
        ).first()
        
        if not server_member:
            emit('error', 'Not a member of this server', room=request.sid)
            return
        
        message = Message(
            content=content,
            channel_id=channel_id,
            user_id=current_user.id
        )
        db.session.add(message)
        db.session.commit()
        
        emit('new_message', {
            'message_id': message.id,
            'content': message.content,
            'user_id': message.user_id,
            'username': current_user.username,
            'avatar_url': current_user.avatar_url,
            'created_at': message.created_at.isoformat()
        }, room=f'channel_{channel_id}')
        
    except Exception as e:
        print('Error handling message:', str(e))
        db.session.rollback()
        emit('error', 'Error sending message', room=request.sid)
