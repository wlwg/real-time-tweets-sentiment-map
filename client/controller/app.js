var module = angular.module('app', []);

module.factory('socket', function($rootScope){
    var socket = io.connect('http://tsm-luckynine.rhcloud.com');
  	return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
            	var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
	      	socket.emit(eventName, data, function () {
	        	$rootScope.$apply(function () {
	          		if (callback) {
	            		callback.apply(socket, data);
	          		}
	        	});
	      	})
	    }
    };
});

module.factory('GoogleMap', function(){
    var mapOptions = {
		center: {lat: 20, lng: 0},
		zoom: 2
	}
	return new google.maps.Map($('#map-canvas')[0], mapOptions);
});

module.controller('MapController', function($scope, GoogleMap, socket){

	if(!$scope.trends) $scope.trends = [];

	socket.on('connected', function(){
		socket.emit('start-streaming');
		socket.emit('get-trends');
	});
	socket.on('new-tweet', function(tweet){
		var icon = null;
		if(tweet.sentiment.score < 0)
			icon = '../res/img/marker-red.png';
		if(tweet.sentiment.score == 0)
			icon = '../res/img/marker-yellow.png';
		if(tweet.sentiment.score > 0)
			icon = '../res/img/marker-green.png';


      	var marker = new google.maps.Marker({
         	map: GoogleMap,
          	title: '',
         	position: new google.maps.LatLng(tweet.coordinates.coordinates[1], tweet.coordinates.coordinates[0]),
          	draggable: false,
         	animation: google.maps.Animation.DROP,
          	icon: icon
      	}); 
      	 
      	marker.setMap(GoogleMap);
      	var infowindow = new google.maps.InfoWindow({
        	  content: tweet.text
      	});
      	google.maps.event.addListener(marker, 'click', function(){
        	infowindow.open(GoogleMap, marker);
      	});
	});

	socket.on('new-trends', function(trends){
		$scope.trends = trends;
	});
});