<template>    
  <dialogg :prop="modal" @selectionDone="selectionDone" @close="$emit('close')" > 
  </dialogg>
</template>

<script>
import dialogg from './dialog'  

export default {
  name: "confirm",
  data () {
    return { 
      modal: { title:"", text:"", buttons: this.$store.getters['misc/yes_no_buttons'], dialog: false, width: 400 },
    }
  },
  props: {
    title: String,
    subtitle: String,
  },
  components: {
    dialogg,
  },
  mounted() { //console.log("title:", this.title)
    this.modal.title = this.title
    this.modal.subtitle = this.subtitle
  },
  methods: {
    selectionDone(btcIdx) {
      if(btcIdx == 1) this.$emit("close")
      else this.$emit("confirmed")
    }
  },
}
</script>

<style scoped>


</style>
