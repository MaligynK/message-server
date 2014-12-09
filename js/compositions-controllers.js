/*******
 *          Composition
 *              10.11.2014
 *              Malygin Konstantine
 * **********/

var compositionsControllers = angular.module('compositionsControllers', ['ui.bootstrap']);


compositionsControllers.controller('PromotionPopupController', [
    '$scope',
    '$modalInstance',
    'CompositionsDataService',
    function ($scope, $modalInstance, CompositionsDataService) {

        $scope.items = CompositionsDataService.items;
        $scope.selected = {
            item: $scope.items[0]
        };

        $scope.ok = function () {
            $modalInstance.close($scope.selected.item);
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    }]);

compositionsControllers.controller('CompositionHeadController', [
    '$scope',
    'CompositionsDataService',
    '$http',
    '$window',
    '$location',
    '$q',
    function($scope,
             CompositionsDataService,
             $http,
             $window,
             $location,
             $q) {


    }
]);

compositionsControllers.controller('GamePanelRightMessageController', [
    '$scope',
    'MessageService',
    '$http',
    '$window',
    '$location',
    '$modal',
    '$interval',
    '$rootScope',
    function($scope,
             MessageService,
             $http,
             $window,
             $location,
             $modal,
             $interval,
             $rootScope) {
        $scope.messages = MessageService.messages.sort(
            function(a, b){
                return b.time - a.time;
            }
        );

        $scope.message = $scope.messages[0];

        $scope.showPopup = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/popupMessages.html',
                controller: 'popupMessagesController'
            });
        };

        var count = 0;
        var send = $interval(function(){
            if(count>8){
                $interval.cancel(send);
            } else{
                count++;
                var time = new Date().getTime();
                $scope.message = {time: time, msg: 'Новое сообщение '+count, color: 0};
                $rootScope.$broadcast('Message',  $scope.message);
            }
        }, 5000)

    }
]);

compositionsControllers.controller('popupMessagesController', [
    '$scope',
    'MessageService',
    '$http',
    '$window',
    '$location',
    '$q',
    '$modalInstance',
    function($scope,
             MessageService,
             $http,
             $window,
             $location,
             $q,
             $modalInstance) {

        $scope.ok = function(){
            $modalInstance.close();
        };

        $scope.messages = MessageService.messages.sort(
            function(a, b){
                return a.time - b.time;
            }
        );

    }
]);




compositionsControllers.controller('CompositionBoardController', [
    '$scope',
    '$rootScope',
    '$routeParams',
    '$q',
    '$window',
    'CompositionsDataService',
    'Restangular',
    '$modal',
    '$log',
    function($scope,
             $rootScope,
             $routeParams,
             $q,
             $window,
             CompositionsDataService,
             Restangular,
             $modal,
             $log) {

        $scope.newTurn = 3;
        $scope.newFen='';
        $scope.message = '';
        $scope.variants = [];
        $scope.goodBoard = false;
        $scope.player = 'w'; //цвет игрока

		var variants, fenVal, turnVal,
            bestmove = 0, //счетчик указывающий сколько циклов fishing было завершено
            fish = CompositionsDataService.settingsFish.length,   //количество циклов fishing при анализе
            turn_count = 0, //количество оставшихся до мата ходов
            oponentMove = false; //ход игрока


///////////////FUNCTIONS!!!!!!!!!!!!!!!!!!!!!!!!!!!



        var compositionMessage = function (text, apply) {
            $scope.message = text;
            $scope.composition.fen_current = $scope.game.fen() + ' ' + $scope.player + ' - - 0 1';
            if(apply){
                $scope.$apply();
            }
        };


        //нельзя ходить чужими фигурами или во время мата и ничьей
        var onDragStartCompositionReady = function(source, piece, position, orientation) {
            if ($scope.game.in_checkmate() === true || $scope.game.in_draw() === true ||
                piece[0] !== $scope.player || oponentMove) {
                return false;
            }
        };


        //сделать ход противника
        var makeCompositionMove = function() {
            oponentMove = true;
            var engine = new Worker(CompositionsDataService.globalConfig.stockfishUrl);
            engine.postMessage('uci');
            engine.postMessage('ucinewgame');
            engine.postMessage('isready');
            engine.postMessage('setoption name MultiPV value 50');
            engine.postMessage('setoption name Skill Level value 20');
            engine.postMessage('position fen ' + $scope.game.fen());
            engine.postMessage('go depth 7');

            engine.onmessage = function (event) {
                var arr = event.data.split(' ');
                if(arr[0] === 'bestmove'){
                    var promotion = '';
                    var move = arr[1];
                    if (move) {
                        if (move.length > 4) {
                            promotion = move[4];
                        }
                        $scope.game.move({
                            from: move[0] + move[1],
                            to: move[2] + move[3],
                            promotion: promotion ? promotion : 'q'
                        });

                        $scope.board.position($scope.game.fen());
                        oponentMove = false;
                        $scope.composition.fen_current = $scope.board.fen() + ' ' + $scope.player + ' - - 0 1';
                        var possibleMoves = $scope.game.moves();

                        if($scope.game.in_draw()){
                            compositionMessage('Ничья - попробуйте снова!', true);
                        }else if (possibleMoves.length === 0) {
                            compositionMessage('Нет хода - попробуйте снова!', true);
                        }
                    }
                }
            }
        };


        var check = function (game, turn, apply){
            if($scope.game.in_draw()){
                compositionMessage('Ничья - попробуйте снова!', apply);
                return 0;
            } else if(turn_count >= 0) {
                if($scope.game.in_checkmate()){
                    compositionMessage('Вы победили!', apply);
                    return 0;
                } else if(turn_count === 0){
                    compositionMessage('Условие не выполнено - попробуйте снова!', apply);
                }
            } else {
                var possibleMoves = $scope.game.moves();
                if (possibleMoves.length === 0) {
                    compositionMessage('Нет хода - попробуйте снова!', apply);
                    return 0;
                }
            }
            return 1;
        };

        var onDropCompositionReady = function(source, target, piece, newPos) {
            var promotion = '';
            var possibleMoves = $scope.game.moves();
            if (possibleMoves.length === 0) {
                compositionMessage('У вас нет хода - попробуйте снова!', true);
                return;
            }

            if ((piece[1] === 'p' && possibleMoves.indexOf(target + '=q') > -1) || (piece[1] === 'P' && possibleMoves.indexOf(target+'=Q') > -1)) {
               // promotion = prompt('Выберите фигуру - q, b, r, n.', 'q');
                var modalInstance = $modal.open({
                    templateUrl: '/static/app/partials/gameMessagesPopup.html',
                    controller: 'PromotionPopupController',
                    resolve: {
                        items: function () {
                            return CompositionsDataService.items;
                        }
                    }
                });

                modalInstance.result.then(function (selectedItem) {
                    var p = ['q', 'n', 'r', 'b'];
                    promotion = p[CompositionsDataService.items.indexOf(selectedItem)];

                    var move = $scope.game.move({
                        from: source,
                        to: target,
                        promotion: promotion
                    });
                    if (move === null) {
                        return 'snapback';
                    }
                    turn_count--;
                    $scope.board.position($scope.game.fen());
                    if (turn_count > 0) {
                        compositionMessage('Осталось ' + turn_count + " ходов", false);
                    }
                    if (check ($scope.game, turn_count, false)){
                        makeCompositionMove();
                    }

                }, function () {
                    $log.info('Отмена хода: ' + new Date());
                });

            }else {

                var move = $scope.game.move({
                    from: source,
                    to: target,
                    promotion: 'q'
                });
                if (move === null) {
                    return 'snapback';
                }
                turn_count--;
                if (turn_count > 0) {
                    compositionMessage('Осталось ' + turn_count + " ходов", true);
                }
                $scope.board.position($scope.game.fen());

                if (check ($scope.game, turn_count, true)){
                    makeCompositionMove();
                }
            }

        };

        var onSnapEndCompositionReady = function() {
            $scope.board.position($scope.game.fen());
            $scope.composition.fen_current = $scope.game.fen() + ' ' + $scope.player + ' - - 0 1';
        };

        var onDropComposition = function(source, target, piece, newPos) {
            $scope.board.position(newPos);
            $scope.composition.fen_current = $scope.board.fen() + ' ' + $scope.player + ' - - 0 1';
            $scope.$apply();
        };


        var board = angular.element('#boardComposition');

        var initializeWindowSize = function () {  // FIX: ugly one, must be a better way
            var boardHeight = board.height();
            var boardWidthP = board.attr('style') ? parseInt(board.attr('style').replace( /^\D+/g, '')) : 100;
            var empiric = 120;
            var headerHeight = angular.element('#header').height();
            var messageHeight = angular.element('#idMessage').height();
            var settingboardHeight = angular.element('#settingsboard').height();
            var windowHeight = angular.element($window).height();
            if (!settingboardHeight){
                empiric += 100;
            }
            var widthPercent = (windowHeight - settingboardHeight - messageHeight - headerHeight - empiric) / boardHeight;
            widthPercent = parseInt((boardWidthP * widthPercent) / CompositionsDataService.globalConfig.zoom);
            if (widthPercent <= 100 && widthPercent > 0) {
                board.width(widthPercent + '%');
            }else if(widthPercent < 1) {
                board.width('1%');
            }else {
                board.width(parseInt(100 / CompositionsDataService.globalConfig.zoom) + '%');
            }
        };


        var createBoard = function () {
            var cfg = '';
            $scope.board ? $scope.board.destroy() : false;
            if ($scope.composition.ready < 2) {
                if($scope.composition.fen_current.indexOf('w') < 0){
                    $scope.player = 'b';
                }
                turn_count = $scope.composition.turns;
            }
            try {
                if ($scope.composition.id > 0) {
                    cfg = {
                        pieceTheme: '/static/app/vendor/chessboardjs/img/chesspieces/' + CompositionsDataService.globalConfig.pieceThemeName + '/{piece}.png',
                        draggable: true,
                        position: $scope.composition.fen_current,
                        orientation: ($scope.player == 'b')?'black':'white',
                        onDragStart: onDragStartCompositionReady,
                        onDrop: onDropCompositionReady,
                        onSnapEnd: onSnapEndCompositionReady
                    };

                } else {
                    cfg = {
                        pieceTheme: '/static/app/vendor/chessboardjs/img/chesspieces/' + CompositionsDataService.globalConfig.pieceThemeName + '/{piece}.png',
                        draggable: true,
                        position: $scope.composition.fen_current,
                        orientation: ($scope.player == 'b')?'black':'white',
                        onDrop: onDropComposition,
                        sparePieces: true
                    };
                }
            } catch(e){
                $log.error(e);
                cfg = '';
            }

            if (board.length > 0 && cfg) {

                $scope.board = new ChessBoard('boardComposition', cfg);
                initializeWindowSize();
                $scope.board.destroy();
                $scope.board = new ChessBoard('boardComposition', cfg);
                $scope.game = new Chess();
                $scope.game.load($scope.composition.fen_current);
            }
        };



        var currentComposition = function () {
            $scope.newDescription = $scope.composition.description;
            $scope.composition.player = ($scope.composition.first)?'Черные':'Белые';
            $scope.composition.fen_current = $scope.composition.fen;
            $scope.composition.ready = 1;
            createBoard();
        };





        $scope.setBoard = function(fen){
            if(fen && $scope.game.validate_fen(fen).valid){
                $scope.composition.fen_current = fen;
                $scope.message = '';
                createBoard();
            } else {
                $scope.message = 'Неверные данные';
            }
        };




        $scope.clearBoard = function(){
            $scope.composition.ready = 0;
            $scope.message = '';
            $scope.composition.fen_current = '8/8/8/8/8/8/8/8 ' + $scope.player + ' - - 0 1';
            createBoard();
        };

        $scope.revertBoard = function(){
            $scope.message = '';
            if($scope.composition.id > 0){
                $scope.composition.ready = 1;
            }
            $scope.composition.fen_current = $scope.composition.fen;
            createBoard();
        };

        $scope.startBoard = function(){
            $scope.composition.ready = 0;
            $scope.composition.fen_current = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR ' + $scope.player + ' - - 0 1';
            createBoard();
            $scope.message = '';
        };

        $scope.orientationBoard = function(){
            if($scope.player == 'w'){
                $scope.player = 'b';
                $scope.board.orientation('black');
            } else{
                $scope.player = 'w';
                $scope.board.orientation('white');
            }
            $scope.composition.fen_current = $scope.board.fen()  + ' ' + $scope.player + ' - - 0 1';
        }

//////////////////INITIALIZATION!!!!!!!!!!!!!!!!!!!!!!!

            //новая задача
            $scope.composition = {id: 0, ready: 0, turns: 4, fen_current: '8/8/8/8/8/8/8/8 w - - 0 1', fen: '8/8/8/8/8/8/8/8 w - - 0 1'};
            createBoard();




///////////////WATCH!!!!!!!!!!!!!!!!!

   /*     $scope.$on('$destroy', function(){    //не дает работать digest!!!
            angular.element($window).unbind();
        });*/

        angular.element($window).bind('resize', function () {
            if($scope.composition.ready){
                $scope.composition.ready = 2;
            }
            $scope.composition.fen_current = $scope.board.fen()  + ' ' + $scope.player + ' - - 0 1';
            createBoard();
        });

    }
]);


compositionsControllers.controller('CompositionsController', [
    '$scope',
    '$q',
    '$window',
    '$location',
    '$interval',
    '$rootScope',
    'Restangular',
    '$log',
    'CompositionsDataService',
    function ($scope,
              $q,
              $window,
              $location,
              $interval,
              $rootScope,
              Restangular,
              $log,
              CompositionsDataService) {

        var Images = [], chess_pieces = ['P', 'N', 'R', 'B', 'Q', 'K'],
            chessValue = 13,  //размер клетки
            boardValue = chessValue * 8,  //размер всей доски
            error = false; //статус ошибки получения данных
        $scope.list = 0;
        $scope.content = CompositionsDataService.content;
        $scope.compositions = [];

///////////////FUNCTIONS!!!!!!!!!!!!!!!!!!!!!!!!!!!

        $scope.filtration = function(value, index){
            if(!$scope.search){
                return true;
            }
            if(!value.info) {
                value.info = value.id + ' - '
                    + value.author_first_name + ' '
                    + value.author_last_name + ' ('
                    + value.turns + ' ';
                value.info += ($scope.compositions[j].turns > 4) ? 'ходов)' : 'хода)';
            }

            if(value.info.indexOf($scope.search) > -1){
                return true;
            }
            if(value.description.indexOf($scope.search) > -1){
                return true;
            }


        };


        $scope.showComposition = function(id){
            if(id){
                $location.path('/composition'+id);
            } else{
                $location.path('/add');
            }
        };

        function setImage(url, name) {
            var imageObj = angular.element(new Image());
            imageObj.bind('load', function () {
                Images[name] = imageObj[0];

            });
            imageObj[0].src = url;
        }

        function onImagesLoad(){
            if (error) {
                return;
            }
            for(var f = 0; f < $scope.compositions.length; f++){
                var fen = $scope.compositions[f].fen;
                var board_data = fen.split(' ')[0];
                var board_data = board_data.split('/');

                stage = new Kinetic.Stage({
                    container: 'img_container',
                    width: boardValue,
                    height: boardValue
                });

                layer = new Kinetic.Layer();

                var squares = new Kinetic.Image({
                    image: Images['board'],
                    width: boardValue,
                    height: boardValue,
                    x: 0,
                    y: 0,
                    draggable: false
                });
                layer.add(squares);

                for (var i = 0; i < 8; i++){
                    var j = 0, k = 0;
                    var row = board_data[i];
                    while(k < row.length){
                        var value = row[k];
                        k++;
                        if (value - parseFloat(value) >=0){
                            j += parseInt(value);
                        } else if (value.match(/r|n|b|q|k|p/)){
                            var black = new Kinetic.Image({
                                image: Images['b' + value.toUpperCase()],
                                width: chessValue,
                                height: chessValue,
                                x: j * chessValue,
                                y: i * chessValue,
                                draggable: false
                            });
                            j++;
                            layer.add(black);
                        } else if (value.match(/R|N|B|Q|K|P/)){
                            var white = new Kinetic.Image({
                                image: Images['w' + value],
                                width: chessValue,
                                height: chessValue,
                                x: j * chessValue,
                                y: i * chessValue,
                                draggable: false
                            });
                            j++;

                            layer.add(white);
                        }
                    }
                }
                stage.add(layer);
                $scope.compositions[f].imgs = layer.toDataURL("image/png");
            }
        }

        var getCompositions = function (settings) {
            var defer = $q.defer();
            error = false;
            defer.promise
                .then(function () {
                    return Restangular.all('compositions.get').post(settings);
                })
                .then(function (data) {
                    if(data.response && data.response.length){
                        $scope.compositions = data.response;
                        return;
                    } else {
                        $log.info(data.error);
                        return error = true;
                    }
                });
            defer.resolve();
        };

        $scope.approveComposition = function(){
            $scope.compositions = [];
            getCompositions({status: $scope.list});
            if($scope.list){
                $scope.list = 0;
            } else {
                $scope.list = 1;
            }

            var imagesTimer = $interval(function(){
                if(error){
                    $interval.cancel(imagesTimer);
                } else if(Object.keys(Images).length == 13 && $scope.compositions.length){
                    $interval.cancel(imagesTimer);
                    onImagesLoad();
                }
            }, 100)
        };


//////////////INITIALIZATION!!!!!!!!!!!!!!!!!!!!!!!

        getCompositions({status: 1});

        angular.forEach(chess_pieces, function (v, k) {
            var src = '/static/app/vendor/chessboardjs/img/chesspieces/' + CompositionsDataService.globalConfig.pieceThemeName + '/b' + v + '.png';
            setImage(src, 'b' + v);
            src = '/static/app/vendor/chessboardjs/img/chesspieces/' + CompositionsDataService.globalConfig.pieceThemeName + '/w' + v + '.png';
            setImage(src, 'w' + v);
        });

        var square1 = angular.element('#square1')[0];
        square1.height = boardValue;
        square1.width = boardValue;
        var context = square1.getContext('2d');
        context.beginPath();
        context.rect(0, 0, boardValue, boardValue);
        context.fillStyle = CompositionsDataService.globalConfig.ChessColors[CompositionsDataService.globalConfig.chessBoardColor][0];
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = CompositionsDataService.globalConfig.ChessColors[CompositionsDataService.globalConfig.chessBoardColor][1];
        context.stroke();

        var square2 = angular.element('#square2')[0];
        square2.height = chessValue;
        square2.width = chessValue;
        var context2 = square2.getContext('2d');
        context2.beginPath();
        context2.rect(0, 0, chessValue, chessValue);
        context2.fillStyle = CompositionsDataService.globalConfig.ChessColors[CompositionsDataService.globalConfig.chessBoardColor][1];
        context.fillStyle = '#b58863';
        context2.fill();

        var stage = new Kinetic.Stage({
            container: 'img_container',
            width: boardValue,
            height: boardValue
        });

        var layer = new Kinetic.Layer();

        var square = new Kinetic.Image({
            image: square1,
            width: boardValue,
            height: boardValue,
            x: 0,
            y: 0,
            draggable: false
        });
        layer.add(square);

        for (var i = 0; i < 8; i++){
            for (var j = 0; j < 8; j++){
                if((j % 2 == 0 && i % 2 != 0) || (i % 2 == 0 && j % 2 != 0)) {
                    var square = new Kinetic.Image({
                        image: square2,
                        width: chessValue,
                        height: chessValue,
                        x: j * chessValue,
                        y: i * chessValue,
                        draggable: false
                    });
                    layer.add(square);
                }
            }
        }
        stage.add(layer);
        setImage(layer.toDataURL("image/png"), 'board');

        var imagesTimer = $interval(function(){
            if(error){
                $interval.cancel(imagesTimer);
            } else if(Object.keys(Images).length == 13 && $scope.compositions.length){
                $interval.cancel(imagesTimer);
                onImagesLoad();
            }
        }, 100);

    }

]);
