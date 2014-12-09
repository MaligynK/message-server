/*******
 *          Composition
 *              10.11.2014
 *              Malygin Konstantine
 * **********/

var app = angular.module('compositionsApp', [
    'ngRoute',
    'ngAnimate',
    'ngCookies',
    'restangular',
    'ui.bootstrap',
    'compositionsControllers',
    'compositionsServices'
]);


app.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider
            .when('/',
            {
                controller: 'CompositionBoardController',
                templateUrl: '/partials/compositionBoard.html'
            })
            .otherwise({ redirectTo: '/' });
    }
]);


app.config(function (RestangularProvider) {
    // convert json request to x-www-form-urlencoded request
    RestangularProvider.setFullRequestInterceptor(function (el, op, what, url, headers, params) {
        if (op === "put" || op === "post") {
            var res = "";
            _.forOwn(el, function (v, k) {
                if (!_.isFunction(v)) {
                    res += k + "=" + encodeURIComponent(v) + "&";
                }
            });
            return {
                headers : { "Content-Type": "application/x-www-form-urlencoded" },
                element : res.substr(0, res.length - 1),
                params  : {},
                httpConfig : {}
            }
        }
        return {
            headers : {},
            element : el,
            params  : params,
            httpConfig : {}
        };
    });

});

