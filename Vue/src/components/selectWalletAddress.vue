<template>
  <div class="dialog" style="display:block" ><!-- remove this display: dialgo -->
    <div class="dialog-content" style="min-width:500px" >
      <div style="padding:10px;min-width:450px" > <!-- select wallet header -->
        <div v-if="step == 'showWallets'" style="margin-bottom:10px">
          <q-icon style="margin-right:5px;margin-top:-5px" name="img:statics/img/wallet.svg" size="sm" />
          <span class="title2">{{ $t("Select Wallet") }}</span>
        </div>
        <div v-else> <!-- select address header -->
          <div style="amrgin-bottom:10px">
            <q-icon style="margin-right:5px" name="img:statics/img/wallet.svg" color="primary" size="sm" />
            <span class="text">{{ wallet.name }}</span>
          </div>
          <div style="margin-top:10px">
            <q-icon style="margin-right:5px" name="mdi-qrcode" color="primary" size="sm" />
            <span class="text">{{ $t("Select Address") }}</span>
          </div>
        </div>
        <!-- wallets / addresses -->
        <div>
          <selectWallet v-if="step == 'showWallets'" :wallets="wallets" :asDialog="false" @walletSelected="walletSelectedHandler" />
          <selectAddress v-else :wallet="wallet" @addressSelected="addressSelectedHandler" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import selectWallet from './selectWallet'
import selectAddress from './selectAddress'
import buttonn from './button'
import gql from 'graphql-tag'

  export default {
    name: "selectWalletAddress",
    data () {
      return {
        wallet: 0,
        addressId: 0,
        step: 'showWallets',
      }
    },
    components: {
      selectWallet,
      selectAddress,
      buttonn
    },
    props: {
      dialog: String,
    },
    beforeMount() {
      const self = this
      this.onEsc = function() {
        self.close()
      }
      this.$root.$on('esc', this.onEsc)
    },
    beforeDestroy() {
      this.$root.$off('esc', this.onEsc)
    },
    mounted() {
    },
    methods: {
      walletSelectedHandler(wallet) {
        this.wallet = wallet
        if(wallet.addresses.length == 1) { // only address
          this.step = 'showWallets';
          this.$emit('addressSelected', [wallet, wallet.addresses[0]]) // sends addressId to where component is used.
          return
        }
        this.step = 'showAddresses';
      },
      addressSelectedHandler(address) {
        this.step = 'showWallets';
        this.$emit('addressSelected', [this.wallet, address]) // sends addressId to where component is used.
      },
      close() {
        this.step = 'showWallets';
        this.$emit('close'); // has to emit to modify 'dialog'  where component is used. Pain in the ass
      },
    },
    apollo: {
      $client() { return this.$apolloClientName() },
      wallets: { 
        query: gql`query {
          wallets {
            _id
            name
            balance
            path
            addresses { 
              _id
              name
              balance
            }
          }
        }`,
      },
    },
  }
</script>
