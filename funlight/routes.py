from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from .models import User, FriendRequest, db

bp = Blueprint('routes', __name__)

@bp.route('/api/friends', methods=['GET'])
@login_required
def get_friends():
    """Get the current user's friends list"""
    friends = current_user.friends
    return jsonify({
        'friends': [{
            'id': friend.id,
            'username': friend.username,
            'avatar': friend.avatar,
            'is_online': friend.is_online
        } for friend in friends]
    })

@bp.route('/api/friends/add', methods=['POST'])
@login_required
def add_friend():
    """Send a friend request to another user"""
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    if user == current_user:
        return jsonify({'error': 'You cannot add yourself as a friend'}), 400
        
    if user in current_user.friends:
        return jsonify({'error': 'User is already your friend'}), 400
        
    # Check if there's already a pending request
    existing_request = FriendRequest.query.filter(
        ((FriendRequest.sender == current_user) & (FriendRequest.receiver == user)) |
        ((FriendRequest.sender == user) & (FriendRequest.receiver == current_user))
    ).first()
    
    if existing_request:
        return jsonify({'error': 'Friend request already exists'}), 400
        
    friend_request = FriendRequest(sender=current_user, receiver=user)
    db.session.add(friend_request)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Friend request sent'})

@bp.route('/api/friends/requests', methods=['GET'])
@login_required
def get_friend_requests():
    """Get pending friend requests for the current user"""
    pending_requests = FriendRequest.query.filter_by(receiver=current_user, status='pending').all()
    return jsonify({
        'requests': [{
            'id': request.id,
            'sender': {
                'id': request.sender.id,
                'username': request.sender.username,
                'avatar': request.sender.avatar
            },
            'created_at': request.created_at.isoformat()
        } for request in pending_requests]
    })

@bp.route('/api/friends/requests/<int:request_id>', methods=['POST'])
@login_required
def handle_friend_request(request_id):
    """Accept or reject a friend request"""
    data = request.get_json()
    action = data.get('action')
    
    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action'}), 400
        
    friend_request = FriendRequest.query.get_or_404(request_id)
    
    if friend_request.receiver != current_user:
        return jsonify({'error': 'Unauthorized'}), 403
        
    if action == 'accept':
        current_user.friends.append(friend_request.sender)
        friend_request.sender.friends.append(current_user)
        db.session.delete(friend_request)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Friend request accepted'})
    else:
        db.session.delete(friend_request)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Friend request rejected'})

@bp.route('/api/friends/<int:friend_id>', methods=['DELETE'])
@login_required
def remove_friend(friend_id):
    """Remove a friend"""
    friend = User.query.get_or_404(friend_id)
    
    if friend not in current_user.friends:
        return jsonify({'error': 'User is not your friend'}), 400
        
    current_user.friends.remove(friend)
    friend.friends.remove(current_user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Friend removed'})
