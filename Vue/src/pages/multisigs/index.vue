<template>
<div id="board_single_header">
  <div id="buttons">
    <!-- right button -->
    <send_btn  id="right_btn"/>

  </div>

  <!---------- Header ---------->
  <div class="header" id="header" >
    <img class="logo" src="statics/img/multisig.svg" />
    <div class="rows" style="width:fit-content" >
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
    <span class="title">{{ $t("My Joint Wallets") }}</span>
    <selectEntry v-if="multisigs && multisigs.length > 0" :entries="multisigs" path="multisigs" 
            :alerts="alerts" icon="multisig.svg" tpIcon="escrow.svg" />
    <img v-else style="margin-top:20px" src="statics/img/empty_box.svg" width="100" height="100" class="center lightblue"/>

    <!-- + joint button -->
    <div style="position:absolute;bottom:0">
      <div v-if="!$isThirdparty()" @click="init_new_joinwallet('jointwallet')" class="button" style="min-height:55px;">
        <img src="statics/img/plus.svg" width="25" height="25" style="margin-right:-8px" />
        <img src="statics/img/multisig.svg" width="40" height="40"/>
        <span class="text" style="margin-right:15px">{{ $t($serviceTitle('jointwallet')) }}</span>
      </div>

      <!-- + escrow button -->
      <div v-if="!!$isThirdparty()" @click="init_new_joinwallet(jointwallet3party)" class="button" style="min-height:55px">
        <img src="statics/img/plus.svg" width="25" height="25" style="margin-right:-8px" />
        <img src="statics/img/escrow.svg" width="40" height="40"/>
        <span class="text" style="margin-right:15px">{{ $t($serviceTitle('jointwallet3party')) }}</span>
      </div>
    </div>
  </div>

  <!------------ right panel ------------>
  <div class="panel" id="right_panel">
    <plans @new="newMultisigDialog='block'" />
  </div>

  <!-- New Multisig dialog -->
  <div class="dialog" :style="{ display: newMultisigDialog }">
    <div class="dialog-content"  style="min-width:355px" >
      <div style="display:flex">
        <img src="statics/img/multisig.svg" width="30" height="30" style="transform:translate(0px,-10px)" class="lightblue" />
        <p class="title1">{{ $t("New Joint Wallet") }}</p>
      </div>      
      <q-stepper ref="jointstepper" v-model="step" vertical :active-icon="step == 'step1' ? 'mdi-numeric-1' : 'mdi-numeric-2'" done-icon="mdi-check-circle">

        <!-- step 1 -->
        <q-step name="step1" default :title="$t('Name')" >
          <div style="display:flex;margin-bottom:5px"> 
            <q-input :label="$t('Name')" v-model="name" dense style="width:350px;" rounded outlined :bg-color="$no_empty(name)" 
                tabindex="1" autofocus />
          </div>
          <!-- next btn -->
          <div class="button" @click="step1" style="display:flex;margin-top:20px" tabindex="2" @keyup.enter="step1">
            <img src="statics/img/right.svg" width="30" height="30"/>
            <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Next") }}</span>
          </div>
        </q-step>

        <!-- step 2 -->
        <q-step name="step2" default :title="$t('Number of Signers')" >
          <div style="margin-bottom:15px" >
            <span class="title3" >{{ $t('Name') }}: </span>
            <span class="text">{{ name }}</span>
          </div>
          <div>
            <span class="title4" style="line-height:10px">{{ $t("new_ms_entry1") }}</span>
          </div>
          <div style="margin-bottom:10px">
            <span class="title4">{{ $t("new_ms_entry2") }}</span>
          </div>
          <div style="display:flex "> <!-- M of N -->
            <q-select v-model="M" :options='$range(1, 15)' style="width:50px;margin-right:15px;transform:translate(0,-15px)" dense/>
            <span style="color:gray" >{{  $t("of") }}</span>
            <q-select v-model="N" :options='$range(2, 15)' style="width:50px;margin-left:15px;transform:translate(0,-15px)" dense/>
            <span style="margin-left:10px;color:gray">Signers</span>
          </div>

          <div style="display:flex;margin-top:10px;">
            <!-- previous -->
            <div class="button" @click="$refs.jointstepper.previous()" style="padding-right:10px" >
              <img src="statics/img/left.svg" width="30" height="30" style="margin-left:5px" />
            </div>
            <!-- next to step 3 -->
            <div class="button" @click="step2" style="display:flex;margin-left:10px" tabindex="3" @keyup.enter="step2">
              <img src="statics/img/right.svg" width="30" height="30"/>
              <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Next") }}</span>
            </div>
          </div>
        </q-step>

        <!-- step 3 -->
        <q-step name="step3" :title="$t('Signers')" >
          <div style="color:gray;margin-top:-10px" v-html="$t('new_ms_step3_sub')"></div><br/>
          <p class="title3" style="line-height:10px">Name: {{ name }}</p>
          <p class="title3">{{ $t("%_of_%_signers", { M, N }) }}</p>
          <q-separator />
          <div v-if="signers.length"style="margin-top:15px;list-style-type:none;margin-left:0px">
            <div row v-for="n in N" :key="n" >
              <div style='display: flex;height:3em'>
                <span style="width:10px">{{ n }}</span> <!-- row number -->
                <!-- enter signers pop up menu -->
                <div v-if="n==1 && !signers[n-1].setUser" style="margin-top:5px">
                  <div v-if="!(signers[n-1].setUser || signers[n-1].setPubkey || (signers[n-1].userId && !signers[n-1].addressId))">
                    <div style="cursor:pointer">
                      <q-btn flat dense round no-caps style="transform:translate(10px,-3px);color:gray" color="primary" icon="mdi-key" />
                      <span style="color:gray;margin-left:10px">{{ $t("assign addr/bapp user") }}</span>
                    </div>
                    <q-menu>
                      <q-list><!--row 1:  insert creator -->
                        <q-item v-if="!signers.some(s=>s.setPubkey)" @click.native="setPubkeyFlag(n-1)" style="cursor:pointer">
                          <q-icon color="primary" name="mdi-qrcode" size="sm" />
                          <span style="color:gray;margin-left:5px">{{ $t("add_own_btc_addr") }}</span>
                        </q-item><!-- fow 1: insert other -->
                        <q-item @click.native="setUserFlag(n-1)" style="cursor:pointer">
                          <q-icon color="primary" name="mdi-email" size="sm" />
                          <span style="color:gray;margin-left:5px;margin-top:2px">{{ $t("add_user_email") }}</span>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </div><!--- click on user previously entered -->
                  <div v-else style="margin-left:10px;margin-top:5px" @click="resetUser(n-1)" class="click">
                    <span style="margin-left:5px">{{ signers[n-1].nick }}</span>
                    <q-icon color="green" name="mdi-check-circle" size="sm" style="margin-left:5px;margin-top:-3px"/>  
                  </div>
                </div><!-- row 2-... -->
                <div v-else-if="!(signers[n-1].setUser || signers[n-1].setPubkey || (signers[n-1].userId && !signers[n-1].addressId))" style="margin-top:5px" >
                  <q-btn flat dense round no-caps style="transform:translate(10px,-3px)" color="primary" icon="mdi-email" @click.native="setUserFlag(n-1)" />
                  <span style="color:gray;margin-left:10px">{{ $t("Assign user") }}</span>
                </div>
                <!-- entry field: nick + ok -->
                <addressEmailFavorite v-else :onlyUsers="true" :noSelf="n>1" style="transform:translate(10px,-5px)y"/>
              </div>
            </div>
          </div>
            <!-- buttons -->
            <div style="display:flex;margin-top:20px;">
            <!-- previous -->
              <div class="button" @click="$refs.jointstepper.previous()" style="padding-right:10px" >
                <img src="statics/img/left.svg" width="30" height="30" style="margin-left:5px" />
              </div>
              <!-- next to step 3 -->
              <div class="button" @click="step3" style="display:flex;margin-left:10px" >
                <img src="statics/img/save.svg" width="30" height="30"/>
                <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Save") }}</span>
              </div>
            </div>

        </q-step>
      </q-stepper>
    </div>
  </div>

  <!-- New Escrow dialog -->
  <div class="dialog" :style="{ display: newEscrowDialog }">
    <div class="dialog-content"  style="min-width:575px" >
      <div style="display:flex">
        <img src="statics/img/escrow.svg" width="30" height="30" style="transform:translate(0px,-10px)" />
        <p class="title1">{{ $t("New Escrow") }}</p>
      </div>        
      <q-stepper ref="escrowstepper" v-model="step" vertical :active-icon="step == 'step1' ? 'mdi-numeric-1' : 'mdi-numeric-2'" done-icon="mdi-check-circle">

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
        <q-step v-if="!$isThirdparty()" name="step2" default :title="$t('Third Party Service Provider')" >
          <div style="margin-bottom:15px" >
            <span class="title3" >{{ $t('Name') }}: </span>
            <span class="text">{{ name }}</span>
          </div>      

          <select3party @selected="select_3party" />

          <div style="display:flex;margin-top:10px;">
            <!-- previous -->
            <div class="button" @click="$refs.escrowstepper.previous()" style="padding-right:10px" >
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

                <div v-if="!$isThirdparty() && n==1 && !signers[n-1].setUser" style="margin-top:5px">
                  <div v-if="!(signers[n-1].setUser || signers[n-1].setPubkey || (signers[n-1].userId && !signers[n-1].addressId))">
                    <div style="cursor:pointer">
                      <q-btn flat dense round no-caps style="transform:translate(10px,-3px);color:gray" color="primary" icon="mdi-key" />
                      <span style="color:gray;margin-left:10px">{{ $t("assign addr/bapp user") }}</span>
                    </div>
                    <q-menu>
                      <q-list><!--row 1:  insert creator -->
                        <q-item v-if="!signers.some(s=>s.setPubkey)" @click.native="setPubkeyFlag(n-1)" style="cursor:pointer">
                          <q-icon color="primary" name="mdi-qrcode" size="sm" />
                          <span style="color:gray;margin-left:5px">{{ $t("add_own_btc_addr") }}</span>
                        </q-item><!-- fow 1: insert other -->
                        <q-item @click.native="setUserFlag(n-1)" style="cursor:pointer">
                          <q-icon color="primary" name="mdi-email" size="sm" />
                          <span style="color:gray;margin-left:5px;margin-top:2px">{{ $t("add_user_email") }}</span>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </div><!--- click on user previously entered -->
                  <div v-else style="margin-left:10px;margin-top:5px" @click="resetUser(n-1)" class="click">
                    <span style="margin-left:5px">{{ signers[n-1].nick }}</span>
                    <q-icon color="green" name="mdi-check-circle" size="sm" style="margin-left:5px;margin-top:-3px"/>  
                  </div>
                </div><!-- row 2-... -->


                <div v-else-if="!(signers[n-1].setUser || signers[n-1].setPubkey || (signers[n-1].userId && !signers[n-1].addressId))" style="margin-top:5px">
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
            <div class="button" @click="$refs.escrowstepper.previous()" style="padding-right:10px" >
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

  <addPubkey v-if="dialog" :scriptName="'MultiSignature: ' + name" @walletSelected="addressSelectedHandler" @close="dialog=false" />

</div>
</template>

<script>
import Vue from 'vue'
import gql from 'graphql-tag'
import addPubkey from 'src/components/addPubkey'
import selectEntry from 'src/components/selectEntry'
import send_btn from 'src/components/send_btn'
import plans from 'src/components/plansOverview'
import addressEmailFavorite from "src/components/addressEmailFavorite"
import select3party from "src/components/select3party"

export default {
  data: () => ({
    step: 'step1',
    valid: true,
    name: '',
    M: 1,
    N: 2, // total N >= M
    signers: [],
    noEmpty: [ v => !!v || this.$t("Field required") ],
    dialog: false,
    selectedRow: -1,
    newMultisigDialog: 'none',
    newEscrowDialog: 'none',
    thirdparty: null,
    // service payment
    services: {
      1: { id: 10, label: 'Joint Wallet', path: 'multisigs' , name: 'jointwallet' },
      2: { id: 11, label: 'Third Party Joint Wallet', path: 'multisigs', name: 'escrow' },
    },
  }),
  components: {
    addPubkey,
    selectEntry,
    send_btn,
    addressEmailFavorite,
    plans,
    select3party  
  },
  watch: {
    M: function (val) {
      this.N = Math.max(this.N, this.M);
    },
    N: function (val) {
      this.M = Math.min(this.N, this.M);
    },
  },
  computed: {
    alerts() {
      return this.$store.getters['user/alerts']
    },
    wallets() {
      return this.$store.getters['user/wallets']
    },
    multisigs() {
      return this.$store.getters['user/multisigs']
    },
    total_balance() {
      const multisigs = this.$store.getters['user/multisigs']
      return multisigs.reduce( (sum, ms) => {
        if(!ms.address) return sum // || !!ms.thirdpartyUserId) return sum
        return sum + ms.address.balance
      }, 0)
    },
    unconfirmed_balance() {
      const multisigs = this.$store.getters['user/multisigs']
      return multisigs.reduce( (sum, ms) => {
        if(!ms.address) return sum // || !!ms.thirdpartyUserId) return sum
        return sum + (!!ms.address ? ms.address.unconfirmedBalance : 0)
      }, 0)
    },
  },
  beforeMount() {
    const self = this
    this.onEsc = function() {
      if(self.dialog) return
      self.resetForm()
    }
    this.$root.$on('esc', this.onEsc)
    // new event
    this.onNew = function() { 
      self.newMultisigDialog = 'block'
    }
    this.$root.$on('new', this.onNew)
  },
  beforeDestroy() {
    this.$root.$off('esc', this.onEsc)
    this.$root.$off('new', this.onNew)
  },
  mounted() {
    if(!!this.$route.params.new) this.newMultisigDialog = 'block'
    //if(!!this.$route.params.new) this.newEscrowDialog = 'block'
    if(this.$isThirdparty())
      this.thirdparty = { userId: this.$userId() }    
    if(!!this.$route.params.new) 
      this.init_new_aftermessage(this.$serviceByValue(this.$route.params.type || 10).name)
  },
  methods: {
    async init_new_joinwallet(name) {
      const service = this.$service(name)
      const paidService = await this.$paidService(service.value) ; console.log("paidService:", paidService)
      if( (!this.$isMainnet() && !this.$isRegtest()) || !!paidService) { // service is paid
        if(service.value == 10)
          this.newMultisigDialog =  'block'
        else
          this.newEscrowDialog =  'block'
      } else { // service not paid
        this.$root.$emit('servicePay', service) 
      }
      //console.log("service2:", service)
    },
    step1() { console.log("multisig step 1")
      if(!this.name.length) {
        this.$toastError('Please introduce a name')
        return
      }
      this.step = 2
      this.$refs.jointstepper.next()
    },
    step2() {   console.log("multisig step 2") // choose values for M of N.
      for (var i = 0; i < this.N; i++)
        this.signers.push( { userId: null, addressId:null, setUser: false, setPubkey: false, nick: null } )
      this.step = 3
      this.$refs.jointstepper.next()
    },
    async step3() {  console.log("multisig step 3") //
      if(this.signers.some(s => !s.userId )) {
        this.$toastError("Plase enter a valid entry for each signer.")
        return
      }
      this.$apolloClient().mutate({
        mutation: gql`mutation saveMultisig($input: SaveMultisigInput!) {
          saveMultisig(input: $input) {
            _id
          }
        }`,
        variables: {
          input: {
            name: this.name,
            M: this.M,
            N: this.N,
            signers: this.signers.map(s => { 
              return { userId: s.userId, nick: s.nick, addressId: s.addressId }
            }),
          }
        },
      }).then( ({data}) => {
        const multisigId = data.saveMultisig._id
        if(this.signers.some(s => s.userId == this.$userId())) { // 3party or creator is signer
          this.$go_to(`/multisigs/${multisigId}` )
        }
        this.resetForm()
      }).catch((error) => {
        console.error("mutation saveMultisig error", error)  // eslint-disable-line no-console
      })
    },
    // Escrow
    escrow_step1() { console.log("escrow step 1")
      if(!this.name.length) {
        this.$toastError('Please introduce a name')
        return
      }
      this.step = 2
      this.signers.push( { userId: null, addressId:null, setUser: false, setPubkey: false, nick: null } )
      this.signers.push( { userId: null, addressId:null, setUser: false, setPubkey: false, nick: null } )
      this.$refs.escrowstepper.next()
    },
    select_3party(tp) { console.log("escrow step 2")
      this.thirdparty = tp
      this.step = 3
      this.$refs.escrowstepper.next()
    },
    async escrow_step3() { console.log("escrow step 3. sthis.signers:", this.signers) // enter signers
      if(this.signers.some(s => !s.userId )) {
        this.$toastError("please_fill_%", { name: 'User'})
        return
      }
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
        const escrowId = data.saveEscrow._id
        if(this.signers.some(s => s.userId == this.$userId()) || this.$isThirdparty()) { // 3party || creator is signer
          this.$go_to(`/multisigs/${escrowId}` )
        }
        this.resetForm()
      }).catch((error) => {
        console.error("mutation saveEscrow error", error)  // eslint-disable-line no-console
      })
    },
    resetForm() {
      this.step = 'step1'
      this.newMultisigDialog = this.newEscrowDialog = 'none'
      this.name = null
      this.signers = []
      if(!this.$isThirdparty())
        this.thirdparty = {}
    },
    setUserFlag(row) {
      this.signers[row].setUser = true
      this.selectedRow = row
    },
    setPubkeyFlag(row) {
      this.selectedRow = row
      this.dialog = true
    },
    addressSelectedHandler( address ) { // called by emit event in selectAddress component
      this.dialog = false;
      this.signers[this.selectedRow].setPubkey = true;
      this.signers[this.selectedRow].addressId = address._id;
      this.signers[this.selectedRow].userId = this.$store.getters['user/_id']
      this.signers[this.selectedRow].nick = this.$store.getters['user/nick']
    },
    // address_email_to compoment
    address_email_to_updated(address_email_to) {
      if(!address_email_to.userId) return
      const signer = this.signers[this.selectedRow]
      //signer.setUser = false
      signer.userId = address_email_to.userId
      signer.nick = address_email_to.nick
    },
    resetUser(i) {
      this.signers[this.selectedRow].setPubkey = false;
      this.signers[this.selectedRow].addressId = null;
      this.signers[this.selectedRow].userId = null
      this.signers[this.selectedRow].nick = null
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