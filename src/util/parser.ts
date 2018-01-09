import {templates} from './templates';
import {v4 as uuidV4} from 'uuid';
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
    date: email.date,
  });
  if (Object.keys(parsedData).length && parsedData.total) {
    parsedData.uuid = uuidV4();
    console.log(
      `Notification to ${parsedData.telegramId}. 
      Email from ${parsedData.longName} - Total €${parsedData.total} - ${parsedData.id}`
    );
  } else if (!parsedData.total) {
    console.log(
      `User ${parsedData.telegramId}. Email from ${parsedData.longName} - No total found - ${parsedData.id}`
    );
    parsedData = {
      error: 'No total found',
      unparsedData: email.body,
      parsedData: JSON.stringify(parsedData),
    };
  } else {
    console.log(
      `User ${parsedData.telegramId}. Email from ${parsedData.longName} - No data found - ${parsedData.id}`
    );
    parsedData = {
      error: 'No data found',
      unparsedData: email.body,
      rawData: JSON.stringify(email.body),
    };
  }
  email.parsedData = parsedData;
}

export = parse;
