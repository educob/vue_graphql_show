<template >
  <div class="dialog" style="display:block">
    <div class="dialog-content" :style="{ minWidth: (prop.width || 350) + 'px' }">
        
      <div  v-if="prop.title" style="font-size:20px;font-weight:bold">
        <q-item>
          <q-item-section>
            <span v-html="$t(prop.title)"  />
            <span v-if="prop.subtitle" style="font-size:0.9em;margin-right:30px" v-html="$t(prop.subtitle)" /> 
          </q-item-section>
        </q-item>
        <span v-html="$t(prop.text)" style="font-size:0.6em" />
      </div>
      <!-- slot content -->
        <slot></slot>
      <!-- buttons -->
      <div v-if="!!prop.buttons && !!prop.buttons.length" style="display:flex">
        <!-- future change???  <buttonn img="close_red.svg" text="Close" @click.native="close" /> -->
        <div class="button" v-for="(btn, i) in prop.buttons" :key="i" :color="btn.color" :class="`modal_btn_${i}`" :tabindex="i+10"
                  @click="$emit('selectionDone', i)"  style="display:flex;margin-top:20px;margin-left:10px" @keyup.enter="$emit('selectionDone', i)">
          <img :src="`statics/img/${btn.icon}`" width="25" height="25" />
          <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t(btn.text) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'dialogg',

  data () {
    return {
    }
  },
  props: {
    prop: Object,
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
}
</script>

<style scoped>


</style>
