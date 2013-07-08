var express = require('express');
var redis = require('redis');
var app = express();
var port = 8080;

db = redis.createClient();

app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
    res.render('index.jade', {title: 'RoPaSci'});
});

app.get('/play/:playId', function(req, res){
    res.render('index.jade', {title: 'RoPaSci', game: req.playId});
});

var io = require('socket.io').listen(app.listen(port));
var clients = [];

io.sockets.on('connection', function(socket){
    socket.on('login', function(data){
        socket.playerId = data.playerId;
        clients.push(socket);
    });
    socket.on('attack', function(data){
        var move = data.move;
        db.hgetall('game:' + data.gameId + ':players', function(err, getAll){
            var attackAllowed = false;
            var opponentId = null;
            for(player in getAll){
                if(getAll[player] !== data.playerId){
                    opponentId = getAll[player];
                } else {
                    attackAllowed = true;
                }
            }
            if(!attackAllowed){
                socket.emit('userError', {
                    'message': "You are not allowed to play in this game.  " + data.gameId + " already has two players!",
                    'playerId': data.playerId,
                    'gameId': data.gameId
                });
                return null;
            }
            db.hexists('game:' + data.gameId + ':moves', data.playerId, function(err, existsRes) {
                if(existsRes === 0) {
                    db.hset('game:' + data.gameId + ':moves', data.playerId, move, function(err, attackRes) {
                        if(opponentId){
                            db.hget('game:' + data.gameId + ':moves', opponentId, function(err, opponentRes) {
                                if( opponentRes === move ) {
                                    socket.emit('tie', {'game': {'id': data.gameId}});
                                    socket.emit('endGame', {'gameId': data.gameId});
                                    for (client in clients) {
                                        if (clients[client].playerId === opponentId) {
                                            clients[client].emit('tie', {'game': {'id': data.gameId}});
                                            clients[client].emit('endGame', {'gameId': data.gameId});
                                        }
                                    }
                                } else if((opponentRes === 'rock' && move === 'scissors') || (opponentRes === 'paper' && move === 'rock') || (opponentRes === 'scissors' && move === 'paper')) {
                                    // current player loses
                                    socket.emit('win',{'game':{'id':data.gameId},'winner':{'playerId':opponentId},'loser':{'id':data.playerId} });
                                    socket.emit('endGame', {'gameId': data.gameId});
                                    for (client in clients) {
                                        // notify opponent
                                        if (clients[client].playerId === opponentId) {
                                            clients[client].emit('win',{'game':{'id':data.gameId},'winner':{'playerId':opponentId},'loser':{'id':data.playerId} });
                                            clients[client].emit('endGame', {'gameId': data.gameId});
                                        }
                                    }
                                } else if((move === 'rock' && opponentRes === 'scissors') || (move === 'paper' && opponentRes === 'rock') || (move === 'scissors' && opponentRes === 'paper')) {
                                    // current player wins
                                    socket.emit('win',{'game':{'id':data.gameId},'winner':{'id':data.playerId},'loser':{'id':opponentId} });
                                    socket.emit('endGame', {'gameId': data.gameId});
                                    for (client in clients) {
                                        // notify opponent
                                        if (clients[client].playerId === opponentId) {
                                            clients[client].emit('win',{'game':{'id':data.gameId},'winner':{'id':data.playerId},'loser':{'id':opponentId} });
                                            clients[client].emit('endGame', {'gameId': data.gameId});
                                        }
                                    }
                                }
                            })
                        }
                    })
                }
            });
        });
    });
    socket.on('joinGame', function(data) {
        var id = data.gameId;
        var playerId = data.playerId;
        var gameKey = 'game:' + id;

        db.hexists(gameKey + ':players', '1', function(error, exists) {
            if(exists === 0) {
                // create game
                db.hset(gameKey + ':players', '1', playerId, function(err, dbset) {
                    console.log('dbset', dbset);
                });
            } else {
                db.hgetall(gameKey + ':players', function(error, getAllData) {
                    if( getAllData[1] === playerId || getAllData[2] === playerId ) {
                        // already joined game
                        return true;
                    }
                    if(typeof(getAllData[2]) === 'undefined') {
                        // if no player 2, add this player
                        db.hset(gameKey + ':players', '2', playerId, function(err, dbset) {
                            return true;
                        });
                    }
                    socket.emit('userError', {message: "Game " + id + " already has two players!", 'playerId': playerId});
                });
            }
        });
    });
});
