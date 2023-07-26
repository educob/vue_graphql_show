<template>
  <div class="datetime-picker"  @click='calendarClicked($event)'>
    <div class='calender-div' >
      <div class='year-month-wrapper'>
        <!-- year -->
        <!-- year -->
        <div v-if="!noyear" class='month-setter'>
          <button type='button' class='nav-l' v-on:click='leftYear'>&#x3C;</button>
          <span class='year'>{{year}}</span>
          <button type='button' class='nav-r' v-on:click='rightYear' >&#x3E;</button>
        </div>
        <!-- month -->
        <div class='month-setter'>
          <button type='button' class='nav-l' @click='leftMonth'>&#x3C;</button>
          <span @click='setMonth()' class='month click'>{{ month }}</span>
          <button type='button' class='nav-r' @click='rightMonth'>&#x3E;</button>
        </div>
      </div>
      <div v-if="!noDays" class='headers'>
        <span class='days' v-for="port in days" :key="port">{{port}}</span>
      </div>
      <div v-if="!noDays" class="week" v-for="(week, weekIndex) in weeks" :key="weekIndex">
        <span class="port" v-for="(day, dayIndex) in week" :key="dayIndex" @click='setDay(weekIndex*7 + dayIndex, day)' :class='{activePort: (weekIndex*7 + dayIndex) === activePort}'>
          {{day}}
        </span>
      </div>
    </div>
  </div>

</template>

<script>
import {startOfMonth, endOfMonth, eachDay, getDay, format, startOfDay, isEqual } from 'date-fns'
const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const AM = 'AM'
const PM = 'PM'
export default {
  name: 'datetime-picker',
  data () {
    return {
      date: this.value,
      activePort: null,
      timeStamp: new Date(),
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'Octubre', 'November', 'December'],
      days: [],
      monthIndex: 0,
      hourIndex: 0,
      minuteIndex: 0,
      year: 2020,
      portsHolder: [],
      hour: '00',
      minute: '00',
      day: 1,
      minuteSelectorVisible: false,
      hourSelectorVisible: false,
      period: AM,
      periodStyle: 12,
      weeks: [],
    }
  },
  props: {
    format: {
      type: String,
      default: 'YYYY-MM-DD h:i:s',
    },
    name: {
      type: String
    },
    width: {
      type: String
    },
    value: {
      type: String,
      default: ""
    },
    required: {
      type: Boolean,
      default: false
    },
    readonly: {
      type: Boolean,
      default: false
    },
    noDays: {
      type: Boolean,
      default: false
    },
    firstDayOfWeek: {
      default: 0,
      validator: function(value) {
        try {
          const val = parseInt(value, 10)
          return val >= 0 && val <= 1
        } catch (e) {
          console.warn(e.message)
          return false
        }
      },
      message: 'Only 0 (Sunday) and 1 (Monday) are supported.'
    },
    noyear: {
      type: Boolean,
      default: false
    },
    nodeId: {
      type: String,
      default: ""
    },
    noPast: {
      type: Boolean,
      default: false
    },


  },
  mounted() {
  },
  methods: {
    leftMonth () {
      let index = this.months.indexOf(this.month)
      if (index === 0) {
        this.monthIndex = 11
      } else {
        this.monthIndex = index - 1
      }
      if(!!this.noPast && !!this.isEarlier())
        this.$toastError("Date cannot be in the past")  
      this.updateCalendar()
    },
    rightMonth () {
      let index = this.months.indexOf(this.month)
      if (index === 11) {
        this.monthIndex = 0
      } else {
        this.monthIndex = index + 1
      }
      this.updateCalendar()
    },
    rightYear () {
      this.year++
      this.updateCalendar()
    },
    leftYear () {
      this.year--
      if(!!this.noPast && !!this.isEarlier())
        this.$toastError("Date cannot be in the past")        
      this.updateCalendar()
    },
    updateActivePortFromWeek (week, weekIndex) {
      const currentActive = startOfDay(this.timeStamp);
      const index = week.findIndex(day => isEqual(currentActive, day));
      if (index !== -1) {
        this.activePort = weekIndex*7 + index;
      }
    },
    updateCalendar () {// console.log("updateCalendar this.year:", this.year, "this.monthIndex:", this.monthIndex)
      const date = new Date(this.year, this.monthIndex, 1, 0, 0, 0);
      const weeks = [];
      let week = null;
      let weekDays = new Array(7);
      // let index = 0;
      this.activePort = null //; console.log("date:", date, "endOfMonth(date):", endOfMonth(date))
      eachDay(date, endOfMonth(date)).forEach(day => {
        const weekday = getDay(day);
        if (weekday === this.normalizedFirstDayOfWeek) {
          if (week) {
            weeks.push(week);
            // Add those days that were not part of the month to the index
            // index += week.filter(d => d === null).length;
            this.updateActivePortFromWeek(weekDays, weeks.length - 1);
            weekDays = new Array(7);
          }
          week = new Array(7);
        } else if (week === null) {
          week = new Array(7);
        }
        const idx = (weekday - this.normalizedFirstDayOfWeek + 7) % 7
        week[idx] = format(day, 'DD');
        weekDays[idx] = day;
      });
      if (week && week.some(n => n)) {
        weeks.push(week);
        this.updateActivePortFromWeek(weekDays, weeks.length - 1);
      }
      this.weeks = weeks;
    },
    isEarlier() { console.log("this:", this.year, this.monthIndex, this.day)
    console.log("calendar date:", new Date(this.year, this.monthIndex, this.day))
      const calendarDate = new Date(this.year, this.monthIndex, this.day)
      if(calendarDate < new Date()) return true
      return false
    },
    setDay (index, port) {
      if (port) {
        this.activePort = index;
        this.day = parseInt(port, 10);
        this.timeStamp = new Date(this.year, this.monthIndex, this.day);
      }
      if(!!this.noPast && !!this.isEarlier()) {
        this.$toastError("Date cannot be in the past")
        return
      }
      this.setDate()
    },
    setMonth() {
      this.activePort = 0;
      this.day = 1
      this.timeStamp = new Date(this.year, this.monthIndex, 1)
      if(!!this.noPast && !!this.isEarlier()) {
        this.$toastError("Date cannot be in the past")
        return
      }
      this.setDate()
    },
    changePeriod () {
      this.period = this.period === AM ? PM : AM
    },
    calendarClicked (event) {
      event.cancelBubble = true
      if (event.stopPropagation) {
        event.stopPropagation()
      }
    },
    setPeriodStyle () {
      if (this.dateFormat.indexOf('H') !== -1) {
        this.periodStyle = 24
        this.period = null;
      } else {
        this.periodStyle = 12
      }
    },
    setDate () { 
      let d = null
      this.setPeriodStyle()
      let h = this.hour + ''
      if (this.periodStyle === 12) {
        if (h === '12') {
          h = this.period === AM ? '00' : '12'
        } else if (this.period === PM && parseInt(h) < 12) {
          h = parseInt(h) + 12
          h = '' + h
        } else if (this.period === AM && parseInt(h) > 12) {
          h = parseInt(h) - 12
          h = '' + h
        }
      }
      d = this.dateFormat
      d = d.replace('YYYY', this.year)
      d = d.replace('DD', this.day < 10 ? '0' + this.day : this.day)
      let m = this.monthIndex + 1
      d = d.replace('MM', m < 10 ? '0' + m : m)
      this.minute += ''
      d = d.replace(this.periodStyle === 24 ? 'H' : 'h', h.length < 2 ? '0' + h : '' + h )
      d = d.replace('i', this.minute.length < 2 ? '0' + this.minute : '' + this.minute)
      d = d.replace('s', '00')
      this.$emit('input', d, this.nodeId)
      this.set_date(this.day, this.monthIndex, this.year)
      this.date = d.substring(0, 10)
    },
    // Creates a date object from a given date string
    makeDateObject (val) {
      // handle support for eu date format
      let dateAndTime = val.split(' ')
      let arr = []
      if (this.format.indexOf('-') !== -1) {
        arr = dateAndTime[0].split('-')
      } else {
        arr = dateAndTime[0].split('/')
      }
      let year = 0
      let month = 0
      let day = 0
      if (this.format.indexOf('DD/MM/YYYY') === 0 || this.format.indexOf('DD-MM-YYYY') === 0) {
        year = arr[2]
        month = arr[1]
        day = arr[0]
      } else if (this.format.indexOf('YYYY/MM/DD') === 0 || this.format.indexOf('YYYY-MM-DD') === 0) {
        year = arr[0]
        month = arr[1]
        day = arr[2]
      } else {
        year = arr[2]
        month = arr[0]
        day = arr[1]
      }
      let date = new Date();
      if(this.hideDate){
        // time only
        let splitTime = dateAndTime[0].split(':')
        // handle date format without seconds
        let secs = splitTime.length > 2 ? parseInt(splitTime[2]) : 0
        date.setHours(parseInt(splitTime[0]), parseInt(splitTime[1]), secs, 0)
      } else if (this.hideTime) {
        // date only
        date = new Date(parseInt(year), parseInt(month)-1, parseInt(day))
      } else {
        // we have both date and time
        let splitTime = dateAndTime[1].split(':')
        // handle date format without seconds
        let secs = splitTime.length > 2 ? parseInt(splitTime[2]) : 0
        date = new Date(parseInt(year), parseInt(month)-1, parseInt(day), parseInt(splitTime[0]), parseInt(splitTime[1]), secs)
      }
      return date
    },
    clearDate(){
      this.date = ''
      this.$emit('input', this.nodeId)
    },
  },
  created () {
    if (this.value) {
      try {
        this.timeStamp = this.makeDateObject(this.value)
        // set #period (am or pm) based on date hour
        if (this.timeStamp.getHours() >= 12) {
          this.period = PM
        } else {
          this.period = AM
        }
      } catch (e) {
        this.timeStamp = new Date()
        console.log(e);
      }
    }
    this.year = this.timeStamp.getFullYear()
    this.monthIndex = this.timeStamp.getMonth()
    this.day = this.timeStamp.getDate()
    this.updateCalendar()
    days.forEach((day, idx) => {
      this.days[(idx - this.normalizedFirstDayOfWeek + 7) % 7] = day;
    });
    this.setPeriodStyle()
  },
  watch: {
    value (newVal, oldVal) {// console.log("watch value:", newVal, typeof newVal)
      if (newVal) {
        this.value = newVal;
        try {
          this.timeStamp = this.makeDateObject(this.value)
        } catch (e) {
          console.warn(e.message +'. Current date is being used.')
          this.timeStamp = new Date()
        }
        this.year = this.timeStamp.getFullYear()
        this.monthIndex = this.timeStamp.getMonth()
        this.day = this.timeStamp.getDate()
        this.updateCalendar()
        this.setDate()
      }
    },
    date(val) {
      console.log("date changed:", val)
    },
  },
  destroyed: function () {
    document.removeEventListener('keydown', this.keyIsDown)
    document.removeEventListener('click', this.documentClicked)
  },
  computed: {
    normalizedFirstDayOfWeek: function() {
      return parseInt(this.firstDayOfWeek, 10);
    },
    ports: {
      get: function () {
        let p = []
        if (this.portsHolder.length === 0) {
          for (let i = 0; i < 42; i++) {
            p.push('')
          }
        } else {
          p = this.portsHolder
        }
        return p
      },
      set: function (newValue) {
        this.portsHolder = newValue
      }
    },
    month () {
      return this.months[this.monthIndex]
    },
    dateTime () {
      return this.timeStamp.getFullYear() + '-' + (this.timeStamp.getMonth() + 1) + '-' + this.timeStamp.getUTCDay()
    },
    minutes () {
      let arr = []
      for (let i = 0; i < 60; i++) {
        i < 10 ? arr.push('0' + i) : arr.push('' + i)
      }
      return arr
    },
    hours () {
      let arr = []
      if (this.periodStyle === 24) {
        for (let i = 0; i < this.periodStyle; i++) {
          i < 10 ? arr.push('0' + i) : arr.push('' + i)
        }
      } else {
        for (let i = 1; i <= this.periodStyle; i++) {
          i < 10 ? arr.push('0' + i) : arr.push('' + i)
        }
      }
      return arr
    },
    dateFormat () {
      return 'YYYY-MM-DD h:i:s'
    },
    hideTime () {
      return this.dateFormat.indexOf('h:i:s') === -1
          && this.dateFormat.indexOf('H:i:s') === -1
          && this.dateFormat.indexOf('h:i') === -1
          && this.dateFormat.indexOf('H:i') === -1
    },
    hideDate () {
      return this.dateFormat === 'h:i:s' || this.dateFormat === 'H:i:s'
        || this.dateFormat === 'h:i' || this.dateFormat === 'H:i'
    }
  },
  inject: ['set_date']
}
</script>

<style scoped>

  .datetime-picker {
    z-index:20;
  }
  .calender-div {
    min-width: 240px;
    box-shadow: 1px 2px 5px var(--light-blue);
    display: inline-block;
    top: 30px;
    font-size: 14px;
    z-index: 100;
    background-color: var(--main-bg-color);
  }
  .port, .days{
    display: inline-block;
    width: 30px;
    height: 30px;
    padding: 4px 2px;
    margin: 2px;
    border-radius: 2px;
    text-align: center;
    vertical-align: top;
    cursor: pointer;
  }
  .days{
    font-weight: bold;
  }
  .port:hover{
    font-weight: bold;
  }
  .activePort, .activePort:hover {
    background-color:var(--light-blue);
    color: white;
  }
  .month-setter, .year-setter{
    margin: 0 1px;
    width: 100%; /*48.2%;*/
    font-weight: 900;
    display: inline-block;
    border-bottom: 1px solid gray;
  }
  .nav-l:hover, .nav-r:hover {
    background-color: #69c8e2;
  }
  .nav-l, .nav-r {
    display: inline-block;
    width: 25px;
    background-color: var(--light-blue);
    color: white;
    font-size: 16px;
    cursor: pointer;
    border: 0;
    padding: 7px;
    margin:0;
  }
  .nav-l:focus, .nav-r:focus{
    outline: none;
  }
  .nav-l{
    float: left;
  }
  .nav-r{
    float: right;
  }
  .month, .year{
    width:75%;
    text-align: center;
    display: inline-block;
    padding: 7px 0;
  }
  .headers {
    border-bottom: 1px solid gray;
  }
  .time-separator{
    display: inline-block;
    font-weight: bold;
  }
  .nav-t, .nav-d{
    font-weight: bold;
    cursor: pointer;
  }
  .showSelector{
    display:inline-block;
  }
  li.active{
    background-color: #ed4d00;
  }
  li{
    padding: 4px;
    font-size: 16px;
    width: 100%;
    cursor: pointer;
  }
  .time-picker{
    display: inline-block;
    margin: 10px
  }
</style>