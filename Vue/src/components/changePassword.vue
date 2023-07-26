<template>
  <div>
      <q-input :label="$t('Current Password')" v-model="oldPass" :rules="passwordRule" dense
                    :type="showOldpassword ? 'text' : 'password'" required >
        <template v-slot:after>
          <q-icon :name="showOldpassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showOldpassword ^= true" />
        </template>
      </q-input>
      <q-input :label="$t('New Password')" v-model="password" :rules="passwordRule" id="pass" 
                    :type="showpassword ? 'text' : 'password'" dense >
        <template v-slot:after>
          <q-icon :name="showpassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showpassword ^= true" />
        </template>
      </q-input>
      <q-input :label="$t('Confirm Password')" v-model="confirm_password" :rules="passwords_match" :type="showpassword ? 'text' : 'password'" dense/>
      <q-btn class="primary" @click="change_pass" :disabled="!isFormValid">{{ $t("Save") }}</q-btn>
  </div>
</template>

<script>
import gql from 'graphql-tag'
import { sha256 } from "js-sha256"

export default {
  data: () => ({
    valid: false,
    oldPass: '',
    password: '',
    confirm_password: '',
    emailRules: [
      v => !!v || 'E-mail is required',
      v => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v) || 'E-mail must be valid'
    ],
    passwordRule: [
      v => !!v || 'Password is required. Min. 6 characters',
    ],
    showpassword: false,
    showOldpassword: false,
    //close_on_click: false,
  }),
  mounted() {
    this.valid=false
  },
  computed: {
    isFormValid() {
      return this.oldPass.length >= 5 && this.password.length >= 5 && this.confirm_password.length &&
              this.password == this.confirm_password
    },
    passwords_match() {
      return [
        v => !!v || 'Password confirmation is required',
        (v) => v == this.password || 'Passwords must match' 
      ]
    }
  },
  methods: {
    async change_pass() {
      const oldPass = sha256(this.oldPass)
      const newPass = sha256(this.password)
      try {
        const res = await this.$apolloClient().mutate({ 
          mutation: gql`mutation changePassword($oldPass: String!, $newPass: String!) {
            changePassword(oldPass: $oldPass, newPass: $newPass)
          }`,
          variables: {
            oldPass,
            newPass
          },
        }).then(({data}) => data && data.changePassword)
        if(!!res) 
          this.$toastSuccess("Operation successful")
        else 
        zthis.$toastError("Operation error")
      } catch (error) {
        this.$toastError("Operation error.")
      }
    },
  },
};
</script>

<style scoped>
  a {  text-decoration: none;}  
</style> 