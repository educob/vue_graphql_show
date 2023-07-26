<template>
<div v-if="!!this.$apollo.queries.lightning && !this.$apollo.queries.lightning.loading" id="board_single_header">
  <!---------- Header ---------->
  <div class="header" id="header" >
    <img class="logo" src="statics/img/lightning.svg" />
    
    <span v-if="!lightning" style="color:gray;font-size:20px"> {{ $t("Inactive") }} </span>
    <div v-else class="rows">

      <div v-if="!!lightning.pending_funding" >
        <span style="color:gray;font-size:20px"> {{ $t("Pending Payment") }}:&nbsp;</span>
        <div style="flex">     
          <span class="amount"> {{  $msat2sat(lightning.pending_funding) | formatSatoshis }}&nbsp; </span> 
          <span class="fiat" style="color:gray;font-size:16px">-&nbsp;{{ $msat2sat(lightning.pending_funding) | formatFiat($fiat(), true) }}</span>
        </div>
      </div>

      <div v-else >
        <!-- In Contract -->
        <div style="display:flex;width: fit-content">
          <span style="color:gray;font-size:20px"> {{ $t("In Contract") }}:&nbsp;</span>        
          <span class="amount"> {{  lightning.inContract | formatSatoshis }}&nbsp; </span> 
          <span class="fiat" style="color:gray;font-size:16px">-&nbsp;{{ lightning.inContract | formatFiat($fiat(), true) }}</span>
        </div>
        <!-- user_msats -->
        <div style="display:flex;width: fit-content">
          <span class="amount">{{  lightning.user_msats/1000 | formatSatoshis }}&nbsp; </span>
          <span v-if="lightning.user_msats" class="fiat" style="color:gray;font-size:16px">-&nbsp;{{ lightning.user_msats/1000 | formatFiat($fiat(), true) }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- left panel -->
  <div class="panel" id="left_panel">
    <!-- confirmed channel -->
    <div style="margin-top:10px;margin-left:10px">
      <q-tabs v-model="tab" align="justify" narrow-indicator class="q-mb-lg" inline-label>
        <q-tab v-if="!!lightning && !!lightning.user_msats && !lightning.cancelSignature" @click="reset" class="lightblue" name="pay" icon="img:statics/img/send.svg" >
          <q-tooltip>{{ $t("Pay Lightning Payment") }}</q-tooltip>
        </q-tab>
        <q-tab v-if="!!lightning && !lightning.cancelSignature" @click="reset" name="receive" class="text-primary"  icon="mdi-receipt" ><!-- ??? remove "|| true" -->
          <q-tooltip>{{ $t("Request Lightning Payment") }}</q-tooltip>
        </q-tab>
        <q-tab class="lightblue" name="fund" icon="img:statics/img/fund_ln.svg" >
          <q-tooltip>{{ $t("Fund Lightning Service") }}</q-tooltip>
        </q-tab>
      </q-tabs>

      <q-tab-panels v-model="tab" :swipeable="true" animated >
        <!-- pay ln payrequest -->
        <q-tab-panel v-if="!!lightning && !!lightning.user_msats" name="pay">
          <span v-if="show_pay_button()" style="color:var(--light-blue);font-size:1.2em">{{ $t("Pay Lightning Payment") }}</span>
          <q-input v-model="bolt11" label="Insert Lightnint Payment" dense style="margin-top:10px" autofocus :style="{ backgroundColor: $no_empty(bolt11) }" />
          <div v-if="decoded"  style="padding:5px" :style="{ backgroundColor: lnpayColor() }">
            <div style="display:flex;margin-top:10px">
              <span style="min-width:100px;text-align:left">{{ $t("Created") }}:</span>
              <span style="">{{ decoded.created_at  }}</span>
            </div>
            <div style="display:flex"><!-- expires -->
              <span style="min-width:100px;text-align:left">{{ $t('Expires') }}:</span>
              <span style="">{{ decoded.expires_at }}</span>
            </div>
            <div style="display:flex"><!-- destination -->
              <span style="min-width:100px;text-align:left">{{ $t("Destination") }}:</span>
              <span  class="ellipsis" style="font-size:0.8em;margin-top:3px">{{ decoded.destination }}</span>
            </div>
            <div style="display:flex"><!-- msats -->
              <span style="min-width:100px;text-align:left">{{ $t("Amount") }}:</span>
              <span style="">{{ decoded.mtokens | formatMsats}}</span>&nbsp; - &nbsp;
              <span class="fiat" style="color:gray;font-size:14px">{{ decoded.mtokens/1000 | formatFiat($fiat(), true)}}</span>
            </div>
            <div style="display:flex"><!-- description -->
              <span style="min-width:100px;text-align:left">{{ $t("Description") }}:</span>
              <span style="">{{ decoded.description }}</span>
            </div>

            <div v-if="selected_lnpay && selected_lnpay.payerId" style="display:flex"><!-- payer -->
              <span style="min-width:100px;text-align:left">{{ $t("Payer") }}:</span>
              <span style="">{{ selected_lnpay.payerNick }}</span>
            </div>

            <div style="display:flex;justify-content:center">
              <qrcode :value="bolt11" :options="{ size: 200 }"  />
            </div>
            <!-- pay button -->
            <q-btn v-if="show_pay_button()" @click="modalSendPayment.dialog=true" style="margin-top:10px;margin-left:10px" color="primary" icon="mdi-send" >
              <q-tooltip>{{ $t("Pay Lightning Payment") }}</q-tooltip>
            </q-btn>
          </div>
        </q-tab-panel>

        <!--create invoice -->
        <q-tab-panel v-if="!!lightning" name="receive" :key="updateKey">
          <span style="color:var(--light-blue);font-size:1.2em">{{ $t("Invoice") }}</span>
          <div v-if="!!bolt11" style="justify-content:center">
            <div>
              <qrcode :value="bolt11" :options="{ size: 200 }"  />
            </div>
            <div style="display:flex">
              <q-btn v-clipboard:copy="bolt11" flat round color="primary" icon="mdi-content-copy" style="transform:translate(-8px,-3px)" ></q-btn>
              <span class="ellipsis" >{{ bolt11 }}</span>
            </div>
          </div>
          <div v-else>
            <div style="margin-top:10px">
              <span style="color:var(--light-blue)">{{ $t("User email") }} ({{ $t("Optional")}})</span>
            </div>
            <addressEmailFavorite :onlyUsers="true" :noSelf="true" />          
            <q-input v-model="payrequest.description" label="Description" dense style="margin-top:5px" :style="{ backgroundColor: $no_empty(payrequest.description) }" />
            <div style="display:flex;margin-top:5px">
              <satoshisAmount />
            </div>
            <div style="display:flex;margin-top:-5px">
              <span style="color:var(--light-blue);margin-top:10px;margin-right:10px">Expires:</span>
              <q-select v-model="payrequest.expiry_at" :options='expiryOtions' dense style="max-width:100px" />  
            </div>
            <!-- create payrequest button -->
            <q-btn @click="createInvoice()" :disable="false && !payRequestValid()" style="margin-top:10px;margin-left:10px" color="primary" icon="mdi-receipt" ><!-- ??? remove "false &&" -->
              <q-tooltip>Create Lightning Payment Request</q-tooltip>
            </q-btn>
          </div>
        </q-tab-panel>
        
        <!--fund lightning -->
        <q-tab-panel name="fund" :key="updateKey">
          <!-- fund scriptAddressId -->
          <div>
            <!-- inactive -->
            <div v-if="!lightning">
              <span style="color:var(--light-blue);font-size:1.5em">Activate Lightning Payments</span>      
              <!-- address -->
              <div style="margin-top:5px">
                <span class="title3" >{{ $t("Signing Wallet") }} </span>
              </div>
              <div style='display:flex;margin-top:10px;margin-right:5px'>
                <q-btn flat round @click="wallet_dialog=true" style="transform:translate(0px,-5px)" icon="img:statics/img/wallet.svg" class="lightblue">
                  <q-tooltip><span>Associate Wallet</span></q-tooltip>
                </q-btn>
                <span class="title3">{{ !!this.wallet ? wallet.name : $t('Associate Wallet') }}</span>
              </div>
            
              <!-- activate button -->
              <q-btn color="primary" @click="activate" :disable="!wallet" icon="mdi-flash-outline" style="margin-left:10px" >
                {{ $t("Activate") }}
              </q-btn>
            </div>

            <!-- pending initial payment -->
            <div v-else-if="!lightning.pending_funding && !lightning.cancelSignature" >
              <div style="margin-top:5px;margin-bottom:10px">
                <span class="title3" >{{ $t("Fund Lightning Service") }} </span>
              </div>
              <q-btn color="primary" @click="showFundDialog=true" icon="img:statics/img/send.svg" style="margin-left:10px" >&nbsp;
                {{ $t("Fund")}}
              </q-btn>
              <!-- fund scriptAddressId -->
              <div  v-if="!!lightning && !!lightning.scriptAddressId"   style="display:flex">
                <q-btn v-clipboard:copy="lightning.scriptAddressId" flat round color="primary" icon="mdi-content-copy" style="transform:translate(-8px,-3px)" ></q-btn>
                <span class="ellipsis" >{{ lightning.scriptAddressId }}</span>
              </div>
            </div>

            <!-- funding unconfirmed -->
            <div v-else-if="!!lightning.pending_funding && !lightning.user_msat" >
              <span style="color:var(--light-blue);font-size:1.5em">{{ $t("Unconfirmed Funding Payment") }}</span>
            </div>
          </div>

          <!-- cancel ln -->
          <div v-if="!!lightning && !!lightning.user_msats && !lightning.pending_funding && !lightning.cancelSignature" style="border-top: 2px solid black;margin-top:15px">
            <div style="margin-top:5px;margin:15px 0px 10px 0px">
              <span class="title3" >{{ $t("Cancel Lightning Service") }} </span>
            </div>
            <q-btn color="accent" @click="showConfirmLnCancel=true" icon="img:statics/img/send.svg" style="margin-left:10px" >&nbsp;
              {{ $t("Cancel")}}
            </q-btn>
          </div>

          <!-- ln cancelling  -->
          <div v-if="!!lightning && !!lightning.cancelSignature" style="">
            <div style="margin-top:5px;margin:15px 0px 10px 0px">
              <span class="title3" >{{ $t("Lightning Service Cancel in progress") }} </span>
            </div>
          </div>

        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>


  <!------------ right panel ------------>
  <div class="panel" id="right_panel" >
    <lnpays v-if="!!lnpays" :pays="lnpays" @show_lnpay="show_lnpay" />
  </div>

  <!---------------- dialogs -->
  
  <!-- select btc address -->
   <selectWallet v-if="wallet_dialog" :wallets="$signingWallets()" :asDialog="true" @walletSelected="addressSelectedHandler" @close="wallet_dialog=false"/>                      


  <!-- show invoice -->            
  <selectModal :prop="showpayrequestModal" @close="showpayrequestModal.dialog=false" >
    <div  v-if="!!decoded">
      <div style='display: flex'>
        <q-btn round flat @click="$copy2clipboard(bolt11)" color="primary" icon="mdi-content-copy" class="vcenter" />
        <span style="font-size:0.9em" class="ellipsis">{{ bolt11 }}</span>
      </div>
      <div style="display:flex;justify-content:center">
        <qrcode :value="bolt11" :options="{ size: 200 }"  />
      </div>
      <div style="display:flex;margin-top:10px">
        <span style="color:var(--light-blue);min-width:100px;text-align:left">Created:</span>
        <span style="color:var(--light-blue)">{{ decoded.created_at | formatDateTime }}</span>
      </div>
      <div style="display:flex"><!-- expires -->
        <span style="color:var(--light-blue);min-width:100px;text-align:left">Expires:</span>
        <span style="color:var(--light-blue)">{{ (decoded.created_at + decoded.expiry_at) | formatDateTime }}</span>
      </div> 
      <div style="display:flex"><!-- destination -->
        <span style="color:var(--light-blue);min-width:100px;text-align:left">Destination:</span>
        <span style="color:var(--light-blue);font-size:0.8em;margin-top:3px">{{ decoded.destination }}</span>
      </div>
      <div style="display:flex"><!-- destination -->
        <span style="color:var(--light-blue);min-width:100px;text-align:left">Amount:</span>
        <span style="color:var(--light-blue)">{{ decoded.mtokens | formatMsats}}</span>
      </div>
      <div style="display:flex"><!-- description -->
        <span style="color:var(--light-blue);min-width:100px;text-align:left">Description:</span>
        <span style="color:var(--light-blue)">{{ decoded.description }}</span>
      </div>
    </div>
  </selectModal>

  <!-- pay funding tx -->
  <pay :showPayDialog="showFundDialog" @close="showFundDialog=false" @pay="fund_handler" />

   <!-- enter passphrase to send -->
  <dialogg v-if="modalSendPayment.dialog" :prop="modalSendPayment" @selectionDone="lnpay" @close="passphrase=null;modalSendPayment.dialog=false">
    <q-input v-model="passphrase" :label="$t('Wallet Password')" autofocus :append-icon="showpassphrase ? 'mdi-eye-off' : 'mdi-eye'" class="passphrase"
                  :type="showpassphrase ? 'text' : 'password'" @click:append="showpassphrase ^= true" dense style="width:330px">
      <template v-slot:after>
        <q-icon :name="showpassphrase ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showpassphrase ^= true" />
      </template>
    </q-input>
  </dialogg>

  <!-- confirm canceling ln service -->
  <confirm v-if="showConfirmLnCancel" @confirmed="showConfirmLnCancel=false;modalCancel.dialog=true" @close="showConfirmLnCancel=false" title="Confirm Cancel" subtitle="Do you want to cancel Lighting Service" />

  <!-- enter passphrase to cancel -->
  <dialogg v-if="modalCancel.dialog" :prop="modalCancel" @selectionDone="lnCancel" @close="passphrase=null;modalCancel.dialog=false">
    <q-input v-model="passphrase" :label="$t('Wallet Password')" autofocus :append-icon="showpassphrase ? 'mdi-eye-off' : 'mdi-eye'" class="passphrase"
                  :type="showpassphrase ? 'text' : 'password'" @click:append="showpassphrase ^= true" dense style="width:330px">
      <template v-slot:after>
        <q-icon :name="showpassphrase ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showpassphrase ^= true" />
      </template>
    </q-input>
  </dialogg>

</div>
</template>

<script>
import Vue from 'vue'
import gql from 'graphql-tag'
import selectModal from 'src/components/Modal'
import satoshisAmount from "src/components/satoshisAmount"
import lnpays from "src/components/lnPays"
import selectWallet from 'src/components/selectWallet'
import pay from 'src/components/pay'
import { send } from 'src/mixins/send'
import addressEmailFavorite from "src/components/addressEmailFavorite"
import send_btn from 'src/components/send_btn'
import dialogg from 'src/components/dialog' // passphrase
import confirm from 'src/components/confirm'
let bitcoin = require('bitcoinjs-lib')
let bip39 = require('bip39')
let bip32 = require('bip32')

export default {
  data() {
    return {
      msats: 0,
      wallet: null,
      btc_addr: '',
      wallet_dialog: false,
      noEmpty: [ v => !!v || this.$t("Field required") ],
      showpayrequestModal:  { title:'Lightning Payment Request', text:'', buttons:[], dialog:false },
      min_confirmations: 2,
      bolt11: null,
      decoded: null,
      payrequest_template: {
        description: '',
        expiry_at: {label:'1 Week', value:604900}
      },
      payrequest: null,
      expiryOtions: [
        {label:'1 Week', value:604900},
        {label:'5 days', value:432000},
        {label:'3 days', value:259200},
        {label:'1 day', value:86400},
        {label:'10 hours', value:36000},
        {label:'6 hours', value:21600},
        {label:'3 hours', value:10800},
        {label:'1 hour', value:3600},
      ],
      tab: 'pay',
      subscribed: {},
      showFundDialog: false,
      updateKey: 0,
      selected_lnpay: null,
      payer: {
        nick: null,
        payerId: null
      },
      invoiceMsats: 0,
      noEmpty: [ v => !!v || this.$t("Field required") ],
      modalSendPayment: { title:"Sign the transaction", subtitle:"This action will send funds", buttons:this.$store.getters['misc/yes_no_buttons'], dialog:false, width:300 },
      passphrase: '',
      showpassphrase: false,
      modalCancel: { title:"Sign to Cancel", subtitle:"Your balance will be sent to your wallet", buttons:this.$store.getters['misc/yes_no_buttons'], dialog:false, width:300 },
      showConfirmLnCancel: false,
    }
  },
  mixins: [send],
  computed: {
    userId() {
      return this.$store.getters['user/_id']
    },
  },
  components: {
    selectModal,
    satoshisAmount,
    selectWallet,
    lnpays,
    pay,
    addressEmailFavorite,
    send_btn,
    dialogg,
    confirm
  },
  mounted() {
    this.resetpayrequest()
  },
  watch: {
    async bolt11(val) {
      this.decoded = null
      if(!val) {
        this.selected_lnpay = null
        return
      }
      try {
       this.decoded = await this.$apolloClient().query({
        query: gql`query ($bolt11: String!) {
          decode(bolt11: $bolt11) {
            id
            created_at
            expires_at
            mtokens
            destination
            description
            payment
            is_expired
          }
        }`,
        variables: {
          bolt11: this.bolt11
        },
        fetchPolicy: 'network-only',
        skip () {
          return !this.bolt11
        },
      }).then( ( {data} ) => data.decode)
      } catch(e) {
        this.$toastError("Wrong Lightning Payment payrequest")
        console.log("Decode error:", e)
      }
    },
    lightning(val) { this.tab = "fund" ; return
      // initial tab.
      if(!val || !val.user_msats)
        this.tab = "fund"
      else
        this.tab = 'pay'
    }
  },
  methods: {    // pay Handler -----------------------------------------------------------
    async fund_handler(section, item) {// console.log("fund_handler:", item)
      this.showFundDialog = false
      const collection = 'lightning'
      this.$go_to( { name: `${section}-send-pay`, params: { id: item._id, payId: this.lightning._id, collection, btc_addr: this.lightning.scriptAddressId } })
    },
    async activate(btnIndex) {
      if(!this.$checkInput(this.wallet, "please_fill_%", "Wallet")) return
      if(!this.lightning) {
        try {
          this.lightning = await this.$apolloClient().mutate({
            mutation: gql`mutation lnActivate($walletId: ID!) {
              lnActivate(walletId: $walletId) {                
                _id
                inContract
                user_msats
                walletId
                scriptAddressId
              }
            }`,
            variables: {
              walletId: this.wallet._id
            },
          }).then( ( {data} ) => {            
            if(!!data.lnActivate)         
              this.$toast.success("Operation Successful!")
            return data.lnActivate
          })
        } catch(e) {
          console.log("Error:", e)
          this.$toastError("Error activating Lightning Payments:", e)
          return 
        }
      }
    },
    createInvoice() {
      if(!this.$checkInput(this.payrequest.description, "please_fill_%", "Description")) return
      if(!this.$checkInput(this.invoiceMsats, "please_fill_%", "Amount")) return
      const self = this
      this.$apolloClient().mutate({
        mutation: gql`mutation lnCreateInvoice( $description: String!, $msats: GraphQLLong!, $expiry: Int!, $payerNick: String, $payerId: String) {
          lnCreateInvoice(description: $description, msats: $msats, expiry: $expiry, payerNick: $payerNick, payerId: $payerId) {
            _id
            creatorId
            creatorNick
            payerId
            payerNick
            bolt11
            msats
            description
            created
            expiry_at
          }
        }`,
        variables: {
          description: this.payrequest.description,
          msats: this.invoiceMsats,
          expiry: this.payrequest.expiry_at.value,
          payerNick: this.payer.nick,
          payerId: this.payer._id
        },
      }).then( ( {data} ) => {
        this.bolt11 = data.lnCreateInvoice.bolt11
        this.lnpays.unshift(data.lnCreateInvoice)
        this.payrequest = this.$clone(this.payrequest_template)
        this.updateKey++
      }).catch((error) => {
        self.$toast.error(`Error creating Lightning Payment request: ${error.toString()}`)
        console.log("Error creating Lightning Payment request: " + error.toString())
      })
    },
    lnpay() { // pay()
      this.modalSendPayment.dialog = false
      const self = this
      this.$apolloClient().mutate({
        mutation: gql`mutation lnpay($bolt11: String!, $invoiceId: String!, $msats: GraphQLLong!, $description: String!, $destination: String!) {
          lnpay(bolt11: $bolt11, invoiceId: $invoiceId, msats: $msats, description: $description, destination: $destination) {
            _id
            id
            creatorId
            creatorNick
            payerId
            payerNick
            bolt11
            msats
            fee
            description
            created
            expiry_at
            paid
            refundTx
            refundSatoshis
            wallet {
              _id
              path
              created
              mnemonic
            }
          }
        }`,
        variables: {
          bolt11: this.bolt11,
          invoiceId: this.decoded.id,
          msats: parseInt(this.decoded.mtokens),
          description: this.decoded.description,
          destination: this.decoded.destination
        },
        // lnpay
      }).then( ( {data} ) => {
        const lnpay = data.lnpay
        const pos = this.lnpays.findIndex((p, i, arr) => p.id == lnpay.id )
        if(pos == -1) 
          this.lnpays.unshift(lnpay)
        else
          this.lnpays.splice(pos, 1, lnpay)
        this.$toastSuccess("Operation successful")
        if(!data.lnpay.refundTx)
          return
        // sign tx:
        const wallet = lnpay.wallet
        const keyPair = this.$getAddressKeypair(wallet, this.lightning.userAddressIndex, this.passphrase)
        //let seed = bip39.mnemonicToSeedSync(this.$decryptWallet(wallet, this.passphrase), this.passphrase)
        //let root = bip32.fromSeed(seed, this.$bitcoin_network())
        //let keyPair = root.derivePath(wallet.path + "/" + this.lightning.userAddressIndex)
        let psbt = bitcoin.Psbt.fromBase64(data.lnpay.refundTx)
        psbt.signAllInputs(keyPair)
        //this.passphrase = null // bye-bye private keys
        const signature = psbt.toBase64()
        return this.$apolloClient().mutate({
          mutation: gql`mutation lnRefundUserSigned($lnId: ID!, $userSignature: String!) {
            lnRefundUserSigned(lnId: $lnId, userSignature: $userSignature)
          }`,
          variables: {
            lnId: this.lightning._id,
            userSignature: signature,
          },
        })
        // lnRefundUserSigned
      }).then( ( {data} ) => {

      }).catch((error) => {
        self.$toast.error("Error processing ln payment: " + error)
      })
    },
    lnCancel() { // pay()
      this.modalSendPayment.dialog = false
      const self = this
      this.$apolloClient().mutate({
        mutation: gql`mutation lnCancel($lnId: ID!, $addressId: String!) {
          lnCancel(lnId: $lnId, addressId: $addressId) {
            cancelTx
            wallet {
              _id
              path
              created
              mnemonic
            }
          }
        }`,
        variables: {
          lnId: this.lightning._id,
          addressId: "bcrt1q0zsdgxhu2tdqz33ddcn0dcf3tlc2xzratwpm52"
        },
        // lnpay
      }).then( ( {data} ) => {
        const cancelTx = data.lnCancel.cancelTx
        const wallet =  data.lnCancel.wallet
        const keyPair = this.$getAddressKeypair(wallet, this.lightning.userAddressIndex, this.passphrase)
        let psbt = bitcoin.Psbt.fromBase64(cancelTx)
        psbt.signAllInputs(keyPair)
        const signature = psbt.toBase64()
        return this.$apolloClient().mutate({
          mutation: gql`mutation lnCancelSigned($lnId: ID!, $signature: String!) {
            lnCancelSigned(lnId: $lnId, signature: $signature)
          }`,
          variables: {
            lnId: this.lightning._id,
            signature,
          },
        })
        // broadcastTx
      }).then( ( {data} ) => {
        self.modalCancel.dialog = false
        if(!!data.lnCancelSigned) {
          this.$toast.success("Operation Successful!")
          this.lightning.cancelSignature = "Cancel"
        }
      }).catch((error) => {
        self.$toast.error("Error processing ln payment: " + error)
      })
    },
    show_pay_button() {
      //if(!this.selected_lnpay && !this.decoded) return false
      if(!!this.selected_lnpay) {
        if(this.selected_lnpay.paid) return false
        if(this.selected_lnpay.creatorId == this.$userId()) return false
        if(this.lightning.user_msats < this.selected_lnpay.msats) {
          this.$toastError('Insufficient Sending Capacity')
          return false
        }
      }
      if(!!this.decoded && this.lightning.user_msats < this.decoded.mtokens) {
        this.$toastError('Insufficient Sending Capacity')
        return false
      }
      return true
    },
    show_lnpay(lnpay) {
      if(this.lightning.user_msats < lnpay.msats) {
        this.$toastError('Insufficient Sending Capacity')
      }
      this.tab = 'pay'
      this.selected_lnpay = lnpay
      this.bolt11 = lnpay.bolt11
    },
    amount_updated(satoshis, isMili) {
      this.invoiceMsats = !!isMili ? satoshis : satoshis * 1000
    },
    addressSelectedHandler( wallet ) { // called by emit event in selectWalletAddress component
      this.wallet_dialog = false
      this.wallet = wallet
    },
    payRequestValid() {
      if(!this.payrequest.label || !this.payrequest.label.trim().length) return false
      if(!this.payrequest.description || !this.payrequest.description.trim().length) return false
      return true
    },
    confirmations() {
      if(!this.lightning) return 0
      const height = this.lightning.height
      if(!height || !this.lastBlock) return "0"
      return (this.lastBlock.height - height + 1)
    },
    resetpayrequest() {
      this.payrequest = JSON.parse(JSON.stringify(this.payrequest_template))
      this.bolt11 = null
    },
    address_email_to_updated(address_email_to) {
      this.payer.nick = address_email_to.nick
      this.payer._id = address_email_to.userId
    },
    lnpayColor() {
      const lnpay= this.selected_lnpay
      if(!lnpay) return 'white'
      if(lnpay.creatorId == this.$userId()) {
        if(!!lnpay.paid) return '#76FF03'
        else return '#DCEDC8'
      } else if(lnpay.payerId == this.$userId()) {
        if(!!lnpay.paid) return '#F44336'
        else return '#FFCDD2'
      }
    },
    reset() {
      this.bolt11 = null
      this.selected_lnpay = null
    }
  },
  apollo: {
    $client() { return this.$apolloClientName() },
    lightning: {
      query: gql`query {
        lightning {
          _id
          walletId
          inContract
          user_msats
          pending_funding
          userAddressIndex
          scriptAddressId 
          cancelSignature
        }
      }`,
      fetchPolicy: 'network-only',
      subscribeToMore: [
        { // lnFunded
          document: gql`subscription lnFunded($lightningId: ID!) {
            lnFunded(lightningId: $lightningId) {
              _id
              user_msats
              inContract
            }
          }`,
          variables() {
            return {
              lightningId: this.lightning._id
            }
          },
          skip () {
            return !this.lightning
          }, // lnFunded
          updateQuery: function( { lightning }, { subscriptionData } ) {
            const lnFunded = subscriptionData.data.lnFunded
            Vue.set(lightning, 'user_msats', lnFunded.user_msats)
            Vue.set(lightning, 'inContract', lnFunded.inContract)
            Vue.delete(lightning, 'pending_funding')            
            return { lightning }
          }
        }
      ],
      result({ data, loading, networkStatus }) {
        if(!data || !data.lightning) return
        const self = this
        if(!!data.lightning.pending_funding) { 
          this.satoshis = data.lightning.pending_funding / 1000
        }
        if(!!this.subscribed['lightning']) return        
      },
    },
    lnpays: {
      query: gql`query {
          lnpays {
            _id
            id
            creatorId
            creatorNick
            payerId
            payerNick
            bolt11
            msats
            fee
            description
            created
            expiry_at
            paid
          }
      }`,
      fetchPolicy: 'network-only',
      result({ data, loading, networkStatus }) {
        if(!data.lnpays) return
        if(!!this.subscribed['lnpays']) return
        this.subscribed['lnpays'] = true
        this.$apollo.queries.lnpays.subscribeToMore({ // newLnPay
          document: gql`subscription newLnPay($userId: String!) {
            newLnPay(userId: $userId) {
              _id
              id
              creatorId
              creatorNick
              payerId
              payerNick
              bolt11
              msats
              fee
              description           
              created
              expiry_at
              paid
            }
          }`,
          variables: {
            userId: this.userId
          }, // newLnPay
          updateQuery: ( { lnpays }, { subscriptionData }) => { 
            const newLnPay = subscriptionData.data.newLnPay
            const pos = this.lnpays.findIndex((p, i, arr) => p._id == newLnPay._id )
            if(pos == -1) 
              this.lnpays.unshift(newLnPay)
            else
              this.lnpays.splice(pos, 1, newLnPay)
          },
        })
      },
    },
    /*lastBlock: { // lastBlock query
      query: gql`query lastBlock  {
        lastBlock {
          height
          time
        }
      }`,
      fetchPolicy: 'network-only',      
      subscribeToMore: [{ // new Block
        document: gql`subscription newBlock {
          newBlock {
            height
            time
          }
        }`,
        updateQuery: function( { lastBlock }, { subscriptionData })  { console.log("lastblock:", this.lastBlock, lastBlock)
          const newBlock = subscriptionData.data.newBlock
          //console.log("subscripcion lastBlock:", newBlock)
          this.$store.commit("misc/lastBlock", newBlock) // used for smartcontract path timing (to block path in the future)
          this.$toastInfo("New block mined")
          return { lastBlock: newBlock }
        },
      }],
    },*/
  },
  provide: function () {
    return {
      amount_updated: this.amount_updated,
      address_email_to_updated: this.address_email_to_updated,
    }
  },
}
</script>


  OP_IF
      ${bitcoin.script.number.encode(sequence).toString('hex')}
      OP_CHECKSEQUENCEVERIFY
      OP_DROP
  OP_ELSE
      ${_bob.publicKey.toString('hex')}
      OP_CHECKSIGVERIFY
  OP_ENDIF
  ${_alice.publicKey.toString('hex')}
  OP_CHECKSIG

lntb1m1pd2awsppp54q20f42rpuzapqpxl4l5a2vhrm89pth7rj0nv3fyqvkl89hc8myqdqqcqzysms67f23xktazlazsjdwvqv7j59c34q5vqp4gnmddpkmlwqpufecxf9ledyq0ma495wrak26nvq5qcg6lgw7zwfy5yq4w54ux7qay3tsqrg02mh

lntb1500n1pdvp7t9pp5k5mvp8u045pdnumnt89cdc7l90lpvff7sjzkrvawg93ju3mgg3nsdp62fjkzepqg9e8g6trd3jn5gzfyp9kummhyptksmeq2dshgmmndp5jqjtnp5cqzyskw8lzg7w4hcfyhncczcaexlpx3tdefm0vjnh9dkqev23g94tdta8jjqzp87v6r9q8xwe3mnjf0tryaa7zkxxj4gwgfcqea32j0x069qqsjyjhz


graphql playgournd igraphql:

query($bolt11:String!) {
  decode(bolt11:$bolt11) {
    
            created_at
            expiry
            destination
            msatoshi
            description
            payment_hash
  }
}

variables:

{ "bolt11":"lnbcrt10u1ps9es4npp5zqnnu8py7anrn6e02mdhqhrn62wphj6cpzzude2sz0erau4g3yksdqvw3ek2um5yqmqxqyjwhycqp2sp5tmlk3qvsjhdhtcgkkjhetrdpxdskldng8esg7mm9mh5pnj35a3ls9qy9qsqakgx03qyxgvq6x75s7wf0yq4rr7ke5vfw2xphfqljv70pzyxcwr5pr5nu7tc0qq5tyanhzggr6r282cjaqmjcyajuqc6ksyl8wezv2gqyltsqj"}


paid bapp -> exgternal: {
  confirmed_at: '2022-10-07T08:02:31.119Z',
  fee: 0,
  fee_mtokens: '0',
  hops: [
    {
      channel: '8432x1x0',
      channel_capacity: 1000000,
      fee: 0,
      fee_mtokens: '0',
      forward: 10000,
      forward_mtokens: '10000000',
      public_key: '0287a1b7df18b8de50718d9e748409b4af347ed9b02bac4d4f2b56adfa46899586',
      timeout: 8498
    }
  ],
  id: '8299ac5fcc26ec5bb1a1783fff2c6a275e2379b7b627664e7bfc3fec05859db9',
  mtokens: '10000000',
  paths: [
    {
      fee: 0,
      fee_mtokens: '0',
      hops: [Array],
      mtokens: '10000000',
      payment: '39a7e256a6f80937b710a92bbab98aaa762846e74cb6234c1175bc2e5e722761',
      timeout: 8498,
      tokens: 10000,
      total_mtokens: '10000000'
    }
  ],
  secret: '80142c39e06cf7c18c2899dd37c73ccbf35962ec749e88fe3df51bb1e52ba90a',
  safe_fee: 0,
  safe_tokens: 10000,
  timeout: 8498,
  tokens: 10000
}


invoice invoice_updated: {
  chain_address: undefined,
  cltv_delta: 40,
  confirmed_at: '2022-10-07T08:44:35.000Z',
  confirmed_index: 4,
  created_at: '2022-10-07T08:44:01.000Z',
  description: 'test 4',
  description_hash: undefined,
  expires_at: '2022-10-07T11:44:01.000Z',
  features: [
    { bit: 9, is_known: true, is_required: false, type: 'tlv_onion' },
    {
      bit: 14,
      is_known: true,
      is_required: true,
      type: 'payment_identifier'
    },
    {
      bit: 17,
      is_known: true,
      is_required: false,
      type: 'multipath_payments_v0'
    }
  ],
  id: '082bfaf47f966dab54d45eae2c36e9ee06a87e87e7d178e604861abb597e827b',
  index: 21,
  is_canceled: undefined,
  is_confirmed: true,
  is_held: undefined,
  is_private: false,
  is_push: undefined,
  mtokens: '30000',
  payment: '3931a4a04cffa112bfe3ee51be4ee5a80e3ae2aebc097a8fcd7d3379d79cd1ac',
  payments: [
    {
      canceled_at: undefined,
      confirmed_at: '2022-10-07T08:44:35.000Z',
      created_at: '2022-10-07T08:44:35.000Z',
      created_height: 8455,
      in_channel: '8444x1x0',
      is_canceled: false,
      is_confirmed: true,
      is_held: false,
      messages: [],
      mtokens: '30000',
      pending_index: undefined,
      timeout: 8498,
      tokens: 30,
      total_mtokens: '30000'
    }
  ],
  received: 30,
  received_mtokens: '30000',
  request: 'lnbcrt300n1p3nlek3pp5pq4l4arljek6k4x5t6hzcdhfacr2sl58ulgh3esyscdtkkt7sfasdq2w3jhxapqxscqzpgxqr23ssp58yc6fgzvl7s390lraegmunh94q8r4c4whsyh4r7d05ehn4uu6xkq9qyyssqn4czt2hf6ntpzzcnhr223lumj5afl45340cjh35qzc94gwh3magyrvhx4lf3uxg3ac9lah0hs9az6htdzez5mtvrgxwdr8vvzvzp5xcqrk0ukw',
  secret: 'cba9cadb1cb0878b87a964f2b4ff636192ee5cc58598cb65e5eaa425fb23fce8',
  tokens: 30
}


new invoice- 1 1 1 1: {
  chain_address: undefined,
  created_at: '2022-10-07T08:44:01.000Z',
  description: 'test 4',
  id: '082bfaf47f966dab54d45eae2c36e9ee06a87e87e7d178e604861abb597e827b',
  mtokens: '30000',
  payment: '3931a4a04cffa112bfe3ee51be4ee5a80e3ae2aebc097a8fcd7d3379d79cd1ac',
  request: 'lnbcrt300n1p3nlek3pp5pq4l4arljek6k4x5t6hzcdhfacr2sl58ulgh3esyscdtkkt7sfasdq2w3jhxapqxscqzpgxqr23ssp58yc6fgzvl7s390lraegmunh94q8r4c4whsyh4r7d05ehn4uu6xkq9qyyssqn4czt2hf6ntpzzcnhr223lumj5afl45340cjh35qzc94gwh3magyrvhx4lf3uxg3ac9lah0hs9az6htdzez5mtvrgxwdr8vvzvzp5xcqrk0ukw',
  secret: 'cba9cadb1cb0878b87a964f2b4ff636192ee5cc58598cb65e5eaa425fb23fce8',
  tokens: 30
}


