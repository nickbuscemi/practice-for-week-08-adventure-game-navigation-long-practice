const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {
  console.log('Request received:', req.method, req.url);
  console.log('Current player:', player);
  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });
  //console.log(reqBody);

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    } //console.log(reqBody);

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if (req.method === "GET" && req.url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-type', 'text/html');
      let htmlContent = fs.readFileSync('views/new-player.html', 'utf-8');
      htmlContent = htmlContent.replace('#{availableRooms}', world.availableRoomsToString());
      res.end(htmlContent);
    }

    // Phase 2: POST /player
    if (req.method === "POST" && req.url === '/player') {
      const { name, roomId } = req.body;
      
      if (!name || !roomId) {
        // handle error, name or roomId not provided
        res.statusCode = 400;
        res.end('Name or roomId not provided');
        return;
      }

      player = new Player(name, world.rooms[roomId]);
      //console.log('Player created:', player);
      

      // Redirect to the selected room
      res.writeHead(302, {'Location': `/rooms/${roomId}`});
      res.end();
      return;
      //res.statusCode = 200;
      //res.setHeader('Content-type', 'application/JSON');
      //res.end(JSON.stringify({ roomDescription: player.currentRoom.description}));
    } 

    // helper function for phase 3 and 4
    const handleRoomRequest = (roomId, res) => {
      const room = world.rooms[roomId];
      if (room) {
        let roomName = room.name;
        let inventory = player.inventoryToString();
        let roomItems = room.itemsToString();
        let exits = room.exitsToString();
        let htmlContent = fs.readFileSync('views/room.html', 'utf-8');
        htmlContent = htmlContent
          .replace(/#{roomName}/g, roomName)
          .replace('#{inventory}', inventory)
          .replace('#{roomItems}', roomItems)
          .replace('#{exits}', exits);
        res.statusCode = 200;
        res.setHeader('Content-type', 'text/html');
        res.end(htmlContent);
      } else {
        res.statusCode = 404;
        res.end('Room not found');
      }
    };

    // Phase 3: GET /rooms/:roomId
    if (req.method === "GET" && req.url.startsWith('/rooms/') && req.url.split('/').length === 3) {
      const roomId = req.url.split('/')[2];
      handleRoomRequest(roomId, res);
    }

    // Phase 4: GET /rooms/:roomId/:direction
// Phase 4: GET /rooms/:roomId/:direction
    if (req.method === "GET" && req.url.startsWith('/rooms/') && req.url.split('/').length === 4) {
      const roomId = req.url.split('/')[2]; // (1,2,3,4,5)
      const direction = req.url.split('/')[3][0]; // (c,n,e,w,s)
      
      
      if (roomId == player.currentRoom.id) {
        player.move(direction);
      } 
      res.writeHead(302, {'Location': `/rooms/${player.currentRoom.id}`});
      res.end();
      return;
      
    }


    
    // Phase 5: POST /items/:itemId/:action
    if (req.method === "POST" && req.url.startsWith('/items/') && req.url.split('/').length === 4) {
      const itemId = req.url.split('/')[2];
      const action = req.url.split('/')[3];
      
      // Find the item either in the room or in the player's inventory
      const item = player.currentRoom._getItem(itemId) || player._getItem(itemId);
      
      // If the item does not exist in either the room or the player's inventory
      if (!item) {
        res.statusCode = 404;
        res.end('Item not found');
        return;
      }

      try {
        switch (action) {
          case 'take':
            if (!player.currentRoom._getItem(itemId)) {
              res.statusCode = 404;
              res.end('Item not found in room');
            } else {
              player.takeItem(itemId);
              res.writeHead(302, {'Location': `/rooms/${player.currentRoom.id}`});
              res.end();
            }
            break;
          case 'drop':
            if (!player._getItem(itemId)) {
              res.statusCode = 404;
              res.end('Item not found in player inventory');
              return;
            } else {
              player.dropItem(itemId);
              res.writeHead(302, {'Location': `/rooms/${player.currentRoom.id}`});
              res.end();
            }
            break;
          default:
            res.statusCode = 400;
            res.end('Invalid action');
        }
      } catch (error) {
        console.error(error);
        res.writeHead(302, {'Location': `/rooms/${player.currentRoom.id}`});
        res.end();
      }
    }

        
          
          
          
          
          
      

    // Phase 6: Redirect if no matching route handlers
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));