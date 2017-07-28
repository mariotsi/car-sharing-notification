declare namespace Gmail {
  interface response {
    messages: any[];
    nextPageToken: string;
  }

  interface email {
    'id': string;
    'threadId': string;
    'labelIds': [string];
    'snippet': string;
    'historyId': number;
    'internalDate': number;
    'payload': {
      'partId': string;
      'mimeType': string;
      'filename': string;
      'headers': [
        {
          'name': string;
          'value': string;
        }
      ];
      'body': any;
      'parts': any[];
    };
    'sizeEstimate': number;
    'raw': Buffer;
  }
}
declare namespace Interfaces {
  interface parsedData {
    longName?: string;
    id?: string;
    strategy?: string;
    sender?: string;
    date?: string;
    total?: string;
    type?: string;
    [name: string]: string;
  }

  interface mapEntry {
    longName: string;
    regexs: {
      total: RegExp;
      plate?: RegExp;
      type?: RegExp;
      totalTime?: RegExp;
      distance?: RegExp;
    };
    template: string;
    templateScooter?: string;
  }

  interface strategyMap {
    [name: string]: mapEntry;
  }
}
