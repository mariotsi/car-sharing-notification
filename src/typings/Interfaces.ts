export interface ParsedData {
  longName?: string;
  id?: string;
  strategy?: string;
  sender?: string;
  date?: string;
  error?: string;
  parsedData?: any;
  rawData?: any;
  total?: string;
  type?: string;
  uuid?: string;
  sent?: string;
  [name: string]: string;
}

export interface MapEntry {
  longName: string;
  emailDomain?: string;
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

export interface StrategyMap {
  [name: string]: MapEntry;
}
