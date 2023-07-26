<template>
  <div class="badge" >    
    <div :class="b_class"  >
      <span >{{ text }}</span>
    </div>
  </div>
</template>


<script>
  export default {
    name: "badge",
    data () {
      return {        
      }
    },
    props: {
      b_class: String,
      text: String,
    },
  }
</script>