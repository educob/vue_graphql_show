<template>
  <div>
    <div v-if="$maintenance()" style="display:grid">
      <img src="statics/img/under-maintenance.png" style="background-color:#26a4c6;filter:none;margin:0 auto" />
    </div>
    <q-layout v-else-if="!$origin" view="lHh Lpr lFf" >
      <div v-if="$blockchain == 'testnet'" id="testnet"></div>

      <!-- toolbar -->
      <div id="home_toolbar" :style="{ gridTemplateColumns: toolbar_columns(), backgroundColor: $toolbarColor() }">
        <div @click="!!$store.getters['user/_id'] && $go_to('/wallets')"  :style="{ cursor: !!$store.getters['user/_id'] ? 'pointer' : 'default' }">
          <div v-if="screen == screen_size.narrow" id="home_favicon" @click="go_to('/')" class="white lick" :style="{ backgroundImage: `url(statics/img/${$favicon()})` }" />
          <div v-else id="toolbar_logo" @click="$go_to('/')" class="white click" />
        </div>
        <div style="margin-top:10px">
          <img src="statics/img/contact.svg" class="click"
                  round flat style="width:35px;margin-left:10px" @click="contactDialog='block'" />
          <q-tooltip>{{ $t("Contact Us") }}</q-tooltip>
        </div>

        
        <div style="justify-self: end;display:flex">
          <!-- mainnet / testnet button -->
          <div v-if="!$loggedIn()" style="margin-right:20px" class="vcenter"> 
            <a  v-if="$blockchain =='mainnet'" :href="testnet_path">
              <q-btn label="Go To Demo System" class="glossy" rounded text-color="black" color="orange" size="sm" >
                <q-tooltip>{{ $t("Try everything first in the Demo System") }}</q-tooltip>
              </q-btn>
            </a>
            <a v-else-if="$blockchain =='testnet'" :href="mainnet_path">
              <q-btn label="Go to Main Net" class="glossy" rounded text-color="black"  color="primary" size="sm"  />
            </a>
          </div>

          <!-- user is NOT logged In: Login/Register menus -->
          <div v-if="!nick" @click="show_loginregister=true" id="user_btn" style="margin-right:10px" class="click vcenter">
            <span style="color:black;margin-right:10px">Sign in/up </span>
            <!-- <q-btn round color="primary" icon="mdi-account" size="sm" id="user_btn" @click="$emit('loginregister')" />-->
          </div>
          <!-- user logged in -->
          <div v-else style="display:flex;margin-right:5px"  >
            <!-- alerts -->
            <q-btn v-if="!!alerts && alerts.length && !!$store.getters['user/_id']" size="sm" 
                    round flat color="primary" icon="mdi-bell" style="margin-right:10px;margin-top:20px;cursor:pointer" @click="show_alerts()">
              <q-badge v-if="alerts && alerts.length" color="red" floating style="margin-top:-5px">{{ alerts.length }}</q-badge>
            </q-btn>
            <!-- user btn -->
            <div style="justify-self:end;margin-right:5px;display:flex">
              <div class="vcenter click" style="margin-right:10px">
                <span style="font-size:1.2em">{{ nick }}</span>
                <q-menu>
                  <q-list> 
                    <q-item>
                      <img src="statics/img/gear.svg" @click="settingsDialog='block'" width="25" height="25" class="darkblue" />
                      <q-tooltip>
                        <span>{{ $t("User Settings") }}</span>
                      </q-tooltip>
                    </q-item>
                    <q-item>
                      <img src="statics/img/change_pass.svg" width="25" height="25" class="darkblue" />
                      <q-menu>
                        <q-card>
                          <q-card-section>{{ $t("Change Password") }}</q-card-section>
                          <q-card-section>
                            <changePassword />
                          </q-card-section>
                        </q-card>
                      </q-menu>
                      <q-tooltip>
                        <span>{{ $t("Change Password") }}</span>
                      </q-tooltip>
                    </q-item>

                    <!-- help -->
                    <q-item>
                      <img src="statics/img/help.svg" width="25" height="25" class="darkblue" />
                      <q-menu>
                        <div style="padding:10px 20px 10px 20px">
                          <span >{{ $t("Help") }}</span>
                          <div v-for="h of $helps()" :key="h.name"  @click="$go_to(`/help/${h.link}`)" style="display:grid;grid-template-columns:30px 1fr;margin-top:5px" class="click" >
                            <img :src="`statics/img/${h.icon}.svg`" width="25" height="25" class="lightblue" />
                            <span style="margin-left:10px" >{{ h.text }}</span>
                          </div>
                        </div>    
                      </q-menu>
                      <q-tooltip>
                        <span>{{ $t("Help") }}</span>
                      </q-tooltip>
                    </q-item>
                    <!-- logout -->
                    <q-item>
                      <img src="statics/img/power.svg" @click="logout" width="25" height="25" class="lightred" />
                      <q-tooltip>
                        <span>{{ $t("Log out") }}</span>
                      </q-tooltip>
                    </q-item>
                  </q-list>
                </q-menu>
              </div>
            </div>
            <!-- avatar -->
            <div class="click">
              <img :src="avatar || 'statics/svg/avatar.svg'" style="margin-top:5px;filter:none;border-radius:50%" width="45" height="45" />
              <q-menu v-model="avatar_menu">
                <q-input v-model="avatar" @keyup.enter="set_avatar" :label="$t('Avatar URL')"  dense autofocus placeholder="http://....jpg/png"
                    class="faucet_addr" style="width:300px;padding:5px" :style="{ backgroundColor: $no_empty(avatar) }">
                  <template slot:after>
                    <q-btn size="sm" @click="set_avatar" style="background-color: var(--light-blue)">
                      <span style="color:black">{{ $t("Set") }}</span>
                    </q-btn>
                  </template>
                </q-input>
              </q-menu>
            </div>
            <!-- language -->
            <q-btn flat round class="vcenter">
              <img :src="`statics/flags/4x3/${$userOpt('language') || 'us'}.svg`" width="20px" style="filter:none" />
              <q-menu :offset="[-20, 0]" ref="lang" >
                <languages />
              </q-menu>  
            </q-btn>
          </div>
        </div>
      </div>
      <!-- content -->
      <q-page-container>
        <router-view />
      </q-page-container>

      <!-- feedback btn--> 
      <q-btn flat round icon="mdi-comment" color="primary" @click="feedbackModal.dialog = true" style="position:absolute;bottom:15px;right:10px">
        <q-tooltip>
          <span>{{ $t("Feedback") }}</span>
        </q-tooltip>
      </q-btn> 

      <!-- feedback dialog -->
      <selectModal :prop="feedbackModal" @close="feedbackModal.dialog=false" @selectionDone="sendFeedback" >
        <q-rating v-model="feedback.rating" color="yellow darken-1" size="sm" />
        <q-input v-model="feedback.text" type="textarea" autogrow style="margin-top:5px" :label="$t('Feedback')" /> 
        <div @paste="onPaste" >
          <div style="text-align:center" id="pastepic" />
        </div>
        <div id="feedback_pics" />
      </selectModal>

      <!-- donate btn --> 
        <q-btn flat round icon="img:statics/img/donate.svg" color="primary" @click="donateModal.dialog = true" style="position:absolute;bottom:45px;right:10px">
          <q-tooltip>
            <span>{{ $t("Support_%", { name: $app_name() }) }}</span>
          </q-tooltip>
        </q-btn>

      <!-- donate dialgo -->
      <selectModal :prop="donateModal" @close="donateModal.dialog=false" >
        <div style='display: flex'>
          <q-btn round flat @click="$copy2clipboard($store.getters['misc/donation_address']);$toast.success('Thanks')" color="primary" icon="mdi-content-copy" style="transform:translate(0px,-15px)" />
          <span style="font-size:0.9em">{{ $store.getters['misc/donation_address'] }}</span>
        </div>
        <div style="display:flex;justify-content:center">
          <qrcode :value="$store.getters['misc/donation_address']" :options="{ size: 200 }" style="transform:translate(0px,-15px);margin-bottom:-30px" />
        </div>
      </selectModal>

      <!-- login - register -->
      <div v-if="show_loginregister" class="dialog" style="display:block;z-index:3000" >
        <div class="dialog-content" style="width:450px" >
          <q-tabs v-model="activeTab" dark slider-color="primary" fixed-tabs>
            <q-tab name="login" id="login_tab">
              Login
            </q-tab>
            <q-tab name="register" id="register_tab">
              Register
            </q-tab>
          </q-tabs>
          <q-tab-panels v-model="activeTab" animated class="text-center">
            <q-tab-panel name="login">
              <login :initEmail="email" :initPass="pass" />
            </q-tab-panel>
              <q-tab-panel name="register">
              <register @registered="registered" @declined="declined" />
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </div>

      <!-- contact dialog -->
      <div class="dialog" :style="{ display: contactDialog }" style="z-index:3000" >
        <div class="dialog-content" style="width:550px" >
          <h4 class="text-center" v-html="$t('get_in_touch_fellow_human')"></h4>
          <div style="margin-top:20px">
              <div style="max-width:700pxmargin:auto;max-width:500px" class="center">   
                  <q-input v-model="contact.name" filled  :label="$t('Name')" dense autofocus style="margin-bottom:20px" tabindex="1" />  
                  <q-input v-model="contact.email" filled :label="$t('Email')" dense style="margin-bottom:20px" tabindex="2" />
                  <q-input v-model="contact.message" type="textarea" :label="$t('Message')" tabindex="3" />

                    <div class="button" @click="sendContact" style="display:flex;margin-top:35px;margin-left:10px" tabindex="4" 
                          @keyup.enter="sendContact" >
                      <img src="statics/img/send_message.svg" width="40" height="40"/>
                      <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Send") }}</span>
                    </div>
              </div>
          </div>
        </div>
      </div>

      <!-- settings dialog -->
      <div class="dialog" :style="{ display: settingsDialog }" >
        <div class="dialog-content" style="min-width:500px" >
          <settings @close="settingsDialog='none'" :key="updateKey" />
        </div>
      </div>

    </q-layout>
  </div>

</template>

<style>

</style>

<script>
import gql from 'graphql-tag'
import selectModal from '../components/Modal'
import Login from '../components/Login.vue'
import Register from '../components/Register.vue'
import languages from '../components/languages.vue'
import settings from '../components/settings'
import changePassword from '../components/changePassword'

export default {
  name: 'MyLayout',
  data () {
    return {
      leftDrawerOpen: false,
      donateModal: { title:"Support Us", subtitle:"our_goal", buttons:[], dialog:false },
      feedbackModal: { title:"Thanks for your feedback", subtitle:"Your feedback help us improve", buttons:this.$store.getters['misc/send_cancel_buttons'], dialog:false },
      feedback: {
        rating: -1,
        text: '',
        page: this.$route.name,
        pics: []
      },
      noEmpty: [ v => !!v || 'Please say something' ],
      show_loginregister: false,
      activeTab: 'login',
      email: null,
      pass: null,
      contact: {
        name: '',
        email: '',
        message: '',
      },
      contactDialog: 'none',
      showLogin: true,
      media_sensor: null,
      screen_size: { narrow: 1, medium: 2, large: 3 },
      screen: null,
      settingsDialog: 'none',
      updateKey: 0,
      avatar: null,
      avatar_menu: false,
    }
  },
  components: {
    selectModal,
    Login,
    Register,
    languages,
    settings,
    changePassword,
  },
  computed: {
    userId() {
      return this.$store.getters['user/_id']
    },
    route() {
      return this.$route.name
    },
    nick() {
        return this.$store.getters['user/nick']
    },
    alerts() {
      return this.$store.getters['user/alerts']
    },
    mainnet_path() {
      return `https://${this.$host}`
    },
    testnet_path() {
      return `https://${this.$host}/testnet`
    },
  },
  async serverPrefetch() {
    //console.log("default layout serverPrefetch:", this.$store.getters['user/cookies'])
  },
  beforeCreate() {
  //  if(!this.$userId()) {
  //    const href = window.location.href
  //    if(!!href && href.includes('bitpass'))
  //      this.$go_to('bitpass/login')
  //  }
  },
  async mounted() { //console.log("subsctring(-4)", "10002msat".slice(0, -4))
    /*const href = window.location.href
    if(!this.$userId()) { 
      if(!!href && href.includes('bitpass'))
        this.$go_to('bitpass/login')
    }*/
    this.avatar = this.$storeGet('user/avatar')

    document.addEventListener("keydown", (e) => { 
      if(e.keyCode == 27) { // ESC
        //e.preventDefault() // e.stopPropagation()
        this.$root.$emit("esc")
        this.contactDialog = this.contactDialog = 'none'
        this.show_loginregister = false
        this.activeTab = 'login'
        this.feedbackModal.dialog = false
        this.donateModal.dialog = false
      } else if(e.keyCode == 120) { // F9
        //console.log("F9 pressed")
      } else if(e.keyCode == 76 && !this.$store.getters['user/_id'] ) { // L: Login
        if(!!this.show_loginregister) return
        e.preventDefault() // L not input in field
        this.show_loginregister = true
      }
    })
    const self = this
    window.onclick = function(e) {
      if(e.target._prevClass == "dialog") {
        self.$root.$emit("esc")
        self.contactDialog = 'none'
        self.show_loginregister = false
        self.activeTab = 'login' // next time shows Login (not register)
        self.feedbackModal.dialog = false
        self.donateModal.dialog = false
      }
    }
    //console.log("this.$apollo:", this.$apollo)
    //this.$q.dark.set(this.$userSetting('theme-dark'))
    //console.log("$route.path: {{ $route.path }}:",  this.$route.path  )
    // detects width changes to modify drawer size.
    
    // detects width changes to modify drawer size.
    this.media_sensor = window.matchMedia("(max-width: 570px)")
    this.media_sensor2 = window.matchMedia("(max-width: 1150px)")
    this.media_changed(this.media_sensor) // Call listener function at run time
    this.media_changed(this.media_sensor2)
    this.media_sensor.addListener(this.media_changed)
    this.media_sensor2.addListener(this.media_changed)   
  },
  methods: {
    media_changed() {
      if (this.media_sensor.matches) { // narrow
        this.screen = this.screen_size.narrow
      } else if(this.media_sensor2.matches) {
        this.screen = this.screen_size.medium
      } else {
        this.screen = this.screen_size.large
      }
    },
    toolbar_columns() {
      if(this.screen == this.screen_size.narrow) { // narrow
          return '70px 40px 1fr'
      } else { // medium -  large
          return '120px 40px 1fr'
      }
    },
    set_avatar() {
      this.$store.dispatch('user/updateUser', { field: 'avatar', value: this.avatar } )
      this.avatar_menu = false
    },
    async show_alerts() {
      this.$go_to( { name: 'wallets', params: { showAlerts: true }} )
    },
    sendFeedback(btnIndex) {
      this.feedbackModal.dialog = false
      if(this.feedback.text.length == 0 || btnIndex == 1) return 
      this.$apolloClient().mutate({ 
        mutation: gql`mutation saveFeedback($rating: Float!, $text: String!, $pics: [String!]) {
          saveFeedback(rating:$rating, text:$text, pics: $pics)
        }`,        
        variables: {
          rating: this.feedback.rating,
          text: this.feedback.text,
          pics: this.feedback.pics,
        },
      }).then(({data}) => {
        if(!!data) this.$toastSuccess("Thanks for your feedback")
        this.feedback = { rating: -1, text: '', page: this.$route.name, pics: [] }
      })
    },
    onPaste(event) { 
       var items = (event.clipboardData  || event.originalEvent.clipboardData).items
      console.log(JSON.stringify(items)); // will give you the mime types
      // find pasted image among pasted items
      var blob = null
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") === 0) {
          blob = items[i].getAsFile()
        }
      }
      // load image if there is a pasted image
      if (blob !== null) {
        var reader = new FileReader()
        const self = this
        reader.onload = function(event) {
          if(self.feedback.pics.includes(event.target.result)) return
          self.feedback.pics.push(event.target.result)
          //console.log(event.target.result) // data url!
          const elem = document.createElement("img")
          elem.setAttribute("src", event.target.result)
          elem.setAttribute("width", "200")
          console.log("eleme:", elem)
          document.getElementById("feedback_pics").appendChild(elem)
        }
        reader.readAsDataURL(blob)
      }
    },
    onCopy() {
      this.$toastSuccess("Thanks")
    },
    declined() {
      this.show_loginregister = false
      this.activeTab = 'login'
    },
    registered(email, pass) {
      this.email = email
      this.pass = pass
      this.activeTab = 'login'
    },
    sendContact() {
      if(!this.$checkInput(this.contact.name, "please_fill_%", "Name")) return
      if(!this.$checkInputEmail(this.contact.email)) return
      if(!this.$checkInput(this.contact.message, "please_fill_%", "Message")) return
      this.$apolloClient().mutate({ 
        mutation: gql`mutation saveContact($name: String!, $email: String!, $message: String!) {
          saveContact(name:$name, email:$email, message:$message)
        }`,
        variables: {
          name: this.contact.name,
          email: this.contact.email,
          message: this.contact.message,
        },
      }).then(({data}) => {
        if(!!data) this.$toastSuccess("Thanks for contacting us")
          this.contact.name = null  
          this.contact.email = null
          this.contact.message = null
      })
    },
    /*async login(email_256, pass_256) { // mover a login.vue
      try {
        const res = await this.$apolloClient().mutate({
          mutation: gql`mutation login($email_256: String!, $pass_256: String!) {
            login(email_256: $email_256, pass_256:$pass_256) {
              token
              user {
                _id
                nick
                defaultAddress
                avatar
                fee_address
                roles
                opts {
                  _id
                  name
                  userId
                  value
                }
                settings
                frequents
                donation_address
                subscription
                subscriptionDate
                thirdpartyDate
                origin
                referral
              }
            }
          }`,
          variables: {
            email_256: email_256,
            pass_256: pass_256,
          },
        }).then(({data}) => !!data && data.login)
        this.nick = res.user.nick
        this.$store.commit("user/set", res.user)
        const lang = this.$userOpt('language') || 'us'
        this.$i18n.locale = lang
        await this.$onLogin(res.token, res.user.origin)
        if(!res.user.defaultAddress) {
          this.$toastSuccess(`Start_your_%_experience_by_settings_your_preferences`, { name: this.$app_name() })
          this.$go_to({name:'wallets', params: { 'settings': true} } )
        } else {
          this.$go_to( { name:'wallets' } )
        }
      } catch (error) {
        console.log("login error:", error)
        this.$toastError("Combination User/Password not found!")
      }
    },*/
    async logout() {
      this.$store.commit("user/reset")
      await this.$apolloClient().mutate({ 
        mutation: gql`mutation logout {
          logout
        }`,
      }).then(({data}) => data && data.logout)
      await this.$onLogout()
    },
  },
  
  provide: function () {
    return {
      toggle_drawer: this.toggle_drawer,
    }
  },
}
</script>
