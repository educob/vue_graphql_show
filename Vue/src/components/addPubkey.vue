<template>
  <div class="dialog" style="display: block;z-index:10">
    <div class="dialog-content" style="min-width:350px" >
      <!-- header -->
        <div style="margin-bottom:20px;display:flex">
          <img src="statics/img/wallet.svg" width="35" height="35" style="margin-right:10px;margin-top:-5px" class="lightblue" />
          <span class="title" >{{ $t("Select Wallet") }}</span>
        </div>
        <!-- wallets list -->
        <div v-for="wallet in wallets" :key="wallet._id" @click="walletSelected(wallet)" class="card wallet click">
          <span class="vcenter" style="margin-left:10px">{{ wallet.name }}</span>
          <div class="rows">
            <span class="balance1" >{{ wallet.balance  | formatSatoshis }}</span>
            <span class="balance1" >{{ wallet.balance  | formatFiat($fiat()) }}</span>
          </div>
        </div>
    </div>
  </div>
</template>

<script>
import gql from 'graphql-tag'

  export default {
    name: "addPubkey",
    data () {
      return {
        wallet: 0,
        addressId: 0,
      }
    },
    props: {
      dialog: String,
      scriptName: String
    },
    components: {
      //buttonn,
    },
    computed: {
      wallets() {
        let wallets = this.$store.getters['user/wallets']
        wallets = wallets.filter(w => !w.isCold)
        return wallets
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
      async walletSelected(wallet) {// console.log("wallet:", wallet) ??? cambiar
        let address = await this.$newAddress(wallet._id, this.scriptName)
        //console.log("walletSelected address:", address)
        this.$emit('walletSelected', address, wallet)
      },
    },
  }
</script>
