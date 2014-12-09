/// conector.js

//(function () {
    'use strict';
    //var module = angular.module('chessSiteServices');


/*    module.provider('Connector', function () {
        var injector = angular.injector(['ng']);
        var $log = injector.get('$log');
        var $rootScope = injector.get('$rootScope');

        this.$get = function () {
            return {
                start: function (url, auth, target) {
                    var C = new CNN();
                    C.polling.onConnected = function (t) {
                        console.log(t);
                    }
                    C.polling.onSlowInternet = function () {
                        console.log('onSlowInternet');
                    }
                    C.start(url, auth, target);
                    C.connect();
                    return  'ok';
                }
            }

        };*/



        var CNN = function ($log, $rootScope) {
            /// common
            var VERSION = 0;
            var _logTimer = (new Date()).getTime();
            this.WHITE = 0;
            this.BLACK = 1;
            this.VIEWER = 2;
            this.$log = $log;
            this.$rootScope = $rootScope;
            this.polling = new $$Polling(this);
            this.sockjs = new $$Sockjs(this);
        };

        CNN.prototype = {
            //callback
            onOpen: function () {
            },
            onClose: function () {
            },
            onFail: function () {
            },
            onMessage: function (com, par, t) {
            },

            //api
            start: function (url, auth, target) {
                this.initData = $.extend({target: JSON.stringify(target)},
                    auth);
                this.sockjs.initData = this.polling.initData = this.initData;
                this.sockjs.url = this.polling.url = this.url = url;

                this.polling.onFail = function () {
                    this.stop();
                    this.onFail();
                };
                this.polling.onClose = this.onClose;
            },
            connect: function (options) {
                this.$log.info('CNN.connect()');
                this.stop();
                options = options || {};
                this.polling.delay = options.polling_delay || this.polling.DEFAULT_DELAY;

                this.cur = this.polling;

                var that = this;
                this.polling.onOpen = function () {
                    this.CNN.onOpen();
                    that.polling.onOpen = this.onOpen;
                    this.CNN.$log.info('polling open. Delay before parallel connecting to sockjs');
                    setTimeout(function () {
                        that.$log.info('parallel connecting to sockjs');
                        that.sockjs.onOpen = function () {
                            that.$log.info('connected to sockjs. delay before switchToSockjs');
                            var t = setTimeout(function () {
                                that.switchToSockjs();
                            }, 3000);
                            that.sockjs.onFail = that.sockjs.onClose = function () {
                                that.$log.info('parallel connecting to sockjs failed. Clear timer');
                                clearTimeout(t);
                                that.sockjs.stop();
                            };
                        };
                        that.sockjs.onFail = that.sockjs.onClose = function () {
                            that.$log.info('parallel connecting to sockjs failed');
                            that.sockjs.stop();
                        };
                        that.sockjs.connect();
                    }, 1000);
                };


                this.polling.onReqDone = function () {
                };

                this.polling.connect();
            },
            send: function (command, params) {
                this.cur.send(command, params);
            },
            stop: function () {
                this.sockjs.stop();
                this.polling.stop();
            },
            switchToSockjs: function () {
                var that = this;
                this.$log.info('switchToSockjs', this.polling.requests);

                if (this.polling.requests == 0)
                    this.sw();
                else {
                    this.polling.onReqDone = function (req) {
                        this.CNN.$log.info('onReqDone', req);
                        if (req == 0)
                            that.sw();
                    };
                    this.sockjs.onClose = this.sockjs.onFail = function () {
                        cancel('sockjs fail');
                    };
                }
            },
            sw: function () {
                //return;//uncomment it for debug
                var state = this.sockjs.state();
                this.$log.info('switchToSockjs: sw()', state);
                if (state == this.sockjs.OPEN) {
                    this.polling.stop();
                    this.sockjs.onOpen = this.onOpen;
                    this.sockjs.onClose = this.onClose;
                    this.sockjs.onFail = function () {
                        this.connect();
                    };
                    this.cur = this.sockjs;
                    this.send("join");
                } else {
                    this.cancel('sockjs not open ' + state);
                }
            },
            cancel: function (reason) {
                this.$log.info('switchToSockjs: cancel: ', reason);

                this.sockjs.stop();
                this.polling.onReqDone = function () {
                };
            },

            //vars
            url: null,
            cur: null,// sockjs | polling
            target: null,
            initData: null
        };

        //classes
        var $$Sockjs = function (t) {
            this.CNN = t;
        };

        $$Sockjs.prototype = {
            // settings
            enabled: 1,
            reconnectDelay: 2000,
            maxReconnects: 2,
            reconnects: 0,
            confirmDelay: 3000,
            confirmCount: 3,
            pingDelay: 30000,
            protocols_whitelist: false, //all

            //vars
            socket: null,
            pingTimer: null,
            outs: {},// outs[id] = {"json":json, "msec":int, "timer":object}
            id: -1,//negative int
            sendOnOpen: [], //[json]
            onOpen: function () {
            },
            onClose: function () {
            },
            onFail: function () {
            },

            //consts
            CONNECTING: SockJS.CONNECTING,
            OPEN: SockJS.OPEN,
            CLOSING: SockJS.CLOSING,
            CLOSED: SockJS.CLOSED,

            state: function () {
                if (this.socket)
                    return this.socket.readyState;
                else
                    return this.CLOSED;
            },

            socket_onerror: function (e) {
                this.CNN.$log.info('SockJS error', this.socket.protocol, arguments);
            },
            socket_onopen: function () {
                this.CNN.$log.info('SockJS open', this.socket.protocol);
                this.protocols_whitelist = [this.socket.protocol];
                this.id = -1;
                this.send("auth", $.extend({"join": this.reconnects ? 1 : 0}, this.initData));
            },
            socket_onclose: function (e) {
                this.CNN.$log.info('SockJS close', this.socket.protocol, this.state(), '' + e);
                this._clearTimers();
                if (!this.enabled) {
                    this.CNN.$log.info('SockJS disabled. So, don\'t reconnect');
                    return;
                }
                if ((this.reconnects >= this.maxReconnects) || e.code == 1002 || e.reason == "WebSocket connection broken" || (e.reason == "All transports failed" && this.protocols_whitelist == false) || e.reason == "Polling error (permanent)") {
                    this.enabled = 0;
                    this.CNN.$log.info('SockJS failed. //', this.socket.protocol);
                    this.onFail();
                } else {
                    this.onClose();
                    if (e.reason == "All transports failed")
                        this.protocols_whitelist = false;
                    if (!this.enabled)
                        return;
                    var delay = this.reconnects ? this.reconnectDelay : 0;
                    this.reconnects++;
                    this.CNN.$log.info('SockJS delay before reconnect', delay);
                    var that = this;
                    setTimeout(function () {
                        that.reconnect();
                    }, delay);
                }
                ;
            },
            socket_onheartbeat: function () {
                this.CNN.$log.info('SockJS: heartbeat');
                this._updatePingTimer();
            },
            socket_onmessage: function (e) {
                var jsonStr = String(e.data);
                this.CNN.$log.info('SERVER: ' + jsonStr);
                this._updatePingTimer();
                var json = JSON.parse(jsonStr);
                if (json.com == "ok") {
                    var id = json.par.id;
                    if (this.outs[id]) {
                        clearInterval(this.outs[id].timer);
                        delete this.outs[id];
                    } else {
                        this.CNN.$log.info('SockJS: undefined confirm from SERVER ', id);
                    }
                    if (id == -1) {
                        //auth
                        this.onOpen();
                        this._resend();
                    }

                } else {
                    this.CNN.onMessage(json.com, json.par, json.t);
                }
            },
            _updatePingTimer: function () {
                if (this.pingTimer)
                    clearTimeout(this.pingTimer);
                var that = this;
                this.pingTimer = setTimeout(function () {
                    this.CNN.$log.info("SOCKET: heartbeat timeout");
                    that.socket.close();
                }, this.pingDelay);
            },
            _clearTimers: function () {
                if (this.pingTimer)
                    clearTimeout(this.pingTimer);
                for (var id in this.outs) {
                    clearInterval(this.outs[id].timer);
                    if (id == -1) {
                        //don't resend auth
                        continue;
                    }
                    this.sendOnOpen.push(this.outs[id].json);
                }
                this.outs = {};
            },
            _resend: function () {
                var that = this;
                $.each(this.sendOnOpen, function (k, json) {
                    that.send(json.com, json.par);
                });
                this.sendOnOpen.splice(0);
            },
            _onConfirmTimeout: function (json) {
                var that = this;
                return function () {
                    if (json.tr < that.confirmCount) {
                        json.tr++;
                        var jsonStr = JSON.stringify(json);
                        that.socket.send(jsonStr);
                        this.CNN.$log.info('SockJS CLIENT(' + json.tr + '):', jsonStr);
                    } else {
                        this.CNN.$log.info('SockJS no confirm CLIENT:', json.id);
                        that.socket.close();
                    }
                };
            },
            send: function (command, params, ignoreNoConfirm) {
                var json = {"com": command};
                if (params)
                    json["par"] = params;
                if (this.state() == this.OPEN) {
                    json.id = this.id--;
                    json.tr = 1;
                    if (!ignoreNoConfirm) {
                        this.outs[json.id] =
                        {"json": json,
                            "timer": setInterval(this._onConfirmTimeout(json), this.confirmDelay)};
                    }
                    var jsonStr = JSON.stringify(json);
                    if (command !== "ok")
                        this.CNN.$log.info('SockJS CLIENT:', jsonStr);
                    this.socket.send(jsonStr);
                } else if (!ignoreNoConfirm) {
                    this.sendOnOpen.push(json);
                    this.CNN.$log.info('SockJS offline CLIENT:', JSON.stringify(json));
                }
            },
            connect: function () {
                this._connect(true);
            },
            reconnect: function () {
                this._connect(false);
            },
            _connect: function (first) {
                if (first) {
                    this.enabled = 1;
                    this.reconnects = 0;
                }
                var st = this.state();
                if (st == this.CONNECTING || st == this.OPEN) {
                    this.CNN.$log.info('SockJS second connecting (error)', this.state());
                    return;
                }
                if (this.socket) {
                    this.socket.onopen = null;
                    this.socket.onclose = null;
                    this.socket.onmessage = null;
                    this.socket.onerror = null;
                    this.socket.onheartbeat = null;
                }
                this.socket = new SockJS(this.url + '/sockjs/', null, {protocols_whitelist: this.protocols_whitelist});
                if (!this.socket) {
                    debugLog('no SockJS obj');
                    this.onFail();
                    return;
                }
                this.socket._options.debug = true;
                var that = this;
                $.each(['open', 'message', 'close', 'error', 'heartbeat'],
                    function (index, name) {
                        that.socket['on' + name] = function () {
                            that['socket_on' + name].apply(that, arguments);
                        };
                    });
                this.CNN.$log.info('SockJS connecting', this.protocols_whitelist, this.state());
            },
            close: function () {
                this.socket && this.socket.close();
            },
            stop: function () {
                if (this.enabled)
                    this.send('quit', null, 1);
                this.enabled = 0;
                this.close();
            }
        };

        var $$Polling = function (t) {
            this.CNN = t;
        };
        $$Polling.prototype = {
            //consts
            DEFAULT_DELAY: 3000,
            AJAX_TIMEOUT: 10000,
            maxReconnects: 2,
            reconnects: 0,
            lostMessage: 0,
            sessionSend: false,
            sessionError: false,
            // vars
            session: false,// false | {sid:SESSION}
            sessionNum: 0,
            delay: null,
            requests: 0,//active requests
            reqNum: 0,//req num for cur session
            onOpen: function () {
            },
            onClose: function () {
            },
            onFail: function () {
            },
            onReqDone: function () {
            },
            onErrorSession: function(){
            },
            //new
            onConnected: function (t) {
            },
            onSlowInternet: function () {
            },

            //timer
            enabled: 0,
            timer: null,
            startTimer: function () {
                if (!this.enabled || this.timer || this.requests)
                    return;
                var that = this;
                this.timer = setTimeout(function () {
                    that.timer = false;
                    that.send('ping');
                }, this.delay);
            },

            // api
            send: function (command, params) {
                if (!this.enabled) return;
                if(command == 'turn' || command == 'msg'){
                    this.lostMessage = {com: command, par: params};
                }
                var secure = this.url;
                if (location.protocol === 'http:') {
                    secure = this.url.replace('//gs', '//p' + this.sessionNum + '.gs');
                }

                this.reqNum++;
                if(command !== "ping") {
                    this.CNN.$log.debug('OUT', command, params);
                }
                if(command == "session"){
                    this.sessionSend = true;
                }
                var jqXHR = $.ajax({url: secure + '/polling/' + command,
                    timeout: this.AJAX_TIMEOUT,
                    data: $.extend($.extend({req: this.reqNum},
                        params || {}),
                        this.session || {}),
                    dataType: 'jsonp',
                    beforeSend: this._beforeSend,
                    success: this._success,
                    error: this._error,
                    context: this
                });
            },
            _beforeSend: function (jqXHR, o) {
                this.requests++;
                jqXHR.sessionNum = this.sessionNum;
                jqXHR.reqNum = this.reqNum;
                this.CNN.$log.info('Polling #' + jqXHR.sessionNum + '/' + jqXHR.reqNum + ' CLIENT', o.url);//TODO rm jquery vars
                if (this.timer) {
                    clearTimeout(this.timer);
                    this.timer = false;
                }
            },
            _success: function (json, status, jqXHR) {
                this.onReqDone(--this.requests);
                var info = [], lngth = 0;
                if(json.open) {
                    info = json.open;
                } if(json.close){
                    info = json.close;
                }
                lngth = info.length;
                if(lngth){
                    for(var i = 0; i < lngth; i++){
                        this.CNN.$log.debug('IN', info[i].com, info[i].par, info[i].t);
                    }

                }

                this.CNN.$log.info('Polling #' + jqXHR.sessionNum + '/' + jqXHR.reqNum + ' SERVER', this.requests, this.enabled ? 'enabled' : 'disabled', JSON.stringify(json));
                if(json.open){
                    this.enabled = 1;
                }
                if (jqXHR.sessionNum != this.sessionNum || !this.enabled)  return;
                var list, time = json.t;
                var that = this;
                angular.forEach(json.close || json.open || [], function (msg, key) {
                    if (msg.com == "session") {
                        this.sessionSend = false;
                        this.sessionError = false;
                        //old res.onConnected
                        this.onConnected((new Date()).getTime() - this.connectingStart);//test speed
                        this.session = {sid: msg.par.sid};
                        if (json.open)
                            this.onOpen();
                        return;
                    } else if (msg.com == "error" && msg.par.code == 14) {
                        //bad session
                        that.onClose();
                        that.connect(true);
                        return;
                    }
                    this.CNN.onMessage(msg.com, msg.par, time);// - msg.t);
                }, that);

                if (json.close !== undefined) {
                    this.stop();
                    //ui.progress.archivedGame(); //TODO: fix bad session and redirect to archived game
                } else {
                    this.startTimer();
                }

            },
            _error: function (jqXHR, status, error) {

                if(this.sessionSend === true && !this.sessionError){
                    this.onErrorSession();
                    this.sessionError = true;
                }

                if (!this.session) {//test speed
                    if (status == 'timeout') {
                        //old res.onConnected
                        this.onConnected(-this.AJAX_TIMEOUT);
                    }
                    else {
                        //old res.onConnected
                        this.onConnected(-((new Date()).getTime() - this.connectingStart));//test speed
                    }

                }
                this.CNN.$log.info('Polling #' + jqXHR.sessionNum + '/' + jqXHR.reqNum + ' ERROR', status, error, this.enabled ? 'enabled' : 'disabled', this.session || 'nosession', this.sessionNum);
                if (jqXHR.sessionNum != this.sessionNum) return;
                this.onReqDone(--this.requests);
                if (!this.enabled) return;
                if (status == "timeout" && (this.reconnects >= this.maxReconnects) || status == "parsererror") {
                    this.stop();
                    this.CNN.$log.info("Polling failed");
                    this.onFail();
                } else {
                    this.onClose();
                    this.reconnect();
                }
            },
            connect: function () {
                this._connect(true);
            },
            reconnect: function () {
                this.reconnects++;
                this._connect(false);
            },
            _connect: function (first) {
                this.connectingStart = (new Date()).getTime();//test speed
                this.sessionNum++;
                this.requests = 0;
                this.reqNum = 0;
                this.CNN.$log.info('polling.connect', first);
                if (first) {
                    this.reconnects = 0;
                    this.enabled = 1;
                }
                this.session = false;
                this.send('session', $.extend({rnd: String(Math.random()).slice(2)}, this.initData));
                //check internet
                var that = this;
                /*setTimeout(function () {
                    if (!that.session) {
                        //old res.onSlowInternet
                        this.onSlowInternet();
                    }
                }, 500);//it should be less than 1000 (Delay before parallel connecting to sockjs)*/
            },
            stop: function () {
                if (this.enabled && this.session)
                    this.send('quit');
                this.enabled = 0;
                this.timer && clearTimeout(this.timer);
                this.session = false;
            }
        };//Polling

    //module.service('Connector', ['$log', '$rootScope', CNN]);

    //}); // module

//})();