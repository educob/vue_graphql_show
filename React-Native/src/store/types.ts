import { Int32 } from "react-native/Libraries/Types/CodegenTypes";

// User Slice
export interface User {
  name: string;
  email: string;
  image?: string;
  dob?: string;
}

export interface UserState {
  data: User | null;
  token: string | null
  deceased: boolean
  inheritances: Inheritances
  thirdparty: Thirdparty
  logged: boolean
  hasNotification: boolean
  status: SliceStatus
}

export interface AppState {
  jobsTimer: number
  isEmulator: boolean
  fee: number
  feeNextUpdate: string | null
  upgrade: boolean
}

// Shared
export enum SliceStatus {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export interface Inheritances {
  [key: string]: Inheritance;
}

export interface Inheritance {
  _id: string;
  name: string;
  beneficiaries: Array<Beneficiary>;
  index: Int32;
  kp: string;
  scriptAddressId: string;
  psbt: string | null;
  psbtHash: string;
  psbtUpdate: string;
  logEntryId: string;
  beneficiariesChanges: BeneficiariesChanges;
  proposedBeneficiaries: Array<Beneficiary>;
  balance: Int32;
  unconfirmed: Int32;
  network: string;
}

export interface Beneficiary {
  name: string;
  surname: string;
  phone: string;
  email: string;
  percentage: Int32;
  bitcoinAddress: string;
}

export interface BeneficiariesChanges {
  added: Array<Beneficiary>;
  removed:  Array<Beneficiary>;
  changed: Array<BeneficiaryChange>;
}

export interface BeneficiaryChange {
  beneficiary: string;
  changes: Array<string>;
}

export interface Thirdparty {
  _id: string;
  web: string;
  logoUrl: string;
  address: string;
  email: string;
  phone: string;
  network: string;
  coordinates: Array<Int32>;
  name: string;
}

export interface Fees {
  low: Int32;
  medium: Int32;
  high: Int32;
}

export interface Utxo {
  hash: string;
  output_n: Int32;
  value: Int32;
}
