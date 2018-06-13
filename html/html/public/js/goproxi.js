(function (global) {

    var socket, reconnect, attempts = 0,
        timeout = 1000;

    var communications = {}
    window.onload = function () {

        //TODO: Reach to events

        socket = new WebSocket("ws://here.local/ws");

        socket.onopen = function (e) {
            clearInterval(reconnect)
            attempts = 0;

            fetchThis().then(function (data) {

                var evt = {
                    type: "ready"
                }
                
                deviceObserver.proximity = data.response.proximity
                deviceObserver.locations = data.response.locations
                delete data.response.locations
                delete data.response.proximity
                deviceObserver.device = data.response

                emmitDeviceEvent(evt)
                fetchLocation(deviceObserver.proximity.mac).then(function(locationData){
                    locationObserver.devices = locationData.response.devices
                    delete data.response.devices
                    locationObserver.location = locationData.response
                    subscribeLocation(locationData.response.mac)
                    emmitLocationEvent(evt)
                }).catch(function(err){
                    console.log(err)
                })
            }).catch(function (err) {
                console.log(err);
            })
        }

        socket.onclose = function (e) {
            console.log("Goproxi: Websocket connection closed. Attempting to reconnect!")
            for (var k in communications) {
                communications[k]("Websocket connection closed!")
            }
            reconnect = setInterval(function () {
                attempts++;
            }, timeout * attempts)
        }

        socket.onmessage = function (e) {
            data = JSON.parse(e.data)

            if (data.hasOwnProperty("event")) {
                
                var evt = {
                    type: data.event,
                    device: data.device,
                    location:data.location
                }
                
                if (data.type === "DeviceEvent") {
                    if (data.event === "DeviceChangedProximityZone") {
                        emmitDeviceEvent(evt)
                    } else if (data.event === "DeviceChangedProximity") {
                        updateLocation().then(function(){
                            emmitDeviceEvent(evt)
                        }).catch(function(err){
                            console.log(err)
                        })
                    }
                } else if (data.type === "LocationEvent") {
                    if (data.event === "DeviceChangedProximityZone") {
                        emmitLocationEvent(evt)
                    } else if (data.event === "DeviceJoinedLocation") {
                        emmitLocationEvent(evt)
                    } else if (data.event === "DeviceLeftLocation") {
                        emmitLocationEvent(evt)
                    }
                }
                //we can filter for location events vs device events
            } else if (data.id && communications.hasOwnProperty(data.id)) {
                var fn = communications[data.id]
                delete communications[data.id]

                fn(null, data)
            }
        }

    }

    function emmitDeviceEvent(event) {
        if (deviceListeners.hasOwnProperty(event.type)) {
            var listeners = deviceListeners[event.type]
            for (var i = 0, n = listeners.length; i < n; i++) {
                listeners[i](event)
            }
        } else {
            console.log("Error: Unknown event type " + event.type)
        }
    }

    function emmitLocationEvent(event) {
        if (locationListeners.hasOwnProperty(event.type)) {
            var listeners = locationListeners[event.type]
            for (var i = 0, n = listeners.length; i < n; i++) {
                listeners[i](event)
            }
        } else {
            console.log("Error: Unknown event type " + event.type)
        }

    }

    function sendMessage(msg, callback) {
        msg.id = guid() + Date.now();
        communications[msg.id] = callback
        socket.send(JSON.stringify(msg))
    }

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '';
    }

    function updateLocation(){
        return new Promise(function (rs, rj) {
            unsubscribeLocation(deviceObserver.proximity.mac)
            fetchThis().then(function(data){
                
                deviceObserver.proximity = data.response.proximity
                deviceObserver.locations = data.response.locations
                delete data.response.locations
                delete data.response.proximity
                deviceObserver.device = data.response

                fetchLocation(deviceObserver.proximity.mac).then(function(locationData){
                    locationObserver.devices = locationData.response.devices
                    delete data.response.devices
                    locationObserver.location = locationData.response
                    subscribeLocation(locationData.response.mac)
                    rs()
                }).catch(rj)
            }).catch(rj)
        })
    }

    function fetchThis() {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "this"
            }, function (err, data) {
                if (err) {
                    rj(err)
                };
                rs(data)
            })
        });
    }

    function fetchLocation(mac) {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "location",
                "mac": mac
            }, function (err, data) {
                if (err) {
                    rj(err)
                };
                rs(data)
            })
        });
    }

    function subscribeLocation(mac) {
        sendMessage({
            "request": "subscribe",
            "mac": mac
        }, function (err, data) {})
    }

    function unsubscribeLocation(mac) {
        sendMessage({
            "request": "unsubscribe",
            "mac": mac
        }, function (err, data) {})
    }

    var locationListeners = {
        "ready": [],
        "DeviceChangedProximityZone": [],
        "DeviceJoinedLocation": [],
        "DeviceLeftLocation": []
    }

    var deviceListeners = {
        "ready": [],
        "DeviceChangedProximityZone": [],
        "DeviceChangedProximity": []
    }

    var deviceObserver = {
        on: function (event, handler) {
            var events = event.split(" ")
            for (var i = 0, n = events.length; i < n; i++) {
                if (deviceListeners.hasOwnProperty(events[i]) && typeof (handler) === 'function') {
                    deviceListeners[events[i]].push(handler)
                } else {
                    handler("Error: Unknown event type " + event)
                }
            }
        },
        locations: [],
        device: {},
        proximity: {},
    }

    var locationObserver = {
        on: function (event, handler) {
            var events = event.split(" ")
            for (var i = 0, n = events.length; i < n; i++) {
                if (locationListeners.hasOwnProperty(events[i]) && typeof (handler) === 'function') {
                    locationListeners[events[i]].push(handler)
                } else {
                    handler("Error: Unknown event type " + event)
                }
            }
        },
        devices: [],
        location: {}
    }

    goproxi = {
        DeviceObserver: deviceObserver,
        LocationObserver: locationObserver
    }

    this.goproxi = goproxi
})(this)