<template>
  <q-layout>

  </q-layout>
    
</template>

<style>

</style>

<script>

export default {
  name: 'RootLayout',
  data () {
    return {
    }
  },
  components: {
  },
  computed: {
  },
  watch: {
  },
  mounted() {  
    const href = window.location.href
    if(href.includes('localhost')) {
      this.$go_to('/bitpass') ; 
      return
    }
    if(!href)
      this.$go_to('/home')
    else {
      if(!!href.includes('bapp.plus'))
        this.$go_to('/home')
      // else if(!!href.includes('bitpass.plus'))
      else  this.$go_to('/bitpass')
    }
  },
  methods: {
  },
  
  provide: function () {
    return {
    }
  },
}
</script>
