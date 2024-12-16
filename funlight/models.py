from datetime import datetime
from funlight import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask import url_for

# Add friendship association table
friendships = db.Table('friendships',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('friend_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    avatar = db.Column(db.String(200), default='img/default-avatar.png')
    status = db.Column(db.String(20), default='offline')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    owned_servers = db.relationship('Server', back_populates='owner', lazy=True, foreign_keys='Server.owner_id')
    server_memberships = db.relationship('ServerMember', back_populates='member', lazy=True)
    friends = db.relationship('User', 
        secondary=friendships,
        primaryjoin=(friendships.c.user_id == id),
        secondaryjoin=(friendships.c.friend_id == id),
        lazy='dynamic'
    )
    
    # Add sent and received friend requests
    sent_friend_requests = db.relationship('FriendRequest',
        foreign_keys='FriendRequest.sender_id',
        backref='sender',
        lazy='dynamic'
    )
    received_friend_requests = db.relationship('FriendRequest',
        foreign_keys='FriendRequest.receiver_id',
        backref='receiver',
        lazy='dynamic'
    )
    
    @property
    def is_online(self):
        return self.status == 'online'
    
    @property
    def avatar_url(self):
        if not self.avatar:
            return url_for('static', filename='img/default-avatar.png')
        if self.avatar.startswith(('http://', 'https://')):
            return self.avatar
        return url_for('static', filename=self.avatar)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'avatar': self.avatar,
            'status': self.status
        }

class Server(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(1024))
    icon = db.Column(db.String(255))
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    template = db.Column(db.String(50))  # gaming, study, friends, etc.
    
    # Relationships
    owner = db.relationship('User', back_populates='owned_servers')
    channels = db.relationship('Channel', back_populates='server', lazy=True, cascade='all, delete-orphan')
    members = db.relationship('ServerMember', back_populates='server', lazy=True, cascade='all, delete-orphan')
    categories = db.relationship('Category', back_populates='server', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Server {self.name}>'

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    server_id = db.Column(db.Integer, db.ForeignKey('server.id'), nullable=False)
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    server = db.relationship('Server', back_populates='categories')
    channels = db.relationship('Channel', back_populates='category', order_by='Channel.position')

class Channel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    server_id = db.Column(db.Integer, db.ForeignKey('server.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False, default='text')  # 'text' or 'voice'
    topic = db.Column(db.String(1024))
    position = db.Column(db.Integer, default=0)
    private = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    server = db.relationship('Server', back_populates='channels')
    category = db.relationship('Category', back_populates='channels')
    messages = db.relationship('Message', back_populates='channel', cascade='all, delete-orphan')

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('channel.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime)
    
    attachments = db.relationship('Attachment', backref='message', lazy=True)
    
    # Relationship
    channel = db.relationship('Channel', back_populates='messages')

class Attachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50))
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

class ServerMember(db.Model):
    __tablename__ = 'server_member'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    server_id = db.Column(db.Integer, db.ForeignKey('server.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='member')
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    member = db.relationship('User', back_populates='server_memberships')
    server = db.relationship('Server', back_populates='members')
    roles = db.relationship('Role', secondary='member_roles', lazy='subquery',
                          backref=db.backref('members', lazy=True))
    
    def __repr__(self):
        return f'<ServerMember {self.member.username} in {self.server.name}>'

class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    server_id = db.Column(db.Integer, db.ForeignKey('server.id'), nullable=False)
    permissions = db.Column(db.Integer, default=0)
    color = db.Column(db.String(7))  # Hex color code

# Association table for many-to-many relationship between ServerMember and Role
member_roles = db.Table('member_roles',
    db.Column('member_id', db.Integer, db.ForeignKey('server_member.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('role.id'), primary_key=True)
)

class FriendRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<FriendRequest {self.sender_id} -> {self.receiver_id}>'

class FriendAssociation(db.Model):
    __tablename__ = 'friend_associations'
    
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, blocked
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user1 = db.relationship('User', foreign_keys=[user1_id], backref=db.backref('sent_friend_associations', lazy='dynamic'))
    user2 = db.relationship('User', foreign_keys=[user2_id], backref=db.backref('received_friend_associations', lazy='dynamic'))
    
    def __init__(self, user1_id, user2_id, status='pending'):
        self.user1_id = user1_id
        self.user2_id = user2_id
        self.status = status
