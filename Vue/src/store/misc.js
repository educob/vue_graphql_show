
export const state = () => ({
  script: {},
  lastBlock: {height: 0, time:0},
  db: {},
  fiat: -1,
  bars: [],
  ticks: [],
})

const buttons = {
  yes: {text:"Yes", color:"green", icon: "ok.svg" },
  no: {text:"No", color:"red", icon: "close_red.svg" },
  create: {text:"Create", color:"green", icon: "ok.svg" },
  send: {text:"Send", color:"green", icon: "send_message.svg" },
  cancel: {text:"Cancel", color:"red", icon: "close_red.svg" },
  set: {text:"Set", color:"green", icon: "ok.svg" },
  close: {text:"Close", color:"red", icon: "close_red.svg" },
}

export const getters = {
  yes_no_buttons: state => [ buttons.yes, buttons.no ],
  create_cancel_buttons: state => [ buttons.create, buttons.cancel ],
  send_cancel_buttons: state => [ buttons.send, buttons.cancel],
  close_button: state => [ buttons.close ],
  set_button: state => [ buttons.set ],   

  script: state => state.script, // copy / paste scripts
  lastBlock: state => state.lastBlock,
  db_all: state => state.db,
  donation_address: state => 'bc1q2l7j4l43hcy3pfj32fcnvg0kqtezgaz2v7hrw7',
  db: state => name => {
    if(!state.db) return false
    return state.db[name]
  },
  fiat: state => state.fiat,
  bars: state => state.bars,
  ticks: state => state.ticks,
}

export const mutations = {
  script: (state, script) => {
    state.script = script
  },
  lastBlock: (state, block) => {
    state.lastBlock = block
  },
  db: function(state, {name, value}) {
    state.db[name] = value
  },
  fiat: (state, fiat) => state.fiat = fiat
  ,
  bars: (state, bars) => state.bars = bars,
  rate: function(state, { rate }) {
    const lastBar = state.bars[state.bars.length-1]
    if(!!lastBar)
      lastBar.close = rate
    state.ticks.unshift( { x: new Date, y: rate } )
  },
}

export const actions = { // context <-> { state, getters, commit, dispatch }
}

export default {
  namespaced: true,
  getters,
  mutations,
  state
}