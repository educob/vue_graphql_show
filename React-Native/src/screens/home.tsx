import React, { useEffect, useState } from 'react';
import { ImageBackground, Pressable, View, Dimensions, Modal, Vibration } from 'react-native'
import {Box, Text, Center, VStack } from 'native-base';
import { H1 } from '../components/H1';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Screens} from '../navigation/types';
import '../languages'
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/util'
import sb  from "satoshi-bitcoin"

import { modal, balanceCSS } from '../utils/styles';
import { notification, beneficiary } from '../utils/styles';
import { inheritancesCSS } from '../utils/styles';
import { runJobs } from '../utils/core'
import { isPsbtPending } from '../utils/bitcoin'
import { setDeceased } from '../store/user/slice'
import { store } from '../store/store'
import { Storage } from '../utils/Storage'


export const HomeScreen = ( { navigation } ): JSX.Element => {
  const { t } = useTranslation()

  const screenWidth = Dimensions.get('window').width;
  const buttonWidth = Math.min(screenWidth * 0.9, 450);

  const inheritances = useSelector((state: RootState) => state.user.inheritances);

  const [ isDeceasedModalVisible, setDeceasedModalVisible ] = useState(false);

  // this so navigation.navigate works on useEffect
  const [mounted, setMounted] = useState(false);


  useEffect(() => { //console.log("useEffect:", JSON.stringify(inheritances, null, 4))
    runJobs()
    setMounted(true);   
  }, []);

  const deceased = useSelector((state: RootState) => state.user.deceased)

    // if there is only one inheritance show it directly
  useEffect(() => { //console.log("useEffect:", JSON.stringify(inheritances, null, 4))
    if(!mounted) return
    if(Object.keys(inheritances).length === 1) {
      showInheritance(Object.keys(inheritances)[0]);       
    } else {
      const deceased = store.getState().user.deceased
      setDeceasedModalVisible(deceased)
    }
  }, [inheritances, mounted, deceased]);

  const showInheritance = (inheritanceId: string) => { //console.log("showing inheritance:", inheritanceId)
    Vibration.vibrate(15)
    navigation.navigate( Screens.INHERITANCE, { inheritanceId } ); 
  }  

  const hideDeceasedModal = () => {
    setDeceasedModalVisible(false)
    store.dispatch(setDeceased( false ))
  }

  return (   
    <ImageBackground source={require('../assets/img/dark_background.png')} style={{width: '100%', height: '100%'}}>
      <Center w="100%">
        <VStack alignItems='center' space={5}  width='100%' >
          { !!Object.keys(inheritances).length ? (
          <Box safeArea p="2" py="5" width='100%' >
            {Object.keys(inheritances).map((key) => (
              <Pressable onPress={ () => showInheritance(key) } key={inheritances[key]._id} style={{ 
                     padding: 15,  width: '100%' }} >
                <View style={{ borderBottomColor: '#e4e4e4', borderBottomWidth: 1 }} />
                <View style={{ marginTop: 20 }}>
                  <View style={{ flexDirection: 'row', marginBottom: 15, justifyContent: 'space-between' }}>
                    <Text style={ [ { flex: 1 }, inheritancesCSS.name ] }>{ inheritances[key].name }</Text>
                    <Text style={ balanceCSS.small }>{ sb.toBitcoin(inheritances[key].balance) } BTC </Text>
                  </View> 

                  {/* pending transaction */}
                  
                  { isPsbtPending(inheritances[key]) && (
                  <View style={{ ...notification.view, width: Math.min(screenWidth * 0.9, 500), marginBottom: 15 }} >
                  <Text style={notification.h1}>{ t('Do not close/minimize the app.') }</Text>  
                  <Text style={notification.h3}>{ t('Unconfirmed transaction') }</Text>  
                  </View>                 
                  ) }
                  {/* notification */}
                  { !!inheritances[key].logEntryId && !isPsbtPending(inheritances[key]) && (
                  <View style={{ ...notification.view, width: Math.min(screenWidth * 0.9, 500), marginBottom: 15 }} >
                    <Text style={notification.h2}>{ t('Changes Pending') }</Text>
                  </View>                 
                  ) }
                  {/* Beneficiaries */}
                  { inheritances[key].beneficiaries && (
                    <View>
                      <Text style={beneficiary.h2}>Beneficiaries</Text>
                      { inheritances[key].beneficiaries.map((benef) => ( 
                        <View key={benef.bitcoinAddress} style={{ marginTop:3 }}>
                          <View style={{ paddingLeft: 5, paddingRight: 5, justifyContent: 'space-between' }}>
                            <View style={{ marginTop:5, flexDirection: 'row' }}>
                              <Text style={ [ beneficiary.name ] }>{benef.name } { benef.surname }</Text>
                              <Text style={ [ beneficiary.percentage ] }>{benef.percentage}% </Text>
                            </View>
                            <View >
                              <Text style={beneficiary.small}>{ benef.phone }. { benef.email }</Text>
                            </View>
                          </View>
                          <View style={{ paddingLeft: 5, paddingRight: 10 }}>
                            <Text style={beneficiary.address}>{ benef.bitcoinAddress }</Text>
                          </View>
                        </View>
                      ) ) }
                    </View>
                  ) }
                  { !!inheritances[key].psbtUpdate && (
                    <Center>
                      <View style={{ flexDirection: 'row', marginTop:15 }}>
                        <Text style={ [ inheritancesCSS.text ] }>{ t('Last Transaction update') }</Text>
                        <Text style={ [ inheritancesCSS.date ] }>  { formatDate(inheritances[key].psbtUpdate) } </Text>
                      </View>
                    </Center>
                  ) }
                </View>
              </Pressable>
            ) ) }
            <View style={{ borderBottomColor: '#e4e4e4', borderBottomWidth: 1 }} />
          </Box>          
          ) : (
            <Box safeArea p="2" py="8" w="90%" >
              <H1 text="You have no inheritances" />
            </Box>  
          ) }
        </VStack>

        {/* Client is deceased */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isDeceasedModalVisible}
          onRequestClose={ hideDeceasedModal }>
            <View style={ modal.centeredView }>
              <View style={ modal.modalView }>
                <Text style={ modal.modalTitle }>{ t(`You have been declared dead`) }</Text>
                <Pressable onPress={ hideDeceasedModal } style={[modal.button, modal.buttonClose]} >
                  <Text style={ modal.textStyle }>{ t('Understood') }</Text>
                </Pressable>
              </View>
            </View>
        </Modal>

      </Center>
    </ImageBackground>
  );
};




