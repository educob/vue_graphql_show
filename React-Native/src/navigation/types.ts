import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

export enum Screens {
  SPLASH = 'Splash',
  EMAIL = 'Email',
  REGISTER = 'Register',
  SETPIN = 'SetPin',
  PASSPHRASE = 'Passphrase',
  ONBOARDING = 'Onboarding',
  LOGIN = 'Login',
  HOME = 'Home',
  INHERITANCE = 'Inheritance',
  SEND = 'Send'
}

// AUTH Stack
export type AuthStackNavigatorParamList = {
  Splash: undefined;
  Email: undefined;
  Register: undefined;
  SetPin: undefined;
  Passphrase: undefined;
  Onboarding: undefined;
  Login: undefined;
  Inheritance: undefined;
  Send: undefined;
};
 
export type SplashScreenNavigationProp = NativeStackNavigationProp<
  AuthStackNavigatorParamList,
  'Splash'
>;

export type EmailScreenNavigationProp = NativeStackNavigationProp<
  AuthStackNavigatorParamList,
  'Email'
>;

export type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackNavigatorParamList,
  'Register'
>;

export type SetPinScreenNavigationProp = NativeStackNavigationProp<
  AuthStackNavigatorParamList,
  'SetPin'
>;

export type passphraseScreenNavigationProp = NativeStackNavigationProp<
  AuthStackNavigatorParamList,
  'Passphrase'
>;

export type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  AuthStackNavigatorParamList,
  'Onboarding'
>;

export type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackNavigatorParamList,
  'Login'
>;


// MAIN Stack
export type MainStackNavigatorParamList = {
  Home: undefined;
  Inheritance: undefined
  Send: undefined
};

export type HomeScreenNavigationProp = NativeStackNavigationProp<
  MainStackNavigatorParamList,
  'Home'
>;

export type InheritanceScreenNavigationProp = NativeStackNavigationProp<
  MainStackNavigatorParamList,
  'Inheritance'
>;

export type SendScreenNavigationProp = NativeStackNavigationProp<
  MainStackNavigatorParamList,
  'Send'
>;
