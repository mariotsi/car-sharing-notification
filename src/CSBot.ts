import * as TeleBot from 'telebot';
import * as Moment from 'moment';
class Bot {
  private updateIds: (callback: () => void) => void;
  private bot: TeleBot;
  constructor(updateIds: (callback: any) => void, token: string = process.env['TELEGRAM:token']) {
    this.updateIds = updateIds;
    this.bot = new TeleBot(token);
    this.bot.connect();
    this.sendMessage('Ok, I\'m fine after restart 🎉');
    this.bot.on('/echo', (msg) => {
      this.sendMessage(`Echo un cazzo!`, msg.from.id);
    });

    this.bot.on('/uptime', (msg) => {
      this.sendMessage(`I'm online since ${Moment.duration(process.uptime(), 'seconds').humanize()}`, msg.from.id);
    });
    this.bot.on('/update', (msg) => {
      this.updateIds(() => this.sendMessage(`Sincronizzazione con DB avvenuta`, msg.from.id));
    });
  }

  sendMessage(message: string, toId = process.env['TELEGRAM:clientId'], options = {parseMode: 'HTML'}) {
    this.bot.sendMessage(toId, message, options);
  }
}
export default Bot;
