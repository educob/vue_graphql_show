import Vue from "vue"
import gql from 'graphql-tag'


export const state = () => ({
  _id: null,
  nick: null,
  origin: '',
  aux1: null,
  marketplace: null,
  defaultAddress: null,
  roles: null,
  avatar: null,
  referral: null,
  opts: [],
  settings: {},
  frequents: {}, // 'john2': 'userIdxxxxxxxxxxxx',
  token: null,
  donation_address: null,
  fee_address: null,
  subscription: 0,
  subscriptionDate: null,
  thirdpartyDate: null,
  // queries
  chats: [],
  unread_chat: false,
  alerts: [],
  wallets: [],
  multisigs: [],
  smartcontracts: [],
  inheritances: [],
  timetrusts: [],
  recurringpays: [],
  payrequests: [],
  aftermessages: [],
})

export const getters = {
  _id: state => state._id,
  nick: state => state.nick,
  origin: state => state.origin,
  referral: state => state.referral,
  marketplace: state => state.marketplace,
  user: state => { return state }, // { _id: state._id, nick: state.nick, defaultAddress: state.defaultAddress } },
  defaultAddress: state => state.defaultAddress,
  opts: state => state.opts,
  settings: state => state.settings,
  frequents: state => state.frequents,
  frequent: state => nick => state.frequents[nick], // this.$store.getters['user/frequent']('pepe')
  frequent_nicks: state => {
    if(!state.frequents) return []
    return Object.keys(state.frequents).sort() 
  },
  frequent_has_userid: state => userId => {
    if(!state.frequents) return false
    return Object.keys(state.frequents).find(key => state.frequents[key] === userId)
  },
  chats: state => state.chats,
  chatMessages: state => {
    const chat = state.chats.find((elem, i, arr) => elem._id == _id)
    return chat.messages
  },
  showChatMenu: state => {
    return state.chats.some((elem, i, arr) => !!elem.messages.length)
  },
  unread_chat: state => state.unread_chat,
  alerts: state => state.alerts,
  wallets: state => state.wallets,
  multisigs: state => state.multisigs,
  smartcontracts: state => state.smartcontracts,
  inheritances: state => state.inheritances,
  timetrusts: state =>  state.timetrusts,
  recurringpays: state => state.recurringpays,
  payrequests: state => state.payrequests, 
  aftermessages: state => state.aftermessages,
  auhtenticated: state => !!state._id,
  roles: state => state.roles,
  avatar: state => state.avatar,
  role: state => name => !!state.roles && state.roles.includes(name),
  setting: state => {
    if(!state.settings) return null
    return state.settings[name]
  },
  token: state => state.token,
  donation_address: state => state.donation_address,
  fee_address: state => state.fee_address,
  subscription: state => state.subscription,
  subscriptionDate: state => state.subscriptionDate,
  thirdpartyDate: state => state.thirdpartyDate,
  isThirdparty: state => !!state.thirdpartyDate,
  get: state => (where, id) => {
    if(!state[where]) return null
    return state[where].find((elem, i, array) => elem._id == id)
  },
  // general read method
  find: state => (what, func) => {
    if(!state[what]) return null
    return state[where].find(func)
  },
}

export const mutations = {
  set: function(state, user) { // set user  
    state._id = user._id
    state.nick = user.nick
    state.origin = user.origin || ''
    state.referral = user.referral
    state.marketplace = user.marketplace
    state.defaultAddress = user.defaultAddress
    state.roles = user.roles
    state.avatar = user.avatar
    state.opts = user.opts
    state.settings = user.settings
    state.frequents = user.frequents || {} 
    state.donation_address = user.donation_address
    state.fee_address = user.fee_address
    state.subscription = user.subscription || 0
    state.subscriptionDate = user.subscriptionDate || null
    state.thirdpartyDate = user.thirdpartyDate || null
  },
  reset: (state) => {
    state._id = null
    state.nick = null
    state.origin = ''
    state.referral = null
    state.marketplace = null
    state.defaultAddress = null
    state.roles = null
    state.avatar = null
    state.opts = []
    state.settings = {}
    state.frequents = {}
    state.token = null,
    state.chats = []
    state.unread_chat = false,
    state.alerts = []
    state.wallets = []
    state.multisigs = []
    state.smartcontracts = []
    state.inheritances = []
    state.timetrusts = []
    state.recurringpays = []
    state.subscription = 0
    state.subscriptionDate = null
    state.thirdpartyDate = null
  },
  defaultAddress: (state, defaultAddress) => state.defaultAddress = defaultAddress,
  opt: function(state, {name, value}) {
    Vue.prototype.$arrayUpsert(state.opts, {name:name, value: value }, (elem, i, array) => elem.name == name)
  },  
  setting: function(state, {name, value}) {
    Vue.set(state.settings, name, value)
  },
  frequent: function(state, { nick, userId }) {
    Vue.set(state.frequents, nick, userId)
  },
  avatar: (state, avatar) => state.avatar = avatar,
  delFrequent: (state, nick) => delete state.frequents[nick],
  token: (state, token) => state.token = token,
  chats: (state, chats) => state.chats = chats,
  unread_chat: (state, value) => state.unread_chat = value,
  chat: (state, chat) => { // find chat. if not insert it
    const found = state.chats.find((elem, i, arr) => elem._id == chat._id)
    if(!found) { // 1st message from a chat (user/group)
      state.chats.unshift(chat)
    }
  },
  chatMessage: function(state, msg) { console.log("chatMessage with:", JSON.stringify(msg, null, 4))
    let chat = state.chats.find((elem, i, arr) => elem._id == msg.chatId)
    if(!chat) { // 1st message from a chat (user/group)
      chat = { _id: msg.chatId, isGroup: msg.isGroup, avatar: msg.avatar, name: msg.chatName, membersId: msg.membersId, messages: [], updated: new Date() }
      Vue.set(state, 'chats', [ chat, ...state.chats ] )
      console.log("chat createed:", JSON.stringify(chat))
    }
    Vue.set(msg, '__typename', "ChatMessage")
    const msg_found = chat.messages.find((elem, i, arr) => elem.id == msg.id)
    if(!msg_found) {
      Vue.set(chat, 'messages', [ ...chat.messages, msg ] )
      console.log("msg not foound")
    }
    state.chats = state.chats.sort(function(a, b) {
      const a_last = a.messages.slice(-1)[0]
      const b_last = b.messages.slice(-1)[0]
      if(!a_last && !b_last) return 0
      if(!a_last) return 1
      if(!b_last) return -1
      if(a_last.time > b_last.time) return -1
      else if(a_last.time < b_last.time) return 1
      return 0
    })

    console.log("chat:", JSON.stringify(chat.messages))
  },
  alerts: (state, alerts) => state.alerts = alerts,
  wallets: (state, wallets) => state.wallets = wallets,
  multisigs: (state, multisigs) => state.multisigs = multisigs,
  smartcontracts: (state, smartcontracts) => state.smartcontracts = smartcontracts,
  inheritances: (state, inheritances) => state.inheritances = inheritances,
  timetrusts: (state, timetrusts) => state.timetrusts = timetrusts,
  recurringpays: (state, recurringpays) => state.recurringpays = recurringpays,
  payrequests: (state, payrequests) => state.payrequests = payrequests,
  aftermessages: (state, aftermessages) => state.aftermessages = aftermessages,
  subscription: (state, plan) => state.subscription = plan,
  subscriptionDate: (state, date) => state.subscriptionDate = date,
  thirdpartyDate: (state, date) => state.thirdpartyDate = date,
  upsert: function(state, { what, input }) { console.log("what:", what, "input:", input)
    Vue.prototype.$arrayUpsert(state[what], input, (elem, i, array) => elem._id == input._id)
    Vue.set(state, what, state[what])
    return state[what]
  },
  update: function(state, { what, input, func }) { console.log("updatewhat:", what, "input:", input)
    Vue.prototype.$arrayUpsert(state[what], input, func)
    Vue.set(state, what, state[what])
    return state[what]
  },
}

export const actions = {  
  async opt ( { commit }, { name, value}) {
    let apollo = this.$router.app.$apolloClient()
    await apollo.mutate({ // mut. setUserOpt
      mutation: gql`mutation setUserOpt($name: String!, $value: Any) {
        setUserOpt(name: $name, value:$value)
      }`,
      variables: {
        name: name,
        value: value
      },
    }).then( ({data}) => {
      if(data.setUserOpt) {
        commit('opt', { name, value })
      }
    }).catch((error) => {
      console.error("mutation setUserOpt error", error)  // eslint-disable-line no-console
    })
  },  
  async setting ( { commit }, { name, value}) {
    let apollo = this.$router.app.$apolloClient()
    await apollo.mutate({ // mut. setUserOpt
      mutation: gql`mutation setUserSetting($name: String!, $value: Any) {
        setUserSetting(name: $name, value:$value)
      }`,
      variables: {
        name: name,
        value: value
      },
    }).then( ({data}) => {
      //console.log("result:", data, "name:", name,":", value)
      if(data.setUserSetting) {
        commit('setting', { name, value })
        //if(name == "theme-dark") 
        //  self.$q.dark.set(value)
      }
    }).catch((error) => {
      console.error("mutation setUserSetting error", error)  // eslint-disable-line no-console
    })
  },
  async updateUser ( { commit }, { field, value}) {
    let apollo = this.$router.app.$apolloClient()
    await apollo.mutate({ // mut. setUserOpt
      mutation: gql`mutation updateUser($field: String!, $value: Any) {
        updateUser(field: $field, value:$value)
      }`,
      variables: {
        field,
        value
      },
    }).then( ({data}) => {
      //console.log("result:", data, "name:", name,":", value)
      if(data.updateUser) {
        commit(field, value)
        //if(name == "theme-dark") 
        //  self.$q.dark.set(value)
      }
    }).catch((error) => {
      console.error("mutation updateUser error", error)  // eslint-disable-line no-console
    })
  },
  async frequent ( { commit }, { nick, userId}) {
    let apollo = this.$router.app.$apolloClient() //let apollo = this.$router.app.$apolloProvider.defaultClient
    await apollo.mutate({ // mut. setUserOpt
      mutation: gql`mutation setUserFrequent($nick: String!, $userId: String!) {
        setUserFrequent(nick: $nick, userId:$userId)
      }`,
      variables: {
        nick,
        userId
      },
    }).then( ({data}) => {
      //console.log("result:", data.setUserFrequent, "nick:", nick,":", userId)
      if(data.setUserFrequent) {
        commit('frequent', { nick, userId })
      }
    }).catch((error) => {
      console.error("mutation setUserFrequent error", error)  // eslint-disable-line no-console
    })
  },
  async delFrequent ( { commit }, { nick}) {
    let apollo = this.$router.app.$apolloClient()
    await apollo.mutate({ // mut. setUserOpt
      mutation: gql`mutation delUserFrequent($nick: String!) {
        delUserFrequent(nick: $nick)
      }`,
      variables: {
        nick
      },
    }).then( ({data}) => {
      //console.log("result:", data.delUserFrequent, "name:", name,":", value)
      if(data.setUserFrequent) {
        commit('delFrequent', nick )
      }
    }).catch((error) => {
      console.error("mutation setUserFrequent error", error)  // eslint-disable-line no-console
    })
  },
  
}

export default {
  namespaced: true,
  getters,
  mutations,
  actions,
  state
}


