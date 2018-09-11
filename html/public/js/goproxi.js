; (function (global) {

    var socket, reconnect, attempts = 0,
        timeout = 1000;

    var communications = {}
    var locations = {} //locations seen by the device
    var proximity = {} //proximity ->
    var devices = {} //devices within proximity


    var deviceObserver = {
        on: function (event, handler) {
            var events = event.split(" ")
            for (var i = 0, n = events.length; i < n; i++) {
                if (deviceListeners.hasOwnProperty(events[i]) && typeof (handler) === 'function') {
                    deviceListeners[events[i]].push(handler);
                } else {
                    handler("Error: Unknown event type " + event);
                }
            }
        },
        locations: [],
        device: {},
        proximity: proximity,
    };

    var locationObserver = {
        on: function (event, handler) {
            var events = event.split(" ");
            for (var i = 0, n = events.length; i < n; i++) {
                if (locationListeners.hasOwnProperty(events[i]) && typeof (handler) === 'function') {
                    locationListeners[events[i]].push(handler)
                } else {
                    handler("Error: Unknown event type " + event)
                }
            }
        },
        devices: [],
        location: proximity,
        ping: function (mac) {
            sendMessage({
                "request": "ping",
                "mac": mac,
                "payload": "Hello"
            }, function (err, data) { });
        },
        broadcast: function (mac, url) {
            if (ValidURL(url)) {
                sendMessage({
                    "request": "broadcast",
                    "mac": mac,
                    "url": url
                }, function (err, data) { });
            } else {
                emmitError({ error: "Invalid Url" }, "place")
            }
        }
    };
    

    //TODO: Reach to events

    socket = new WebSocket("ws://here.local:1337/ws");
    socket.onerror = function (e) {
        console.log(e)
    }

    socket.onopen = function (e) {
        console.log("GoProxi websocket open")
        clearInterval(reconnect)
        attempts = 0;
        fetchLocations().then(function (data) {
            for(var i = 0, n = data.response.length; i < n; i++){
                var l = data.response[i]
                locations[l.mac] = l;
            }

            deviceObserver.locations = Object.keys(locations).map(function(k) { return locations[k] });

            fetchClient().then(function (data) {
                for(var i = 0, n = data.response.locations.length; i < n; i++){
                    var l = data.response.locations[i]
                    locations[l.mac].signal = l.signal;
                }
    
                delete data.response.locations
                deviceObserver.device = data.response
                
                fetchProximity().then(function (data) {
                    
                    var signal = 0;
                    var devicesArr = data.response.devices
                    for(var i = 0, n = devicesArr.length; i < n; i++){
                        var d = devicesArr[i]
                        devices[d.mac] = d;
                        if(d.mac === self.mac){
                            signal = d.signal;
                        }
                    }
                    
                    locationObserver.devices = Object.keys(devices).map(function(k) { return devices[k] });                    
        
                    delete data.response.devices
                    
                    deviceObserver.proximity = data.response
                    deviceObserver.proximity.signal = signal
                    var evt = {
                        type: "ready"
                    };
                    
                    emmitLocationEvent(evt);
                    emmitDeviceEvent(evt);
                })
            });
        });
    }

    socket.onclose = function (e) {
        console.log("Goproxi: Websocket connection closed. Attempting to reconnect!");
        for (var k in communications) {
            communications[k]("Websocket connection closed!");
        }
        reconnect = setInterval(function () {
            attempts++;
        }, timeout * attempts);
    }

    socket.onmessage = function (e) {
        data = JSON.parse(e.data);

        if (data.hasOwnProperty("event")) {
    
            var evt = {
                type: data.event,
                device: data.device,
                location: data.location
            }

            if (data.type === "DeviceEvent") {

                if (data.event === "DeviceChangedProximityZone") {
                    
                    emmitDeviceEvent(evt);
                } else if (data.event === "Ping") {
                    delete evt.location
                    delete evt.device
                    evt.sender = data.sender;
                    evt.receiver = data.receiver;
                    evt.payload = data.payload;

                    emmitDeviceEvent(evt);
                } else if (data.event === "DeviceChangedProximity") {
                    updateLocation().then(function () {
                        emmitDeviceEvent(evt);
                    }).catch(function (err) {
                        console.log(err);
                    })
                } else if (data.event === "Broadcast") {
                    delete evt.location
                    delete evt.device
                    evt.sender = data.sender;
                    evt.url = data.url;
                    emmitDeviceEvent(evt);
                } else if (data.event === "DeviceSignalChange"){
                    evt.signal = data.signal
                    locations[evt.location.mac].signal = evt.signal
                    deviceObserver.locations = Object.keys(locations).map(function(k) { return locations[k] });
                    emmitDeviceEvent(evt);
                }
            } else if (data.type === "LocationEvent") {
                
                if (data.event === "DeviceChangedProximityZone" || data.event === "DeviceJoinedLocation" || data.event === "DeviceLeftLocation") {
                    emmitLocationEvent(evt);
                } else if (data.event === "DeviceJoined" || data.event === "DeviceLeft") {
                    emmitPlaceEvent(evt);
                } else if (data.event === "Broadcast") {
                    delete evt.location
                    delete evt.device
                    evt.sender = data.sender;
                    evt.url = data.url;
                    emmitLocationEvent(evt);
                }
            }
            //we can filter for location events vs device events
        } else if (data.id && communications.hasOwnProperty(data.id)) {
            var fn = communications[data.id];
            delete communications[data.id];

            fn(null, data);
        }
    }

    function emmitDeviceEvent(event) {
        if (deviceListeners.hasOwnProperty(event.type)) {
            var listeners = deviceListeners[event.type]
            for (var i = 0, n = listeners.length; i < n; i++) {
                listeners[i](event);
            }
        } else {
            console.log("Error: Unknown event type " + event.type)
        }
    }

    function emmitLocationEvent(event) {
        if (locationListeners.hasOwnProperty(event.type)) {
            var listeners = locationListeners[event.type]
            for (var i = 0, n = listeners.length; i < n; i++) {
                listeners[i](event);
            }
        } else {
            console.log("Error: Unknown event type " + event.type);
        }

    }

    function emmitError(err, scope) {
        if (scope === "place") {
            var listeners = placeListeners["Error"]
            for (var i = 0, n = listeners.length; i < n; i++) {
                listeners[i](err);
            }
        }

        if (scope === "location") {
            var listeners = placeListeners["Error"]
            for (var i = 0, n = listeners.length; i < n; i++) {
                listeners[i](err);
            }
        }

        if (scope === "device") {
            var listeners = placeListeners["Error"]
            for (var i = 0, n = listeners.length; i < n; i++) {
                listeners[i](err);
            }
        }
    }

    function sendMessage(msg, callback) {
        msg.id = guid() + Date.now();
        communications[msg.id] = callback;
        socket.send(JSON.stringify(msg));
    }

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '';
    }

    function updateLocation() {
        return new Promise(function (rs, rj) {
            unsubscribeLocation(deviceObserver.proximity.mac);
            fetchProximity().then(function (data) {
                var signal = 0;
                for(var i = 0, n = data.response.devices.length; i < n; i++){
                    var d = data.response.devices[i]
                    devices[d.mac] = d;
                    if(d.mac === self.mac){
                        signal = d.signal;
                    }
                }

                devicesArray = Object.keys(devices).map(function(k) { return devices[k] });                    
    
                delete data.response.devices
                proximity = data.response
                proximity.signal = signal

            }).catch(rj)
        })
    }

    function fetchClient() {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "self"
            }, function (err, data) {
                if (err) {
                    rj(err);
                }
                rs(data);
            })
        });
    }

    function fetchProximity() {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "proximity"
            }, function (err, data) {
                if (err) {
                    rj(err);
                }
                rs(data);
            });
        });
    }

    function fetchLocations() {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "locations"
            }, function (err, data) {
                if (err) {
                    rj(err);
                }
                rs(data);
            });
        });
    }


    function subscribeLocation(mac) {
        sendMessage({
            "request": "subscribe",
            "mac": mac
        }, function (err, data) { });
    }

    function unsubscribeLocation(mac) {
        sendMessage({
            "request": "unsubscribe",
            "mac": mac
        }, function (err, data) { });
    }

    var locationListeners = {
        "ready": [],
        "DeviceChangedProximityZone": [],
        "DeviceJoinedLocation": [],
        "DeviceLeftLocation": [],
        "Broadcast": [],
        "Error": []
    };

    var deviceListeners = {
        "ready": [],
        "DeviceChangedProximityZone": [],
        "DeviceChangedProximity": [],
        "Ping": [],
        "Broadcast": [],
        "DeviceSignalChange": [],
        "Error": []
    };

    


    goproxi = {
        DeviceObserver: deviceObserver,
        LocationObserver: locationObserver
    };

    function ValidURL(str) {
        regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
        if (regexp.test(str)) {
            return true;
        }
        else {
            return false;
        }
    }

    //load and add to ping

    this.goproxi = goproxi;
})(this);