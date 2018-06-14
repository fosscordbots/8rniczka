const {Client, Util} = require('discord.js')
const config = require('./config.json')
const ytdl = require('ytdl-core')
const Youtube = require('simple-youtube-api')
const chalk = require('chalk')

const client = new Client({ disableEveryone: true })
const youtube = new Youtube(config.youtubeapikey)

const queue = new Map()

client.on('ready', () => {
  console.log(chalk.black.bgGreen('SUCCESS') + chalk.white(' 8rniczka initialized.'))
  client.user.setPresence({
    game: {
      name: 'Portal 3',
      type: 0
    }
  })
})
client.on('message', async message => {
  if (message.author.bot) return

  if (message.content.toLowerCase().includes('kurwa') || message.content.toLowerCase().includes('chuj') || message.content.toLocaleLowerCase().includes('pierdol')) {
    message.react(message.guild.emojis.find('name', 'bezkappy'))
    message.reply(`Jak ty sie wyrażasz (tak brzydko) ${message.guild.emojis.find('name', 'banhammer')}`)
  }
  if (message.channel.type === 'dm') {
    message.reply(':warning: Zjeżdzaj partolony skrytopiszu. Na serwerek idź a nie.')
    return
  }

  if (!message.content.startsWith(config.prefix)) return

  let command = message.content.toLowerCase().split(' ')[0]
  command = command.slice(config.prefix.length)
  const args = message.content.split(' ')
  const toSearch = args.slice(1).join(' ')
  const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : ''
  const serverQueue = queue.get(message.guild.id)
  if (command === 'play') {
    const voiceChannel = message.member.voiceChannel
    if (!voiceChannel) return message.channel.send('Pierwiej się na kanał wpartol, a nie. Mam dołączyć do niczego?')
    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has('CONNECT')) return message.channel.send('oll... nie mam, kluska, permisyji w misyji. daj mi dołączyć :<')
    if (!permissions.has('SPEAK')) return message.channel.send('oll... nie mam, kluska, permisyji w misyji. gadać nie moge')

    if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
      const playlist = await youtube.getPlaylist(url)
      const videos = await playlist.getVideos()
      for (const video of Object.values(videos)) {
        const nextVideo = await youtube.getVideoByID(video.id)
        await videoHandler(nextVideo, message, voiceChannel, true)
      }
      return message.channel.send(`:success: Zarzuciłem plajlistyjkę do kolejki.`)
    } else {
      try {
        const video = await youtube.getVideo(url)
      } catch (err) {
        try {
          const videos = await youtube.searchVideos(toSearch, 10)
          let i = 0
          message.channel.send(`
                    :musical_note: WYBIERZ JEDNO ŁRUUUU :musical_note:
                    
                    ${videos.map(videoSearch => `**${++i}** - ${videoSearch.title}`).join('\n')}

                    Panie, wybierz waćpan jedną, kluska, filmiczkę z tych tutej.`)
          try {
            const response = await message.channel.awaitMessages(response => response.content > 0 && response.config < 11, {
              maxMatches: 1,
              time: 10000,
              errors: ['time']
            })
          } catch (err) {
            console.log(chalk.bgRed('ERROR') + chalk.white('Frickin\' bad thing happened.'))
            return message.channel.send('Argh... żeś zły numerek wybrał. cofam to i wszystkie sęki na świecie.')
          }
          const videoIndex = parseInt(response.first().content)
          const video = await youtube.getVideoByID(videos[videoIndex - 1].id)
        } catch (err) {
          console.log(chalk.bgRed + 'ERROR' + chalk.white + 'Frickin\' bad thing happened.')
          return message.channel.send('Frick... błądzisze mamy... nie mogłem tych partolonych wyników zacyganić. \n' + err)
        }
      }
      return videoHandler(video, message, voiceChannel)
    }
  }
  if (command === 'skip') {
    if (!message.member.voiceChannel) return message.channel.send('Kolejny capan, dołącz do kanału.')
    if (!serverQueue) return message.channel.send('ile razy mam mówić, że nie skipnę jak niczego nie ma.')
    serverQueue.connection.dispatcher.end('Skipli sobie')
    return
  }
  if (command === 'queue') {
    if (!serverQueue) return message.channel.send(':warning: nic nie gra to co drzesz morde.')
    return message.channel.send(`
    :musical_note: Kolejka do ~~biedronki~~ Spotify :musical_note:
    
    ${serverQueue.songs.map(song => `:notes: ${song.title}`).join('\n')}

    Teraz leci krew z nosa: ${serverQueue.songs[0].title}
    `)
  }
  if (command === 'pause') {
    if (serverQueue && serverQueue.playing) {
      serverQueue.playing = false
      serverQueue.connection.dispatcher.pause()
      return message.channel.send('⏸ Witam i o pauze pytam stfu.')
    }
    return message.channel.send('tak jak juz wspominalem, z pustego to i samolot nie spauzuje')
  }
  if (command === 'resume') {
    if (serverQueue && !serverQueue.playing) {
      serverQueue.playing = true
      serverQueue.connection.dispatcher.resume()
      return message.channel.send('▶ WŁONCZYŁEM')
    }
    return message.channel.send('O ja! nic nie gra. z pustego to i samolot nie naleje')
  }

  message.channel.send(':warning: Czy tobie mamusia nie mówiła aby nie zarzucać czegoś czego nie ma? idz trzepnij się głową o powietrze.')
})
async function videoHandler (video, message, voiceChannel, playlist = false) {
  const serverQueue = queue.get(message.guild.id)
  console.log(video)
  const song = {
    id: video.id,
    title: Util.escapeMarkdown(video.title),
    url: `https://www.youtube.com/watch?v=${video.id}`
  }
  if (!serverQueue) {
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    }
    queue.set(message.guild.id, queueConstruct)

    queueConstruct.songs.push(song)

    try {
      var connection = await voiceChannel.join()
      queueConstruct.connection = connection
      play(message.guild, queueConstruct.songs[0])
    } catch (error) {
      console.log(chalk.bgRed + 'Error' + chalk.white + `Nie moglem sie na kanala wpartolic: ${error}`)
      queue.delete(message.guild.id)
      return message.channel.send(`I could not join the voice channel: ${error}`)
    }
  } else {
    serverQueue.songs.push(song)
    console.log(serverQueue.songs)
    if (playlist) return undefined
    else return message.channel.send(`✅ **${song.title}** dodalem do stfulisty!`)
  }
  return undefined
}

function play (guild, song) {
  const serverQueue = queue.get(guild.id)

  if (!song) {
    serverQueue.voiceChannel.leave()
    queue.delete(guild.id)
    return
  }
  console.log(serverQueue.songs)

  const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
    .on('end', reason => {
      if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.')
      else console.log(reason)
      serverQueue.songs.shift()
      play(guild, serverQueue.songs[0])
    })
    .on('error', error => console.log(chalk.bgRed + 'Error' + chalk.white + error))
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)

  serverQueue.textChannel.send(`🎶 Radio Maryja teraz gra **${song.title}**`)
}

client.login(config.token)
