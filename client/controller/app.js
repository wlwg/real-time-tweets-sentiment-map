var module = angular.module('app', []);

module.factory('socket', function($rootScope){
    var socket = io.connect(window.location.href);
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
		zoom: 2,
		minZoom: 2
	}
	var map = new google.maps.Map($('#map-canvas')[0], mapOptions);
	google.maps.event.addDomListener(window, "resize", function() {
		var center = map.getCenter();
		google.maps.event.trigger(map, "resize");
		map.setCenter(center); 
	});
	return map;
});

module.controller('MapController', function($scope, GoogleMap, socket){
	
	var keyword = null;
	var markers = [];
	$scope.keyword = null;
	$scope.stopBtnValue = 'Stop';
	$scope.trends = [];

	$scope.RestartBtnClick = function(){
		for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        markers = [];
		keyword = $scope.keyword.trim();
	}

	$scope.StopBtnClick = function(){
		if($scope.stopBtnValue === 'Stop')
			$scope.stopBtnValue = 'Continue';
		else
			$scope.stopBtnValue = 'Stop';
	}

	socket.on('connected', function(){
		socket.emit('start-streaming');
		socket.emit('get-trends');
	});
	socket.on('new-tweet', function(tweet){
		if($scope.stopBtnValue === 'Stop' &&
			(!keyword || keyword.length === 0 
				|| tweet.text.toLowerCase().indexOf(keyword.toLowerCase()) > -1))
		{
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
	      	markers.push(marker);

	      	var info = '<div class="row text-center tweet-info-window">'
	      				+	'<div class="col-sm-2 text-center">' 
	      				+		'<img class="img-responsive" src=' + tweet.user.profile_image_url + '></img>'
	      				+	'</div>'
	      				+	'<div class="col-sm-10 text-left">' 
	      				+		'<p>' + '@' + tweet.user.name + '</p>'
	      				+ 		'<p><strong>' + tweet.text + '</strong></p>'
	      				+ 		'<p>' + tweet.created_at + '<br>';
	      	if(tweet.place.name) info += tweet.place.name + ', ';
	      	info += tweet.place.country + '</p></div></div>';

	      	var infowindow = new google.maps.InfoWindow({
	        	  content: info,
	        	  maxWidth: 350
	      	});
	      	google.maps.event.addListener(marker, 'click', function(){
	        	if(infowindow.getMap() !== null) 
	        		infowindow.close(); 
	        	else 
	        		infowindow.open(GoogleMap, marker);
	      	});
      	}
	});

	socket.on('new-trends', function(trends){
		$scope.trends = trends;
	});
});