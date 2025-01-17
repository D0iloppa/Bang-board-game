const { shuffle } = require('./js/utility')
const { ROLE_PRESET, CHARACTER_PRESET } = require('./js/preset')
const { createPostfixIncrement } = require('typescript')
class GameControl {
    constructor(cards) {
        this.cards = cards
        this.players = []
        this.drawPile = [...cards]
        this.discardPile = []
        this.winnerRole = ''
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Player draw times cards
     * @param {string} playerID ID of target player
     * @param {number} times Times of drawing
     */
    draw = (playerID, times) => {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == playerID) {
                for (let j = 0; j < times; j++) {
                    if (this.drawPile.length == 0) {
                        this.drawPile = [...this.discardPile]
                        this.drawPile = shuffle(this.drawPile)
                    }
                    this.players[i].cards.push(this.drawPile.splice(Math.floor(Math.random() * this.drawPile.length), 1)[0])
                }
            }
        }
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Each player draw two cards at the beginning of the game
     */
    initDraw = () => {
        for (let i = 0; i < this.players.length; i++) {
            this.draw(this.players[i].id, 2)
        }
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Regain a bullet
     * @param {string} playerID ID of target player
     * @param {string} cardID ID of card used
     */
    regainBullet = (playerID, cardID) => {
        this.getPlayerById(playerID).bullets += 1
        this.discardCard(playerID, cardID)
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Every alive player regain a bullet
     * @param {string} playerID ID of player who played a saloon
     * @param {string} cardID ID of card used
     */

    saloon = (playerID, cardID) => {
        let alivePlayers = this.getAlivePlayers()
        this.discardCard(playerID, cardID)
        for (let i = 0; i < alivePlayers.length; i++) {
            if (alivePlayers[i].bullets != alivePlayers[i].maxBullet)
                alivePlayers[i].bullets++
        }
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Initialize game data
     * @param {object} roomUsers players
     */

    preparePlayerData = (roomUsers) => {
        for (let i = 0; i < roomUsers.length; i++) {
            let player = {}
            player.id = roomUsers[i].id
            player.name = roomUsers[i].name
            player.isBot = roomUsers[i].isBot
            player.isDead = false
            this.players.push(player)
        }

        //let the room owner to be sheriff
        //this.players = shuffle(this.players)
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].role = ROLE_PRESET[this.players.length - 4][i]
            let character = CHARACTER_PRESET[i]
            this.players[i].character = character[0]
            this.players[i].ability = character[1]
            this.players[i].maxBullet = this.players[i].role == 'Sheriff' ? character[2] + 1 : character[2]
            this.players[i].bullets = this.players[i].maxBullet
            this.players[i].cards = []
        }
        this.initDraw()
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Get a bullet out of a player
     * @param {string} playerID ID of target player
     */
    loseBullet = (playerID) => {
        let player = this.getPlayerById(playerID)
        player.bullets -= 1
        if (player.bullets == 0) {
            this.playerDie(player)
            return true
        }
        return false
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Determine whether the game has winner
     * @param {object} player Player who loses all the bullets
     * @returns {string} role who win the game 
     */
    playerDie = (player) => {
        player.isDead = true
        this.discardCards(player.id)
        let alivePlayers = this.getAlivePlayers()
        let isSheriffAlive = false,
            isAnyOutlawsAlive = false,
            isRenegadeAlive = false,
            isAnyDeputyAlive = false
        for (let i = 0; i < alivePlayers.length; i++) {
            switch (alivePlayers[i].role) {
                case 'Sheriff':
                    isSheriffAlive = true
                    break
                case 'Outlaws':
                    isAnyOutlawsAlive = true
                    break
                case 'Renegade':
                    isRenegadeAlive = true
                    break
                case 'Deputy':
                    isAnyDeputyAlive = true
                    break
            }
        }

        // Sheriff or deputy may win
        if (isSheriffAlive) {
            // No win
            if (isRenegadeAlive) return

            // No win
            if (isAnyOutlawsAlive) return

            // Both Sheriff and deputy win
            this.winnerRole = 'Sheriff'
        }
        // Renegade or outlaws may win
        else {
            // Outlaws win
            if (isAnyOutlawsAlive) {
                this.winnerRole = 'Outlaws'
                return
            }
            if (!isAnyDeputyAlive) {
                this.winnerRole = 'Renegade'
                return
            }
        }
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Discard a card from a player
     * @param {string} playerID ID of target player
     * @param {string} cardID ID of used card
     */
    discardCard = (playerID, cardID) => {
        let player = this.getPlayerById(playerID)
        this.discardPile.push(player.cards.splice(player.cards.indexOf(player.cards.find((card) => card._id == cardID)), 1)[0])
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Discard all cards from a player
     * @param {string} playerID ID of target player
     */
    discardCards = (playerID) => {
        let player = this.getPlayerById(playerID)
        let cardsCount = player.cards.length
        for (let i = 0; i < cardsCount; i++) {
            this.discardPile.push(player.cards.splice(0, 1)[0])
        }
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Get card object by its id
     * @param {string} id ID of target card
     * @return {object} card
     */
    getCardById = (id) => {
        for (let i = 0; i < this.cards.length; i++) {
            if (this.cards[i]._id == id)
                return this.cards[i]
        }
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Get player object by its id
     * @param {string} id ID of target player
     * @return {object} player
     */
    getPlayerById = (id) => {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id)
                return this.players[i]
        }
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Get all alive players
     * @returns {object} alive players
     */
    getAlivePlayers = () => {
        let alivePlayers = []
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].isDead) continue
            alivePlayers.push(this.players[i])
        }
        return alivePlayers
    }

    /**
     * @author Eric Kao <eric.kao5858@gmail.com>
     * Get next alive player
     * @param {string} originPlayerID IF of current player
     */
    getNextAlivePlayer = (originPlayerID) => {
        let nextPlayerIndex
        let alivePlayers = this.getAlivePlayers()
        let originPlayerIndex = alivePlayers.indexOf(alivePlayers.find((player) => player.id == originPlayerID))
        if (originPlayerIndex == alivePlayers.length - 1)
            nextPlayerIndex = 0
        else
            nextPlayerIndex = originPlayerIndex + 1
        return alivePlayers[nextPlayerIndex].id
    }
}

module.exports = GameControl