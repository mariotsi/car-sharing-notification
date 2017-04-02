const TeleBot = require('telebot');
const Moment = require('moment');
class Bot {
  constructor(token = process.env.TELEGRAM_TOKEN) {
    this.bot = new TeleBot(token);
    this.bot.connect();
    this.bot.on(['/echo'], msg => {
      return this.bot.sendMessage(msg.from.id, `Echo un cazzo!`);
    });

    this.bot.on(['/uptime'], msg => {
      return this.bot.sendMessage(msg.from.id, `Sono online da ${Moment.duration(process.uptime(), 'seconds').humanize()}`);
    });
  }

  sendMessage(message, to_id = process.env.TELEGRAM_CLIENT_ID, options = {parse: 'HTML'}) {
    this.bot.sendMessage(to_id, message, options);
  }
}
module.exports = Bot;