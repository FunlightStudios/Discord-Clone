from flask import Blueprint
from flask_login import login_required, current_user
from flask_socketio import emit, join_room, leave_room
from funlight import socketio, db
from funlight.models import Channel, User

voice_video = Blueprint('voice_video', __name__)

# Dictionary to keep track of users in voice/video rooms
voice_rooms = {}
video_rooms = {}

@socketio.on('join_voice')
@login_required
def handle_join_voice(data):
    channel_id = data.get('channelId')
    if not channel_id:
        return
        
    # Add user to voice room
    if channel_id not in voice_rooms:
        voice_rooms[channel_id] = set()
    voice_rooms[channel_id].add(current_user.id)
    
    # Join socket room
    join_room(f'voice_{channel_id}')
    
    # Notify other users in the room
    emit('user_joined_voice', {
        'userId': current_user.id,
        'username': current_user.username
    }, room=f'voice_{channel_id}')
    
    # Send list of users already in the room
    emit('voice_users', {
        'users': list(voice_rooms[channel_id])
    }, room=f'voice_{channel_id}')

@socketio.on('leave_voice')
@login_required
def handle_leave_voice(data):
    channel_id = data.get('channelId')
    if not channel_id or channel_id not in voice_rooms:
        return
        
    # Remove user from voice room
    voice_rooms[channel_id].discard(current_user.id)
    if not voice_rooms[channel_id]:
        del voice_rooms[channel_id]
        
    # Leave socket room
    leave_room(f'voice_{channel_id}')
    
    # Notify other users
    emit('user_left_voice', {
        'userId': current_user.id
    }, room=f'voice_{channel_id}')

@socketio.on('join_video')
@login_required
def handle_join_video(data):
    room_id = data.get('roomId')
    if not room_id:
        return
        
    # Add user to video room
    if room_id not in video_rooms:
        video_rooms[room_id] = set()
    video_rooms[room_id].add(current_user.id)
    
    # Join socket room
    join_room(f'video_{room_id}')
    
    # Notify other users in the room
    emit('user_joined_video', {
        'userId': current_user.id,
        'username': current_user.username
    }, room=f'video_{room_id}')
    
    # Send list of users already in the room
    emit('video_users', {
        'users': list(video_rooms[room_id])
    }, room=f'video_{room_id}')

@socketio.on('leave_video')
@login_required
def handle_leave_video(data):
    room_id = data.get('roomId')
    if not room_id or room_id not in video_rooms:
        return
        
    # Remove user from video room
    video_rooms[room_id].discard(current_user.id)
    if not video_rooms[room_id]:
        del video_rooms[room_id]
        
    # Leave socket room
    leave_room(f'video_{room_id}')
    
    # Notify other users
    emit('user_left_video', {
        'userId': current_user.id
    }, room=f'video_{room_id}')

@socketio.on('call_user')
@login_required
def handle_call_user(data):
    to_user = data.get('to')
    offer = data.get('offer')
    
    emit('call_user', {
        'offer': offer,
        'from': current_user.id
    }, room=to_user)

@socketio.on('call_accepted')
@login_required
def handle_call_accepted(data):
    to_user = data.get('to')
    answer = data.get('answer')
    
    emit('call_accepted', {
        'answer': answer,
        'from': current_user.id
    }, room=to_user)

@socketio.on('ice_candidate')
@login_required
def handle_ice_candidate(data):
    to_user = data.get('to')
    candidate = data.get('candidate')
    
    emit('ice_candidate', {
        'candidate': candidate,
        'from': current_user.id
    }, room=to_user)

@socketio.on('end_call')
@login_required
def handle_end_call(data):
    to_user = data.get('to')
    
    emit('call_ended', {
        'from': current_user.id
    }, room=to_user)
