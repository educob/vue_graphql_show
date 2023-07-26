<template>
  <div>
    <q-input v-model="email" :rules="emailRules" dense class="login_email" tabindex="1"
                  :label="$t('Enter your Email')" required autofocus/>
    <q-input v-model="pass"  dense  class="login_password" tabindex="2"
              :label="$t('Enter your password')"
              :append-icon="showpassword ? 'mdi-eye-off' : 'mdi-eye'" 
              :type="showpassword ? 'text' : 'password'" counter  
              @click:append="showpassword = !showpassword" >
      <template v-slot:after> 
        <q-icon :name="showpassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showpassword ^= true" />
      </template>
    </q-input>

    <!-- login button -->
    <div class="button" @click="submit"  style="display:flex;margin-top:35px;margin-left:10px" @keyup.enter="submit" tabindex="3">
      <img src="statics/img/ok.svg" width="25" height="25" />
      <span class="vcenter" style="margin-left:10px;margin-right:10px">{{ $t("Login") }}</span>
    </div>


    <div style="margin-top:10px" tabindex="14">
      <q-btn flat @click="forgotpassword" no-caps style="text-decoration: underline;" color="blue" >Forgot Password?</q-btn>
    </div>
  </div>
</template>

<script>
import gql from 'graphql-tag'
import { sha256 } from "js-sha256"

export default {
  data() {
    return {
      email: '',
      pass: '',
      noEmpty: [ v => !!v || 'Please say something' ],
      emailRules: [
        v => !!v || 'E-mail is required',
        v => /\S+@\S+\.\S+/.test(v) || 'E-mail must be valid',
      ],
      showpassword: false,
    }
  },
  props: {
    initEmail: String,
    initPass: String
  },
  computed: {
  },
  mounted() {
    if(!this.initEmail) return
    this.email = this.initEmail
    this.pass = this.initPass
  },
  methods: {
    submit() {
      this.$liam(this.email)
      this.$login(sha256(this.email.toLowerCase()), sha256(this.pass))
    },
    async forgotpassword() {
      if(!this.$isEmail(this.email)) {
        this.$toastInfo("Please enter your User email")
        return
      }
      const res = await this.$apolloClient().mutate({
        mutation: gql`mutation forgotPassword($email: String!) {
          forgotPassword(email: $email)
        }`,
        variables: {
          email: this.email.toLowerCase(), // only time email is not sha256 in browser but in server. Anyway not stored on server.
        },
      }).then( ({data}) => data.forgotPassword)
      if(!!res) {
        this.$toastSuccess('Please check your email to reset the password')
      } else {
        this.$toastError('Operation error')
      }
    }
  },
}
</script>

<style scoped>
  a {  text-decoration: none;}  
</style>  