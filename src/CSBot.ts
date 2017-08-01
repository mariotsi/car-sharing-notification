import * as TeleBot from 'telebot';
import * as distanceInWords from 'date-fns/distance_in_words';

class Bot {
  private updateIds: (callback: () => void) => void;
  private bot: TeleBot;
  private name: any;

  constructor(updateIds: (callback: any) => void, token: string = process.env['TELEGRAM:token']) {
    this.updateIds = updateIds;
    this.bot = new TeleBot(token);
    this.bot.connect();
    this.getName();

    this.bot.on('/echo', (msg) => {
      this.sendMessage(`Echo un cazzo!`, msg.from.id);
    });

    this.bot.on('/uptime', (msg) => {
      this.sendMessage(
        `I'm online since ${distanceInWords(new Date(), +new Date() - Math.floor(process.uptime()) * 1000, {
          includeSeconds: true,
        })}`,
        msg.from.id
      );
    });
    this.bot.on('/update', (msg) => {
      this.updateIds(() => this.sendMessage(`Sincronizzazione con DB avvenuta`, msg.from.id));
    });
    this.bot.on(/^\/start (.*)$/, (msg, q) => {
      this.sendMessage(q.match[1]);
    });
  }

  sendMessage(message: string, toId = process.env['TELEGRAM:clientId'], options = {parseMode: 'HTML'}) {
    this.bot.sendMessage(toId, message, options);
  }

  async getName() {
    this.name = await this.bot.getMe();
    this.sendMessage(
      `Ok, I\'m fine after restart 🎉 \n\nBot name: ${this.name.first_name}\nBot username: ${this.name.username}`
    );
  }
}

export default Bot;
