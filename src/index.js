// Get rid of deprecation message of the telegram lib.
process.env["NTBA_FIX_319"] = 1;

const FTXWS = require('ftx-api-ws');
const TelegramBot = require('node-telegram-bot-api');
const Helpers = require('./helpers');

class RektAlert {
  constructor(config) {
    this.config = config;
    this.chatId = this.config.get('telegram.chatId');
  }
  
  async start() {
    this.startTelegramBot();
    this.startWebsocket();
    console.log('Rektalert started...');
  }

  // #### Websocket setup ####
  startWebsocket() {
    const accounts = this.config.get('ftx') || [];

    accounts.forEach(async acc => {
      const ftx = new FTXWS(acc);
  
      await ftx.connect();
  
      ftx.subscribe('orders');
      ftx.on('orders', order => {
        if (this.isUnfilledOrder(order)) return;
        this.send(this.buildMsg(acc, order));
      });
    });
  }

  // #### Telegram setup ####

  startTelegramBot() {
    const token = this.config.get('telegram.token');

    if (!token) {
      console.log('No telegram token configured. Please run the "setup" command to do so.');
      process.exit(1);
    }

    this.bot = new TelegramBot(token, { polling: true });

    // Return chat id.
    this.bot.onText(/\/start/, msg => {
      if (!this.chatId) {
        this.chatId = msg.chat.id;
        this.config.set('telegram.chatId', this.chatId);
        this.send(`Hello! You're now my master and I shall only report to you.`);
      }
    });
  }

  async send(msg) {
    const result = await Helpers.retry(
      () => this.bot.sendMessage(this.chatId, msg),
      {
        maxTries: 12,
        timeout: 10000,
      }
    );

    if (!result) {
      console.error(`Failed to send telegram message.`);
    }
  }

  // #### Helpers ####

  isUnfilledOrder(order) {
    return order.filledSize === 0;
  }

  isClosedMarketOrder(order) {
    return order.type === 'market' && order.status === 'closed';
  }

  buildMsg(acc, data) {
    const accountName = acc.subaccount ? `Subaccount ${acc.subaccount}` : 'Main Account';

    if (this.isClosedMarketOrder(data)) {
      const { filledSize, avgFillPrice, reduceOnly } = data;

      // If reduce only equals true, we assume it's a stop market. Sadly no other way to differentiate afaik.
      if (reduceOnly === true) {
        return `${accountName}\nFilled stop market order.\n${filledSize} @ ${avgFillPrice}`;
      } else {
        return `${accountName}\nFilled market order.\n${filledSize} @ ${avgFillPrice}`;
      }
    }

    if (data.type === 'limit') {
      const { remainingSize, filledSize, size, reduceOnly, price } = data;
      const fillStateStr = remainingSize > 0 ? 'Partially filled' : 'Filled';

      // If reduce only equals true, we assume it's a stop limit. Sadly no other way to differentiate afaik.
      if (reduceOnly === true) {
        return `${accountName}\n${fillStateStr} stop limit order.\n${filledSize} of ${size} @ ${price}`;
      } else {
        return `${accountName}\n${fillStateStr} limit order.\n${filledSize} of ${size} @ ${price}`;
      }
    }
  }
}

module.exports = RektAlert;
