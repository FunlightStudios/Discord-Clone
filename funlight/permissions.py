from enum import Flag, auto
from functools import wraps
from flask import abort
from flask_login import current_user

class Permissions(Flag):
    # Basis-Berechtigungen
    VIEW_CHANNEL = auto()
    SEND_MESSAGES = auto()
    EMBED_LINKS = auto()
    ATTACH_FILES = auto()
    READ_MESSAGE_HISTORY = auto()
    
    # Voice-Berechtigungen
    CONNECT = auto()
    SPEAK = auto()
    VIDEO = auto()
    USE_VOICE_ACTIVITY = auto()
    PRIORITY_SPEAKER = auto()
    
    # Moderations-Berechtigungen
    KICK_MEMBERS = auto()
    BAN_MEMBERS = auto()
    MANAGE_MESSAGES = auto()
    MANAGE_CHANNELS = auto()
    
    # Admin-Berechtigungen
    ADMINISTRATOR = auto()
    MANAGE_ROLES = auto()
    MANAGE_SERVER = auto()
    
    @classmethod
    def default_everyone_permissions(cls):
        return (cls.VIEW_CHANNEL | cls.SEND_MESSAGES | cls.EMBED_LINKS |
                cls.ATTACH_FILES | cls.READ_MESSAGE_HISTORY | cls.CONNECT |
                cls.SPEAK | cls.VIDEO | cls.USE_VOICE_ACTIVITY)
    
    @classmethod
    def default_mod_permissions(cls):
        return (cls.default_everyone_permissions() | cls.KICK_MEMBERS |
                cls.BAN_MEMBERS | cls.MANAGE_MESSAGES | cls.MANAGE_CHANNELS)
    
    @classmethod
    def all_permissions(cls):
        result = cls(0)
        for permission in cls:
            result |= permission
        return result

def has_permission(permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                abort(401)
            
            server_id = kwargs.get('server_id')
            channel_id = kwargs.get('channel_id')
            
            if not server_id and not channel_id:
                abort(400)
            
            from funlight.models import Server, Channel, ServerMember, Role
            
            if channel_id:
                channel = Channel.query.get_or_404(channel_id)
                server_id = channel.server_id
            
            server = Server.query.get_or_404(server_id)
            
            # Server Owner hat alle Berechtigungen
            if server.owner_id == current_user.id:
                return f(*args, **kwargs)
            
            # Prüfe Benutzer-Rollen
            member = ServerMember.query.filter_by(
                user_id=current_user.id,
                server_id=server_id
            ).first()
            
            if not member:
                abort(403)
            
            # Kombiniere Berechtigungen aller Rollen des Benutzers
            user_permissions = Permissions(0)
            for role in member.roles:
                user_permissions |= Permissions(role.permissions)
            
            # Prüfe ob Benutzer die erforderliche Berechtigung hat
            if not (user_permissions & permission) and not (user_permissions & Permissions.ADMINISTRATOR):
                abort(403)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def check_permission(user_id, server_id, permission):
    """
    Überprüft, ob ein Benutzer eine bestimmte Berechtigung auf einem Server hat.
    """
    from funlight.models import Server, ServerMember
    
    server = Server.query.get(server_id)
    if not server:
        return False
    
    # Server Owner hat alle Berechtigungen
    if server.owner_id == user_id:
        return True
    
    member = ServerMember.query.filter_by(
        user_id=user_id,
        server_id=server_id
    ).first()
    
    if not member:
        return False
    
    # Kombiniere Berechtigungen aller Rollen des Benutzers
    user_permissions = Permissions(0)
    for role in member.roles:
        user_permissions |= Permissions(role.permissions)
    
    return bool(user_permissions & permission) or bool(user_permissions & Permissions.ADMINISTRATOR)
