var twitter = require('twitter');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var sentiment = require('sentiment');

var TwitterStreamService = function(server){
	var self = this;
	self.io = socketio(server);

	self.twitter_api = 
			new twitter({
				consumer_key: '',
				consumer_secret: '',
				access_token_key: '',
				access_token_secret: ''
			});
	self.twitter_stream = null;

	self.SetupSocketCallback = function(){
		self.io.on('connection', function (socket) {
			console.log('A client connected');
		  	socket.on('start-streaming', function() {
		  		console.log('Start streaming');
			    self.SetupTwitterStreamCallback(socket);
		  	});
		  	socket.on('get-trends', function(){
		  		console.log('Retrieving trends');
		  		self.SetupTwitterTrendsCallback(socket);
		  	});
		    socket.emit("connected");
		});
	}

	self.SetupTwitterStreamCallback = function(socket){
		if(self.twitter_stream === null){
	      	self.twitter_stream = self.twitter_api.stream(
	      		'statuses/filter', 
	      		{'locations':'-180,-90,180,90'}, 
	      		function(stream) {
		          	stream.on('data', function(tweet) {
		              	if (tweet.coordinates && tweet.coordinates !== null && tweet.lang === 'en'){
		              		tweet.sentiment = sentiment(tweet.text);
		                  	socket.broadcast.emit("new-tweet", tweet);
		                  	socket.emit('new-tweet', tweet);
		                  	console.log(tweet.text);
		              	}
		             });
 
		          	stream.on('error', function(error) {
		          		console.log(error.message);
					});

	              	stream.on('connect', function(request) {
					    console.log('Connected to Twitter API.');
					});

					stream.on('reconnect', function (request, response, connectInterval) {
					  	console.log('Trying to reconnect to Twitter API in ' + connectInterval + ' ms.');
					});

	              	stream.on('limit', function(limitMessage) {
	                	console.log(limitMessage);
	              	});

	              	stream.on('warning', function(warningMessage) {
	               	 	console.log(warningMessage);
	              	});

	              	stream.on('disconnect', function(disconnectMessage) {
	                	console.log(disconnectMessage);
	              	});
	      		}
	      	);
		}
	}

	self.SetupTwitterTrendsCallback = function(socket){
		self.twitter_api.get(
			'trends/place',
			{'id' : 1},
			function(error, trends, response){
				if(error){
					console.log(error);
					throw error;
				}
				socket.broadcast.emit("new-trends", trends);
		        socket.emit('new-trends', trends[0].trends);
			}
		);
	}

	self.SetupSocketCallback();
}

var Application = function(){
	var self = this;

	self.Initialize = function(){
		self.app = express();
		self.app.use(express.static(__dirname + '/client'));

		self.server = http.Server(self.app);
		self.socketService = new TwitterStreamService(self.server);
	}

	self.Start = function(){
		self.server.listen(3000);
	}
}

var app = new Application();
app.Initialize();
app.Start();
