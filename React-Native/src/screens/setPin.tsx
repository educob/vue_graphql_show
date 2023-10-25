import { Box, Button, Center, HStack, Text } from 'native-base';
import React, { useState, useEffect }  from 'react';
  import { Modal, Vibration, Pressable, View, ImageBackground } from 'react-native';
  import { useDispatch } from 'react-redux';
  const sha256 = require("js-sha256")

  import { SetPinScreenNavigationProp, Screens } from '../navigation/types';
  import { H1, H2, NumericKeyboard } from '../components';
  import { Storage } from '../utils/Storage';
  import { setLogged } from '../store/user/slice';
  import { modal, buttons } from '../utils/styles';
  import '../languages'
  import { useTranslation } from 'react-i18next';

  export const SetPinScreen = ( { navigation } ) => {
    const { t } = useTranslation()
    const dispatch = useDispatch();
    const [pin, setPin] = useState<number[]>([]);
    const [isModalVisible, setModalVisible] = useState(true);
    const hideModal = () => { 
      Vibration.vibrate(15)
      setModalVisible(false); 
    };
    const [passphrase, setSPassphrase] = useState(null);

    const updatePin = ( pin_: number[] ) => {
      setPin( [ ...pin_ ] );
    }

    useEffect(() => {
      const fetchData = async () => {
        const passphrase_ = await Storage.get('passphrase');
        setSPassphrase(passphrase_)
      };
      fetchData();
    }, []);

    const next = async () => {
      Vibration.vibrate(15)
      const pinS = pin.join("");
      await Storage.set('pin', pinS)
      if(!passphrase) // client is installing the app
        navigation.navigate(Screens.PASSPHRASE)
      else // this happens when client is resetting the Pin
        dispatch(setLogged(true))
    };

    return (
      <ImageBackground source={require('../assets/img/dark_background.png')} style={{width: '100%', height: '100%', justifyContent:'center', alignItems: 'center'}}>
        <Center w="100%" h="100%">
          <Box safeArea p="2" alignItems="center" w="90%" maxW="290">
            <H1 text="Set a new Pin" />
            <NumericKeyboard updatePin={updatePin} />
            {/* next button */}
              <Button isDisabled={pin.length < 6} onPress={next} style={{ ...buttons.button, ...buttons.ok }}>
                <Text style={ buttons.text }>{'Next'}</Text>
              </Button>
          </Box>

          {/* Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => {
              hideModal();
            }}>
            <View style={modal.centeredView}>
              <View style={modal.modalView}>
                <Text style={modal.modalTitle}>{ t('Set a new PIN') }</Text>
                <Text style={modal.modalText}>{ t('You will have to enter this PIN everytime you use the app.') }</Text>
                <Pressable onPress={() => hideModal()} style={[modal.button, modal.buttonClose]} >
                  <Text style={modal.textStyle}>{ t('Understood') }</Text>
                </Pressable>
              </View>
            </View>
          </Modal>


        </Center>
      </ImageBackground>
    );
  };
  