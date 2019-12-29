const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const Listr = require('listr')
const chalk = require('chalk')
const convertHrtime = require('convert-hrtime')
const constants = require('../utils/constants')
const medalBuilder = require('../utils/medal-builder')
const apiHelper = require('../utils/api-helper')
const bungieHelper = require('../utils/bungie-helper')
const urlBuilder = require('../utils/url-builder')
const statsHelper = require('../utils/stats-helper')
const description = require('../utils/grammar').description
const decode = require('../utils/html-entities').decode

const api = apiHelper.api()
const bungieApi = bungieHelper.api(false)
const enableMatchHistory = JSON.parse(process.env.ENABLE_MATCH_HISTORY)
const enablePreviousLeaderboards = JSON.parse(
  process.env.ENABLE_PREVIOUS_LEADERBOARDS
)

const fetch = async (config, incremental) => {
  const {
    paths: { ARTIFACTS, DIST, ROOT }
  } = config
  const dataPath = path.join(ROOT, 'data')
  const utc = moment.utc()
  const updatedDate = utc.format(constants.format.machineReadable)
  const parsed = {
    apiStatus: {
      alert: `It's with a heavy heart we announce that we have hosted our last event. <a href="/farewell">For more information please read our farewell statement</a>. Thanks for the memories Guardians.`,
      bungieStatus: constants.bungie.disabledStatusCodes[0],
      updatedDate,
      enrollmentOpen: false
    },
    clans: [],
    members: [],
    events: [],
    modifiers: [],
    medals: [],
    currentEventId: null,
    currentLeaderboards: [],
    currentClanLeaderboard: {},
    previousEventId: null,
    previousClanLeaderboard: {},
    matchHistory: {},
    lastChecked: {},
    leaderboards: {}
  }

  const parseLeaderboard = (leaderboard, eventId) => {
    const parsedLeaderboard = {}

    if (leaderboard) {
      leaderboard.map(member => {
        const id = member.idStr
        const clanId = `${member.clanId}`
        const lastChecked = member.lastChecked
        const games = member.gamesPlayed
        const hasPlayed = games > 0

        const totals = {
          eventId
        }

        if (hasPlayed) {
          const kills = member.kills
          const assists = member.assists
          const deaths = member.deaths
          const score = statsHelper.total(member.totalScore)

          totals.path = eventId
            ? urlBuilder.profileUrl(clanId, id, eventId)
            : urlBuilder.currentEventUrl(clanId, id)
          totals.rank = true
          totals.games = games
          totals.wins = member.gamesWon
          totals.kills = kills
          totals.assists = assists
          totals.deaths = deaths
          totals.kd = statsHelper.kd({ kills, deaths })
          totals.kda = statsHelper.kda({ kills, deaths, assists })
          totals.ppg = statsHelper.ppg({ games, score })
          totals.score = score
          totals.bonuses = parseBonuses(member, hasPlayed)

          parsedLeaderboard[id] = totals
        }

        if (lastChecked) {
          const clanLastCheckedDate = parsed.lastChecked[clanId]
          const memberlastCheckedDate = moment
            .utc(lastChecked)
            .format(constants.format.machineReadable)
          parsed.lastChecked[id] = memberlastCheckedDate

          if (
            !clanLastCheckedDate ||
            memberlastCheckedDate > clanLastCheckedDate
          )
            parsed.lastChecked[clanId] = memberlastCheckedDate
        }
      })
    }

    return parsedLeaderboard
  }

  const parseBonuses = (item, hasPlayed) => {
    const bonuses = [item.bonusPoints1, item.bonusPoints2]
    const excluded = [constants.prefix.notApplicable, constants.prefix.tbc]

    return bonuses
      .map((bonus, i) => ({
        shortName: bonus.shortName || `Bonus ${i + 1}`,
        count: hasPlayed
          ? typeof bonus === 'object'
            ? bonus.bonusPoints
            : bonus
          : -1
      }))
      .filter(({ shortName }) => excluded.indexOf(shortName) === -1)
  }

  const sourceStart = task => {
    return process.hrtime()
  }

  const sourceSucceed = (task, timer, resolve) => {
    const end = convertHrtime(process.hrtime(timer))

    task.output = `Duration: ${end.seconds.toFixed(3)}s`

    if (resolve) resolve()
  }

  const sourceFail = (err, reject) => {
    reject(err)
  }

  const sourceLoad = (task, url, update) => {
    return new Promise((resolve, reject) => {
      if (update) {
        task.output = `Fetching '${task.title}' from API`

        resolve(sourceUpdate(url))
      } else {
        task.output = `Restoring '${task.title}' from cache`

        sourceRead(url)
          .then(data => {
            resolve(data)
          })
          .catch(err => {
            if (err.code !== 'ENOENT') reject(err)

            task.output = `Updating '${task.title}' cache from API`

            resolve(sourceUpdate(url))
          })
      }
    })
  }

  const sourceRead = url => {
    const filePath = path.join(dataPath, `${url}.json`)

    return new Promise((resolve, reject) => {
      fs.readJSON(filePath)
        .then(data => {
          resolve(data)
        })
        .catch(err => reject(err))
    })
  }

  const sourceUpdate = url => {
    const filePath = path.join(dataPath, `${url}.json`)

    return new Promise((resolve, reject) => {
      api(url)
        .then(({ data }) => {
          fs.outputJson(filePath, data)
            .then(() => {
              resolve(data)
            })
            .catch(err => reject(err))
        })
        .catch(err => reject(err))
    })
  }

  const sourceOptions = {
    concurrent: true,
    collapse: false,
    dateFormat: false
  }
  const sources = [
    {
      title: 'Last updated',
      task: (ctx, task) => {
        return new Promise((resolve, reject) => {
          const url = 'Component/GetLastUpdatedTimes'
          const timer = sourceStart(task)

          sourceRead(url)
            .then(data => {
              ctx.cache = data.endpoints
            })
            .catch(() => {
              ctx.cache = {}
            })

          sourceUpdate(url)
            .then(data => {
              ctx.current = data.endpoints

              sourceSucceed(task, timer, resolve)
            })
            .catch(err => {
              sourceFail(err, reject)
            })
        })
      }
    },
    {
      title: 'Bungie',
      task: () =>
        new Listr(
          [
            {
              title: 'API status',
              skip: () => {
                return 'Permanently skip Bungie API status check'
              },
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  bungieApi('/Destiny2/Milestones')
                    .then(({ data }) => {
                      parsed.apiStatus.bungieStatus = data.ErrorCode

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            }
          ],
          sourceOptions
        )
    },
    {
      title: 'API',
      task: () =>
        new Listr(
          [
            {
              title: 'Enrollment open',
              skip: () => {
                return 'Permanently disable enrollment'
              },
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(task, 'Clan/AcceptingNewClans', true)
                    .then(data => {
                      parsed.apiStatus.enrollmentOpen = data || undefined

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Alert',
              skip: () => {
                return 'Permanently set alert'
              },
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(task, 'Event/GetCurrentAlert', true)
                    .then(data => {
                      parsed.apiStatus.alert = data || undefined

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Clans',
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  const parseClanIcon = path => {
                    return path.replace(/^.*_(\w*).*$/, '$1')
                  }

                  sourceLoad(
                    task,
                    'Clan/GetAllClans',
                    !ctx.cache.Clan ||
                      ctx.cache.Clan.GetAllClans !==
                        ctx.current.Clan.GetAllClans
                  )
                    .then(data => {
                      data.map(clan => {
                        const id = `${clan.groupId}`
                        const { medals, totals } = medalBuilder.parseMedals(
                          clan.medalUnlocks,
                          constants.prefix.clan
                        )

                        parsed.clans.push({
                          path: urlBuilder.clanUrl(id),
                          id,
                          name: decode(clan.name),
                          tag: decode(clan.tag),
                          motto: decode(clan.motto),
                          description: description(clan.description),
                          avatar: {
                            color: clan.backgroundColor,
                            foreground: {
                              color: clan.emblemColor1,
                              icon: parseClanIcon(clan.foregroundIcon)
                            },
                            background: {
                              color: clan.emblemColor2,
                              icon: parseClanIcon(clan.backgroundIcon)
                            }
                          },
                          medals,
                          medalTotals: totals
                        })
                      })

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Members',
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)
                  const avatarUrl = `${constants.bungie.baseUrl}${
                    constants.bungie.avatarPath
                  }`

                  const parseMemberIcon = path => {
                    if (
                      path &&
                      path !==
                        `${avatarUrl}${constants.bungie.defaultAvatarIcon}`
                    ) {
                      return path.replace(avatarUrl, '')
                    }

                    return undefined
                  }

                  sourceLoad(
                    task,
                    'Clan/GetAllMembers',
                    !ctx.cache.Clan ||
                      ctx.cache.Clan.GetAllMembers !==
                        ctx.current.Clan.GetAllMembers
                  )
                    .then(data => {
                      data.map(member => {
                        const id = member.profileIdStr
                        const clanId = `${member.groupId}`
                        const path = urlBuilder.profileUrl(clanId, id)
                        const totals = {
                          lastPlayed: '-1'
                        }
                        const currentScore = member.currentScore
                        const pastEvents = []

                        if (currentScore && currentScore.lastSeen) {
                          totals.lastPlayed = moment
                            .utc(currentScore.lastSeen)
                            .format(constants.format.date)
                          const games = currentScore.gamesPlayed

                          if (games > 0) {
                            const kills = currentScore.kills
                            const assists = currentScore.assists
                            const deaths = currentScore.deaths
                            const score = statsHelper.total(
                              currentScore.totalScore
                            )

                            totals.path = path
                            totals.rank = true
                            totals.games = games
                            totals.wins = currentScore.gamesWon
                            totals.kills = kills
                            totals.assists = assists
                            totals.deaths = deaths
                            totals.kd = statsHelper.kd({ kills, deaths })
                            totals.kda = statsHelper.kda({
                              kills,
                              deaths,
                              assists
                            })
                            totals.ppg = statsHelper.ppg({ games, score })
                            totals.score = score
                          }
                        }

                        if (member.history) {
                          member.history.map(match => {
                            const eventId = match.eventId
                            const results = match.results
                            const games = results.gamesPlayed
                            const score = statsHelper.total(results.totalScore)
                            const kills = results.totalKills
                            const assists = results.totalAssists
                            const deaths = results.totalDeaths
                            const bonuses = parseBonuses(results, true)
                            const { medals } = medalBuilder.parseMedals(
                              match.medals,
                              constants.prefix.profile
                            )

                            pastEvents.push({
                              id: eventId,
                              game: {
                                path: urlBuilder.eventUrl(eventId),
                                result: true,
                                name: results.eventData.name,
                                endDate: moment
                                  .utc(results.eventData.scoringEndDate)
                                  .format(constants.format.machineReadable),
                                medals
                              },
                              rank: statsHelper.ranking(results.rankInClan),
                              overall: statsHelper.ranking(results.overallRank),
                              games,
                              wins: results.gamesWon,
                              kd: statsHelper.kd({ kills, deaths }),
                              kda: statsHelper.kda({ kills, deaths, assists }),
                              bonuses,
                              bonusColumns: bonuses.map(
                                ({ shortName }) => shortName
                              ),
                              ppg: statsHelper.ppg({ games, score }),
                              score
                            })
                          })
                        }

                        const { medals } = medalBuilder.parseMedals(
                          member.medalUnlocks,
                          constants.prefix.profile
                        )
                        const icon = parseMemberIcon(member.icon)

                        parsed.members.push({
                          path,
                          id,
                          clanId,
                          name: member.name || constants.blank,
                          avatar: { icon },
                          platforms: [
                            {
                              id:
                                member.membershipType ||
                                constants.bungie.platformDefault,
                              percentage: 10
                            }
                          ],
                          tags: member.bonusUnlocks.length
                            ? member.bonusUnlocks.map(({ name }) => ({ name }))
                            : undefined,
                          medals: medals.length ? medals : undefined,
                          totals,
                          pastEvents: pastEvents.length ? pastEvents : undefined
                        })
                      })

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Events',
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(
                    task,
                    'Event/GetAllEvents',
                    !ctx.cache.Tournament ||
                      ctx.cache.Tournament.GetAllEvents !==
                        ctx.current.Tournament.GetAllEvents
                  )
                    .then(data => {
                      data.map(event => {
                        const id = event.eventId

                        // Ignore Iron Banner event
                        if (id === 130) return

                        const startDate = moment
                          .utc(event.startTime)
                          .format(constants.format.machineReadable)
                        const endDate = moment
                          .utc(event.scoringEndTime)
                          .format(constants.format.machineReadable)
                        const tense = event.eventTense
                        const statsGamesThreshold =
                          event.statsGamesThreshold ||
                          constants.statsGamesThreshold
                        var isCurrent = tense === constants.tense.current
                        var isPast = tense === constants.tense.past
                        var isFuture = tense === constants.tense.future
                        var path = urlBuilder.eventUrl(id)

                        if (isCurrent && endDate < updatedDate) {
                          isCurrent = false
                          isPast = true
                        }

                        if (isFuture && startDate < updatedDate) {
                          isCurrent = true
                          isFuture = false
                        }

                        if (isCurrent) {
                          path = urlBuilder.currentEventRootUrl
                          parsed.currentEventId = id
                          parsed.currentEventStatsGamesThreshold = statsGamesThreshold
                        }

                        const leaderboards = []
                        const results = event.result

                        if (results) {
                          constants.divisions.map(({ key, name, size }) => {
                            const leaderboard = results[key]

                            if (leaderboard) {
                              leaderboards.push({
                                leaderboard,
                                division: {
                                  name,
                                  size
                                }
                              })
                            }
                          })
                        }

                        var stats = event.stats

                        if (stats) {
                          const { totalClans, totalPlayers, totalGames } = stats

                          stats = {
                            totalClans,
                            totalActive: totalPlayers,
                            totalGames
                          }
                        }

                        const clanMedals = medalBuilder.parseMedals(
                          event.clanMedals,
                          constants.prefix.clan,
                          1
                        ).medals
                        const memberMedals = medalBuilder.parseMedals(
                          event.clanMemberMedals,
                          constants.prefix.profile,
                          1
                        ).medals
                        const medals = {}

                        if (clanMedals.length) medals.clans = clanMedals
                        if (memberMedals.length) medals.members = memberMedals

                        parsed.events.push({
                          path,
                          id,
                          name: event.name,
                          description: description(event.description),
                          sponsor: event.sponsoredBy,
                          startDate,
                          endDate,
                          isCurrent: isCurrent || undefined,
                          isPast: isPast || undefined,
                          isFuture: isFuture || undefined,
                          isCalculated: event.calculated || undefined,
                          modifiers: event.modifiers.map(({ id }) => id),
                          medals: Object.keys(medals).length
                            ? medals
                            : undefined,
                          stats: stats || undefined,
                          statsGamesThreshold
                        })

                        if (leaderboards.length)
                          parsed.leaderboards[id] = leaderboards
                      })

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Modifiers',
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(
                    task,
                    'Component/GetAllModifiers',
                    !ctx.cache.Component ||
                      ctx.cache.Component.GetAllModifiers !==
                        ctx.current.Component.GetAllModifiers
                  )
                    .then(data => {
                      data.map(
                        ({
                          id,
                          name,
                          shortName,
                          description,
                          scoringModifier,
                          scoringBonus,
                          multiplierBonus,
                          createdBy
                        }) => {
                          parsed.modifiers.push({
                            id,
                            name,
                            shortName: shortName || name.split(' ')[0],
                            description,
                            scoringModifier,
                            bonus: scoringBonus || multiplierBonus,
                            creatorId: createdBy.length ? createdBy : undefined
                          })
                        }
                      )

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Medals - Member',
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(
                    task,
                    'Component/GetAllMedals',
                    !ctx.cache.Component ||
                      ctx.cache.Component.GetAllMedals !==
                        ctx.current.Component.GetAllMedals
                  )
                    .then(data => {
                      parsed.medals = parsed.medals.concat(
                        medalBuilder.parseMedals(data, constants.prefix.profile)
                          .medals
                      )

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Medals - Clan',
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(
                    task,
                    'Component/GetAllClanMedals',
                    !ctx.cache.Component ||
                      ctx.cache.Component.GetAllClanMedals !==
                        ctx.current.Component.GetAllClanMedals
                  )
                    .then(data => {
                      parsed.medals = parsed.medals.concat(
                        medalBuilder.parseMedals(data, constants.prefix.clan)
                          .medals
                      )

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Current event - Leaderboard',
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(
                    task,
                    'Leaderboard/GetLeaderboard',
                    !ctx.cache.Leaderboard ||
                      ctx.cache.Leaderboard.GetLeaderboard !==
                        ctx.current.Leaderboard.GetLeaderboard
                  )
                    .then(data => {
                      constants.divisions.map(({ key, name, size }) => {
                        const leaderboard = data[`${key}Leaderboard`]

                        if (leaderboard && leaderboard.length > 0) {
                          parsed.currentLeaderboards.push({
                            leaderboard,
                            division: {
                              name,
                              size
                            }
                          })
                        }
                      })

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Current event - Clan leaderboards',
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(
                    task,
                    'Leaderboard/GetClanLeaderboard',
                    !ctx.cache.Leaderboard ||
                      ctx.cache.Leaderboard.GetClanLeaderboard !==
                        ctx.current.Leaderboard.GetClanLeaderboard
                  )
                    .then(data => {
                      parsed.currentClanLeaderboard = parseLeaderboard(data)

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Current event - Match history',
              skip: () => {
                if (!enableMatchHistory) return 'ENABLE_MATCH_HISTORY=false'
              },
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(
                    task,
                    'Leaderboard/GetAllPlayersHistory',
                    !ctx.cache.Leaderboard ||
                      ctx.cache.Leaderboard.GetAllPlayersHistory !==
                        ctx.current.Leaderboard.GetAllPlayersHistory
                  )
                    .then(data => {
                      const { history, matchHistorySize } = data

                      history.map(match => {
                        const id = match.memberShipIdStr
                        const existing = parsed.matchHistory[id]
                        const history = {
                          game: {
                            path: urlBuilder.pgcrUrl(match.pgcrId),
                            isExternal: true,
                            result:
                              match.gameWon === true
                                ? constants.result.win
                                : match.gameWon === false
                                ? constants.result.loss
                                : '',
                            name: match.gameType,
                            label: match.map,
                            endDate: moment
                              .utc(match.datePlayed)
                              .format(constants.format.machineReadable)
                          },
                          kills: match.kills,
                          assists: match.assists,
                          deaths: match.deaths,
                          bonuses: parseBonuses(match, true),
                          score: statsHelper.total(match.totalScore)
                        }

                        if (existing) {
                          existing.push(history)
                        } else {
                          parsed.matchHistory[id] = [history]
                        }
                      })

                      parsed.matchHistoryLimit = matchHistorySize

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            },
            {
              title: 'Previous event - Clan leaderboards',
              skip: () => {
                if (!enablePreviousLeaderboards)
                  return 'ENABLE_PREVIOUS_LEADERBOARDS=false'
              },
              task: (ctx, task) =>
                new Promise((resolve, reject) => {
                  const timer = sourceStart(task)

                  sourceLoad(
                    task,
                    'Leaderboard/GetPreviousClanLeaderboard',
                    !ctx.cache.Leaderboard ||
                      ctx.cache.Leaderboard.GetPreviousClanLeaderboard !==
                        ctx.current.Leaderboard.GetPreviousClanLeaderboard
                  )
                    .then(data => {
                      const { eventId, leaderboardList } = data[0]

                      parsed.previousEventId = eventId
                      parsed.previousClanLeaderboard = parseLeaderboard(
                        leaderboardList,
                        eventId
                      )

                      sourceSucceed(task, timer, resolve)
                    })
                    .catch(err => {
                      sourceFail(err, reject)
                    })
                })
            }
          ],
          sourceOptions
        )
    }
  ]

  console.log('Retrieving Data...')

  await new Listr(sources, { ...sourceOptions, concurrent: false })
    .run()
    .then(() => {
      const {
        apiStatus,
        clans,
        members,
        events,
        modifiers,
        medals,
        currentEventId,
        currentLeaderboards,
        currentClanLeaderboard,
        matchHistory,
        matchHistoryLimit,
        previousEventId,
        previousClanLeaderboard,
        lastChecked,
        leaderboards
      } = parsed

      const output = [
        chalk`{green [\u2713] Data Retrieved}`,
        `Bungie API status: ${apiStatus.bungieStatus}`,
        `Enrollment open: ${apiStatus.enrollmentOpen}`,
        `Alert: ${apiStatus.alert}`,
        `Clans: ${clans.length}`,
        `Members: ${members.length}`,
        `Members - Last checked: ${Object.keys(lastChecked).length}`,
        `Events: ${events.length}`,
        `Events - Leaderboards: ${Object.keys(leaderboards).length}`,
        `Modifiers: ${modifiers.length}`,
        `Medals - Member: ${
          medals.filter(({ type }) => type === constants.prefix.profile).length
        }`,
        `Medals - Clan: ${
          medals.filter(({ type }) => type === constants.prefix.clan).length
        }`,
        `Current event: ${currentEventId}`,
        `Current event - Leaderboard: ${currentLeaderboards.length}`,
        `Current event - Clan leaderboards: ${
          Object.keys(currentClanLeaderboard).length
        }`,
        `Current event - Match history: ${
          enableMatchHistory
            ? `${
                Object.keys(matchHistory).length
              } [limit: ${matchHistoryLimit}]`
            : 'disabled'
        }`,
        `Previous event: ${
          enablePreviousLeaderboards ? previousEventId : 'disabled'
        }`,
        `Previous event - Clan leaderboards: ${
          enablePreviousLeaderboards
            ? Object.keys(previousClanLeaderboard).length
            : 'disabled'
        }`
      ]

      console.log(output.join('\n'))
    })
    .catch(err => {
      fs.removeSync(ARTIFACTS)
      fs.removeSync(DIST)

      throw err
    })

  return parsed
}

module.exports = {
  fetch
}
