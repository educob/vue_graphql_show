const defaultLayout = () => import('layouts/MainLayout.vue')
const homeLayout = () => import('layouts/HomeLayout.vue')
const rootLayout = () => import('src/layouts/RootLayout.vue')
const bitpassLayout = () => import('src/layouts/BitpassLayout.vue')
// <router-link :to="{ name: 'user', params: { userId: 123 }}">User</router-link>



const routes = [ // router.push({ name: 'user', params: { userId: 123 }})
  {
    path: '/',
    component: rootLayout,
    children: [
      { path: '', name: 'root', component: () => import('pages/ini.vue') },
      //{ path: 'ref/:id', name: 'home-ref', component: () => import('pages/campaign.vue') },
      //{ path: '/autologin/:id', name: 'autologin-id', component: () => import('pages/marketplace/autologin.vue') },
    ]
  },
  {
    path: '/home',
    component: homeLayout,
    children: [
      { path: '', name: 'home', component: () => import('pages/app.vue') },
    ]
  },
  // bitpass
  {
    path: '/bitpass',
    component: bitpassLayout,
    children: [
      { path: '', name: 'bitpass', component: () => import('pages/bitpass/bitpass.vue') },
    ]
  },

  {
    path: '/resetpassword',
    component: homeLayout,
    children: [
      { path: ':id', name: 'resetpassword-id', component: () => import('pages/resetpassword.vue') },
    ],
  },
  {
    path: '/wallets',
    component: defaultLayout,
    children: [
      { path: '', name: 'wallets', component: () => import('pages/wallets/index.vue') },
      { path: ':id', name: 'wallets-id', component: () => import('pages/wallets/_id.vue') },
      { path: 'send/:id', name: 'wallets-send', component: () => import('pages/wallets/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'wallets-send-pay', component: () => import('pages/wallets/send.vue') },
      { path: 'send/:id/alert/:alertId', name: 'inheritances-send-alert', component: () => import('pages/inheritances/send.vue') },
      { path: 'send/:id/upgrade/:plan:/:btc', name: 'inheritances-send-upgrade', component: () => import('pages/inheritances/send.vue') },
    ]
  },
  {
    path: '/address',
    component: defaultLayout,
    children: [
      { path: ':id', name: 'address-id', component: () => import('pages/address/_id.vue') },
    ]
  },
  {
    path: '/multisigs',
    component: defaultLayout,
    children: [
      { path: '', name: 'multisigs', component: () => import('pages/multisigs/index.vue') },
      { path: ':id', name: 'multisigs-id', component: () => import('pages/multisigs/_id.vue') },
      { path: 'send/:id', name: 'multisigs-send', component: () => import('pages/multisigs/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'multisigs-send-pay', component: () => import('pages/multisigs/send.vue') },
      { path: 'send/:id/alert/:alertId', name: 'multisigs-send-alert', component: () => import('pages/multisigs/send.vue') },
    ]
  },
  {
    path: '/inheritances',
    component: defaultLayout,
    children: [
      { path: '', name: 'inheritances', component: () => import('pages/inheritances/index.vue') },
      { path: ':id', name: 'inheritances-id', component: () => import('pages/inheritances/_id.vue') },
      { path: 'send/:id', name: 'inheritances-send', component: () => import('pages/inheritances/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'inheritances-send-pay', component: () => import('pages/inheritances/send.vue') },
    ]
  },
  {
    path: '/trust',
    component: defaultLayout,
    children: [
      { path: '', name: 'trust', component: () => import('pages/trust/index.vue') },
      { path: ':id', name: 'trust-id', component: () => import('pages/trust/_id.vue') },
    ]
  },
  {
    path: '/recurringpays',
    component: defaultLayout,
    children: [
      { path: '', name: 'recurringpays', component: () => import('pages/recurringpays/index.vue') },
      { path: ':id', name: 'recurringpays-id', component: () => import('pages/recurringpays/index.vue') },
    ]
  },
  {
    path: '/payrequests',
    component: defaultLayout,
    children: [
      { path: '', name: 'payrequests', component: () => import('pages/payrequests/index.vue') },
    ]
  },
  {
    path: '/aftermessages',
    component: defaultLayout,
    children: [
      { path: '',    name: 'aftermessages',     component: () => import('pages/aftermessages/index.vue') },
    ]
  }, 
   {
    path: '/escrows',
    component: defaultLayout,
    children: [
      { path: '', name: 'escrows', component: () => import('pages/escrows/index.vue') },
    ]
  },
  {
    path: '/hodl',
    component: defaultLayout,
    children: [
      { path: '/', name: 'hodl', component: () => import('pages/hodl.vue') },
    ]
  },
  {
    path: '/lightning',
    component: defaultLayout,
    children: [
      { path: '/', name: 'lightning', component: () => import('pages/lightning/index.vue') },
    ]
  },
  {
    path: '/chat',
    component: defaultLayout,
    children: [
      { path: '/', name: 'chat', component: () => import('pages/chat/index.vue') },
    ]
  },
  {
    path: '/mybapp',
    component: defaultLayout,
    children: [
      { path: '', name: 'mybapp', component: () => import('pages/mybapp.vue') }
    ]
  },
  {
    path: '/contact',
    component: defaultLayout,
    children: [
      { path: '', name: 'contact', component: () => import('pages/contact.vue') }
    ]
  },
  {
    path: '/thirdparty',
    component: defaultLayout,
    children: [
      { path: 'thirdparty', name: 'thirdparty-thirdparty', component: () => import('pages/thirdparty/thirdparty.vue') },
    ]
  },
  {
    path: '/notfound',
    component: homeLayout,
    children: [
      { path: '', name: 'notfound', component: () => import('pages/NotFound.vue') }
    ],
  },
  {
   path: '/help',
   component: defaultLayout,
   children: [
     { path: 'demo', name: 'help-demo', component: () => import('pages/help/demo.vue') },
     { path: 'settings', name: 'help-settings', component: () => import('pages/help/settings.vue') },
     { path: 'wallets', name: 'help-wallets', component: () => import('pages/help/wallets.vue') },
     { path: 'jointwallets', name: 'help-jointwallets', component: () => import('pages/help/jointwallets.vue') },
     { path: 'inheritances', name: 'help-inheritances', component: () => import('pages/help/inheritance.vue') },
     { path: 'aftermessages', name: 'help-aftermessages', component: () => import('pages/help/aftermessages.vue') },
   ]
 },
                //  ADMIN -------------------
  {
    path: '/admin',
    component: defaultLayout,
    children: [
      { path: '', name: 'admin', component: () => import('pages/admin/index.vue') },
      { path: 'settings', name: 'admin-settings', component: () => import('pages/admin/settings.vue') },
      { path: 'feedbacks', name: 'admin-feedbacks', component: () => import('pages/admin/feedbacks.vue') },
      { path: 'messages', name: 'admin-messages', component: () => import('pages/admin/messages.vue') },
      { path: 'contacts', name: 'admin-contacts', component: () => import('pages/admin/contacts.vue') },
      { path: 'stats', name: 'admin-stats', component: () => import('pages/admin/stats.vue') },
      { path: 'lightning', name: 'admin-lightning', component: () => import('pages/admin/lightning.vue') },
      { path: 'referrals', name: 'admin-referrals', component: () => import('pages/admin/referrals.vue') },
      { path: 'polls', name: 'admin-polls', component: () => import('pages/admin/polls.vue') },
      { path: 'visitors', name: 'admin-visitors', component: () => import('pages/admin/visitor.vue') },
      { path: 'mongo', name: 'admin-mongo', component: () => import('pages/admin/mongo.vue') },
    ]
  },
  //  ADMIN MarketPlace -------------------
  {
    path: '/adminmarketplace',
    component: defaultLayout,
    children: [
      { path: '', name: 'marketplace', component: () => import('pages/adminmarketplace/index.vue') },
      { path: 'feedbacks', name: 'marketplace-feedbacks', component: () => import('pages/adminmarketplace/feedbacks.vue') },
      { path: 'stats', name: 'marketplace-stats', component: () => import('pages/adminmarketplace/stats.vue') },
      { path: 'settings', name: 'marketplace-settings', component: () => import('pages/adminmarketplace/settings.vue') },
    ]
  },

  //////////// TESTNET /////////////////////////////////////////////////////////////////////////////////////

  {
    path: '/testnet',
    component: rootLayout,
    children: [
      { path: '', name: 'testnet-root', component: () => import('pages/ini.vue') },
      //{ path: 'ref/:id', name: 'home-ref', component: () => import('pages/campaign.vue') },
      //{ path: '/autologin/:id', name: 'autologin-id', component: () => import('pages/marketplace/autologin.vue') },
    ]
  },
  {
    path: '/testnet/home',
    component: homeLayout,
    children: [
      { path: '', name: 'testnet-home', component: () => import('pages/app.vue') },
    ]
  },
  { // bitpass
    path: '/testnet/bitpass',
    component: bitpassLayout,
    children: [
      { path: '', name: 'testnet-bitpass', component: () => import('pages/bitpass/bitpass.vue') },
    ]
  },
  {
    path: '/testnet/resetpassword',
    component: homeLayout,
    children: [
      { path: ':id', name: 'testnet-resetpassword-id', component: () => import('pages/resetpassword.vue') },
    ],
  },
  {
    path: '/testnet/wallets',
    component: defaultLayout,
    children: [
      { path: '', name: 'testnet-wallets', component: () => import('pages/wallets/index.vue') },
      { path: ':id', name: 'testnet-wallets-id', component: () => import('pages/wallets/_id.vue') },
      { path: 'send/:id', name: 'testnet-wallets-send', component: () => import('pages/wallets/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'testnet-wallets-send-pay', component: () => import('pages/wallets/send.vue') },
      { path: 'send/:id/alert/:alertId', name: 'testnet-wallets-send-alert', component: () => import('pages/wallets/send.vue') },
    ]
  },
  {
    path: '/testnet/address',
    component: defaultLayout,
    children: [
      { path: ':id', name: 'testnet-address-id', component: () => import('pages/address/_id.vue') },
    ]
  },
  {
    path: '/testnet/multisigs',
    component: defaultLayout,
    children: [
      { path: '',    name: 'testnet-multisigs', component: () => import('pages/multisigs/index.vue') },
      { path: ':id', name: 'testnet-multisigs-id', component: () => import('pages/multisigs/_id.vue') },
      { path: 'send/:id', name: 'testnet-multisigs-send', component: () => import('pages/multisigs/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'testnet-multisigs-send-pay', component: () => import('pages/multisigs/send.vue') },
      { path: 'send/:id/alert/:alertId', name: 'testnet-multisigs-send-alert', component: () => import('pages/multisigs/send.vue') },
    ]
  },
  {
    path: '/testnet/trust',
    component: defaultLayout,
    children: [
      { path: '', name: 'testnet-trust', component: () => import('pages/trust/index.vue') },
      { path: ':id', name: 'testnet-trust-id', component: () => import('pages/trust/_id.vue') },
    ]
  },
  {
    path: '/testnet/inheritances',
    component: defaultLayout,
    children: [
      { path: '',    name: 'testnet-inheritances',     component: () => import('pages/inheritances/index.vue') },
      { path: ':id', name: 'testnet-inheritances-id',  component: () => import('pages/inheritances/_id.vue') },
      { path: 'send/:id', name: 'testnet-inheritances-send', component: () => import('pages/inheritances/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'testnet-inheritances-send-pay', component: () => import('pages/inheritances/send.vue') },
      { path: 'send/:id/alert/:alertId', name: 'testnet-inheritances-send-alert', component: () => import('pages/inheritances/send.vue') },
    ]
  },
  {
    path: '/testnet/recurringpays',
    component: defaultLayout,
    children: [
      { path: '', name: 'testnet-recurringpays', component: () => import('pages/recurringpays/index.vue') },
      { path: ':id', name: 'testnet-recurringpays-id', component: () => import('pages/recurringpays/index.vue') },
    ]
  },
  {
    path: '/testnet/payrequests',
    component: defaultLayout,
    children: [
      { path: '', name: 'testnet-payrequests', component: () => import('pages/payrequests/index.vue') },
    ]
  },
  {
    path: '/testnet/hodl',
    component: defaultLayout,
    children: [
      { path: '/', name: 'testnet-hodl', component: () => import('pages/hodl.vue') },
    ]
  },
  {
    path: '/testnet/aftermessages',
    component: defaultLayout,
    children: [
      { path: '',    name: 'testnet-aftermessages',     component: () => import('pages/aftermessages/index.vue') },
    ]
  },
  {
   path: '/testnet/escrows',
   component: defaultLayout,
   children: [
     { path: '', name: 'testnet-escrows', component: () => import('pages/escrows/index.vue') },
   ]
 },
  {
    path: '/testnet/lightning',
    component: defaultLayout,
    children: [
      { path: '/', name: 'testnet-lightning', component: () => import('pages/lightning/index.vue') },
    ]
  },
  {
    path: '/testnet/mybapp',
    component: defaultLayout,
    children: [
      { path: '', name: 'testnet-mybapp', component: () => import('pages/mybapp.vue') }
    ]
  },
  {
    path: '/testnet/contact',
    component: defaultLayout,
    children: [
      { path: '', name: 'testnet-contact', component: () => import('pages/contact.vue') }
    ]
  },
  {
    path: '/testnet/thirdparty',
    component: defaultLayout,
    children: [
      { path: 'thirdparty', name: 'testnet-thirdparty-thirdparty', component: () => import('pages/thirdparty/thirdparty.vue') },
    ]
  },
  {
    path: '/testnet/notfound',
    component: homeLayout,
    children: [
      { path: '', name: 'testnet-notfound', component: () => import('pages/NotFound.vue') }
    ],
  },
  {
   path: '/testnet/help',
   component: defaultLayout,
   children: [
    { path: 'demo', name: 'testnet-help-demo', component: () => import('pages/help/demo.vue') },
    { path: 'settings', name: 'testnet-help-settings', component: () => import('pages/help/settings.vue') },
    { path: 'wallets', name: 'testnet-help-wallets', component: () => import('pages/help/wallets.vue') },
    { path: 'jointwallets', name: 'testnet-help-jointwallets', component: () => import('pages/help/jointwallets.vue') },
    { path: 'inheritances', name: 'testnet-help-inheritances', component: () => import('pages/help/inheritance.vue') },
    { path: 'aftermessages', name: 'testnet-help-aftermessages', component: () => import('pages/help/aftermessages.vue') },
   ]
 },

  //  ADMIN -------------------
  {
    path: '/testnet/admin',
    component: defaultLayout,
    children: [
      { path: '', name: 'testnet-admin', component: () => import('pages/admin/index.vue') },
      { path: 'settings', name: 'testnet-admin-settings', component: () => import('pages/admin/settings.vue') },
      { path: 'feedbacks', name: 'testnet-admin-feedbacks', component: () => import('pages/admin/feedbacks.vue') },
      { path: 'messages', name: 'testnet-admin-messages', component: () => import('pages/admin/messages.vue') },
      { path: 'contacts', name: 'testnet-admin-contacts', component: () => import('pages/admin/contacts.vue') },
      { path: 'stats', name: 'testnet-admin-stats', component: () => import('pages/admin/stats.vue') },
      { path: 'lightning', name: 'testnet-admin-lightning', component: () => import('pages/admin/lightning.vue') },
      { path: 'visitors', name: 'testnet-admin-visitors', component: () => import('pages/admin/visitor.vue') },
      { path: 'mongo', name: 'testnet-admin-mongo', component: () => import('pages/admin/mongo.vue') },
    ]
  },
  //  ADMIN MarketPlace -------------------
  {
    path: '/testnet/adminmarketplace',
    component: defaultLayout,
    children: [
      { path: '', name: 'testnet-marketplace', component: () => import('pages/adminmarketplace/index.vue') },
      { path: 'feedbacks', name: 'testnet-marketplace-feedbacks', component: () => import('pages/adminmarketplace/feedbacks.vue') },
      { path: 'stats', name: 'testnet-marketplace-stats', component: () => import('pages/adminmarketplace/stats.vue') },
      { path: 'settings', name: 'testnet-marketplace-settings', component: () => import('pages/adminmarketplace/settings.vue') },
    ]
  },

  //////////// REGTEST //////////////////////////////////////////////////////////////////////////

  {
    path: '/regtest',
    component: rootLayout,
    children: [
      { path: '', name: 'regtest-root', component: () => import('pages/ini.vue') },
      { path: 'ref/:id', name: 'regtest-ref', component: () => import('pages/campaign.vue') },
    ]
  },

  {
    path: '/regtest/home',
    component: homeLayout,
    children: [
      { path: '', name: 'regtest-home', component: () => import('pages/app.vue') },
    ]
  },
  // bitpass
  {
    path: '/regtest/bitpass',
    component: bitpassLayout,
    children: [
      { path: '', name: 'regtest-bitpass', component: () => import('pages/bitpass/bitpass.vue') },
      //{ path: 'autologin/:id', name: 'regtest-autologin-id', component: () => import('pages/marketplace/autologin.vue') },
    ]
  },

  {
    path: '/regtest/wallets',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-wallets', component: () => import('pages/wallets/index.vue') },
      { path: ':id', name: 'regtest-wallets-id', component: () => import('pages/wallets/_id.vue') },
      { path: 'send/:id', name: 'regtest-wallets-send', component: () => import('pages/wallets/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'regtest-wallets-send-pay', component: () => import('pages/wallets/send.vue') },
      { path: 'send/:id/alert/:alertId', name: 'regtest-wallets-send-alert', component: () => import('pages/wallets/send.vue') },
    ]
  },
  {
    path: '/regtest/address',
    component: defaultLayout,
    children: [
      { path: ':id', name: 'regtest-address-id', component: () => import('pages/address/_id.vue') },
    ]
  },
  {
    path: '/regtest/multisigs',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-multisigs', component: () => import('pages/multisigs/index.vue') },
      { path: ':id', name: 'regtest-multisigs-id', component: () => import('pages/multisigs/_id.vue') },
      { path: 'send/:id', name: 'regtest-multisigs-send', component: () => import('pages/multisigs/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'regtest-multisigs-send-pay', component: () => import('pages/multisigs/send.vue') },
      { path: 'send/:id/alert/:alertId', name: 'regtest-multisigs-send-alert', component: () => import('pages/multisigs/send.vue') },
    ]
  },
  {
    path: '/regtest/trust',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-trust', component: () => import('pages/trust/index.vue') },
      { path: ':id', name: 'regtest-trust-id', component: () => import('pages/trust/_id.vue') },
    ]
  },
  {
    path: '/regtest/inheritances',
    component: defaultLayout,
    children: [
      { path: '',    name: 'regtest-inheritances',     component: () => import('pages/inheritances/index.vue') },
      { path: ':id', name: 'regtest-inheritances-id',  component: () => import('pages/inheritances/_id.vue') },
      { path: 'send/:id', name: 'regtest-inheritances-send', component: () => import('pages/inheritances/send.vue') },
      { path: 'send/:id/pay/:payId', name: 'regtest-inheritances-send-pay', component: () => import('pages/inheritances/send.vue') },
      { path: 'send/:id/alert/:alertId', name: 'regtest-inheritances-send-alert', component: () => import('pages/inheritances/send.vue') },
    ]
  },
  {
    path: '/regtest/recurringpays',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-recurringpays', component: () => import('pages/recurringpays/index.vue') },
      { path: ':id', name: 'regtest-recurringpays-id', component: () => import('pages/recurringpays/index.vue') },
    ]
  },
  {
    path: '/regtest/payrequests',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-payrequests', component: () => import('pages/payrequests/index.vue') },
    ]
  },
  {
    path: '/regtest/aftermessages',
    component: defaultLayout,
    children: [
      { path: '',    name: 'regtest-aftermessages',     component: () => import('pages/aftermessages/index.vue') },
    ]
  },
  {
   path: '/regtest/escrows',
   component: defaultLayout,
   children: [
     { path: '', name: 'regtest-escrows', component: () => import('pages/escrows/index.vue') },
   ]
 },
  {
    path: '/regtest/hodl',
    component: defaultLayout,
    children: [
      { path: '/', name: 'regtest-hodl', component: () => import('pages/hodl.vue') },
    ]
  },
  {
    path: '/regtest/lightning',
    component: defaultLayout,
    children: [
      { path: '/', name: 'regtest-lightning', component: () => import('pages/lightning/index.vue') },
    ]
  },
  {
    path: '/regtest/chat',
    component: defaultLayout,
    children: [
      { path: '/', name: 'regtest-chat', component: () => import('pages/chat/index.vue') },
    ]
  },
  {
    path: '/regtest/mybapp',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-mybapp', component: () => import('pages/mybapp.vue') }
    ]
  },
  {
    path: '/regtest/contact',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-contact', component: () => import('pages/contact.vue') }
    ]
  },
  {
    path: '/regtest/test',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-test', component: () => import('pages/test.vue') }
    ]
  },
  {
    path: '/regtest/thirdparty',
    component: defaultLayout,
    children: [
      { path: 'thirdparty', name: 'regtest-thirdparty-thirdparty', component: () => import('pages/thirdparty/thirdparty.vue') },
    ]
  },
  {
    path: '/regtest/notfound',
    component: homeLayout,
    children: [
      { path: '', name: 'regtest-notfound', component: () => import('pages/NotFound.vue') }
    ],
  },
  {
   path: '/regtest/help',
   component: defaultLayout,
   children: [
    { path: 'demo', name: 'regtest-help-demo', component: () => import('pages/help/demo.vue') },
    { path: 'settings', name: 'regtest-help-settings', component: () => import('pages/help/settings.vue') },
    { path: 'wallets', name: 'regtest-help-wallets', component: () => import('pages/help/wallets.vue') },
    { path: 'jointwallets', name: 'regtest-help-jointwallets', component: () => import('pages/help/jointwallets.vue') },
    { path: 'inheritances', name: 'regtest-help-inheritances', component: () => import('pages/help/inheritance.vue') },
    { path: 'aftermessages', name: 'regtest-help-aftermessages', component: () => import('pages/help/aftermessages.vue') },
   ]
 },

  //  ADMIN -------------------
  {
    path: '/regtest/admin',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-admin', component: () => import('pages/admin/index.vue') },
      { path: 'settings', name: 'regtest-admin-settings', component: () => import('pages/admin/settings.vue') },
      { path: 'feedbacks', name: 'regtest-admin-feedbacks', component: () => import('pages/admin/feedbacks.vue') },
      { path: 'messages', name: 'regtest-admin-messages', component: () => import('pages/admin/messages.vue') },
      { path: 'contacts', name: 'regtest-admin-contacts', component: () => import('pages/admin/contacts.vue') },
      { path: 'stats', name: 'regtest-admin-stats', component: () => import('pages/admin/stats.vue') },
      { path: 'lightning', name: 'regtest-admin-lightning', component: () => import('pages/admin/lightning.vue') },
      { path: 'referrals', name: 'regtest-admin-referrals', component: () => import('pages/admin/referrals.vue') },
      { path: 'smartcontracts',    name: 'regtest-smartcontracts',     component: () => import('pages/admin/smartcontracts/index.vue') },
      { path: 'smartcontracts/new', name: 'regtest-smartcontracts-new', component: () => import('pages/admin/smartcontracts/new.vue') },
      { path: 'smartcontracts/:id', name: 'regtest-smartcontracts-id', component: () => import('pages/admin/smartcontracts/_id.vue') },
      { path: 'polls', name: 'regtest-admin-polls', component: () => import('pages/admin/polls.vue') },
      { path: 'visitors', name: 'regtest-admin-visitors', component: () => import('pages/admin/visitor.vue') },
      { path: 'mongo', name: 'regtest-admin-mongo', component: () => import('pages/admin/mongo.vue') },
    ]
  },
  //  ADMIN MarketPlace -------------------
  {
    path: '/regtest/adminmarketplace',
    component: defaultLayout,
    children: [
      { path: '', name: 'regtest-marketplace', component: () => import('pages/adminmarketplace/index.vue') },
      { path: 'feedbacks', name: 'regtest-marketplace-feedbacks', component: () => import('pages/adminmarketplace/feedbacks.vue') },
      { path: 'stats', name: 'regtest-marketplace-stats', component: () => import('pages/adminmarketplace/stats.vue') },
      { path: 'settings', name: 'regtest-marketplace-settings', component: () => import('pages/adminmarketplace/settings.vue') },
    ]
  },

  // MARKETPLACE
  {
    path: '/regtest',
    component: rootLayout,
    children: [
      { path: 'login', name: 'regtest-marketplace-bitcapp', component: () => import('pages/marketplace/bitcapp.vue') },
      //{ path: 'autologin/:id', name: 'regtest-autologin-id', component: () => import('pages/marketplace/autologin.vue') },
    ]
  },



  
]

  routes.push({
    path: '*',
    component: () => import('pages/NotFound.vue')
  }) 

export default routes
