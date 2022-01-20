import * as TeleBot from 'telebot';
import * as distanceInWords from 'date-fns/distance_in_words';
import * as oAuth from './oAuth';
import * as firebase from './Firebase';
import * as Users from './Users';

class Bot {
  private bot: TeleBot;
  private name: any;

  constructor(token: string = process.env['TELEGRAM_token']) {
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
      if (msg.from.id != process.env['TELEGRAM_clientId']) return;
      await updateIds();
      this.sendToMaster('Sincronizzazione con DB avvenuta');
    });

    this.bot.on('/start', async (msg) => {
      console.log(`Received /start from ${msg.from.id}`);
      const splittedMessage = msg.text.split(' ');
      console.log('mmm', splittedMessage);
      const recurringUser = !!await Users.getUser(msg.from.id.telegramId);
      if (splittedMessage.length === 1) {
        console.log(`No token with the start command`);
        // first time connecting, still not authenticated or reactivating old user
        await Users.handleStart({
          telegramId: msg.from.id,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
          username: msg.from.username,
          language: msg.from.language_code,
        });
      } else {
        const code = Buffer.from(splittedMessage[1]).toString();
        console.log(`Received token ${code} for ${msg.from.id}`);
        const newUser = await oAuth.getAndSaveTokens(code, msg.from.id);
        !recurringUser && this.sendToMaster('New User: ' + JSON.stringify(newUser));
      }
    });

    this.bot.on('/stop', async (msg) => {
      await Users.deactivate(msg.from.id);
      this.sendMessage(
          'You will not receive any other notification. In order to reactivate notifications type /start',
          msg.from.id
      );
    });
  }

  sendMessage(message: string, toId: number, options: any = {parseMode: 'HTML'}) {
    this.bot.sendMessage(toId, message, options);
  }

  async getName() {
    this.name = await this.bot.getMe();
    /* this.sendToMaster(
          `I'm fine after restart 🎉 \n\nBot name: ${this.name.first_name}\nBot username: ${this.name.username}`
        );*/
  }

  sendToMaster(message: string, options: any = {parseMode: 'HTML'}) {
    this.bot.sendMessage(process.env['TELEGRAM:clientId'], message, options);
  }

  async sendLoginMessage(telegramId: number, expired?: boolean) {
    try {
      const keyboard = this.bot.inlineKeyboard([
        [this.bot.inlineButton('Login', {url: await oAuth.getOAuthUrl(telegramId)})],
      ]);
      this.sendMessage(
        expired ?
          'You authentication with Google is no longer valid.\n\n' +
            'In order to continue using this service please re-authenticate yourself' :
          'You need to authenticate with Google in order to let the bot read CarSharing emails',
        telegramId,
        {
          replyMarkup: keyboard,
          parseMode: 'HTML',
        }
      );
    } catch (e) {
      console.log('Cannot get oAuth url for this id: ' + telegramId);
    }
  }
}

async function updateIds() {
  console.log('FORCED - FORCED - Getting updated Ids from DB');
  const snapshot = await firebase.onceValue('emailIds');
  firebase.localSavedIds.clear();
  (Object.keys(snapshot.val() || {}) || []).map((key) => firebase.localSavedIds.add(key));
  console.log('FORCED - Local cache filled from firebase, from now on using it');
}

const bot = new Bot();

export default bot;
