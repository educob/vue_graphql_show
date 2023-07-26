<template>
<div id="board_single_header">
  <div id="buttons">
    <!-- right button -->
    <send_btn  id="right_btn"/>

  </div>
  <!---------- Header ---------->
  <div class="header" id="header" >
    <img class="logo" src="statics/img/escrow.svg" />
    <div class="rows" style="width:fit-content">
      <span style="color:gray;font-size:20px"> {{ $t("Current Balance") }} </span>
      <div style="display:flex" class="hcenter">
        <span class="amount" style="font-size:20px;">{{ total_balance | formatSatoshis }}</span> 
        <span v-if="!!unconfirmed_balance" class="amount" style="font-size:16px">({{ unconfirmed_balance | formatSatoshis }})</span>
      </div>
      <div v-if="$fiat()" style="display:flex" class="hcenter">
        <span class="fiat" style="color:gray;font-size:20px">{{ total_balance | formatFiat($fiat(), true)}}</span>
        <span v-if="!!unconfirmed_balance" class="fiat" style="color:gray;font-size:16px">({{ unconfirmed_balance | formatFiat($fiat(), true)}})</span>
      </div>
    </div>
  </div>
  
  <!---------- Left panel ---------->
  <div class="panel" id="left_panel" style="position:relative">
      <p class="title">{{ $t("My Escrows") }}</p>
      <div v-if="escrows && escrows.length > 0" >
        <selectEntry  :entries="escrows" path="multisigs" :alerts="alerts" icon="escrow.svg" /> <!-- style=";max-height:220px;overflow-y:auto"/> -->
      </div>
      <img v-else style="margin-top:20px" src="statics/img/empty_box.svg" width="100" height="100" class="center lightblue"/>
    <!-- + button -->
    <div style="min-height:80px"></div>
    <div @click="step='step1';newEscrowDialog='block'" class="button" style="position:absolute;bottom:5px;left:10px;min-height:55px">
      <img src="statics/img/plus.svg" width="25" height="25" style="margin-top:10px;margin-right:-8px" />
      <img src="statics/img/escrow.svg" width="40" height="40"/>
      <span class="text" style="margin-right:15px;margin-top:10px">{{ $t("New Escrow") }}</span>
    </div>
  </div>

  <!------------ right panel ------------>
  <div class="panel" id="right_panel">
    <plans @new="newEscrowDialog='block'" />
  </div>

  <!-- New Escrow dialog -->
  <div class="dialog" :style="{ display: newEscrowDialog }">
    <div class="dialog-content"  style="min-width:575px" >
      <div style="display:flex">
        <img src="statics/img/escrow.svg" width="30" height="30" style="transform:translate(0px,-10px)" />
        <p class="title1">{{ $t("New Escrow") }}</p>
      </div>        
      <q-stepper ref="stepper" v-model="step" vertical :active-icon="step == 'step1' ? 'mdi-numeric-1' : 'mdi-numeric-2'" done-icon="mdi-check-circle">

        <!-- step 1 -->
        <q-step name="step1" default :title="$t('Name')" >
          <div style="display:flex;margin-bottom:5px"> 
            <q-input :label="$t('Name')" v-model="name" dense style="width:350px;" :style="{ backgroundColor: $no_empty(name) }" 
                tabindex="1" autofocus />
          </div>

          <div class="button" @click="escrow_step1" style="display:flex;margin-top:20px" tabindex="2" @keyup.enter="escrow_step1">
            <img src="statics/img/right.svg" width="30" height="30"/>
            <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Next") }}</span>
          </div>
        </q-step>

        <!-- step 2 -->
        <q-step v-if="!$store.getters['user/isThirdparty']" name="step2" default :title="$t('Third Party Service Provider')" >
          <div style="margin-bottom:15px" >
            <span class="title3" >{{ $t('Name') }}: </span>
            <span class="text">{{ name }}</span>
          </div>      

          <select3party @selected="select_3party" />

          <div style="display:flex;margin-top:10px;">
            <!-- previous -->
            <div class="button" @click="$refs.stepper.previous()" style="padding-right:10px" >
              <img src="statics/img/left.svg" width="30" height="30" style="margin-left:5px" />
            </div>
          </div>
        </q-step>

        <!-- step 3 -->
        <q-step name="step3" :title="$t('Signers')" >
          <div style="color:gray;margin-top:-10px" v-html="$t('new_ms_step3_sub')"></div><br/>
          <p class="title3" style="line-height:10px">Name: {{ name }}</p>
          <p v-if="thirdparty" class="title3" style="line-height:10px">{{ $t("Third Party Sevice Provider")}}: {{ thirdparty.companyName }}</p>
          <q-separator />
          <ul v-if="signers.length" style="margin-top:15px;list-style-type:none">
            <span>{{ $t("Signers") }}:</span>
            <li row v-for="n in 2" :key="n">
              <div style='display: flex;height:3em'>
                <span style="width:10px">{{ n }}</span> <!-- row number -->
                <div v-if="!(signers[n-1].setUser || signers[n-1].setPubkey || (signers[n-1].userId && !signers[n-1].addressId))" style="margin-top:5px">
                  <q-btn flat dense round no-caps style="transform:translate(10px,-3px);color:gray" color="primary" icon="mdi-email" @click.native="setUserFlag(n-1)" />
                  <span style="color:gray;margin-left:10px">{{ $t("Assign user") }}</span>
                </div>
                <!-- entry field: nick + ok -->
                <addressEmailFavorite v-else :onlyUsers="true" :noSelf="n==2" style="transform:translate(10px,-5px)" />
              </div>
            </li>
          </ul>
          <!-- buttons -->
          <div style="display:flex;margin-top:20px;">
          <!-- previous -->
            <div class="button" @click="$refs.stepper.previous()" style="padding-right:10px" >
              <img src="statics/img/left.svg" width="30" height="30" style="margin-left:5px" />
            </div>
            <!-- next to step 3 -->
            <div class="button" @click="escrow_step3" style="display:flex;margin-left:10px" >
              <img src="statics/img/save.svg" width="30" height="30"/>
              <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Save") }}</span>
            </div>
          </div>

        </q-step>
      </q-stepper>
    </div>
  </div>


</div>
</template>

<script>
import Vue from 'vue'
import gql from 'graphql-tag'
import selectEntry from 'src/components/selectEntry'
import send_btn from 'src/components/send_btn'
import plans from 'src/components/plansOverview'
import addressEmailFavorite from "src/components/addressEmailFavorite"
import select3party from "src/components/select3party"

export default {
  data: () => ({
    step: '',
    name: '',
    M: 2,
    N: 3, // total N >= M
    signers: [],
    noEmpty: [ v => !!v || this.$t("Field required") ],
    dialog: 'none',
    selectedRow: -1,
    newEscrowDialog: 'none',
    thirdparty: null,
  }),
  components: {
    selectEntry,
    send_btn,
    addressEmailFavorite,
    plans,
    select3party,
  },
  computed: {
    alerts() {
      return this.$store.getters['user/alerts']
    },
    wallets() {
      return this.$store.getters['user/wallets']
    },
    escrows() {
      const escrows = this.$store.getters['user/multisigs']
      return escrows.filter(e => !!e.thirdpartyUserId)
    },
    total_balance() {
      const multisigs = this.escrows
      return multisigs.reduce( (sum, ms) => {
        return sum + (!!ms.address ? ms.address.balance : 0)
      }, 0)
    },
    unconfirmed_balance() {
      const multisigs = this.$store.getters['user/multisigs']
      return multisigs.reduce( (sum, ms) => {
        return sum + (!!ms.address ? ms.address.unconfirmedBalance : 0)
      }, 0)
    },
  },
  beforeMount() {
    const self = this
    this.onEsc = function() {
      if(self.dialog == 'block') return
      self.newEscrowDialog = 'none'
    }
    this.$root.$on('esc', this.onEsc)
    // new event
    this.onNew = function() { 
      self.newEscrowDialog = 'block'
    }
    this.$root.$on('new', this.onNew)
  },
  beforeDestroy() {
    this.$root.$off('esc', this.onEsc)
    this.$root.$off('new', this.onNew)
  },
  mounted() {
    if(!!this.$route.params.new) this.newEscrowDialog = 'block'
    if(this.$isThirdparty)
      this.thirdparty = { userId: this.$userId()}
  },
  methods: {
    escrow_step1() { // choose values for M of N.
      if(!this.name.length) {
        this.$toastError('Please introduce a name')
        return
      }
      this.step = 2
      this.signers.push( { userId: null, addressId:null, setUser: false, setPubkey: false, nick: null } )
      this.signers.push( { userId: null, addressId:null, setUser: false, setPubkey: false, nick: null } )
      this.$refs.stepper.next()
    },
    select_3party(tp) {
      this.thirdparty = tp
      this.step = 3
      this.$refs.stepper.next()
    },
    async escrow_step3() { console.log("this.signers:", this.signers) // enter signers
      if(this.signers.some(s => !s.userId )) {
        this.$toastError("please_fill_%", { name: 'User'})
        return
      } ; console.log("this.thirdparty:", this.thirdparty)
      this.$apolloClient().mutate({ 
        mutation: gql`mutation saveEscrow($input: EscrowInput!) {
          saveEscrow(input: $input) {
            _id
          }
        }`,
        variables: {
          input: {
            name: this.name,
            thirdpartyUserId: this.thirdparty.userId,
            signers: this.signers.map(s => { 
              return { userId: s.userId, nick: s.nick, addressId: s.addressId }
            }),
          }
        },
      }).then( ({data}) => {
        //this.$refs.form.reset()
        const escrowId = data.saveEscrow._id
        if(this.signers.some(s => s.userId == this.$userId) || this.$isThirdparty()) { // 3party or creator is signer
          this.$store.commit('user/multisigs', [ { _id: escrowId, name: this.name, thirdpartyUserId: this.thirdparty.userId, address: null }, ...this.$store.getters['user/multisigs'] ])
          this.$go_to(`/multisigs/${escrowId}` )
        } else { // creator is not signer
          this.newEscrowDialog = 'none'
          this.signers = []
          this.name = null
          this.thirdparty = {}
          this.step = ''
        }
      }).catch((error) => {
        console.error("mutation saveEscrow error", error)  // eslint-disable-line no-console
      })
    },
    setUserFlag(row) {
      this.signers[row].setUser = true
      this.selectedRow = row
    },
    // address_email_to compoment
    address_email_to_updated(address_email_to) {
      if(!address_email_to.userId) return
      const signer = this.signers[this.selectedRow]
      //signer.setUser = false
      signer.userId = address_email_to.userId
      signer.nick = address_email_to.nick
    },
  },
  provide: function () {
    return {
      address_email_to_updated: this.address_email_to_updated,
    }
  },  
 
}
</script>

<style>

</style>