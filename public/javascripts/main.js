var playerId = getPlayerId();
var host = 'localhost';
var port = 8080;
var socket = io.connect('http://' + host + ':' + port);
var gameId = getGameId();

$(document).ready(function(){
    socket.on('win', function(data){
        if(data.game.id === gameId && data.winner.id === playerId){
            $('.alert').html('<h1>You Win!</h1>');
        } else if (data.game.id === gameId && data.loser.id === playerId) {
            $('.alert').html('<h1>You Lose!</h1>');
        }
    });

    socket.on('tie', function(data){
        if(data.game.id === gameId){
            $('.alert').html("It's a Tie!");
        }
    });

    socket.on('globalMessage', function(data){
        console.log('globalMessage', data);
    });

    socket.on('endGame', function(data) {
        if (gameId === data.gameId) {
            $('.game-controls').html('(this game has ended)');
        }
    })

    socket.on('userError', function(data){
        if(data.gameId == gameId && data.playerId == playerId){
            alert(data.message);
        }
    });

    if(gameId && login(playerId)){
        joinGame(gameId, playerId);
    }

    $('.attack').on('click',function(){
        $(this).css('background-color', 'beige');
        $(this).css('font-weight', 'bold');
        attack($(this).attr('id'), playerId, gameId);
    });
});

function getPlayerId(){
    if(localStorage.getItem('playerId')){
        return localStorage.playerId;
    }
    var id = createPlayerId();
    localStorage.setItem('playerId', id);
    return id;
}

function createPlayerId(){
    var date = new Date;
    // quick & dirty unique id generate
    return date.getTime() + '-' + (Math.floor(Math.random() * 10000) + 900000);
}

function login(player){
    socket.emit('login', {'playerId': player});
    return true;
}

function attack(move, player, game){
    socket.emit('attack', { 'move': move, 'playerId': player, 'gameId': game} );
}

function getGameId(){
    var paths = location.pathname.split('/');
    for (i in paths){
        if(paths[i] === 'play'){
            return paths[(parseInt(i)+1)];
        }
    }
    return null;
}
function joinGame(gameId, playerId){
    socket.emit('joinGame', {'gameId': gameId, 'playerId': playerId});
}
