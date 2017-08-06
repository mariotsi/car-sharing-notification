const users: Map<number, any> = new Map();

async function setUsers() {
  users.set(Number(process.env['TELEGRAM:clientId']), {
    tokens2: {
      access_token: '',
      token_type: 'Bearer',
      expiry_date: 1502025966777,
    },
  });
}

export {setUsers, users as list};
