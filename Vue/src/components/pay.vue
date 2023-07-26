<template>
    <!-- pay dialog  -->
    <div v-if="!!showPayDialog" class="dialog" style="z-index:10;display:block" >
      <div class="dialog-content no-select highlight" style="min-width:350px">
        <div>
          <span class="title">{{ $t("Pay from") }}:</span>
        </div>
        <div v-for="(section, s) in list" :key="section.title" class="card section" >
          <div  @click="toggle_entry(s)" class="click" style="display:flex">
            <img :src="section.icon" style="margin-top:5px;margin-left:5px" width="35" height="35" />
            <span class="title2" style="margin-top:13px">{{ $t(section.title) }}</span>
            <q-space />
            <span class="big_text" style="font-size:20px;margin-top:10px;color:purple">{{ section.items.length }}</span>
          </div>
          <div style="height:10px"></div>
          <div v-for="item in section.items" :key="item._id" @click="pay(section, item)" :style="{ display: section.expand }" >
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
    </div>

</template>

<script>
import Vue from 'vue'
import gql from 'graphql-tag'

  export default {
    name: "pay",
    data () {
      return {
        list: null,
        showing_at_least_one: false,
      }
    },
    props: {
      showPayDialog: Boolean,
      payType: String,
      payId: String,
    },
    mounted() {
      this.show_sections()
    },
    watch: {
      showPayDialog(val) {
        if(!!val) this.create_list()
      }
    },
    components: {
    },
    computed: {
      wallets() {
        let wallets = this.$store.getters['user/wallets']
        wallets = wallets.filter(w => !w.isCold)
        return wallets.filter(w => !!w.balance)
      },
      inheritances() {
        const inheritances = this.$store.getters['user/inheritances']
        return inheritances.filter(inh => !!inh.address && !!inh.address.balance)
      },
      multisigs() {
        const multisigs = this.$store.getters['user/multisigs']
        return multisigs.filter(ms => !!ms.address && !!ms.address.balance)
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
      create_list() {// console.log("calculating list")
        this.showing_at_least_one = false
        this.list = []
        if(!!this.wallets.length) this.list.push( { name:"wallets", icon:"statics/img/wallet.svg", title: "Wallets", items: this.wallets, expand:  this.expand_section('wallets') } )
        if(!!this.multisigs.length) this.list.push( { name:"multisigs", icon:"statics/img/multisig.svg", title: "Joint Wallets", items: this.multisigs, expand:  this.expand_section('multisigs') } )
        if(!!this.inheritances.length) this.list.push( { name:"inheritances", icon:"statics/img/inheritance.svg", title: "Inheritances", items: this.inheritances, expand:  this.expand_section('inheritances') } )
        //if(!!this.smartcontracts.length) this.list.push( { name:"smartcontracts", icon:"statics/img/smartcontract3.svg", title: "Condition Payments", items: this.smartcontracts, expand:  this.expand_section('smartcontracts') } )
        if(!this.list.length) {
          this.$toastInfo("You have no funds")
          this.$emit('close')
          return
        }
        if(!this.showing_at_least_one) 
          this.list[0].expand = ' block'
      },
      toggle_entry(s) {
        this.list[s].expand = this.list[s].expand == 'block'  ? 'none' : 'block' 
        //this.$set(section , 'expand', section.expand == 'block'  ? 'none' : 'block' )
      },
      balance(item) { 
        if(!!item.balance) return item.balance
        return item.address.balance
      },
      expand_section(name) {
        if(!!this.$route.name.includes(name)) {
          this.showing_at_least_one = true
          return 'block'
        }
        return 'none'
      },
      async pay(section, item) { //console.log("pay component. section:", section, "item:", item)
        /*const data = await this.data_loaders[section.name](item)
        console.log("data:", data) */
        this.$emit('pay', section.name, item)

       // this.$go_to( { name: `${section.name}-send`, params: { id: item._id} } )
        //this.$emit('pay', section.name, item)
      },         
    },
  }
</script>
