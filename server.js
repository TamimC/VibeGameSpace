const WebSocket = require('ws');
const { createClient } = require('redis');

// Create Redis client
const redisClient = createClient({
    url: 'redis://localhost:6379'
});

// Connect to Redis
redisClient.connect().catch(console.error);

const server = new WebSocket.Server({ port: 8080 });
const players = new Map();

server.on('connection', async (ws) => {
    const playerId = Math.random().toString(36).substring(7);
    players.set(playerId, {
        position: { x: 0, y: 10, z: 30 },
        rotation: { x: 0, y: 0, z: 0 },
        gold: 0,
        name: null, // Initialize name as null
        color: null // Initialize color as null
    });

    // Get player's gold from Redis
    try {
        const gold = await redisClient.get(`player:${playerId}:gold`);
        if (gold !== null) {
            players.get(playerId).gold = parseInt(gold);
        }
    } catch (error) {
        console.error('Error fetching gold from Redis:', error);
    }

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'requestPlayers') {
            // Set player's name and color when they first connect
            const player = players.get(playerId);
            player.name = data.name || `Player ${playerId}`;
            player.color = data.color || '#ffffff'; // Default to white if no color provided
            
            // Send player their ID and current gold
            ws.send(JSON.stringify({
                type: 'init',
                id: playerId,
                gold: player.gold,
                name: player.name,
                color: player.color
            }));

            // Send current players to new player
            ws.send(JSON.stringify({
                type: 'players',
                players: Array.from(players.entries()).map(([id, data]) => ({
                    id,
                    position: data.position,
                    rotation: data.rotation,
                    gold: data.gold,
                    name: data.name,
                    color: data.color
                }))
            }));

            // Broadcast new player to others
            broadcast({
                type: 'newPlayer',
                id: playerId,
                position: player.position,
                rotation: player.rotation,
                gold: player.gold,
                name: player.name,
                color: player.color
            }, ws);
        }
        else if (data.type === 'update') {
            const player = players.get(playerId);
            player.position = data.position;
            player.rotation = data.rotation;
            
            // Update gold if it changed
            if (data.gold !== undefined && data.gold !== player.gold) {
                player.gold = data.gold;
                // Store gold in Redis
                try {
                    await redisClient.set(`player:${playerId}:gold`, data.gold.toString());
                } catch (error) {
                    console.error('Error storing gold in Redis:', error);
                }
            }

            // Broadcast update to other players
            broadcast({
                type: 'playerUpdate',
                id: playerId,
                position: data.position,
                rotation: data.rotation,
                gold: player.gold,
                name: player.name,
                color: player.color
            }, ws);
        }
    });

    ws.on('close', async () => {
        // Store final gold value before removing player
        try {
            const player = players.get(playerId);
            if (player) {
                await redisClient.set(`player:${playerId}:gold`, player.gold.toString());
            }
        } catch (error) {
            console.error('Error storing final gold value:', error);
        }
        
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