import { Box, Button, Center, HStack, Text } from 'native-base';
import React from 'react';
import { Vibration } from 'react-native'

import { View } from 'react-native';
import BackspaceSVG from '../assets/img/backspace.svg';

interface NumericKeyboardProps {
  updatePin: (pin: Array<number>) => void;
  hideDigits?: boolean;
}

export const NumericKeyboard = ({ updatePin, hideDigits }: NumericKeyboardProps) => {
  const [pin, setPin] = React.useState<number[]>([]);

  const getIndicatorStyle = (position: number) => { //console.log("pin:", pin)
    if (pin[position]) {
      return { width: 20, height: 20, backgroundColor: '#D3D3D3', borderRadius: 100}
    } else {
      return { width: 20, height: 2, backgroundColor: '#D3D3D3'}
    }
  }

  const handleAddDigit = (digit: number) => {
    if (pin.length === 6) return;
    Vibration.vibrate(15);

    setPin([...pin, digit])
    updatePin([...pin, digit])
  }

  const handleRemoveDigit = () => {
     Vibration.vibrate(15);
     setPin( [...pin.slice(0, -1) ] )
     updatePin( [...pin.slice(0, -1) ] )
  }


  return (    
    <Center w="100%" >
      <Box safeArea p="2" alignItems="center" py="8" w="90%" maxW="290">

        {/* pin entered */}
        <HStack space={3} mt="5" mb="5" justifyContent="center" alignItems="flex-end" minHeight="7">
          {  (pin.length <= 0 || hideDigits) ? (
              <View style={getIndicatorStyle(0)} />
            ) : ( 
              <Text width="5" fontSize={20} color="#D3D3D3" fontWeight="bold">{ pin[0] }</Text>
            )
          }
          {  (pin.length <= 1 || hideDigits) ? (
              <View style={getIndicatorStyle(1)} />
            ) : ( 
              <Text width="5" fontSize={20} color="#D3D3D3" fontWeight="bold">{ pin[1] }</Text>
            )
          }
          {  (pin.length <= 2 || hideDigits) ? (
              <View style={getIndicatorStyle(2)} />
            ) : ( 
              <Text width="5" fontSize={20} color="#D3D3D3" fontWeight="bold">{ pin[2] }</Text>
            )
          }
          {  (pin.length <= 3 || hideDigits) ? (
              <View style={getIndicatorStyle(3)} />
            ) : ( 
              <Text width="5" fontSize={20} color="#D3D3D3" fontWeight="bold">{ pin[3] }</Text>
            )
          }
          {  (pin.length <= 4 || hideDigits) ? (
              <View style={getIndicatorStyle(4)} />
            ) : ( 
              <Text width="5" fontSize={20} color="#D3D3D3" fontWeight="bold">{ pin[4] }</Text>
            )
          }
          {  (pin.length <= 5 || hideDigits) ? (
              <View style={getIndicatorStyle(5)} />
            ) : ( 
              <Text width="5" fontSize={20} color="#D3D3D3" fontWeight="bold">{ pin[5] }</Text>
            )
          }

        </HStack>

        <HStack space={3} mt="5">
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(1)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">1</Text>
          </Button>
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(2)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">2</Text>
          </Button>
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(3)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">3</Text>
          </Button>
        </HStack>

        <HStack space={3} mt="5">
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(4)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">4</Text>
          </Button>
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(5)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">5</Text>
          </Button>
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(6)} borderRadius={100} width={79} height={79} accessibilityLabel='six'>
            <Text fontSize={30} color="white" fontWeight="bold">6</Text>
          </Button>
        </HStack>

        <HStack space={3} mt="5">
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(7)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">7</Text>
          </Button>
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(8)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">8</Text>
          </Button>
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(9)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">9</Text>
          </Button>
        </HStack>

        <HStack space={3} mt="5">
          { !!pin.length  &&
            <Text width={79}></Text>
          }     
          <Button isDisabled={pin.length == 6} backgroundColor={'#565F5A'} onPress={() => handleAddDigit(0)} borderRadius={100} width={79} height={79}>
            <Text fontSize={30} color="white" fontWeight="bold">0</Text>
          </Button>
          {/* backSpace */}
          { !!pin.length  &&
            <Button onPress={handleRemoveDigit} opacity="0.8"   backgroundColor={'black'} borderRadius={100} width={79} height={79}>
              <BackspaceSVG width={50} height={50} />
            </Button>
          }       
        </HStack>

      </Box>
    </Center>
  );
};
