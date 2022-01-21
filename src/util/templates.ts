import {ParsedData, StrategyMap} from '../typings/Interfaces';

const templates: StrategyMap = {
  'enjoy.eni': {
    longName: 'Enjoy',
    regexs: {
      total: /TOTALE NOLEGGIO [.\s\S]*?(\d+,\d{2})/g,
      plate: /TARGA\:[.\S\s]*([A-Z0-9]{7})\</g,
      type: /VEICOLO:[.\s\S]*>(.*)<\/font[\s.\S]*TARGA/g,
      totalTime: /DURATA TOTALE:[\s.\S]*?(\d+ min)[\s.\S]*CHILOMETRI/g,
      distance: /CHILOMETRI PERCORSI\:[.\s\S]*?(\d+) km/g,
    },
    // prettier-ignore
    template: '<b>#longName#</b> 🚗\n' +
        '\n' +
        'Hai speso #total#€ con l\'auto targata <i>#plate#</i>\n' +
        'Veicolo: #type#\n' +
        'Durata: #totalTime#\n' +
        'Distanza: #distance# km\n',
    // prettier-ignore
    templateScooter: '<b>#longName#</b> 🏍\n' +
        '\n' +
        'Hai speso #total#€ con lo scooter targato <i>#plate#</i>\n' +
        'Veicolo: #type#\n' +
        'Durata: #totalTime#\n' +
        'Distanza: #distance# km\n',
  },
  'sharengo': {
    longName: 'Share\'ngo',
    emailDomain: 'nexi',
    regexs: {
      total: /Importo\: EUR (\d+[\.\,]\d{2})/g,
    },
    // prettier-ignore
    template: '<b>#longName#</b> 🔌\n' +
        '\n' +
        'È stata emessa una fattura di #total#€',
  },
  'mimoto': {
    longName: 'Mimoto',
    emailDomain: 'nexi',
    regexs: {
      total: /Importo\: EUR (\d+[\.\,]\d{2})/g,
    },
    // prettier-ignore
    template: '<b>#longName#</b> 🛵\n' +
        '\n' +
        'È stata emessa una fattura di #total#€',
  },
  'drive-now': {
    longName: 'DriveNow',
    regexs: {
      total: /(\d+,?\.?\d{0,2}) EUR/g,
      plate: /([A-Z]{2}\s\d{3}[A-Z]{2})/g,
    },
    // prettier-ignore
    template: '<b>#longName#</b>🏎\n' +
        '\n' +
        'Hai speso #total#€ con l\'auto targata <i>#plate#</i>',
  },
};
(() =>
  ['moovel', 'payment.car2go', 'car2go'].forEach((element) => {
    templates[element] = {
      longName: 'Car2Go',
      regexs: {
        total: /EUR.+?(\d+,\d{2})|.+?(\d+,\d{2}) EUR|(\d+,\d{2}) EUR|Importo: (\d+,\d{2})/g,
      },
      // prettier-ignore
      template: '<b>#longName#</b> 🚙\n' +
            '\n' +
            'È stata emessa una fattura di #total#€',
    };
  }))();
const fillTemplate = (context: ParsedData) => {
  if (!context) {
    return 'Errore nel parseTemplate -> context null';
  }
  let template = templates[context.strategy].template;
  if (context.total) {
    context.total = context.total.replace('.', ',');
  }
  if (!!context.type && context.type.includes('MP3')) {
    // Enjoy Piaggio MP3
    template = templates[context.strategy].templateScooter;
  }
  for (const key of Object.keys(context)) {
    template = template.replace(`#${key}#`, context[key]);
  }
  return template;
};
const emailsToFilter = Array.from(new Set(Object.keys(templates).map((key) => templates[key].emailDomain || key)));
export {templates, fillTemplate, emailsToFilter};
