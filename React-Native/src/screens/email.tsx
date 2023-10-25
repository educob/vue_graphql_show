import {Box, Button, Center, FormControl, Text, Input, VStack} from 'native-base';
import React, { useState, useEffect, useRef} from 'react';
import { ImageBackground, Vibration } from 'react-native'
import {H1, H2} from '../components';
import { Screens} from '../navigation/types';
import { buttons } from '../utils/styles'

export const EmailScreen = ( { navigation } ) => {

  const emailRef = useRef(null);

  const [email, setEmail] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleSetEmail = (email: string) => {
    setEmail(email)
  }

  useEffect(() => { 
    if(!!emailRef.current)
      emailRef.current.focus();
  }, []);

  useEffect(() => {
    const isEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)
    setIsSuccess(isEmail);    
  }, [email])

  const next = () => {
    Vibration.vibrate(15);
    navigation.navigate( Screens.REGISTER, { email } ); /* received by { route } */
  };

  return (    
    <ImageBackground source={require('../assets/img/dark_background.png')} style={{width: '100%', height: '100%', justifyContent:'center', alignItems: 'center'}}>
      <Center w="100%" h="100%" >
        <Box flex="0.85" justifyContent="center" p="2" py="8" w="90%" maxW="290">
          <VStack alignItems='center' space={5} >
            <H1 text="Welcome" />
            <H2 text="Please enter your Email"  />
            <FormControl>
              <Input onChangeText={handleSetEmail} ref={emailRef} color="#d0d0d0" fontSize={17} borderRadius={10} accessibilityLabel="email" />
            </FormControl>

            {/* next button */}
            <Button isDisabled={!isSuccess} onPress={next} style={{ ...buttons.button, ...buttons.ok }}  >
              <Text style={ buttons.text }>{'Next'}</Text>
            </Button>  
          </VStack>
        </Box>

      </Center>
    </ImageBackground>
  );
};
