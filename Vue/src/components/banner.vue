<template>
  <div v-if="!!ready && balance < 5000000" id="banner">
        <span class="title2" style="margin-bottom:10px">{{ $t("Wanna get a free After Message?") }}</span>
        <span>{{ $t("Get a free After Message by placing 5 cents in your wallet") }}</span>
        <span>{{ $t("For a limited time only") }}</span>

    <img src="statics/img/close_red.svg" width="25" height="25" @click="ready=false" class="click" style="position:absolute;top:70px;right:15px;filter:none" />
  </div>
</template>


<script>

export default {data() {
    return {
      ready: false
    }
  },
  computed: {
    balance() {
      const wallets = this.$wallets(true)
      let balance = 0
      wallets.forEach(w => balance += w.balance + w.unconfirmedBalance)
      return balance
    }
  },
  mounted() { return
    const self = this
    setTimeout(function() { 
      if(!self.$isTestnet())
        self.ready = true
     }, 500);
  },
  methods: {
  }
}

</script>