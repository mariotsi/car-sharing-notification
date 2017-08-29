class Resource {
  attachmentId: string;
  size: number;
  data: string;
}

export default class Email {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: number;
  telegramId: number;
  internalDate: number;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: {
      name: string;
      value: string;
    }[];
    body: Resource;
    parts: any[];
  };
  sizeEstimate: number;
  raw: Buffer;
  parsedData: Interfaces.parsedData;

  constructor(email: any, telegramId: number) {
    Object.assign(this, email);
    this.telegramId = telegramId;
  }

  get bodyData() {
    let bodyData = this.payload.body.data;
    if (!bodyData) {
      bodyData = ((this.payload.parts.find((item) => item.mimeType === 'text/plain') || {}).body || {}).data;
    }
    return bodyData;
  }

  get sender() {
    return this.payload.headers.find((item) => item.name === 'From');
  }

  get date() {
    return new Date(this.internalDate).toISOString();
  }

  get body() {
    return Buffer.from(this.bodyData || '', 'base64').toString();
  }
}
