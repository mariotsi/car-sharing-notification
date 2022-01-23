export type ParsedData = {
  longName?: string;
  id?: string;
  strategy: string;
  sender?: string;
  date?: string;
  error?: string;
  parsedData?: any;
  rawData?: any;
  total?: string;
  type?: string;
  uuid?: string;
  sent?: string;
  [name: string]: string | undefined;
};

export type MapEntry = {
  longName: string;
  emailDomain?: string;
  regexs: {
    total: RegExp;
    plate?: RegExp;
    type?: RegExp;
    totalTime?: RegExp;
    distance?: RegExp;
    rentDate?: RegExp;
  };
  template: string;
  templateScooter?: string;
};

export type StrategyMap = {
  [name: string]: MapEntry | undefined;
};
