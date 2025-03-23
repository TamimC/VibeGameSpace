const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

const players = new Map();

server.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substring(7);
    players.set(playerId, {
        position: { x: 0, y: 10, z: 30 },
        rotation: { x: 0, y: 0, z: 0 }
    });

    // Send player their ID
    ws.send(JSON.stringify({
        type: 'init',
        id: playerId
    }));

    // Send current players to new player
    ws.send(JSON.stringify({
        type: 'players',
        players: Array.from(players.entries()).map(([id, data]) => ({
            id,
            ...data
        }))
    }));

    // Broadcast new player to others
    broadcast({
        type: 'newPlayer',
        id: playerId,
        position: players.get(playerId).position,
        rotation: players.get(playerId).rotation
    }, ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'update') {
            players.set(playerId, {
                position: data.position,
                rotation: data.rotation
            });

            // Broadcast update to other players
            broadcast({
                type: 'playerUpdate',
                id: playerId,
                position: data.position,
                rotation: data.rotation
            }, ws);
        }
    });

    ws.on('close', () => {
        players.delete(playerId);
        broadcast({
            type: 'playerLeft',
            id: playerId
        });
    });
});

function broadcast(data, exclude = null) {
    server.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

console.log('WebSocket server running on port 8080'); 