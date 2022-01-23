import { ParsedData, StrategyMap } from '../typings/Interfaces';

const templates: StrategyMap = {
  'enjoy_at_enjoy_eni_com_r48caepq4853yg_kb5d0266@icloud.com': {
    longName: 'Enjoy',
    regexs: {
      total: /DURATA TOTALE:[.\s\S]*TOTALE[.\s\S]*?(\d+,\d{2})/g,
      plate: /TARGA\:[.\S\s]*([A-Z0-9]{7})\</g,
      type: /VEICOLO:[.\s\S]*>(.*)<\/font[\s.\S]*TARGA/g,
      totalTime: /DURATA TOTALE:[\s.\S]*?(\d+ min)[\s.\S]*CHILOMETRI/g,
      distance: /CHILOMETRI PERCORSI\:[.\s\S]*?(\d+) km/g,
      rentDate: /TERMINE:[\s\S.]*?in data (.*:\d\d)/g,
    },
    template: `<b>#longName#</b> 🚗

Totale: <b>#total#€</b>
Targa: <i>#plate#</i>
Veicolo: #type#
Durata: #totalTime#
Distanza: #distance# km
Data: #rentDate#   
`,
  },
  'ecommerce@nexi.it': {
    longName: 'Mimoto',
    emailDomain: 'nexi',
    regexs: {
      total: /Importo\: EUR (\d+[\.\,]\d{2})/g,
    },
    template: `<b>#longName#</b> 🛵

Totale: <b>#total#€</b> 
Data: #rentDate#`,
  },
  'ciao@share-now.com': {
    longName: 'ShareNow',
    regexs: {
      total: /(\d+,?\.?\d{0,2}) EUR/g,
      plate: /([A-Z]{2}\s\d{3}[A-Z]{2})/g,
    },
    template: `<b>#longName#</b> 🏎

Totale: <b>#total#€</b> 
Data: #rentDate#`,
  },
  'profilo@cityscoot.eu': {
    longName: 'Cityscoot',
    emailDomain: 'cityscoot.eu',
    regexs: {
      total: /(\d+.\d\d)€/g,
      rentDate: /(dal.\d+\/.*\d{4})/g,
    },
    template: `<b>#longName#</b> 🛵

Totale: <b>#total#€</b> 
Periodo: #rentDate#`,
  },
  'info@mailing.ecooltra.com': {
    longName: 'eCooltra',
    emailDomain: 'ecooltra.com',
    regexs: {
      total: /€(\d+\.\d\d)/g,
      rentDate: /(\d+\/.*\d{4})/g,
    },
    template: `<b>#longName#</b> 🏍

Totale: <b>#total#€</b> 
Periodo: #rentDate#`,
  },
};

const fillTemplate = (context: ParsedData) => {
  if (!context) {
    return 'Errore nel parseTemplate -> context null';
  }
  let template = templates[context.strategy].template;
  if (context.total) {
    context.total = context.total.replace('.', ',');
  }
  for (const key of Object.keys(context)) {
    template = template.replace(`#${key}#`, context[key]);
  }
  return template;
};
const emailsToFilter = Array.from(new Set(Object.keys(templates).map((key) => templates[key].emailDomain || key)));
export { templates, fillTemplate, emailsToFilter };
