// / <reference path="typings/Interfaces.ts" />

const strategyMap: Interfaces.strategyMap = {
  'enjoy.eni': {
    longName: 'Enjoy',
    regexs: {
      total: /IMPORTO DA ADDEBITARE.+?(\d+\,\d{2})/g,
      plate: /TARGA\:.*([A-Z0-9]{7})\</g,
      type: /VEICOLO:.*>(.*)<\/font.*TARGA/g,
      totalTime: /DURATA TOTALE:.*>(.*)<\/font.*CHILOMETRI/g,
      distance: /CHILOMETRI PERCORSI\:.*?\>(\d+)</g,
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
  'cartasi': {
    longName: 'Share\'ngo',
    regexs: {
      total: /Importo\: EUR (\d+[\.\,]\d{2})/g,
    },
    // prettier-ignore
    template: '<b>#longName#</b> 🔌\n' +
              '\n' +
              'È stata emessa una fattura di #total#€',
  },
  'drive-now': {
    longName: 'DriveNow',
    regexs: {
      total: /(\d+\,\d{2})/g,
      plate: /([A-Z]{2}\s\d{3}[A-Z]{2})/g,
    },
    // prettier-ignore
    template: '<b>#longName#</b>🏎\n' +
              '\n' +
              'Hai speso #total#€ con l\'auto targata <i>#plate#</i>',
  },
};
(() =>
  ['moovel', 'payment.car2go'].forEach((element) => {
    strategyMap[element] = {
      longName: 'Car2Go',
      regexs: {
        total: /EUR.+?(\d+\,\d{2})/g,
      },
      // prettier-ignore
      template: '<b>#longName#</b> 🚙\n' +
                '\n' +
                'È stata emessa una fattura di #total#€',
    };
  }))();
export {strategyMap};
