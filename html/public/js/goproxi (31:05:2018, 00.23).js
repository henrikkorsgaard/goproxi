(function (global) {

    var socket = null,
        here = null,
        self = null;

    var reconnect, attempts = 0,
        timeout = 1000;

    var eventListeners = {
        ready: [],
        updated: [],
        proximitychange: [],
        zonechange: [],
        joinedlocation: [],
        leftlocation: [],
        joined: [],
        left: []
    }

    var communications = {}
    var updates = 0;

    //we need to update

    goproxi = {
        addEventListener: function (eventName, handleFunction) {
            var events = eventName.split(" ")
            for(var i = 0, n = events.length; i < n ; i++){
                if (eventListeners.hasOwnProperty(events[i]) && typeof (handleFunction) === 'function') {
                    eventListeners[events[i]].push(handleFunction)
                }
            }
        },
        removeEventListener: function (eventName, handleFunction) {
            if (eventListeners.hasOwnProperty[eventName]) {
                //cant do that at all yet
            }
        },
        devices: [],
        locations: [],
        this: {},
        here: {}
    }

    function emmitEvent(event) {
        var listeners = eventListeners[event.type]
        for (var i = 0, n = listeners.length; i < n; i++) {
            listeners[i](event)
        }
    }

    function sendMessage(msg, callback) {
        msg.id = guid() + Date.now();
        communications[msg.id] = callback
        socket.send(JSON.stringify(msg))
    }

    function startUpdating(){
        setInterval(function(){
            updateData().then(function(){
                var evt = {
                    type: "updated"
                }
                emmitEvent(evt)
            }).catch(function(err){
                console.log(err)
            })
        }, 1000)
    }

    window.onload = function () {
        socket = new WebSocket("ws://here.local/ws");

        socket.onopen = function (e) {
            clearInterval(reconnect)
            attempts = 0;
            updateData().then(function(){
                for (var i = 0, n = goproxi.locations.length; i < n; i++) {
                    subscribe(goproxi.locations[i].mac).then(function () {

                    }).catch(function (err) {
                        console.log(err)
                    });
                }
                
                var evt = {
                    type: "ready"
                }
                emmitEvent(evt)
                startUpdating()
            }).catch(function(err){
                console.log(err)
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
            if (data.id && communications.hasOwnProperty(data.id)) {
                var fn = communications[data.id]
                delete communications[data.id]

                fn(null, data)
            }

            if (data.hasOwnProperty("event")) {

                if (data.type == "DeviceEvent") {
                    goproxi.this = data.device
                }

                switch (data.event) {
                    case "DeviceChangedProximityZone":
                        var evt = {
                            type: "zonechange",
                            device: data.device,
                            location: data.location
                        }
                        emmitEvent(evt)
                        break
                    case "DeviceJoinedLocation":
                        var evt = {
                            type: "joinedlocation",
                            device: data.device,
                            location: data.location
                        }
                        emmitEvent(evt)
                        break
                    case "DeviceJoined":
                        var evt = {
                            type: "joined",
                            device: data.device,
                            location: data.location
                        }
                        emmitEvent(evt)
                        break
                    case "DeviceLeftLocation":
                        var evt = {
                            type: "leftlocation",
                            device: data.device,
                            location: data.location
                        }
                        emmitEvent(evt)
                        break
                    case "DeviceLeft":
                        var evt = {
                            type: "left",
                            device: data.device,
                            location: data.location
                        }
                        emmitEvent(evt)
                        break
                    default:
                        console.log(data)
                }
            }
        }
    }

    function updateData(){
        return new Promise(function (rs, rj) {
            Promise.all([updateHere(), updateThis(), updateDevices(), updateLocations()]).then(function (data) {
                
                for(var i = 0, n = data.length; i < n ; i ++){
                    var obj = data[i]
                    if(obj.request === "here"){
                        goproxi.here = obj.response;
                    } 
    
                    if(obj.request === "this"){
                        goproxi.this = obj.response;
                    }
    
                    if(obj.request === "devices"){
                        goproxi.devices = obj.response;
                    }
    
                    if(obj.request === "locations"){
                        goproxi.locations = obj.response;
                    }
                }

                rs()
                

            }).catch(function(err){
                rj(err)

            })
        });
    }

    function updateHere() {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "here"
            }, function (err, data) {
                if (err) {
                    rj(err)
                };

                rs(data)
            })
        });
    }

    function updateDevices() {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "devices"
            }, function (err, data) {
                if (err) {
                    rj(err)
                };

                rs(data)
            })
        });
    }

    function updateLocations() {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "locations"
            }, function (err, data) {
                if (err) {
                    rj(err)
                };

                rs(data)
            })
        });
    }

    function updateThis() {
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

    function subscribe(mac) {
        return new Promise(function (rs, rj) {
            sendMessage({
                "request": "subscribe",
                "mac": mac
            }, function (err, data) {
                if (err) {
                    rj(err)
                };
                rs(data.response)
            })
        });
    }

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '';
    }

    this.goproxi = goproxi;

})(this)