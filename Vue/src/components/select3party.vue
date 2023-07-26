<template >
  <div style="margin-top10px">
    
    <span v-if="!hideOptions" class="title2" >{{ $t("Select Third Party Service Provider") }}:</span> 
    <q-select v-if="!hideOptions" v-model="countries" :options='$countries' :label="$t('Select one or more countries')" 
              dense multiple :hint="$t('Region Coverage')" style="margin-bottom:20px" />

    <q-select v-if="!hideOptions" v-model="languages" :options='$languages' :label="$t('Select one or more Languages')" 
              dense multiple :hint="$t('Languages Spoken')" />

    <div style="margin-top:15px">
      <span v-if="!hideOptions" class="title2">{{ $t("Third Party Service Providers Results") }}:</span>
      <span v-else class="title2">{{ $t("Third Party Service Provider") }}:</span>
      <div v-for="tp in thirdparties" :key="tp._id" class="thirdparty click" >
        <span @click="$emit('selected', tp)">{{ tp.companyName }}</span>
        <img src="statics/img/thirdparty.svg" width="25" height="25" @click="thirdparty = tp" style="justify-self;margin-left:10px" />
      </div>
    </div>

    <show3party :thirdparty="thirdparty" />


  </div>
</template>

<script>
import gql from 'graphql-tag'
import show3party from 'src/components/show3party'

export default {
  name: 'select3party',

  data () {
    return {
      countries: [{label: "Andorra", value: "AD"}],
      languages: [{ value:  'ar', label:  'Arabic' }],
      thirdparty: null,
    }
  },
  props: {
    hideOptions: Boolean,
  },
  components: {
    show3party,
  },
  beforeMount() {
    const self = this
    this.onEsc = function() { console.log("select3party close:", !!self.thirdparty)
      if(!!self.thirdparty) 
        self.thirdparty = null
      else
        self.$emit('close')
    }
    this.$root.$on('esc', this.onEsc)
  },
  beforeDestroy() {
    this.$root.$off('esc', this.onEsc)
  },
  mounted() {
  },
  watch: {
    thirdparty(val) {
      if(!!val)
        this.$root.$emit("doNotClose")
      else
        this.$root.$emit('canClose')
    },
  },
  methods: {
  },
  apollo: {
    $client() { return this.$apolloClientName() },
    thirdparties: {
      query: gql`query ($languages: [String!]!) {
        thirdparties(languages: $languages) {
          _id
          name
          web
          logoUrl
          address
          email
          phone
          coordiantes
          languages
          created
        }
      }`,
      variables() {
        return {
          languages: this.languages.map(l => l.value)
        }
      },
      fetchPolicy: 'network-only',
    },
  },
}
</script>

<style scoped>

.thirdparty {
  display:grid;
  grid-template-columns:1fr 25px;
  margin-top:5px;
  border-bottom:1px solid gray;
  padding:10px
}

.row {
  display:grid;
  grid-template-columns: 180px 1fr;
  margin-top:5px;
}


</style>
