import Vue from 'vue'
import VueRouter from 'vue-router'
//import VueAnalytics from 'vue-analytics' // https://medium.com/js-dojo/how-to-use-google-analytics-in-your-vue-app-with-vue-analytics-9cdb913301d1

import routes from './routes'

Vue.use(VueRouter)

/*Vue.use(VueAnalytics, {
  id: 'UA-1018302-6',
  routes
})*/

export default function ( { store, Vue, ssrContext } ) {
  const Router = new VueRouter({
    scrollBehavior: () => ({ x: 0, y: 0 }),
    routes,
    mode: process.env.VUE_ROUTER_MODE,
    base: process.env.VUE_ROUTER_BASE
  })

  Router.beforeEach(function(to, from, next)  { //console.log("router index.js to.name:", to.name, "to.path:", to.path, "$origin:", Vue.prototype.$origin, "ssrContext:", !!ssrContext)
    set_blockchain(to.name)
    if(to.name == '/favicon.ico' || to.path == '/favicon.ico') { console.log("router index.js /favicon.ico")
      throw "Router index.js /favicon.ico"
    }
    if(!to.name) {
      //console.log("no to.name", to)
      next('/notfound')
      return
    } else if(isAuth(store, to)) {
      //console.log("[Route] ", to.name, ": is authed:")
      next()
    } else { //  NOT auth
      //console.log("[Route] ", to.name, ": -- NOT -- auth::")
      if(to.name.includes('testnet')) next('/testnet')
      else if(to.name.includes('regtest')) next('/regtest')
      else next('/')
    }
    //console.log("router index.js ended ------------------------------")
  })

  return Router
}

function isAuth(store, to) {// console.log("to.path.includes('/adminmarketplace') && !store.getters['user/marketplace']:", to.path.includes('/adminmarketplace') && !store.getters['user/marketplace'])
  //console.log("to.name:", to.name)
  // allowed routes
  const allowed = [ 'root', 'home', 'marketplace', 'autologin', 'notfound', 'bitpass', 'resetpassword']
  if(allowed.some(route => to.name.includes(route))) return true
  // needs log in.,
  const userId = store.getters['user/_id']
  if(!userId) return false
  // marketplace ??
  if(to.path.includes('/adminmarketplace') && !store.getters['user/marketplace'])
    return false
  // admin
  if( (to.path == '/admin' || to.path.includes('/admin/')) && (!store.getters['user/roles'] || !store.getters['user/roles'].includes('admin')))
    return false
    
  return true
}

function set_blockchain(name) {// console.log("router set_blockchain:", name)
  if(!name) return
  if(name.includes('testnet')) Vue.prototype.$blockchain = 'testnet'
  else if(name.includes('regtest')) Vue.prototype.$blockchain = 'regtest'
  else Vue.prototype.$blockchain = 'mainnet'
}


