const tmi = require('tmi.js');
const fs = require('fs');
var ADMIN_USERS = {}
const BOT_USERNAME = 'bifahbot'
const CHANNELS_LIST = restoreChannels()

const opts = {
  identity: {
    username: BOT_USERNAME,
    password: AUTH_TOKEN
  },
  channels: CHANNELS_LIST
};
var DEFAULT_COMMANDS = ['add', 'remove', 'grant', 'ungrant', 'setinterval', 'removeinterval', 'count', 'resetcount']
var commandList = { };
var intervals = {};
var counts = {}
//intercepta mensagem do chat
function mensagemChegou(alvo, context, mensagem, ehBot) {
  if (context.username === 'bifah') { console.log(context)}
  try {
    if (ehBot) {
      return; //se for mensagens do nosso bot ele não faz nada
    }

    const raw = mensagem.trim().toLowerCase().split(' ');// remove espaço em branco da mensagem para verificar o comando
    var nomeDoComando = raw[0];
    // checando o nosso comando
    if (nomeDoComando.startsWith('!')) {
      nomeDoComando = nomeDoComando.slice(1);
      if (nomeDoComando === 'commands') {
        var commands = Object.keys(commandList);
        if (commands.length > 0) {
          client.say(alvo, `@${context['display-name']} os comandos disponiveis são ${commands.join(', ')}`);
        } else {
          client.say(alvo, `@${context['display-name']} nenhum comando cadastrado`);
        }
      } else if (nomeDoComando === 'remove') {
        if (isAdmin(context.username)) {
          var cmdToRemove = raw[1]
          if (typeof commandList[cmdToRemove] !== 'undefined') {
            delete commandList[cmdToRemove];
            client.say(alvo, `command ${cmdToRemove} removed`);
            saveCommands();
          }
        }
      } else if (nomeDoComando === 'grant') {
        if (isAdmin(context.username) && raw.length === 2 ) {
          ADMIN_USERS[raw[1]] = true;
          client.say(alvo, `now, ${raw[1]}, can add new commands`);
          saveAdmins();
        }
      } else if (nomeDoComando === 'ungrant') {
        if (isAdmin(context.username) && raw.length === 2 && raw[1] !== 'bifah' && raw[1]!==context.username) {
          delete ADMIN_USERS[raw[1]];
          client.say(alvo, `${raw[1]} removed from adms`);
          saveAdmins();
        }
      } else if (nomeDoComando === 'setinterval') {
        if (isAdmin(context.username)) {
          var key = raw[1];
          var time = parseInt(raw[2]);
          var message = raw.splice(3);
          console.log(`${key} ${message} (${new Date()} - automatica a cada ${time} minutos) `);
          if (typeof intervals[key] === 'undefined' && !isNaN(time)) {
            intervals[key] = setInterval(() => {
              client.say(alvo, `${message} (${new Date().getTime()} - mensangem automatica a cada ${time} minutos) `);
            }, time * 1000 * 60);
          } else {
            client.say(alvo, 'usage: !setInterval $KEY $TIME_MINUTES $MESSAGE');
          }
        }
      } else if (nomeDoComando === 'clearinterval') {
        if (isAdmin(context.username)) {
          var key = raw[1];
          if (typeof intervals[key] !== 'undefined') {
            clearInterval(intervals[key]);
            delete intervals[key];
          }
        }
      } else if (nomeDoComando === 'count' || nomeDoComando === 'resetcount') {
        if (isAdmin(context.username)) {
          var countName = raw[1];
          if (typeof counts[countName] === 'undefined' || countName === resetcount) {
            counts[countName] = 0;
            client.say(alvo, `count ${countName} created/reset`);
            saveCounts();
          }
        }
      } else if (nomeDoComando === 'add') {
        if (!isAdmin(context.username)) {
          client.say(alvo, `@${context['display-name']} deixe de ser buliçoso(a), apenas ${Object.keys(ADMIN_USERS).join(', ')} podem usar esse comando`);
        } else if (raw.length > 2) {
          var newCommand = raw[1]
          var reply = raw.slice(2).join(' ');
          if (typeof commandList[newCommand] !== 'undefined' || DEFAULT_COMMANDS.indexOf(newCommand) >= 0 || Object.keys(counts).indexOf(newCommand) >= 0) {
            client.say(alvo, `command ${newCommand} already exists`);
          } else {
            commandList[newCommand] = { reply };
            client.say(alvo, `command ${newCommand} created`);
            saveCommands();
          }
        } else {
          client.say(alvo, 'deixe de ser preguiçoso, para adicionar um comando digite !add $CMD $REPLY');
        }
  
      } else if (typeof counts[nomeDoComando] !== 'undefined') {
        counts[nomeDoComando]++;
        client.say(alvo, `${alvo} já ${nomeDoComando} ${counts[nomeDoComando]} vezes`);
        saveCounts();
      } else if (typeof commandList[nomeDoComando] !== 'undefined') {
        client.say(alvo, `${commandList[nomeDoComando].reply.replace('/me', '@'+context['display-name'])}`);
      }
    }
  } catch (e) { console.error('error', e); }
}

function entrouNoChatDaTwitch(endereco, porta) {
  console.log(`* Bot entrou no endereço ${endereco}:${porta}`);
  client.say('robsss', ``)
}
function saveCommands() {
  fs.writeFileSync('commands.json', JSON.stringify(commandList, null, '  '));
}

function restoreCommands() {
  if (fs.existsSync('commands.json')) {
    var buffer = fs.readFileSync('commands.json');
    try {
      commandList = JSON.parse(buffer.toString('utf-8'));
    } catch (e) {
      commandList = {};
    }
  }
}
function saveCounts() {
  fs.writeFileSync('counts.json', JSON.stringify(counts, null, '  '));
}

function restoreCounts() {
  if (fs.existsSync('counts.json')) {
    var buffer = fs.readFileSync('counts.json');
    try {
      counts = JSON.parse(buffer.toString('utf-8'));
    } catch (e) {
      counts = {};
    }
  }
}

function saveAdmins() {
  fs.writeFileSync('admins.json', JSON.stringify(ADMIN_USERS, null, '  '));
}

function restoreAdmins() {
  if (fs.existsSync('admins.json')) {
    var buffer = fs.readFileSync('admins.json');
    try {
      ADMIN_USERS = JSON.parse(buffer.toString('utf-8'));
    } catch (e) {
      ADMIN_USERS = {};
    }
  }
  if (Object.keys(ADMIN_USERS).length === 0) {
    ADMIN_USERS['bifah']= true;
    saveAdmins();
  }
}

function restoreChannels() {
  var ret = [];
  if (fs.existsSync('channels.json')) {
    var buffer = fs.readFileSync('channels.json');
    try {
      ret = JSON.parse(buffer.toString('utf-8'));
    } catch (e) {
      ret = [];
    }
  }
  if (ret.length === 0) {
    ret.push('robsss');
  }

  return ret;
}

function isAdmin(username) {
  return Object.keys(ADMIN_USERS).indexOf(username) >= 0;
}
// Cria um cliente tmi com  nossas opções
const client = new tmi.client(opts);
restoreCommands();
restoreAdmins();
restoreCounts();
// Registra nossas funções
client.on('message', mensagemChegou);
client.on('error', (error) => { console.log('error', error)});
client.on('connected', entrouNoChatDaTwitch);
// Connecta na Twitch:
client.connect().then((resp) => { console.log('asd', resp)});
