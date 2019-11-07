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

const webServer = 'http://56c0ee33.ngrok.io'

function getGameOver(game, color) {
    if (game.in_draw() || game.in_stalemate()) {
        return 'DRAW'
    } else if (game.in_threefold_repetition()) {
        return 'REPETITION'
    } else if (game.insufficient_material()) {
        return 'INSUFFICIENT_MATERIAL'
    } else if (game.in_checkmate()) {
        return color + '_CHECKMATE'
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
        const speakOutput = handlerInput.t('WELCOME_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const PlayIntentHandler = {
    canHandle(handlerInput) {
        if (Alexa.getRequestType(handlerInput.requestEnvelope) != 'IntentRequest'
            || Alexa.getIntentName(handlerInput.requestEnvelope) != 'PlayIntent') {
            return false
        }

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        const isPlaying = sessionAttributes.isPlaying
        if (isPlaying != null || isPlaying == false) return false

        return true

        // return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        //     && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayIntent'
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.fen = new Chess().fen();
        sessionAttributes.isPlaying = true
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        request.post(webServer + '/start')

        const speakOutput = handlerInput.t('GAME_STARTED_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const MoveIntentHandler = {
    canHandle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        if (!sessionAttributes.isPlaying) return false

        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'MoveIntent';
    },
    handle(handlerInput) {
        var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        var has_start = Alexa.getSlotValue(handlerInput.requestEnvelope, 'coord_start')
        var has_destination = Alexa.getSlotValue(handlerInput.requestEnvelope, 'coord_destination')

        try {
        if (has_start != null) {
            const slot = Alexa.getSlot(handlerInput.requestEnvelope, 'coord_start')
            coord_start = getSlotResolutionName(slot)
        }

        if (has_destination != null) {
            const slot = Alexa.getSlot(handlerInput.requestEnvelope, 'coord_destination')
            coord_destination = getSlotResolutionName(slot)
        }

        var game = new Chess(sessionAttributes.fen)
        var res = null
        var speakOutput = null

        if (has_start == null && has_destination != null) {
            res = game.move(coord_destination)
        } else if (has_start != null && has_destination != null) {
            res = game.move({ from: coord_start, to: coord_destination})
        } else {
            speakOutput = handlerInput.t('INVALID_MOVE_MSG')
        }

        if (res != null) {
            speakOutput = handlerInput.t('MOVED_MSG', {
                piece: getPieceName(handlerInput, res.piece),
                coord_start: res.from,
                coord_destination: res.to
            })
        }

        const fen = game.fen()
        const color = game.turn() === 'w' ? 'WHITE' : 'BLACK'

        var gameOver = getGameOver(game, color)

        if (color === 'WHITE') {
            speakOutput += ' ' + handlerInput.t('TRAIT_WHITE')
        } else {
            speakOutput += ' ' + handlerInput.t('TRAIT_BLACK')
        }

        request.post(webServer + '/move', {
            form: { 
                fen: fen,
                check: game.in_check(),
                gameOver: gameOver
            } 
        })

        sessionAttributes.fen = fen
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        } catch (ex) {
            console.log(ex)
        }


        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            //.withSimpleCard('Debug', move)
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
        PlayIntentHandler,
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
