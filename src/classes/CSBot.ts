import * as TeleBot from 'telebot';
import * as distanceInWords from 'date-fns/distance_in_words';
import * as oAuth from './oAuth';
import * as firebase from './Firebase';

class Bot {
  private bot: TeleBot;
  private name: any;

  constructor(token: string = process.env['TELEGRAM:token']) {
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

    this.bot.on('/update', async (msg) => {
      await updateIds();
      this.sendMessage(`Sincronizzazione con DB avvenuta`, msg.from.id);
    });

    this.bot.on('/start', async (msg) => {
      const splittedMessage = msg.text.split(' ');
      if (splittedMessage.length === 1) {
        // first time connecting, still not authenticated
        oAuth.authenticateUser({
          telegramId: msg.from.id,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
          username: msg.from.username,
          language: msg.from.language_code,
        });
      } else {
        const code = new Buffer(msg.text.split(' ')[1], 'base64').toString();
        const newUser = await oAuth.getAndSaveTokens(code, msg.from.id);
        this.sendToMaster('New User: ' + JSON.stringify(newUser));
      }
      console.log(msg);
    });
  }

  sendMessage(message: string, toId: number, options: any = {parseMode: 'HTML'}) {
    this.bot.sendMessage(toId, message, options);
  }

  async getName() {
    this.name = await this.bot.getMe();
    this.sendToMaster(
      `Ok, I\'m fine after restart 🎉 \n\nBot name: ${this.name.first_name}\nBot username: ${this.name.username}`
    );
  }

  sendToMaster(message: string, options: any = {parseMode: 'HTML'}) {
    this.bot.sendMessage(process.env['TELEGRAM:clientId'], message, options);
  }

  async sendLoginMessage(telegramId: number) {
    try {
      const keyboard = this.bot.inlineKeyboard([
        [this.bot.inlineButton('Login', {url: await oAuth.getOAuthUrl(telegramId)})],
      ]);
      this.sendMessage(
        'You need to authenticate with Google in order to let the bot read CarSharing emails',
        telegramId,
        {replyMarkup: keyboard}
      );
    } catch (e) {
      console.log('Cannot get oAuth url for this id: ' + telegramId);
    }
  }
}

async function updateIds() {
  const snapshot = await firebase.onceValue('emailIds');
  console.log('FORCED - Getting updated Ids from DB, from now on using cache');
  (Object.keys(snapshot.val() || {}) || []).map((key) => firebase.localSavedIds.add(key));
}

const bot = new Bot();

export default bot;
