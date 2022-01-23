import * as TeleBot from 'telebot';
import { formatDistance } from 'date-fns';
import OAuth from './OAuth';
import firebase from './Firebase';
import * as Users from './Users';
import base64url from 'base64url';
import authCodesStore, { getEnvValue } from '../util';

class Bot {
  private bot: TeleBot;
  private name: any;

  constructor(token: string) {
    this.bot = new TeleBot(token);
    this.bot.connect();
    this.getName();

    this.bot.on('/echo', (msg) => {
      console.log(`[${msg.from.id}] Command /echo `);
      this.sendMessage('Echo un cazzo!', msg.from.id);
    });

    this.bot.on('/uptime', (msg) => {
      console.log(`[${msg.from.id}] Command /uptime `);
      this.sendMessage(
        `I'm online since ${formatDistance(new Date(), +new Date() - Math.floor(process.uptime()) * 1000, {
          includeSeconds: true,
        })}`,
        msg.from.id
      );
    });

    this.bot.on('/update', async (msg) => {
      console.log(`[${msg.from.id}] Command /update `);
      if (msg.from.id != process.env['TELEGRAM_clientId']) return;
      await updateIds();
      this.sendToMaster('Sincronizzazione con DB avvenuta');
    });

    this.bot.on('/start', async (msg) => {
      console.log(`[${msg.from.id}] Command /start `);
      const [, authCodeKey] = msg.text.split(' ');
      const isExistingUser = !!(await Users.getUser(msg.from.id.telegramId));
      if (!authCodeKey) {
        console.log(`[${msg.from.id}] First time connecting, still not authenticated or reactivating old user`);
        await Users.handleStart({
          telegramId: msg.from.id,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
          username: msg.from.username,
          language: msg.from.language_code,
        });
      } else {
        const authCode = authCodesStore.get(authCodeKey);
        if (!authCode) {
          console.error(`[${msg.from.id}] No AuthCode found with key ${authCodeKey}`);
          return;
        }
        const [telegramId, encodedCode] = authCode.split('|');
        authCodesStore.delete(authCodeKey);
        const code = base64url.decode(encodedCode);
        if (`${telegramId}` !== `${msg.from.id}`) {
          console.error(`[${msg.from.id}] User tried to use a AuthCode owned by ${telegramId}`);
          return;
        }

        const newUser = await OAuth.getAndSaveTokens(code, msg.from.id);
        if (!isExistingUser) {
          this.sendToMaster(`New User: ${JSON.stringify(newUser)}`);
        }
      }
    });

    this.bot.on('/stop', async (msg) => {
      console.log(`[${msg.from.id}] Command /stop `);
      await Users.deactivate(msg.from.id);
      this.sendMessage(
        'You will not receive any other notification. In order to reactivate notifications type /start',
        msg.from.id
      );
    });
  }

  sendMessage(message: string, toId: number, options: any = { parseMode: 'HTML' }) {
    this.bot.sendMessage(toId, message, options);
  }

  async getName() {
    this.name = await this.bot.getMe();
    /* this.sendToMaster(
          `I'm fine after restart 🎉 \n\nBot name: ${this.name.first_name}\nBot username: ${this.name.username}`
        );*/
  }

  sendToMaster(message: string, options: any = { parseMode: 'HTML' }) {
    const masterId = process.env['TELEGRAM_masterId'];
    if (masterId) {
      this.bot.sendMessage(masterId, message, options);
    }
  }

  async sendLoginMessage(telegramId: number, expired?: boolean) {
    try {
      const keyboard = this.bot.inlineKeyboard([
        [this.bot.inlineButton('Login', { url: await OAuth.getOAuthUrl(telegramId) })],
      ]);
      this.sendMessage(
        expired
          ? 'You authentication with Google is no longer valid.\n\n' +
              'In order to continue using this service please re-authenticate yourself'
          : 'You need to authenticate with Google in order to let the bot read CarSharing emails',
        telegramId,
        {
          replyMarkup: keyboard,
          parseMode: 'HTML',
        }
      );
    } catch (e) {
      console.log(`Cannot get oAuth url for this id: ${telegramId}`);
    }
  }
}

async function updateIds() {
  console.log('FORCED - FORCED - Getting updated Ids from DB');
  const snapshot = await firebase.onceValue('emailIds');
  firebase.localSavedIds.clear();

  Object.keys(snapshot.val() ?? {}).map(firebase.localSavedIds.add);
  console.log('FORCED - Local cache filled from firebase, from now on using it');
}

const bot = new Bot(getEnvValue('TELEGRAM_token'));

export default bot;
