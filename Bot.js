const TeleBot = require('telebot');
const Moment = require('moment');
class Bot {
  constructor(token = process.env.TELEGRAM_TOKEN) {
    this.bot = new TeleBot(token);
    this.bot.connect();
    this.bot.on(['/echo'], msg => {
      this.sendMessage(`Echo un cazzo!`, msg.from.id);
    });

    this.bot.on(['/uptime'], msg => {
      this.sendMessage(`I'm online since ${Moment.duration(process.uptime(), 'seconds').humanize()}`, msg.from.id);
    });
  }

  sendMessage(message, to_id = process.env.TELEGRAM_CLIENT_ID, options = {parse: 'HTML'}) {
    this.bot.sendMessage(to_id, message, options);
  }
}
module.exports = Bot;
