const tmi = require('tmi.js');
const fs = require('fs');
var ADMIN_USERS = {}
const BOT_USERNAME = 'bifahbot'
const CHANNELS_LIST = restoreChannels()
const AUTH_TOKEN = getAuthToken(); 

const opts = {
  identity: {
    username: BOT_USERNAME,
    password: AUTH_TOKEN
  },
  channels: CHANNELS_LIST
};
var DEFAULT_COMMANDS = ['add', 'remove', 'grant', 'ungrant', 'setinterval', 'removeinterval', 'count', 'resetcount', 'time', 'hora', 'alias', 'unalias']
var commandMap = {};
var intervalMap = {};
var countMap = {}
var aliasMap = {}
function onMessage(target, context, mensagem, self) {
  try {
    if (self) {
      return;
    }

    const raw = mensagem.trim().toLowerCase().split(' ');// remove espaço em branco da mensagem para verificar o comando
    var nomeDoComando = raw[0];
    if (nomeDoComando.startsWith('!')) {
      nomeDoComando = nomeDoComando.slice(1);
      if (typeof aliasMap[nomeDoComando] !== 'undefined') {
        nomeDoComando = aliasMap[nomeDoComando];
      }
      if (nomeDoComando === 'commands') {
        var commands = Object.keys(commandMap);
        commands = commands.concat(Object.keys(countMap));
        if (commands.length > 0) {
          client.say(target, `@${context['display-name']} os comandos disponiveis são ${commands.join(', ')}`);
        } else {
          client.say(target, `@${context['display-name']} nenhum comando cadastrado`);
        }
      } else if (nomeDoComando === 'remove') {
        if (isAdmin(context.username)) {
          var cmdToRemove = raw[1]
          if (typeof commandMap[cmdToRemove] !== 'undefined') {
            delete commandMap[cmdToRemove];
            client.say(target, `command ${cmdToRemove} removed`);
            saveCommands();
          } else if (typeof countMap[cmdToRemove] !== 'undefined') {
            delete countMap[cmdToRemove];
            client.say(target, `count ${cmdToRemove} removed`);
            saveCounts();
          }
        }
      } else if (nomeDoComando === 'alias') {
        if (isAdmin(context.username) && raw.length === 3) {
          if (commandExists(raw[1]) && canCreateCommand(raw[2])) {
            client.say(target, `alias created betwen ${raw[1]} and ${raw[2]}`);
            aliasMap[raw[1]] = raw[2];
            saveAlias();
          }

        }
      } else if (nomeDoComando === 'unalias') {
        if (isAdmin(context.username) && raw.length === 2 && typeof aliasMap[raw[1]] !== 'undefined') {
          client.say(target, `alias ${raw[1]} removed`);
          delete aliasMap[raw[1]];
          saveAlias();
        }
      } else if (nomeDoComando === 'grant') {
        if (isAdmin(context.username) && raw.length === 2) {
          ADMIN_USERS[raw[1]] = true;

          saveAdmins();
        }
      } else if (nomeDoComando === 'ungrant') {
        if (isAdmin(context.username) && raw.length === 2 && raw[1] !== 'bifah' && raw[1] !== context.username) {
          delete ADMIN_USERS[raw[1]];
          client.say(target, `${raw[1]} removed from adms`);
          saveAdmins();
        }
      } else if (nomeDoComando === 'setinterval') {
        if (isAdmin(context.username)) {
          var key = raw[1];
          var time = parseInt(raw[2]);
          var message = raw.splice(3);

          if (typeof intervalMap[key] === 'undefined' && !isNaN(time)) {
            client.say(target, `${message} (${new Date().getTime()} - mensangem automatica a cada ${time} minutos) `);
            intervalMap[key] = { target, message, time, key };
            intervalMap[key].id = setInterval(() => {
              client.say(target, `${message} (${new Date().getTime()} - mensangem automatica a cada ${time} minutos) `);
            }, time * 1000 * 60);
            saveIntervals();
          } else {
            client.say(target, 'usage: !setInterval $KEY $TIME_MINUTES $MESSAGE');
          }
        }
      } else if (nomeDoComando === 'clearinterval') {
        if (isAdmin(context.username, target)) {
          var key = raw[1];
          if (typeof intervalMap[key] !== 'undefined') {
            client.say(target, `interval ${key} canceled`);
            clearInterval(intervalMap[key].id);
            delete intervalMap[key];
            saveIntervals();
          }
        }
      } else if (nomeDoComando === 'count' || nomeDoComando === 'resetcount') {
        if (isAdmin(context.username)) {
          var countName = raw[1];
          if (typeof countMap[countName] === 'undefined' || countName === 'resetcount') {
            countMap[countName] = 0;
            client.say(target, `count ${countName} created/reset`);
            saveCounts();
          }
        }
      } else if (nomeDoComando === 'add') {
        if (!isAdmin(context.username)) {
          client.say(target, `@${context['display-name']} deixe de ser buliçoso(a), apenas ${Object.keys(ADMIN_USERS).join(', ')} podem usar esse comando`);
        } else if (raw.length > 2) {
          var newCommand = raw[1]
          var reply = raw.slice(2).join(' ');
          if (!commandExists(newCommand)) {
            client.say(target, `command ${newCommand} already exists`);
          } else {
            commandMap[newCommand] = { reply };
            client.say(target, `command ${newCommand} created`);
            saveCommands();
          }
        } else {
          client.say(target, 'deixe de ser preguiçoso, para adicionar um comando digite !add $CMD $REPLY');
        }
      } else if (nomeDoComando === 'time' || nomeDoComando === 'hora') {
        client.say(target, `${new Date().toLocaleString()}`);
      } else if (typeof countMap[nomeDoComando] !== 'undefined') {
        countMap[nomeDoComando]++;
        client.say(target, `${target} já ${nomeDoComando} ${countMap[nomeDoComando]} vezes`);
        saveCounts();
      } else if (typeof commandMap[nomeDoComando] !== 'undefined') {
        client.say(target, `${commandMap[nomeDoComando].reply.replace('/me', '@' + context['display-name'])}`);
      }
    }
  } catch (e) { console.error('error', e); }
}

function commandExists(cmd) {
  return typeof commandMap[cmd] != 'undefined' ||
    typeof commandMap[cmd] !== 'undefined' ||
    typeof aliasMap[cmd] !== 'undefined' ||
    typeof intervalMap[cmd] !== 'undefined' ||
    DEFAULT_COMMANDS.indexOf(cmd) >= 0;
}

function canCreateCommand(cmd) {
  return typeof commandMap[cmd] === 'undefined' &&
    typeof countMap[cmd] === 'undefined' &&
    typeof aliasMap[cmd] === 'undefined' &&
    typeof intervalMap[cmd] === 'undefined' &&
    DEFAULT_COMMANDS.indexOf(cmd) < 0;
}
function onConnected(address, port) {
  console.log(`* Bot entrou no endereço ${address}:${port}`);
  client.say('#robsss', `voltei`)
  restoreIntervals();
}
function saveCommands() {
  save('commands', commandMap);
}

function restoreCommands() {
  commandMap = restore('commands', {});
}
function saveCounts() {
  save('counts', countMap);
}

function restoreCounts() {
  countMap = restore('counts', {});
}

function saveAdmins() {
  save('admins', ADMIN_USERS);
}

function restoreAdmins() {
  ADMIN_USERS = restore('admins', { bifah: true });
}

function restoreChannels() {
  return restore('channels', ['robsss']);
}
function saveIntervals() {
  save('intervals', intervalMap);
}

function restoreIntervals() {
  intervalMap = restore('intervals', {});
  Object.keys(intervalMap).forEach((key) => {
    console.log('restoring interval ' + key + ' every ' + intervalMap[key].time + ' minutes');
    intervalMap[key] = setInterval(() => {
      client.say(intervalMap[key].target, `${intervalMap[key].message} (${new Date().getTime()} - mensangem automatica a cada ${intervalMap[key].time} minutos) `);
    }, intervalMap[key].time * 1000 * 60);
  })
}
function isAdmin(username, target) {
  return Object.keys(ADMIN_USERS).indexOf(username) >= 0 || ('#' + username) === target;
}

function getAuthToken() {
  //access https://twitchapps.com/tmi/ to generate token
  return restore('.token', {token:'token'}).token;
}
// Cria um cliente tmi com  nossas opções
const client = new tmi.client(opts);
restoreCommands();
restoreAdmins();
restoreCounts();
// Registra nossas funções
client.on('message', onMessage);
client.on('error', (error) => { console.log('error', error) });
client.on('connected', onConnected);
// Connecta na Twitch:
client.connect().then((resp) => { console.log('asd', resp) });

function save(filename, value) {
  fs.writeFileSync(`${filename}.json`, JSON.stringify(value, null, '  '));
}

function restore(filename, defaultValue) {
  var ret;
  if (fs.existsSync(`${filename}.json`)) {
    var buffer = fs.readFileSync(`${filename}.json`);
    try {
      ret = JSON.parse(buffer.toString('utf-8'));
    } catch (e) {
      ret = [];
    }
  }
  if (typeof ret === 'undefined' && typeof defaultValue !== 'undefined') {
    ret = defaultValue;
  }

  return ret;
}