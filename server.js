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

    // Phase 3: GET /rooms/:roomId
    if (req.method === "GET" && req.url.startsWith('/rooms/')) {
      const roomId = req.url.split('/')[2];
      if (!roomId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Room ID not provided');
      }
      const room = world.rooms[roomId];
      let roomName = room.name;
      let inventory = player.items.map(item => `<p>${item.name}: ${item.description}`).join('');
      let roomItems = room.items.map(item => `<p>${item.name}</p>`);
      let exits = room.exitsToString();
      res.statusCode = 200;
      res.setHeader('Content-type', 'text/html');
      let htmlContent = fs.readFileSync('views/room.html', 'utf-8');
      htmlContent = htmlContent
        .replace(/#{roomName}/g, roomName)
        .replace('#{inventory}', inventory)
        .replace('#{roomItems}', roomItems)
        .replace('#{exits}', exits)
      res.end(htmlContent);
    }

    // Phase 4: GET /rooms/:roomId/:direction
    if (req.method === "GET" && req.url.startsWith('/rooms/')) {
      const roomId = req.url.split('/')[2];
      const direction = req.url.split('/')[3];
      if (!roomId || !direction) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Room ID and/or direction not provided');
      }
      
    
    }

    // Phase 5: POST /items/:itemId/:action

    // Phase 6: Redirect if no matching route handlers
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));