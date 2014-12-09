/**
 * # Global logging module
 *
 * This is a global set of hooks that catch all $log messages sent out by the
 * application. Currently they are simply passed off directly to console.log
 * but this could be updated later to allow them to be stored locally, sent to
 * a server etc.
 *
 * https://gist.github.com/lrvick/6938531
 *
 */

angular.module('ngLogging', []);


angular.module('ngLogging').config(function ($provide) {
    $provide.decorator('$log', function ($delegate, Logging, $routeParams) {

        var methods =
        { error: function () {
            if (Logging.enabled) {
                $delegate.error.apply(null, arguments);
                Logging.error.apply(null, arguments);
            }
        }, log: function () {
            if (Logging.enabled) {
                $delegate.log.apply(null, arguments);
                Logging.log.apply(null, arguments);
            }
        }, info: function () {
            if (Logging.enabled) {
                $delegate.info.apply(null, arguments);
                Logging.info.apply(null, arguments);
            }
        }, warn: function () {
            if (Logging.enabled) {
                $delegate.warn.apply(null, arguments);
                Logging.warn.apply(null, arguments);
            }
        }, debug: function () {
            if (Logging.enabled) {

                var info = 'GAMEDATA_'+arguments[0] + '[' + $routeParams.game_id + ']';
                for (var i = 1, lngth = arguments.length; i < lngth; i++ ){
                    var argument = arguments[i];
                    if(i < 2){
                        argument = '['+ argument + ']';
                    } else{
                        argument = ' ' + JSON.stringify(argument);
                    }
                    info += argument.replace(/\\\"/g,'\"');
                }

                $delegate.debug.apply(null, [info]);
                Logging.debug.apply(null, [info]);
            }
        }
        };

        return methods

    });

});


angular.module('ngLogging').service
('Logging'
    , function () {
        var $injector = angular.injector(['ng']);
        var service =
        { error: function () {
            self.type = 'error';
            log.apply(self, arguments)
        }, warn: function () {
            self.type = 'warn';
            log.apply(self, arguments)
        }, debug: function () {
            self.type = 'debug';
            log.apply(self, arguments)
        }, info: function () {
            self.type = 'info';
            log.apply(self, arguments)
        }, log: function () {
            self.type = 'log';
            log.apply(self, arguments)
        }, enabled: false, logs: [], log_debug: []
        };


        var log = function () {

            args = [];
            angular.forEach(arguments, function (arg) {
                if (typeof arg === 'object') {
                    arg = JSON.stringify(arg);
                }
                args.push(arg);
            });
            var dd = new Date();
            var hh = dd.getHours();
            var mm = dd.getMinutes();
            var ss = dd.getSeconds();
            var ms = dd.getMilliseconds();

            var logItem =
            { time: hh + ":" + mm + ":" + ss + ":" + ms, message: args.join('\n'), type: type
            };

            if(type === 'debug'){
                service.log_debug.push(logItem);
            } else{
                service.logs.push(logItem);
            }

/*
            var _$rootScope = $injector.get('$rootScope');

            var _$timeout = $injector.get('$timeout');


            _$timeout(function () {
                    _$rootScope.$broadcast('log', logItem)
                }
                , 0
            )*/
        };

        return service

    });
