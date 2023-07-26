<template >
  <div v-if="prop.dialog" class="dialog" style="display:block">
    <div class="dialog-content" style="min-width:330px" >

      <div  v-if="prop.title" style="font-size:20px;font-weight:bold">
        <q-item>
          <q-item-section>
            <q-item-label v-html="$t(prop.title)" style="margin-right:30px" />
            <q-item-label v-if="prop.subtitle" style="color:gray;font-size:0.9em;margin-right:30px" v-html="$t(prop.subtitle)" />
          </q-item-section>
        </q-item>
        <span v-html="$t(prop.text)" style="font-size:0.6em;color:gray" />

        <!-- content -->
        <slot></slot>
        
        <!-- buttons -->
        <div style="display:flex">
          <div class="button" v-for="(btn, i) in prop.buttons" :key="i" :color="btn.color" :class="`modal_btn_${i}`" :tabindex="i+10"
                    @click="$emit('selectionDone', i)"  style="margin-top:15px;margin-left:10px"  @keyup.enter="$emit('selectionDone', i)">
            <img :src="`statics/img/${btn.icon}`" width="25" height="25" />
            <span  class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t(btn.text) }}</span>
          </div>
        </div>
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
  props: {
    prop: Object,
  },
}
</script>

<style scoped>


</style>
