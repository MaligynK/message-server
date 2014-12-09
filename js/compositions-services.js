/*******
 *          Composition
 *              10.11.2014
 *              Malygin Konstantine
 * **********/

var compositionsServices = angular.module('compositionsServices', ['ui.bootstrap']);


compositionsServices.service('CompositionsDataService', [ '$q', '$log', 'Restangular', '$rootScope', '$window',
    function ($q, $log, Restangular, $rootScope, $window) {

        var parent = this;
        this.content = {id: 0, admin: false};
        this.items = ['Ферзь', 'Конь', 'Ладья', 'Слон'];
        Restangular.setBaseUrl('/api/v1');

        /********************        ДАННЫЕ КОТОРЫЕ ДОЛЖНЫ ПРИЙТИ         *******************************/
        this.globalConfig = {
                            stockfishUrl:'/static/app/lib/stockfish.js',
                            pieceThemeName: 'alpha',
                            chessBoardColor: 0,
                            zoom: 1,
                            ChessColors: [
                                ['#f0d9b5', '#b58863'],
                                ['#f3f3f3', '#7389b6'],
                                ['#e0d070', '#70a070'],
                                ['#d0c0a0', '#a08050'],
                                ['#d0e0d0', '#80a0a0'],
                                ['#e0d8b8', '#047c24'],
                                ['#ffdb86', '#ffa200']
                            ],
                            ChessPiecesThemes: [
                                'alpha',
                                'uscf',
                                'wikipedia'
                            ]
        };
        /*********************************************************************************************/
        if($window != $window.top){
            this.globalConfig.zoom = 3;
        }


        this.settingsFish = [{
                                ContemptFactor: 0,
                                MinimumThinkingTime: 10,
                                MobilityMidgame: 0,
                                PawnStructureMidgame: 0,
                                PassedPawnsMidgame: 0,
                                MobilityEndgame: 0,
                                PawnStructureEndgame: 0,
                                PassedPawnsEndgame: 0,
                                Aggressiveness: 0,
                                Cowardice: 0,
                                EmergencyMoveHorizon: 0
                               },{
                                ContemptFactor: 0,
                                MinimumThinkingTime: 10,
                                MobilityMidgame: 200,
                                PawnStructureMidgame: 0,
                                PassedPawnsMidgame: 200,
                                MobilityEndgame: 0,
                                PawnStructureEndgame: 200,
                                PassedPawnsEndgame: 200,
                                Aggressiveness: 200,
                                Cowardice: 0,
                                EmergencyMoveHorizon: 0
                               },{
                                ContemptFactor: 0,
                                MinimumThinkingTime: 10,
                                MobilityMidgame: 0,
                                PawnStructureMidgame: 200,
                                PassedPawnsMidgame: 0,
                                MobilityEndgame: 200,
                                PawnStructureEndgame: 0,
                                PassedPawnsEndgame: 0,
                                Aggressiveness: 0,
                                Cowardice: 200,
                                EmergencyMoveHorizon: 0
                               },{
                                ContemptFactor: 0,
                                MinimumThinkingTime: 10,
                                MobilityMidgame: 200,
                                PawnStructureMidgame: 200,
                                PassedPawnsMidgame: 200,
                                MobilityEndgame: 200,
                                PawnStructureEndgame: 200,
                                PassedPawnsEndgame: 200,
                                Aggressiveness: 200,
                                Cowardice: 200,
                                EmergencyMoveHorizon: 0
        }];


    }]);


compositionsServices.service('MessageService', [ '$q', '$log', 'Restangular', '$rootScope', '$window',
    function ($q, $log, Restangular, $rootScope, $window) {
        var parent = this;
        this.messages = [
            {id:0, time: 1418121073794, msg: 'Ход e2e4 отправлен', color: 2},
            {id:1, time: 1418121074122, msg: 'Ход принят (компенсация 3сек)', color: 1},
            {id:2, time: 1418121073999, msg: 'Ход не принят (2 сек) счетчик', color: 3},
            {id:3, time: 1418121075144, msg: 'вошел соперник', color: 0},
            {id:4, time: 1418121074999, msg: 'Вам шах', color: 3},
            {id:5, time: 1418121074444, msg: 'Получен ход e7e5 (компенсация 2сек)', color: 1},
            {id:6, time: 1418121074664, msg: 'Новое сообщение от соперника', color: 0}
        ];


        $rootScope.$on('Message', function(event, data){
            var id = parent.messages.length;
            var info = data;
            info.id = id;
            parent.messages.push(info);
        })


    }]);