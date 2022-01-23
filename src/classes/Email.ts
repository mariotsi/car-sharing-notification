import { gmail_v1 as gmailTypes } from 'googleapis';
import { ParsedData } from '../typings/Interfaces';

export default class Email implements gmailTypes.Schema$Message {
  telegramId: number;

  id?: string;
  internalDate?: string;
  historyId?: string;
  labelIds?: string[];
  payload?: gmailTypes.Schema$MessagePart;
  raw?: string;
  sizeEstimate?: number;
  snippet?: string;
  threadId?: string;
  parsedData?: ParsedData;

  constructor(email: gmailTypes.Schema$Message, telegramId: number) {
    Object.assign(this, email);
    this.telegramId = telegramId;
  }

  get bodyData() {
    let bodyData = this.payload?.body?.data;
    if (!bodyData) {
      const part = this.payload?.parts?.find((item) => item.mimeType === 'text/plain' || item.mimeType === 'text/html');
      bodyData = part?.body?.data;
    }
    return bodyData;
  }

  get sender() {
    return this.payload?.headers?.find((item) => item.name === 'from' || item.name === 'From');
  }

  get date() {
    return new Date(Number(this.internalDate)).toISOString();
  }

  get body() {
    return Buffer.from(this.bodyData ?? '', 'base64').toString();
  }
}
