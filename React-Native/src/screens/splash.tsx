import {Center} from 'native-base';
import React, {useRef, useState, useEffect} from 'react';
import { ImageBackground, AppState, Platform } from 'react-native'
import {Storage} from '../utils/Storage';
import Lottie from 'lottie-react-native';
import { Screens } from '../navigation/types';
import { init, runJobs } from '../utils/core';
import { store } from '../store/store'
import { setLogged } from '../store/user/slice'


export const SplashScreen = ( { navigation } ) => {

  const animationRef = useRef<Lottie>(null)
  // user status
  const [email, setEmail] = useState(null);
  const [pin, setPin] = useState(null);

  const handleNext = () => {
    if (!email) {
      return navigation.navigate(Screens.EMAIL)
    }
    if (!pin) {
      return navigation.navigate(Screens.SETPIN)
    } else if (pin === 'reset') {
      return navigation.navigate( Screens.REGISTER, { email } )
    }
    // passphrase is set after login or setPin
    return navigation.navigate(Screens.LOGIN)
  }

  useEffect(() => {
    // detect app starting, -> foregroudn, -> background
    AppState.addEventListener('change', handleAppStateChange)
    const fetchData = async () => {
      const email_ = await Storage.get('email')
      setEmail(email_)
      const pin_ = await Storage.get('pin');
      setPin(pin_)
    };
    fetchData();
  }, []);

  const handleAppStateChange = async (nextAppState: string) => { console.log("nextAppState:", nextAppState)
    // -> active
    if (nextAppState === 'active') { //console.log('App has come active!');
      await init()
      runJobs()
    // -> background
    } else if(nextAppState === 'inactive' || nextAppState === 'background') {
      console.log("-> Background")
      store.dispatch(setLogged( false ));
    }
  };


  return (
    <ImageBackground source={require('../assets/img/dark_background.png')} style={{width: '100%', height: '100%', justifyContent:'center', alignItems: 'center'}}>
      <Center alignSelf="center" maxW="500px" w="90%"  h="100%" size="sm">
        <Lottie
          autoPlay={true}
          loop={false}
          onAnimationFinish={handleNext}
          ref={animationRef}
          source={require('../assets/loading-animation.json')}
        />
      </Center>
    </ImageBackground>
  );
};
