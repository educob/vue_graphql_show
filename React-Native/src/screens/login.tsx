import { Box, Button, Center, HStack, Text } from 'native-base';
import { useState, useEffect }  from 'react';
import { ImageBackground, Modal, Vibration, View, Pressable} from 'react-native'
import { useDispatch } from 'react-redux';
import { modal, buttons, toast } from '../utils/styles';
import Toast from 'react-native-root-toast';
import { Toaster } from '../components/Toaster'
import '../languages'
import { useTranslation } from 'react-i18next';


import { Screens } from '../navigation/types';
import { H1, NumericKeyboard } from '../components';
import { Storage } from '../utils/Storage';
import { setLogged } from '../store/user/slice';


  export const LoginScreen = ( { navigation } ) => {
    const { t } = useTranslation()
    const dispatch = useDispatch();
    const [pin, setPin] = useState<number[]>([]);
    const [storedPin, setStoredPin] = useState(null);
    const [passphrase, setSPassphrase] = useState(null);

    
    // reset pin/email
    const maxAttempsNum = 10
    const [showResetModal, setShowResetModal] = useState(false);
    const [showTooManyAttempsModal, setShowTooManyAttempsModal] = useState(false);

    useEffect(() => {
      const fetchData = async () => {
        const storedPin_ = await Storage.get('pin')
        setStoredPin(storedPin_)
        const passphrase_ = await Storage.get('passphrase');
        setSPassphrase(passphrase_)
      };
      fetchData();
    }, []);


    const updatePin = ( pin_: number[] ) => {
      setPin( [ ...pin_ ] );
    }

    const hideResetModal = () => { 
      setShowResetModal(false)
    };

    const resetIni = () => {
      setShowResetModal(true)
    }

    const reset = async () => {
      Vibration.vibrate(15)
      await Storage.set('pin', 'reset')
      setShowResetModal(true)
      const email = await Storage.get('email')
      navigation.navigate( Screens.REGISTER, { email } )
    }

    const hideTooManyAttemptsModal = async () => {     
      Vibration.vibrate(15)
      setShowTooManyAttempsModal(false) 
      const email = await Storage.get('email')
      navigation.navigate( Screens.REGISTER, { email } )
    };

    const cancelReset = () => {
      Vibration.vibrate(15)
      setShowResetModal(false)
    }
    
    const next = async () => {
      Vibration.vibrate(15)
      const pinS = pin.join("")
      if(pinS !== storedPin) { // wrong pin
        const attempts = await Storage.getNumber('loginAttempts') || 0
        if(attempts === maxAttempsNum - 1) {
          setShowTooManyAttempsModal(true)
          await Storage.set('pin', 'reset')
          await Storage.setNumber('loginAttempts', 0)
          //const email = await Storage.get('email')
          return
        }
        await Storage.setNumber('loginAttempts', attempts + 1)
        Toast.show(<Toaster { ...toast.error } message={t(`Wrong PIN\n${maxAttempsNum-attempts-1} attempts left.`) } />, toast.conf );
      } else { // pin ok
        await Storage.setNumber('loginAttempts', 0)
        if(!!passphrase)
          dispatch(setLogged(true))
        else
          navigation.navigate(Screens.PASSPHRASE)
      }
    };

    return (
      <ImageBackground source={require('../assets/img/dark_background.png')} style={{width: '100%', height: '100%', justifyContent:'center', alignItems: 'center'}}>
        <Center w="100%" h="100%">
          <Box safeArea p="2" alignItems="center" w="90%" maxW="290">
            <H1 text="Enter your Pin" />
            <NumericKeyboard updatePin={updatePin} hideDigits={true} />
            <HStack space={3} mt="5">
              <Button onPress={resetIni} style={{ ...buttons.button, ...buttons.cancel }} >
                <Text style={ buttons.text }> {'Reset'}</Text>
              </Button>  
              {/* next button */}
                <Button onPress={next} isDisabled={pin.length < 6} style={{ ...buttons.button, ...buttons.ok }}>
                  <Text style={ buttons.text }>{'Next'}</Text>
                </Button>    
            </HStack>
          </Box>

          {/* reset Popup */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showResetModal}
            onRequestClose={() => {
              hideResetModal()
            }}>
            <View style={modal.centeredView}>
              <View style={modal.modalView}>
                <Text style={modal.modalTitle}>{ t('Reset your PIN or Email') }</Text>
                <Text style={modal.modalText} >{ t('This is a two step process') }</Text>
                <Text style={modal.modalText} >{ t('1. Contact us to reset your PIN or Email') }</Text>
                <Text style={modal.modalText} >{ t('2. Click now the Reset button') }</Text>

                {/* Reset / Close */}
                <Button onPress={reset} style={{ ...buttons.button, ...buttons.cancel }}>
                  <Text style={ buttons.text }>{'Reset'}</Text>
                </Button>  
                <Button onPress={cancelReset} style={{ ...buttons.button, ...buttons.close }} >
                  <Text style={ buttons.text }> {'Close'}</Text>
                </Button>  
              </View>
            </View>
          </Modal>


          {/* After 10 attemps your pin has been reset */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showTooManyAttempsModal}
            onRequestClose={() => {
              hideTooManyAttemptsModal();
            }}>
              <View style={modal.centeredView}>
                <View style={modal.modalView}>
                  <Text style={modal.modalTitle}>{ t(`After ${maxAttempsNum} failed attemps your Pin has been reset`) }</Text>
                  <Text style={modal.modalText} mt="5" >{ t('Contact us to receive by email a new PIN') }</Text>
                  <Pressable onPress={hideTooManyAttemptsModal} style={[modal.button, modal.buttonClose]} >
                    <Text style={modal.textStyle}>{ t('Understood') }</Text>
                  </Pressable>
                </View>
              </View>
          </Modal>

        </Center>
      </ImageBackground>
    );
  };
  