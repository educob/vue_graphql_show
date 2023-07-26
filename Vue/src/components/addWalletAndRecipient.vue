<template>
  <div class="dialog" style="z-index:10;display:block" >
    <div class="dialog-content no-select highlight" style="min-width:350px">
      <div>
        <span class="title1" style="margin-left:0px">{{ $t(scriptName) }}</span>
      </div>

      <!-- select wallet -->
      <div style="margin-top:10px">
        <span v-if="!selectedWallet" class="title3">{{ $t("Choose a Signing Wallet") }} </span>
        <span v-else class="title3">{{ $t("Signing Wallet") }}:</span>
        <div v-if="selectedWallet" style="margin-left:10px">
          <img src="statics/img/close.svg" @click="selectedWallet=null;showSelectWallet=true;idemRecipient=true;selectedRecipient=null;inputRecipientAddress=null" 
                              style="transform:translate(0px, 5px);margin-right:10px" class="red" width="20" height="20"/>
          <span>{{ selectedWallet.name }}</span>
           </div>
      </div>


      <selectWallet v-if="showSelectWallet" :wallets="hdWallets" :asDialog="false" @walletSelected="walletSelected" @close="showSelectWallet=false"/> 

      <div>

        <div v-if="selectedWallet" style="margin-top:15px">
          <span class="title3">{{ $t("Recipient Address") }}:</span>
        </div>
        <div v-if="selectedWallet" style='display:flex'> 
            <q-checkbox color="success" v-model="idemRecipient" hide-details style="transform:translate(0px,0px)" />
            <span>{{ $t("Same as above") }}</span>
        </div> 
      </div>

      
      <!-- recipient dialog  -->
      <div v-if="!idemRecipient">

        <!-- recipient address input -->
        <div v-if="!selectedRecipient">
          <span v-if="!inputRecipientAddress">- {{ $t("Enter Recipient Address")}}</span>
          <q-input dense v-model="inputRecipientAddress" :label="$t('Recipient Address')" autofocus />
        </div>

        <div v-if="!inputRecipientAddress && !selectedRecipient" style="margin-top:15px">
          <span >- {{ $t("Select from your plans")}}</span>
        </div>
        <!-- recipient item.name -->
        <div v-if="selectedRecipient" style="margin-left:10px">
          <img src="statics/img/close.svg" @click="selectedRecipient=null" style="transform:translate(0px, 5px);margin-right:10px" class="red" width="20" height="20"/>
          <span>{{ selectedRecipient.name }}</span>
        </div>
        <div v-if="!selectedRecipient && !inputRecipientAddress" v-for="(section, s) in recipient_list" :key="section.title" style="margin-top:10px" class="card section" >
          <div  @click="toggle_entry(s)" class="click" style="display:flex">
            <img :src="section.icon" style="margin-top:5px;margin-left:5px" width="35" height="35" />
            <span class="title2" style="margin-top:13px">{{ $t(section.title) }}</span>
            <q-space />
            <span class="big_text" style="font-size:20px;margin-top:10px;color:purple">{{ section.items.length }}</span>
          </div>
          <div style="height:10px"></div>
          <div v-for="item in section.items" :key="item._id" @click="selectedRecipientHandler(section, item)" :style="{ display: section.expand }" >
            <div class="wallet box main-bg-color">
              <span class="title2" style="margin-top:13px">{{ item.name }}</span>
              <div class="rows">
                <span class="balance1">{{ balance(item) | formatSatoshis }}</span>
                <span class="balance1">{{ balance(item) | formatFiat($fiat()) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- buttons -->
      <div v-if="show_buttons()" style="display:flex">
        <div class="button" v-for="(btn, i) in buttons" :key="i" :color="btn.color" :class="`modal_btn_${i}`" :tabindex="i+10"
                  @click="walletAndRecipientSelected(i)"  style="margin-top:15px;margin-left:10px"  @keyup.enter="walletAndRecipientSelected(i)">
          <img :src="`statics/img/${btn.icon}`" width="25" height="25" />
          <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t(btn.text) }}</span>
        </div>
      </div>

    </div>
  </div>
                    


</template>

<script>
import selectWallet from 'src/components/selectWallet'

  export default {
    name: "addWalletAndRecipient",
    data () {
      return {
        recipient_list: null,
        showing_at_least_one: false,
        showSelectWallet: true,
        showRecipientList: false,
        selectedWallet: null,
        selectedRecipient: null,
        idemRecipient: true, // checkbox: same recipient as above
        buttons: this.$store.getters['misc/send_cancel_buttons'],
        isRecipientWallet: false,
        inputRecipientAddress: null,
      }
    },
    props: {
      scriptName: String
    },
    mounted() { 
    },
    watch: {
      idemRecipient(val) {
        if(!val) this.create_recipient_list()
        this.selectedRecipient = null
        this.inputRecipientAddress = null
      },
      inputRecipientAddress(addr) {
        if(!addr) return
        if(!this.$isAddress(addr, this.$bitcoin_network()))
          this.$toastError("Input is not a valid address")
      },
    },
    components: {
      selectWallet,
    },
    computed: {
      hdWallets() {
        return this.$wallets().filter( w => !w.isLegacy)
      },
      wallets() {
        return this.$wallets().filter(w => w._id != this.selectedWallet._id)
      },
      inheritances() {
        return this.$inheritances().filter( w => !!w.scriptAddressId)
      },
      multisigs() {
        return this.$multisigs().filter( w => !!w.scriptAddressId)
      },
      timetrusts() {
        return this.$timetrusts().filter( w => !!w.scriptAddressId)
      },
    },
    beforeMount() {
      const self = this
      this.onEsc = function() {
          self.$emit('close')
      }
      this.$root.$on('esc', this.onEsc)
    },
    beforeDestroy() {
      this.$root.$off('esc', this.onEsc)
    },
    mounted() {
    },
    methods: {
      show_buttons() {
        if(!this.selectedWallet) return false
        if(!this.idemRecipient) {
          if(!this.selectedRecipient && !this.inputRecipientAddress) return false
        }
        return true
      },
      create_recipient_list() {// console.log("calculating recipient_list")
        this.showing_at_least_one = false
        this.recipient_list = []
        if(!!this.wallets.length) this.recipient_list.push( { name:"wallets", icon:"statics/img/wallet.svg", title: "Wallets", items: this.wallets, expand:  this.expand_section('wallets') } )
        if(!!this.multisigs.length) this.recipient_list.push( { name:"multisigs", icon:"statics/img/multisig.svg", title: "Joint Wallets", items: this.multisigs, expand:  this.expand_section('multisigs') } )
        if(!!this.inheritances.length) this.recipient_list.push( { name:"inheritances", icon:"statics/img/inheritance.svg", title: "Inheritances", items: this.inheritances, expand:  this.expand_section('inheritances') } )
        if(!!this.timetrusts.length) this.recipient_list.push( { name:"timetrusts", icon:"statics/img/timetrust.svg", title: "Time Trusts", items: this.timetrusts, expand:  this.expand_section('timetrusts') } )       
        if(!this.showing_at_least_one) 
          this.recipient_list[0].expand = ' block'
      },
      toggle_entry(s) {
        this.recipient_list[s].expand = this.recipient_list[s].expand == 'block'  ? 'none' : 'block' 
        //this.$set(section , 'expand', section.expand == 'block'  ? 'none' : 'block' )
      },
      balance(item) {
        if(!!item.hasOwnProperty('balance')) return item.balance
        return item.address.balance
      },
      expand_section(name) {
        if(!!this.$route.name.includes(name)) {
          this.showing_at_least_one = true
          return 'block'
        }
        return 'none'
      },
      async walletSelected(wallet) { console.log("walletSelected:", wallet)
        this.selectedWallet = wallet
        this.showSelectWallet = false

       // this.$go_to( { name: `${section.name}-send`, params: { id: item._id} } )
        //this.$emit('pay', section.name, item)
      },
      selectedRecipientHandler(type, recipient) { console.log("type:", type.name)
        this.isRecipientWallet = type.name == "wallets"
        this.selectedRecipient = recipient
      },
      async walletAndRecipientSelected(btcIdx) { console.log("walletAndRecipientSelected selectedRecipient:", this.selectedRecipient)
        if(btcIdx == 1) { // cancel
          this.selectedWallet = null
          this.idemRecipient = true
          this.selectedRecipient = null
          this.inputRecipientAddress = null
          this.$emit('close')
          return
        }
        let recipientAddressId = ""
        if(!this.idemRecipient) { // not same as above
          if(!!this.inputRecipientAddress) 
            recipientAddressId = this.inputRecipientAddress
          else {
            if(!!this.isRecipientWallet) {
              const recipientAddress = await this.$newAddress(this.selectedRecipient._id, this.scriptName)
              recipientAddressId = recipientAddress._id
            } else 
              recipientAddressId = this.selectedRecipient.scriptAddressId
          }
        }
        this.$emit('walletAndRecipientSelected', this.selectedWallet._id, recipientAddressId)
      },    
    },
  }
</script>
