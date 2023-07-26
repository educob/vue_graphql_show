/* eslint-disable */
/**
 * @jest-environment jsdom
 */

import { mount, createLocalVue, shallowMount } from '@vue/test-utils'
import buy from '../../../src/components/buy.vue'
import vue_plugins from '../../../src/boot/vue_plugins.js'
import Vue from 'vue'
//import flushPromises from 'flush-promises'
console.log("vue_plugins:", vue_plugins)

import * as All from 'quasar'
// import langEn from 'quasar/lang/en-us' // change to any language you wish! => this breaks wallaby :(
const { Quasar, date } = All

const components = Object.keys(All).reduce((object, key) => {
  const val = All[key]
  if (val && val.component && val.component.name != null) { //console.log("key:", key)
    object[key] = val
  }
  return object
}, {})

Vue.prototype.$t = () => {}
Vue.prototype.$route = { name: 'address-id', params: { id: '222' } }


describe('buy component', () => {
  const localVue = createLocalVue()
  localVue.use(Quasar, { components }) // , lang: langEn
  localVue.use(vue_plugins)

  test('sanity test', () => {
    const wrapper = shallowMount(buy, {
      localVue
    })
    console.log("vm:", vm) ;return
    expect(wrapper.vm.$el.textContent).toContain('buy')
    //expect(5).toEqual(5)
    //expect(5).toBe(5)
    console.log("buy:", buy)
    return
  })


/*  const wrapper = shallowMount(buy, {
    localVue,
    propsData: {
      item: {}
    },
    mocks: {
      $bar: {
        start: () => {}
      }
    },
  })
  const vm = wrapper.vm

  beforeEach(() => {
    jest.useFakeTimers()
  })

  it('passes the sanity check and creates a wrapper', () => {
    expect(vm).toBeTruthy();
x
    // expect(wrapper.text()).toBe('Hello, World!') 
    // expect(wrapper.text()).toContain('Hello, World!')
    // const a = wrapper.find('a')
    // expect(a.text()).toBe(item.title)
    // expect(a.attributes().href).toBe(item.url) // no: expect(a.attributes().href === item.url).toBe(true)
    // expect(wrapper.findAll(Item)).toHaveLength(window.items.length)
    // expect(wrapper.props().item).toBe(window.items[i])
    // expect(wrapper.classes()).toContain('hidden')
    // expect(wrapper.element.style.width).toBe('0%')
    // expect(wrapper.classes()).not.toContain('hidden')
    // jest.runTimersToTime(100) 1
    // expect(wrapper.element.style.width).toBe('1%')

    // jest.spyOn(window, 'clearInterval') 1
    // setInterval.mockReturnValue(123) 2
    // const wrapper = shallowMount(ProgressBar)
    // wrapper.vm.start() 3
    // wrapper.vm.finish()
    // expect(window.clearInterval).toHaveBeenCalledWith(123)

    // const mockFunction = jest.fn() 1
    // mockFunction(1)
    // mock(2,3)
    // mockFunction.mock.calls
    // expect(mockFunction).toHaveBeenCalled()

    // const $bar = {
    // start: jest.fn(),
    // finish: () => {}
    // }
    // shallowMount(ItemList, {mocks: { $bar }})
    // expect($bar.start).toHaveBeenCalledTimes(1)

    // expect.assertions(1) 
    // const data = await fetchListData()
    // expect(data).toBe('some data')

    // wrapper.find('div').trigger('mouseenter')

    // wrapper.find('button').trigger('click')
    // expect(wrapper.emitted('close-modal')).toHaveLength(1)

    // wrapper.find(Modal).vm.$emit('close-modal')
    // expect(wrapper.find(Modal).exists()).toBeFalsy()

    // wrapper.find('input[type='text']').value = 'Edd'
    // wrapper.find('input[type='text']').trigger('change')
    // expect(wrapper.text()).toContain('Edd')

    // const input = wrapper.find('input[type='email']')
    // input.setValue('email@gmail.com')

    // wrapper.find('input[type='radio']').setChecked()

  })
  
  test('sanity test', () => {
    const wrapper = shallowMount(buy)
    console.log("vm:", vm) ;return
    expect(wrapper.vm.$el.textContent).toContain('buy')
    //expect(5).toEqual(5)
    //expect(5).toBe(5)
    console.log("buy:", buy)
    return
  })*/
})


/*
import QBUTTON from './demo/QBtn-demo.vue'
import * as All from 'quasar'
// import langEn from 'quasar/lang/en-us' // change to any language you wish! => this breaks wallaby :(
const { Quasar, date } = All

const components = Object.keys(All).reduce((object, key) => {
  const val = All[key]
  if (val && val.component && val.component.name != null) {
    object[key] = val
  }
  return object
}, {})

describe('Mount Quasar', () => {
  const localVue = createLocalVue()
  localVue.use(Quasar, { components }) // , lang: langEn

  const wrapper = mount(QBUTTON, {
    localVue
  })
  const vm = wrapper.vm

  it('passes the sanity check and creates a wrapper', () => {
    expect(wrapper.vm).toBeTruthy();
  })

  it('has a created hook', () => {
    expect(typeof vm.increment).toBe('function')
  })

  it('accesses the shallowMount', () => {
    expect(vm.$el.textContent).toContain('rocket muffin')
    expect(wrapper.text()).toContain('rocket muffin') // easier
    expect(wrapper.find('p').text()).toContain('rocket muffin')
  })

  it('sets the correct default data', () => {
    expect(typeof vm.counter).toBe('number')
    const defaultData2 = QBUTTON.data()
    expect(defaultData2.counter).toBe(0)
  })

  it('correctly updates data when button is pressed', () => {
    const button = wrapper.find('button')
    button.trigger('click')
    expect(vm.counter).toBe(1)
  })

  it('formats a date without throwing exception', () => {
    // test will automatically fail if an exception is thrown
    // MMMM and MMM require that a language is 'installed' in Quasar
    let formattedString = date.formatDate(Date.now(), 'YYYY MMMM MMM DD')
    console.log('formattedString', formattedString)
  })
})*/
