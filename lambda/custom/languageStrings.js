/* *
 * We create a language strings object containing all of our strings.
 * The keys for each string will then be referenced in our code, e.g. handlerInput.t('WELCOME_MSG').
 * The localisation interceptor in index.js will automatically choose the strings
 * that match the request's locale.
 * */

module.exports = {
    en: {
        translation: {
            WELCOME_MSG: 'Chess app started, say "start new game" to play.',
            GAME_STARTED_MSG: 'Game started, trait to the white.',
            AI_GAME_STARTED_MSG: 'You are black, I play {{piece}} {{coord_start}} to {{coord_destination}}.',
            AI_HUMAN_GAME_STARTED_MSG: 'You are white, you start.',
            HUMAN_MOVED_MSG: 'Moved {{piece}} {{coord_start}} to {{coord_destination}}.',
            AI_MOVED_MSG: 'I play {{piece}} {{coord_start}} to {{coord_destination}}.',
            TRAIT_WHITE: 'Trait to white.',
            TRAIT_BLACK: 'Trait to black.',
            CHECK_MSG: 'Check',
            DRAW_MSG: 'Game end by draw.',
            CHECKMATE_MSG: 'Checkmate, {{color}} win.',
            INVALID_MOVE_MSG: 'Ambiguious or invalid move.',
            HELP_MSG: 'You can start a game by saying "start new game". You can move a piece by saying "play" and the coordinates to move the piece.',
            GOODBYE_MSG: 'Goodbye!',
            REFLECTOR_MSG: 'You just triggered {{intentName}}',
            FALLBACK_MSG: 'Sorry, I don\'t know about that. Please try again.',
            ERROR_MSG: 'Error: {{error}}',

            PIECE_PAWN: 'Pawn',
            PIECE_NIGHT: 'Night',
            PIECE_BISHOP: 'Bishop',
            PIECE_ROOK: 'Rook',
            PIECE_QUEEN: 'Queen',
            PIECE_KING: 'King',
            PIECE_UNKNOWN: 'Unknown'
        }
    },
    fr: {
        translation: {
            WELCOME_MSG: 'Bienvenue sur le génie des salutations, dites-moi bonjour et je vous répondrai',
            HELLO_MSG: 'Bonjour à tous!',
            HELP_MSG: 'Dites-moi bonjour et je vous répondrai!',
            GOODBYE_MSG: 'Au revoir!',
            REFLECTOR_MSG: 'Vous avez invoqué l\'intention {{intentName}}',
            FALLBACK_MSG: 'Désolé, je ne sais pas. Pouvez-vous reformuler?',
            ERROR_MSG: 'Désolé, je n\'ai pas compris. Pouvez-vous reformuler?'
        }
    }
}