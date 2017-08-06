import {templates} from './templates';
/* eslint-disable no-unused-vars */
import Email from '../classes/Email';
/* eslint-enable no-unused-vars */

function parse(email: Email) {
  let strategy = /@(.+)\..*/.exec(email.sender.value)[1];
  let regexs;
  let parsedData: Interfaces.parsedData = {};
  for (let regex of Object.keys((regexs = (templates[strategy] || {regexs: null}).regexs || {}))) {
    let result;
    while ((result = regexs[regex].exec(email.body || '')) != null) {
      result.shift();
      result[0] = result[0].replace(',', '.');
      // Sum due to double invoices in some email
      parsedData[regex] = parsedData[regex]
        ? (parseFloat(parsedData[regex]) + parseFloat(result[0])).toFixed(2)
        : result[0];
    }
    // resetting the Regex due to \g flag
    regexs[regex].lastIndex = 0;
  }
  parsedData = Object.assign(parsedData, {
    longName: templates[strategy] ? templates[strategy].longName : 'Unidentified',
    id: email.id,
    telegramId: email.telegramId,
    strategy: strategy,
    sender: email.sender.value,
    date: email.date.value,
  });
  if (Object.keys(parsedData).length && parsedData.total) {
    console.log(`Email from ${email.sender.value} id: ${parsedData.id} - Sending notification`, parsedData);
  } else if (!parsedData.total) {
    console.log(`Email from ${email.sender.value} id: ${email.id} - No total found`, parsedData);
    parsedData = {
      error: 'No total found',
      parsedData: JSON.stringify(parsedData),
    };
  } else {
    console.log(`Email from ${email.sender.value} id: ${email.id} - No data found`, email);
    parsedData = {
      error: 'No data found',
      rawData: JSON.stringify(email),
    };
  }
  email.parsedData = parsedData;
}

export = parse;
