import { Box, Button, Center, FormControl, HStack, Input, VStack } from 'native-base';
import React, { useState } from 'react';
import { H1, H2 } from '../../components';
import { Storage } from '../../utils/Storage';
import { OnboardingScreenNavigationProp, Screens } from '../../navigation/types';

export const OnboardingScreen = ( { navigation } ) => {

  const [part, setPart] = useState<number>(0);
  const [code, setCode] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSetCode = (cd: string) => {
      setCode(cd)
  }

  React.useEffect(() => {
    if (code.length === 4) {
      setIsSuccess(true);
      return console.log('check code!')
    } else {
      setIsSuccess(false)
    }
  }, [code])

  const next = () => {
    if (part < 1) {
      return setPart(1);
    }

    navigation.navigate(Screens.LOGIN);
  };

  return (
    <Center w="100%" h="100%">
      <Box flex="0.85" justifyContent="center" p="2" py="8" w="90%" maxW="290">
        { part === 0 ? (
          <VStack space={5}>
            <H1 text="Welcome" />
            <H2 text="Please enter youe email address" />
            <FormControl>
              <FormControl.Label>Enter your Email</FormControl.Label>
              <Input />
            </FormControl>
          </VStack>
        ) : part === 1 ? (
          <VStack space={5}>
            <H1 text="Confirmation code" />
            <H2 text="You will receive 4 digit code on your email, please confirm to procede with onboarding" />
            <FormControl>
              <FormControl.Label>Enter 4 digit code</FormControl.Label>
              <Input maxLength={4} onChangeText={handleSetCode} keyboardType='numeric' />
            </FormControl>
          </VStack>
        ) : (
          <>
            <H1 text="Thank you!" />
            <H2 text="Onboarding to React Native" />
          </>
        ) }
      </Box>
      <Box w="90%" maxW="290">
        {part === 0 ? (
          <Button size='lg' backgroundColor="yellow.500" onPress={next}>
            {'Next'}
          </Button>
        ) : (
          <HStack space="3">
            <Button width="50%" size='lg' backgroundColor="gray.700" onPress={() => setPart(part - 1)}>
              {'Back'}
            </Button>
            <Button isDisabled={!isSuccess} width="50%" size='lg' backgroundColor="yellow.500" onPress={next}>
              {'Finish'}
            </Button>
          </HStack>
        )}
        
      </Box>
    </Center>
  );
};
