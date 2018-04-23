/*********************************************
GUI AND ROUTING
*********************************************/
var electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

var youtube_key = "AIzaSyDRwh7Lx-8qJd6Rc49eDs994Z_ttwGRypc"; 

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

console.log(process.versions.electron); 

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
    	app.quit();
    }
});

app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 900, 
        height: 600, 
        webPreferences: {
            plugins: true, 
            preload: "alert.js" 
        }
    });

    mainWindow.show(); 

    //app.dock.hide();
    mainWindow.setAlwaysOnTop(true, "floating");
    //mainWindow.setVisibleOnAllWorkspaces(true);
    //mainWindow.setFullScreenable(false);
    mainWindow.setFullScreen(true); 

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/public/index.html?load=1');

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    //mainWindow.setMenu(null); 
});

/*********************************************
SOCKET AND ROBOT
*********************************************/
var robot = require('robotjs'); 
var express = require('express'); 
var exp = express(); 
var bodyParser = require('body-parser');
var http = require('http'); 
var audio = require('win-audio').speaker;
var server = http.createServer(exp); 
//const fetchComments = require('youtube-comments-task')

function key_press(key) {
    robot.keyToggle(key, "down");
    robot.keyToggle(key, "up"); 
}

function key_toggle (key, dir) {
    robot.keyToggle(key, dir); 
}

server.listen(process.env.PORT || 3000); 
exp.use(express.static('public'));

var ipc = require('electron').ipcMain; 
var ipc_out;
var out_socket; 

robot.setMouseDelay(1); 

var socket_out; 

var YouTube = require('youtube-node');

var youTube = new YouTube();

youTube.setKey(youtube_key);

var isChrome = false; 

const chromeLauncher = require('chrome-launcher');

var controllers = [['down', 'right', 'up', 'left', 'enter', 'space', '7', '8'], ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'], ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',']]; 

var controller_1 = ['down', 'right', 'up', 'left', 'enter', 'space', '7', '8']; 
var controller_2 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i']; 
var controller_3 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
var controller_4 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',']; 

var players = [null, null, null, null]; 
var sockets = [null, null, null, null]; 

var isGame = false; 

ipc.on("close", function(event, data) {
    mainWindow.minimize(); 
})

ipc.on("connect", function(event, data) {
    //console.log("connected with child"); 
    ipc_out = event.sender;
    var io = require('socket.io').listen(server);
    io.on('connection', function(socket) {
        for (var i = 0; i < 4; i++) {
            if (players[i] == null) {
                console.log("added number " + i + " with id " + socket.id); 
                players[i] = socket.id; 
                sockets[i] = socket; 
                break; 
            } else if (i == 4) {
                //boot the client
                console.log("Booted the client -- too many connections");
                socket.disconnect(); 
            }
        }

        socket.on("disconnect", function() {
            console.log("you're disconnected"); 
            for (var i = 0; i < 4; i++) {
                if (players[i] == socket.id) {
                    players[i] = null; 
                    sockets[i] = null; 
                }
            }
        }); 

        console.log("new client connected"); 
        var active = 0; 
        socket_out = socket; 

        socket.emit("start-app", {id: 0, name: "home", content: null}); 

        //console.log("new client connected"); 
        
        socket.on("key-press", function(msg) {
            data = JSON.parse(msg); 
            if (data.key == "Backspace") {
                robot.keyTap("backspace"); 
            } else if (data.key == "Enter") {
                if (active == 1) {
                    ipc_out.send("search-query", {}); 
                    ipc.on("search-query", function(event, data) {
                        socket.emit("search", {value: data.query}); 
                    }); 
                    robot.keyTap("enter"); 
                } else {
                    console.log("sent enter"); 
                    robot.keyTap("enter"); 
                }
            } else if (data.key == "Space") {
                robot.keyTap("space"); 
            } else {
                robot.keyTap(data.key); 
            }
        }); 

        socket.on("mouse-move", function(msg) {
            data = JSON.parse(msg); 
            var mouse = robot.getMousePos(); 
            var dis_x = parseFloat(data.x) * 100; 
            var dis_y = parseFloat(data.y) * 100; 
            robot.moveMouse(mouse.x + dis_x, mouse.y + dis_y); 
        }); 

        socket.on("mouse-click", function(msg) {
            //var data = JSON.parse(msg); 
            robot.mouseClick(); 
        }); 

        socket.on("volume", function(msg) {
            var data = JSON.parse(msg); 
            var vol = audio.set(Math.floor(parseFloat(data.value) * 100)); 
        }); 

        socket.on("home", function(msg) {
            if (isChrome) {
                mainWindow.show(); 
                mainWindow.focus(); 
                setTimeout(function() {
                    startChildProcess("TASKKILL", ['/IM', 'chrome.exe', '/F']);
                }, 50);
                isChrome = false;
                mainWindow.loadURL('file://' + __dirname + '/public/index.html?load=0'); 
                socket.emit("start-app", {id: 0, name: "home", content: null}); 
            } else {
                mainWindow.loadURL('file://' + __dirname + '/public/index.html?load=0'); 
                socket.emit("start-app", {id: 0, name: "home", content: null}); 
            }
            console.log("home was pressed"); 
        }); 

        ipc.on("start-app", function(event, data) {
            if (data.id == 1 && !isChrome) {
                //start direct tv
                socket.emit("start-app", {id: 1, name: "directv", content: null}); 
                isChrome = true; 
                chromeLauncher.launch({
                    startingUrl: 'https://www.directv.com',
                    chromeFlags: ['--new-window', '--start-fullscreen'],
                    userDataDir: 'C:\\Users\\abelanger\\AppData\\Local\\Google\\Chrome\\User\ Data'
                }).then(function(chrome) {
                    console.log(`Chrome debugging port running on ${chrome.port}`); 
                }).catch(function(err) {
                    console.log(err); 
                });

                setTimeout(function() {mainWindow.minimize()}, 3000); 
            } else if (data.id == 2) {
                console.log("new application is started"); 
                mainWindow.loadURL('file://' + __dirname + '/public/web.html');

                socket.emit("start-app", {id: 2, name: "youtube", content: null}); 
                active = 1; 
            } else if (data.id == 3) {
                //start the game
                var num_null = 0; 
                for (var i = 0; i < 4; i++) {
                    if (players[i] != null) {
                        console.log("assigned number: " + (i - num_null)); 
                        sockets[i].emit("start-app", {id: 3, name: "game", content: null, id: (i - num_null)}); 
                    } else {
                        num_null++; 
                    }
                }

                if (!isGame) {
                    isGame = true; 
                    console.log("game should start"); 
                    //start different game
                    startChildProcess("./SMRGNN.exe"); 
                }
            } else if (data.id == 4) {
                //start soundcloud
                isChrome = true; 
                chromeLauncher.launch({
                    startingUrl: 'https://soundcloud.com',
                    chromeFlags: ['--new-window', '--start-fullscreen'],  
                    userDataDir: 'C:\\Users\\abelanger\\AppData\\Local\\Google\\Chrome\\User\ Data'
                }).then(function(chrome) {
                    console.log(`Chrome debugging port running on ${chrome.port}`); 
                }).catch(function(err) {
                    console.log(err); 
                });

                setTimeout(function() {mainWindow.minimize()}, 3000); 

                socket.emit("start-app", {id: 4, name: "soundcloud", content: null}); 
            }
        }); 

        socket.on("game-key", function(msg) {
            var data = JSON.parse(msg); 
            if (data.direction) {
                console.log("pressed key down: " + controllers[data.id][data.button]); 
                robot.keyToggle(controllers[data.id][data.button], "down");
            } else {
                console.log("pressed key down: " + controllers[data.id][data.button]); 
                robot.keyToggle(controllers[data.id][data.button], "up");
            }
        }); 

        ipc.on("keyboard", function(event, data) {
            console.log("keyboard active: " + data.active); 
            socket.emit("keyboard", {active: data.active}); 
        }); 

        ipc.on("temp", function(event, data) {
            socket.emit("temp", {}); 
        }); 

        ipc.on("youtube-video", function(event, data) {
            youTube.getById(data.id, function(error, result) {
              if (error) {
                console.log(error);
            }
            else {
                var title = (result.items[0]).snippet.title; 
                var channelTitle = (result.items[0]).snippet.channelTitle; 
                var views = (result.items[0]).statistics.viewCount; 
                var likes = (result.items[0]).statistics.likeCount; 
                var dislikes = (result.items[0]).statistics.dislikeCount; 
                var thumb = getChannelImage((result.items[0]).snippet.channelId, function(res) {
                    console.log("the returned value is: " + res);
                    socket.emit("start-app", {id: 1, name: "youtube", 
                        content: {videoTitle: title, channelName: channelTitle, thumbnail: res}}); 
                });  
                //console.log(title + " " + channelTitle + " " + views + " " + likes + " " + dislikes); 

                //console.log((result.items[0])); 
                //console.log(result.items.snippet.title);                 
            }

            /*fetchComments(data.id)
            .fork(e => console.error('ERROR', e),
                p => {
                  console.log('comments', p.comments)
                  console.log('nextPageToken', p.nextPageToken)
              });*/

          });
        }); 
    }); 
}); 

//getChannelImage("UC_x5XG1OV2P6uZZ5FSM9Ttw"); 

var readline = require('readline');
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-app.json';

// Load client secrets from a local file.
/*fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
}
  // Authorize a client with the loaded credentials, then call the YouTube API.
  authorize(JSON.parse(content), getChannel);
});*/

function getChannelImage(channelId, callback) {
    var fs = require('fs');
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        var credentials = JSON.parse(content); 
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

        //read credentials from file
        fs.readFile(TOKEN_PATH, function(err, token) {
            if (err) {
              getNewToken(oauth2Client, callback);
          } else {
            console.log("already authorized"); 
            oauth2Client.credentials = JSON.parse(token);
        }

        //read channel
        var service = google.youtube('v3');
        service.channels.list({
            auth: oauth2Client,
            part: 'snippet,contentDetails,statistics',
            id: channelId
        }, function(err, response) {
            if (err) {
              console.log('The API returned an error: ' + err);
              return;
          }
          var channels = response.data.items;

          if (channels.length == 0) {
              console.log('No channel found.');
          } else {
              console.log('function call is: ' + channels[0].snippet.thumbnails.default.url); 
              //console.log(channels[0].snippet.thumbnails.default.url); 
          }
          callback(channels[0].snippet.thumbnails.default.url); 
      });
    });
    });
}

var child = require('child_process').execFile;

//, ['netflix.com', '--kiosk']

function startChildProcess(path, args) {
    child(path, args, function(err, data) {
        if(err){
           console.error(err);
           return;
       }

       /*setTimeout(function() {
            startChildProcess("TASKKILL", ['/IM', 'chrome.exe', '/F']); 
        }, 10000); */

       /*setTimeout(function() {
            mainWindow.setFullScreen(true); 
        }, 11000)*/

        console.log(data.toString()); 
    });
}