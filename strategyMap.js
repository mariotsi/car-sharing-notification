module.exports = {
  "enjoy.eni": {
    longName: 'Enjoy',
    regexs: {
      total: /IMPORTO DA ADDEBITARE.*(\d+\,\d\d)/g,
      plate: /TARGA\:.*([A-Z0-9]{7})\</g,
      type: /VEICOLO:.*>(.*)<\/font.*TARGA/g,
      totalTime: /DURATA TOTALE:.*>(.*)<\/font.*CHILOMETRI/g,
      distance: /CHILOMETRI PERCORSI\:.*?\>(\d+)</g
    },
    template: `    
<b>#longName#</b> 🚗

Hai speso #total#€ con l'auto targata <i>#plate#</i>
Veicolo: #type#
Durata: #totalTime#
Distanza: #distance# km
`,
    templateScooter: `    
<b>#longName#</b> 🏍

Hai speso #total#€ con lo scooter targato <i>#plate#</i>
Veicolo: #type#
Durata: #totalTime#
Distanza: #distance# km
`
  },
  "cartasi": {
    longName: 'Share\'ngo',
    regexs: {
      total: /Importo\: EUR (\d+\.\d\d)/g
    },
    template: `
<b>#longName#</b> 🔌

E' stata emessa una fattura di #total#€`
  },
  "payment.car2go": {
    longName: 'Car2Go',
    regexs: {
      total: /EUR.+(\d+\,\d\d)/g
    },
    template: `
<b>#longName#</b> 🚙

E' stata emessa una fattura di #total#€`
  },
  "drive-now": {
    longName: 'DriveNow',
    regexs: {
      total: /(\d+\,\d\d)/g,
      plate: /([A-Z]{2}\s\d{3}[A-Z]{2})/g
    },
    template: `
<b>#longName#</b>🏎

Hai speso #total#€ con l'auto targata <i>#plate#</i>`
  }
};