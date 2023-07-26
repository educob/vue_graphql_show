import { script } from "bitcoinjs-lib"

export const send = {
  data() {
    return {
      updateKey: 0, // refreshes components
      utxos: [],
      dialog: false,
      passphrase: '',
      tx: null,
      txb: null,
      new_tx: null,
      sendingamount: 0,
      totalSelected: 0,
      change_dialog: false,
      change_address: '', // should be by default 1st address used
      concept: '',
      icon: '',
      fixed_recipients: null,
      total_fee: 0,
      fees_per_byte: 0,
      manual_total_fee: false,
      tx_bytes: 0,
      is_use_total_balance_active: false,
      recipients: [],
      wallet: null, // apollo subscription
      change: null,
      showCreatePayment: false,
      donation: 0,
      module: '',
      //processing: false,
      selected_utxos_count: 0,
      manual_utxo_selection: false,
    }
  },
  computed: {
    recipientsFormValid() {
      return this.recipients.every(rec => { console.log("recipientsFormValid rec:", rec)
        if(!rec.address) return false
        if(!rec.satoshis) return false
        return true
      })
    }
  },
  mounted() {
  },
  methods: {
    // calculates: selected utxos, total_fee (tx_bytes)
    update_selected_utxos() {// console.log("B B B B B B B B update selected utxos this.sendingamount:", this.sendingamount) // Selected Utxos
      const scriptType = this.getScriptType()
      let outputsType
      const changeAddress = this.getTempChangeAddress()
      this.change = false
      this.totalSelected = 0      
      // Use Total Balance
      if(!!this.is_use_total_balance_active) { console.log("USE TOTAL BALANCE") // all utxos selected
        this.switch_all_utxos(true)
        this.totalSelected = this.balance()
        outputsType = this.$getOutputsType(this.recipients.map(r => r.address), this.$bitcoin_network())
        this.tx_bytes = this.getTxBytes(scriptType, outputsType)
        if(!this.manual_total_fee) {// console.log("not manual fee selection")
          this.total_fee = this.tx_bytes * this.fees_per_byte
          //console.log("tx_bytes:", this.tx_bytes, "this.total_fee:", this.total_fee)
          //console.log("this.selected_utxos_count:", this.selected_utxos_count)
        }

      } else { //if(!this.manual_utxo_selection) { console.log("AUTOMATIC calculating utxos....") // automatic selection
        console.log("AUTOMATIC utxo selection")
        this.tx_bytes = 0
        if(!this.manual_utxo_selection)
          this.switch_all_utxos(false)
        //if(!this.manual_total_fee)
        //  this.total_fee = 0
        if(!this.sendingamount) return
        //console.log("this.sendingamount:", this.sendingamount, "utxos:", this.utxos, "this.manual_total_fee:", this.manual_total_fee)
        this.selected_utxos_count = 0
        outputsType = this.$getOutputsType(this.recipients.map(r => r.address), this.$bitcoin_network())
        if(this.module == 'wallet') { // WALLET
          this.utxos.every(address => {
            address.every(utxo => {
              if(!!this.manual_utxo_selection && !utxo.selected) return true
              this.process_utxo(utxo, scriptType, outputsType)
              return !!this.manual_utxo_selection || this.totalSelected < this.sendingamount + this.total_fee
            })
            return !!this.manual_utxo_selection || this.totalSelected < this.sendingamount + this.total_fee
          })
        } else { // Multisig - Inheritance
          this.utxos.every(utxo => {
            if(!!this.manual_utxo_selection && !utxo.selected) return true
            this.process_utxo(utxo, scriptType, outputsType)
            return !!this.manual_utxo_selection || this.totalSelected < this.sendingamount + this.total_fee
          })
        }
        // change
        if(this.totalSelected > this.sendingamount + this.total_fee) {
          const addresses = this.recipients.map(r => r.address)
          addresses.push(changeAddress)
          outputsType = this.$getOutputsType(addresses, this.$bitcoin_network())
          const temp_bytes = this.getTxBytes(scriptType, outputsType)
          if(!!this.manual_total_fee) {
            this.change = true
          } else {
            const temp_fee = temp_bytes * this.fees_per_byte
            if(this.totalSelected > this.sendingamount + temp_fee ) { // there is change
              //recipients.push( { address: null, value: sats2Spend - satoshis - temp_fee } )
              this.total_fee = temp_fee
              this.tx_bytes = temp_bytes
              this.change = true
            }
          }
        }
      }
      //console.log("this.change set:", this.change)
      console.log("getTxBytes", this.tx_bytes, this.change)
      return this.total_fee
    },
    process_utxo(utxo, scriptType, outputsType) {
      utxo.selected = true
      this.selected_utxos_count++
      this.totalSelected += utxo.value
      if(this.totalSelected >= this.sendingamount) {
        this.tx_bytes = this.getTxBytes(scriptType, outputsType)
        if(!this.manual_total_fee)
          this.total_fee = this.tx_bytes * this.fees_per_byte
      }
    },
    getTxBytes(scriptType, outputsType) {
      const inputsType = {}
      inputsType[scriptType] = this.selected_utxos_count
      return this.$getTxBytes(inputsType, outputsType)
    },
    getScriptType() {
      if(this.module == 'wallet') // WALLET
        return this.$getWalletInputType(this.wallet.path)
      if(this.module == 'multisig')
        return `MULTISIG-P2WSH:${this.multisig.M}-${this.multisig.N}`
      // SCRIPTs  
      if(this.module == 'inheritance') {
        const pathBytes = this.$pathBytes(this.pay_path)
        return `SCRIPT:${this.inheritance.scriptBytes}-${pathBytes}`
      }
      // Smart Contract  
      if(this.module == 'smartcontract') {
        const pathBytes = this.$pathBytes(this.pay_path)
        return `SCRIPT:${this.smartcontract.scriptBytes}-${pathBytes}`
      }
    },
    getTempChangeAddress() {
      if(!!this.change_address)
        return this.change_address
      if(this.module == 'wallet') // WALLET
        return this.wallet.addresses[0]._id
      if(this.module == 'multisig')
        return this.multisig.scriptAddressId
      if(this.module == 'inheritance')
        return this.inheritance.scriptAddressId
       if(this.module == 'smartcontract')
        return this.smartcontract.scriptAddressId
    },
    toggle_utxo(utxo) { 
      //automatic
      if(!this.manual_utxo_selection) { 
        this.$toastError("Manual utxo selection is disabled", {
          position: 'top-left',
          icon: 'error',
          duration: 5000
        })
        return
      }
      // manual utxo selection
      utxo.selected = !utxo.selected
      this.update_selected_utxos()
      if(this.totalSelected >= this.sendingamount + this.total_fee) 
        this.$toastInfo("Enough deposits selected")
    },
    set_recipients(recipients, donation, sendingamount) {// console.log("set_recipientsssss:", recipients)
      this.recipients = recipients
      this.donation = donation
      this.sendingamount = sendingamount
      if(!this.recipientsFormValid) return
      this.update_selected_utxos()
    },
    recipients_addrs() {
      throw "Don't call me in send.js"
    },
    balance() {
      throw "Don't call me in send.js"
    },
    sendingamountformatted() {
      return this.$options.filters.formatSatoshis(this.sendingamount)
    },
    totalSelectedformatted() {
      return this.$options.filters.formatSatoshis(this.totalSelected)
    },
    send_valid() {// console.log("this.module:", this.module)
      if(!this.recipientsFormValid) {
        this.$toastError('Check your recipients')
        return false
      }
      if(!this.concept) {
        this.$toastError('Please enter a concept')
        return false
      }
      if(this.module == 'recurringpay') return true
      if(this.total_fee < 1000) {
        //this.$toastError('Minimum fee is 1000 satoshis')
        this.total_fee = 1000
      }
      let balance
      if(this.wallet) balance = this.wallet.balance
      else if(this.multisig ) balance = this.multisig.address.balance
      else if(this.smartcontract ) balance = this.smartcontract.address.balance
      else if(this.inheritance ) balance = this.inheritance.address.balance
      else console.log("ERROR no scriptObject")
      //console.log("this.totalSelected:", this.totalSelected, "balance:", balance, "this.sendingamount:", this.sendingamount, "this.total_fee:", this.total_fee )
      if(this.sendingamount > balance ||
              this.totalSelected < this.sendingamount + this.total_fee) {
        this.$toastError('Not enough funds')
        return false
      }
      return true
    },
    switch_all_utxos(selected) {
      this.selected_utxos_count = 0
      if(this.module == 'wallet') {
        this.utxos.forEach( address => {
          address.forEach( utxo => {
            utxo.selected = selected
            this.selected_utxos_count++
          })
        })
      } else {
        this.utxos.forEach( utxo => {
          utxo.selected = selected
          this.selected_utxos_count++
        })
      }
    },
    set_use_total_balance(is_use_total_balance_active) {
      this.is_use_total_balance_active = is_use_total_balance_active
    },
    async toggle_manual_utxo_selection() {
      this.manual_utxo_selection = !this.manual_utxo_selection
      this.switch_all_utxos(false)
      this.update_selected_utxos() 
    },
    feesHandler(total_fee, fees_per_byte, manual_total_fee) { //console.log("feesHandler:", total_fee, typeof total_fee, "fees_per_byte:", fees_per_byte, "manual:", manual_total_fee)
      this.total_fee = total_fee
      this.fees_per_byte = fees_per_byte
      this.manual_total_fee = manual_total_fee
      if(!this.recipientsFormValid) return
      this.update_selected_utxos()
      //this.updateKey++
    },
    resetSendForm() {
      this.updateKey += 1
      this.concept = ''
      this.sendingamount = 0
      this.totalSelected = 0
      this.tx_bytes = 0
      this.showCreatePayment = false
      this.donation = 0
      this.concept = null
      this.passphrase = null
      this.icon = '0.svg',
      this.fixed_recipients = []
    },
    toggleCreatePayment() {
      this.showCreatePayment ^= true
      if(!this.showCreatePayment) { // hidden
        this.resetSendForm()
      }
    },
    set_icon(icon) {
      this.icon = icon
    },
  }
}

