import {Text as Tx} from 'native-base';
import React from 'react';

type Variant = 'primary' | 'secondary';

export type ITextProps = {
  text: string;
  variant: Variant;
};

export const Text: React.FC<ITextProps> = ({
  text = 'Text...',
  variant = 'primary',
}) => {
  const parseColor = () => {
    switch (variant) {
      case 'primary':
        return 'indigo.500';
      case 'secondary':
        return 'coolGray.600';
    }
  };

  return (
    <Tx
      fontSize="sm"
      color={parseColor()}
      _dark={{
        color: 'warmGray.200',
      }}>
      {text}
    </Tx>
  );
};
