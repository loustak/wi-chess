/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
// i18n library dependency, we use it below in a localisation interceptor
const i18n = require('i18next');
// i18n strings for all supported locales
const languageStrings = require('./languageStrings');

const request = require('request')
const Chess = require('chess.js').Chess;

const webServer = 'http://ba92f640.ngrok.io'

function getGameOver(game) {
    if (game.in_draw() || game.in_stalemate()) {
        return 'DRAW'
    } else if (game.in_threefold_repetition()) {
        return 'DRAW'
    } else if (game.insufficient_material()) {
        return 'DRAW'
    } else if (game.in_checkmate()) {
        return 'CHECKMATE'
    }

    return false
}

function getPieceName(handlerInput, piece) {
    if (piece === 'p') {
        return handlerInput.t('PIECE_PAWN')
    } else if (piece === 'n') {
        return handlerInput.t('PIECE_NIGHT')
    } else if (piece === 'b') {
        return handlerInput.t('PIECE_BISHOP')
    } else if (piece === 'r') {
        return handlerInput.t('PIECE_ROOK')
    } else if (piece === 'q') {
        return handlerInput.t('PIECE_QUEEN')
    } else if (piece === 'k') {
        return handlerInput.t('PIECE_KING')
    }

    return handlerInput.t('PIECE_UNKNOWN')
}

function getSlotResolutionName(slot) {
    return slot.resolutions.resolutionsPerAuthority[0].values[0].value.name
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.isPlaying = false
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        const speakOutput = handlerInput.t('WELCOME_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withStandardCard("To see the chessboard", webServer)
            .getResponse();
    }
};

const StartIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StartIntent';
    },
    handle(handlerInput) {
        let speakOutput = null
        const slot = Alexa.getSlot(handlerInput.requestEnvelope, 'opponent')
        const opponent = getSlotResolutionName(slot)

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        request.post(webServer + '/start')

        let game = new Chess()

        if (opponent === 'AI') {
            const color = Math.round(Math.random())

            if (color == 0) {
                // AI start
                const moves = game.moves();
                const move = moves[Math.floor(Math.random() * moves.length)];
                const AIres = game.move(move);

                request.post(webServer + '/move', {
                    form: { 
                        fen: game.fen(),
                        check: false,
                        gameOver: false
                    } 
                })

                speakOutput = handlerInput.t('AI_GAME_STARTED_MSG', {
                    piece: getPieceName(handlerInput, AIres.piece),
                    coord_start: AIres.from,
                    coord_destination: AIres.to
                })
            } else {
                // Human start
                speakOutput = handlerInput.t('AI_HUMAN_GAME_STARTED_MSG')
            }
        } else {
            speakOutput = handlerInput.t('GAME_STARTED_MSG');
        }

        sessionAttributes.isPlaying = true
        sessionAttributes.oponnentType = opponent
        sessionAttributes.fen = game.fen();
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const MoveIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'MoveIntent';
    },
    handle(handlerInput) {
        let speakOutput = null
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let has_start = Alexa.getSlotValue(handlerInput.requestEnvelope, 'coord_start')
        let has_destination = Alexa.getSlotValue(handlerInput.requestEnvelope, 'coord_destination')

        if (has_start != null) {
            const slot = Alexa.getSlot(handlerInput.requestEnvelope, 'coord_start')
            coord_start = getSlotResolutionName(slot)
        }

        if (has_destination != null) {
            const slot = Alexa.getSlot(handlerInput.requestEnvelope, 'coord_destination')
            coord_destination = getSlotResolutionName(slot)
        }

        let game = new Chess(sessionAttributes.fen)
        let res = null

        if (has_start == null && has_destination != null) {
            res = game.move(coord_destination)
        } else if (has_start != null && has_destination != null) {
            res = game.move({ from: coord_start, to: coord_destination})
        }

        const color = game.turn() === 'w' ? 'WHITE' : 'BLACK'

        if (res == null) {
            speakOutput = handlerInput.t('INVALID_MOVE_MSG')
        } else {
            speakOutput = handlerInput.t('HUMAN_MOVED_MSG', {
                piece: getPieceName(handlerInput, res.piece),
                coord_start: res.from,
                coord_destination: res.to
            })

            if (sessionAttributes.oponnentType === 'AI') {
                // The SUPERIOR AI now make is decisive move
                // (it just make a random move, LOL)
                const moves = game.moves();
                const move = moves[Math.floor(Math.random() * moves.length)];
                const AIres = game.move(move);

                speakOutput += ' ' + handlerInput.t('AI_MOVED_MSG', {
                    piece: getPieceName(handlerInput, AIres.piece),
                    coord_start: AIres.from,
                    coord_destination: AIres.to
                })
            }
        }

        const check = game.in_check()
        const gameOver = getGameOver(game)

        if (check) {
            speakOutput += ' ' + handlerInput.t('CHECK_MSG')
        } else if (gameOver === 'DRAW') {
            speakOutput += ' ' + handlerInput.t('DRAW_MSG')
        } else if (gameOver === 'CHECKMATE') {
            speakOutput += ' ' + handlerInput.t('CHECKMATE_MSG', {color: color})
        } else if (!gameOver && sessionAttributes.oponnentType != 'AI') {
            // Playing against another human, pff...
            if (color === 'WHITE') {
                speakOutput += ' ' + handlerInput.t('TRAIT_WHITE')
            } else {
                speakOutput += ' ' + handlerInput.t('TRAIT_BLACK')
            }
        }

        const fen = game.fen()
        sessionAttributes.fen = fen
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        request.post(webServer + '/move', {
            form: { 
                fen: fen,
                check: check,
                gameOver: gameOver
            } 
        })

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('HELP_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('GOODBYE_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('FALLBACK_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = handlerInput.t('REFLECTOR_MSG', {intentName: intentName});

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = handlerInput.t('ERROR_MSG', {error: JSON.stringify(error)} );
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// This request interceptor will bind a translation function 't' to the handlerInput
const LocalisationRequestInterceptor = {
    process(handlerInput) {
        i18n.init({
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            resources: languageStrings
        }).then((t) => {
            handlerInput.t = (...args) => t(...args);
        });
    }
};
/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        MoveIntentHandler,
        StartIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        LocalisationRequestInterceptor)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();
