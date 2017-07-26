import TeleBot from 'telebot';
import * as Moment from 'moment';
class Bot {
  private updateIds: (callback: () => void) => void;
  private bot: TeleBot;
  constructor(token = process.env.TELEGRAM_TOKEN, updateIds = () => {}) {
    this.updateIds = updateIds;
    this.bot = new TeleBot(token);
    this.bot.connect();
    this.bot.on('/echo', msg => {
      this.sendMessage(`Echo un cazzo!`, msg.from.id);
    });

    this.bot.on('/uptime', msg => {
      this.sendMessage(
        `I'm online since ${Moment.duration(
          process.uptime(),
          'seconds'
        ).humanize()}`,
        msg.from.id
      );
    });
    this.bot.on('/update', msg => {
      this.updateIds(() =>
        this.sendMessage(`Sincronizzazione con DB avvenuta`, msg.from.id)
      );
    });
  }

  sendMessage(
    message: string,
    toId = process.env.TELEGRAM_CLIENT_ID,
    options = { parseMode: 'HTML' }
  ) {
    this.bot.sendMessage(toId, message, options);
  }
}
module.exports = Bot;
