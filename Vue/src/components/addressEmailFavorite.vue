<template>
    <div style="display:grid;grid-template-columns:1fr 40px">
      <q-input v-if="!!noFavorite && !address_email_to.nick" v-model="input" :label="label" :autofocus="autofocus" dense outlined rounded
                :bg-color="$no_empty(input)" />
      <q-select v-else-if="!address_email_to.nick || show_select" v-model="input" use-input hide-selected fill-input input-debounce="0"
                :readonly="!!fixedInput" :label="label"  :options="current_frequents" @filter="filterFn"  :autofocus="autofocus" 
                :hide-dropdown-icon="!current_frequents.length" @input="set_frequent_address" dense outlined rounded :bg-color="$no_empty(input)" >
        <template v-slot:after>
          <q-icon v-if="!!input && !address_email_to.address" color="red" name="mdi-alert-circle" size="sm" />  
        </template>
      </q-select>
      <div v-else style="margin-top:5px;display:flex;height:45px" @click="!fixedInput && !noFavorite ? show_select=true : ''" :class="!fixedInput ? 'click' : ''">
        <div @click="input=null" style="display:flex;border-radius:30px;border: 1px solid #ddd;padding-left:10px;padding:10px" >
          <span style="" >{{ address_email_to.nick }}</span>
          <q-icon v-if="!ignoreDefaultAddress && !!address_email_to.address" color="green" name="mdi-check-circle" size="sm" class="vcenter" style="margin-left:5px"/>  
        </div>
        <q-space />  
        <!-- favorites -->
        <div v-if="!!address_email_to.is_bapp_user && !!show_favorite_btn" @click="showFrequentDialog" class="vcenter"> 
          <q-btn flat round color="primary" icon="mdi-cards-heart" dense  />
          <span style="font-size:12px;">{{ $t("Add to favorites") }}</span>
        </div>
      </div>
      <div v-if="!!emailNotRegistered" class="vcenter">
        <img  src="statics/img/speaker.svg" @click="$recommendBapp(input)" width="35" height="35" class="click lightblue" />
        <q-tooltip>{{ $t("Recommend us to a Friend") }}</q-tooltip>
      </div>
      
    <!-- new frequent -->
    <dialogg v-if="newFrequentModal.dialog" :prop="newFrequentModal" @selectionDone="saveFrequent"  @close="newFrequentModal.dialog=false"> 
      <q-input :label="$t('User nick')" v-model="frequent_nick" append-icon='mdi-account-details' />
    </dialogg>

  </div>
</template>

<script>
import gql from 'graphql-tag'
import { sha256 } from "js-sha256"
import dialogg from "./dialog"

export default {
  data() {
    return {
      show_favorite_btn: false,
      input: '',
      address_email_to: {
        nick: '',
        address: '',
        is_bapp_user: false,
        userId: '',
        avatar: null,
        liam: null,
      },
      noEmpty: [ v => !!v || this.$t("Field required") ],
      frequent_nick: '',
      frequent_userId: '',
      newFrequentModal: { title:"User\'s Nick", text:"", buttons:this.$store.getters['misc/set_button'], dialog:false },
      current_frequents: [],
      show_select: false,
      emailNotRegistered: false,
    }
  },
  props: {
    onlyUsers: Boolean,
    noSelf: Boolean,
    value: String,
    fixedInput: Boolean,
    ignoreDefaultAddress: Boolean,
    autofocus: Boolean,
    noFavorite: Boolean,
  },
  components: {
    dialogg,
  },
  mounted() {//  this.input = 'john2@gmail.com'
    if(!!this.value) {
      this.input = this.value
      if(this.$isAddress(this.input, this.$bitcoin_network())) return
      if(this.$isEmail(this.input.toLowerCase())) return
      this.set_frequent_address()
    }
  },
  computed: {
    frequents() {
      return this.$store.getters['user/frequent_nicks']
    },
    label() {
      if(!!this.onlyUsers) { // only users. no bitcon address
        if(!this.noFavorite) // email & favorites
          return this.$t('User email/Favorite')
        else // only emails
          return this.$t('User email')
      } else { // btc address & users.
        return this.$t('Btc_addr/User_ email')
      }
    }
  },
  watch: {
    async input(val) {// console.log("input:", val)
      this.emailNotRegistered = false
      this.show_select = false
      this.address_email_to.userId = null
      this.address_email_to.address = ''
      this.address_email_to.nick = ''
      this.address_email_to.avatar = ''
      this.address_email_to.is_bapp_user = false
      this.address_email_to.show_favorite_btn = false
      if(!this.input) return
      if(this.$isAddress(this.input, this.$bitcoin_network())) {
        if(!!this.onlyUsers) {
          this.$toastError("only bapp user")
          return
        }
        this.address_email_to.address = this.input
      } else if(this.$isEmail(this.input.toLowerCase())) { // email
        this.emailNotRegistered = true // maybe if no user
        const user = await this.$userByEmail(sha256(this.input.toLowerCase()))
        if(user) {
          this.emailNotRegistered = false
          if(!!this.noSelf && user._id == this.$userId()) {
            this.$toastError("Don't enter yourself")
            return
          }
          if(!this.ignoreDefaultAddress && !user.defaultAddress) {
            this.$toastInfo(`${user.nick} has not created a wallet yet!`)
            return
          }
          this.address_email_to.nick = user.nick // this.input.split("@")[0]
          this.address_email_to.address = user.defaultAddress
          this.address_email_to.is_bapp_user = true
          this.address_email_to.userId = user._id
          this.address_email_to.avatar = user.avatar
          this.address_email_to.liam = sha256(this.$reverse(this.input.toLowerCase()).replace('@', 'arroba'))
          if(!this.$store.getters['user/frequent_has_userid'](user._id))
            this.show_favorite_btn = true
        }
      }
      this.address_email_to_updated(this.address_email_to)
    },
  },
  methods: {
    showFrequentDialog() {
      this.newFrequentModal.dialog = true
      this.frequent_nick = this.address_email_to.nick
    },
    async saveFrequent() {
      await this.$store.dispatch('user/frequent', { nick: this.frequent_nick, userId: this.address_email_to.userId })
      this.newFrequentModal.dialog = false
    },
    async set_frequent_address() {
      const userId = this.$store.getters['user/frequent'](this.input)
      const user = await this.$userByEmail(userId)
      this.address_email_to.userId = userId
      this.address_email_to.address = user.defaultAddress
      this.address_email_to.avatar = user.avatar
      this.address_email_to.nick = this.input
      this.address_email_to_updated(this.address_email_to)
    },
    filterFn (val, update, abort) {
      if (val.length < 1) {
        abort()
        return
      }
      update(() => {
        const needle = val.toLowerCase()
        this.current_frequents = this.$store.getters['user/frequent_nicks'].filter(v => v.toLowerCase().indexOf(needle) > -1)
        this.input = val
      })
    },
  },
  inject: [ 'address_email_to_updated' ],
}

</script>