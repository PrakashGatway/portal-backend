import User from "../models/User.js";
import Message from "../models/Messages.js"


const connectedUsers = new Map(); // Map<classId, Map<socketId, user>>
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

const initializeClassRoom = (classId) => {
    if (!connectedUsers.has(classId)) {
        connectedUsers.set(classId, new Map());
    }
};

const handleJoinClass = async (socket, io, joinData) => {
    const { classId } = joinData;

    if (!classId || !socket.user) {
        socket.emit('error', { message: 'Class ID and User are required' });
        return;
    }
    const { _id: userId, name: username, email, role } = socket?.user;

    const actualIsAdmin = role == "teacher" ? true : false;

    try {
        const user = {
            socketId: socket.id,
            userId: userId.toString(),
            username: username || email,
            classId: classId,
            joinedAt: new Date(),
            isAdmin: actualIsAdmin,
            isMuted: false
        };

        initializeClassRoom(classId);
        connectedUsers.get(classId).set(socket.id, user);
        socket.join(classId);
        try {
            const messages = await Message.find({ classId: classId })
                .sort({ timestamp: -1 })
                .limit(60);
            socket.emit('previousMessages', messages.reverse());
        } catch (err) {
            console.error('Error loading messages:', err);
        }

        socket.to(classId).emit('userJoined', {
            username: user.username,
            isAdmin: user.isAdmin,
            timestamp: user.joinedAt
        });

        const classUsers = connectedUsers.get(classId);
        const userCount = classUsers ? classUsers.size : 0;

        try {
            const count = await Message.countDocuments({ classId: classId, isSystem: false });
            io.to(classId).emit('stats', {
                onlineUsers: userCount,
                totalMessages: count,
                classId: classId
            });
        } catch (err) {
            console.error('Error counting messages:', err);
        }

        if (actualIsAdmin) {
            const usersList = classUsers ? Array.from(classUsers.values()) : [];
            socket.emit('adminUsersList', usersList);
        }

        const regularUsersList = classUsers
            ? Array.from(classUsers.values())
                .filter(u => !u.isAdmin)
                .map(u => u.username)
            : [];
        socket.emit('usersList', regularUsersList);

        socket.emit('adminStatus', { isAdmin: user.isAdmin, classId: classId });

        console.log(`User ${user.username} joined class ${classId}`);
    } catch (err) {
        console.error('Error joining class:', err);
        socket.emit('error', { message: 'Failed to join class' });
    }
};

// Handle new messages
const handleMessage = (socket, io) => {
    return async (messageData) => {
        let user = null;
        let classId = null;

        for (const [roomId, users] of connectedUsers.entries()) {
            if (users.has(socket.id)) {
                user = users.get(socket.id);
                classId = roomId;
                break;
            }
        }

        const message = {
            text: messageData.text,
            userId: user?.userId,
            username: user.username,
            classId: classId,
            timestamp: new Date(),
            isAdmin: user.isAdmin
        };

        const messageDoc = new Message(message);
        try {
            await messageDoc.save();
        } catch (err) {
            console.error('Error saving message:', err);
            return;
        }

        io.to(classId).emit('message', message);

        try {
            const count = await Message.countDocuments({ classId: classId, isSystem: false });
            io.to(classId).emit('stats', {
                onlineUsers: connectedUsers.get(classId).size,
                totalMessages: count,
                classId: classId
            });
        } catch (err) {
            console.error('Error counting messages:', err);
        }
    };
};

const handleTyping = (socket) => {
    return (isTyping) => {
        let user = null;
        let classId = null;

        for (const [roomId, users] of connectedUsers.entries()) {
            if (users.has(socket.id)) {
                user = users.get(socket.id);
                classId = roomId;
                break;
            }
        }

        if (user && classId) {
            socket.to(classId).emit('userTyping', {
                userId: user.userId,
                username: user.username,
                isTyping
            });
        }
    };
};

const handleAdminAction = (socket, io) => {
    return async (actionData) => {
        let user = null;
        let classId = null;

        for (const [roomId, users] of connectedUsers.entries()) {
            if (users.has(socket.id)) {
                user = users.get(socket.id);
                classId = roomId;
                break;
            }
        }

        if (!user || !user.isAdmin) {
            socket.emit('error', { message: 'Unauthorized access' });
            return;
        }

        switch (actionData.action) {
            case 'muteUser':
                const classUsers = connectedUsers.get(classId);
                if (classUsers) {
                    const targetUser = Array.from(classUsers.values())
                        .find(u => u.username === actionData.username);

                    if (targetUser) {
                        targetUser.isMuted = true;
                        classUsers.set(targetUser.socketId, targetUser);

                        io.to(targetUser.socketId).emit('userMuted', {
                            by: user.username,
                            timestamp: new Date()
                        });

                        socket.emit('actionSuccess', {
                            message: `User ${actionData.username} has been muted`
                        });
                    }
                }
                break;

            case 'unmuteUser':
                const unmuteClassUsers = connectedUsers.get(classId);
                if (unmuteClassUsers) {
                    const unmuteUser = Array.from(unmuteClassUsers.values())
                        .find(u => u.username === actionData.username);

                    if (unmuteUser) {
                        unmuteUser.isMuted = false;
                        unmuteClassUsers.set(unmuteUser.socketId, unmuteUser);

                        io.to(unmuteUser.socketId).emit('userUnmuted', {
                            by: user.username,
                            timestamp: new Date()
                        });

                        socket.emit('actionSuccess', {
                            message: `User ${actionData.username} has been unmuted`
                        });
                    }
                }
                break;

            case 'kickUser':
                const kickClassUsers = connectedUsers.get(classId);
                if (kickClassUsers) {
                    const kickUser = Array.from(kickClassUsers.values())
                        .find(u => u.username === actionData.username);

                    if (kickUser && !kickUser.isAdmin) {
                        io.to(kickUser.socketId).emit('userKicked', {
                            by: user.username,
                            reason: actionData.reason || 'Kicked by admin'
                        });

                        kickClassUsers.delete(kickUser.socketId);

                        socket.emit('actionSuccess', {
                            message: `User ${actionData.username} has been kicked`
                        });

                        try {
                            const count = await Message.countDocuments({ classId: classId, isSystem: false });
                            io.to(classId).emit('stats', {
                                onlineUsers: kickClassUsers.size,
                                totalMessages: count,
                                classId: classId
                            });
                        } catch (err) {
                            console.error('Error counting messages:', err);
                        }
                    }
                }
                break;

            case 'broadcastMessage':
                const broadcastMessage = {
                    text: actionData.message,
                    userId: user.userId,
                    username: 'ADMIN',
                    classId: classId,
                    timestamp: new Date(),
                    isAdmin: true,
                    isSystem: true
                };

                const msgDoc = new Message(broadcastMessage);
                try {
                    await msgDoc.save();
                } catch (err) {
                    console.error('Error saving broadcast message:', err);
                    return;
                }

                io.to(classId).emit('message', broadcastMessage);
                socket.emit('actionSuccess', {
                    message: 'Broadcast message sent successfully'
                }); 
                break;

            case 'endClass':
                console.log('classendedkfkdklfjd')
                io.to(classId).emit('classEnded', {
                    by: user.username,
                    timestamp: new Date(),
                    message: 'Class has been ended by the admin'
                });
                connectedUsers.delete(classId);
                socket.emit('actionSuccess', {
                    message: `Class ${classId} has been ended`
                });
                break;
        }

        const usersList = connectedUsers.get(classId)
            ? Array.from(connectedUsers.get(classId).values())
            : [];
        socket.emit('adminUsersList', usersList);
    };
};

const handleDisconnect = (socket, io) => {
    return async () => {
        let user = null;
        let classId = null;

        for (const [roomId, users] of connectedUsers.entries()) {
            if (users.has(socket.id)) {
                user = users.get(socket.id);
                classId = roomId;
                users.delete(socket.id);
                break;
            }
        }

        if (user && classId) {
            socket.to(classId).emit('userLeft', {
                username: user.username,
                isAdmin: user.isAdmin,
                timestamp: new Date()
            });

            const classUsers = connectedUsers.get(classId);
            const userCount = classUsers ? classUsers.size : 0;

            try {
                const count = await Message.countDocuments({ classId: classId, isSystem: false });
                io.to(classId).emit('stats', {
                    onlineUsers: userCount,
                    totalMessages: count,
                    classId: classId
                });
            } catch (err) {
                console.error('Error counting messages:', err);
            }

            console.log(`User ${user.username} left class ${classId}`);
        }
        console.log('User disconnected:', socket.id);
    };
};

export default {
    handleJoinClass,
    handleMessage,
    handleTyping,
    handleAdminAction,
    handleDisconnect
};