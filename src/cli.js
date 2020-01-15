const Cli = require('caporal');
const Inquirer = require('inquirer');
const Joi = require('@hapi/joi');
const Conf = require('conf');
const Keytar = require('keytar');
const Password = require('secure-random-password');

Cli.version(require('../package.json').version);

Cli.command('monitor', 'Start to monitor for order fills.')
  .option('-e, --encKey <encKey>', 'Skip Keytar and use this encryption key instead (Only use this if you know what you\'re doing).')
  .action(async (args, options) => {
    const config = await getConfig(options);
    const RektAlert = require('.');
    const monitor = new RektAlert(config);
    monitor.start();
  });

Cli.command('setup', 'Run assistant to generate a config file.')
  .option('-e, --encKey <encKey>', 'Skip Keytar and use this encryption key instead (Only use this if you know what you\'re doing).')
  .action(async (args, options) => {
    const config = await getConfig(options);

    const answer = await Inquirer
      .prompt([
        {
          type: 'list',
          name: 'choice',
          choices: [ 'Set Telegram Token', 'Add FTX Api Key', 'Edit FTX API Key', 'Delete FTX API Key', 'Cancel' ]
        }
      ])

    switch (answer.choice) {
      case 'Set Telegram Token':
        await setTelegram(config);
        break;
      case 'Add FTX Api Key':
        await addFTXApi(config);
        break;
      case 'Edit FTX API Key':
        await editFTXApi(config);
        break;
      case 'Delete FTX API Key':
        await deleteFTXApi(config);
        break;
      case 'Cancel':
        process.exit(0);
    }

    console.log('Encrypted config file saved!');
  });

async function setTelegram(config) {
  const answers = await Inquirer
  .prompt([
    {
      type: 'input',
      name: 'tgToken',
      message: 'Enter the Telegram Bot Token:',
      default: config.get('telegram.token'),
      validate: input => {
        return !Joi.string().required().validate(input).error;
      }
    }
  ]);

  config.set('telegram.token', answers.tgToken);
}

async function addFTXApi(config) {
  const answers = await Inquirer
    .prompt([
      {
        type: 'input',
        name: 'subAccount',
        message: '(Optional) Subaccount name. Leave empty and press enter for main account:'
      },
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter the Exchange API Key (Please make sure it\'s a READ-ONLY key!):',
        validate: input => {
          return !Joi.string().required().validate(input).error;
        }
      },
      {
        type: 'input',
        name: 'apiSecret',
        message: 'Enter the Exchange API Secret:',
        validate: input => {
          return !Joi.string().required().validate(input).error;
        }
      },
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Do you want to add another account?',
        default: false
      }
    ]);

    const ftxAccList = config.get('ftx') || [];

    ftxAccList.push({
      key: answers.apiKey,
      secret: answers.apiSecret,
      subaccount: answers.subAccount.trim() || undefined
    });

    config.set('ftx', ftxAccList);

    if (answers.addMore) {
      await addFTXApi(config);
    }
}

async function editFTXApi(config) {
  const selectedApiKey = await selectFTXApi(config);
  const ftxAccList = config.get('ftx');
  const idx = ftxAccList.findIndex(acc => acc.key === selectedApiKey);
  const acc = ftxAccList[idx];

  const answers = await Inquirer
    .prompt([
      {
        type: 'input',
        name: 'subAccount',
        default: acc.subaccount,
        message: '(Optional) New subaccount name. Leave empty and press enter for main account:'
      },
      {
        type: 'input',
        name: 'apiKey',
        default: acc.key,
        message: 'Enter new Exchange API Key (Please make sure it\'s a READ-ONLY key!):',
        validate: input => {
          return !Joi.string().required().validate(input).error;
        }
      },
      {
        type: 'input',
        name: 'apiSecret',
        default: acc.secret,
        message: 'Enter new Exchange API Secret:',
        validate: input => {
          return !Joi.string().required().validate(input).error;
        }
      }
    ]);

    ftxAccList[idx] = {
      key: answers.apiKey,
      secret: answers.apiSecret,
      subaccount: answers.subAccount.trim() || undefined
    };

    config.set('ftx', ftxAccList);
}

async function deleteFTXApi(config) {
  const selectedApiKey = await selectFTXApi(config);
  config.set('ftx', accounts.filter(acc => acc.key !== selectedApiKey));
}

function formatApiKey(acc) {
  return `${acc.key.substring(0, 6)}...${acc.key.slice(-6)}`;
}

async function selectFTXApi(config) {
  const accounts = config.get('ftx') || [];

  if (accounts.length === 0) {
    console.log('No FTX API Keys configured yet.');
    process.exit(0);
  }

  const list = accounts.map(acc => {
    return {
      name: acc.subaccount ? acc.subaccount + `(${formatApiKey(acc)})` : `Main (${formatApiKey(acc)})`,
      value: acc.key
    }
  });

  const answer = await Inquirer
    .prompt([
      {
        type: 'list',
        name: 'choice',
        choices: [
          ...list,
          'Cancel'
        ]
      }
    ]);

  const { choice } = answer;

  if (choice === 'Cancel') process.exit(0);

  return choice;
}

async function getConfig(options) {
  let encKey;

  if (options.encKey) {
    encKey = options.encKey;
  } else {
    encKey = await Keytar.getPassword('rektalert', 'default');

    if (encKey === null) {
      encKey = Password.randomPassword({ length: 32 });
      Keytar.setPassword('rektalert', 'default', encKey);
    }
  }

  return new Conf({
    projectName: 'rektalert',
    encryptionKey: encKey
  });
}

Cli.parse(process.argv);
