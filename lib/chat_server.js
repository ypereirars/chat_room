var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
  //Starts a socket.io server on the same existing server
  io = socketio.listen(server);
  io.set('log level', 1);

  //When connection happens
  io.sockets.on('connection', function(socket) {

    //Handle new guests
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);

    //Join to a room
    joinRoom(socket, 'Lobby');

    //Handle message passing, change name and rooms
    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);

    //Show a list of occupied rooms on request
    socket.on('rooms', function() {
      socket.emit('rooms', io.sockets.manager.rooms);
    });

    //handle disconnection
    handleClientDisconnection(socket, nickNames, namesUsed);
  });
};

//Helpers for handling users actions

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  //Set the user guest name and push it into an array
  var name = 'Guest'+guestNumber;
  nickNames[socket.id] = name;

  //Tell the users they are in a new room
  socket.emit('nameResult', {
    success: true,
    name: name
  });

  //Pus the user's name a list of used names
  namesUsed.push(name);
  return guestNumber + 1;
}

//Handle the joining room
function joinRoom(socket, room) {
  //Each socket is related to each individual user

  //join user into a room
  socket.join(room);
  currentRoom[socket.id] = room;
  //Tell the users they are joined into a specific room
  socket.emit('joinResult', {room: room});

  //Tell to averyone in a room that a new user has joined
  socket.bradcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  //Get all of other users in a room
  var usersInRoom = io.sockets.clients(room);
  if(usersInRoom.length > 1) { //If there was somebody
    //Summarizer which users are in the room
    var usersInRoomSummary = "Users currently in " + room + ": ";
    //Loop through all users in a room
    for (var index in usersInRoom) {
      //Get each user id (same as socket.id)
      var userSocketId = usersInRoom[index].id;
      //To everyone else but the proper user, summarize them
      if (userSocketId != socket.id) {
        if (index > 0)
          usersInRoomSummary += ', ';
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    //finish the summarization
    usersInRoomSummary += '.';
    //Tell to everyone who are joined to a room
    socket.emit('message', {text:usersInRoomSummary});
  }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  //Add listener to nameAttempt events
  socket.on('nameAttempt', function(name) {
    //Check if a given name is Guest
    if(name.indexOf('Guest') == 0){
      //If so, emits a message telling users they cannot use name like that
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    } else {
      //If name was proper, checks if it's already being used
      if(namesUsed.indexOf(name) == -1) {
        //Get previous name and index
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        //Set the new name to a list of used names
        namesUsed.push(name);
        nickNames[socket.id] = name;
        //Delete a user from namesUsed
        delete namesUsed[previousNameIndex];
        //Send a message with the new name
        socket.emit('nameResult', {
          success: true,
          name: name
        });
        //Tell everyone else that a user has changed his name
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + "is now know as " + name + "."
        });
      } else {
        //If the user already exists, send a message saying it
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use.'
        });
      }
    }
  });
}

function handleMessageBroadcasting(socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ": " + message.text
    });
  });
}

function handleRoomJoining(socket) {
  //Add a listener to join events
  socket.on('join', function(room) {
    //Leave the previous room
    socket.leave(currentRoom[socket.id]);
    //Join to the new one
    joinRoom(socket, room.newRom);
  });
}

function handleClientDisconnection() {
  //Add a listener to disconnect events
  socket.on('disconnect', function () {
    //Get the name's index of the user and delete it
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  })
}
