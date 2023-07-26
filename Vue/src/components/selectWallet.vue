<template>
  <div class="wallets">
    <!-- asDialog open a dialog -->
    <div v-if="asDialog" class="dialog" style="display:block;z-index:2">
    <div  class="dialog-content" >
      <div><!-- header -->
        <div style="margin-bottom:10px">
          <q-icon style="margin-right:5px;margin-top:-5px" name="img:statics/img/wallet.svg" />
          <span style="color:gray">{{ $t("Select Wallet") }}</span>
        </div>
        <!-- wallets list -->
        <div v-for="wallet in wallets" :key="wallet._id" @click="walletSelected(wallet)" class="card wallet click">
          <span>{{ wallet.name }}</span>
          <div class="rows">
            <span class="balance1" >{{ wallet.balance  | formatSatoshis }}</span>
            <span class="balance1" >{{ wallet.balance  | formatFiat($fiat()) }}</span>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- no dialog insert as component -->
    <div v-else v-for="wallet in wallets" :key="wallet._id" @click="walletSelected(wallet)" class="card wallet click" >
      <span class="vcenter" style="margin-left:5px">{{ wallet.name }}</span>
      <div class="rows">
        <span class="balance1">{{ wallet.balance  | formatSatoshis }}</span>
        <span class="balance1">{{ wallet.balance  | formatFiat($fiat()) }}</span>
      </div>
    </div>

  </div>
</template>

<script>
  export default {
    data () {
      return {
      }
    },
    props: {
      dialog: Boolean,
      wallets: Array,
      asDialog: Boolean,
    },
    computed: {
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
      walletSelected(wallet) {
        this.$emit('walletSelected', wallet) // sends addressId to where component is used.
      },
    },
  }
</script>
